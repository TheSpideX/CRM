
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { tokenService } from './token.service';
import DOMPurify from 'dompurify';
import { RateLimiter } from '@/utils/rate-limiter';
import { 
    SecurityError,
    SecurityContext, 
    DeviceInfo, 
    GeoLocation,
    SecurityErrorType,
    SecurityEvent,
    IPReputationResult
} from '../types/security.types';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { Logger } from '@/utils/logger';
import { deviceService } from './device.service';
import { EventEmitter } from '@/utils/event-emitter';

export class SecurityService {
    private readonly CSRF_TOKEN_HEADER = 'X-CSRF-Token';
    private readonly DEVICE_FINGERPRINT_KEY = 'device_fingerprint';
    private readonly SECURITY_CONTEXT_KEY = 'security_context';
    private readonly XSS_UNSAFE_REGEX = /<[^>]*>|javascript:|data:|vbscript:|on\w+\s*=|expression\s*\(|eval\s*\(|setTimeout|setInterval/gi;
    private axiosInstance: AxiosInstance;
    private logger: Logger;
    private rateLimiter: RateLimiter;
    private csrfToken: string | null = null;
    private events: EventEmitter;
    private redis: any; // Mock for Redis client

    private readonly GEO_RESTRICTIONS = {
        BLOCKED_COUNTRIES: ['XX', 'YY'], // Add restricted countries
        HIGH_RISK_REGIONS: ['ZZ'],
        MAX_LOGIN_VELOCITY: 800, // km/h
        ALLOWED_TIMEZONE_OFFSET: 3 // hours
    };

    private readonly IP_RESTRICTIONS = {
        MAX_FAILED_ATTEMPTS: 5,
        BLOCK_DURATION: 30 * 60 * 1000, // 30 minutes
        SUSPICIOUS_PATTERNS: [
            /^192\.168\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./
        ]
    };

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: AUTH_CONSTANTS.API_BASE_URL,
            withCredentials: true
        });
        this.logger = new Logger('SecurityService');
        this.rateLimiter = new RateLimiter({
            maxRequests: 100,
            perWindow: 60000, // 1 minute
            blacklistDuration: 300000 // 5 minutes
        });
        this.events = new EventEmitter();
        this.setupInterceptors();
        
        // Mock Redis client for local development
        this.redis = {
            get: async (key: string) => null,
            set: async (key: string, value: string, ...args: any[]) => true,
            incr: async (key: string) => 1,
            expire: async (key: string, ttl: number) => true,
            ttl: async (key: string) => 0
        };
    }

    // CSRF Protection
    private async setupCsrfProtection(): Promise<void> {
        try {
            const { data } = await this.axiosInstance.get('/api/auth/csrf');
            if (data?.token) {
                this.axiosInstance.defaults.headers.common[this.CSRF_TOKEN_HEADER] = data.token;
                this.storeCsrfToken(data.token);
            }
        } catch (error) {
            this.logger.error('CSRF setup failed:', error);
            throw new Error('CSRF_SETUP_FAILED');
        }
    }

    private storeCsrfToken(token: string): void {
        // Store in memory only, not in localStorage
        this.csrfToken = token;
    }

    public validateCsrfToken(token: string): boolean {
        return token && token === this.csrfToken;
    }

    public getCsrfToken(): string | null {
        return this.csrfToken;
    }

    // Rate Limiting
    private async checkRateLimit(endpoint: string, ip: string): Promise<boolean> {
        const key = `${endpoint}:${ip}`;
        return this.rateLimiter.checkLimit(key);
    }

    // Input Sanitization
    public sanitizeInput(input: any): any {
        if (typeof input === 'string') {
            return this.sanitizeString(input);
        } else if (Array.isArray(input)) {
            return input.map(item => this.sanitizeInput(item));
        } else if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[this.sanitizeString(key)] = this.sanitizeInput(value);
            }
            return sanitized;
        }
        return input;
    }

    private sanitizeString(str: string): string {
        // Remove potential XSS vectors
        str = str.replace(this.XSS_UNSAFE_REGEX, '');
        // Use DOMPurify for HTML content
        return DOMPurify.sanitize(str, {
            ALLOWED_TAGS: [], // No HTML tags allowed
            ALLOWED_ATTR: [] // No attributes allowed
        });
    }

    // XSS Prevention
    private setupXSSProtection(): void {
        // Content Security Policy setup
        const cspHeader = {
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'"],
            'img-src': ["'self'", 'data:', 'https:'],
            'connect-src': ["'self'", AUTH_CONSTANTS.API_BASE_URL],
            'frame-ancestors': ["'none'"],
            'form-action': ["'self'"]
        };

        // Add CSP meta tag
        this.addCSPMeta(cspHeader);
    }

    private addCSPMeta(cspHeader: Record<string, string[]>): void {
        try {
            const cspContent = Object.entries(cspHeader)
                .map(([key, values]) => `${key} ${values.join(' ')}`)
                .join('; ');

            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = cspContent;
            document.head.appendChild(meta);
        } catch (error) {
            this.logger.error('Failed to add CSP meta tag', error);
        }
    }

    // Request/Response Interceptors
    private setupInterceptors(): void {
        // Request Interceptor
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                // Rate limiting check
                const endpoint = config.url || '';
                const clientIP = await this.getClientIP();
                if (!(await this.checkRateLimit(endpoint, clientIP))) {
                    throw new SecurityError('RATE_LIMIT_EXCEEDED', 'Too many requests');
                }

                // Add security headers
                config.headers = {
                    ...config.headers,
                    ...await this.getSecureHeaders(),
                    'X-XSS-Protection': '1; mode=block',
                    'X-Content-Type-Options': 'nosniff'
                };

                // Sanitize request data
                if (config.data) {
                    config.data = this.sanitizeInput(config.data);
                }

                // Add request timing header
                config.headers['X-Request-Start'] = Date.now().toString();

                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response Interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => {
                this.validateResponseHeaders(response);
                this.validateResponseData(response);
                return response;
            },
            async (error) => {
                if (this.isSecurityError(error)) {
                    await this.handleSecurityError(error);
                }
                return Promise.reject(error);
            }
        );
    }

    private validateResponseData(response: AxiosResponse): void {
        if (response.data) {
            response.data = this.sanitizeInput(response.data);
        }
    }

    // Security Error Handling
    private async handleSecurityError(error: any): Promise<void> {
        this.logger.error('Security error:', error);
        const errorType = error.response?.data?.type;

        switch (errorType) {
            case 'CSRF_TOKEN_INVALID':
                await this.setupCsrfProtection();
                break;
            case 'RATE_LIMIT_EXCEEDED':
                await this.handleRateLimitExceeded();
                break;
            case 'XSS_DETECTED':
                this.handleXSSDetection(error);
                break;
            case 'SESSION_EXPIRED':
                await this.endSession('EXPIRED');
                break;
            case 'DEVICE_NOT_TRUSTED':
                await this.initiateDeviceVerification();
                break;
            default:
                throw error;
        }
    }

    private async handleRateLimitExceeded(): Promise<void> {
        this.events.emit('securityEvent', {
            type: 'RATE_LIMIT_EXCEEDED',
            timestamp: new Date(),
            details: {
                ip: await this.getClientIP()
            }
        });
    }

    private handleXSSDetection(error: any): void {
        this.events.emit('securityEvent', {
            type: 'XSS_DETECTED',
            timestamp: new Date(),
            details: error.response?.data?.details || {}
        });
    }

    private async endSession(reason: string): Promise<void> {
        // This will be implemented by the session service
        this.events.emit('sessionEnd', { reason });
    }

    private async initiateDeviceVerification(): Promise<void> {
        this.events.emit('deviceVerificationRequired', {
            timestamp: new Date()
        });
    }

    // Device Fingerprinting
    public async getDeviceFingerprint(): Promise<string> {
        const storedFingerprint = localStorage.getItem(this.DEVICE_FINGERPRINT_KEY);
        if (storedFingerprint) {
            return storedFingerprint;
        }

        const fingerprint = await this.generateDeviceFingerprint();
        localStorage.setItem(this.DEVICE_FINGERPRINT_KEY, fingerprint);
        return fingerprint;
    }

    private async generateDeviceFingerprint(): Promise<string> {
        const components = [
            navigator.userAgent,
            navigator.language,
            navigator.platform,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency,
            // Add more unique identifiers as needed
        ];

        const fingerprintData = components.join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintData);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Security Context Management
    async getSecurityContext(): Promise<SecurityContext> {
        const contextStr = localStorage.getItem(this.SECURITY_CONTEXT_KEY);
        if (contextStr) {
            try {
                return JSON.parse(contextStr);
            } catch (e) {
                this.logger.error('Failed to parse security context', e);
            }
        }
        
        // Create a new security context
        const context: SecurityContext = {
            ipAddress: await this.getClientIP(),
            userAgent: navigator.userAgent,
            lastVerified: new Date().toISOString(),
            riskScore: 0,
            requiresAction: false,
            knownDevice: false
        };
        
        await this.updateSecurityContext(context);
        return context;
    }

    async updateSecurityContext(context: SecurityContext): Promise<void> {
        localStorage.setItem(this.SECURITY_CONTEXT_KEY, JSON.stringify(context));
        
        if (context.requiresAction) {
            this.handleSecurityAction(context);
        }
    }

    private async handleSecurityAction(context: SecurityContext): Promise<void> {
        switch (context.action) {
            case 'DEVICE_VERIFICATION':
                await this.initiateDeviceVerification();
                break;
            case 'PASSWORD_CHANGE_REQUIRED':
                await this.initiatePasswordChange();
                break;
            case 'MFA_REQUIRED':
                await this.initiateMfaSetup();
                break;
        }
    }

    private async initiatePasswordChange(): Promise<void> {
        this.events.emit('passwordChangeRequired', {
            timestamp: new Date()
        });
    }

    private async initiateMfaSetup(): Promise<void> {
        this.events.emit('mfaSetupRequired', {
            timestamp: new Date()
        });
    }

    // Error Handling
    private isSecurityError(error: any): boolean {
        return error.response?.status === 401 || 
               error.response?.status === 403 ||
               error.response?.data?.type === 'SECURITY_ERROR';
    }

    // Response Header Validation
    private validateResponseHeaders(response: AxiosResponse): void {
        const requiredHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ];

        const missingHeaders = requiredHeaders.filter(
            header => !response.headers[header.toLowerCase()]
        );

        if (missingHeaders.length > 0) {
            this.logger.warn('Missing security headers:', missingHeaders);
            
            // Log security event for missing headers
            this.logSecurityEvent({
                type: 'MISSING_SECURITY_HEADERS',
                headers: missingHeaders,
                timestamp: new Date()
            });
        }

        // Validate header values
        const headers = response.headers;
        if (headers['x-frame-options']?.toLowerCase() !== 'deny') {
            this.logger.warn('Incorrect X-Frame-Options value');
        }

        if (headers['x-content-type-options']?.toLowerCase() !== 'nosniff') {
            this.logger.warn('Incorrect X-Content-Type-Options value');
        }

        if (!headers['x-xss-protection']?.startsWith('1')) {
            this.logger.warn('Incorrect X-XSS-Protection value');
        }
    }

    // Public Methods
    async validateRequest(url: string, method: string, data?: any): Promise<boolean> {
        // Check if the request is allowed based on security rules
        const clientIP = await this.getClientIP();
        
        // Validate IP restrictions
        try {
            await this.validateIPRestrictions(clientIP);
        } catch (error) {
            return false;
        }
        
        // Check rate limits
        if (!(await this.checkRateLimit(`${method}:${url}`, clientIP))) {
            return false;
        }
        
        // Validate input data
        if (data) {
            try {
                this.sanitizeInput(data);
            } catch (error) {
                return false;
            }
        }
        
        return true;
    }

    async getSecureHeaders(): Promise<Record<string, string>> {
        return {
            [this.CSRF_TOKEN_HEADER]: this.csrfToken || '',
            'X-Device-Fingerprint': await this.getDeviceFingerprint(),
        };
    }

    // Initialization
    async initialize(): Promise<void> {
        await Promise.all([
            this.setupCsrfProtection(),
            this.setupXSSProtection()
        ]);
        
        // Initialize device fingerprint
        await this.getDeviceFingerprint();
        
        // Initialize security context
        await this.getSecurityContext();
    }

    // Cleanup
    destroy(): void {
        this.rateLimiter.clear();
        this.csrfToken = null;
    }

    // Enhanced failed login tracking
    async trackFailedLogin(identifier: string, deviceInfo: DeviceInfo): Promise<void> {
        const key = `failed:${identifier}:${deviceInfo.ip}`;
        const attempts = await this.redis.incr(key);
        await this.redis.expire(key, this.IP_RESTRICTIONS.BLOCK_DURATION);

        const securityEvent = {
            type: 'FAILED_LOGIN',
            identifier,
            deviceInfo,
            timestamp: new Date(),
            attemptCount: attempts
        };

        await this.logSecurityEvent(securityEvent);

        if (attempts >= this.IP_RESTRICTIONS.MAX_FAILED_ATTEMPTS) {
            await this.blockIP(deviceInfo.ip);
            throw new SecurityError('IP_BLOCKED', 'Too many failed attempts');
        }
    }

    // IP-based restrictions
    private async validateIPRestrictions(ip: string): Promise<void> {
        // Check if IP is blocked
        const isBlocked = await this.redis.get(`blocked:${ip}`);
        if (isBlocked) {
            throw new SecurityError(
                'IP_BLOCKED',
                'IP address is blocked',
                'IP_BLOCK_001',
                { ip, blockExpiry: await this.redis.ttl(`blocked:${ip}`) }
            );
        }

        // Check for suspicious IP patterns
        if (this.IP_RESTRICTIONS.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(ip))) {
            await this.logSecurityEvent({
                type: 'SUSPICIOUS_IP_DETECTED',
                ip,
                timestamp: new Date()
            });
            throw new SecurityError(
                'SUSPICIOUS_IP',
                'Suspicious IP pattern detected',
                'IP_SUSPICIOUS_001',
                { ip, pattern: 'INTERNAL_NETWORK' }
            );
        }

        // Check IP reputation
        const reputation = await this.checkIPReputation(ip);
        if (reputation.risk > 0.7) {
            await this.logSecurityEvent({
                type: 'HIGH_RISK_IP',
                ip,
                risk: reputation.risk,
                timestamp: new Date()
            });
            throw new SecurityError('HIGH_RISK_IP', 'IP address has poor reputation');
        }
    }

    // Enhanced geolocation validation
    async validateLocation(location: GeoLocation): Promise<void> {
        // Check country restrictions
        if (this.GEO_RESTRICTIONS.BLOCKED_COUNTRIES.includes(location.country)) {
            throw new SecurityError(
                'BLOCKED_COUNTRY',
                'Access not allowed from this country',
                'GEO_BLOCK_001',
                { country: location.country }
            );
        }

        // Check high-risk regions
        if (this.GEO_RESTRICTIONS.HIGH_RISK_REGIONS.includes(location.region)) {
            await this.logSecurityEvent({
                type: 'HIGH_RISK_REGION_ACCESS',
                location,
                timestamp: new Date()
            });
        }

        // Validate login velocity
        const lastLogin = await this.getLastLoginLocation();
        if (lastLogin) {
            const velocity = this.calculateTravelVelocity(lastLogin, location);
            if (velocity > this.GEO_RESTRICTIONS.MAX_LOGIN_VELOCITY) {
                await this.logSecurityEvent({
                    type: 'IMPOSSIBLE_TRAVEL',
                    lastLocation: lastLogin,
                    currentLocation: location,
                    velocity,
                    timestamp: new Date()
                });
                throw new SecurityError('IMPOSSIBLE_TRAVEL', 'Suspicious login location detected');
            }
        }

        // Validate timezone consistency
        if (location.timezone) {
            const timezoneOffset = this.calculateTimezoneOffset(location);
            if (Math.abs(timezoneOffset) > this.GEO_RESTRICTIONS.ALLOWED_TIMEZONE_OFFSET) {
                await this.logSecurityEvent({
                    type: 'TIMEZONE_MISMATCH',
                    location,
                    offset: timezoneOffset,
                    timestamp: new Date()
                });
            }
        }
    }

    // Helper methods
    private async blockIP(ip: string): Promise<void> {
        await this.redis.set(
            `blocked:${ip}`,
            '1',
            'PX',
            this.IP_RESTRICTIONS.BLOCK_DURATION
        );
    }

    private async getClientIP(): Promise<string> {
        try {
            const { data } = await axios.get('https://api.ipify.org?format=json');
            return data.ip;
        } catch (error) {
            this.logger.error('Failed to get client IP', error);
            return '0.0.0.0'; // Fallback
        }
    }

    private async checkIPReputation(ip: string): Promise<IPReputationResult> {
        // In a real implementation, this would call an IP reputation service
        // For now, we'll return a mock result
        return {
            ip,
            risk: 0.1,
            categories: [],
            lastSeen: new Date().toISOString()
        };
    }

    private async getLastLoginLocation(): Promise<GeoLocation | null> {
        // In a real implementation, this would retrieve the last login location from storage
        // For now, we'll return null
        return null;
    }

    private calculateTravelVelocity(lastLocation: GeoLocation, currentLocation: GeoLocation): number {
        // Calculate distance between two points using Haversine formula
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(currentLocation.latitude - lastLocation.latitude);
        const dLon = this.toRad(currentLocation.longitude - lastLocation.longitude);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lastLocation.latitude)) * Math.cos(this.toRad(currentLocation.latitude)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Calculate time difference in hours
        const lastTime = new Date(lastLocation.timestamp).getTime();
        const currentTime = new Date(currentLocation.timestamp).getTime();
        const timeDiff = (currentTime - lastTime) / (1000 * 60 * 60); // hours

        // Calculate velocity in km/h
        return distance / timeDiff;
    }

    private toRad(value: number): number {
        return value * Math.PI / 180;
    }

    private calculateTimezoneOffset(location: GeoLocation): number {
        // Calculate the difference between the expected timezone for the location
        // and the reported timezone
        const expectedOffset = this.getExpectedTimezoneOffset(location.longitude);
        const reportedOffset = location.timezone ? this.getTimezoneOffsetHours(location.timezone) : 0;
        
        return Math.abs(expectedOffset - reportedOffset);
    }

    private getExpectedTimezoneOffset(longitude: number): number {
        // Rough estimate: each 15 degrees of longitude corresponds to 1 hour
        return Math.round(longitude / 15);
    }

    private getTimezoneOffsetHours(timezone: string): number {
        // Parse timezone string to get offset in hours
        // This is a simplified implementation
        try {
            const date = new Date();
            const options = { timeZone: timezone, timeZoneName: 'short' };
            const timeString = date.toLocaleString('en-US', options);
            const match = timeString.match(/GMT([+-]\d+)/);
            
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    }

    // Security event logging
    private async logSecurityEvent(event: SecurityEvent): Promise<void> {
        this.logger.info('Security event:', event);
        
        // Emit event for listeners
        this.events.emit('securityEvent', event);
        
        // In a real implementation, this would also send the event to a server
        try {
            await this.axiosInstance.post('/api/security/events', event);
        } catch (error) {
            this.logger.error('Failed to log security event', error);
        }
    }

    // Device verification
    async isKnownDevice(): Promise<boolean> {
        const context = await this.getSecurityContext();
        return context.knownDevice === true;
    }

    async verifyDevice(verificationCode: string): Promise<boolean> {
        try {
            const response = await this.axiosInstance.post('/api/auth/verify-device', {
                code: verificationCode,
                deviceFingerprint: await this.getDeviceFingerprint()
            });
            
            if (response.data.verified) {
                const context = await this.getSecurityContext();
                context.knownDevice = true;
                await this.updateSecurityContext(context);
                return true;
            }
            
            return false;
        } catch (error) {
            this.logger.error('Device verification failed', error);
            return false;
        }
    }

    // Pre-login security checks
    async performPreLoginChecks(username: string, ip: string): Promise<void> {
        // Check if IP is allowed
        await this.validateIPRestrictions(ip);
        
        // Check for too many failed attempts
        const failedAttempts = await this.redis.get(`failed:${username}:${ip}`);
        if (failedAttempts && parseInt(failedAttempts, 10) >= this.IP_RESTRICTIONS.MAX_FAILED_ATTEMPTS) {
            throw new SecurityError('ACCOUNT_LOCKED', 'Too many failed attempts');
        }
        
        // Check for suspicious activity
        const isSuspicious = await this.detectSuspiciousActivity(username, ip);
        if (isSuspicious) {
            throw new SecurityError('SUSPICIOUS_ACTIVITY', 'Suspicious activity detected');
        }
    }

    // Suspicious activity detection
    async detectSuspiciousActivity(username: string, ip: string): Promise<boolean> {
        // This would be a more complex implementation in a real system
        // For now, we'll just check if the IP is in a suspicious pattern
        return this.IP_RESTRICTIONS.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(ip));
    }

    // Event subscription
    onSecurityEvent(callback: (event: SecurityEvent) => void): () => void {
        return this.events.on('securityEvent', callback);
    }

    // Clear security context
    clearSecurityContext(): void {
        localStorage.removeItem(this.SECURITY_CONTEXT_KEY);
    }

    // Get device info
    async getDeviceInfo(): Promise<DeviceInfo> {
        try {
            const fingerprint = await this.getDeviceFingerprint();
            const userAgent = navigator.userAgent;
            const platform = navigator.platform;
            const language = navigator.language;
            
            return {
                fingerprint,
                userAgent,
                platform,
                language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    colorDepth: window.screen.colorDepth
                },
                browser: this.getBrowserInfo(userAgent),
                os: this.getOSInfo(userAgent),
                hardware: {
                    cores: navigator.hardwareConcurrency || 1,
                    memory: undefined,
                    gpu: undefined
                },
                network: {
                    type: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                    downlink: navigator.connection ? navigator.connection.downlink : undefined
                }
            };
        } catch (error) {
            this.logger.error('Failed to get device info', { error });
            // Return a minimal device info object instead of throwing
            return {
                fingerprint: 'unknown',
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
        }
    }

    private getBrowserInfo(userAgent: string): { name: string; version: string } {
        // Simple browser detection
        const ua = userAgent.toLowerCase();
        
        if (ua.includes('firefox')) {
            return { name: 'Firefox', version: this.extractVersion(ua, 'firefox') };
        } else if (ua.includes('edg')) {
            return { name: 'Edge', version: this.extractVersion(ua, 'edg') };
        } else if (ua.includes('chrome')) {
            return { name: 'Chrome', version: this.extractVersion(ua, 'chrome') };
        } else if (ua.includes('safari')) {
            return { name: 'Safari', version: this.extractVersion(ua, 'safari') };
        }
        
        return { name: 'Unknown', version: '0.0' };
    }

    private getOSInfo(userAgent: string): { name: string; version: string } {
        // Simple OS detection
        const ua = userAgent.toLowerCase();
        
        if (ua.includes('windows')) {
            return { name: 'Windows', version: this.extractVersion(ua, 'windows') };
        } else if (ua.includes('mac os')) {
            return { name: 'macOS', version: this.extractVersion(ua, 'mac os x') };
        } else if (ua.includes('linux')) {
            return { name: 'Linux', version: '0.0' };
        } else if (ua.includes('android')) {
            return { name: 'Android', version: this.extractVersion(ua, 'android') };
        } else if (ua.includes('ios')) {
            return { name: 'iOS', version: this.extractVersion(ua, 'ios') };
        }
        
        return { name: 'Unknown', version: '0.0' };
    }

    private extractVersion(ua: string, product: string): string {
        const regex = new RegExp(`${product}[\\s/]?(\\d+(\\.\\d+)?)`);
        const match = ua.match(regex);
        return match ? match[1] : '0.0';
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    /**
     * Hashes credentials for offline use
     */
    async hashCredentialsForOfflineUse(credentials: LoginCredentials): Promise<string> {
        try {
            // Create a secure hash of the credentials
            const encoder = new TextEncoder();
            const data = encoder.encode(`${credentials.email}:${credentials.password}`);
            
            // Use SubtleCrypto for secure hashing
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex;
        } catch (error) {
            logger.error('Failed to hash credentials for offline use', { component: COMPONENT, error });
            throw error;
        }
    }

    /**
     * Verifies offline credentials against stored hash
     */
    async verifyOfflineCredentials(credentials: LoginCredentials, storedHash: string): Promise<boolean> {
        try {
            const calculatedHash = await this.hashCredentialsForOfflineUse(credentials);
            return calculatedHash === storedHash;
        } catch (error) {
            logger.error('Failed to verify offline credentials', { component: COMPONENT, error });
            return false;
        }
    }

    /**
     * Reports failed login attempts that occurred offline
     */
    async reportFailedLoginAttempt(data: any): Promise<void> {
        try {
            // Report to security monitoring system
            await axiosInstance.post(API_ROUTES.SECURITY.REPORT_FAILED_ATTEMPT, {
                ...data,
                wasOffline: true,
                reportedAt: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to report offline login attempt', { component: COMPONENT, error });
        }
    }
}

export const securityService = new SecurityService();