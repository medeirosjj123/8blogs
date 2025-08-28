import React, { useState } from 'react';
import api from '../../services/api';
import {
  Globe,
  Server,
  User,
  Lock,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react';

interface InstallationConfigProps {
  templateId: string;
  templateName: string;
  onConfigComplete: (config: InstallationConfigData) => void;
}

export interface InstallationConfigData {
  domain: string;
  vpsHost: string;
  vpsPort: number;
  vpsUsername: string;
  vpsPassword?: string;
  vpsPrivateKey?: string;
  authMethod: 'password' | 'privateKey';
}

export const InstallationConfig: React.FC<InstallationConfigProps> = ({
  templateId,
  templateName,
  onConfigComplete
}) => {
  const [domain, setDomain] = useState('');
  const [vpsHost, setVpsHost] = useState('');
  const [vpsPort, setVpsPort] = useState(22);
  const [vpsUsername, setVpsUsername] = useState('root');
  const [vpsPassword, setVpsPassword] = useState('');
  const [vpsPrivateKey, setVpsPrivateKey] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'privateKey'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateDomain = (value: string): boolean => {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(value);
  };

  const validateIP = (value: string): boolean => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return ipRegex.test(value) || domainRegex.test(value);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!domain) {
      newErrors.domain = 'Domínio é obrigatório';
    } else if (!validateDomain(domain)) {
      newErrors.domain = 'Domínio inválido';
    }

    if (!vpsHost) {
      newErrors.vpsHost = 'IP ou hostname do VPS é obrigatório';
    } else if (!validateIP(vpsHost)) {
      newErrors.vpsHost = 'IP ou hostname inválido';
    }

    if (!vpsUsername) {
      newErrors.vpsUsername = 'Usuário é obrigatório';
    }

    if (authMethod === 'password' && !vpsPassword) {
      newErrors.vpsPassword = 'Senha é obrigatória';
    }

    if (authMethod === 'privateKey' && !vpsPrivateKey) {
      newErrors.vpsPrivateKey = 'Chave privada é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testConnection = async () => {
    if (!vpsHost || !vpsUsername || (authMethod === 'password' ? !vpsPassword : !vpsPrivateKey)) {
      setTestStatus('error');
      setTestMessage('Preencha todos os campos de conexão');
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setTestMessage('');

    try {
      const response = await api.post('/sites/test-vps', {
        host: vpsHost,
        port: vpsPort,
        username: vpsUsername,
        password: authMethod === 'password' ? vpsPassword : undefined,
        privateKey: authMethod === 'privateKey' ? vpsPrivateKey : undefined
      });

      const data = response.data;

      if (data.success) {
        setTestStatus('success');
        setTestMessage('Conexão estabelecida! VPS Ubuntu 22.04 confirmado.');
      } else {
        setTestStatus('error');
        setTestMessage(data.message || 'Falha na conexão. Verifique se o VPS é Ubuntu 22.04.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Erro ao testar conexão. Tente novamente.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Additional safety validations
    let cleanDomain = domain.trim().toLowerCase();
    
    // Check if domain looks like an IP address when it shouldn't
    const isIP = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(cleanDomain);
    if (isIP) {
      setErrors({ domain: 'Por favor, use um domínio válido (ex: meusite.com.br), não um endereço IP' });
      return;
    }
    
    // Check for common domain mistakes
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      // Auto-fix: remove protocol
      cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
      setDomain(cleanDomain);
    }
    
    if (cleanDomain.includes('/')) {
      setErrors({ domain: 'Por favor, insira apenas o domínio, sem barras ou caminhos' });
      return;
    }
    
    if (cleanDomain.startsWith('www.')) {
      // Auto-fix: remove www
      cleanDomain = cleanDomain.replace(/^www\./, '');
      setDomain(cleanDomain);
    }
    
    // Check if VPS host is localhost
    if (vpsHost === 'localhost' || vpsHost === '127.0.0.1') {
      setErrors({ vpsHost: 'Por favor, insira o endereço IP real do seu VPS, não localhost' });
      return;
    }
    
    // Check if domain and VPS host are the same (common mistake)
    if (cleanDomain === vpsHost) {
      setErrors({ domain: 'O domínio e o IP do VPS não podem ser iguais' });
      return;
    }

    if (testStatus !== 'success') {
      setErrors({ general: 'Por favor, teste a conexão primeiro' });
      return;
    }

    onConfigComplete({
      domain: cleanDomain,
      vpsHost,
      vpsPort,
      vpsUsername,
      vpsPassword: authMethod === 'password' ? vpsPassword : undefined,
      vpsPrivateKey: authMethod === 'privateKey' ? vpsPrivateKey : undefined,
      authMethod
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Template selecionado:</span> {templateName}
        </p>
      </div>

      {/* Domain Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Configuração do Site</h3>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            Domínio do Site
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setErrors({ ...errors, domain: '' });
            }}
            placeholder="exemplo.com.br"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.domain ? 'border-red-300' : 'border-gray-200'
            } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
          />
          {errors.domain && (
            <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Este domínio deve estar apontando para o IP do seu VPS
          </p>
        </div>
      </div>

      {/* VPS Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Dados do VPS</h3>
        
        {/* Host and Port */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Server className="w-4 h-4" />
              IP ou Hostname
            </label>
            <input
              type="text"
              value={vpsHost}
              onChange={(e) => {
                setVpsHost(e.target.value);
                setErrors({ ...errors, vpsHost: '' });
                setTestStatus('idle');
              }}
              placeholder="192.168.1.1 ou vps.exemplo.com"
              className={`w-full px-4 py-3 rounded-lg border-2 ${
                errors.vpsHost ? 'border-red-300' : 'border-gray-200'
              } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
            />
            {errors.vpsHost && (
              <p className="mt-1 text-sm text-red-600">{errors.vpsHost}</p>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Porta SSH
            </label>
            <input
              type="number"
              value={vpsPort}
              onChange={(e) => {
                setVpsPort(parseInt(e.target.value));
                setTestStatus('idle');
              }}
              placeholder="22"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4" />
            Usuário SSH
          </label>
          <input
            type="text"
            value={vpsUsername}
            onChange={(e) => {
              setVpsUsername(e.target.value);
              setErrors({ ...errors, vpsUsername: '' });
              setTestStatus('idle');
            }}
            placeholder="root"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.vpsUsername ? 'border-red-300' : 'border-gray-200'
            } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
          />
          {errors.vpsUsername && (
            <p className="mt-1 text-sm text-red-600">{errors.vpsUsername}</p>
          )}
        </div>

        {/* Auth Method */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Método de Autenticação
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setAuthMethod('password');
                setTestStatus('idle');
              }}
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
              onClick={() => {
                setAuthMethod('privateKey');
                setTestStatus('idle');
              }}
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
                value={vpsPassword}
                onChange={(e) => {
                  setVpsPassword(e.target.value);
                  setErrors({ ...errors, vpsPassword: '' });
                  setTestStatus('idle');
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${
                  errors.vpsPassword ? 'border-red-300' : 'border-gray-200'
                } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.vpsPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.vpsPassword}</p>
            )}
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
              value={vpsPrivateKey}
              onChange={(e) => {
                setVpsPrivateKey(e.target.value);
                setErrors({ ...errors, vpsPrivateKey: '' });
                setTestStatus('idle');
              }}
              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
              rows={6}
              className={`w-full px-4 py-3 rounded-lg border-2 ${
                errors.vpsPrivateKey ? 'border-red-300' : 'border-gray-200'
              } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors font-mono text-sm`}
            />
            {errors.vpsPrivateKey && (
              <p className="mt-1 text-sm text-red-600">{errors.vpsPrivateKey}</p>
            )}
          </div>
        )}
      </div>

      {/* Connection Test */}
      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={isTesting || !vpsHost || !vpsUsername}
          className="w-full py-3 px-4 border-2 border-coral text-coral rounded-lg font-medium hover:bg-coral/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Testando conexão...
            </>
          ) : (
            <>
              <TestTube className="w-5 h-5" />
              Testar Conexão VPS
            </>
          )}
        </button>

        {/* Test Status */}
        {testStatus !== 'idle' && (
          <div className={`rounded-lg p-4 flex items-center gap-3 ${
            testStatus === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-red-50 border border-red-200'
          }`}>
            {testStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-900">{testMessage}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-900">{testMessage}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 mb-1">
              Suas credenciais são seguras
            </p>
            <p className="text-amber-700">
              As credenciais não são armazenadas. Serão usadas apenas para validar a conexão e gerar o script de instalação personalizado.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-900">{errors.general}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={testStatus !== 'success'}
        className="w-full py-3 px-4 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Server className="w-5 h-5" />
        Instalar no VPS
      </button>
    </div>
  );
};