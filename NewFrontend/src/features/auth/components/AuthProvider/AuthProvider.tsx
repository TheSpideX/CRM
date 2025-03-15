import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Services
import { authService } from '../../services/auth.service';
import { tokenService } from '../../services/token.service';
import { sessionService } from '../../services/session.service';
import { securityService } from '../../services/security.service';

// Store
import { RootState } from '@/store';
import { 
  setCredentials, 
  clearCredentials, 
  setSessionExpiry, 
  setSessionAlert, 
  setAuthLoading, 
  setOfflineStatus,
  setSecurityContext,
  setRememberMe
} from '../../store/authSlice';

// Constants
import { AUTH_CONSTANTS } from '../../constants/auth.constants';
import { APP_ROUTES } from '@/config/routes';

// Utils
import { logger } from '@/utils/logger';
import { analytics } from '@/services/analytics.service';

// Types
export interface AuthContextType {
  initialize: () => Promise<void>;
  handleStorageEvent: (event: StorageEvent) => void;
  handleActivityTracking: () => void;
  handleTokenRefresh: () => Promise<boolean>;
  extendSession: () => Promise<boolean>;
  isInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const COMPONENT = 'AuthProvider';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for intervals and timeouts
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Select auth state from Redux store
  const { 
    user, 
    isAuthenticated, 
    sessionExpiry,
    rememberMe,
    isOffline
  } = useSelector((state: RootState) => state.auth);

  // Initialize authentication state
  const initialize = useCallback(async () => {
    try {
      logger.info('Initializing authentication state', { component: COMPONENT });
      dispatch(setAuthLoading(true));
      
      // Check for existing session
      const isValid = await authService.isAuthenticated();
      
      if (isValid && !isAuthenticated) {
        // Restore session if valid token exists but state is not authenticated
        await authService.restoreSession();
        logger.info('Session restored successfully', { component: COMPONENT });
      }
      
      // Set up network status monitoring
      setupNetworkMonitoring();
      
      // Set up session monitoring if authenticated
      if (isAuthenticated) {
        setupSessionMonitoring();
        setupActivityTracking();
      }
      
      // Set up storage event listener for cross-tab synchronization
      window.addEventListener('storage', handleStorageEvent);
      
      // Set remember me from storage if available
      const storedRememberMe = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.REMEMBER_ME);
      if (storedRememberMe) {
        dispatch(setRememberMe(storedRememberMe === 'true'));
      }
      
      // Set up device fingerprinting
      await securityService.getDeviceInfo(true);
      
      logger.info('Authentication initialization complete', { component: COMPONENT });
    } catch (error) {
      logger.error('Authentication initialization failed', {
        component: COMPONENT,
        action: 'initialize',
        error
      });
    } finally {
      dispatch(setAuthLoading(false));
      setIsInitialized(true);
    }
  }, [dispatch, isAuthenticated]);

  // Set up network monitoring
  const setupNetworkMonitoring = useCallback(() => {
    const handleOnline = () => {
      dispatch(setOfflineStatus(false));
      logger.info('Network connection restored', { component: COMPONENT });
      
      // Sync session data when coming back online
      if (isAuthenticated) {
        sessionService.syncSessionFromStorage();
        handleTokenRefresh();
      }
    };
    
    const handleOffline = () => {
      dispatch(setOfflineStatus(true));
      logger.warn('Network connection lost', { component: COMPONENT });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial network status
    dispatch(setOfflineStatus(!navigator.onLine));
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, isAuthenticated]);

  // Set up session monitoring
  const setupSessionMonitoring = useCallback(() => {
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }
    
    sessionCheckIntervalRef.current = setInterval(() => {
      checkSessionStatus();
    }, AUTH_CONSTANTS.SESSION.CHECK_INTERVAL);
    
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, []);

  // Check session status
  const checkSessionStatus = useCallback(async () => {
    try {
      if (!isAuthenticated) return;
      
      // Check if session is about to expire
      const sessionInfo = await sessionService.getCurrentSession();
      if (!sessionInfo) return;
      
      const expiresAt = sessionInfo.expiresAt;
      const now = Date.now();
      const timeRemaining = expiresAt - now;
      
      // Update session expiry in store
      dispatch(setSessionExpiry(expiresAt));
      
      // If session is about to expire, show warning
      if (timeRemaining <= AUTH_CONSTANTS.SESSION.EXPIRY_THRESHOLD) {
        dispatch(setSessionAlert({
          type: 'warning',
          message: 'Your session is about to expire. Would you like to extend it?',
          action: 'extend',
          expiresAt: expiresAt
        }));
      }
      
      // Check if token needs refresh
      if (await tokenService.isTokenExpiringSoon()) {
        await handleTokenRefresh();
      }
      
      // Check for suspicious activity
      const suspiciousActivity = await securityService.detectSuspiciousActivity();
      if (suspiciousActivity) {
        handleSuspiciousActivity(suspiciousActivity);
      }
    } catch (error) {
      logger.error('Session check failed', {
        component: COMPONENT,
        action: 'checkSessionStatus',
        error
      });
    }
  }, [dispatch, isAuthenticated]);

  // Handle suspicious activity
  const handleSuspiciousActivity = useCallback((activityDetails: any) => {
    dispatch(setSecurityContext({
      suspiciousActivity: activityDetails,
      requiresVerification: true
    }));
    
    dispatch(setSessionAlert({
      type: 'error',
      message: 'Suspicious activity detected. Please verify your identity.',
      action: 'verify',
      expiresAt: Date.now() + AUTH_CONSTANTS.SESSION.VERIFICATION_TIMEOUT
    }));
    
    // Analytics tracking removed
    logger.warn('Suspicious activity detected', activityDetails);
    
    // Redirect to verification page if needed
    if (activityDetails.severity === 'high') {
      navigate(APP_ROUTES.AUTH.VERIFY_DEVICE);
    }
  }, [dispatch, navigate]);

  // Set up activity tracking
  const setupActivityTracking = useCallback(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const trackActivity = () => {
      handleActivityTracking();
      
      // Reset inactivity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      // Set new inactivity timeout
      activityTimeoutRef.current = setTimeout(() => {
        handleInactivity();
      }, AUTH_CONSTANTS.SESSION.MAX_INACTIVITY);
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true });
    });
    
    // Initial setup of inactivity timeout
    trackActivity();
    
    return () => {
      // Remove event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, trackActivity);
      });
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  // Handle activity tracking
  const handleActivityTracking = useCallback(() => {
    if (isAuthenticated) {
      sessionService.updateSessionActivity();
    }
  }, [isAuthenticated]);

  // Handle inactivity
  const handleInactivity = useCallback(async () => {
    if (!isAuthenticated) return;
    
    // If remember me is enabled, just refresh the token
    if (rememberMe) {
      await handleTokenRefresh();
      return;
    }
    
    // Otherwise, show session expiry alert
    dispatch(setSessionAlert({
      type: 'warning',
      message: 'You have been inactive. Your session will expire soon.',
      action: 'extend',
      expiresAt: Date.now() + AUTH_CONSTANTS.SESSION.EXPIRY_THRESHOLD
    }));
    
    // Set timeout to log out if no action is taken
    setTimeout(() => {
      if (isAuthenticated) {
        authService.logout(true);
      }
    }, AUTH_CONSTANTS.SESSION.EXPIRY_THRESHOLD);
  }, [dispatch, isAuthenticated, rememberMe]);

  // Handle token refresh
  const handleTokenRefresh = useCallback(async () => {
    try {
      if (!isAuthenticated) return false;
      
      const result = await authService.refreshToken();
      
      if (result) {
        // Schedule next token refresh
        const accessToken = await tokenService.getAccessToken();
        if (accessToken) {
          const decoded = await tokenService.decodeToken(accessToken);
          const expiresIn = decoded.exp * 1000 - Date.now() - 60000; // Refresh 1 minute before expiry
          
          if (tokenRefreshTimeoutRef.current) {
            clearTimeout(tokenRefreshTimeoutRef.current);
          }
          
          tokenRefreshTimeoutRef.current = setTimeout(() => {
            handleTokenRefresh();
          }, expiresIn > 0 ? expiresIn : 10000); // Fallback to 10 seconds if calculation is wrong
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Token refresh failed', {
        component: COMPONENT,
        action: 'handleTokenRefresh',
        error
      });
      
      return false;
    }
  }, [isAuthenticated]);

  // Handle storage events for cross-tab synchronization
  const handleStorageEvent = useCallback((event: StorageEvent) => {
    if (event.key === AUTH_CONSTANTS.STORAGE_KEYS.AUTH_TOKENS) {
      if (!event.newValue) {
        // Another tab logged out, sync this tab
        dispatch(clearCredentials());
        navigate(APP_ROUTES.AUTH.LOGIN);
      } else if (event.newValue !== event.oldValue) {
        // Tokens updated in another tab
        tokenService.syncTokensFromStorage();
      }
    } else if (event.key === AUTH_CONSTANTS.STORAGE_KEYS.SECURITY_CONTEXT) {
      // Security context updated in another tab
      securityService.syncSecurityContextFromStorage();
    }
  }, [dispatch, navigate]);

  // Extend session
  const extendSession = useCallback(async () => {
    try {
      if (!isAuthenticated) return false;
      
      // Clear session alert
      dispatch(setSessionAlert(null));
      
      // Refresh token to extend session
      const result = await handleTokenRefresh();
      
      if (result) {
        // Update session expiry
        await sessionService.extendSession();
        const sessionInfo = await sessionService.getCurrentSession();
        
        if (sessionInfo) {
          dispatch(setSessionExpiry(sessionInfo.expiresAt));
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Session extension failed', {
        component: COMPONENT,
        action: 'extendSession',
        error
      });
      
      return false;
    }
  }, [dispatch, isAuthenticated]);

  // Initialize on mount
  useEffect(() => {
    initialize();
    
    return () => {
      // Clean up event listeners and intervals
      window.removeEventListener('storage', handleStorageEvent);
      
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, []);

  // Update session monitoring when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setupSessionMonitoring();
      setupActivityTracking();
    } else {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    }
  }, [isAuthenticated, setupSessionMonitoring, setupActivityTracking]);

  // Update user profile when needed
  useEffect(() => {
    if (isAuthenticated && user) {
      // Set up profile refresh interval if needed
    }
  }, [isAuthenticated, user]);

  // Context value
  const contextValue: AuthContextType = {
    initialize,
    handleStorageEvent,
    handleActivityTracking,
    handleTokenRefresh,
    extendSession,
    isInitialized
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;