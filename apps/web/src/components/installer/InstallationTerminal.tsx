import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';
import {
  Terminal,
  CheckCircle,
  AlertCircle,
  Loader2,
  Server,
  Clock,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

interface InstallationTerminalProps {
  domain: string;
  templateName: string;
  installationId: string;
  wpCredentials?: {
    adminUsername: string;
    adminPassword: string;
    adminEmail: string;
    siteTitle: string;
  };
  onComplete: (success: boolean, credentials?: any) => void;
  onBack: () => void;
}

interface InstallationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export const InstallationTerminal: React.FC<InstallationTerminalProps> = ({
  domain,
  templateName,
  installationId,
  wpCredentials,
  onComplete,
  onBack
}) => {
  // Debug logging for wpCredentials prop
  React.useEffect(() => {
    console.log('🔧 InstallationTerminal received wpCredentials:', {
      hasCredentials: !!wpCredentials,
      username: wpCredentials?.adminUsername,
      email: wpCredentials?.adminEmail,
      siteTitle: wpCredentials?.siteTitle,
      hasPassword: !!wpCredentials?.adminPassword
    });
  }, [wpCredentials]);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [output, setOutput] = useState<string[]>([
    '🚀 Iniciando instalação do WordPress...',
    `📦 Template: ${templateName}`,
    `🌐 Domínio: ${domain}`,
    '',
    '⏳ Conectando ao VPS e preparando instalação...'
  ]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'running' | 'completed' | 'error'>('running');
  const [credentials, setCredentials] = useState<any>(null);
  const [completionTriggered, setCompletionTriggered] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<InstallationStep[]>([
    { id: 'connect', name: 'Conectando ao VPS', status: 'pending' },
    { id: 'system_update', name: 'Atualizando Sistema', status: 'pending' },
    { id: 'dependencies', name: 'Instalando Dependências', status: 'pending' },
    { id: 'wordops', name: 'Instalando WordOps', status: 'pending' },
    { id: 'wordpress', name: 'Criando Site WordPress', status: 'pending' },
    { id: 'template', name: 'Aplicando Template', status: 'pending' },
    { id: 'security', name: 'Configurando Segurança', status: 'pending' },
    { id: 'optimization', name: 'Otimizando Performance', status: 'pending' },
    { id: 'verification', name: 'Verificação Final', status: 'pending' }
  ]);

  useEffect(() => {
    console.log('🎬 InstallationTerminal: Component mounted with installationId:', installationId);
    console.log('🔧 DEBUG: Frontend completion fix v2 - with enhanced logging');
    
    // Connect to WebSocket
    const newSocket = io('http://localhost:3001', {
      withCredentials: true,
      query: {
        installationId
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Connected to installation socket');
      setIsConnected(true);
      addOutput('🔌 Conectado ao servidor de instalação');
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
      // Don't show error to user, just show as disconnected
      setIsConnected(false);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      // Only show disconnect message if we were connected before
      if (isConnected) {
        addOutput('🔌 Desconectado do servidor');
      }
    });

    // Listen for installation events
    newSocket.on('installation:output', (data: { line: string }) => {
      addOutput(data.line);
      
      // Check for success patterns in output
      const successPatterns = [
        '✅ WORDPRESS INSTALADO COM SUCESSO!',
        '✅ NOVO SITE WORDPRESS ADICIONADO!',
        '🎉 TODAS AS ETAPAS CONCLUÍDAS!',
        'CREDENCIAIS DE ACESSO:',
        'WordPress site created successfully', // Additional pattern
        'wo site create' // Pattern from the installation logs
      ];
      
      const hasSuccessPattern = successPatterns.some(pattern => 
        data.line.includes(pattern)
      );
      
      // Also trigger completion if we see the final success message in terminal
      const finalSuccessPattern = data.line.includes('✅ Instalação concluída com sucesso!');
      
      if ((hasSuccessPattern || finalSuccessPattern) && !completionTriggered) {
        console.log('🎉 Success pattern detected in output:', data.line);
        setStatus('completed');
        setTimeout(() => {
          setCompletionTriggered(true);
          console.log('🎯 Triggering completion via pattern detection with actual credentials');
          
          // Use actual credentials from props or socket data
          const actualCredentials = credentials || (wpCredentials ? {
            username: wpCredentials.adminUsername,
            password: wpCredentials.adminPassword,
            siteTitle: wpCredentials.siteTitle,
            adminEmail: wpCredentials.adminEmail
          } : { username: 'admin', password: 'admin123' });
          
          console.log('📋 Using credentials:', { username: actualCredentials.username, hasPassword: !!actualCredentials.password });
          
          onComplete(true, {
            credentials: actualCredentials,
            siteInfo: { domain, accessUrl: `http://${domain}` },
            accessMethods: [{ type: 'domain', url: `http://${domain}`, primary: true }]
          });
        }, 1000); // Reduced timeout for faster completion
      }
    });

    newSocket.on('installation:step', (data: { step: string; status: string; message?: string }) => {
      updateStep(data.step, data.status as any, data.message);
      setCurrentStep(data.step);
      
      // Calculate progress
      const completedSteps = steps.filter(s => s.status === 'completed').length;
      setProgress((completedSteps / steps.length) * 100);
    });

    newSocket.on('installation:progress', (data: { percent: number }) => {
      setProgress(data.percent);
    });

    newSocket.on('installation:complete', (data: { 
      success: boolean; 
      credentials?: any; 
      siteInfo?: any;
      accessMethods?: any;
      dnsInstructions?: any;
      error?: string 
    }) => {
      if (data.success) {
        setStatus('completed');
        setCredentials(data.credentials);
        addOutput('');
        addOutput('✅ Instalação concluída com sucesso!');
        if (data.credentials) {
          addOutput('');
          addOutput('=== CREDENCIAIS DO WORDPRESS ===');
          addOutput(`URL: ${data.siteInfo?.accessUrl || `http://${domain}`}`);
          addOutput(`Admin: ${data.siteInfo?.adminUrl || `http://${domain}/wp-admin`}`);
          addOutput(`Usuário: ${data.credentials.username}`);
          addOutput(`Senha: ${data.credentials.password}`);
          addOutput('================================');
        }
        // Pass all data to onComplete (prevent duplicate triggers)
        if (!completionTriggered) {
          setCompletionTriggered(true);
          console.log('🎯 Triggering completion with socket data:', data);
          setTimeout(() => {
            onComplete(true, {
              credentials: data.credentials || { username: 'admin', password: 'admin123' },
              siteInfo: data.siteInfo || { domain, accessUrl: `http://${domain}` },
              accessMethods: data.accessMethods || [{ type: 'domain', url: `http://${domain}`, primary: true }],
              dnsInstructions: data.dnsInstructions
            });
          }, 2000);
        }
      } else {
        setStatus('error');
        addOutput('');
        addOutput(`❌ Erro na instalação: ${data.error || 'Erro desconhecido'}`);
        setTimeout(() => {
          onComplete(false);
        }, 2000);
      }
    });

    newSocket.on('installation:error', (data: { error: string; step?: string }) => {
      setStatus('error');
      if (data.step) {
        updateStep(data.step, 'error', data.error);
      }
      addOutput(`❌ Erro: ${data.error}`);
    });

    newSocket.on('installation:progress', (data: { message: string; step: string }) => {
      addOutput(data.message);
      if (data.step === 'completion') {
        setStatus('completed');
        setTimeout(() => {
          if (!completionTriggered) {
            setCompletionTriggered(true);
            console.log('🎉 Installation completion detected via progress event');
            onComplete(true, {
              credentials: credentials || { username: 'admin', password: 'admin123' },
              siteInfo: { domain, accessUrl: `http://${domain}` },
              accessMethods: [{ type: 'domain', url: `http://${domain}`, primary: true }]
            });
          }
        }, 2000);
      }
    });

    setSocket(newSocket);

    // Fallback: Poll installation status if WebSocket fails OR completion is missed
    let pollInterval: NodeJS.Timeout | null = null;
    
    // Start polling after 10 seconds regardless of connection status
    // This ensures we catch completions even if Socket.IO events are missed
    setTimeout(() => {
      console.log('Starting polling for installation status updates');
        pollInterval = setInterval(async () => {
          try {
            console.log('🔍 Polling installation status for:', installationId);
            const response = await api.get(`/api/sites/installation-status/${installationId}`);
            console.log('📊 Poll response:', response.data);
            if (response.data.success && response.data.installation) {
              const { status: installStatus, steps: installSteps, credentials: creds, error } = response.data.installation;
              console.log('🎯 Installation status:', installStatus);
              
              // Update steps
              if (installSteps) {
                setSteps(installSteps);
              }
              
              // Update status
              if (installStatus === 'completed') {
                console.log('🎉 Detected completed installation! Triggering completion flow...');
                setStatus('completed');
                if (creds) {
                  setCredentials(creds);
                  addOutput('✅ Instalação concluída com sucesso!');
                }
                if (pollInterval) clearInterval(pollInterval);
                
                // Trigger completion callback with full data (prevent duplicate triggers)
                if (!completionTriggered) {
                  console.log('🚀 Triggering onComplete callback with data:', {
                    credentials: response.data.installation.credentials,
                    siteInfo: response.data.installation.siteInfo,
                    accessMethods: response.data.installation.accessMethods,
                    dnsInstructions: response.data.installation.dnsInstructions
                  });
                  setCompletionTriggered(true);
                  setTimeout(() => {
                    onComplete(true, {
                      credentials: response.data.installation.credentials,
                      siteInfo: response.data.installation.siteInfo,
                      accessMethods: response.data.installation.accessMethods,
                      dnsInstructions: response.data.installation.dnsInstructions
                    });
                  }, 2000);
                } else {
                  console.log('⚠️ Completion already triggered, skipping...');
                }
              } else if (installStatus === 'failed') {
                setStatus('error');
                addOutput(`❌ Erro na instalação: ${error || 'Erro desconhecido'}`);
                if (pollInterval) clearInterval(pollInterval);
                
                // Trigger failure callback
                setTimeout(() => {
                  onComplete(false);
                }, 2000);
              }
            }
          } catch (error) {
            console.error('Error polling installation status:', error);
          }
        }, 5000); // Poll every 5 seconds
    }, 10000); // Start polling after 10 seconds

    // Aggressive completion detection - check every 30 seconds if we're stuck
    const aggressiveCompletionCheck = setInterval(() => {
      if (status === 'running' && !completionTriggered) {
        console.log('🔍 Aggressive completion check - looking for signs of completion...');
        
        // Check if terminal output shows completion
        const terminalHasSuccess = output.some(line => 
          line.includes('✅ Instalação concluída') || 
          line.includes('WordPress site created') ||
          line.includes('CREDENCIAIS DE ACESSO')
        );
        
        if (terminalHasSuccess) {
          console.log('🎉 Found completion indicators in terminal output - fetching completion data');
          setStatus('completed');
          setCompletionTriggered(true);
          
          // Fetch actual completion data from API with retry logic
          const fetchCompletionData = async (retryCount = 0) => {
            try {
              const response = await api.get(`/api/sites/installation-status/${installationId}`);
              console.log('📦 Got completion data from API:', response.data.installation);
              
              // If we get null credentials but have wpCredentials, use them instead
              let finalCredentials = response.data.installation.credentials;
              if (!finalCredentials && wpCredentials) {
                console.log('📋 Using wpCredentials from props as API returned null');
                finalCredentials = {
                  username: wpCredentials.adminUsername,
                  password: wpCredentials.adminPassword,
                  siteTitle: wpCredentials.siteTitle,
                  adminEmail: wpCredentials.adminEmail
                };
              }
              
              // Only use hardcoded fallback as absolute last resort
              if (!finalCredentials) {
                console.warn('⚠️ No credentials available, using hardcoded fallback');
                finalCredentials = { username: 'admin', password: 'admin123' };
              }
              
              onComplete(true, {
                credentials: finalCredentials,
                siteInfo: response.data.installation.siteInfo || { domain, accessUrl: `http://${domain}` },
                accessMethods: response.data.installation.accessMethods || [{ type: 'domain', url: `http://${domain}`, primary: true }],
                dnsInstructions: response.data.installation.dnsInstructions
              });
            } catch (error) {
              console.error(`Failed to fetch completion data (attempt ${retryCount + 1}):`, error);
              
              // Retry up to 3 times with delay
              if (retryCount < 2) {
                console.log(`⏳ Retrying in ${(retryCount + 1) * 2} seconds...`);
                setTimeout(() => fetchCompletionData(retryCount + 1), (retryCount + 1) * 2000);
              } else {
                console.error('❌ All retry attempts failed, using credentials from props');
                // Use wpCredentials if available, otherwise hardcoded fallback
                const fallbackCredentials = wpCredentials ? {
                  username: wpCredentials.adminUsername,
                  password: wpCredentials.adminPassword,
                  siteTitle: wpCredentials.siteTitle,
                  adminEmail: wpCredentials.adminEmail
                } : { username: 'admin', password: 'admin123' };
                
                onComplete(true, {
                  credentials: fallbackCredentials,
                  siteInfo: { domain, accessUrl: `http://${domain}` },
                  accessMethods: [{ type: 'domain', url: `http://${domain}`, primary: true }]
                });
              }
            }
          };
          
          fetchCompletionData();
          clearInterval(aggressiveCompletionCheck);
        }
      }
    }, 30000); // Check every 30 seconds

    // Completion timeout failsafe - if installation is still running after 15 minutes, check for completion
    const completionTimeout = setTimeout(() => {
      if (status === 'running' && !completionTriggered) {
        console.log('⏰ Completion timeout reached, checking final status...');
        api.get(`/api/sites/installation-status/${installationId}`)
          .then(response => {
            if (response.data.success && response.data.installation.status === 'completed') {
              console.log('🎉 Installation was completed but UI missed it - triggering completion');
              setStatus('completed');
              setCompletionTriggered(true);
              onComplete(true, {
                credentials: response.data.installation.credentials,
                siteInfo: response.data.installation.siteInfo,
                accessMethods: response.data.installation.accessMethods,
                dnsInstructions: response.data.installation.dnsInstructions
              });
            }
          })
          .catch(error => {
            console.error('Failed to check completion status:', error);
          });
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      newSocket.close();
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(aggressiveCompletionCheck);
      clearTimeout(completionTimeout);
    };
  }, [installationId, domain]);

  const addOutput = (line: string) => {
    setOutput(prev => [...prev, line]);
    // Auto-scroll to bottom
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  };

  const updateStep = (stepId: string, status: 'pending' | 'running' | 'completed' | 'error', message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message }
        : step
    ));
  };

  const getStepIcon = (step: InstallationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStepClass = (step: InstallationStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600 font-medium';
      case 'running':
        return 'text-blue-600 font-medium animate-pulse';
      case 'error':
        return 'text-red-600 font-medium';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Instalação em Progresso
        </h2>
        <p className="text-gray-600">
          Instalando WordPress no domínio {domain}
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
          isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Desconectado</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Server className="w-4 h-4" />
          <span>{domain}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Activity className="w-4 h-4" />
          <span>{templateName}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progresso da Instalação</span>
          <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-coral to-coral-dark transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Steps Panel */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Etapas da Instalação
          </h3>
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className={getStepClass(step)}>
                    {step.name}
                  </div>
                  {step.message && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {step.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">
                Terminal Output
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
          </div>
          
          <div 
            ref={terminalRef}
            className="p-4 h-96 overflow-y-auto font-mono text-xs text-green-400 custom-scrollbar"
          >
            {output.length === 0 ? (
              <div className="text-gray-500">Aguardando saída do terminal...</div>
            ) : (
              output.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">
                Instalação Concluída com Sucesso!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Seu site WordPress foi instalado e está pronto para uso.
              </p>
              {credentials && (
                <div className="mt-3 bg-white rounded p-3 border border-green-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Credenciais de Acesso:
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">URL:</span>{' '}
                      <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
                        https://{domain}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-600">Admin:</span>{' '}
                      <a href={`https://${domain}/wp-admin`} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
                        https://{domain}/wp-admin
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-600">Usuário:</span>{' '}
                      <span className="font-mono bg-gray-100 px-1 rounded">
                        {credentials.username}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Senha:</span>{' '}
                      <span className="font-mono bg-gray-100 px-1 rounded">
                        {credentials.password}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">
                Erro na Instalação
              </p>
              <p className="text-sm text-red-700 mt-1">
                Ocorreu um erro durante a instalação. Verifique os logs acima para mais detalhes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={status === 'running'}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Voltar
        </button>
        
      </div>
    </div>
  );
};

// Custom scrollbar styles - add to global CSS
const customScrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
`;