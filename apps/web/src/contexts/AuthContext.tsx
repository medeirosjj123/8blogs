import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../services/auth.service';
import type { LoginCredentials, RegisterData } from '../services/auth.service';
import { tokenManager } from '../services/api';
import type { IUser } from '@tatame/types';

interface AuthContextData {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<IUser>) => Promise<void>;
  setUserData: (userData: IUser) => void;
  requestMagicLink: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = tokenManager.getAccessToken();
      
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          tokenManager.clearTokens();
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const { user } = await authService.login(credentials);
      setUser(user);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Erro ao fazer login';
      toast.error(message);
      throw error;
    }
  }, [navigate]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const { user } = await authService.register(data);
      setUser(user);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Erro ao criar conta';
      toast.error(message);
      throw error;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login');
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [navigate]);

  const updateUser = useCallback(async (data: Partial<IUser>) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Erro ao atualizar perfil';
      toast.error(message);
      throw error;
    }
  }, []);

  const setUserData = useCallback((userData: IUser) => {
    setUser(userData);
  }, []);

  const requestMagicLink = useCallback(async (email: string) => {
    try {
      await authService.requestMagicLink(email);
      toast.success('Link mágico enviado para seu email!');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Erro ao enviar link mágico';
      toast.error(message);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        setUserData,
        requestMagicLink,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};