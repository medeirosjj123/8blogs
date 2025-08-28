import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  RefreshCw, 
  Terminal, 
  Shield, 
  Zap, 
  Database,
  Globe,
  CheckCircle,
  AlertCircle,
  Code,
  Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { WordPressTemplate } from '../../types/installer';

interface CommandGeneratorProps {
  selectedTemplate: WordPressTemplate;
  installationCommand: string;
  onGenerateCommand: (domain: string, vpsIp: string, options: any) => void;
  isLoading?: boolean;
}

export const CommandGenerator: React.FC<CommandGeneratorProps> = ({
  selectedTemplate,
  installationCommand,
  onGenerateCommand,
  isLoading = false
}) => {
  const [domain, setDomain] = useState('');
  const [vpsIp, setVpsIp] = useState('');
  const [isValidDomain, setIsValidDomain] = useState(false);
  const [isValidIp, setIsValidIp] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    enableSSL: true,
    enableCaching: true,
    enableSecurity: true,
    phpVersion: '8.1',
    mysqlVersion: '8.0',
    installPlugins: true
  });

  useEffect(() => {
    // Validate domain
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    setIsValidDomain(domainRegex.test(domain));
  }, [domain]);

  useEffect(() => {
    // Validate IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const parts = vpsIp.split('.');
    const isValidFormat = ipRegex.test(vpsIp) && 
      parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    setIsValidIp(isValidFormat);
  }, [vpsIp]);

  const handleCopyCommand = async () => {
    if (installationCommand) {
      try {
        await navigator.clipboard.writeText(installationCommand);
        toast.success('Comando copiado para a área de transferência!');
      } catch (err) {
        toast.error('Erro ao copiar comando');
      }
    }
  };

  const handleGenerateCommand = () => {
    if (isValidDomain && isValidIp) {
      onGenerateCommand(domain, vpsIp, advancedOptions);
    }
  };

  const isFormValid = isValidDomain && isValidIp;

  const features = [
    {
      icon: Shield,
      title: 'Segurança Avançada',
      description: 'Firewall, SSL automático e hardening de segurança',
      enabled: advancedOptions.enableSecurity
    },
    {
      icon: Zap,
      title: 'Cache Otimizado',
      description: 'Nginx FastCGI Cache + Redis para máxima performance',
      enabled: advancedOptions.enableCaching
    },
    {
      icon: Database,
      title: 'Database Otimizada',
      description: `MySQL ${advancedOptions.mysqlVersion} com configurações otimizadas`,
      enabled: true
    },
    {
      icon: Code,
      title: 'PHP Moderno',
      description: `PHP ${advancedOptions.phpVersion} com OPcache habilitado`,
      enabled: true
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurar Instalação</h2>
        <p className="text-gray-600">Configure os detalhes do seu site e gere o comando de instalação personalizado</p>
      </div>

      {/* Template Summary */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <img
            src={selectedTemplate.thumbnailUrl}
            alt={selectedTemplate.name}
            className="w-16 h-12 object-cover rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,' + btoa(`<svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="48" fill="#f3f4f6"/><text x="32" y="24" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">${selectedTemplate.name}</text></svg>`);
            }}
          />
          <div>
            <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
            <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>SEO: {selectedTemplate.seoScore}%</span>
              <span>Performance: {selectedTemplate.performanceScore}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <Globe className="w-4 h-4 inline mr-2" />
              Domínio do Site
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase())}
              placeholder="exemplo.com"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                domain && isValidDomain
                  ? 'border-green-300 focus:ring-green-500 bg-green-50'
                  : domain && !isValidDomain
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-coral'
              }`}
            />
            {domain && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {isValidDomain ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Domínio válido</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Formato de domínio inválido</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <Server className="w-4 h-4 inline mr-2" />
              IP do VPS
            </label>
            <input
              type="text"
              value={vpsIp}
              onChange={(e) => setVpsIp(e.target.value)}
              placeholder="192.168.1.100"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                vpsIp && isValidIp
                  ? 'border-green-300 focus:ring-green-500 bg-green-50'
                  : vpsIp && !isValidIp
                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-coral'
              }`}
            />
            {vpsIp && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {isValidIp ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">IP válido</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Formato de IP inválido</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Opções Avançadas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Versão PHP</label>
                <select
                  value={advancedOptions.phpVersion}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, phpVersion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="8.1">PHP 8.1 (Recomendado)</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="7.4">PHP 7.4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">MySQL</label>
                <select
                  value={advancedOptions.mysqlVersion}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, mysqlVersion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="8.0">MySQL 8.0</option>
                  <option value="5.7">MySQL 5.7</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'enableSSL', label: 'Configurar SSL Automático (Let\'s Encrypt)' },
                { key: 'enableCaching', label: 'Ativar Cache Avançado (Nginx + Redis)' },
                { key: 'enableSecurity', label: 'Hardening de Segurança' },
                { key: 'installPlugins', label: 'Instalar Plugins SEO Essenciais' }
              ].map(option => (
                <label key={option.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={advancedOptions[option.key as keyof typeof advancedOptions] as boolean}
                    onChange={(e) => setAdvancedOptions({
                      ...advancedOptions,
                      [option.key]: e.target.checked
                    })}
                    className="w-4 h-4 text-coral border-gray-300 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">O que será instalado</h3>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border transition-all ${
                    feature.enabled 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <feature.icon className={`w-5 h-5 mt-0.5 ${
                      feature.enabled ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <h4 className={`font-medium ${
                        feature.enabled ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {feature.title}
                      </h4>
                      <p className={`text-sm ${
                        feature.enabled ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Command Button */}
          <div className="space-y-4">
            <button
              onClick={handleGenerateCommand}
              disabled={!isFormValid || isLoading}
              className="w-full px-6 py-3 bg-coral text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-coral-dark transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando Comando...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  Gerar Comando de Instalação
                </>
              )}
            </button>

            {!isFormValid && (
              <p className="text-sm text-gray-500 text-center">
                {!isValidDomain && !isValidIp 
                  ? 'Insira um domínio e IP válidos'
                  : !isValidDomain 
                  ? 'Insira um domínio válido'
                  : 'Insira um IP válido'
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Generated Command */}
      {installationCommand && (
        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Comando de Instalação
            </h3>
            <button
              onClick={handleCopyCommand}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </button>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <code className="text-green-400 text-sm font-mono break-all block leading-relaxed">
              {installationCommand}
            </code>
          </div>

          <div className="text-sm text-gray-300 space-y-2">
            <p className="font-medium">Instruções:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Conecte-se ao seu VPS via SSH como root</li>
              <li>Cole e execute o comando acima</li>
              <li>Aguarde a conclusão da instalação</li>
              <li>Seu site estará disponível em <span className="text-green-400">https://{domain}</span></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};