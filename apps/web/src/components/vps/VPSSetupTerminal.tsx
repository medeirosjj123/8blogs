import React, { useEffect, useState } from 'react';
import { Terminal, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface VPSSetupTerminalProps {
  isVisible: boolean;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface SetupStep {
  step: string;
  name: string;
  progress: number;
}

interface VPSEvent {
  type: 'connected' | 'stepStart' | 'stepComplete' | 'stepError' | 'output' | 'setupComplete' | 'setupError';
  data: any;
}

export const VPSSetupTerminal: React.FC<VPSSetupTerminalProps> = ({
  isVisible,
  onComplete,
  onError
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<SetupStep | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    // Initialize WebSocket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Join user's room for VPS setup events  
    // The server will determine the user ID from the JWT token
    // No need to explicitly join a room - the server handles this automatically

    // Setup event listeners
    newSocket.on('connect', () => {
      setIsConnected(true);
      addOutput('✅ Conectado ao servidor');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      addOutput('❌ Desconectado do servidor');
    });

    newSocket.on('vps:connected', (data) => {
      addOutput(`🔗 Conectado ao VPS: ${data.host}`);
    });

    newSocket.on('vps:stepStart', (data: SetupStep) => {
      setCurrentStep(data);
      addOutput(`▶️ ${data.name}`);
    });

    newSocket.on('vps:stepComplete', (data: SetupStep) => {
      setCurrentStep(data);
      addOutput(`✅ ${data.name} - Concluído`);
    });

    newSocket.on('vps:stepError', (data: { step: string; name: string; error: string }) => {
      setHasError(true);
      setErrorMessage(data.error);
      addOutput(`❌ ${data.name} - Erro: ${data.error}`);
      onError?.(data.error);
    });

    newSocket.on('vps:output', (data: { output: string }) => {
      addOutput(data.output);
    });

    newSocket.on('vps:setupComplete', (data) => {
      setIsComplete(true);
      addOutput(`🎉 Configuração do VPS concluída com sucesso!`);
      addOutput(`📍 VPS ID: ${data.vpsId}`);
      addOutput(`🌐 Host: ${data.host}`);
      onComplete?.();
    });

    newSocket.on('vps:setupError', (data: { error: string; host: string }) => {
      setHasError(true);
      setErrorMessage(data.error);
      addOutput(`💥 Erro na configuração do VPS: ${data.error}`);
      onError?.(data.error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [isVisible, onComplete, onError]);

  const addOutput = (text: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setOutput(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 text-green-400 rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">VPS Setup Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Conectado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-400">Desconectado</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Step Progress */}
      {currentStep && !isComplete && !hasError && (
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">{currentStep.name}</span>
            <span className="text-xs text-gray-400">{currentStep.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentStep.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status indicators */}
      {(isComplete || hasError) && (
        <div className={`px-4 py-3 border-b border-gray-700 ${
          isComplete ? 'bg-green-900/20' : 'bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Setup concluído com sucesso!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">Erro na configuração</span>
              </>
            )}
          </div>
          {hasError && errorMessage && (
            <p className="text-sm text-red-300 mt-1">{errorMessage}</p>
          )}
        </div>
      )}

      {/* Terminal Output */}
      <div className="h-96 overflow-y-auto p-4 font-mono text-sm">
        {output.length === 0 && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Aguardando início da configuração...</span>
          </div>
        )}
        
        {output.map((line, index) => (
          <div key={index} className="mb-1 whitespace-pre-wrap">
            {line}
          </div>
        ))}
        
        {/* Cursor */}
        {!isComplete && !hasError && (
          <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
};