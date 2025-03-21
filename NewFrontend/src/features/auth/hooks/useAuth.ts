import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';
import { tokenService } from '../services/token.service';
import { securityService } from '../services/security.service';
import { offlineAuthService } from '../services/offline-auth.service';

// Types
import { LoginFormData, RegisterFormData, ResetPasswordData, ChangePasswordData, UserProfile } from '../types/auth.types';

// Store
import { RootState } from '@/store';
import { 
  clearError, 
  setSessionExpiry, 
  setSessionAlert, 
  setAuthLoading, 
  setOfflineStatus,
  setSecurityContext,
  setRememberMe,
  logout as logoutAction
} from '../store/authSlice';

// Constants
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { APP_ROUTES } from '@/config/routes';

// Utils
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/error.utils';
import { ErrorHandler } from '@/core/errors/errorHandler';
import { createAuthError, handleAuthError, AuthError } from "../errors/auth-error";
// Analytics import removed

export const useAuth = () => {
  const COMPONENT = 'useAuth';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Select auth state from Redux store
  const { 
    user, 
    isAuthenticated, 
    error, 
    securityContext, 
    isLoading,
    sessionExpiry,
    sessionAlert,
    twoFactorRequired,
    deviceVerified,
    rememberMe,
    isOffline
  } = useSelector((state: RootState) => state.auth);

  // Initialize auth state on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing session
        const isValid = await authService.isAuthenticated();
        
        if (isValid && !isAuthenticated) {
          // Restore session if valid token exists but state is not authenticated
          await authService.restoreSession();
        }
        
        // Set up network status monitoring
        setupNetworkMonitoring();
      } catch (error) {
        logger.error('Auth initialization failed', {
          component: COMPONENT,
          action: 'initializeAuth',
          error
        });
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
    
    return () => {
      // Clean up network listeners
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Session monitoring effect
  useEffect(() => {
    if (isAuthenticated) {
      // Set up session monitoring interval
      const sessionCheck = setInterval(() => {
        checkSessionStatus();
      }, AUTH_CONSTANTS.SESSION.CHECK_INTERVAL);

      // Set up activity tracking
      document.addEventListener('click', handleUserActivity);
      document.addEventListener('keypress', handleUserActivity);
      document.addEventListener('scroll', handleUserActivity, { passive: true });
      
      // Set up storage event listener for cross-tab synchronization
      window.addEventListener('storage', handleStorageEvent);

      return () => {
        clearInterval(sessionCheck);
        document.removeEventListener('click', handleUserActivity);
        document.removeEventListener('keypress', handleUserActivity);
        document.removeEventListener('scroll', handleUserActivity);
        window.removeEventListener('storage', handleStorageEvent);
      };
    }
  }, [isAuthenticated]);

  // Network status monitoring
  const setupNetworkMonitoring = () => {
    // Set initial network status
    dispatch(setOfflineStatus(!navigator.onLine));
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  };

  const handleOnline = () => {
    dispatch(setOfflineStatus(false));
    
    // Attempt to sync any pending operations
    if (isAuthenticated) {
      // First sync offline auth actions
      offlineAuthService.syncOfflineActions()
        .then(() => syncAfterReconnection())
        .catch(error => {
          logger.error('Failed to sync after reconnection', {
            component: COMPONENT,
            action: 'handleOnline',
            error
          });
        });
    }
  };

  const handleOffline = () => {
    dispatch(setOfflineStatus(true));
    toast.warning('You are offline. Some features may be unavailable.');
  };

  const syncAfterReconnection = async () => {
    try {
      // Verify token is still valid after reconnection
      const isValid = await tokenService.validateToken();
      
      if (!isValid) {
        // Attempt to refresh token
        const refreshed = await handleTokenRefresh();
        
        if (!refreshed) {
          // Force logout if refresh fails
          await logout(true);
          toast.error('Your session expired while offline');
        } else {
          toast.success('Reconnected to server');
        }
      }
    } catch (error) {
      logger.error('Sync after reconnection failed', {
        component: COMPONENT,
        action: 'syncAfterReconnection',
        error
      });
    }
  };

  // Handle user activity to extend session
  const handleUserActivity = useCallback(() => {
    sessionService.updateSessionActivity();
  }, []);

  // Handle storage events for cross-tab synchronization
  const handleStorageEvent = useCallback((event: StorageEvent) => {
    if (event.key === AUTH_CONSTANTS.STORAGE.LOGOUT_EVENT) {
      // Another tab logged out, sync this tab
      dispatch(logoutAction());
      navigate(APP_ROUTES.AUTH.LOGIN);
    } else if (event.key === AUTH_CONSTANTS.STORAGE.SESSION_UPDATED) {
      // Session was updated in another tab
      sessionService.syncSessionFromStorage();
    }
  }, [dispatch, navigate]);

  // Check session status
  const checkSessionStatus = async () => {
    try {
      // Check if session is about to expire
      if (sessionService.isSessionExpiringSoon()) {
        handleSessionExpiringSoon();
      } 
      // Check if token needs refresh
      else if (tokenService.isTokenExpiringSoon()) {
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
  };

  // Handle session expiring soon
  const handleSessionExpiringSoon = () => {
    const timeRemaining = sessionService.getSessionTimeRemaining();
    
    // Update session expiry in store
    dispatch(setSessionExpiry(Date.now() + timeRemaining));
    
    // Show warning based on time remaining
    if (timeRemaining < AUTH_CONSTANTS.SESSION.CRITICAL_WARNING_THRESHOLD) {
      dispatch(setSessionAlert({
        type: 'danger',
        message: 'Your session is about to expire in less than a minute',
        action: 'extend',
        expiresAt: Date.now() + timeRemaining
      }));
    } else if (timeRemaining < AUTH_CONSTANTS.SESSION.WARNING_THRESHOLD) {
      dispatch(setSessionAlert({
        type: 'warning',
        message: 'Your session will expire soon',
        action: 'extend',
        expiresAt: Date.now() + timeRemaining
      }));
    }
  };

  // Handle token refresh
  const handleTokenRefresh = async () => {
    try {
      const result = await authService.refreshToken();
      return result;
    } catch (error) {
      logger.error('Token refresh failed', {
        component: COMPONENT,
        action: 'handleTokenRefresh',
        error
      });
      
      // Force logout on refresh failure
      if (error.response?.status === 401) {
        await logout(true);
      }
      
      return false;
    }
  };

  // Handle suspicious activity
  const handleSuspiciousActivity = (activityDetails: any) => {
    dispatch(setSecurityContext({
      ...securityContext,
      suspiciousActivity: activityDetails
    }));
    
    dispatch(setSessionAlert({
      type: 'error',
      message: 'Suspicious activity detected. Please verify your identity.',
      action: 'verify',
      expiresAt: Date.now() + AUTH_CONSTANTS.SESSION.VERIFICATION_TIMEOUT
    }));
  };

  // Extend session
  const extendSession = async () => {
    try {
      const extended = await sessionService.extendSession();
      
      if (extended) {
        dispatch(setSessionAlert(null));
        toast.success('Session extended successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Session extension failed', {
        component: COMPONENT,
        action: 'extendSession',
        error
      });
      return false;
    }
  };

  // Login function
  const login = useCallback(async (credentials: LoginFormData) => {
    try {
      dispatch(clearError());
      dispatch(setAuthLoading(true));
      dispatch(setRememberMe(!!credentials.rememberMe));
      
      // Add more detailed logging before login attempt
      logger.info('Attempting login', { 
        component: COMPONENT,
        action: 'login',
        email: credentials.email ? credentials.email.substring(0, 3) + '***' : 'empty'
      });
      
      // Get device info for security context
      const deviceInfo = await securityService.getDeviceInfo();
      
      // Perform login
      const result = await authService.login({
        ...credentials,
        deviceInfo
      });

      if (result.success) {
        try {
          // Initialize session
          await sessionService.initializeSession(result.user, !!credentials.rememberMe);
          
          // Handle successful login
          await handleSuccessfulLogin(result);
          return true;
        } catch (sessionError) {
          // Only log session initialization errors
          logger.error('Session initialization failed', { 
            error: sessionError instanceof Error ? sessionError.message : String(sessionError),
            component: COMPONENT,
            action: 'initializeSession'
          });
          await authService.logout();
          throw sessionError;
        }
      } else if (result.requiresTwoFactor) {
        // Handle 2FA requirement
        navigate(APP_ROUTES.AUTH.TWO_FACTOR, {
          state: { email: credentials.email }
        });
        return false;
      } else if (result.requiresDeviceVerification) {
        // Handle device verification requirement
        navigate(APP_ROUTES.AUTH.VERIFY_DEVICE, {
          state: { email: credentials.email }
        });
        return false;
      }
      
      return false;
    } catch (error) {
      logger.error('Login failed', {
        component: COMPONENT,
        action: 'login',
        error
      });
      
      // Handle login error
      await handleLoginError(error);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate]);

  // Handle successful login
  const handleSuccessfulLogin = async (result: any) => {
    // Analytics tracking removed
    logger.info('Login successful', { method: 'email' });

    // Get role-based redirect
    const redirectPath = authService.getRoleBasedRedirect(result.user.role);
    
    // Check for intended destination
    const from = location.state?.from?.pathname || redirectPath;
    navigate(from);
  };

  // Handle login error
  const handleLoginError = async (error: any) => {
    const errorDetails = await handleAuthError(error);
    
    if (errorDetails.requiresAction) {
      navigate(errorDetails.redirectPath, {
        state: { error: errorDetails }
      });
    } else {
      // Show error toast
      toast.error(errorDetails.message || 'Login failed');
    }
  };

  // Logout function
  const logout = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        dispatch(setAuthLoading(true));
      }
      
      await authService.logout();
      await sessionService.endSession();
      
      // Dispatch logout action
      dispatch(logoutAction());
      
      // Trigger storage event for cross-tab logout
      localStorage.setItem(AUTH_CONSTANTS.STORAGE.LOGOUT_EVENT, Date.now().toString());
      
      // Navigate to login page
      navigate(APP_ROUTES.AUTH.LOGIN);
      
      if (!silent) {
        toast.info('You have been logged out');
      }
    } catch (error) {
      logger.error('Logout failed', {
        component: COMPONENT,
        action: 'logout',
        error
      });
      
      // Force logout even if API call fails
      dispatch(logoutAction());
      await sessionService.endSession();
      navigate(APP_ROUTES.AUTH.LOGIN);
    } finally {
      if (!silent) {
        dispatch(setAuthLoading(false));
      }
    }
  }, [dispatch, navigate]);

  // Register function
  const register = useCallback(async (userData: RegisterFormData) => {
    try {
      dispatch(clearError());
      dispatch(setAuthLoading(true));
      
      const result = await authService.register(userData);
      
      if (result.success) {
        // Navigate to verification page or login
        if (result.requiresEmailVerification) {
          navigate(APP_ROUTES.AUTH.VERIFY_EMAIL, {
            state: { email: userData.email }
          });
        } else {
          toast.success('Registration successful! Please log in.');
          navigate(APP_ROUTES.AUTH.LOGIN);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Registration failed', {
        component: COMPONENT,
        action: 'register',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate]);

  // Verify email function
  const verifyEmail = useCallback(async (token: string) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.verifyEmail(token);
      
      if (result.success) {
        toast.success('Email verified successfully!');
        navigate(APP_ROUTES.AUTH.LOGIN);
        return true;
      }
      
      toast.error('Email verification failed');
      return false;
    } catch (error) {
      logger.error('Email verification failed', {
        component: COMPONENT,
        action: 'verifyEmail',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate]);

  // Reset password request function
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.forgotPassword(email);
      
      if (result.success) {
        toast.success('Password reset instructions sent to your email');
        navigate(APP_ROUTES.AUTH.LOGIN);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Password reset request failed', {
        component: COMPONENT,
        action: 'requestPasswordReset',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate]);

  // Reset password function
  const resetPassword = useCallback(async (resetData: ResetPasswordData) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.resetPassword(resetData);
      
      if (result.success) {
        toast.success('Password reset successful! Please log in with your new password.');
        navigate(APP_ROUTES.AUTH.LOGIN);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Password reset failed', {
        component: COMPONENT,
        action: 'resetPassword',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate]);

  // Change password function
  const changePassword = useCallback(async (passwordData: ChangePasswordData) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.changePassword(passwordData);
      
      if (result.success) {
        toast.success('Password changed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Password change failed', {
        component: COMPONENT,
        action: 'changePassword',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch]);

  // Update profile function
  const updateProfile = useCallback(async (profileData: UserProfile) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.updateProfile(profileData);
      
      if (result.success) {
        toast.success('Profile updated successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Profile update failed', {
        component: COMPONENT,
        action: 'updateProfile',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch]);

  // Verify two-factor authentication
  const verifyTwoFactor = useCallback(async (code: string, email: string) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.verifyTwoFactor(code, email);
      
      if (result.success) {
        // Initialize session after 2FA
        await sessionService.initializeSession(result.user, rememberMe);
        
        // Handle successful login
        await handleSuccessfulLogin(result);
        return true;
      }
      
      toast.error('Invalid verification code');
      return false;
    } catch (error) {
      logger.error('Two-factor verification failed', {
        component: COMPONENT,
        action: 'verifyTwoFactor',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate, rememberMe]);

  // Verify device
  const verifyDevice = useCallback(async (code: string, email: string) => {
    try {
      dispatch(setAuthLoading(true));
      
      const result = await authService.verifyDevice(code, email);
      
      if (result.success) {
        // Initialize session after device verification
        await sessionService.initializeSession(result.user, rememberMe);
        
        // Handle successful login
        await handleSuccessfulLogin(result);
        return true;
      }
      
      toast.error('Invalid verification code');
      return false;
    } catch (error) {
      logger.error('Device verification failed', {
        component: COMPONENT,
        action: 'verifyDevice',
        error
      });
      
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, navigate, rememberMe]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    securityContext,
    sessionExpiry,
    sessionAlert,
    twoFactorRequired,
    deviceVerified,
    isOffline,
    isInitialized,
    
    // Auth functions
    login,
    logout,
    register,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,
    updateProfile,
    
    // Session functions
    extendSession,
    refreshSession: handleTokenRefresh,
    
    // Verification functions
    verifyTwoFactor,
    verifyDevice
  };
};
