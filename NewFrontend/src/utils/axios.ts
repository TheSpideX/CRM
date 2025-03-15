import axios from "axios";
import { API_CONFIG, API_ERRORS, CORS_CONFIG } from "@/config/api";
import { logger } from "@/utils/logger";
import { RetryHandler } from "@/core/errors/retryHandler";
import { errorHandler } from "@/core/errors/errorHandler";
import { securityService } from '@/features/auth/services/security.service';
import { serverStatusService } from '@/components/ui/ServerStatusIndicator';

export const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
  ...CORS_CONFIG,
});

// Add CSRF token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Attach CSRF token to requests
    return securityService.attachCsrfToken(config);
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add request ID to each request
axiosInstance.interceptors.request.use(
  (config) => {
    // Generate a unique request ID
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Ensure error.config exists before accessing it
    const originalRequest = error && error.config ? error.config : {};

    // Check if it's a network error and retry
    if (error && error.code === 'ERR_NETWORK' && originalRequest && !originalRequest._retry) {
      // Update server status
      serverStatusService.checkServerAvailability();
      
      return RetryHandler.retry(
        () => {
          if (originalRequest) {
            originalRequest._retry = true;
            return axiosInstance(originalRequest);
          }
          return Promise.reject(new Error('Cannot retry with invalid request'));
        },
        {
          maxAttempts: 3,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR']
        }
      );
    }

    // Use the unified error handler
    errorHandler.handleError(error, {
      component: 'AxiosInterceptor',
      action: originalRequest && originalRequest.method && originalRequest.url ? 
        `${originalRequest.method} ${originalRequest.url}` : 'unknown request',
      timestamp: Date.now()
    });

    return Promise.reject(error);
  }
);

export default axiosInstance;