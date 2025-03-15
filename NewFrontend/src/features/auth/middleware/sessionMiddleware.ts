import { Middleware } from 'redux';
import { SessionService } from '../services/session.service';
import { tokenService } from '../services/token.service';
import { securityService } from '../services/security.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { errorHandler } from '@/core/errors/errorHandler';
import { AuthenticationError } from '@/core/errors/base';
import { AuthError } from '../errors/auth-error';

// Create an instance of SessionService
const sessionService = new SessionService();

/**
 * Advanced session middleware that handles:
 * - Activity tracking
 * - Session timeout management
 * - Security context validation
 * - Token refresh orchestration
 * - Session health monitoring
 * - Cross-tab synchronization
 * - Session analytics
 * - Error handling integration
 */
export const sessionMiddleware: Middleware = (store) => {
  // Setup broadcast channel for cross-tab communication
  const sessionChannel = new BroadcastChannel('auth_session_channel');
  let healthCheckInterval: NodeJS.Timeout | null = null;
  let lastNetworkStatus = navigator.onLine;
  
  // Initialize session monitoring
  const initializeSessionMonitoring = () => {
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    
    healthCheckInterval = setInterval(() => {
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        performSessionHealthCheck(state);
      }
    }, AUTH_CONSTANTS.SESSION.HEALTH_CHECK_INTERVAL);
    
    // Listen for network status changes
    window.addEventListener('online', handleNetworkStatusChange);
    window.addEventListener('offline', handleNetworkStatusChange);
    
    // Listen for cross-tab session events
    sessionChannel.onmessage = (event) => handleSessionChannelMessage(event, store);
  };
  
  // Cleanup function
  const cleanup = () => {
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    window.removeEventListener('online', handleNetworkStatusChange);
    window.removeEventListener('offline', handleNetworkStatusChange);
    sessionChannel.close();
  };
  
  // Handle network status changes
  const handleNetworkStatusChange = () => {
    const currentNetworkStatus = navigator.onLine;
    
    // Network status changed
    if (lastNetworkStatus !== currentNetworkStatus) {
      lastNetworkStatus = currentNetworkStatus;
      
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        if (currentNetworkStatus) {
          // Came back online - verify session with server
          store.dispatch({ type: 'auth/validateSessionWithServer' });
        } else {
          // Went offline - mark session as offline
          store.dispatch({ type: 'auth/setSessionOffline' });
        }
      }
    }
  };
  
  // Handle session channel messages from other tabs
  const handleSessionChannelMessage = (event: MessageEvent, store: any) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'SESSION_TERMINATED':
        store.dispatch({ type: 'auth/forceLogout', payload: { reason: data.reason } });
        break;
        
      case 'SESSION_ACTIVITY_UPDATE':
        store.dispatch({ type: 'auth/syncLastActivity', payload: { timestamp: data.timestamp } });
        break;
        
      case 'TOKEN_REFRESHED':
        store.dispatch({ type: 'auth/syncTokens', payload: data.tokens });
        break;
        
      case 'SECURITY_CONTEXT_CHANGED':
        store.dispatch({ type: 'auth/validateSecurityContext' });
        break;
        
      case 'SESSION_ERROR':
        handleSessionError(data.error, store);
        break;
    }
  };
  
  // Handle session-related errors
  const handleSessionError = (error: any, store: any) => {
    try {
      // Convert to appropriate error type if needed
      let sessionError;
      
      if (error.code && typeof error.code === 'string') {
        // Create AuthError from error data
        sessionError = new AuthError(
          error.code,
          error.message,
          error.redirectPath,
          error.details
        );
      } else {
        // Create AuthenticationError for the core error system
        sessionError = new AuthenticationError(
          error.code || 'SESSION_ERROR',
          error.message || 'Session error occurred',
          error.redirectPath,
          error.details
        );
      }
      
      // Log the error through the centralized error handler
      errorHandler.handleError(sessionError, {
        component: 'SessionMiddleware',
        action: 'sessionHealthCheck',
        timestamp: Date.now()
      });
      
      // Dispatch appropriate action based on error type
      if (
        error.code === 'SESSION_EXPIRED' || 
        error.code === 'TOKEN_EXPIRED' || 
        error.code === 'INVALID_TOKEN'
      ) {
        store.dispatch({ type: 'auth/sessionExpired', payload: { error: sessionError } });
      } else if (error.code === 'SECURITY_CONTEXT_VIOLATION') {
        store.dispatch({ 
          type: 'auth/securityContextViolation', 
          payload: { error: sessionError } 
        });
      } else {
        // For other errors, just update the auth state with the error
        store.dispatch({ 
          type: 'auth/sessionError', 
          payload: { error: sessionError } 
        });
      }
    } catch (handlingError) {
      // Fallback error handling if error processing itself fails
      console.error('Error while handling session error:', handlingError);
      
      // Use the core error handler as fallback
      errorHandler.handleError(handlingError, {
        component: 'SessionMiddleware',
        action: 'handleSessionError',
        timestamp: Date.now()
      });
    }
  };
  
  // Perform comprehensive session health check
  const performSessionHealthCheck = async (state: any) => {
    try {
      // Check session timeout
      const now = Date.now();
      const lastActivity = state.auth.lastActivity;
      const inactiveTime = now - lastActivity;
      
      // Session expired due to inactivity
      if (inactiveTime > AUTH_CONSTANTS.SESSION.MAX_INACTIVITY) {
        const sessionError = new AuthError(
          'SESSION_EXPIRED',
          'Your session has expired due to inactivity',
          '/auth/login'
        );
        
        handleSessionError(sessionError, store);
        sessionService.stopSessionMonitoring();
        return;
      }
      
      // Check if token needs refresh (before it expires)
      const tokenExpiration = tokenService.getTokenExpiration();
      const timeUntilExpiration = tokenExpiration - now;
      
      if (timeUntilExpiration < AUTH_CONSTANTS.TOKEN.REFRESH_THRESHOLD) {
        store.dispatch({ type: 'auth/refreshTokens' });
      }
      
      // Periodically validate security context (every 5 minutes)
      if (inactiveTime % (5 * 60 * 1000) < AUTH_CONSTANTS.SESSION.HEALTH_CHECK_INTERVAL) {
        try {
          const securityContextValid = await securityService.validateSecurityContext();
          
          if (!securityContextValid) {
            const securityError = new AuthError(
              'SECURITY_CONTEXT_VIOLATION',
              'Security context has changed. Please re-authenticate.',
              '/auth/login',
              { reason: 'CONTEXT_CHANGED' }
            );
            
            handleSessionError(securityError, store);
          }
        } catch (securityError) {
          // Handle security validation errors
          handleSessionError({
            code: 'SECURITY_CHECK_FAILED',
            message: 'Failed to validate security context',
            details: { originalError: securityError }
          }, store);
        }
      }
      
      // Update session metrics
      store.dispatch({ type: 'auth/updateSessionMetrics', payload: { healthCheckTime: now } });
      
    } catch (error) {
      // Handle any unexpected errors in the health check process
      handleSessionError({
        code: 'SESSION_HEALTH_CHECK_FAILED',
        message: 'Session health check failed',
        details: { originalError: error }
      }, store);
    }
  };
  
  // Initialize monitoring when middleware is created
  initializeSessionMonitoring();
  
  // Return the middleware function
  return next => action => {
    // Process the action first
    const result = next(action);
    const state = store.getState();
    
    try {
      // Handle specific auth actions
      switch (action.type) {
        case 'auth/login/fulfilled':
          initializeSessionMonitoring();
          break;
          
        case 'auth/logout/fulfilled':
          cleanup();
          break;
          
        case 'auth/sessionExpired':
        case 'auth/forceLogout':
          cleanup();
          sessionService.endSession(action.type === 'auth/sessionExpired' ? 'EXPIRED' : 'FORCED');
          
          // Broadcast session termination to other tabs
          sessionChannel.postMessage({
            type: 'SESSION_TERMINATED',
            data: { 
              reason: action.type === 'auth/sessionExpired' ? 'EXPIRED' : 'FORCED',
              timestamp: Date.now()
            }
          });
          break;
          
        case 'auth/refreshTokens/rejected':
          // Handle token refresh failures
          if (action.error) {
            handleSessionError({
              code: 'TOKEN_REFRESH_FAILED',
              message: 'Failed to refresh authentication token',
              details: { originalError: action.error }
            }, store);
          }
          break;
      }
      
      // Update last activity on user actions (excluding system actions)
      if (
        state.auth.isAuthenticated && 
        !action.type.startsWith('@@') && 
        !action.type.startsWith('auth/') &&
        action.type !== 'IDLE'
      ) {
        const timestamp = Date.now();
        store.dispatch({ type: 'auth/updateLastActivity', payload: { timestamp } });
        
        // Broadcast activity to other tabs
        sessionChannel.postMessage({ 
          type: 'SESSION_ACTIVITY_UPDATE', 
          data: { timestamp, actionType: action.type } 
        });
        
        // Analytics tracking removed
      }
    } catch (middlewareError) {
      // Handle errors in the middleware itself
      errorHandler.handleError(middlewareError, {
        component: 'SessionMiddleware',
        action: 'processAction',
        timestamp: Date.now()
      });
    }
    
    return result;
  };
};
