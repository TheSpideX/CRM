const asyncHandler = require('../../../utils/asyncHandler');
const { AuthError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');
const AuthService = require('../services/auth.service');
const TokenService = require('../services/token.service');
const SessionService = require('../services/session.service');
const DeviceService = require('../services/device.service');
const SecurityService = require('../services/security.service');
const User = require('../../user/models/user.model');

const COMPONENT = 'AuthController';

/**
 * Process user login request
 * @route POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, deviceInfo, rememberMe } = req.body;
  const requestStartTime = Date.now();
  
  // Validate device info
  if (!deviceInfo?.fingerprint) {
    logger.warn('Login attempt without device fingerprint', { 
      component: COMPONENT, 
      email 
    });
    return next(new AuthError('Device fingerprint is required', 'DEVICE_INFO_MISSING'));
  }

  try {
    // Initialize services
    const authService = new AuthService();
    const securityService = new SecurityService();
    
    // Log login attempt
    logger.info('Login attempt', { 
      component: COMPONENT, 
      email,
      deviceInfo: {
        fingerprint: deviceInfo.fingerprint,
        userAgent: deviceInfo.userAgent
      }
    });
    
    // Check for suspicious activity before processing
    await securityService.preAuthenticationCheck(email, deviceInfo, req.ip);
    
    // Authenticate user
    const authResult = await authService.authenticateUser({
      email,
      password,
      deviceInfo,
      rememberMe: !!rememberMe,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Handle 2FA if required
    if (authResult.requiresTwoFactor) {
      logger.info('2FA required for login', { 
        component: COMPONENT, 
        userId: authResult.user.id 
      });
      
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        twoFactorToken: authResult.twoFactorToken,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          name: authResult.user.name
        }
      });
    }
    
    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: authResult.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });
    
    // Log successful login
    logger.info('Login successful', { 
      component: COMPONENT, 
      userId: authResult.user.id,
      sessionId: authResult.securityContext.sessionId,
      responseTime: Date.now() - requestStartTime
    });
    
    // Return auth response in format expected by frontend
    return res.status(200).json({
      success: true,
      user: authResult.user,
      tokens: {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken, // Include for frontend compatibility
        expiresIn: authResult.expiresIn || 900 // 15 minutes in seconds
      },
      securityContext: authResult.securityContext,
      requiresTwoFactor: false
    });
  } catch (error) {
    logger.error('Login failed', { 
      component: COMPONENT, 
      email,
      error: error.message,
      code: error.code,
      responseTime: Date.now() - requestStartTime
    });
    
    // Handle specific error cases
    if (error.code === 'ACCOUNT_LOCKED') {
      return next(new AuthError('Account is temporarily locked', 'ACCOUNT_LOCKED', {
        lockDuration: error.details?.remainingTime || 1800 // 30 minutes in seconds
      }));
    }
    
    return next(error);
  }
});

/**
 * Verify two-factor authentication
 * @route POST /api/auth/verify-2fa
 */
exports.verifyTwoFactor = asyncHandler(async (req, res, next) => {
  const { twoFactorToken, code, trustDevice } = req.body;
  const deviceInfo = req.body.deviceInfo || {};
  
  try {
    // Initialize services
    const authService = new AuthService();
    const twoFactorService = new TwoFactorService();
    
    // Verify the 2FA token first
    const tokenPayload = await twoFactorService.verifyTwoFactorToken(twoFactorToken);
    if (!tokenPayload || !tokenPayload.userId) {
      return next(new AuthError('Invalid verification session', 'INVALID_2FA_SESSION'));
    }
    
    // Find the user
    const user = await User.findById(tokenPayload.userId);
    if (!user) {
      return next(new AuthError('User not found', 'USER_NOT_FOUND'));
    }
    
    // Verify the 2FA code
    const isValid = await twoFactorService.verify2FACode(code, user.security.twoFactorSecret);
    if (!isValid) {
      return next(new AuthError('Invalid verification code', 'INVALID_MFA_CODE', {
        remainingAttempts: 3 // You might want to track this in the user model
      }));
    }
    
    // Complete authentication
    const authResult = await authService.completeAuthentication(user, deviceInfo);
    
    // Mark device as trusted if requested
    if (trustDevice) {
      const deviceService = new DeviceService();
      await deviceService.trustDevice(user.id, deviceInfo.fingerprint);
    }
    
    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: authResult.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });
    
    // Return auth response
    return res.status(200).json({
      success: true,
      user: authResult.user,
      tokens: {
        accessToken: authResult.accessToken,
        expiresIn: authResult.expiresIn || 900 // 15 minutes in seconds
      },
      securityContext: authResult.securityContext
    });
  } catch (error) {
    logger.error('2FA verification failed', { 
      component: COMPONENT, 
      error: error.message,
      code: error.code
    });
    return next(error);
  }
});

/**
 * Refresh authentication tokens
 * @route POST /api/auth/refresh
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
  // Get refresh token from cookie or request body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    return next(new AuthError('Refresh token is required', 'REFRESH_TOKEN_MISSING'));
  }
  
  try {
    // Initialize services
    const tokenService = new TokenService();
    const sessionService = new SessionService();
    
    // Verify the refresh token
    const decoded = await tokenService.verifyToken(refreshToken, 'refresh');
    if (!decoded || !decoded.userId) {
      throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }
    
    // Verify token version (for token rotation)
    if (decoded.version !== user.security.tokenVersion) {
      throw new AuthError('Token has been revoked', 'TOKEN_REVOKED');
    }
    
    // Find the session
    const session = await sessionService.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new AuthError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    // Check if session is active
    if (!session.isActive) {
      throw new AuthError('Session has been terminated', 'SESSION_TERMINATED');
    }
    
    // Generate new token pair
    const tokens = await tokenService.generateTokenPair(user, {
      deviceFingerprint: session.deviceInfo.fingerprint,
      rememberMe: session.metadata?.rememberMe
    });
    
    // Update session with new refresh token
    await sessionService.updateSessionToken(session._id, tokens.refreshToken);
    
    // Update session activity
    await sessionService.updateSessionActivity(session._id);
    
    // Set new refresh token in cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: session.metadata?.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });
    
    // Return new access token
    return res.status(200).json({
      success: true,
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn || 900 // 15 minutes in seconds
      }
    });
  } catch (error) {
    // Clear the invalid refresh token
    res.clearCookie('refreshToken');
    
    logger.error('Token refresh failed', { 
      component: COMPONENT, 
      error: error.message,
      code: error.code
    });
    
    return next(new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN'));
  }
});

/**
 * Process user logout
 * @route POST /api/auth/logout
 */
exports.logout = asyncHandler(async (req, res, next) => {
  // Get refresh token from cookie or request body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  try {
    // Initialize services
    const tokenService = new TokenService();
    const sessionService = new SessionService();
    
    if (refreshToken) {
      // Try to decode the token to get user ID
      try {
        const decoded = await tokenService.verifyToken(refreshToken, 'refresh');
        if (decoded && decoded.userId) {
          // Find and terminate the session
          await sessionService.terminateSessionByRefreshToken(refreshToken);
          
          // Blacklist the refresh token
          await tokenService.blacklistToken(refreshToken);
          
          logger.info('User logged out', { 
            component: COMPONENT, 
            userId: decoded.userId 
          });
        }
      } catch (error) {
        // Token might be invalid, but we still want to clear cookies
        logger.debug('Invalid token during logout', { 
          component: COMPONENT, 
          error: error.message 
        });
      }
    }
    
    // Clear cookies regardless of token validity
    res.clearCookie('refreshToken');
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', { 
      component: COMPONENT, 
      error: error.message 
    });
    
    // Still clear cookies even if there was an error
    res.clearCookie('refreshToken');
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

/**
 * Validate current session
 * @route GET /api/auth/session
 */
exports.validateSession = asyncHandler(async (req, res, next) => {
  try {
    // User should be attached by auth middleware
    if (!req.user) {
      return res.status(200).json({
        isValid: false
      });
    }
    
    // Initialize services
    const sessionService = new SessionService();
    
    // Get session ID from user's token
    const sessionId = req.user.sessionId;
    if (!sessionId) {
      return res.status(200).json({
        isValid: false
      });
    }
    
    // Validate the session
    const session = await sessionService.findSessionById(sessionId);
    if (!session || !session.isActive) {
      return res.status(200).json({
        isValid: false
      });
    }
    
    // Update session activity
    await sessionService.updateSessionActivity(sessionId);
    
    // Return session information
    return res.status(200).json({
      isValid: true,
      expiresAt: session.expiresAt,
      securityContext: {
        lastActivity: session.lastActivity,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress
      }
    });
  } catch (error) {
    logger.error('Session validation failed', { 
      component: COMPONENT, 
      error: error.message,
      userId: req.user?.id
    });
    
    return res.status(200).json({
      isValid: false
    });
  }
});

/**
 * Get CSRF token
 * @route GET /api/auth/csrf
 */
exports.getCsrfToken = asyncHandler(async (req, res) => {
  // The CSRF middleware should have already set the token
  // This just returns it in the response body for SPA initialization
  
  return res.status(200).json({
    success: true,
    csrfToken: res.locals.csrfToken
  });
});

/**
 * Terminate all sessions except current
 * @route POST /api/auth/terminate-sessions
 */
exports.terminateOtherSessions = asyncHandler(async (req, res, next) => {
  try {
    // User should be attached by auth middleware
    if (!req.user) {
      return next(new AuthError('Authentication required', 'AUTH_REQUIRED'));
    }
    
    // Initialize services
    const sessionService = new SessionService();
    
    // Get current session ID
    const currentSessionId = req.user.sessionId;
    
    // Terminate all other sessions
    const result = await sessionService.terminateOtherSessions(req.user.id, currentSessionId);
    
    logger.info('Terminated other sessions', { 
      component: COMPONENT, 
      userId: req.user.id,
      terminatedCount: result.terminatedCount
    });
    
    return res.status(200).json({
      success: true,
      terminatedCount: result.terminatedCount
    });
  } catch (error) {
    logger.error('Failed to terminate sessions', { 
      component: COMPONENT, 
      error: error.message,
      userId: req.user?.id
    });
    
    return next(error);
  }
});
