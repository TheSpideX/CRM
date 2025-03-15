const helmet = require('helmet');
const hpp = require('hpp');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../utils/redis');
const config = require('../config');

// Rate limiting configurations
const createRateLimiter = (options) => rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rate-limit:'
    }),
    ...options
});

const rateLimiters = {
    login: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many login attempts, please try again later'
    }),
    
    passwordReset: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3
    }),
    
    emailVerification: createRateLimiter({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        max: 5
    }),

    api: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 100
    })
};

const securityMiddleware = [
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for backward compatibility
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", process.env.API_URL].filter(Boolean),
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        frameguard: { 
            action: 'deny' 
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { 
            policy: 'strict-origin-when-cross-origin' 
        }
    }),
    (req, res, next) => {
        // Add custom security headers
        res.setHeader('X-Content-Security-Policy', "default-src 'self'");
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        res.setHeader('X-Download-Options', 'noopen');
        
        // Add feature policy header
        res.setHeader('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'");
        
        next();
    },
    hpp(), // Protect against HTTP Parameter Pollution
    csrf({ cookie: { secure: true, sameSite: 'strict' }}),
    rateLimiters.api
];

module.exports = {
    securityMiddleware,
    rateLimiters
};
