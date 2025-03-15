import axios from "axios";
import { API_ROUTES } from "@/config/routes";
import { logger } from "@/utils/logger";
import { SecurityService } from "../services/security.service";
import { AuthError, createAuthError } from "../errors/auth-error";
import { API_CONFIG } from "@/config/api";

// Types
import type { 
  LoginCredentials, 
  RegisterData, 
  ResetPasswordData,
  ChangePasswordData,
  TwoFactorVerificationData,
  DeviceInfo,
  AuthResponse,
  TokenResponse,
  ProfileResponse,
  SessionResponse
} from '../types/auth-types';

// Constants
const COMPONENT = "auth-api";
const securityService = new SecurityService();

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// Import interceptors if needed
// You can also move this to a separate file later

/**
 * Authentication API service
 * Handles all authentication-related API calls
 */
export class AuthApi {
  /**
   * Send login request to the API
   */
  static async loginRequest(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Get device info for security context
      const deviceInfo = await securityService.getDeviceInfo();
      
      // Get CSRF token if needed
      await this.ensureCsrfToken();
      
      // Make login request
      const response = await axiosInstance.post(API_ROUTES.AUTH.LOGIN, {
        ...credentials,
        deviceInfo
      });
      
      const data = response.data;
      
      // Transform response to match expected format if needed
      const result: AuthResponse = {
        user: data.user,
        tokens: data.tokens,
        securityContext: data.securityContext,
        requiresTwoFactor: data.requiresTwoFactor || false
      };
      
      logger.debug('Login request successful', { component: COMPONENT });
      return result;
    } catch (error) {
      logger.error('Login request failed', { 
        component: COMPONENT, 
        error,
        email: credentials.email // Don't log password
      });
      
      throw this.handleApiError(error, 'LOGIN_FAILED');
    }
  }

  /**
   * Send logout request to the API
   */
  static async logoutRequest(refreshToken?: string): Promise<void> {
    try {
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.AUTH.LOGOUT, {
        refreshToken,
        deviceInfo
      });
      
      logger.debug('Logout request successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Logout request failed', { component: COMPONENT, error });
      // Don't throw on logout errors, just log them
    }
  }

  /**
   * Send refresh token request to the API
   */
  static async refreshTokenRequest(refreshToken: string): Promise<TokenResponse> {
    try {
      const deviceInfo = await securityService.getDeviceInfo();
      
      const response = await axiosInstance.post(API_ROUTES.AUTH.REFRESH_TOKEN, { 
        refreshToken,
        deviceInfo
      });
      
      logger.debug('Token refresh successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('Token refresh failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'REFRESH_FAILED');
    }
  }

  /**
   * Send registration request to the API
   */
  static async registerRequest(data: RegisterData): Promise<AuthResponse> {
    try {
      // Get device info for security context
      const deviceInfo = await securityService.getDeviceInfo();
      
      // Get CSRF token if needed
      await this.ensureCsrfToken();
      
      // Make registration request
      const response = await axiosInstance.post(API_ROUTES.AUTH.REGISTER, {
        ...data,
        deviceInfo
      });
      
      logger.debug('Registration successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('Registration failed', { 
        component: COMPONENT, 
        error,
        email: data.email // Don't log password
      });
      
      throw this.handleApiError(error, 'REGISTRATION_FAILED');
    }
  }

  /**
   * Send forgot password request to the API
   */
  static async forgotPasswordRequest(email: string): Promise<void> {
    try {
      // Get CSRF token if needed
      await this.ensureCsrfToken();
      
      await axiosInstance.post(API_ROUTES.AUTH.FORGOT_PASSWORD, { email });
      
      logger.debug('Forgot password request successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Forgot password request failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'FORGOT_PASSWORD_FAILED');
    }
  }

  /**
   * Send reset password request to the API
   */
  static async resetPasswordRequest(data: ResetPasswordData): Promise<void> {
    try {
      // Get CSRF token if needed
      await this.ensureCsrfToken();
      
      await axiosInstance.post(API_ROUTES.AUTH.RESET_PASSWORD, data);
      
      logger.debug('Reset password successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Reset password failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'RESET_PASSWORD_FAILED');
    }
  }

  /**
   * Send change password request to the API
   */
  static async changePasswordRequest(data: ChangePasswordData): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.USER.CHANGE_PASSWORD, data);
      
      logger.debug('Change password successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Change password failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'CHANGE_PASSWORD_FAILED');
    }
  }

  /**
   * Send verify email request to the API
   */
  static async verifyEmailRequest(token: string): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.AUTH.VERIFY_EMAIL, { token });
      
      logger.debug('Email verification successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Email verification failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'EMAIL_VERIFICATION_FAILED');
    }
  }

  /**
   * Send verify two-factor authentication request to the API
   */
  static async verifyTwoFactorRequest(data: TwoFactorVerificationData): Promise<AuthResponse> {
    try {
      const deviceInfo = await securityService.getDeviceInfo();
      
      const response = await axiosInstance.post(API_ROUTES.SECURITY.VERIFY_2FA, {
        ...data,
        deviceInfo
      });
      
      logger.debug('2FA verification successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('2FA verification failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'TWO_FACTOR_VERIFICATION_FAILED');
    }
  }

  /**
   * Send setup two-factor authentication request to the API
   */
  static async setupTwoFactorRequest(): Promise<{ secret: string; qrCode: string }> {
    try {
      const response = await axiosInstance.post(API_ROUTES.SECURITY.SETUP_2FA);
      
      logger.debug('2FA setup successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('2FA setup failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'TWO_FACTOR_SETUP_FAILED');
    }
  }

  /**
   * Send verify and enable two-factor authentication request to the API
   */
  static async verifyAndEnableTwoFactorRequest(code: string): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.SECURITY.VERIFY_AND_ENABLE_2FA, { code });
      
      logger.debug('2FA verification and enablement successful', { component: COMPONENT });
    } catch (error) {
      logger.error('2FA verification and enablement failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'TWO_FACTOR_ENABLE_FAILED');
    }
  }

  /**
   * Send disable two-factor authentication request to the API
   */
  static async disableTwoFactorRequest(code: string): Promise<void> {
    try {
      await axiosInstance.post(API_ROUTES.SECURITY.DISABLE_2FA, { code });
      
      logger.debug('2FA disablement successful', { component: COMPONENT });
    } catch (error) {
      logger.error('2FA disablement failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'TWO_FACTOR_DISABLE_FAILED');
    }
  }

  /**
   * Get user profile from the API
   */
  static async getProfileRequest(): Promise<ProfileResponse> {
    try {
      const response = await axiosInstance.get(API_ROUTES.USER.PROFILE);
      
      logger.debug('Get profile successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('Get profile failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'GET_PROFILE_FAILED');
    }
  }

  /**
   * Update user profile in the API
   */
  static async updateProfileRequest(data: Partial<ProfileResponse['user']>): Promise<ProfileResponse> {
    try {
      const response = await axiosInstance.put(API_ROUTES.USER.UPDATE_PROFILE, data);
      
      logger.debug('Update profile successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('Update profile failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'UPDATE_PROFILE_FAILED');
    }
  }

  /**
   * Validate session with the API
   */
  static async validateSessionRequest(): Promise<SessionResponse> {
    try {
      const deviceInfo = await securityService.getDeviceInfo();
      
      const response = await axiosInstance.post(API_ROUTES.AUTH.VALIDATE_SESSION, { deviceInfo });
      
      logger.debug('Session validation successful', { component: COMPONENT });
      return response.data;
    } catch (error) {
      logger.error('Session validation failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'SESSION_VALIDATION_FAILED');
    }
  }

  /**
   * Report security incident to the API
   */
  static async reportSecurityIncidentRequest(
    incidentType: string, 
    details: Record<string, any>
  ): Promise<void> {
    try {
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.SECURITY.REPORT_INCIDENT, {
        incidentType,
        details,
        deviceInfo
      });
      
      logger.debug('Security incident report successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Security incident report failed', { component: COMPONENT, error });
      // Don't throw on security report errors, just log them
    }
  }

  /**
   * Verify device with the API
   */
  static async verifyDeviceRequest(verificationCode: string): Promise<void> {
    try {
      const deviceInfo = await securityService.getDeviceInfo();
      
      await axiosInstance.post(API_ROUTES.SECURITY.VALIDATE_DEVICE, {
        verificationCode,
        deviceInfo
      });
      
      logger.debug('Device verification successful', { component: COMPONENT });
    } catch (error) {
      logger.error('Device verification failed', { component: COMPONENT, error });
      throw this.handleApiError(error, 'DEVICE_VERIFICATION_FAILED');
    }
  }

  /**
   * Get CSRF token if needed
   */
  private static async ensureCsrfToken(): Promise<void> {
    try {
      const hasToken = await securityService.hasCsrfToken();
      
      if (!hasToken) {
        await axiosInstance.get(API_ROUTES.AUTH.CSRF);
        logger.debug('CSRF token fetched', { component: COMPONENT });
      }
    } catch (error) {
      logger.error('Failed to get CSRF token', { component: COMPONENT, error });
      // Continue without CSRF token, the request will fail if it's required
    }
  }

  /**
   * Handle API errors
   */
  private static handleApiError(error: any, defaultCode: string): AuthError {
    // Extract error details from response if available
    const status = error.response?.status || 500;
    const errorData = error.response?.data?.error || {};
    
    return new AuthError({
      message: errorData.message || 'Authentication request failed',
      code: errorData.code || defaultCode,
      status,
      details: errorData.details || {},
      originalError: error
    });
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: any): boolean {
    return !error.response && error.request;
  }

  /**
   * Check if error is a server error
   */
  static isServerError(error: any): boolean {
    return error.response?.status >= 500;
  }

  /**
   * Check if error is an authentication error
   */
  static isAuthError(error: any): boolean {
    return error.response?.status === 401;
  }
}
// Add this at the end of the file to export the class as a singleton instance
export const authApi = new AuthApi();
