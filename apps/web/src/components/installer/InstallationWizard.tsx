import React, { useState } from 'react';
import { 
  Copy, 
  CheckCircle, 
  ArrowRight, 
  Server,
  Globe,
  Terminal,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { WordPressTemplate } from '../../types/installer';

interface InstallationWizardProps {
  selectedTemplate: WordPressTemplate;
  onBack: () => void;
}

export const InstallationWizard: React.FC<InstallationWizardProps> = ({
  selectedTemplate,
  onBack
}) => {
  const { user } = useAuth();
  const [domain, setDomain] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [installationData, setInstallationData] = useState<{
    command: string;
    token: string;
    installationId: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const validateDomain = (value: string) => {
    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(value);
  };

  const generateInstallation = async () => {
    if (!domain) {
      setError('Por favor, insira um domínio');
      return;
    }

    if (!validateDomain(domain)) {
      setError('Domínio inválido. Use o formato: exemplo.com.br');
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/sites/generate-command', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: domain.toLowerCase().trim(),
          templateId: selectedTemplate.id
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar comando de instalação');
      }

      const data = await response.json();
      setInstallationData(data);
    } catch (err) {
      setError('Erro ao gerar comando. Tente novamente.');
      console.error('Error generating installation:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCommand = async () => {
    if (installationData?.command) {
      try {
        await navigator.clipboard.writeText(installationData.command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const formatExpirationTime = (expiresAt: string) => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffMinutes = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes < 0) return 'Expirado';
    if (diffMinutes < 60) return `${diffMinutes} minutos`;
    return `${Math.floor(diffMinutes / 60)} hora${Math.floor(diffMinutes / 60) > 1 ? 's' : ''}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Instalação do WordPress
        </h1>
        <p className="text-lg text-gray-600">
          Configure seu site WordPress com o template{' '}
          <span className="font-semibold text-coral">{selectedTemplate.name}</span>
        </p>
      </div>

      {!installationData ? (
        <>
          {/* Domain Input */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="space-y-6">
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
                    setError('');
                  }}
                  placeholder="exemplo.com.br"
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    error ? 'border-red-300' : 'border-gray-200'
                  } focus:border-coral focus:ring-2 focus:ring-coral/20 transition-colors`}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Insira o domínio que você configurou para apontar para o IP do seu VPS
                </p>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email do administrador:</span>{' '}
                  {user?.email || 'seu-email@exemplo.com'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Este email será usado como administrador do WordPress
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={onBack}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={generateInstallation}
                  disabled={!domain || isGenerating}
                  className="flex-1 px-6 py-3 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      Gerar Comando de Instalação
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              Pré-requisitos
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>VPS Ubuntu 22.04 LTS limpo (sem instalações prévias)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Acesso root ao servidor via SSH</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Domínio apontando para o IP do VPS (registros A configurados)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Mínimo 2GB RAM e 20GB de espaço em disco</span>
              </li>
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* Installation Command */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Comando Gerado com Sucesso!
                </h2>
                <p className="text-gray-600">
                  Execute o comando abaixo no seu VPS para iniciar a instalação
                </p>
              </div>

              {/* Command Box */}
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Terminal className="w-5 h-5" />
                    <span className="font-mono text-sm">root@vps:~#</span>
                  </div>
                  <button
                    onClick={copyCommand}
                    className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <code className="text-green-400 font-mono text-sm break-all">
                  {installationData.command}
                </code>
              </div>

              {/* Token Info */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 mb-1">
                      Token de uso único
                    </p>
                    <p className="text-amber-700">
                      Este comando expira em{' '}
                      <span className="font-semibold">
                        {formatExpirationTime(installationData.expiresAt)}
                      </span>{' '}
                      e só pode ser usado uma vez. O script será automaticamente
                      removido do servidor após a execução por segurança.
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Como instalar:
                </h3>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-coral text-white rounded-full flex items-center justify-center font-semibold">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        Conecte ao seu VPS via SSH
                      </p>
                      <code className="text-sm text-gray-600 font-mono">
                        ssh root@seu-ip-vps
                      </code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-coral text-white rounded-full flex items-center justify-center font-semibold">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        Cole e execute o comando gerado
                      </p>
                      <p className="text-sm text-gray-600">
                        O script instalará automaticamente WordPress, aplicará o template e configurará tudo
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-coral text-white rounded-full flex items-center justify-center font-semibold">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        Aguarde a conclusão (5-10 minutos)
                      </p>
                      <p className="text-sm text-gray-600">
                        Ao final, você receberá as credenciais de acesso
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Credentials Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Credenciais padrão:
                </h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">URL Admin:</span>{' '}
                    <span className="font-mono">https://{domain}/wp-admin</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Usuário:</span>{' '}
                    <span className="font-mono font-semibold">admin</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Senha:</span>{' '}
                    <span className="font-mono font-semibold">admin</span>
                  </p>
                  <p className="text-amber-600 mt-2">
                    ⚠️ Altere a senha imediatamente após o primeiro acesso
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setInstallationData(null);
                    setDomain('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Gerar Novo Comando
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Voltar aos Templates
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};