import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  Loader2,
  Terminal,
  Eye,
  EyeOff,
  Copy,
  ExternalLink
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import type { WordPressTemplate } from '../../types/installer';

interface InstallationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  duration?: number;
  logs?: string[];
}

interface InstallationProgressProps {
  selectedTemplate: WordPressTemplate;
  installationJob: any;
  installationCommand: string;
}

export const InstallationProgress: React.FC<InstallationProgressProps> = ({
  selectedTemplate,
  installationJob,
  installationCommand
}) => {
  const [steps, setSteps] = useState<InstallationStep[]>([
    {
      id: 'preflight',
      title: 'Verificações Pré-instalação',
      description: 'Verificando requisitos do sistema e conectividade',
      status: 'running',
      progress: 0,
      logs: []
    },
    {
      id: 'wordops',
      title: 'Instalando WordOps',
      description: 'Instalando stack LEMP otimizada',
      status: 'pending',
      logs: []
    },
    {
      id: 'wordpress',
      title: 'Configurando WordPress',
      description: 'Criando banco de dados e instalando WordPress',
      status: 'pending',
      logs: []
    },
    {
      id: 'template',
      title: 'Aplicando Template',
      description: 'Restaurando template e configurações SEO',
      status: 'pending',
      logs: []
    },
    {
      id: 'ssl',
      title: 'Configurando SSL',
      description: 'Solicitando certificado Let\'s Encrypt',
      status: 'pending',
      logs: []
    },
    {
      id: 'optimization',
      title: 'Otimizações Finais',
      description: 'Cache, compressão e ajustes de performance',
      status: 'pending',
      logs: []
    },
    {
      id: 'verification',
      title: 'Verificação Final',
      description: 'Testando funcionamento do site',
      status: 'pending',
      logs: []
    }
  ]);

  const [showLogs, setShowLogs] = useState(true);
  const [currentLogs, setCurrentLogs] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(300); // 5 minutes
  const [elapsedTime, setElapsedTime] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [installationStatus, setInstallationStatus] = useState<'starting' | 'running' | 'completed' | 'failed'>('starting');

  // WebSocket connection for real-time progress updates
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      withCredentials: true
    });

    setSocket(newSocket);

    // Join user room to receive installation updates
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket for installation updates');
    });

    // Listen for installation events
    newSocket.on('installation:started', (data) => {
      console.log('Installation started:', data);
      setInstallationStatus('running');
      addLogEntry(`🚀 Installation started for ${data.templateId}`);
    });

    newSocket.on('installation:progress', (data) => {
      console.log('Installation progress:', data);
      updateStepProgress(data.step, data.message, data.progress);
      addLogEntry(`[${data.step.toUpperCase()}] ${data.message}`);
    });

    newSocket.on('installation:completed', (data) => {
      console.log('Installation completed:', data);
      setInstallationStatus('completed');
      setOverallProgress(100);
      addLogEntry(`✅ Installation completed successfully!`);
      if (data.siteUrl) {
        addLogEntry(`🌐 Your site is now available at: ${data.siteUrl}`);
      }
    });

    newSocket.on('installation:failed', (data) => {
      console.log('Installation failed:', data);
      setInstallationStatus('failed');
      addLogEntry(`❌ Installation failed: ${data.message}`);
      markStepAsError(data.step);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addLogEntry = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setCurrentLogs(prev => [...prev, logEntry]);
  };

  const updateStepProgress = (stepId: string, message: string, progress: number) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          status: progress >= 100 ? 'completed' : 'running' as const,
          progress
        };
      }
      return step;
    }));

    // Update overall progress based on completed steps
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1) {
      const baseProgress = (stepIndex / steps.length) * 100;
      const stepProgress = (progress / 100) * (100 / steps.length);
      setOverallProgress(baseProgress + stepProgress);
    }
  };

  const markStepAsError = (stepId: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status: 'error' as const }
        : step
    ));
  };


  const getStepIcon = (step: InstallationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-coral animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(currentLogs.join('\\n'));
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Instalação em Progresso</h2>
        <p className="text-gray-600">Aguarde enquanto seu site WordPress é configurado automaticamente</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Progresso Geral</h3>
            <p className="text-sm text-gray-600">
              Status: {
                installationStatus === 'starting' ? 'Iniciando instalação...' :
                installationStatus === 'running' ? 'Instalação em progresso' :
                installationStatus === 'completed' ? 'Instalação concluída!' :
                'Erro na instalação'
              } | Tempo decorrido: {formatTime(elapsedTime)}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              installationStatus === 'completed' ? 'text-green-600' :
              installationStatus === 'failed' ? 'text-red-600' :
              'text-coral'
            }`}>
              {Math.round(overallProgress)}%
            </div>
            <div className="text-xs text-gray-500">
              {installationStatus === 'completed' ? '✅ Sucesso' :
               installationStatus === 'failed' ? '❌ Erro' :
               installationStatus === 'running' ? '⏳ Em progresso' :
               '🚀 Iniciando'}
            </div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              installationStatus === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600' :
              installationStatus === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-600' :
              'bg-gradient-to-r from-coral to-coral-dark'
            }`}
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Installation Steps */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Etapas de Instalação</h3>
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  step.status === 'completed' 
                    ? 'border-green-200 bg-green-50'
                    : step.status === 'running'
                    ? 'border-coral bg-coral/5'
                    : step.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getStepIcon(step)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                    
                    {step.status === 'running' && step.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progresso</span>
                          <span>{Math.round(step.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-coral h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Logs da Instalação
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyLogs}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                title="Copiar logs"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                title={showLogs ? "Ocultar logs" : "Mostrar logs"}
              >
                {showLogs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showLogs && (
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {currentLogs.map((log, index) => (
                  <div key={index} className="text-green-400">
                    {log}
                  </div>
                ))}
                {currentLogs.length === 0 && (
                  <div className="text-gray-500 italic">Aguardando logs...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Installation Command Reference */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Comando executado:</span>
          <button
            onClick={() => navigator.clipboard.writeText(installationCommand)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Copiar
          </button>
        </div>
        <code className="text-xs text-gray-600 font-mono break-all">
          {installationCommand}
        </code>
      </div>
    </div>
  );
};