import { AxiosInstance } from 'axios';

export const setupSecurityHeaders = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    // Add security headers
    config.headers['X-Content-Type-Options'] = 'nosniff';
    config.headers['X-Frame-Options'] = 'DENY';
    config.headers['X-XSS-Protection'] = '1; mode=block';
    config.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    config.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    
    // Add custom security header for password transmission
    if (config.url?.includes('/auth/login')) {
      config.headers['X-Password-Encoded'] = 'true';
    }

    return config;
  });
};
