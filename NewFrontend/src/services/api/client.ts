import axios from 'axios';
import { API_BASE_URL } from '@/config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
});

// Debug interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      data: response.data,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

// Add request interceptor for CSRF token
apiClient.interceptors.request.use(async (config) => {
  // Try to get CSRF token from cookie
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN'))
    ?.split('=')[1];

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken);
  }

  // Add auth token if exists
  const tokens = JSON.parse(
    localStorage.getItem('auth_tokens') || 
    sessionStorage.getItem('auth_tokens') || 
    '{}'
  );

  if (tokens.accessToken) {
    config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }
  
  return config;
});

export default apiClient;
