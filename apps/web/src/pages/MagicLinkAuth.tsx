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
        const response = await api.get(`/auth/magic-link?token=${token}`);
        
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-coral to-coral-dark rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">E</span>
          </div>
        </div>
        
        <div className="bg-white py-8 px-4 shadow-soft sm:rounded-xl sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 text-coral mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Autenticando...
                </h2>
                <p className="text-slate-600">
                  Processando seu link de acesso
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Acesso Autorizado!
                </h2>
                <p className="text-slate-600">
                  {message}
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Erro de Autenticação
                </h2>
                <p className="text-slate-600 mb-6">
                  {message}
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-coral to-rose-400 hover:from-coral-dark hover:to-rose-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral transition-all"
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