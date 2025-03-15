import { AxiosInstance } from 'axios';

export class RateLimiter {
  private requests: { [key: string]: number[] } = {};
  private readonly limit: number;
  private readonly windowMs: number;
  
  // Registration specific limits
  private static readonly REGISTER_LIMIT = 1000; // Increased from 3 to 1000
  private static readonly REGISTER_WINDOW = 60 * 60 * 1000; // 1 hour
  private static readonly REGISTER_DAILY_LIMIT = 1000; // Increased from 5 to 1000
  private static readonly REGISTER_DAILY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  constructor(limit: number = 1000, windowMs: number = 60000) { // Increased from 100 to 1000
    this.limit = limit;
    this.windowMs = windowMs;
  }

  shouldLimit(endpoint: string): boolean {
    const now = Date.now();
    if (!this.requests[endpoint]) {
      this.requests[endpoint] = [];
    }

    // Remove old requests
    this.requests[endpoint] = this.requests[endpoint].filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    // Check if limit is reached
    if (this.requests[endpoint].length >= this.limit) {
      return true;
    }

    // Add new request
    this.requests[endpoint].push(now);
    return false;
  }

  shouldLimitRegistration(): boolean {
    const now = Date.now();
    const endpoint = 'register';

    if (!this.requests[endpoint]) {
      this.requests[endpoint] = [];
    }

    // Clean up old requests
    this.requests[endpoint] = this.requests[endpoint].filter(
      (timestamp) => now - timestamp < RateLimiter.REGISTER_WINDOW
    );

    // Check hourly limit
    if (this.requests[endpoint].length >= RateLimiter.REGISTER_LIMIT) {
      return true;
    }

    // Check daily limit
    const dailyRequests = this.requests[endpoint].filter(
      (timestamp) => now - timestamp < RateLimiter.REGISTER_DAILY_WINDOW
    );
    if (dailyRequests.length >= RateLimiter.REGISTER_DAILY_LIMIT) {
      return true;
    }

    // Add new request
    this.requests[endpoint].push(now);
    return false;
  }

  getNextAllowedRegistrationTime(): number {
    const now = Date.now();
    const endpoint = 'register';
    
    if (!this.requests[endpoint]?.length) {
      return now;
    }

    const oldestRequest = Math.min(...this.requests[endpoint]);
    return oldestRequest + RateLimiter.REGISTER_WINDOW;
  }
}

export const setupRateLimiting = (axiosInstance: AxiosInstance) => {
  const rateLimiter = new RateLimiter();

  axiosInstance.interceptors.request.use((config) => {
    const endpoint = config.url || '';
    
    if (rateLimiter.shouldLimit(endpoint)) {
      return Promise.reject(new Error('Too many requests. Please try again later.'));
    }

    return config;
  });
};
