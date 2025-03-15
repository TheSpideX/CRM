const authRoutes = require('./routes/auth.routes');
const authController = require('./controllers/auth.controller');
const securityController = require('./controllers/security.controller');
const authMiddleware = require('./middleware/auth.middleware');
const csrfMiddleware = require('./middleware/csrf.middleware');
const securityMiddleware = require('./middleware/security.middleware');
const rateLimitMiddleware = require('./middleware/rateLimit.middleware');
const config = require('./config');
const { AuthError } = require('./errors');

/**
 * Initialize auth module
 * @param {Express} app - Express application instance
 */
const initialize = (app) => {
    // Initialize auth routes
    app.use('/api/auth', authRoutes);
    
    // Export auth middleware for use in other modules
    app.locals.auth = {
        authenticate: authMiddleware.authenticate,
        authorize: authMiddleware.authorize
    };
};

module.exports = {
    initialize,
    authMiddleware,
    csrfMiddleware,
    securityMiddleware,
    rateLimitMiddleware,
    authController,
    securityController,
    config,
    AuthError
};
