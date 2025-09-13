import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [hasInitialized, setHasInitialized] = useState(false);
  const navigate = useNavigate();
  
  // Debug tracking
  const loadCountRef = useRef(0);
  const lastLoadTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());
  
  // Deduplication
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Load user on mount
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const loadUser = async () => {
      const now = Date.now();
      const timeSinceMount = now - mountTimeRef.current;
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      loadCountRef.current += 1;
      
      console.log(`🔍 AuthContext: Loading user... (Load #${loadCountRef.current}, ${timeSinceMount}ms since mount, ${timeSinceLastLoad}ms since last load)`);
      
      // Prevent duplicate loads
      if (isLoadingRef.current) {
        console.log('⏸️ AuthContext: Already loading, skipping duplicate load');
        return;
      }
      
      // Prevent loading if already loaded and time is too short
      if (hasLoadedRef.current && timeSinceLastLoad < 1000) {
        console.log('⏸️ AuthContext: Recently loaded, skipping duplicate load');
        return;
      }
      
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      
      const token = tokenManager.getAccessToken();
      console.log('AuthContext: Token found:', !!token);
      
      if (token) {
        try {
          console.log('AuthContext: Fetching current user...');
          const userData = await authService.getCurrentUser();
          console.log('AuthContext: User loaded successfully:', userData.email);
          
          if (isMounted) {
            setUser(userData);
          }
        } catch (error) {
          console.error('AuthContext: Failed to load user:', error);
          tokenManager.clearTokens();
          
          if (isMounted) {
            setUser(null);
          }
        }
      }
      
      if (isMounted) {
        console.log('AuthContext: Loading complete, setting isLoading to false');
        setIsLoading(false);
        setHasInitialized(true);
        hasLoadedRef.current = true;
      }
      
      isLoadingRef.current = false;
    };

    loadUser();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
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
        isAuthenticated: hasInitialized && !!user,
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