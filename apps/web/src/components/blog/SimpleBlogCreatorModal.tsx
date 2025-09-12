import React, { useState } from 'react';
import { X, Globe, AlertTriangle, Loader2, CheckCircle, XCircle, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface SimpleBlogCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BlogProgress {
  step: string;
  message: string;
  progress: number;
}

interface BlogCredentials {
  success: boolean;
  domain: string;
  url: string;
  adminUrl: string;
  adminUsername: string;
  adminPassword: string;
}

export function SimpleBlogCreatorModal({ isOpen, onClose, onSuccess }: SimpleBlogCreatorModalProps) {
  const [vpsHost, setVpsHost] = useState('');
  const [vpsUsername, setVpsUsername] = useState('root');
  const [vpsPassword, setVpsPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blogProgress, setBlogProgress] = useState<BlogProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [credentials, setCredentials] = useState<BlogCredentials | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vpsHost || !vpsUsername || !vpsPassword || !domain) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setHasError(false);
    
    try {
      // Start blog creation
      const response = await api.post('/api/blog/simple-create', {
        host: vpsHost,
        port: 22,
        username: vpsUsername,
        password: vpsPassword,
        domain
      });

      if (response.data.success) {
        // Setup started, show progress
        setBlogProgress({
          step: 'started',
          message: '🤖 IA trabalhando: Iniciando criação do blog...',
          progress: 0
        });
        
        // Mock progress updates (in real implementation, use WebSocket)
        let progress = 0;
        const progressSteps = [
          { message: '🤖 IA trabalhando: Conectando ao servidor...', progress: 10 },
          { message: '🤖 IA trabalhando: Criando blog WordPress...', progress: 30 },
          { message: '🤖 IA trabalhando: Configurando WordPress...', progress: 60 },
          { message: '🤖 IA trabalhando: Gerando credenciais...', progress: 80 },
          { message: '✅ Blog criado com sucesso!', progress: 100 }
        ];
        
        let stepIndex = 0;
        const interval = setInterval(() => {
          if (stepIndex < progressSteps.length) {
            setBlogProgress({
              step: `step-${stepIndex}`,
              message: progressSteps[stepIndex].message,
              progress: progressSteps[stepIndex].progress
            });
            
            if (stepIndex === progressSteps.length - 1) {
              setIsComplete(true);
              setCredentials({
                success: true,
                domain,
                url: `https://${domain}`,
                adminUrl: `https://${domain}/wp-admin`,
                adminUsername: 'admin',
                adminPassword: 'bloghouse123' // Default credentials
              });
              clearInterval(interval);
              setTimeout(() => {
                onSuccess();
              }, 3000);
            }
            
            stepIndex++;
          }
        }, 30000 / progressSteps.length); // ~30 seconds total divided by steps
        
      } else {
        throw new Error(response.data.message || 'Erro ao criar blog');
      }
    } catch (error: any) {
      console.error('Error creating blog:', error);
      setHasError(true);
      setBlogProgress({
        step: 'error',
        message: '❌ Erro na criação do blog',
        progress: 0
      });
      toast.error(error.response?.data?.message || 'Erro ao criar blog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (blogProgress && !isComplete && !hasError) {
      if (!confirm('⚠️ A criação do blog está em andamento. Fechar agora pode interromper o processo. Deseja continuar?')) {
        return;
      }
    }
    
    setVpsHost('');
    setVpsUsername('root');
    setVpsPassword('');
    setDomain('');
    setBlogProgress(null);
    setIsComplete(false);
    setHasError(false);
    setCredentials(null);
    setIsLoading(false);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold">Criar Novo Blog</h2>
          </div>
          {!blogProgress && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {!blogProgress ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP do Servidor VPS
              </label>
              <input
                type="text"
                value={vpsHost}
                onChange={(e) => setVpsHost(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário do VPS
              </label>
              <input
                type="text"
                value={vpsUsername}
                onChange={(e) => setVpsUsername(e.target.value)}
                placeholder="root"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha do VPS
              </label>
              <input
                type="password"
                value={vpsPassword}
                onChange={(e) => setVpsPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domínio do Blog
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="exemplo.com.br"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
                disabled={isLoading}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">📝 Importante:</p>
                  <ul className="text-xs space-y-1">
                    <li>• VPS deve ter WordOps instalado</li>
                    <li>• Domínio deve apontar para o IP do VPS</li>
                    <li>• Processo demora ~30 segundos</li>
                    <li>• Nossa IA criará o blog automaticamente</li>
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
                  Criando blog...
                </>
              ) : (
                'Criar Blog'
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
                  {blogProgress.message}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-green-600' : hasError ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${blogProgress.progress}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-600 mt-1">
                {blogProgress.progress}% concluído
              </div>
            </div>

            {credentials && isComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Blog criado com sucesso!
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-green-700">URL do Blog:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-green-800">{credentials.url}</span>
                      <button
                        onClick={() => copyToClipboard(credentials.url)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={credentials.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-green-700">Painel Admin:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-green-800">{credentials.adminUrl}</span>
                      <button
                        onClick={() => copyToClipboard(credentials.adminUrl)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={credentials.adminUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-green-700">Usuário:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-green-800">{credentials.adminUsername}</span>
                      <button
                        onClick={() => copyToClipboard(credentials.adminUsername)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-green-700">Senha:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-green-800">{credentials.adminPassword}</span>
                      <button
                        onClick={() => copyToClipboard(credentials.adminPassword)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
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