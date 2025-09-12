import React, { useState, useEffect } from 'react';
import { X, Server, AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { io, Socket } from 'socket.io-client';

interface SimpleVpsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SetupProgress {
  step: string;
  message: string;
  progress: number;
}

export function SimpleVpsConfigModal({ isOpen, onClose, onSuccess }: SimpleVpsConfigModalProps) {
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Helper function to get cookie value
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // Set up WebSocket connection
  useEffect(() => {
    if (isOpen) {
      // Get authentication token from cookie
      const token = getCookie('access_token');
      
      const socketConnection = io('http://localhost:3001', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        auth: {
          token: token
        }
      });

      socketConnection.on('connect', () => {
        console.log('Socket connected for VPS setup');
      });

      // Listen for VPS setup events
      socketConnection.on('simpleVps:connected', (data) => {
        console.log('VPS connected:', data);
        setSetupProgress({
          step: 'connected',
          message: '🤖 IA trabalhando: Conectado ao servidor...',
          progress: 10
        });
      });

      socketConnection.on('simpleVps:progress', (data) => {
        console.log('VPS progress:', data);
        setSetupProgress({
          step: data.step,
          message: data.message,
          progress: data.progress
        });
      });

      socketConnection.on('simpleVps:setupComplete', (data) => {
        console.log('VPS setup complete:', data);
        setSetupProgress({
          step: 'completed',
          message: '✅ Servidor configurado com sucesso!',
          progress: 100
        });
        setIsComplete(true);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      });

      socketConnection.on('simpleVps:setupError', (data) => {
        console.log('VPS setup error:', data);
        setHasError(true);
        setSetupProgress({
          step: 'error',
          message: '❌ Erro na configuração do servidor',
          progress: 0
        });
        toast.error(`Erro: ${data.error}`);
      });

      setSocket(socketConnection);

      return () => {
        socketConnection.disconnect();
      };
    }
  }, [isOpen, onSuccess]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!host || !username || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setHasError(false);
    
    try {
      // Start VPS setup
      const response = await api.post('/api/vps/simple-setup', {
        host,
        port: 22,
        username,
        password
      });

      if (response.data.success) {
        // Setup started, show initial progress
        setSetupProgress({
          step: 'started',
          message: '🤖 IA trabalhando: Iniciando configuração...',
          progress: 5
        });
        
        // Real progress updates will come from WebSocket events
        toast.success('Configuração iniciada! Aguarde...');
        
      } else {
        throw new Error(response.data.message || 'Erro ao configurar VPS');
      }
    } catch (error: any) {
      console.error('Error setting up VPS:', error);
      setHasError(true);
      setSetupProgress({
        step: 'error',
        message: '❌ Erro na configuração do servidor',
        progress: 0
      });
      toast.error(error.response?.data?.message || 'Erro ao configurar VPS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (setupProgress && !isComplete && !hasError) {
      if (!confirm('⚠️ A configuração está em andamento. Fechar agora pode interromper o processo. Deseja continuar?')) {
        return;
      }
    }
    
    setHost('');
    setUsername('root');
    setPassword('');
    setSetupProgress(null);
    setIsComplete(false);
    setHasError(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold">Configurar Servidor</h2>
          </div>
          {(!setupProgress || (isComplete || hasError)) && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {!setupProgress ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP do Servidor
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="root"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">⚠️ Importante:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Use apenas VPS Ubuntu 22.04 limpo</li>
                    <li>• Processo demora ~15 minutos</li>
                    <li>• NÃO feche esta janela durante a instalação</li>
                    <li>• Nossa IA fará toda a configuração automaticamente</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando configuração...
                </>
              ) : (
                'Configurar Servidor'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {isComplete ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : hasError ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <span className="font-medium text-sm">
                  {setupProgress.message}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-green-600' : hasError ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${setupProgress.progress}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-600 mt-1">
                {setupProgress.progress}% concluído
                {!isComplete && !hasError && ' - não feche esta janela'}
              </div>
            </div>

            {!isComplete && !hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800 font-medium">
                    ⚠️ A instalação leva de 15 a 20 minutos, não feche esta janela
                  </span>
                </div>
              </div>
            )}

            {(isComplete || hasError) && (
              <button
                onClick={handleClose}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700"
              >
                Fechar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}