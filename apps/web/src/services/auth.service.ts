import api, { tokenManager } from './api';
import type { IUser, IApiResponse } from '@tatame/types';
import Cookies from 'js-cookie';

export type LoginCredentials = {
  email: string;
  password: string;
}

export type RegisterData = {
  name: string;
  email: string;
  password: string;
}

export type AuthResponse = {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    
    
    // Check if response has the expected structure
    if (!response.data?.data) {
      console.error('Invalid response structure:', response.data);
      throw new Error('Invalid response from server');
    }
    
    const { user, accessToken, refreshToken } = response.data.data;
    
    
    tokenManager.setTokens(accessToken, refreshToken);
    // Also store in localStorage for backward compatibility
    localStorage.setItem('token', accessToken);
    
    
    return { user, accessToken, refreshToken };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    
    // Check if response has the expected structure
    if (!response.data?.data) {
      throw new Error('Invalid response from server');
    }
    
    const { user, accessToken, refreshToken } = response.data.data;
    
    tokenManager.setTokens(accessToken, refreshToken);
    // Also store in localStorage for backward compatibility
    localStorage.setItem('token', accessToken);
    
    return { user, accessToken, refreshToken };
  }

  async requestMagicLink(email: string): Promise<void> {
    await api.post('/auth/request-magic-link', { email });
  }

  async loginWithMagicLink(token: string): Promise<AuthResponse> {
    const response = await api.get<IApiResponse<AuthResponse>>(`/auth/magic-link-login?token=${token}`);
    const { user, accessToken, refreshToken } = response.data.data!;
    
    tokenManager.setTokens(accessToken, refreshToken);
    // Also store in localStorage for backward compatibility
    localStorage.setItem('token', accessToken);
    
    return { user, accessToken, refreshToken };
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenManager.clearTokens();
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }

  async getCurrentUser(): Promise<IUser> {
    const response = await api.get('/auth/me');
    
    
    // Check if response has the expected structure
    if (!response.data?.data?.user) {
      throw new Error('Invalid response from server');
    }
    
    
    return response.data.data.user;
  }

  async updateProfile(data: {
    name?: string;
    bio?: string;
    location?: string;
    socialLinks?: {
      linkedin?: string;
      github?: string;
      twitter?: string;
      website?: string;
    };
  }): Promise<IUser> {
    const response = await api.put<IApiResponse<IUser>>('/auth/profile', data);
    return response.data.data!;
  }
}

export default new AuthService();