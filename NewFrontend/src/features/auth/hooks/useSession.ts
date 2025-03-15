import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sessionService } from '../services/session.service';
import { securityService } from '../services/security.service';
import { tokenService } from '../services/token.service';
import { setSessionAlert, setSessionExpiry } from "../store/authSlice";
import { RootState } from '../../../store';
import { logger } from '../../../utils/logger';
import { AUTH_CONSTANTS } from "../constants/auth.constants";
import { toast } from 'react-toastify';

const COMPONENT = 'useSession';

export interface SessionInfo {
  id: string;
  startTime: number;
  lastActivity: number;
  expiresAt: number;
  deviceInfo: {
    fingerprint: string;
    userAgent: string;
    platform: string;
  };
  metadata: Record<string, any>;
}

export interface SessionMetrics {
  duration: number;
  interactions: number;
  idleTime: number;
  pageViews: number;
}

export interface UseSessionReturn {
  // Session state
  isActive: boolean;
  timeRemaining: number;
  lastActivity: number;
  sessionInfo: SessionInfo | null;
  sessionMetrics: SessionMetrics | null;
  
  // Session actions
  extendSession: () => Promise<boolean>;
  endSession: (reason?: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  
  // Session utilities
  getSessionDuration: () => number;
  getIdleTime: () => number;
  isSessionExpiringSoon: () => boolean;
  
  // Session management
  forceLogout: (sessionId: string, reason?: string) => Promise<void>;
  getAllSessions: () => Promise<SessionInfo[]>;
  terminateOtherSessions: () => Promise<boolean>;
  
  // Session security
  validateSession: () => Promise<boolean>;
  checkSecurityContext: () => Promise<boolean>;
}

export const useSession = (): UseSessionReturn => {
  const dispatch = useDispatch();
  const sessionAlert = useSelector((state: RootState) => state.auth.sessionAlert);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Initialize session data
  useEffect(() => {
    if (isAuthenticated) {
      initializeSessionData();
      startSessionMonitoring();
      
      return () => {
        stopSessionMonitoring();
      };
    } else {
      setSessionInfo(null);
      setSessionMetrics(null);
      setIsActive(false);
    }
  }, [isAuthenticated]);

  // Initialize session data
  const initializeSessionData = async () => {
    try {
      const session = await sessionService.getSession();
      if (session) {
        setSessionInfo(session);
        setIsActive(session.state === 'active');
        setLastActivity(session.lastActivity);
        
        const metrics = await sessionService.getSessionMetrics();
        setSessionMetrics(metrics);
      }
    } catch (error) {
      logger.error('Failed to initialize session data', {
        component: COMPONENT,
        action: 'initializeSessionData',
        error
      });
    }
  };

  // Start session monitoring
  const startSessionMonitoring = () => {
    // Check session status every minute
    const intervalId = setInterval(checkSessionStatus, AUTH_CONSTANTS.SESSION.CHECK_INTERVAL);
    
    // Update time remaining every second
    const timerIntervalId = setInterval(updateTimeRemaining, 1000);
    
    // Store interval IDs for cleanup
    window.sessionStorage.setItem('sessionMonitoringInterval', intervalId.toString());
    window.sessionStorage.setItem('timerInterval', timerIntervalId.toString());
    
    // Set up activity tracking
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    
    // Set up network status monitoring
    window.addEventListener('online', handleNetworkStatusChange);
    window.addEventListener('offline', handleNetworkStatusChange);
    
    // Set up visibility change monitoring
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  // Stop session monitoring
  const stopSessionMonitoring = () => {
    const intervalId = parseInt(window.sessionStorage.getItem('sessionMonitoringInterval') || '0');
    const timerIntervalId = parseInt(window.sessionStorage.getItem('timerInterval') || '0');
    
    if (intervalId) clearInterval(intervalId);
    if (timerIntervalId) clearInterval(timerIntervalId);
    
    document.removeEventListener('mousemove', handleUserActivity);
    document.removeEventListener('keypress', handleUserActivity);
    document.removeEventListener('click', handleUserActivity);
    document.removeEventListener('touchstart', handleUserActivity);
    document.removeEventListener('scroll', handleUserActivity);
    
    window.removeEventListener('online', handleNetworkStatusChange);
    window.removeEventListener('offline', handleNetworkStatusChange);
    
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  // Handle user activity
  const handleUserActivity = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const currentTime = Date.now();
      setLastActivity(currentTime);
      
      // Only update if significant time has passed (throttle)
      if (currentTime - lastActivity > AUTH_CONSTANTS.SESSION.ACTIVITY_UPDATE_THRESHOLD) {
        await sessionService.updateLastActivity();
        
        // If session was about to expire, extend it automatically
        if (sessionAlert && sessionAlert.type === 'warning') {
          await extendSession();
        }
      }
    } catch (error) {
      logger.error('Failed to handle user activity', {
        component: COMPONENT,
        action: 'handleUserActivity',
        error
      });
    }
  }, [isAuthenticated, lastActivity, sessionAlert]);

  // Handle network status change
  const handleNetworkStatusChange = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      if (navigator.onLine) {
        // When coming back online, sync session with server
        await sessionService.syncSession();
        await initializeSessionData();
      }
    } catch (error) {
      logger.error('Failed to handle network status change', {
        component: COMPONENT,
        action: 'handleNetworkStatusChange',
        error
      });
    }
  }, [isAuthenticated]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible again, check session status
        await checkSessionStatus();
        await sessionService.updateLastActivity();
      }
    } catch (error) {
      logger.error('Failed to handle visibility change', {
        component: COMPONENT,
        action: 'handleVisibilityChange',
        error
      });
    }
  }, [isAuthenticated]);

  // Update time remaining
  const updateTimeRemaining = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const remaining = await sessionService.getSessionTimeRemaining();
      setTimeRemaining(remaining);
    } catch (error) {
      logger.error('Failed to update time remaining', {
        component: COMPONENT,
        action: 'updateTimeRemaining',
        error
      });
    }
  }, [isAuthenticated]);

  // Check session status
  const checkSessionStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      // Check if session is valid
      const isValid = await sessionService.isSessionValid();
      if (!isValid) {
        // Try to recover session
        const recovered = await sessionService.attemptSessionRecovery();
        if (!recovered) {
          await endSession('EXPIRED');
          return;
        }
      }
      
      // Check if session is about to expire
      if (sessionService.isSessionExpiringSoon()) {
        handleSessionExpiringSoon();
      }
      
      // Check if token needs refresh
      if (tokenService.isTokenExpiringSoon()) {
        await refreshSession();
      }
      
      // Check for suspicious activity
      const suspiciousActivity = await securityService.detectSuspiciousActivity();
      if (suspiciousActivity) {
        handleSuspiciousActivity(suspiciousActivity);
      }
      
      // Update session metrics
      await updateSessionMetrics();
    } catch (error) {
      logger.error('Session check failed', {
        component: COMPONENT,
        action: 'checkSessionStatus',
        error
      });
    }
  }, [isAuthenticated]);

  // Handle session expiring soon
  const handleSessionExpiringSoon = useCallback(() => {
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
  }, [dispatch]);

  // Handle suspicious activity
  const handleSuspiciousActivity = useCallback((suspiciousActivity: any) => {
    logger.warn('Suspicious activity detected', {
      component: COMPONENT,
      action: 'handleSuspiciousActivity',
      details: suspiciousActivity
    });
    
    // Notify user and take appropriate action
    dispatch(setSessionAlert({
      type: 'danger',
      message: 'Suspicious activity detected. Please verify your identity.',
      action: 'verify',
      details: suspiciousActivity
    }));
    
    // Emit security issue event
    sessionService.events.emit('sessionSecurityIssue', suspiciousActivity);
  }, [dispatch]);

  // Update session metrics
  const updateSessionMetrics = async () => {
    try {
      const metrics = await sessionService.getSessionMetrics();
      setSessionMetrics(metrics);
    } catch (error) {
      logger.error('Failed to update session metrics', {
        component: COMPONENT,
        action: 'updateSessionMetrics',
        error
      });
    }
  };

  // Extend session
  const extendSession = async (): Promise<boolean> => {
    try {
      const extended = await sessionService.extendSession();
      
      if (extended) {
        dispatch(setSessionAlert(null));
        await initializeSessionData();
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

  // End session
  const endSession = async (reason: string = 'LOGOUT'): Promise<void> => {
    try {
      await sessionService.endSession(reason);
    } catch (error) {
      logger.error('Session end failed', {
        component: COMPONENT,
        action: 'endSession',
        error
      });
    }
  };

  // Refresh session
  const refreshSession = async (): Promise<boolean> => {
    try {
      const refreshed = await tokenService.refreshTokens();
      return refreshed;
    } catch (error) {
      logger.error('Session refresh failed', {
        component: COMPONENT,
        action: 'refreshSession',
        error
      });
      return false;
    }
  };

  // Get session duration
  const getSessionDuration = (): number => {
    if (!sessionInfo) return 0;
    return Date.now() - sessionInfo.startTime;
  };

  // Get idle time
  const getIdleTime = (): number => {
    return Date.now() - lastActivity;
  };

  // Check if session is expiring soon
  const isSessionExpiringSoon = (): boolean => {
    return sessionService.isSessionExpiringSoon();
  };

  // Force logout
  const forceLogout = async (sessionId: string, reason: string = 'ADMIN_ACTION'): Promise<void> => {
    try {
      await sessionService.forceLogout(sessionId, reason);
    } catch (error) {
      logger.error('Force logout failed', {
        component: COMPONENT,
        action: 'forceLogout',
        error
      });
      throw error;
    }
  };

  // Get all sessions
  const getAllSessions = async (): Promise<SessionInfo[]> => {
    try {
      return await sessionService.getAllSessions();
    } catch (error) {
      logger.error('Failed to get all sessions', {
        component: COMPONENT,
        action: 'getAllSessions',
        error
      });
      return [];
    }
  };

  // Terminate other sessions
  const terminateOtherSessions = async (): Promise<boolean> => {
    try {
      if (!sessionInfo) return false;
      
      await sessionService.terminateOtherSessions(sessionInfo.id);
      toast.success('All other sessions have been terminated');
      return true;
    } catch (error) {
      logger.error('Failed to terminate other sessions', {
        component: COMPONENT,
        action: 'terminateOtherSessions',
        error
      });
      return false;
    }
  };

  // Validate session
  const validateSession = async (): Promise<boolean> => {
    try {
      return await sessionService.isSessionValid();
    } catch (error) {
      logger.error('Session validation failed', {
        component: COMPONENT,
        action: 'validateSession',
        error
      });
      return false;
    }
  };

  // Check security context
  const checkSecurityContext = async (): Promise<boolean> => {
    try {
      const session = await sessionService.getSession();
      if (!session) return false;
      
      return await sessionService.validateSecurityContext(session);
    } catch (error) {
      logger.error('Security context check failed', {
        component: COMPONENT,
        action: 'checkSecurityContext',
        error
      });
      return false;
    }
  };

  return {
    // Session state
    isActive,
    timeRemaining,
    lastActivity,
    sessionInfo,
    sessionMetrics,
    
    // Session actions
    extendSession,
    endSession,
    refreshSession,
    
    // Session utilities
    getSessionDuration,
    getIdleTime,
    isSessionExpiringSoon,
    
    // Session management
    forceLogout,
    getAllSessions,
    terminateOtherSessions,
    
    // Session security
    validateSession,
    checkSecurityContext
  };
};