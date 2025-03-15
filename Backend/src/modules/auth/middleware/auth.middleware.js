const TokenService = require('../services/token.service');
const SessionService = require('../services/session.service');
const { AuthError } = require('../errors');
const logger = require('../../../utils/logger');

// Initialize services
const tokenService = new TokenService();
const sessionService = new SessionService();

const COMPONENT = 'AuthMiddleware';

/**
 * Middleware to verify user authentication
 * Extracts user from token and adds to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('MISSING_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    const decoded = await tokenService.verifyToken(token, 'access');
    
    // Validate session if session ID is in token
    if (decoded.sessionId) {
      const deviceInfo = req.body.deviceInfo || {
        fingerprint: decoded.deviceFingerprint
      };
      
      const sessionValid = await sessionService.validateSession(
        decoded.sessionId, 
        deviceInfo
      );
      
      if (!sessionValid.isValid) {
        logger.warn('Invalid session detected', {
          component: COMPONENT,
          sessionId: decoded.sessionId,
          reason: sessionValid.reason
        });
        throw new AuthError(sessionValid.reason || 'SESSION_INVALID');
      }
    }
    
    // Set user in request object
    req.user = {
      id: decoded.sub,
      role: decoded.role || 'user',
      deviceFingerprint: decoded.deviceFingerprint,
      sessionId: decoded.sessionId
    };
    
    // Update session activity
    if (decoded.sessionId) {
      await sessionService.updateSessionActivity(decoded.sessionId);
    }
    
    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      component: COMPONENT,
      error: error.message,
      code: error.code || 'INVALID_TOKEN'
    });
    
    if (error instanceof AuthError) {
      next(error);
    } else {
      next(new AuthError('INVALID_TOKEN'));
    }
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = await tokenService.verifyToken(token, 'access');
    
    req.user = {
      id: decoded.sub,
      role: decoded.role || 'user',
      deviceFingerprint: decoded.deviceFingerprint,
      sessionId: decoded.sessionId
    };
    
    // Update session activity if session exists
    if (decoded.sessionId) {
      await sessionService.updateSessionActivity(decoded.sessionId);
    }
    
    next();
  } catch (error) {
    // Just continue without authentication for optional auth
    logger.debug('Optional auth failed, continuing without auth', {
      component: COMPONENT
    });
    next();
  }
};

/**
 * Role-based access control middleware
 * @param {Array} allowedRoles - Array of roles that have access
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthError('AUTHENTICATION_REQUIRED');
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Insufficient permissions', {
          component: COMPONENT,
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });
        
        throw new AuthError('INSUFFICIENT_PERMISSIONS');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Extract user information from token without verification
 * Useful for debugging or non-critical operations
 * @param {String} token - JWT token
 */
const extractUserFromToken = (token) => {
  try {
    return tokenService.decodeToken(token);
  } catch (error) {
    logger.error('Failed to extract user from token', {
      component: COMPONENT,
      error: error.message
    });
    return null;
  }
};

/**
 * Middleware to check if session is valid
 * Used for session validation endpoint
 */
const validateSession = async (req, res, next) => {
  try {
    if (!req.user || !req.user.sessionId) {
      throw new AuthError('SESSION_NOT_FOUND');
    }
    
    const deviceInfo = req.body.deviceInfo || {
      fingerprint: req.user.deviceFingerprint
    };
    
    const sessionValid = await sessionService.validateSession(
      req.user.sessionId,
      deviceInfo
    );
    
    if (!sessionValid.isValid) {
      throw new AuthError(sessionValid.reason || 'SESSION_INVALID');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to enforce security level requirements
 * @param {Number} requiredLevel - Minimum security level required
 */
const requireSecurityLevel = (requiredLevel) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthError('AUTHENTICATION_REQUIRED');
      }
      
      // Get security level from user or session
      const userSecurityLevel = req.user.securityLevel || 1;
      
      if (userSecurityLevel < requiredLevel) {
        logger.warn('Insufficient security level', {
          component: COMPONENT,
          userId: req.user.id,
          userLevel: userSecurityLevel,
          requiredLevel
        });
        
        throw new AuthError('SECURITY_LEVEL_INSUFFICIENT', {
          currentLevel: userSecurityLevel,
          requiredLevel
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRoles,
  extractUserFromToken,
  validateSession,
  requireSecurityLevel
};