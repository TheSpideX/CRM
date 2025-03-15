const bcrypt = require('bcrypt');
const { AuthError } = require('../errors');
const TokenService = require('./token.service');
const SecurityService = require('./security.service');
const SessionService = require('./session.service');
const UserModel = require('../../user/models/user.model');
const logger = require('../../../utils/logger');

const COMPONENT = 'AuthService';

class AuthService {
  constructor() {
    this.tokenService = new TokenService();
    this.securityService = new SecurityService();
    this.sessionService = new SessionService();
  }

  /**
   * Authenticate a user with credentials and device info
   * @param {Object} credentials - User credentials (email, password)
   * @param {Object} deviceInfo - Information about the user's device
   * @param {Boolean} rememberMe - Whether to extend token lifetime
   * @returns {Object} Authentication result with tokens and user data
   */
  async authenticateUser(credentials, deviceInfo, rememberMe = false) {
    try {
      logger.info('Authentication attempt', { 
        component: COMPONENT, 
        email: credentials.email,
        deviceFingerprint: deviceInfo?.fingerprint
      });

      // Check rate limits before proceeding
      await this.securityService.checkRateLimit(credentials.email, deviceInfo);

      // Find user by email
      const user = await UserModel.findOne({ email: credentials.email });
      if (!user) {
        logger.warn('Authentication failed: User not found', { 
          component: COMPONENT, 
          email: credentials.email 
        });
        throw new AuthError('INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Authentication failed: Account inactive', { 
          component: COMPONENT, 
          userId: user._id 
        });
        throw new AuthError('ACCOUNT_INACTIVE');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        logger.warn('Authentication failed: Invalid password', { 
          component: COMPONENT, 
          userId: user._id 
        });
        
        // Track failed attempt
        await this.securityService.trackLoginAttempt(user._id, deviceInfo, false);
        throw new AuthError('INVALID_CREDENTIALS');
      }

      // Validate login attempt for suspicious activity
      await this.securityService.validateLoginAttempt(user, deviceInfo);

      // Generate tokens
      const tokenPair = await this.tokenService.generateTokenPair(user, {
        deviceFingerprint: deviceInfo?.fingerprint,
        rememberMe
      });

      // Create or update session
      const session = await this.sessionService.createSession(user._id, deviceInfo, {
        rememberMe
      });

      // Track successful login
      await this.securityService.trackLoginAttempt(user._id, deviceInfo, true);

      // Prepare user data (exclude sensitive fields)
      const userData = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferences: user.preferences || {}
      };

      // Prepare security context
      const securityContext = {
        lastLogin: new Date(),
        deviceInfo: deviceInfo,
        sessionId: session._id,
        sessionExpiresAt: session.expiresAt
      };

      logger.info('Authentication successful', { 
        component: COMPONENT, 
        userId: user._id,
        sessionId: session._id
      });

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: userData,
        securityContext
      };
    } catch (error) {
      logger.error('Authentication error', { 
        component: COMPONENT, 
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      });
      throw error;
    }
  }

  /**
   * Refresh tokens using a valid refresh token
   * @param {String} refreshToken - Current refresh token
   * @param {Object} deviceInfo - Device information
   * @returns {Object} New token pair
   */
  async refreshTokens(refreshToken, deviceInfo) {
    try {
      logger.info('Token refresh attempt', { 
        component: COMPONENT,
        deviceFingerprint: deviceInfo?.fingerprint
      });

      // Verify refresh token
      const decoded = await this.tokenService.verifyToken(refreshToken, 'refresh');
      
      // Get user
      const user = await UserModel.findById(decoded.sub);
      if (!user) {
        logger.warn('Token refresh failed: User not found', { 
          component: COMPONENT, 
          tokenUserId: decoded.sub 
        });
        throw new AuthError('INVALID_TOKEN');
      }

      // Check token version (for forced logout)
      if (decoded.version !== user.tokenVersion) {
        logger.warn('Token refresh failed: Token version mismatch', { 
          component: COMPONENT, 
          userId: user._id,
          tokenVersion: decoded.version,
          userTokenVersion: user.tokenVersion
        });
        throw new AuthError('TOKEN_REVOKED');
      }

      // Validate session
      const session = await this.sessionService.getSessionById(decoded.sessionId);
      if (!session || !session.isActive) {
        logger.warn('Token refresh failed: Invalid session', { 
          component: COMPONENT, 
          userId: user._id,
          sessionId: decoded.sessionId
        });
        throw new AuthError('SESSION_EXPIRED');
      }

      // Check device fingerprint if available
      if (decoded.deviceFingerprint && 
          decoded.deviceFingerprint !== deviceInfo?.fingerprint) {
        logger.warn('Token refresh failed: Device fingerprint mismatch', { 
          component: COMPONENT, 
          userId: user._id
        });
        throw new AuthError('DEVICE_MISMATCH');
      }

      // Generate new token pair
      const tokenPair = await this.tokenService.generateTokenPair(user, {
        deviceFingerprint: deviceInfo?.fingerprint,
        rememberMe: session.rememberMe,
        sessionId: session._id
      });

      // Update session activity
      await this.sessionService.updateSessionActivity(session._id);

      logger.info('Token refresh successful', { 
        component: COMPONENT, 
        userId: user._id,
        sessionId: session._id
      });

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      };
    } catch (error) {
      logger.error('Token refresh error', { 
        component: COMPONENT, 
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      });
      throw error;
    }
  }

  /**
   * Log out a user by invalidating their session and refresh token
   * @param {String} userId - User ID
   * @param {String} refreshToken - Current refresh token
   * @param {Object} deviceInfo - Device information
   * @param {Boolean} allDevices - Whether to log out from all devices
   * @returns {Boolean} Success indicator
   */
  async logoutUser(userId, refreshToken, deviceInfo, allDevices = false) {
    try {
      logger.info('Logout attempt', { 
        component: COMPONENT, 
        userId,
        allDevices
      });

      // If refresh token provided, decode it to get session ID
      let sessionId;
      if (refreshToken) {
        try {
          const decoded = await this.tokenService.verifyToken(refreshToken, 'refresh');
          sessionId = decoded.sessionId;
        } catch (error) {
          // Continue even if token is invalid
          logger.warn('Invalid refresh token during logout', { 
            component: COMPONENT, 
            userId,
            error: error.message
          });
        }
      }

      // Blacklist the refresh token
      if (refreshToken) {
        await this.tokenService.blacklistToken(refreshToken);
      }

      // Terminate session(s)
      if (allDevices) {
        // Terminate all sessions and increment token version
        await this.sessionService.terminateAllSessions(userId);
        await UserModel.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
        
        logger.info('All sessions terminated', { component: COMPONENT, userId });
      } else if (sessionId) {
        // Terminate specific session
        await this.sessionService.terminateSession(sessionId);
        
        logger.info('Session terminated', { 
          component: COMPONENT, 
          userId,
          sessionId
        });
      }

      return true;
    } catch (error) {
      logger.error('Logout error', { 
        component: COMPONENT, 
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate a user session
   * @param {String} sessionId - Session ID
   * @param {Object} deviceInfo - Device information
   * @returns {Object} Session validation result
   */
  async validateSession(sessionId, deviceInfo) {
    try {
      logger.info('Session validation', { 
        component: COMPONENT, 
        sessionId,
        deviceFingerprint: deviceInfo?.fingerprint
      });

      const session = await this.sessionService.getSessionById(sessionId);
      
      if (!session) {
        logger.warn('Session validation failed: Session not found', { 
          component: COMPONENT, 
          sessionId 
        });
        return { isValid: false };
      }

      // Check if session is active
      if (!session.isActive) {
        logger.warn('Session validation failed: Session inactive', { 
          component: COMPONENT, 
          sessionId,
          userId: session.userId
        });
        return { isValid: false };
      }

      // Check if session has expired
      if (new Date() > session.expiresAt) {
        logger.warn('Session validation failed: Session expired', { 
          component: COMPONENT, 
          sessionId,
          userId: session.userId
        });
        
        // Terminate expired session
        await this.sessionService.terminateSession(sessionId);
        return { isValid: false };
      }

      // Check device fingerprint if available
      if (session.deviceFingerprint && 
          session.deviceFingerprint !== deviceInfo?.fingerprint) {
        logger.warn('Session validation failed: Device fingerprint mismatch', { 
          component: COMPONENT, 
          sessionId,
          userId: session.userId
        });
        return { isValid: false, reason: 'DEVICE_MISMATCH' };
      }

      // Update session activity
      await this.sessionService.updateSessionActivity(sessionId);

      logger.info('Session validation successful', { 
        component: COMPONENT, 
        sessionId,
        userId: session.userId
      });

      return {
        isValid: true,
        expiresAt: session.expiresAt,
        userId: session.userId,
        deviceInfo: session.deviceInfo
      };
    } catch (error) {
      logger.error('Session validation error', { 
        component: COMPONENT, 
        sessionId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new AuthService();
