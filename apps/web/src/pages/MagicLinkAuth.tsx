import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

export const MagicLinkAuth: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserData } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (hasAttempted) return; // Prevent multiple attempts
    
    const authenticateMagicLink = async () => {
      const token = searchParams.get('token');
      
      // Check if we already have a valid token in localStorage
      const existingToken = localStorage.getItem('token');
      if (existingToken && token) {
        // If user is already authenticated, redirect to dashboard immediately
        setStatus('success');
        setMessage('Já autenticado! Redirecionando...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
        return;
      }
      
      setHasAttempted(true);
      
      if (!token) {
        setStatus('error');
        setMessage('Token de acesso inválido ou expirado');
        return;
      }

      try {
        const response = await api.get(`/api/auth/magic-link?token=${token}`);
        
        if (response.data.success) {
          // Store the token and update auth context
          localStorage.setItem('token', response.data.token);
          
          // Update auth context with user data
          if (response.data.user) {
            setUserData(response.data.user);
          }
          
          setStatus('success');
          setMessage('Acesso autorizado! Redirecionando...');
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Falha na autenticação');
        }
      } catch (error: any) {
        console.error('Magic link authentication error:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'Token inválido ou expirado. Solicite um novo link de acesso.'
        );
      }
    };

    authenticateMagicLink();
  }, [searchParams, setUserData, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bloghouse-primary-50 via-white to-bloghouse-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center bloghouse-glow">
            <span className="text-white font-bold text-xl">B</span>
          </div>
        </div>
        
        <div className="bg-white py-8 px-4 bloghouse-glow sm:rounded-xl sm:px-10 gradient-glass border border-bloghouse-primary-100">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 text-bloghouse-primary-600 mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-bloghouse-primary-700 to-bloghouse-secondary-700 bg-clip-text text-transparent mb-2">
                  Autenticando...
                </h2>
                <p className="text-bloghouse-gray-600">
                  Processando seu link de acesso
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-bloghouse-accent-600 to-bloghouse-primary-600 bg-clip-text text-transparent mb-2">
                  Acesso Autorizado!
                </h2>
                <p className="text-bloghouse-gray-600">
                  {message}
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-600 mb-2">
                  Erro de Autenticação
                </h2>
                <p className="text-bloghouse-gray-600 mb-6">
                  {message}
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white gradient-primary hover:gradient-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloghouse-primary-600 transition-all bloghouse-glow hover:bloghouse-glow-secondary"
                >
                  Voltar ao Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};