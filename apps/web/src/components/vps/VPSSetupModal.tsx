import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  User,
  Key,
  Lock,
  Terminal,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import vpsService from '../../services/vpsService';
import type { VPSCredentials, VPSConfiguration } from '../../services/vpsService';
import { VPSSetupTerminal } from './VPSSetupTerminal';
import { useAuth } from '../../contexts/AuthContext';

interface VPSSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SetupStep = 'credentials' | 'testing' | 'confirm' | 'setup' | 'complete';

export const VPSSetupModal: React.FC<VPSSetupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>('credentials');
  
  // Credentials form state
  const [credentials, setCredentials] = useState<VPSCredentials>({
    host: '',
    port: 22,
    username: 'root',
    password: '',
    authMethod: 'password'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  
  // VPS configurations
  const [existingVPS, setExistingVPS] = useState<VPSConfiguration[]>([]);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExistingVPS();
      resetForm();
    }
  }, [isOpen]);

  const loadExistingVPS = async () => {
    try {
      const configurations = await vpsService.getVPSConfigurations();
      setExistingVPS(configurations);
    } catch (error) {
      console.error('Error loading VPS configurations:', error);
    }
  };

  const resetForm = () => {
    setCurrentStep('credentials');
    setCredentials({
      host: '',
      port: 22,
      username: 'root',
      password: '',
      authMethod: 'password'
    });
    setShowPassword(false);
    setIsTestingConnection(false);
    setConnectionStatus('idle');
    setError('');
    setIsSetupInProgress(false);
  };

  const handleInputChange = (field: keyof VPSCredentials, value: string | number) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setConnectionStatus('idle');
  };

  const testConnection = async () => {
    if (!credentials.host || !credentials.username) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (credentials.authMethod === 'password' && !credentials.password) {
      setError('Por favor, insira a senha');
      return;
    }

    if (credentials.authMethod === 'privateKey' && !credentials.privateKey) {
      setError('Por favor, insira a chave privada');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setError('');

    try {
      const result = await vpsService.testVPSConnection(credentials);

      if (result.success) {
        setConnectionStatus('success');
        setCurrentStep('testing');
        toast.success('Conexão estabelecida com sucesso!');
      } else {
        setConnectionStatus('error');
        setError(result.message || 'Falha na conexão');
        toast.error(result.message || 'Falha na conexão');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setError('Erro ao testar conexão. Tente novamente.');
      toast.error('Erro ao testar conexão');
      console.error('Connection test error:', err);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSetupConfirm = () => {
    setCurrentStep('confirm');
  };

  const startVPSSetup = async () => {
    // Get user email from authentication context
    if (!user?.email) {
      toast.error('Usuário não autenticado ou email não disponível');
      return;
    }

    setIsSetupInProgress(true);
    setCurrentStep('setup');

    try {
      const result = await vpsService.setupVPS({
        ...credentials,
        userEmail: user.email
      });

      if (result.success) {
        toast.success('Setup do VPS iniciado! Acompanhe o progresso no terminal.');
      } else {
        throw new Error(result.message || 'Erro ao iniciar setup');
      }
    } catch (error: any) {
      console.error('VPS setup error:', error);
      toast.error(error.message || 'Erro ao iniciar configuração do VPS');
      setCurrentStep('confirm');
      setIsSetupInProgress(false);
    }
  };

  const handleSetupComplete = () => {
    setCurrentStep('complete');
    setIsSetupInProgress(false);
    toast.success('VPS configurado com sucesso!');
    loadExistingVPS(); // Reload VPS list
  };

  const handleSetupError = (error: string) => {
    setCurrentStep('confirm');
    setIsSetupInProgress(false);
    setError(error);
    toast.error('Erro na configuração do VPS');
  };

  const handleClose = () => {
    if (isSetupInProgress) {
      if (confirm('A configuração está em andamento. Tem certeza que deseja fechar?')) {
        onClose();
        resetForm();
      }
    } else {
      onClose();
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Configurar VPS
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure seu servidor para hospedar sites WordPress
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Existing VPS List */}
        {existingVPS.length > 0 && currentStep === 'credentials' && (
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">VPS Existentes</h3>
            <div className="space-y-2">
              {existingVPS.map((vps) => (
                <div key={vps._id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium">{vps.host}</div>
                      <div className="text-sm text-gray-600">
                        {vps.isConfigured ? (
                          <span className="text-green-600">✓ Configurado</span>
                        ) : (
                          <span className="text-yellow-600">⚠ Não configurado</span>
                        )}
                        {vps.totalSites > 0 && (
                          <span className="ml-2">{vps.totalSites} sites</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {vps.isConfigured && (
                    <div className="text-sm text-gray-500">
                      Configurado em {new Date(vps.configuredAt!).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 'credentials' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Credenciais do VPS
                </h3>
                <p className="text-gray-600 mb-6">
                  Insira as informações de acesso ao seu servidor Ubuntu 22.04
                </p>
              </div>

              {/* Credentials Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço do Servidor
                  </label>
                  <input
                    type="text"
                    value={credentials.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    placeholder="exemplo: 192.168.1.100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porta SSH
                  </label>
                  <input
                    type="number"
                    value={credentials.port}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 22)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Autenticação
                  </label>
                  <select
                    value={credentials.authMethod}
                    onChange={(e) => handleInputChange('authMethod', e.target.value as 'password' | 'privateKey')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="password">Senha</option>
                    <option value="privateKey">Chave Privada</option>
                  </select>
                </div>
              </div>

              {credentials.authMethod === 'password' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password || ''}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {credentials.authMethod === 'privateKey' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chave Privada
                  </label>
                  <textarea
                    value={credentials.privateKey || ''}
                    onChange={(e) => handleInputChange('privateKey', e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----"
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection || !credentials.host || !credentials.username}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'testing' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Conexão Estabelecida!
                </h3>
                <p className="text-gray-600">
                  Sua conexão com o VPS foi testada com sucesso. Você pode prosseguir com a configuração.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCurrentStep('credentials')}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSetupConfirm}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configurar VPS
                </button>
              </div>
            </div>
          )}

          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center">
                <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  ⚠️ Confirmação Necessária
                </h3>
                <div className="text-gray-600 space-y-2">
                  <p>
                    A configuração do VPS irá realizar um <strong>reset completo</strong> do servidor:
                  </p>
                  <ul className="text-left max-w-md mx-auto space-y-1">
                    <li>• Remove todos os serviços existentes</li>
                    <li>• Limpa todos os arquivos web</li>
                    <li>• Instala WordOps do zero</li>
                    <li>• Configura Nginx, MySQL, PHP</li>
                    <li>• Configura SSL e Firewall</li>
                  </ul>
                  <p className="text-red-600 font-medium mt-4">
                    ⚠️ TODOS OS DADOS SERÃO PERDIDOS!
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCurrentStep('testing')}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={startVPSSetup}
                  disabled={isSetupInProgress}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSetupInProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isSetupInProgress ? 'Iniciando...' : 'Confirmar Reset e Configurar'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Terminal className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Configurando VPS
                </h3>
                <p className="text-gray-600">
                  O processo de configuração está em andamento. Acompanhe o progresso abaixo.
                </p>
              </div>

              <VPSSetupTerminal
                isVisible={true}
                onComplete={handleSetupComplete}
                onError={handleSetupError}
              />
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  🎉 VPS Configurado com Sucesso!
                </h3>
                <p className="text-gray-600">
                  Seu servidor está pronto para hospedar sites WordPress. 
                  Agora você pode criar novos blogs usando o botão "Criar Novo Blog".
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};