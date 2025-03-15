const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config');
const { createRedisClient } = require('../../../common/redis');
const User = require('../../user/models/user.model');
const { AuthError } = require('../../../common/errors');
const logger = require('../../../common/logger');
const axios = require('axios');
const geoip = require('geoip-lite');

const COMPONENT = 'SecurityService';

class SecurityService {
    constructor() {
        this.redis = createRedisClient(0);
        this.maxAttempts = config.lockout.maxAttempts;
        this.lockoutDuration = config.lockout.durationMinutes * 60;
        this.auditService = require('../../audit/services/audit.service');
    }

    /**
     * Check rate limits for login attempts
     * @param {string} identifier - User identifier (email/username)
     * @param {Object} deviceInfo - Device information
     */
    async checkRateLimit(identifier, deviceInfo) {
        const key = `ratelimit:${identifier}:${deviceInfo.fingerprint}`;
        const ipKey = `ratelimit:ip:${deviceInfo.ip}`;
        
        // Increment counters
        const attempts = await this.redis.incr(key);
        await this.redis.incr(ipKey);
        
        // Set expiration on first attempt
        if (attempts === 1) {
            await this.redis.expire(key, this.lockoutDuration);
        }
        
        if (parseInt(await this.redis.get(ipKey)) === 1) {
            await this.redis.expire(ipKey, this.lockoutDuration);
        }

        // Check IP-based rate limit (global)
        const ipAttempts = parseInt(await this.redis.get(ipKey));
        if (ipAttempts > config.lockout.maxAttemptsPerIP) {
            logger.warn('IP-based rate limit exceeded', { 
                component: COMPONENT, 
                ip: deviceInfo.ip,
                attempts: ipAttempts
            });
            
            await this.auditService.logSecurityEvent('IP_RATE_LIMIT_EXCEEDED', {
                ip: deviceInfo.ip,
                attempts: ipAttempts
            });
            
            throw new AuthError('RATE_LIMIT_EXCEEDED', {
                remainingTime: await this.redis.ttl(ipKey)
            });
        }

        // Check user+device rate limit
        if (attempts > this.maxAttempts) {
            logger.warn('User rate limit exceeded', { 
                component: COMPONENT, 
                identifier,
                attempts
            });
            
            await this.auditService.logSecurityEvent('USER_RATE_LIMIT_EXCEEDED', {
                identifier,
                deviceFingerprint: deviceInfo.fingerprint,
                attempts
            });
            
            throw new AuthError('RATE_LIMIT_EXCEEDED', {
                remainingTime: await this.redis.ttl(key)
            });
        }
    }

    /**
     * Validate user credentials with security checks
     * @param {Object} credentials - User credentials
     * @param {Object} deviceInfo - Device information
     * @returns {Object} User object if validation successful
     */
    async validateCredentials(credentials, deviceInfo) {
        const startTime = Date.now();
        try {
            // Check rate limits first
            await this.checkRateLimit(credentials.email, deviceInfo);
            
            // Find user and include security fields
            const user = await User.findOne({ email: credentials.email })
                .select('+security.password +security.loginAttempts +security.lockUntil +security.tokenVersion')
                .lean();

            // Check if user exists and is active
            if (!user || !user.isActive) {
                await this._handleFailedAttempt(credentials.email, deviceInfo);
                throw new AuthError('INVALID_CREDENTIALS');
            }

            // Check if account is locked
            if (user.security.lockUntil && user.security.lockUntil > Date.now()) {
                throw new AuthError('ACCOUNT_LOCKED', {
                    remainingTime: Math.ceil((user.security.lockUntil - Date.now()) / 1000)
                });
            }

            // Validate password
            const isPasswordValid = await bcrypt.compare(
                credentials.password,
                user.security.password
            );

            if (!isPasswordValid) {
                await this._handleFailedAttempt(credentials.email, deviceInfo);
                throw new AuthError('INVALID_CREDENTIALS');
            }

            // Check if this is a new device requiring verification
            if (await this._isNewDevice(user, deviceInfo)) {
                if (config.deviceVerification.requireVerification) {
                    await this._sendDeviceVerificationEmail(user, deviceInfo);
                    throw new AuthError('DEVICE_VERIFICATION_REQUIRED', {
                        userId: user._id,
                        email: user.email
                    });
                } else {
                    // Log new device login but don't require verification
                    await this.auditService.logSecurityEvent('NEW_DEVICE_LOGIN', {
                        userId: user._id,
                        deviceInfo: this._sanitizeDeviceInfo(deviceInfo)
                    });
                }
            }

            // Reset failed attempts on successful login
            await this._resetFailedAttempts(credentials.email);
            
            return user;
        } finally {
            // Add timing delay to prevent timing attacks
            await this._addTimingDelay(startTime);
        }
    }

    /**
     * Handle failed login attempt
     * @param {string} identifier - User identifier
     * @param {Object} deviceInfo - Device information
     */
    async _handleFailedAttempt(identifier, deviceInfo) {
        const key = `failures:${identifier}`;
        const attempts = await this.redis.incr(key);
        await this.redis.expire(key, this.lockoutDuration);

        // Log failed attempt
        await this.auditService.logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
            identifier,
            deviceInfo: this._sanitizeDeviceInfo(deviceInfo),
            attempts
        });

        // Lock account if max attempts reached
        if (attempts >= this.maxAttempts) {
            await this._lockAccount(identifier);
        }
        
        // Apply progressive delay if enabled
        if (config.lockout.progressiveDelay) {
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 8000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    /**
     * Lock user account
     * @param {string} identifier - User email
     */
    async _lockAccount(identifier) {
        const user = await User.findOne({ email: identifier });
        if (user) {
            user.security.lockUntil = Date.now() + (this.lockoutDuration * 1000);
            await user.save();
            
            await this.auditService.logSecurityEvent('ACCOUNT_LOCKED', {
                userId: user._id,
                email: user.email,
                lockUntil: user.security.lockUntil
            });
            
            logger.warn('Account locked due to too many failed attempts', {
                component: COMPONENT,
                userId: user._id,
                email: user.email
            });
        }
    }

    /**
     * Reset failed attempts counter
     * @param {string} identifier - User email
     */
    async _resetFailedAttempts(identifier) {
        const key = `failures:${identifier}`;
        await this.redis.del(key);
    }

    /**
     * Check if device is new for this user
     * @param {Object} user - User object
     * @param {Object} deviceInfo - Device information
     * @returns {boolean} True if device is new
     */
    async _isNewDevice(user, deviceInfo) {
        const deviceHash = this._generateDeviceHash(deviceInfo);
        const knownDevices = await this._getKnownDevices(user._id);
        return !knownDevices.includes(deviceHash);
    }

    /**
     * Get known devices for user
     * @param {string} userId - User ID
     * @returns {Array} Array of device hashes
     */
    async _getKnownDevices(userId) {
        const key = `known_devices:${userId}`;
        const devices = await this.redis.smembers(key);
        return devices || [];
    }

    /**
     * Add device to known devices
     * @param {string} userId - User ID
     * @param {Object} deviceInfo - Device information
     */
    async addKnownDevice(userId, deviceInfo) {
        const deviceHash = this._generateDeviceHash(deviceInfo);
        const key = `known_devices:${userId}`;
        await this.redis.sadd(key, deviceHash);
        
        // Set expiration based on config
        await this.redis.expire(key, config.deviceVerification.deviceFingerprintTimeout);
        
        await this.auditService.logSecurityEvent('DEVICE_VERIFIED', {
            userId,
            deviceInfo: this._sanitizeDeviceInfo(deviceInfo)
        });
        
        return deviceHash;
    }

    /**
     * Generate hash for device fingerprinting
     * @param {Object} deviceInfo - Device information
     * @returns {string} Device hash
     */
    _generateDeviceHash(deviceInfo) {
        return crypto.createHash('sha256')
            .update(`${deviceInfo.userAgent}|${deviceInfo.screenResolution}|${deviceInfo.timezone}|${deviceInfo.platform}|${deviceInfo.fingerprint}`)
            .digest('hex');
    }

    /**
     * Send device verification email
     * @param {Object} user - User object
     * @param {Object} deviceInfo - Device information
     */
    async _sendDeviceVerificationEmail(user, deviceInfo) {
        // Generate verification code
        const verificationCode = crypto.randomBytes(32).toString('hex');
        const key = `device_verification:${user._id}:${this._generateDeviceHash(deviceInfo)}`;
        
        // Store verification code in Redis with expiration
        await this.redis.set(key, verificationCode);
        await this.redis.expire(key, config.deviceVerification.verificationTimeout);
        
        // Log event
        await this.auditService.logSecurityEvent('DEVICE_VERIFICATION_REQUESTED', {
            userId: user._id,
            deviceInfo: this._sanitizeDeviceInfo(deviceInfo)
        });
        
        // Send email (implementation would depend on email service)
        // emailService.sendDeviceVerificationEmail(user.email, verificationCode, deviceInfo);
        
        logger.info('Device verification email sent', {
            component: COMPONENT,
            userId: user._id,
            email: user.email
        });
    }

    /**
     * Verify device with verification code
     * @param {string} userId - User ID
     * @param {string} verificationCode - Verification code
     * @param {Object} deviceInfo - Device information
     * @returns {boolean} True if verification successful
     */
    async verifyDevice(userId, verificationCode, deviceInfo) {
        const deviceHash = this._generateDeviceHash(deviceInfo);
        const key = `device_verification:${userId}:${deviceHash}`;
        
        const storedCode = await this.redis.get(key);
        if (!storedCode || storedCode !== verificationCode) {
            throw new AuthError('INVALID_VERIFICATION_CODE');
        }
        
        // Delete verification code
        await this.redis.del(key);
        
        // Add device to known devices
        await this.addKnownDevice(userId, deviceInfo);
        
        return true;
    }

    /**
     * Validate login attempt for suspicious activity
     * @param {Object} user - User object
     * @param {Object} deviceInfo - Device information
     */
    async validateLoginAttempt(user, deviceInfo) {
        // Check for impossible travel
        const lastLogin = await this._getLastLoginLocation(user._id);
        if (lastLogin && this._isImpossibleTravel(lastLogin.location, deviceInfo.location)) {
            await this.auditService.logSecurityEvent('IMPOSSIBLE_TRAVEL_DETECTED', {
                userId: user._id,
                previousLocation: lastLogin.location,
                currentLocation: deviceInfo.location,
                timeDifference: Date.now() - lastLogin.timestamp
            });
            
            // Depending on security policy, we might throw an error here
            if (config.security?.suspicious?.blockImpossibleTravel) {
                throw new AuthError('SUSPICIOUS_LOGIN_LOCATION');
            }
        }

        // Check for unusual login time
        if (this._isUnusualLoginTime(user, deviceInfo.timezone)) {
            await this.auditService.logSecurityEvent('UNUSUAL_LOGIN_TIME', {
                userId: user._id,
                time: new Date(),
                timezone: deviceInfo.timezone
            });
        }

        // Check for high-risk location
        if (this._isHighRiskLocation(deviceInfo.location)) {
            await this.auditService.logSecurityEvent('HIGH_RISK_LOCATION', {
                userId: user._id,
                location: deviceInfo.location
            });
        }

        // Store current login location
        await this._storeLoginLocation(user._id, deviceInfo.location);
    }

    /**
     * Get last login location for user
     * @param {string} userId - User ID
     * @returns {Object} Last login location
     */
    async _getLastLoginLocation(userId) {
        const key = `last_login:${userId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Store login location
     * @param {string} userId - User ID
     * @param {Object} location - Location object
     */
    async _storeLoginLocation(userId, location) {
        const key = `last_login:${userId}`;
        await this.redis.set(key, JSON.stringify({
            location,
            timestamp: Date.now()
        }));
        await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
    }

    /**
     * Check if travel between locations is impossible
     * @param {Object} loc1 - First location
     * @param {Object} loc2 - Second location
     * @returns {boolean} True if travel is impossible
     */
    _isImpossibleTravel(loc1, loc2) {
        const speed = this._calculateTravelSpeed(loc1, loc2);
        return speed > (config.security?.suspicious?.maxLoginVelocity || 800); // km/h
    }

    /**
     * Calculate travel speed between locations
     * @param {Object} loc1 - First location
     * @param {Object} loc2 - Second location
     * @returns {number} Speed in km/h
     */
    _calculateTravelSpeed(loc1, loc2) {
        if (!loc1 || !loc2 || !loc1.lat || !loc1.lon || !loc2.lat || !loc2.lon) {
            return 0;
        }

        // Calculate distance using Haversine formula
        const R = 6371; // Earth radius in km
        const dLat = this._toRad(loc2.lat - loc1.lat);
        const dLon = this._toRad(loc2.lon - loc1.lon);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this._toRad(loc1.lat)) * Math.cos(this._toRad(loc2.lat)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Calculate time difference in hours
        const timeDiff = (loc2.timestamp - loc1.timestamp) / (1000 * 60 * 60);
        
        // Calculate speed in km/h
        return timeDiff > 0 ? distance / timeDiff : 0;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} Radians
     */
    _toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Check if login time is unusual for user
     * @param {Object} user - User object
     * @param {string} timezone - User timezone
     * @returns {boolean} True if login time is unusual
     */
    _isUnusualLoginTime(user, timezone) {
        // Implementation would depend on user's typical login patterns
        // For now, we'll consider 1am-5am as unusual hours
        const userTime = new Date();
        if (timezone) {
            // Adjust for user's timezone
            const offset = parseInt(timezone.replace(/GMT([+-]\d+)/, '$1'), 10);
            userTime.setHours(userTime.getHours() + offset);
        }
        
        const hour = userTime.getHours();
        return hour >= 1 && hour <= 5;
    }

    /**
     * Check if location is high risk
     * @param {Object} location - Location object
     * @returns {boolean} True if location is high risk
     */
    _isHighRiskLocation(location) {
        if (!location || !location.country) {
            return false;
        }
        
        const highRiskCountries = config.security?.suspicious?.highRiskCountries || 
            ['XX', 'YY', 'ZZ']; // Placeholder for actual high-risk countries
            
        return highRiskCountries.includes(location.country);
    }

    /**
     * Add timing delay to prevent timing attacks
     * @param {number} startTime - Start time in milliseconds
     */
    async _addTimingDelay(startTime) {
        const elapsed = Date.now() - startTime;
        const minTime = 1000; // Minimum processing time in ms
        
        if (elapsed < minTime) {
            await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
        }
    }

    /**
     * Sanitize device info for logging
     * @param {Object} deviceInfo - Device information
     * @returns {Object} Sanitized device info
     */
    _sanitizeDeviceInfo(deviceInfo) {
        const { ip, fingerprint, ...safeInfo } = deviceInfo;
        // Only include last octet of IP for privacy
        const sanitizedIp = ip ? ip.replace(/(\d+\.\d+\.\d+\.)\d+/, '$1*') : null;
        
        return {
            ...safeInfo,
            ipPrefix: sanitizedIp,
            fingerprintHash: fingerprint ? 
                crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 8) : null
        };
    }

    /**
     * Check if password has been breached
     * @param {string} password - Password to check
     * @returns {Promise<boolean>} True if password is breached
     */
    async isPasswordBreached(password) {
        try {
            // Use k-anonymity model with HIBP API
            const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
            const prefix = sha1.substring(0, 5);
            const suffix = sha1.substring(5);
            
            const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
            
            // Check if password hash suffix is in the response
            return response.data.split('\n').some(line => {
                const [hashSuffix] = line.split(':');
                return hashSuffix === suffix;
            });
        } catch (error) {
            logger.error('Error checking password breach status', {
                component: COMPONENT,
                error: error.message
            });
            
            // Default to false if API is unavailable
            return false;
        }
    }

    /**
     * Validate IP against restrictions
     * @param {string} ip - IP address
     */
    async validateIPRestrictions(ip) {
        // Check if IP is blocked
        const isBlocked = await this.redis.get(`blocked_ip:${ip}`);
        if (isBlocked) {
            throw new AuthError('IP_BLOCKED', {
                remainingTime: await this.redis.ttl(`blocked_ip:${ip}`)
            });
        }
        
        // Check geo-restrictions if enabled
        if (config.security?.geoRestrictions?.enabled) {
            const geo = geoip.lookup(ip);
            if (geo && config.security.geoRestrictions.blockedCountries.includes(geo.country)) {
                await this.auditService.logSecurityEvent('GEO_RESTRICTED_ACCESS', {
                    ip,
                    country: geo.country
                });
                
                throw new AuthError('GEO_RESTRICTED');
            }
        }
    }

    /**
     * Block an IP address
     * @param {string} ip - IP address to block
     * @param {number} duration - Duration in seconds
     */
    async blockIP(ip, duration = 3600) {
        await this.redis.set(`blocked_ip:${ip}`, '1');
        await this.redis.expire(`blocked_ip:${ip}`, duration);
        
        await this.auditService.logSecurityEvent('IP_BLOCKED', {
            ip,
            duration
        });
        
        logger.warn('IP address blocked', {
            component: COMPONENT,
            ip,
            duration
        });
    }

    /**
     * Add progressive delay based on failed attempts
     * @param {String} identifier - User identifier
     * @param {Object} deviceInfo - Device information
     * @returns {Promise<void>}
     */
    async _addProgressiveDelay(identifier, deviceInfo) {
        if (!config.security.lockout.progressiveDelay) {
            return;
        }
        
        const key = `failures:${identifier}:${deviceInfo.fingerprint || deviceInfo.ip}`;
        const attempts = parseInt(await this.redis.get(key) || '0', 10);
        
        if (attempts > 0) {
            // Calculate delay: 200ms * 2^attempts (capped at 30 seconds)
            const delayMs = Math.min(200 * Math.pow(2, attempts - 1), 30000);
            
            // Log the delay being applied
            logger.debug('Adding progressive delay for failed login', {
                component: 'SecurityService',
                identifier,
                attempts,
                delayMs
            });
            
            // Apply delay
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    /**
     * Handle failed login attempt with progressive delay
     * @param {String} identifier - User identifier
     * @param {Object} deviceInfo - Device information
     */
    async handleFailedAttempt(identifier, deviceInfo) {
        const key = `failures:${identifier}:${deviceInfo.fingerprint || deviceInfo.ip}`;
        const attempts = await this.redis.incr(key);
        
        // Set expiration on first attempt
        if (attempts === 1) {
            await this.redis.expire(key, config.security.lockout.durationMinutes * 60);
        }
        
        // Log failed attempt
        await this.auditService.logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
            identifier,
            deviceInfo: this._sanitizeDeviceInfo(deviceInfo),
            attempts
        });
        
        // Add progressive delay for next attempt
        await this._addProgressiveDelay(identifier, deviceInfo);
        
        // Lock account if max attempts reached
        if (attempts >= config.security.lockout.maxAttempts) {
            await this._lockAccount(identifier);
        }
    }
}

module.exports = new SecurityService();
