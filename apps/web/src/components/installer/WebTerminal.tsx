import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import {
  X,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Copy
} from 'lucide-react';
import { VPSCredentials } from './VPSConnectionModal';

interface WebTerminalProps {
  credentials: VPSCredentials;
  templateId: string;
  templateName: string;
  domain: string;
  onClose: () => void;
}

interface InstallationPhase {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export const WebTerminal: React.FC<WebTerminalProps> = ({
  credentials,
  templateId,
  templateName,
  domain,
  onClose
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [phases, setPhases] = useState<InstallationPhase[]>([
    { id: 1, name: 'Preparação do Sistema', status: 'pending' },
    { id: 2, name: 'Instalando WordOps', status: 'pending' },
    { id: 3, name: 'Instalando Web Stack', status: 'pending' },
    { id: 4, name: 'Criando Site WordPress', status: 'pending' },
    { id: 5, name: 'Aplicando Template', status: 'pending' },
    { id: 6, name: 'Verificação Final', status: 'pending' }
  ]);

  useEffect(() => {
    initializeTerminal();
    connectToVPS();

    return () => {
      cleanup();
    };
  }, []);

  const initializeTerminal = () => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#e4e4e4',
        cursor: '#e4e4e4',
        black: '#000000',
        red: '#e10600',
        green: '#00aa00',
        yellow: '#ffff00',
        blue: '#0066ff',
        magenta: '#aa00aa',
        cyan: '#00aaaa',
        white: '#aaaaaa',
        brightBlack: '#555555',
        brightRed: '#ff5555',
        brightGreen: '#55ff55',
        brightYellow: '#ffff55',
        brightBlue: '#5555ff',
        brightMagenta: '#ff55ff',
        brightCyan: '#55ffff',
        brightWhite: '#ffffff'
      },
      scrollback: 10000,
      convertEol: true
    });

    // Add addons
    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    
    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);
    
    terminal.open(terminalRef.current);
    fit.fit();

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    // Handle terminal resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    // Welcome message
    terminal.writeln('🚀 Tatame WordPress Installer');
    terminal.writeln('================================');
    terminal.writeln('');
    terminal.writeln(`Template: ${templateName}`);
    terminal.writeln(`Domain: ${domain}`);
    terminal.writeln(`VPS: ${credentials.host}`);
    terminal.writeln('');
    terminal.writeln('Conectando ao servidor...');
    terminal.writeln('');
  };

  const connectToVPS = async () => {
    try {
      // First, create SSH session via REST API
      const response = await fetch('/api/terminal/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to connect');
      }

      setSessionId(data.sessionId);
      
      // Connect to WebSocket
      const socket = io('/terminal', {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('WebSocket connected');
        socket.emit('terminal:create', { sessionId: data.sessionId });
      });

      socket.on('terminal:ready', () => {
        setIsConnecting(false);
        if (terminalInstance.current) {
          terminalInstance.current.writeln('✅ Conectado ao servidor!');
          terminalInstance.current.writeln('');
          
          // Start installation automatically
          startInstallation(data.sessionId);
        }
      });

      socket.on('terminal:data', (data: string) => {
        if (terminalInstance.current) {
          terminalInstance.current.write(data);
        }
      });

      socket.on('terminal:close', () => {
        if (terminalInstance.current) {
          terminalInstance.current.writeln('');
          terminalInstance.current.writeln('❌ Conexão encerrada');
        }
      });

      socket.on('terminal:error', (data: { message: string }) => {
        if (terminalInstance.current) {
          terminalInstance.current.writeln(`❌ Erro: ${data.message}`);
        }
        setIsConnecting(false);
      });

      // Handle installation progress
      socket.on('installation:progress', (data: { phase: number; message: string }) => {
        updatePhaseStatus(data.phase, 'running');
        if (data.phase > 1) {
          updatePhaseStatus(data.phase - 1, 'completed');
        }
      });

      socket.on('installation:complete', () => {
        setInstallationStatus('completed');
        updatePhaseStatus(6, 'completed');
        if (terminalInstance.current) {
          terminalInstance.current.writeln('');
          terminalInstance.current.writeln('🎉 Instalação concluída com sucesso!');
          terminalInstance.current.writeln(`📌 Acesse seu site em: https://${domain}`);
          terminalInstance.current.writeln('📌 Admin: https://' + domain + '/wp-admin');
          terminalInstance.current.writeln('📌 Usuário: admin');
          terminalInstance.current.writeln('📌 Senha: admin');
        }
      });

      socket.on('installation:error', (error: string) => {
        setInstallationStatus('error');
        if (terminalInstance.current) {
          terminalInstance.current.writeln(`❌ Erro na instalação: ${error}`);
        }
      });

      // Handle terminal input
      if (terminalInstance.current) {
        terminalInstance.current.onData((data) => {
          socket.emit('terminal:input', data);
        });

        terminalInstance.current.onResize(({ cols, rows }) => {
          socket.emit('terminal:resize', { cols, rows });
        });
      }

    } catch (error: any) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`❌ Erro ao conectar: ${error.message}`);
      }
    }
  };

  const startInstallation = async (sessionId: string) => {
    try {
      setInstallationStatus('running');
      
      const response = await fetch('/api/terminal/install', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          templateId,
          domain
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to start installation');
      }

      if (terminalInstance.current) {
        terminalInstance.current.writeln('🚀 Iniciando instalação do WordPress...');
        terminalInstance.current.writeln('Este processo pode levar de 5 a 10 minutos.');
        terminalInstance.current.writeln('');
      }
    } catch (error: any) {
      console.error('Installation error:', error);
      setInstallationStatus('error');
      if (terminalInstance.current) {
        terminalInstance.current.writeln(`❌ Erro ao iniciar instalação: ${error.message}`);
      }
    }
  };

  const updatePhaseStatus = (phaseId: number, status: 'pending' | 'running' | 'completed' | 'error') => {
    setPhases(prev => prev.map(phase => 
      phase.id === phaseId ? { ...phase, status } : phase
    ));
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (terminalInstance.current) {
      terminalInstance.current.dispose();
    }
    if (sessionId) {
      // Close SSH session
      fetch(`/api/terminal/disconnect/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).catch(console.error);
    }
  };

  const copyTerminalContent = () => {
    if (terminalInstance.current) {
      const selection = terminalInstance.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const downloadLogs = () => {
    if (terminalInstance.current) {
      const buffer = terminalInstance.current.buffer.active;
      let content = '';
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true) + '\n';
        }
      }
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `installation-log-${domain}-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-coral animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className={`fixed ${isFullscreen ? 'inset-0' : 'inset-4 lg:inset-8'} bg-black/50 backdrop-blur-sm flex items-center justify-center z-50`}>
      <div className={`bg-gray-900 rounded-2xl shadow-2xl ${isFullscreen ? 'w-full h-full' : 'max-w-7xl w-full h-[85vh]'} flex flex-col`}>
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TerminalIcon className="w-6 h-6 text-green-500" />
              <div>
                <h3 className="text-white font-semibold">
                  Terminal VPS - {credentials.host}
                </h3>
                <p className="text-gray-400 text-sm">
                  Instalando WordPress com template {templateName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyTerminalContent}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Copiar seleção"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={downloadLogs}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Baixar logs"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Terminal */}
          <div className="flex-1 p-4">
            <div 
              ref={terminalRef} 
              className="h-full w-full rounded-lg bg-black"
              style={{ padding: '8px' }}
            />
          </div>

          {/* Progress Sidebar */}
          <div className="w-80 border-l border-gray-800 p-4 overflow-y-auto">
            <h4 className="text-white font-semibold mb-4">Progresso da Instalação</h4>
            
            {/* Status */}
            <div className={`rounded-lg p-3 mb-4 ${
              installationStatus === 'completed' ? 'bg-green-900/30 border border-green-700' :
              installationStatus === 'error' ? 'bg-red-900/30 border border-red-700' :
              installationStatus === 'running' ? 'bg-blue-900/30 border border-blue-700' :
              'bg-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                {installationStatus === 'completed' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-400">Instalação Concluída!</span>
                  </>
                )}
                {installationStatus === 'error' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-400">Erro na Instalação</span>
                  </>
                )}
                {installationStatus === 'running' && (
                  <>
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-blue-400">Instalando...</span>
                  </>
                )}
                {installationStatus === 'idle' && isConnecting && (
                  <>
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                    <span className="text-gray-400">Conectando...</span>
                  </>
                )}
              </div>
            </div>

            {/* Phases */}
            <div className="space-y-3">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className={`rounded-lg p-3 border transition-all ${
                    phase.status === 'completed' ? 'bg-green-900/20 border-green-700' :
                    phase.status === 'running' ? 'bg-coral/10 border-coral' :
                    phase.status === 'error' ? 'bg-red-900/20 border-red-700' :
                    'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getPhaseIcon(phase.status)}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        phase.status === 'completed' ? 'text-green-400' :
                        phase.status === 'running' ? 'text-coral' :
                        phase.status === 'error' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        Fase {phase.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {phase.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Credentials (shown after completion) */}
            {installationStatus === 'completed' && (
              <div className="mt-6 bg-green-900/20 border border-green-700 rounded-lg p-4">
                <h5 className="text-green-400 font-semibold mb-3">Credenciais de Acesso</h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Site:</span>
                    <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="block text-green-400 hover:underline">
                      https://{domain}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-400">Admin:</span>
                    <a href={`https://${domain}/wp-admin`} target="_blank" rel="noopener noreferrer" className="block text-green-400 hover:underline">
                      https://{domain}/wp-admin
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-400">Usuário:</span>
                    <span className="block text-white font-mono">admin</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Senha:</span>
                    <span className="block text-white font-mono">admin</span>
                  </div>
                </div>
                <p className="text-amber-400 text-xs mt-3">
                  ⚠️ Altere a senha após o primeiro acesso
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};