import { jwtDecode } from 'jwt-decode';
import { SecureStorage } from '@/utils/secure-storage';
import { Logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/routes';
import { axiosInstance } from '@/utils/axios';
import { deviceService } from './device.service';
import { EventEmitter } from '@/utils/event-emitter';
import { AuthError, createAuthError } from '../errors/auth-error';

interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  jti: string;
  role?: string;
  deviceFingerprint?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

class TokenService {
  private static instance: TokenService;
  private secureStorage: SecureStorage;
  private logger: Logger;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private blacklistedTokens: Set<string> = new Set();
  private refreshPromise: Promise<boolean> | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private events = new EventEmitter();
  private tokenEncryptionKey: string | null = null;
  // Add caching for token validation results
  private tokenValidationCache = new Map<string, {
    valid: boolean;
    timestamp: number;
  }>();
  private TOKEN_VALIDATION_CACHE_TTL = 60 * 1000; // 1 minute

  private constructor() {
    this.secureStorage = new SecureStorage('auth');
    this.logger = new Logger('TokenService');
    this.setupTokenRefreshScheduler();
  }

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  // Event subscription methods
  onTokenRefresh(callback: (tokens: Tokens) => void): () => void {
    return this.events.on('tokenRefresh', callback);
  }

  onTokenExpiring(callback: () => void): () => void {
    return this.events.on('tokenExpiring', callback);
  }

  // Token storage methods
  async setTokens(tokens: Tokens): Promise<void> {
    try {
      const { accessToken, refreshToken } = tokens;
      
      // Store tokens securely
      await Promise.all([
        this.secureStorage.setItem(this.ACCESS_TOKEN_KEY, this.encryptToken(accessToken)),
        this.secureStorage.setItem(this.REFRESH_TOKEN_KEY, this.encryptToken(refreshToken))
      ]);
      
      // Schedule token refresh
      this.scheduleTokenRefresh(accessToken);
      
      // Notify subscribers
      this.events.emit('tokenRefresh', tokens);
    } catch (error) {
      this.logger.error('Failed to store tokens', { error });
      throw new Error('Failed to store authentication tokens');
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const encryptedToken = await this.secureStorage.getItem(this.ACCESS_TOKEN_KEY);
      if (!encryptedToken) return null;
      return this.decryptToken(encryptedToken);
    } catch (error) {
      this.logger.error('Failed to retrieve access token', { error });
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      const encryptedToken = await this.secureStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!encryptedToken) return null;
      return this.decryptToken(encryptedToken);
    } catch (error) {
      this.logger.error('Failed to retrieve refresh token', { error });
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      // Clear scheduled refresh
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }
      
      // Clear tokens from storage
      await Promise.all([
        this.secureStorage.removeItem(this.ACCESS_TOKEN_KEY),
        this.secureStorage.removeItem(this.REFRESH_TOKEN_KEY)
      ]);
      
      // Clear blacklist cache
      this.blacklistedTokens.clear();
    } catch (error) {
      this.logger.error('Failed to clear tokens', { error });
    }
  }

  // Token validation methods
  async isTokenExpired(token: string): Promise<boolean> {
    // Check cache first
    const tokenHash = this.hashToken(token);
    const cached = this.tokenValidationCache.get(tokenHash);
    
    if (cached && Date.now() - cached.timestamp < this.TOKEN_VALIDATION_CACHE_TTL) {
      return !cached.valid;
    }
    
    // If not in cache, validate locally
    const decoded = this.decodeToken(token);
    const isExpired = !decoded || decoded.exp * 1000 < Date.now();
    
    // Cache the result
    this.tokenValidationCache.set(tokenHash, {
      valid: !isExpired,
      timestamp: Date.now()
    });
    
    return isExpired;
  }

  async isTokenExpiring(token: string, thresholdSeconds = 60): Promise<boolean> {
    try {
      const payload = this.decodeToken(token);
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const threshold = thresholdSeconds * 1000;
      return (expirationTime - Date.now()) <= threshold;
    } catch {
      return true;
    }
  }

  decodeToken(token: string): TokenPayload {
    try {
      return jwtDecode<TokenPayload>(token);
    } catch (error) {
      this.logger.error('Failed to decode token', { error });
      throw new Error('Invalid token format');
    }
  }

  getTokenExpiration(token: string): number {
    const payload = this.decodeToken(token);
    return payload.exp * 1000; // Convert to milliseconds
  }

  getTokenRemainingTime(token: string): number {
    const expiration = this.getTokenExpiration(token);
    return Math.max(0, expiration - Date.now());
  }

  getUserIdFromToken(token: string): string | null {
    try {
      const payload = this.decodeToken(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  getUserRoleFromToken(token: string): string | null {
    try {
      const payload = this.decodeToken(token);
      return payload.role || null;
    } catch {
      return null;
    }
  }

  // Token blacklist methods
  async isTokenBlacklisted(token: string): Promise<boolean> {
    // Check local cache first
    if (this.blacklistedTokens.has(token)) {
      return true;
    }
    
    // Check with server
    try {
      const response = await axiosInstance.post(API_ROUTES.AUTH.VALIDATE_TOKEN, { token });
      const isBlacklisted = !response.data.valid;
      
      // Update local cache if blacklisted
      if (isBlacklisted) {
        this.blacklistedTokens.add(token);
      }
      
      return isBlacklisted;
    } catch {
      // If server check fails, assume token is valid
      return false;
    }
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      // Add to local blacklist
      this.blacklistedTokens.add(token);
      
      // Notify server
      await axiosInstance.post(API_ROUTES.AUTH.REVOKE_TOKEN, { token });
    } catch (error) {
      this.logger.error('Failed to blacklist token', { error });
    }
  }

  // Token refresh methods
  async refreshTokens(): Promise<boolean> {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create a new refresh promise
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) return false;
      
      // Get device info for security context
      const deviceInfo = await deviceService.getDeviceInfo();
      
      const response = await axiosInstance.post(API_ROUTES.AUTH.REFRESH_TOKEN, { 
        refreshToken,
        deviceInfo
      });
      
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.tokens;
      
      await this.setTokens({ 
        accessToken, 
        refreshToken: newRefreshToken,
        expiresIn
      });
      
      return true;
    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      return false;
    }
  }

  // Token encryption methods
  private encryptToken(token: string): string {
    // In a real implementation, this would use a proper encryption algorithm
    // For now, we'll just return the token as is
    // TODO: Implement actual encryption
    return token;
  }

  private decryptToken(encryptedToken: string): string {
    // In a real implementation, this would decrypt the token
    // For now, we'll just return the token as is
    // TODO: Implement actual decryption
    return encryptedToken;
  }

  // Set up encryption key (should be called during app initialization)
  async setupEncryption(userSalt?: string): Promise<void> {
    try {
      // In a real implementation, this would generate or retrieve an encryption key
      // For now, we'll just set a dummy key
      this.tokenEncryptionKey = userSalt || 'default-encryption-key';
    } catch (error) {
      this.logger.error('Failed to set up token encryption', { error });
    }
  }

  // Token refresh scheduling
  private setupTokenRefreshScheduler(): void {
    // Check for token expiration every minute
    setInterval(async () => {
      const accessToken = await this.getAccessToken();
      if (!accessToken) return;
      
      try {
        if (await this.isTokenExpiring(accessToken, 120)) {
          this.events.emit('tokenExpiring');
          await this.refreshTokens();
        }
      } catch (error) {
        this.logger.error('Token refresh scheduler error', { error });
      }
    }, 60000); // Check every minute
  }

  private scheduleTokenRefresh(accessToken: string): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    
    try {
      const payload = this.decodeToken(accessToken);
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Schedule refresh at 80% of token lifetime
      const refreshTime = timeUntilExpiry * 0.8;
      
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshTokens().catch(error => {
          this.logger.error('Scheduled token refresh failed', { error });
        });
      }, refreshTime);
    } catch (error) {
      this.logger.error('Failed to schedule token refresh', { error });
    }
  }

  // Token validation with server
  async validateTokenWithServer(token: string): Promise<boolean> {
    try {
      const response = await axiosInstance.post(API_ROUTES.AUTH.VALIDATE_TOKEN, { token });
      return response.data.valid === true;
    } catch {
      return false;
    }
  }

  // Get token metadata
  getTokenMetadata(token: string): Record<string, any> {
    try {
      const payload = this.decodeToken(token);
      const { exp, iat, jti, sub, ...metadata } = payload;
      return {
        issuedAt: new Date(iat * 1000).toISOString(),
        expiresAt: new Date(exp * 1000).toISOString(),
        tokenId: jti,
        userId: sub,
        ...metadata
      };
    } catch {
      return {};
    }
  }

  // Helper to create a hash of the token for cache keys
  private hashToken(token: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}

export const tokenService = TokenService.getInstance();
