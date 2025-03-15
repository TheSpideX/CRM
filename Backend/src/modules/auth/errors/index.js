// Standardize error structure to match frontend expectations
class AuthError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

// Error handler middleware
const authErrorHandler = (err, req, res, next) => {
  if (err instanceof AuthError) {
    // Log the error
    console.error(`[AuthError] ${err.code}: ${err.message}`, err.details);
    
    // Send standardized response
    return res.status(401).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details
      }
    });
  }
  
  // Pass other errors to the default error handler
  next(err);
};

module.exports = { AuthError, authErrorHandler };
