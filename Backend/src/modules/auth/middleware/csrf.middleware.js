const Tokens = require('csrf');
const crypto = require('crypto');
const { AuthError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');
const config = require('../config');

const COMPONENT = 'CSRFMiddleware';
const tokens = new Tokens();

/**
 * Generate CSRF token and set it in a cookie and response header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const generateToken = (req, res, next) => {
  try {
    // Generate a new CSRF secret if one doesn't exist
    if (!req.session?.csrfSecret) {
      const secret = tokens.secretSync();
      req.session = req.session || {};
      req.session.csrfSecret = secret;
      
      // Add timestamp to track token age
      req.session.csrfCreatedAt = Date.now();
      
      logger.debug('Generated new CSRF secret', { component: COMPONENT });
    } else {
      // Check if token needs rotation based on age
      const tokenAge = Date.now() - (req.session.csrfCreatedAt || 0);
      const maxTokenAge = config.csrf?.rotationInterval || 24 * 60 * 60 * 1000; // Default 24 hours
      
      if (tokenAge > maxTokenAge) {
        // Rotate the token
        const secret = tokens.secretSync();
        req.session.csrfSecret = secret;
        req.session.csrfCreatedAt = Date.now();
        
        logger.debug('Rotated CSRF secret due to age', { component: COMPONENT });
      }
    }

    // Generate a token from the secret
    const token = tokens.create(req.session.csrfSecret);
    
    // Add a token ID for additional validation
    const tokenId = crypto.randomBytes(8).toString('hex');
    req.session.csrfTokenId = tokenId;

    // Set the token in a cookie
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Needs to be accessible from JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: config.csrf?.cookieMaxAge || 8 * 60 * 60 * 1000 // Default 8 hours
    });

    // Also set token ID in a separate cookie for double-submit validation
    res.cookie('XSRF-ID', tokenId, {
      httpOnly: true, // Not accessible from JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: config.csrf?.cookieMaxAge || 8 * 60 * 60 * 1000 // Default 8 hours
    });

    // Set token in response header for SPA initial load
    res.setHeader('X-CSRF-Token', token);
    
    // For API responses, include token in response body
    if (req.path === '/api/auth/csrf' || req.path === '/auth/csrf') {
      res.locals.csrfToken = token;
    }

    next();
  } catch (error) {
    logger.error('Error generating CSRF token', { 
      component: COMPONENT,
      error: error.message,
      stack: error.stack
    });
    next(new AuthError('Failed to generate CSRF token', 'CSRF_GENERATION_FAILED'));
  }
};

/**
 * Validate CSRF token from request header or body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateToken = (req, res, next) => {
  try {
    // Skip validation for safe methods unless configured otherwise
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method) && !config.csrf?.validateSafeMethods) {
      return next();
    }
    
    // Skip validation for whitelisted paths
    const skipPaths = config.csrf?.skipPaths || ['/api/auth/health', '/health'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const secret = req.session?.csrfSecret;
    
    // Get token from various possible locations
    const token = 
      req.headers['x-csrf-token'] || 
      req.headers['x-xsrf-token'] || 
      req.body?._csrf ||
      extractTokenFromCookie(req);
    
    // Get token ID for double validation
    const tokenId = req.session?.csrfTokenId;
    const cookieTokenId = req.cookies['XSRF-ID'];

    if (!secret || !token) {
      logger.warn('CSRF token missing', { 
        component: COMPONENT,
        path: req.path,
        method: req.method,
        hasSecret: !!secret,
        hasToken: !!token
      });
      return next(new AuthError('CSRF token missing', 'CSRF_MISSING'));
    }

    // Validate token
    if (!tokens.verify(secret, token)) {
      logger.warn('Invalid CSRF token', { 
        component: COMPONENT,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return next(new AuthError('Invalid CSRF token', 'CSRF_INVALID'));
    }
    
    // Double-submit cookie pattern validation
    if (config.csrf?.doubleSubmitCheck && tokenId && cookieTokenId && tokenId !== cookieTokenId) {
      logger.warn('CSRF token ID mismatch', { 
        component: COMPONENT,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return next(new AuthError('CSRF validation failed', 'CSRF_ID_MISMATCH'));
    }

    // Check for token age if strict timing is enabled
    if (config.csrf?.strictTiming && req.session.csrfCreatedAt) {
      const tokenAge = Date.now() - req.session.csrfCreatedAt;
      const maxTokenAge = config.csrf?.maxTokenAge || 8 * 60 * 60 * 1000; // Default 8 hours
      
      if (tokenAge > maxTokenAge) {
        logger.warn('CSRF token expired', { 
          component: COMPONENT,
          path: req.path,
          method: req.method,
          tokenAge,
          maxTokenAge
        });
        return next(new AuthError('CSRF token expired', 'CSRF_EXPIRED'));
      }
    }

    // Log successful validation for sensitive operations
    const sensitivePaths = ['/api/auth/login', '/api/auth/password', '/api/user/profile'];
    if (sensitivePaths.some(path => req.path.includes(path))) {
      logger.info('CSRF validation passed for sensitive operation', {
        component: COMPONENT,
        path: req.path,
        method: req.method,
        userId: req.user?.id || 'unauthenticated'
      });
    }

    next();
  } catch (error) {
    logger.error('CSRF validation error', { 
      component: COMPONENT,
      error: error.message,
      stack: error.stack,
      path: req.path
    });
    next(new AuthError('CSRF validation failed', 'CSRF_ERROR'));
  }
};

/**
 * Extract CSRF token from cookies
 * @param {Object} req - Express request object
 * @returns {String|null} CSRF token or null
 */
const extractTokenFromCookie = (req) => {
  if (req.cookies && req.cookies['XSRF-TOKEN']) {
    return req.cookies['XSRF-TOKEN'];
  }
  return null;
};

/**
 * CSRF protection middleware that both generates and validates tokens
 * @returns {Function[]} Array of middleware functions
 */
const csrfProtection = () => {
  return [generateToken, validateToken];
};

/**
 * Middleware to handle CSRF errors with appropriate responses
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleCsrfErrors = (err, req, res, next) => {
  if (err.code && err.code.startsWith('CSRF_')) {
    // Log the error
    logger.warn('CSRF error handler', {
      component: COMPONENT,
      code: err.code,
      message: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    // Return standardized error response
    return res.status(403).json({
      error: {
        code: err.code,
        message: err.message,
        details: {
          // Include instructions for frontend
          action: 'Please refresh the page or request a new CSRF token',
          tokenEndpoint: '/api/auth/csrf'
        }
      }
    });
  }
  
  // Pass other errors to next error handler
  next(err);
};

module.exports = {
  generateToken,
  validateToken,
  csrfProtection,
  handleCsrfErrors
};
