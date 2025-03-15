// Environment-aware configuration file
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiry: '15m',
        refreshExpiry: '7d',
        issuer: 'SupportHub'
    },
    security: {
        passwordPolicy: {
            minLength: isDevelopment ? 8 : 12,
            requireUppercase: !isDevelopment,
            requireLowercase: !isDevelopment,
            requireNumbers: !isDevelopment,
            requireSpecialChars: !isDevelopment,
            preventCommonPasswords: !isDevelopment,
            passwordHistoryDays: isDevelopment ? 0 : 365,
            passwordHistoryCount: isDevelopment ? 0 : 5
        },
        lockout: {
            maxAttempts: isDevelopment ? 1000 : 5,
            durationMinutes: isDevelopment ? 5 : 30,
            resetAfterHours: isDevelopment ? 1 : 24,
            progressiveDelay: false // Disable progressive delay
        },
        session: {
            maxConcurrentSessions: isDevelopment ? 1000 : 10, // Increase limit
            sessionTimeout: 24 * 60 * 60, // 24 hours
            extendSessionBeforeExpiry: 15 * 60, // 15 minutes
            enforceDeviceBinding: !isDevelopment,
            requireMfaOnNewDevice: !isDevelopment
        },
        deviceVerification: {
            requireVerification: false, // Disable device verification
            verificationTimeout: 10 * 60, // 10 minutes
            maxUnverifiedDevices: isDevelopment ? 1000 : 5,
            deviceFingerprintTimeout: 30 * 24 * 60 * 60 // 30 days
        },
        suspicious: {
            blockImpossibleTravel: false // Disable impossible travel detection
        }
    },
    rateLimiting: {
        login: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: isDevelopment ? 1000 : 5,
        },
        register: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: isDevelopment ? 1000 : 3,
        },
        forgotPassword: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: isDevelopment ? 1000 : 3,
        },
        twoFactor: {
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: isDevelopment ? 1000 : 3,
        },
        refresh: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: isDevelopment ? 1000 : 100,
        }
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    }
};
