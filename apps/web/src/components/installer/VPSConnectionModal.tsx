import React, { useState } from 'react';
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
  EyeOff
} from 'lucide-react';

interface VPSConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: VPSCredentials) => void;
  templateId: string;
  templateName: string;
}

export interface VPSCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export const VPSConnectionModal: React.FC<VPSConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  templateId,
  templateName
}) => {
  const [credentials, setCredentials] = useState<VPSCredentials>({
    host: '',
    port: 22,
    username: 'root',
    password: ''
  });

  const [authMethod, setAuthMethod] = useState<'password' | 'privateKey'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

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

    if (authMethod === 'password' && !credentials.password) {
      setError('Por favor, insira a senha');
      return;
    }

    if (authMethod === 'privateKey' && !credentials.privateKey) {
      setError('Por favor, insira a chave privada');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setError('');

    try {
      const response = await fetch('/api/terminal/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...credentials,
          password: authMethod === 'password' ? credentials.password : undefined,
          privateKey: authMethod === 'privateKey' ? credentials.privateKey : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setError(data.message || 'Falha na conexão. Verifique se o VPS é Ubuntu 22.04');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setError('Erro ao testar conexão. Tente novamente.');
      console.error('Connection test error:', err);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleConnect = () => {
    if (connectionStatus !== 'success') {
      setError('Por favor, teste a conexão primeiro');
      return;
    }

    onConnect({
      ...credentials,
      password: authMethod === 'password' ? credentials.password : undefined,
      privateKey: authMethod === 'privateKey' ? credentials.privateKey : undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Conectar ao VPS
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Insira as credenciais do seu servidor Ubuntu 22.04
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">
                  Template Selecionado: {templateName}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  O WordPress será instalado com este template após a conexão
                </p>
              </div>
            </div>
          </div>

          {/* Connection Form */}
          <div className="space-y-4">
            {/* Host */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Server className="w-4 h-4" />
                IP do Servidor ou Domínio
              </label>
              <input
                type="text"
                value={credentials.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                placeholder="192.168.1.1 ou servidor.exemplo.com"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors"
              />
            </div>

            {/* Port and Username */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  Porta SSH
                </label>
                <input
                  type="number"
                  value={credentials.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                  placeholder="22"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  Usuário
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="root"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors"
                />
              </div>
            </div>

            {/* Auth Method Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Método de Autenticação
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setAuthMethod('password')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    authMethod === 'password'
                      ? 'border-coral bg-coral/5 text-coral'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  Senha
                </button>
                <button
                  onClick={() => setAuthMethod('privateKey')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    authMethod === 'privateKey'
                      ? 'border-coral bg-coral/5 text-coral'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Key className="w-4 h-4 inline mr-2" />
                  Chave Privada
                </button>
              </div>
            </div>

            {/* Password Field */}
            {authMethod === 'password' && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4" />
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password || ''}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Private Key Field */}
            {authMethod === 'privateKey' && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4" />
                  Chave Privada SSH
                </label>
                <textarea
                  value={credentials.privateKey || ''}
                  onChange={(e) => handleInputChange('privateKey', e.target.value)}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <div className={`rounded-lg p-4 flex items-center gap-3 ${
              connectionStatus === 'testing' ? 'bg-blue-50 border border-blue-200' :
              connectionStatus === 'success' ? 'bg-green-50 border border-green-200' :
              'bg-red-50 border border-red-200'
            }`}>
              {connectionStatus === 'testing' && (
                <>
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-900">Testando conexão...</span>
                </>
              )}
              {connectionStatus === 'success' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-900">
                    Conexão estabelecida! VPS Ubuntu 22.04 confirmado.
                  </span>
                </>
              )}
              {connectionStatus === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-900">{error}</span>
                </>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 mb-1">
                  Suas credenciais são seguras
                </p>
                <p className="text-amber-700">
                  As credenciais não são armazenadas em nossos servidores. 
                  A conexão é temporária e será encerrada após a instalação.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={testConnection}
              disabled={isTestingConnection || !credentials.host || !credentials.username}
              className="px-6 py-3 border-2 border-coral text-coral rounded-lg font-medium hover:bg-coral/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Server className="w-5 h-5" />
                  Testar Conexão
                </>
              )}
            </button>
            <button
              onClick={handleConnect}
              disabled={connectionStatus !== 'success'}
              className="flex-1 px-6 py-3 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Terminal className="w-5 h-5" />
              Conectar e Instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};