import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// Request deduplication system
const pendingRequests = new Map<string, Promise<any>>();
const lastRequestTimes = new Map<string, number>();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getAccessToken: () => {
    const token = Cookies.get('access_token');
    console.log('Getting access_token from cookie:', token ? 'Found' : 'Not found');
    // Fallback to localStorage if cookie not found
    if (!token) {
      const localToken = localStorage.getItem('token');
      console.log('Fallback to localStorage token:', localToken ? 'Found' : 'Not found');
      return localToken;
    }
    return token;
  },
  getRefreshToken: () => {
    const token = Cookies.get('refresh_token');
    console.log('Getting refresh_token from cookie:', token ? 'Found' : 'Not found');
    return token;
  },
  setTokens: (accessToken: string, refreshToken?: string) => {
    console.log('Setting tokens - access:', accessToken ? 'Present' : 'Missing', 'refresh:', refreshToken ? 'Present' : 'Missing');
    Cookies.set('access_token', accessToken, { expires: 1 }); // 1 day
    if (refreshToken) {
      Cookies.set('refresh_token', refreshToken, { expires: 7 }); // 7 days
    }
    // Also set in localStorage as fallback
    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }
    // Verify they were set
    console.log('Tokens after setting - access cookie:', Cookies.get('access_token') ? 'Set' : 'Failed', 'refresh cookie:', Cookies.get('refresh_token') ? 'Set' : 'Failed');
  },
  clearTokens: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    localStorage.removeItem('token');
  },
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    const requestKey = `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params)}`;
    const now = Date.now();
    
    console.log('🌐 API Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing');
    
    // Check for recent duplicate requests (within 500ms)
    const lastTime = lastRequestTimes.get(requestKey);
    if (lastTime && (now - lastTime) < 500) {
      console.log('🚫 Deduplicating rapid request:', requestKey);
      return Promise.reject(new Error('DEDUPLICATED_REQUEST'));
    }
    
    lastRequestTimes.set(requestKey, now);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('401 Error detected for:', originalRequest.url);
      originalRequest._retry = true;

      // Skip auth endpoints to avoid infinite loop
      if (originalRequest.url?.includes('/auth/')) {
        return Promise.reject(error);
      }

      const refreshToken = tokenManager.getRefreshToken();
      console.log('Refresh token:', refreshToken ? 'Present' : 'Missing');
      
      // Since we don't have refresh tokens in this system, just clear tokens
      // and let the AuthContext handle the redirect
      if (!refreshToken) {
        console.error('No refresh token - need to re-login');
        tokenManager.clearTokens();
        // Don't force redirect here - let AuthContext and React Router handle it
        return Promise.reject(error);
      }
      
      // If we have a refresh token, try to use it
      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });
        
        const { accessToken } = response.data;
        tokenManager.setTokens(accessToken);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Refresh token failed:', refreshError);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Skip handling for deduplicated requests
    if (error.message === 'DEDUPLICATED_REQUEST') {
      return Promise.reject(error);
    }

    // Handle other errors - but skip showing toasts for bulk generation endpoints
    // since they have their own error handling
    const skipGlobalToast = originalRequest?.url?.includes('/reviews/queue-bulk-generate') || 
                           originalRequest?.url?.includes('/reviews/jobs/');
    
    if (!skipGlobalToast) {
      if (error.response?.status === 500) {
        toast.error('Erro no servidor. Tente novamente mais tarde.');
      } else if (error.response?.status === 404) {
        toast.error('Recurso não encontrado.');
      } else if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar este recurso.');
      }
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;