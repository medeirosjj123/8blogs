import React, { useState } from 'react';
import api from '../../services/api';
import { TemplateSelector } from './TemplateSelector';
import { InstallationConfig } from './InstallationConfig';
import type { InstallationConfigData } from './InstallationConfig';
import { InstallationTerminal } from './InstallationTerminal';
import { 
  ArrowRight, 
  ArrowLeft, 
  Rocket,
  CheckCircle,
  AlertCircle,
  Globe,
  Settings,
  Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { WordPressTemplate, InstallationStep } from '../../types/installer';

interface WordPressInstallerProps {
  onClose: () => void;
}

export const WordPressInstaller: React.FC<WordPressInstallerProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<WordPressTemplate | null>(null);
  const [installationConfig, setInstallationConfig] = useState<InstallationConfigData | null>(null);
  const [installationId, setInstallationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const steps: InstallationStep[] = [
    {
      id: 'template',
      title: 'Escolher Template',
      description: 'Selecione o template WordPress para seu site',
      status: selectedTemplate ? 'completed' : currentStep === 0 ? 'active' : 'pending'
    },
    {
      id: 'config',
      title: 'Configurar',
      description: 'Configure domínio e dados do VPS',
      status: installationConfig ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      id: 'install',
      title: 'Instalação',
      description: 'Instalando WordPress no VPS',
      status: installationId ? 'completed' : currentStep === 2 ? 'active' : 'pending'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template: WordPressTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfigComplete = async (config: InstallationConfigData) => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    setInstallationConfig(config);
    
    try {
      // Start the installation directly on VPS
      const response = await api.post('/sites/execute-installation', {
        templateId: selectedTemplate.id,
        templateUrl: selectedTemplate.downloadUrl,
        domain: config.domain,
        vpsConfig: {
          host: config.vpsHost,
          port: config.vpsPort,
          username: config.vpsUsername,
          password: config.vpsPassword,
          privateKey: config.vpsPrivateKey,
          authMethod: config.authMethod
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

  const handleInstallationComplete = (success: boolean, credentials?: any) => {
    if (success) {
      toast.success('Instalação concluída com sucesso!');
    } else {
      toast.error('A instalação falhou. Verifique os logs.');
    }
    onClose();
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
      case 'template':
        return <Globe className="w-4 h-4" />;
      case 'config':
        return <Settings className="w-4 h-4" />;
      case 'install':
        return <Terminal className="w-4 h-4" />;
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
              Instale WordPress otimizado com um único comando
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
        {currentStep === 0 && (
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={handleTemplateSelect}
          />
        )}

        {currentStep === 1 && selectedTemplate && (
          <InstallationConfig
            templateId={selectedTemplate.id}
            templateName={selectedTemplate.name}
            onConfigComplete={handleConfigComplete}
          />
        )}

        {currentStep === 2 && installationId && installationConfig && selectedTemplate && (
          <InstallationTerminal
            domain={installationConfig.domain}
            templateName={selectedTemplate.name}
            installationId={installationId}
            onComplete={handleInstallationComplete}
            onBack={handlePrevious}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Iniciando instalação no VPS...</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep === 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleNext}
              disabled={!selectedTemplate}
              className="px-6 py-2 bg-coral text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-coral-dark transition-colors flex items-center gap-2 font-semibold"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              className="px-4 py-2 text-gray-600 flex items-center gap-2 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </button>
            <div className="text-sm text-gray-500">
              Teste a conexão e clique em "Instalar no VPS"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};