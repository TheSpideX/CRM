const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const securityController = require("../controllers/security.controller");
const rateLimitMiddleware = require("../middleware/rateLimit.middleware");
const { csrfMiddleware } = require("../middleware");
const authMiddleware = require("../middleware/auth.middleware");
const securityMiddleware = require("../middleware/security.middleware");
const validate = require("../middleware/validate");
const schemas = require("../validations/schemas");

// Health check endpoint (no CSRF needed)
router.get("/health", (req, res) => {
    res.json({ status: "Auth service operational" });
});

// Get CSRF token endpoint
router.get("/csrf", csrfMiddleware.generateToken, (req, res) => {
    res.json({ 
        message: "CSRF token set in cookies",
        success: true
    });
});

// Apply CSRF middleware to all routes after /csrf
router.use(csrfMiddleware.generateToken);

// Apply security middleware to all auth routes
router.use(securityMiddleware.secureHeaders());

// Login route
router.post(
    "/login",
    rateLimitMiddleware.loginRateLimit(),
    validate(schemas.login),
    csrfMiddleware.validateToken,
    authController.login
);

// Logout route
router.post(
    '/logout',
    authMiddleware.authenticate(),
    csrfMiddleware.validateToken,
    authController.logout
);

// Refresh token route
router.post(
    '/refresh',
    rateLimitMiddleware.apiRateLimit(),
    csrfMiddleware.validateToken,
    authController.refreshToken
);

// Validate session route
router.post(
    "/validate-session",
    rateLimitMiddleware.apiRateLimit(),
    authMiddleware.authenticate(),
    csrfMiddleware.validateToken,
    authController.validateSession
);

// Register route
router.post(
    "/register",
    rateLimitMiddleware.createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        prefix: "rate_limit:register:",
        errorCode: "REGISTER_RATE_LIMIT_EXCEEDED",
        message: "Too many registration attempts. Please try again later."
    }),
    validate(schemas.register),
    csrfMiddleware.validateToken,
    authController.register
);

// Forgot password route
router.post(
    "/forgot-password",
    rateLimitMiddleware.createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        prefix: "rate_limit:forgot_password:",
        errorCode: "FORGOT_PASSWORD_RATE_LIMIT_EXCEEDED",
        message: "Too many password reset attempts. Please try again later."
    }),
    validate(schemas.forgotPassword),
    csrfMiddleware.validateToken,
    authController.forgotPassword
);

// Reset password route
router.post(
    "/reset-password",
    rateLimitMiddleware.createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        prefix: "rate_limit:reset_password:",
        errorCode: "RESET_PASSWORD_RATE_LIMIT_EXCEEDED",
        message: "Too many password reset attempts. Please try again later."
    }),
    validate(schemas.resetPassword),
    csrfMiddleware.validateToken,
    authController.resetPassword
);

// Security routes
router.post(
    "/change-password",
    rateLimitMiddleware.apiRateLimit(),
    authMiddleware.authenticate(),
    validate(schemas.changePassword),
    csrfMiddleware.validateToken,
    securityController.changePassword
);

// Get security status
router.get(
    "/security-status",
    rateLimitMiddleware.apiRateLimit(),
    authMiddleware.authenticate(),
    csrfMiddleware.validateToken,
    securityController.getSecurityStatus
);

// Generate CSRF token route
router.get('/csrf-token',
  rateLimitMiddleware.apiRateLimit(),
  authMiddleware.authenticate({ optional: true }),
  csrfMiddleware.generateToken,
  (req, res) => {
    res.json({ csrfToken: res.locals.csrfToken });
  }
);

module.exports = router;
