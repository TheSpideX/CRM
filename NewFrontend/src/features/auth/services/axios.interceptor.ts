import axios from 'axios';
import { tokenService } from './token.service';
import { store } from '@/store';
import { logout } from '../store/authSlice';
import { authService } from './auth.service';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor - add basic error handling
axios.interceptors.request.use(
  config => {
    // Add basic error handling for request configuration
    try {
      // Ensure headers exist
      config.headers = config.headers || {};
      
      // Add authorization if token exists
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config; // Return config even if there's an error to prevent request blocking
    }
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - improved error handling
axios.interceptors.response.use(
  response => response,
  async error => {
    // Basic error handling to prevent crashes
    if (!error) {
      return Promise.reject({ 
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        isNetworkError: false
      });
    }
    
    // Handle network errors with more detail
    if (!error.response) {
      // Check if it's a CORS error
      if (error.message && error.message.includes('Network Error')) {
        console.error('Network error details:', {
          message: error.message,
          config: error.config
        });
        
        const networkError = { 
          message: 'Unable to connect to server. Please check if the backend is running.',
          code: 'NETWORK_ERROR',
          isNetworkError: true,
          details: {
            url: error.config?.url,
            method: error.config?.method
          }
        };
        return Promise.reject(networkError);
      }
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        const timeoutError = {
          message: 'Request timed out. Server may be overloaded or offline.',
          code: 'TIMEOUT_ERROR',
          isNetworkError: true
        };
        return Promise.reject(timeoutError);
      }
      
      // Generic network error
      const networkError = { 
        message: 'Network error - unable to connect to server',
        code: 'NETWORK_ERROR',
        isNetworkError: true
      };
      return Promise.reject(networkError);
    }
    
    // Handle 401 errors
    if (error.response.status === 401) {
      // Simple logout without complex token refresh logic for now
      store.dispatch(logout());
    }
    
    // Add consistent error structure to all errors
    const enhancedError = {
      ...error,
      code: error.response?.data?.code || `HTTP_${error.response?.status || 'UNKNOWN'}`,
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      isNetworkError: !error.response
    };
    
    return Promise.reject(enhancedError);
  }
);