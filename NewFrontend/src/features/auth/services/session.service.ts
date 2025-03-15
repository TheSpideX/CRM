import { BroadcastChannel } from 'broadcast-channel';
import { tokenService } from './token.service';
import { securityService } from './security.service';
import { deviceService } from './device.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { EventEmitter } from '@/utils/event-emitter';
import { Logger } from '@/utils/logger';
import { 
  SessionData, 
  SessionState, 
  SessionMetrics,
  DeviceInfo,
  SecurityContext 
} from '../types/session.types';
import { User } from '../types/auth.types';
import { axiosInstance } from '@/utils/axios';
import { API_ROUTES } from '@/config/routes';
import { SecureStorage } from '@/utils/secure-storage';
import { AuthError, createAuthError } from '../errors/auth-error';

interface ValidationCacheEntry {
  result: boolean;
  timestamp: number;
}

export class SessionService {
  private static instance: SessionService;
  private readonly SESSION_KEY = 'user_session';
  private readonly ACTIVITY_KEY = 'last_activity';
  private readonly METRICS_KEY = 'session_metrics';
  private readonly INACTIVE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CHECK_INTERVAL = 60 * 1000; // 1 minute
  private readonly VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  private secureStorage: SecureStorage;
  private logger: Logger;
  private sessionChannel: BroadcastChannel<any>;
  private sessionListeners: Set<() => void> = new Set();
  private events: EventEmitter;
  private activityTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private metrics: SessionMetrics = {
    startTime: 0,
    activeTime: 0,
    interactions: 0,
    networkRequests: 0,
    errors: 0
  };
  private validationCache: Map<string, ValidationCacheEntry> = new Map();
  private recoveryAttempts: number = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private isRecoveryInProgress: boolean = false;

  private constructor() {
    this.secureStorage = new SecureStorage('session');
    this.logger = new Logger('SessionService');
    this.sessionChannel = new BroadcastChannel('session_channel');
    this.events = new EventEmitter();
    
    this.setupSessionSync();
    this.setupBeforeUnloadHandler();
    this.setupNetworkStatusMonitoring();
    
    // Initialize session if tokens exist
    this.initializeFromExistingTokens();
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  // Event subscription methods
  onSessionStart(callback: (data: any) => void): () => void {
    return this.events.on('sessionStarted', callback);
  }

  onSessionEnd(callback: (data: any) => void): () => void {
    return this.events.on('sessionEnded', callback);
  }

  onSessionExpired(callback: () => void): () => void {
    return this.events.on('sessionExpired', callback);
  }

  onSessionExtended(callback: () => void): () => void {
    return this.events.on('sessionExtended', callback);
  }

  onForceLogout(callback: (data: any) => void): () => void {
    return this.events.on('forceLogout', callback);
  }

  onGlobalLogout(callback: () => void): () => void {
    return this.events.on('globalLogout', callback);
  }

  onSessionSecurityIssue(callback: (data: any) => void): () => void {
    return this.events.on('sessionSecurityIssue', callback);
  }

  // Session Lifecycle Management
  async initializeSession(user: User, deviceInfo: DeviceInfo): Promise<void> {
    try {
      const securityContext = await securityService.getSecurityContext();
      const session: SessionData = {
        id: crypto.randomUUID(),
        user,
        startTime: Date.now(),
        lastActivity: Date.now(),
        deviceInfo: {
          ...deviceInfo,
          userAgent: navigator.userAgent,
          platform: navigator.platform
        },
        securityContext,
        state: 'active',
        metadata: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`
        }
      };

      await this.storeSession(session);
      await this.registerSessionWithServer(session);
      this.startSessionMonitoring();
      this.initializeSessionMetrics(session);
      
      this.sessionChannel.postMessage({ 
        type: 'SESSION_INITIALIZED', 
        data: session 
      });

      this.events.emit('sessionStarted', { sessionId: session.id });
    } catch (error) {
      this.logger.error('Session initialization failed', { error });
      throw new Error('Failed to initialize session');
    }
  }

  async endSession(reason: 'LOGOUT' | 'EXPIRED' | 'FORCED' = 'LOGOUT'): Promise<void> {
    try {
      const session = await this.getSession();
      if (session) {
        await this.deregisterSessionFromServer(session.id);
        this.stopSessionMonitoring();
        await this.saveSessionMetrics();
        
        await Promise.all([
          tokenService.clearTokens(),
          this.clearSessionData(),
          this.notifySessionEnd(reason)
        ]);

        this.sessionChannel.postMessage({ 
          type: 'SESSION_ENDED',
          data: { reason, sessionId: session.id } 
        });
        
        this.events.emit('sessionEnded', { reason, sessionId: session.id });
      }
    } catch (error) {
      this.logger.error('Session end error:', { error });
      // Force cleanup even if server communication fails
      await this.clearSessionData();
    }
  }

  // Session Storage and Retrieval
  private async storeSession(session: SessionData): Promise<void> {
    try {
      const encryptedSession = await this.encryptSessionData(session);
      await this.secureStorage.setItem(this.SESSION_KEY, encryptedSession);
    } catch (error) {
      this.logger.error('Session storage failed', { error });
      throw new Error('Failed to store session');
    }
  }

  async getSession(): Promise<SessionData | null> {
    try {
      const encryptedSession = await this.secureStorage.getItem(this.SESSION_KEY);
      if (!encryptedSession) return null;
      
      const session = await this.decryptSessionData(encryptedSession);
      return session;
    } catch {
      return null;
    }
  }

  // Session Validation and Activity Monitoring
  async isSessionValid(options: { useCachedResult?: boolean } = {}): Promise<boolean> {
    try {
      const { useCachedResult = false } = options;
      const session = await this.getSession();
      if (!session) return false;
      
      // Check cache first
      const cacheKey = `session_valid:${session.id}`;
      const cachedResult = this.validationCache.get(cacheKey);
      
      if (cachedResult && (Date.now() - cachedResult.timestamp < this.VALIDATION_CACHE_TTL)) {
        return cachedResult.result;
      }
      
      // If we want to use cached results but cache is empty/expired
      // and this is not a critical operation, return true and validate in background
      if (useCachedResult) {
        // Schedule validation in background
        this.validateSessionInBackground(session);
        // Return true for better UX, assuming session is valid
        return true;
      }
      
      // Perform validation if no cache or cache expired
      const validationResults = await Promise.all([
        this.validateTokens(),
        this.validateDeviceContext(session),
        this.validateActivityTimeout(),
        this.validateSecurityContext(session)
      ]);
      
      const isValid = validationResults.every(result => result);
      
      // Cache the result
      this.validationCache.set(cacheKey, {
        result: isValid,
        timestamp: Date.now()
      });
      
      return isValid;
    } catch {
      return false;
    }
  }

  private startSessionMonitoring(): void {
    this.startActivityTracking();
    this.startSessionSync();
    this.startMetricsTracking();
    this.startHealthMonitoring();
  }

  private stopSessionMonitoring(): void {
    [this.activityTimer, this.syncTimer, this.metricsTimer, this.healthCheckTimer].forEach(timer => {
      if (timer) clearInterval(timer);
    });
    this.removeActivityListeners();
  }

  // Activity Tracking
  private startActivityTracking(): void {
    const activityEvents = ['mousemove', 'keypress', 'click', 'touchstart', 'scroll'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, this.handleUserActivity);
    });

    this.activityTimer = setInterval(() => {
      this.checkInactivity();
    }, this.CHECK_INTERVAL);
  }

  private handleUserActivity = async (): Promise<void> => {
    const currentSession = await this.getSession();
    if (!currentSession) return;

    this.updateLastActivity();
    this.metrics.interactions++;
    
    this.sessionChannel.postMessage({ 
      type: 'ACTIVITY_UPDATE',
      data: {
        sessionId: currentSession.id,
        timestamp: Date.now()
      }
    });
  };

  private removeActivityListeners(): void {
    const activityEvents = ['mousemove', 'keypress', 'click', 'touchstart', 'scroll'];
    
    activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleUserActivity);
    });
  }

  // Session Synchronization
  private setupSessionSync(): void {
    this.sessionChannel.onmessage = async (msg) => {
      switch (msg.type) {
        case 'SESSION_TERMINATED':
          if (msg.data.sessionId === (await this.getSession())?.id) {
            await this.endSession('FORCED');
            this.events.emit('forceLogout', { reason: msg.data.reason });
          }
          break;

        case 'SESSION_RECOVERY_REQUIRED':
          if (msg.data.sessionId === (await this.getSession())?.id) {
            await this.attemptSessionRecovery();
          }
          break;

        case 'GLOBAL_LOGOUT':
          await this.endSession('FORCED');
          this.events.emit('globalLogout');
          break;

        case 'SESSION_STATE_UPDATE':
          await this.handleSessionStateUpdate(msg.data);
          break;
          
        case 'ACTIVITY_UPDATE':
          // Sync activity across tabs
          const session = await this.getSession();
          if (session && msg.data.sessionId === session.id) {
            localStorage.setItem(this.ACTIVITY_KEY, msg.data.timestamp.toString());
          }
          break;
      }
    };
    
    this.startSessionSync();
  }

  private startSessionSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(async () => {
      try {
        const session = await this.getSession();
        if (!session) return;
        
        // Sync session state with server
        const response = await axiosInstance.post(API_ROUTES.AUTH.SYNC_SESSION, {
          sessionId: session.id,
          lastActivity: await this.getLastActivity(),
          metrics: this.metrics
        });
        
        if (response.data.status === 'invalid') {
          this.sessionChannel.postMessage({
            type: 'SESSION_RECOVERY_REQUIRED',
            data: { sessionId: session.id }
          });
        } else if (response.data.status === 'terminated') {
          await this.endSession('FORCED');
          this.events.emit('forceLogout', { reason: response.data.reason });
        }
      } catch (error) {
        this.logger.error('Session sync failed', { error });
      }
    }, this.SYNC_INTERVAL);
  }

  // Metrics and Analytics
  private initializeSessionMetrics(session: SessionData): void {
    this.metrics = {
      startTime: session.startTime,
      activeTime: 0,
      interactions: 0,
      networkRequests: 0,
      errors: 0
    };
  }

  private startMetricsTracking(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    this.metricsTimer = setInterval(() => {
      this.updateSessionMetrics();
    }, 60000); // Update metrics every minute
    
    // Track network requests
    this.setupNetworkTracking();
  }

  private updateSessionMetrics(): void {
    const now = Date.now();
    const lastActivity = parseInt(localStorage.getItem(this.ACTIVITY_KEY) || '0', 10);
    
    // Only count time as active if there was activity in the last 5 minutes
    if (now - lastActivity < 5 * 60 * 1000) {
      this.metrics.activeTime += 60; // Add one minute of active time
    }
    
    // Save metrics to storage
    this.saveSessionMetrics();
  }

  private async saveSessionMetrics(): Promise<void> {
    try {
      localStorage.setItem(this.METRICS_KEY, JSON.stringify(this.metrics));
      
      // Optionally send metrics to server
      const session = await this.getSession();
      if (session) {
        await axiosInstance.post(API_ROUTES.AUTH.UPDATE_SESSION_METRICS, {
          sessionId: session.id,
          metrics: this.metrics
        }).catch(error => {
          this.logger.error('Failed to update session metrics on server', { error });
        });
      }
    } catch (error) {
      this.logger.error('Failed to save session metrics', { error });
    }
  }

  private setupNetworkTracking(): void {
    // Track successful requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      this.metrics.networkRequests++;
      return originalFetch.apply(window, args);
    };
    
    // Track axios requests
    axiosInstance.interceptors.request.use(config => {
      this.metrics.networkRequests++;
      return config;
    });
    
    // Track errors
    window.addEventListener('error', () => {
      this.metrics.errors++;
    });
  }

  // Security and Validation
  private async validateTokens(): Promise<boolean> {
    const accessToken = await tokenService.getAccessToken();
    return !!(accessToken && !(await tokenService.isTokenBlacklisted(accessToken)));
  }

  private async validateDeviceContext(session: SessionData): Promise<boolean> {
    const currentDeviceInfo = await deviceService.getDeviceInfo();
    return currentDeviceInfo.fingerprint === session.deviceInfo.fingerprint;
  }

  private async validateActivityTimeout(): Promise<boolean> {
    const lastActivity = await this.getLastActivity();
    return (Date.now() - lastActivity) < this.INACTIVE_TIMEOUT;
  }

  private async validateSecurityContext(session: SessionData): Promise<boolean> {
    // Use a single API call to validate multiple security aspects
    try {
      const response = await axiosInstance.post(API_ROUTES.AUTH.VALIDATE_SESSION, {
        sessionId: session.id,
        deviceFingerprint: session.deviceInfo.fingerprint,
        securityContext: session.securityContext
      });
      
      return response.data.valid;
    } catch {
      // If server validation fails, fall back to local validation
      const currentSecurityContext = await securityService.getSecurityContext();
      
      // Compare critical security properties
      return (
        currentSecurityContext.ipAddress === session.securityContext.ipAddress &&
        currentSecurityContext.userAgent === session.securityContext.userAgent
      );
    }
  }

  // Utility Methods
  private async encryptSessionData(data: SessionData): Promise<string> {
    // In a real implementation, this would use a proper encryption algorithm
    // For now, we'll just return the JSON string
    // TODO: Implement actual encryption
    return JSON.stringify(data);
  }

  private async decryptSessionData(encrypted: string): Promise<SessionData> {
    // In a real implementation, this would decrypt the data
    // For now, we'll just parse the JSON
    // TODO: Implement actual decryption
    return JSON.parse(encrypted);
  }

  private async clearSessionData(): Promise<void> {
    await this.secureStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.ACTIVITY_KEY);
    localStorage.removeItem(this.METRICS_KEY);
    sessionStorage.removeItem('session_state');
  }

  private async checkInactivity(): Promise<void> {
    const session = await this.getSession();
    if (!session) return;

    const lastActivity = await this.getLastActivity();
    const now = Date.now();
    const inactiveTime = now - lastActivity;

    if (inactiveTime >= this.INACTIVE_TIMEOUT) {
      await this.endSession('EXPIRED');
      this.events.emit('sessionExpired');
    } else if (this.shouldExtendSession(inactiveTime)) {
      await this.extendSession();
    }
  }

  private async getLastActivity(): Promise<number> {
    const stored = localStorage.getItem(this.ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  }

  private async updateLastActivity(): Promise<void> {
    const now = Date.now();
    localStorage.setItem(this.ACTIVITY_KEY, now.toString());
    
    const session = await this.getSession();
    if (session) {
      session.lastActivity = now;
      await this.storeSession(session);
    }
  }

  private shouldExtendSession(inactiveTime: number): boolean {
    const extensionThreshold = this.INACTIVE_TIMEOUT * 0.5; // Extend at 50% of timeout
    return inactiveTime >= extensionThreshold;
  }

  private async extendSession(): Promise<void> {
    try {
      const session = await this.getSession();
      if (!session) return;

      // Extend session on server
      await axiosInstance.post(API_ROUTES.AUTH.EXTEND_SESSION, {
        sessionId: session.id
      });

      // Update local session
      session.expiresAt = Date.now() + this.INACTIVE_TIMEOUT;
      await this.storeSession(session);
      
      this.events.emit('sessionExtended');
    } catch (error) {
      this.logger.error('Failed to extend session', { error });
    }
  }

  // Session Recovery
  private async attemptSessionRecovery(): Promise<boolean> {
    if (this.isRecoveryInProgress) return false;
    
    this.isRecoveryInProgress = true;
    
    try {
      if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
        this.logger.warn('Maximum recovery attempts reached, forcing logout');
        await this.endSession('FORCED');
        this.events.emit('forceLogout', { reason: 'MAX_RECOVERY_ATTEMPTS_REACHED' });
        return false;
      }
      
      this.recoveryAttempts++;
      
      const session = await this.getSession();
      if (!session) return false;

      const recoverySteps = [
        this.validateTokens(),
        this.validateDeviceContext(session),
        this.validateSecurityContext(session),
        this.validateActivityTimeout()
      ];

      const results = await Promise.all(recoverySteps);
      const isValid = results.every(result => result);

      if (!isValid) {
        // Try to refresh tokens
        const refreshed = await tokenService.refreshTokens();
        if (refreshed) {
          await this.extendSession();
          this.recoveryAttempts = 0; // Reset counter on successful recovery
          return true;
        }
        
        // If token refresh fails, try to restore from persisted state
        const restored = await this.restoreSessionState();
        if (restored) {
          this.recoveryAttempts = 0;
          return true;
        }
      } else {
        this.recoveryAttempts = 0;
        return true;
      }

      // If all recovery attempts fail
      if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
        await this.endSession('FORCED');
        this.events.emit('forceLogout', { reason: 'RECOVERY_FAILED' });
      }
      
      return false;
    } catch (error) {
      this.logger.error('Session recovery failed', { error });
      return false;
    } finally {
      this.isRecoveryInProgress = false;
    }
  }

  private async persistSessionState(): Promise<void> {
    try {
      const session = await this.getSession();
      if (!session) return;

      const persistedState = {
        sessionId: session.id,
        metrics: this.metrics,
        lastActivity: await this.getLastActivity(),
        securityContext: session.securityContext
      };

      const encrypted = await this.encryptSessionData(persistedState);
      sessionStorage.setItem('session_state', encrypted);
    } catch (error) {
      this.logger.error('Failed to persist session state', { error });
    }
  }

  private async restoreSessionState(): Promise<boolean> {
    try {
      const encryptedState = sessionStorage.getItem('session_state');
      if (!encryptedState) return false;
      
      const state = await this.decryptSessionData(encryptedState);
      
      // Verify the session ID matches
      const currentSession = await this.getSession();
      if (!currentSession || currentSession.id !== state.sessionId) {
        return false;
      }
      
      // Restore metrics and activity
      this.metrics = state.metrics;
      localStorage.setItem(this.ACTIVITY_KEY, state.lastActivity.toString());
      
      return true;
    } catch (error) {
      this.logger.error('Failed to restore session state', { error });
      return false;
    }
  }

  // Health Monitoring
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.monitorSessionHealth();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async monitorSessionHealth(): Promise<void> {
    try {
      const session = await this.getSession();
      if (!session) return;

      const healthMetrics = {
        tokenHealth: await this.validateTokens(),
        deviceHealth: await this.validateDeviceContext(session),
        securityHealth: await this.validateSecurityContext(session),
        activityHealth: Date.now() - await this.getLastActivity() < this.INACTIVE_TIMEOUT,
        networkHealth: navigator.onLine
      };

      const unhealthyMetrics = Object.entries(healthMetrics)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (unhealthyMetrics.length > 0) {
        this.logger.warn('Session health issues detected', { unhealthyMetrics });
        
        if (unhealthyMetrics.includes('tokenHealth')) {
          await this.attemptSessionRecovery();
        }

        if (unhealthyMetrics.includes('securityHealth')) {
          this.events.emit('sessionSecurityIssue', { 
            sessionId: session.id,
            issues: unhealthyMetrics
          });
        }
      }
    } catch (error) {
      this.logger.error('Session health check failed', { error });
    }
  }

  // Server Communication
  private async registerSessionWithServer(session: SessionData): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.REGISTER_SESSION, {
        sessionId: session.id,
        userId: session.user.id,
        deviceInfo: session.deviceInfo,
        metadata: session.metadata
      });
    } catch (error) {
      this.logger.error('Failed to register session with server', { error });
      // Continue anyway - we'll try to sync later
    }
  }

  private async deregisterSessionFromServer(sessionId: string): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.DEREGISTER_SESSION, { sessionId });
    } catch (error) {
      this.logger.error('Failed to deregister session from server', { error });
      // Continue anyway - session will eventually expire on server
    }
  }

  private async notifySessionEnd(reason: string): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.END_SESSION, { 
        reason,
        metrics: this.metrics
      });
    } catch (error) {
      this.logger.error('Failed to notify server about session end', { error });
    }
  }

  // Force logout capability
  async forceLogout(sessionId: string, reason: string = 'ADMIN_ACTION'): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.FORCE_LOGOUT, { sessionId });
      
      this.sessionChannel.postMessage({
        type: 'SESSION_TERMINATED',
        data: { sessionId, reason }
      });

      this.events.emit('sessionTerminated', { sessionId, reason });
    } catch (error) {
      this.logger.error('Force logout failed', { error });
      throw error;
    }
  }

  // Global logout (all sessions)
  async logoutAllSessions(exceptCurrentSession: boolean = false): Promise<void> {
    try {
      const currentSession = await this.getSession();
      await axiosInstance.post(API_ROUTES.AUTH.LOGOUT_ALL, {
        exceptSessionId: exceptCurrentSession ? currentSession?.id : null
      });

      this.sessionChannel.postMessage({
        type: 'GLOBAL_LOGOUT',
        data: { initiatorSessionId: currentSession?.id }
      });

      if (!exceptCurrentSession) {
        await this.endSession('FORCED');
      }
    } catch (error) {
      this.logger.error('Global logout failed', { error });
      throw error;
    }
  }

  // Handle session state updates
  private async handleSessionStateUpdate(data: any): Promise<void> {
    const currentSession = await this.getSession();
    if (!currentSession || data.sessionId !== currentSession.id) return;

    if (data.type === 'SECURITY_CONTEXT_CHANGE') {
      await this.validateSecurityContext(currentSession);
    } else if (data.type === 'TOKEN_REFRESH_REQUIRED') {
      await tokenService.refreshTokens();
    }
  }

  // Get all active sessions
  async getAllActiveSessions(): Promise<SessionData[]> {
    try {
      const response = await axiosInstance.get(API_ROUTES.AUTH.ACTIVE_SESSIONS);
      const currentSession = await this.getSession();

      return response.data.map(session => ({
        ...session,
        isCurrentSession: session.id === currentSession?.id
      }));
    } catch (error) {
      this.logger.error('Failed to fetch active sessions', { error });
      throw error;
    }
  }

  // Initialize from existing tokens
  private async initializeFromExistingTokens(): Promise<void> {
    try {
      const accessToken = await tokenService.getAccessToken();
      if (!accessToken) return;
      
      // Check if token is valid
      if (await tokenService.isTokenExpired(accessToken)) {
        // Try to refresh token
        const refreshed = await tokenService.refreshTokens();
        if (!refreshed) {
          await this.clearSessionData();
          return;
        }
      }
      
      // Check if we have an existing session
      const existingSession = await this.getSession();
      if (existingSession) {
        // Validate session
        if (await this.isSessionValid()) {
          this.startSessionMonitoring();
          
          // Load metrics from storage
          const storedMetrics = localStorage.getItem(this.METRICS_KEY);
          if (storedMetrics) {
            this.metrics = JSON.parse(storedMetrics);
          } else {
            this.initializeSessionMetrics(existingSession);
          }
          
          this.events.emit('sessionRestored', { sessionId: existingSession.id });
        } else {
          // Session is invalid, try recovery
          const recovered = await this.attemptSessionRecovery();
          if (!recovered) {
            await this.clearSessionData();
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize from existing tokens', { error });
      await this.clearSessionData();
    }
  }

  // Browser lifecycle hooks
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.persistSessionState();
    });
  }

  private setupNetworkStatusMonitoring(): void {
    window.addEventListener('online', () => {
      this.handleNetworkStatusChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.handleNetworkStatusChange(false);
    });
  }

  private async handleNetworkStatusChange(isOnline: boolean): Promise<void> {
    if (isOnline) {
      // When coming back online, sync session with server
      const session = await this.getSession();
      if (session) {
        try {
          await axiosInstance.post(API_ROUTES.AUTH.SYNC_SESSION, {
            sessionId: session.id,
            lastActivity: await this.getLastActivity(),
            metrics: this.metrics,
            reconnect: true
          });
        } catch (error) {
          this.logger.error('Failed to sync session after reconnect', { error });
        }
      }
    }
  }

  // Session information methods
  async getSessionDuration(): Promise<number> {
    const session = await this.getSession();
    if (!session) return 0;
    
    return Date.now() - session.startTime;
  }

  async getSessionTimeRemaining(): Promise<number> {
    const lastActivity = await this.getLastActivity();
    const timeElapsed = Date.now() - lastActivity;
    return Math.max(0, this.INACTIVE_TIMEOUT - timeElapsed);
  }

  async getSessionInfo(): Promise<Record<string, any>> {
    const session = await this.getSession();
    if (!session) return {};
    
    return {
      id: session.id,
      startTime: new Date(session.startTime).toISOString(),
      lastActivity: new Date(session.lastActivity).toISOString(),
      duration: await this.getSessionDuration(),
      timeRemaining: await this.getSessionTimeRemaining(),
      deviceInfo: session.deviceInfo,
      metadata: session.metadata,
      metrics: this.metrics
    };
  }

  // Cleanup
  destroy(): void {
    this.stopSessionMonitoring();
    this.sessionChannel.close();
    this.sessionListeners.clear();
    this.events.removeAllListeners();
  }

  // Offline support
  async handleOfflineMode(): Promise<void> {
    const session = await this.getSession();
    if (!session) return;
    
    // Store critical session data in IndexedDB for offline access
    await this.offlineStorage.storeSession({
      id: session.id,
      user: session.user,
      lastActivity: Date.now(),
      offlineMode: true
    });
    
    // Queue operations that need to be synced when back online
    this.syncQueue.initialize();
    
    // Update session state
    await this.updateSession({
      ...session,
      state: 'offline',
      metadata: {
        ...session.metadata,
        offlineSince: new Date().toISOString()
      }
    });
    
    this.events.emit('sessionOffline', { timestamp: new Date() });
  }

  // Network recovery
  async handleNetworkRecovery(): Promise<void> {
    const session = await this.getSession();
    if (!session) return;
    
    try {
      // Validate session with server
      const isValid = await this.validateWithServer(session.id);
      
      if (isValid) {
        // Process sync queue
        await this.syncQueue.processQueue();
        
        // Update session state
        await this.updateSession({
          ...session,
          state: 'active',
          lastActivity: Date.now(),
          metadata: {
            ...session.metadata,
            recoveredAt: new Date().toISOString()
          }
        });
        
        this.events.emit('sessionRecovered', { timestamp: new Date() });
      } else {
        // Session expired during offline period
        await this.handleExpiredSession();
      }
    } catch (error) {
      // Handle recovery failure
      this.logger.error('Session recovery failed', error);
      this.events.emit('sessionRecoveryFailed', { 
        timestamp: new Date(),
        error
      });
    }
  }

  // Session recovery from unexpected termination
  async recoverSessionFromStorage(): Promise<boolean> {
    try {
      // Check for recoverable session in storage
      const storedSession = await this.storage.getItem('last_active_session');
      if (!storedSession) return false;
      
      // Validate the stored session with the server
      const isValid = await this.validateWithServer(storedSession.id);
      if (!isValid) {
        await this.storage.removeItem('last_active_session');
        return false;
      }
      
      // Restore the session
      await this.restoreSession(storedSession);
      this.events.emit('sessionRestored', { timestamp: new Date() });
      return true;
    } catch (error) {
      this.logger.error('Session recovery attempt failed', error);
      return false;
    }
  }

  private async validateSessionInBackground(session: SessionData): Promise<void> {
    try {
      const validationResults = await Promise.all([
        this.validateTokens(),
        this.validateDeviceContext(session),
        this.validateActivityTimeout(),
        this.validateSecurityContext(session)
      ]);
      
      const isValid = validationResults.every(result => result);
      
      // Update cache
      const cacheKey = `session_valid:${session.id}`;
      this.validationCache.set(cacheKey, {
        result: isValid,
        timestamp: Date.now()
      });
      
      // If session is invalid, trigger event
      if (!isValid) {
        this.events.emit('sessionInvalid', { session });
      }
    } catch (error) {
      // Log error but don't throw
      console.error('Background session validation failed:', error);
    }
  }
}

export const sessionService = new SessionService();
