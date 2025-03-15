import { tokenService } from './token.service';
import { sessionService } from './session.service';
import { securityService } from './security.service';
import { deviceService } from './device.service';
import { store } from '@/store';
import { setCredentials, clearCredentials, setAuthLoading, setAuthError, setSecurityContext } from '../store/authSlice';
import { AuthApi } from '../api/auth-api';
import { Logger } from '@/utils/logger';
import { User, LoginCredentials, RegisterData, PasswordResetData, TwoFactorAuthData, SecurityContext } from '../types/auth.types';
import authPersistenceService from './auth-persistence.service';
import { AuthError, createAuthError } from '../errors/auth-error';
import { offlineAuthService } from './offline-auth.service';

class AuthService {
  private static instance: AuthService;
  private logger: Logger;
  private loginAttempts: Map<string, { count: number, lastAttempt: Date }>;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.logger = new Logger('AuthService');
    this.loginAttempts = new Map();
    this.setupEventListeners();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private setupEventListeners(): void {
    // Listen for storage events to sync auth state across tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_logout' && event.newValue === 'true') {
        this.handleCrossTabLogout();
      }
    });

    // Set up network status monitoring
    window.addEventListener('online', () => this.handleNetworkStatusChange(true));
    window.addEventListener('offline', () => this.handleNetworkStatusChange(false));
  }

  private async handleCrossTabLogout(): Promise<void> {
    // Clear local state without making API call (already done in other tab)
    store.dispatch(clearCredentials());
    await tokenService.clearTokens();
    await sessionService.endSession('CROSS_TAB_LOGOUT');
    await securityService.clearSecurityContext();
  }

  private handleNetworkStatusChange(isOnline: boolean): void {
    if (isOnline && sessionService.isPendingSync()) {
      this.syncSessionState();
    }
  }

  private async syncSessionState(): Promise<void> {
    try {
      const isValid = await this.validateSession();
      if (!isValid) {
        await this.logout(true);
      }
    } catch (error) {
      this.logger.warn('Failed to sync session state', { error });
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      store.dispatch(setAuthLoading(true));
      
      // Check for too many failed attempts
      if (this.isRateLimited(credentials.email)) {
        throw new Error('TOO_MANY_ATTEMPTS');
      }
      
      // Check network status
      const isOnline = navigator.onLine;
      
      // If offline, try offline authentication
      if (!isOnline) {
        this.logger.info('Attempting offline authentication', { email: credentials.email });
        const offlineUser = await this.tryOfflineAuthentication(credentials);
        if (offlineUser) {
          store.dispatch(setAuthLoading(false));
          return offlineUser;
        }
        store.dispatch(setAuthLoading(false));
        throw createAuthError('OFFLINE_AUTH_FAILED', 'Cannot authenticate while offline');
      }
      
      // Online flow continues...
      await securityService.performPreLoginChecks(credentials.email);
      
      // Use AuthApi for the actual API call
      const { user, tokens, securityContext, requiresTwoFactor } = await AuthApi.loginRequest(credentials);
      
      // Store credentials for offline use
      await offlineAuthService.storeOfflineCredentials(user, credentials);
      
      // Handle 2FA if required
      if (requiresTwoFactor) {
        return this.handleTwoFactorRequired({ user, tokens, securityContext, requiresTwoFactor });
      }
      
      // Store tokens
      await tokenService.storeTokens(tokens, { rememberMe: credentials.rememberMe });

      // Persist auth state using the new persistence service
      await authPersistenceService.persistAuthState({
        user,
        securityContext,
        rememberMe: credentials.rememberMe
      }, { 
        rememberMe: credentials.rememberMe 
      });
      
      // Initialize session
      await sessionService.initializeSession(user, deviceInfo);
      
      // Update security context
      if (securityContext) {
        store.dispatch(setSecurityContext(securityContext));
        await securityService.updateSecurityContext(securityContext);
      }
      
      // Reset login attempts
      this.resetLoginAttempts(credentials.email);
      
      // Update Redux store
      store.dispatch(setCredentials({ user }));
      
      return user;
    } catch (error) {
      this.logger.error('Login failed', { error });
      this.handleLoginError(credentials.email, error);
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  private isRateLimited(email: string): boolean {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;
    
    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
    
    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS && timeSinceLastAttempt < this.LOCKOUT_DURATION) {
      return true;
    }
    
    // Reset if lockout period has passed
    if (timeSinceLastAttempt >= this.LOCKOUT_DURATION) {
      this.resetLoginAttempts(email);
    }
    
    return false;
  }

  private handleLoginError(email: string, error: any): void {
    // Track failed login attempts for rate limiting
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: new Date() };
    attempts.count += 1;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(email, attempts);
    
    // Set appropriate error message
    const errorMessage = this.getErrorMessage(error);
    store.dispatch(setAuthError(errorMessage));
  }

  private getErrorMessage(error: any): string {
    const errorCode = error.response?.data?.code || '';
    
    switch (errorCode) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password';
      case 'ACCOUNT_LOCKED':
        return 'Your account has been temporarily locked due to too many failed attempts';
      case 'DEVICE_VERIFICATION_REQUIRED':
        return 'Please verify this device using the link sent to your email';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many login attempts. Please try again later';
      case 'PASSWORD_EXPIRED':
        return 'Your password has expired. Please reset it';
      default:
        return error.response?.data?.message || 'Login failed. Please try again';
    }
  }

  private resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }

  private async handleTwoFactorRequired(data: any): Promise<never> {
    // Store temporary data for 2FA flow
    sessionStorage.setItem('twoFactorAuth', JSON.stringify({
      userId: data.user.id,
      email: data.user.email,
      twoFactorToken: data.twoFactorToken,
      timestamp: Date.now()
    }));
    
    throw new Error('TWO_FACTOR_REQUIRED');
  }

  async verifyTwoFactor(twoFactorData: TwoFactorAuthData): Promise<User> {
    try {
      store.dispatch(setAuthLoading(true));
      
      // Get stored 2FA data
      const storedData = JSON.parse(sessionStorage.getItem('twoFactorAuth') || '{}');
      if (!storedData.userId || !storedData.twoFactorToken) {
        throw new Error('INVALID_2FA_SESSION');
      }
      
      // Check if 2FA session has expired (10 minutes)
      if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
        sessionStorage.removeItem('twoFactorAuth');
        throw new Error('TWO_FACTOR_EXPIRED');
      }
      
      const deviceInfo = await securityService.getDeviceInfo();
      
      // Verify 2FA code
      const response = await axiosInstance.post(API_ROUTES.AUTH.VERIFY_2FA, {
        userId: storedData.userId,
        code: twoFactorData.code,
        twoFactorToken: storedData.twoFactorToken,
        deviceInfo
      });
      
      const { user, tokens, securityContext } = response.data;
      
      // Clear 2FA session data
      sessionStorage.removeItem('twoFactorAuth');
      
      // Store tokens
      await tokenService.setTokens(tokens);
      
      // Initialize session
      await sessionService.initializeSession(user, deviceInfo);
      
      // Update security context
      if (securityContext) {
        store.dispatch(setSecurityContext(securityContext));
        await securityService.updateSecurityContext(securityContext);
      }
      
      // Update Redux store
      store.dispatch(setCredentials({ user }));
      
      return user;
    } catch (error) {
      this.logger.error('2FA verification failed', { error });
      store.dispatch(setAuthError(error.response?.data?.message || 'Two-factor authentication failed'));
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async logout(silent: boolean = false): Promise<void> {
    try {
      if (!silent) store.dispatch(setAuthLoading(true));
      
      // Get refresh token for server-side invalidation
      const refreshToken = await tokenService.getRefreshToken();
      
      // Call logout endpoint if we have a token
      if (refreshToken && navigator.onLine) {
        try {
          await axiosInstance.post(API_ROUTES.AUTH.LOGOUT, { refreshToken });
        } catch (error) {
          this.logger.warn('Server logout failed, continuing with client logout', { error });
        }
      }
      
      // End session
      await sessionService.endSession('LOGOUT');
      
      // Clear tokens
      await tokenService.clearTokens();
      
      // Clear security context
      await securityService.clearSecurityContext();
      
      // Update Redux store
      store.dispatch(clearCredentials());
      
      // Notify other tabs about logout
      localStorage.setItem('auth_logout', 'true');
      setTimeout(() => localStorage.removeItem('auth_logout'), 1000);

      // Persist auth state using the new persistence service
      await authPersistenceService.clearAuthState();
      
    } catch (error) {
      this.logger.error('Logout failed', { error });
      // Still clear local state even if server request fails
      store.dispatch(clearCredentials());
      await tokenService.clearTokens();
      await sessionService.endSession('FORCED');
    } finally {
      if (!silent) store.dispatch(setAuthLoading(false));
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await tokenService.getRefreshToken();
      if (!refreshToken) return false;
      
      const deviceInfo = await securityService.getDeviceInfo();
      
      const response = await axiosInstance.post(API_ROUTES.AUTH.REFRESH_TOKEN, { 
        refreshToken,
        deviceInfo
      });
      
      const { tokens, securityContext } = response.data;
      
      await tokenService.setTokens(tokens);
      
      // Update security context if provided
      if (securityContext) {
        store.dispatch(setSecurityContext(securityContext));
        await securityService.updateSecurityContext(securityContext);
      }
      
      // Update session activity
      await sessionService.updateSessionActivity();
      
      return true;
    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      
      // If refresh fails due to invalid token, log out silently
      if (error.response?.status === 401) {
        await this.logout(true);
      }
      
      return false;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const accessToken = await tokenService.getAccessToken();
    if (!accessToken) return false;
    
    // Check token expiration locally first
    if (await tokenService.isTokenExpired(accessToken)) {
      // Only refresh if actually expired
      return await this.refreshToken();
    }
    
    // Only validate session if token is valid
    // Use cached session validation when possible
    return await sessionService.isSessionValid({useCachedResult: true});
  }

  async validateSession(): Promise<boolean> {
    try {
      const accessToken = await tokenService.getAccessToken();
      if (!accessToken) return false;
      
      // Validate session on server
      const response = await axiosInstance.post(API_ROUTES.AUTH.VALIDATE_SESSION);
      return response.data.valid === true;
    } catch (error) {
      this.logger.error('Session validation failed', { error });
      return false;
    }
  }

  async registerUser(data: RegisterData): Promise<User> {
    try {
      store.dispatch(setAuthLoading(true));
      
      // Validate password strength
      if (!securityService.isPasswordStrong(data.password)) {
        throw new Error('PASSWORD_TOO_WEAK');
      }
      
      const deviceInfo = await securityService.getDeviceInfo();
      
      const response = await axiosInstance.post(API_ROUTES.AUTH.REGISTER, {
        ...data,
        deviceInfo
      });
      
      const { user, tokens, securityContext } = response.data;
      
      // Store tokens
      await tokenService.setTokens(tokens);
      
      // Initialize session
      await sessionService.initializeSession(user, deviceInfo);
      
      // Update security context
      if (securityContext) {
        store.dispatch(setSecurityContext(securityContext));
        await securityService.updateSecurityContext(securityContext);
      }
      
      // Update Redux store
      store.dispatch(setCredentials({ user }));
      
      return user;
    } catch (error) {
      this.logger.error('Registration failed', { error });
      store.dispatch(setAuthError(error.response?.data?.message || 'Registration failed'));
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      
      // Get device info for security context
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.AUTH.FORGOT_PASSWORD, { 
        email,
        deviceInfo
      });
    } catch (error) {
      this.logger.error('Password reset request failed', { error });
      // Don't expose whether email exists or not for security
      // Just silently succeed even if email doesn't exist
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async resetPassword(data: PasswordResetData): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      
      // Validate password strength
      if (!securityService.isPasswordStrong(data.password)) {
        throw new Error('PASSWORD_TOO_WEAK');
      }
      
      // Get device info for security context
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.AUTH.RESET_PASSWORD, {
        ...data,
        deviceInfo
      });
    } catch (error) {
      this.logger.error('Password reset failed', { error });
      store.dispatch(setAuthError(error.response?.data?.message || 'Password reset failed'));
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      await axiosInstance.post(API_ROUTES.AUTH.VERIFY_EMAIL, { token });
    } catch (error) {
      this.logger.error('Email verification failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      
      // Validate password strength
      if (!securityService.isPasswordStrong(newPassword)) {
        throw new Error('PASSWORD_TOO_WEAK');
      }
      
      // Get device info for security context
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.AUTH.CHANGE_PASSWORD, { 
        oldPassword, 
        newPassword,
        deviceInfo
      });
      
      // Force token refresh after password change
      await this.refreshToken();
    } catch (error) {
      this.logger.error('Password change failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      store.dispatch(setAuthLoading(true));
      
      const response = await axiosInstance.put(API_ROUTES.AUTH.UPDATE_PROFILE, profileData);
      const { user } = response.data;
      
      // Update Redux store
      store.dispatch(setCredentials({ user }));
      
      return user;
    } catch (error) {
      this.logger.error('Profile update failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async setupTwoFactor(): Promise<{ secret: string, qrCode: string }> {
    try {
      store.dispatch(setAuthLoading(true));
      
      const response = await axiosInstance.post(API_ROUTES.AUTH.SETUP_2FA);
      return response.data;
    } catch (error) {
      this.logger.error('2FA setup failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async verifyAndEnableTwoFactor(code: string): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      
      await axiosInstance.post(API_ROUTES.AUTH.VERIFY_AND_ENABLE_2FA, { code });
      
      // Update user profile to reflect 2FA status
      const response = await axiosInstance.get(API_ROUTES.AUTH.GET_PROFILE);
      store.dispatch(setCredentials({ user: response.data.user }));
    } catch (error) {
      this.logger.error('2FA verification failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async disableTwoFactor(code: string): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      
      await axiosInstance.post(API_ROUTES.AUTH.DISABLE_2FA, { code });
      
      // Update user profile to reflect 2FA status
      const response = await axiosInstance.get(API_ROUTES.AUTH.GET_PROFILE);
      store.dispatch(setCredentials({ user: response.data.user }));
    } catch (error) {
      this.logger.error('2FA disable failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async verifyDevice(token: string): Promise<void> {
    try {
      store.dispatch(setAuthLoading(true));
      
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.AUTH.VERIFY_DEVICE, {
        token,
        deviceInfo
      });
    } catch (error) {
      this.logger.error('Device verification failed', { error });
      throw error;
    } finally {
      store.dispatch(setAuthLoading(false));
    }
  }

  async getSessions(): Promise<any[]> {
    try {
      const response = await axiosInstance.get(API_ROUTES.AUTH.GET_SESSIONS);
      return response.data.sessions;
    } catch (error) {
      this.logger.error('Failed to get sessions', { error });
      throw error;
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.TERMINATE_SESSION, { sessionId });
    } catch (error) {
      this.logger.error('Failed to terminate session', { error });
      throw error;
    }
  }

  async terminateAllOtherSessions(): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.TERMINATE_ALL_OTHER_SESSIONS);
    } catch (error) {
      this.logger.error('Failed to terminate other sessions', { error });
      throw error;
    }
  }

  /**
   * Attempts to authenticate user in offline mode
   */
  private async tryOfflineAuthentication(credentials: LoginCredentials): Promise<User | null> {
    // Check if offline auth is available
    if (!(await offlineAuthService.isOfflineAuthAvailable())) {
      return null;
    }
    
    // Try offline authentication
    const offlineUser = await offlineAuthService.authenticateOffline(credentials);
    if (!offlineUser) {
      return null;
    }
    
    // Set up offline session
    const offlineSession = await sessionService.createOfflineSession(offlineUser);
    
    // Update Redux store with offline user
    store.dispatch(setCredentials({
      user: offlineUser,
      isAuthenticated: true,
      isOfflineMode: true
    }));
    
    return offlineUser;
  }
  
  /**
   * Handles network status changes
   */
  private async handleNetworkStatusChange(isOnline: boolean): Promise<void> {
    if (isOnline) {
      // If we're coming back online and were in offline mode, sync data
      const state = store.getState();
      if (state.auth.isAuthenticated && state.auth.isOfflineMode) {
        await offlineAuthService.syncOfflineActions();
        
        // Try to refresh token to get back to online mode
        const success = await this.refreshToken();
        if (success) {
          // Update Redux store to indicate we're back online
          store.dispatch(setCredentials({
            ...state.auth,
            isOfflineMode: false
          }));
        }
      }
    } else {
      // Going offline - prepare for offline use
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        await offlineAuthService.prepareForOfflineUse();
      }
    }
  }
}

export const authService = AuthService.getInstance();
