import React, { useState } from 'react';
import api from '../../services/api';
import { InstallationConfig } from './InstallationConfig';
import type { InstallationConfigData } from './InstallationConfig';
import { InstallationTerminal } from './InstallationTerminal';
import { WordPressCredentialsStep } from './WordPressCredentialsStep';
import type { WordPressCredentials } from './WordPressCredentialsStep';
import { ThemeSelectionStep } from './ThemeSelectionStep';
import { PluginSelectionStep } from './PluginSelectionStep';
import { 
  ArrowRight, 
  ArrowLeft, 
  Rocket,
  CheckCircle,
  AlertCircle,
  Settings,
  Terminal,
  Globe,
  Copy,
  ExternalLink,
  User,
  Palette,
  Plug,
  Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { InstallationStep } from '../../types/installer';
import { UpgradePrompt } from '../UpgradePrompt';
import { useUsage } from '../../hooks/useUsage';

// Development-only logging helper
const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

interface SimpleWordPressInstallerProps {
  onClose: () => void;
}

interface InstallationSuccess {
  credentials: {
    siteUrl: string;
    adminUrl: string;
    username: string;
    password: string;
  };
  siteInfo: {
    domain: string;
    ipAddress: string;
    accessUrl: string;
    adminUrl: string;
  };
  accessMethods?: Array<{
    type: 'ip' | 'port' | 'preview' | 'domain';
    url: string;
    primary?: boolean;
  }>;
  dnsInstructions: {
    cloudflare: string[];
    generic: string[];
  };
}

export const SimpleWordPressInstaller: React.FC<SimpleWordPressInstallerProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wpCredentials, setWpCredentials] = useState<WordPressCredentials | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [installationConfig, setInstallationConfig] = useState<InstallationConfigData | null>(null);
  const [installationId, setInstallationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [installationSuccess, setInstallationSuccess] = useState<InstallationSuccess | null>(null);
  
  // Usage hook for upgrade prompt
  const { 
    usage,
    showUpgradePrompt,
    upgradePromptType,
    handleUpgradePromptClose,
    showUpgradePromptFor
  } = useUsage();

  const steps: InstallationStep[] = [
    {
      id: 'credentials',
      title: 'WordPress',
      description: 'Configurar credenciais',
      status: wpCredentials ? 'completed' : currentStep === 0 ? 'active' : 'pending'
    },
    {
      id: 'theme',
      title: 'Tema',
      description: 'Escolher design',
      status: selectedTheme ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      id: 'plugins',
      title: 'Plugins',
      description: 'Selecionar recursos',
      status: selectedPlugins.length > 0 ? 'completed' : currentStep === 2 ? 'active' : 'pending'
    },
    {
      id: 'config',
      title: 'Servidor',
      description: 'Configurar VPS',
      status: installationConfig ? 'completed' : currentStep === 3 ? 'active' : 'pending'
    },
    {
      id: 'install',
      title: 'Instalação',
      description: 'Instalando WordPress',
      status: installationId ? 'completed' : currentStep === 4 ? 'active' : 'pending'
    },
    {
      id: 'complete',
      title: 'Concluído',
      description: 'WordPress instalado',
      status: installationSuccess ? 'completed' : currentStep === 5 ? 'active' : 'pending'
    }
  ];

  const handleNext = () => {
    debugLog('📍 handleNext called - current step:', currentStep, 'steps length:', steps.length);
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      debugLog('📍 Moving to step:', nextStep);
      setCurrentStep(nextStep);
    } else {
      debugLog('📍 Already at last step, not advancing');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };


  const handleCredentialsComplete = (credentials: WordPressCredentials) => {
    debugLog('🔐 User completed credentials step:', {
      adminUsername: credentials.adminUsername,
      adminEmail: credentials.adminEmail,
      siteTitle: credentials.siteTitle,
      hasPassword: !!credentials.adminPassword
    });
    setWpCredentials(credentials);
    handleNext();
  };

  const handleThemeSelected = (theme: any) => {
    setSelectedTheme(theme);
    handleNext();
  };

  const handlePluginsSelected = (plugins: string[]) => {
    debugLog('handlePluginsSelected called with plugins:', plugins);
    setSelectedPlugins(plugins);
    handleNext();
  };

  // Debug log to verify function exists
  React.useEffect(() => {
    debugLog('SimpleWordPressInstaller handlePluginsSelected defined:', typeof handlePluginsSelected);
  }, []);

  const handleConfigComplete = async (config: InstallationConfigData) => {
    setIsLoading(true);
    setInstallationConfig(config);
    
    try {
      // Start the installation with WordPress credentials, theme, and plugins
      const response = await api.post('/api/sites/execute-installation', {
        domain: config.domain,
        vpsConfig: {
          host: config.vpsHost,
          port: config.vpsPort,
          username: config.vpsUsername,
          password: config.vpsPassword,
          privateKey: config.vpsPrivateKey,
          authMethod: config.authMethod,
          installationType: config.installationType
        },
        wordpressConfig: {
          credentials: wpCredentials,
          theme: selectedTheme,
          plugins: selectedPlugins
        }
      });

      if (response.data.success && response.data.installationId) {
        setInstallationId(response.data.installationId);
        handleNext();
      } else {
        throw new Error(response.data.message || 'Failed to start installation');
      }
    } catch (error) {
      console.error('Error starting installation:', error);
      toast.error(`Erro ao iniciar instalação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallationComplete = React.useCallback(async (success: boolean, data?: any) => {
    debugLog('🎉 Installation completion callback:', { success, data });
    debugLog('🔍 Current step before completion:', currentStep);
    debugLog('🔍 Installation success state before:', installationSuccess);
    debugLog('🔍 WordPress credentials from state:', wpCredentials);
    
    if (success) {
      // Create proper completion data with actual credentials and URLs
      const domain = installationConfig?.domain;
      const siteUrl = `http://${domain}`;
      const adminUrl = `${siteUrl}/wp-admin`;
      
      const finalUsername = data?.credentials?.username || wpCredentials?.username || 'admin';
      const finalPassword = data?.credentials?.password || wpCredentials?.password || 'admin123';
      
      debugLog('🔍 Final credentials being used:');
      debugLog('  - Username:', finalUsername, '(from:', data?.credentials?.username ? 'data' : wpCredentials?.username ? 'wpCredentials' : 'fallback', ')');
      debugLog('  - Password:', finalPassword, '(from:', data?.credentials?.password ? 'data' : wpCredentials?.password ? 'wpCredentials' : 'fallback', ')');
      
      const completionData = {
        credentials: {
          username: finalUsername,
          password: finalPassword
        },
        siteInfo: { 
          domain: domain,
          accessUrl: siteUrl,
          adminUrl: adminUrl
        },
        accessMethods: [{ 
          type: 'domain', 
          url: siteUrl, 
          primary: true 
        }],
        dnsInstructions: {
          cloudflare: [
            `1. Acesse o painel do Cloudflare em https://cloudflare.com`,
            `2. Selecione seu domínio "${domain}"`,
            `3. Vá para DNS > Records`,
            `4. Adicione um registro A:`,
            `   - Name: @ (ou deixe em branco)`,
            `   - IPv4 address: ${installationConfig?.vpsHost}`,
            `   - TTL: Auto`,
            `5. Se usar subdomínio, adicione também:`,
            `   - Name: www`,
            `   - IPv4 address: ${installationConfig?.vpsHost}`,
            `6. Aguarde a propagação DNS (até 24 horas)`
          ]
        }
      };
      
      debugLog('✅ Setting installation success data:', completionData);
      setInstallationSuccess(completionData);
      debugLog('📍 Installation complete - waiting for user to continue');
      
      // Auto-register the new site in the database
      try {
        debugLog('🔄 Auto-registering site in database...');
        const registerResponse = await api.post('/api/wordpress/sites', {
          name: wpCredentials?.siteTitle || domain || 'Novo Site',
          url: siteUrl,
          username: finalUsername,
          applicationPassword: finalPassword,
          siteType: 'managed',
          vpsConfig: {
            host: installationConfig?.vpsHost,
            port: installationConfig?.vpsPort || 22,
            username: installationConfig?.vpsUsername,
            hasAccess: true
          }
        });
        
        if (registerResponse.data.success) {
          debugLog('✅ Site registered successfully in database');
        } else {
          console.warn('⚠️ Site registration failed:', registerResponse.data.message);
          // If it's a blog limit error, show upgrade prompt
          if (registerResponse.data.limitInfo) {
            showUpgradePromptFor('blogs');
          }
        }
      } catch (error: any) {
        console.error('❌ Error auto-registering site:', error);
        // If it's a blog limit error, show upgrade prompt
        if (error.response?.status === 429 && error.response?.data?.limitInfo) {
          showUpgradePromptFor('blogs');
        }
        // Don't show other errors to user - this is background operation
      }
      
      // Show success toast but don't auto-advance
      toast.success('WordPress instalado com sucesso! Clique em "Continuar" para ver os detalhes.');
    } else {
      console.error('❌ Installation failed:', data);
      toast.error('A instalação falhou. Verifique os logs.');
      onClose();
    }
  }, [handleNext, wpCredentials, installationConfig]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };


  const getStepIcon = (step: InstallationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'active':
        return <div className="w-5 h-5 border-2 border-coral bg-white rounded-full animate-pulse" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 bg-white rounded-full" />;
    }
  };

  const getStepStatus = (step: InstallationStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'error':
        return 'text-red-600 border-red-200 bg-red-50';
      case 'active':
        return 'text-coral border-coral bg-coral/5';
      default:
        return 'text-gray-500 border-gray-200 bg-gray-50';
    }
  };

  const getStepComponentIcon = (stepId: string) => {
    switch (stepId) {
      case 'credentials':
        return <User className="w-4 h-4" />;
      case 'theme':
        return <Palette className="w-4 h-4" />;
      case 'plugins':
        return <Plug className="w-4 h-4" />;
      case 'config':
        return <Settings className="w-4 h-4" />;
      case 'install':
        return <Terminal className="w-4 h-4" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-coral to-coral-dark p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Rocket className="w-8 h-8" />
              WordPress 1-Click Install
            </h1>
            <p className="text-white/90 mt-1">
              Instalação simplificada de WordPress em seu VPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl font-semibold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all ${getStepStatus(step)}`}
              >
                <div className="flex items-center gap-2">
                  {getStepIcon(step)}
                  {getStepComponentIcon(step.id)}
                </div>
                <div className="hidden md:block">
                  <div className="font-semibold text-sm">{step.title}</div>
                  <div className="text-xs opacity-75">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div className={`h-0.5 transition-colors ${
                    steps[index].status === 'completed' ? 'bg-green-400' : 'bg-gray-300'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[500px]">
        {/* Debug information */}
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
          Debug: Step={currentStep}, InstallationSuccess={!!installationSuccess}, InstallationId={installationId}
        </div>

        {currentStep === 0 && (
          <WordPressCredentialsStep
            onCredentialsComplete={handleCredentialsComplete}
          />
        )}

        {currentStep === 1 && (
          <ThemeSelectionStep
            onThemeSelected={handleThemeSelected}
          />
        )}

        {currentStep === 2 && (
          <PluginSelectionStep
            onPluginsSelected={handlePluginsSelected}
            selectedTheme={selectedTheme}
          />
        )}

        {currentStep === 3 && (
          <InstallationConfig
            templateId="raw-wordpress"
            templateName="WordPress"
            installationType="add-site"
            onConfigComplete={handleConfigComplete}
          />
        )}

        {currentStep === 4 && (
          <InstallationTerminal
            domain={installationConfig?.domain || ''}
            templateName="WordPress"
            installationId={installationId}
            wpCredentials={wpCredentials}
            onComplete={handleInstallationComplete}
            onBack={handlePrevious}
          />
        )}
      </div>


      {/* Step 6: Final Results */}
      {currentStep === 6 && installationSuccess && (
            <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <Globe className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ✅ WordPress Instalado com Sucesso!
              </h2>
              <p className="text-gray-600 text-lg">
                Seu WordPress está <span className="font-semibold text-green-600">100% funcional e acessível agora!</span>
              </p>
              <p className="text-gray-500 mt-2">
                Use o IP abaixo para acessar imediatamente ou configure o DNS para usar seu domínio.
              </p>
            </div>

            {/* Access Instructions - Prominent Box */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                🎉 Seu WordPress Está Pronto Para Uso!
              </h3>
              
              {/* Multiple Access Methods */}
              {installationSuccess.accessMethods && installationSuccess.accessMethods.length > 1 ? (
                <div className="space-y-4">
                  <p className="text-green-700 mb-4">
                    Você pode acessar seu site de várias formas. Recomendamos usar o método primário:
                  </p>
                  
                  {installationSuccess.accessMethods.map((method, index) => {
                    const adminUrl = method.url + '/wp-admin';
                    const methodLabels = {
                      'port': '🔗 Acesso via Porto (Recomendado)',
                      'ip': '🌐 Acesso via IP',
                      'preview': '👁️ Visualização Preview',
                      'domain': '🏠 Domínio Final'
                    };
                    
                    return (
                      <div 
                        key={index} 
                        className={`bg-white rounded-lg p-4 border-2 ${
                          method.primary ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`font-medium ${
                            method.primary ? 'text-green-800' : 'text-gray-700'
                          }`}>
                            {methodLabels[method.type]}
                            {method.primary && <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded">PRIMARY</span>}
                          </h4>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm">Site:</span>
                            <div className="flex items-center gap-2">
                              <a 
                                href={method.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-sm"
                              >
                                {method.url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => copyToClipboard(method.url)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm">Admin:</span>
                            <div className="flex items-center gap-2">
                              <a 
                                href={adminUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-sm"
                              >
                                {adminUrl}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => copyToClipboard(adminUrl)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {method.type === 'port' && (
                          <p className="text-xs text-green-600 mt-2">
                            ✅ Este método garante acesso exclusivo ao seu site mesmo em VPS compartilhado
                          </p>
                        )}
                        
                        {method.type === 'domain' && (
                          <p className="text-xs text-gray-500 mt-2">
                            ⏳ Requer configuração DNS - pode levar até 48h para propagar
                          </p>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Credentials Section */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-3">🔐 Credenciais de Acesso</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Usuário:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded text-sm">
                            {installationSuccess?.credentials?.username || 'N/A'}
                          </code>
                          <button
                            onClick={() => copyToClipboard(installationSuccess?.credentials?.username || '')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Senha:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded text-sm">
                            {installationSuccess?.credentials?.password || 'N/A'}
                          </code>
                          <button
                            onClick={() => copyToClipboard(installationSuccess?.credentials?.password || '')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Fallback to single access method display
                <div>
                  <p className="text-green-700 mb-4">
                    Você pode acessar seu site AGORA mesmo usando o endereço abaixo:
                  </p>
                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Visualizar Site:</span>
                      <div className="flex items-center gap-2">
                        <a 
                          href={installationSuccess?.siteInfo?.accessUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-lg"
                        >
                          {installationSuccess?.siteInfo?.accessUrl || 'N/A'}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(installationSuccess?.siteInfo?.accessUrl || '')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Painel Admin:</span>
                      <div className="flex items-center gap-2">
                        <a 
                          href={installationSuccess?.siteInfo?.adminUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-lg"
                        >
                          {installationSuccess?.siteInfo?.adminUrl || 'N/A'}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(installationSuccess?.siteInfo?.adminUrl || '')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Usuário:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded">
                          {installationSuccess?.credentials?.username || 'N/A'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(installationSuccess?.credentials?.username || '')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Senha:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded">
                          {installationSuccess?.credentials?.password || 'N/A'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(installationSuccess?.credentials?.password || '')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DNS Instructions */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configuração DNS (Cloudflare)
              </h3>
              <ol className="space-y-2">
                {(installationSuccess?.dnsInstructions?.cloudflare || []).map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>


            {/* Important Notes */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2 text-yellow-800">
                ⚠️ Importante
              </h3>
              <ul className="space-y-1 text-yellow-700">
                <li>• Recomendamos alterar a senha do admin após o primeiro acesso</li>
                <li>• Configure o DNS do Cloudflare seguindo as instruções acima</li>
                <li>• O DNS pode levar até 24 horas para propagar completamente</li>
                <li>• Após a propagação, ative o certificado SSL no Cloudflare</li>
                <li>• Mantenha o WordPress sempre atualizado por segurança</li>
              </ul>
            </div>
          </div>
      )}

      {/* Step 6: Loading State */}
      {currentStep === 6 && !installationSuccess && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Preparando página de sucesso...</h3>
            <p className="text-gray-600">Carregando dados da instalação concluída...</p>
          </div>
        </div>
      )}

      {/* General Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Iniciando instalação no VPS...</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      {currentStep === 6 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-center">
            <button
              onClick={() => {
                debugLog('🔴 CONCLUIR BUTTON CLICKED');
                debugLog('🔍 Current state when closing:');
                debugLog('  - currentStep:', currentStep);
                debugLog('  - installationSuccess:', !!installationSuccess);
                debugLog('  - installationSuccess data:', installationSuccess);
                
                // Show success toast before closing
                toast.success('WordPress instalado com sucesso! Você pode acessar sua ferramenta quando quiser.', {
                  duration: 2000,
                  position: 'top-center'
                });
                
                // Close modal immediately when user clicks (no auto-timer)
                debugLog('🔴 Closing modal - returning to Tools page');
                onClose();
              }}
              className="px-6 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors font-semibold"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={handleUpgradePromptClose}
        limitType={upgradePromptType}
        currentPlan={usage?.plan || 'starter'}
        used={usage?.usage?.blogs?.used || 0}
        limit={usage?.usage?.blogs?.limit || 1}
      />
    </div>
  );
};