import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Rocket, Globe, MessageCircle, Award, Play } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  userName = 'usuário'
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: `Bem-vindo à Escola do SEO, ${userName}!`,
      description: 'Você está na escola de SEO mais completa do Brasil. Vamos te mostrar como aproveitar ao máximo todas as ferramentas disponíveis.',
      icon: <Rocket className="w-8 h-8 text-coral" />
    },
    {
      id: 'wordpress-installer',
      title: 'Instalador de WordPress 1-Click',
      description: 'Crie sites WordPress automaticamente em poucos cliques. Nossa ferramenta configura tudo: servidor, SSL, otimizações e muito mais.',
      icon: <Globe className="w-8 h-8 text-blue-600" />,
      action: {
        label: 'Ver Instalador',
        href: '/ferramentas'
      }
    },
    {
      id: 'community',
      title: 'Comunidade Ativa',
      description: 'Conecte-se com outros profissionais de SEO, tire dúvidas, compartilhe experiências e aprenda com quem já está obtendo resultados.',
      icon: <MessageCircle className="w-8 h-8 text-green-600" />,
      action: {
        label: 'Entrar na Comunidade',
        href: '/comunidade'
      }
    },
    {
      id: 'content-generator',
      title: 'Gerador de Conteúdo',
      description: 'Crie reviews automatizados, artigos otimizados para SEO e conteúdo de alta qualidade usando nossa IA avançada.',
      icon: <Award className="w-8 h-8 text-purple-600" />,
      action: {
        label: 'Gerar Primeiro Conteúdo',
        href: '/ferramentas'
      }
    },
    {
      id: 'courses',
      title: 'Cursos Completos',
      description: 'Acesse nossos cursos estruturados de SEO, desde o básico até técnicas avançadas. Aprenda no seu ritmo com conteúdo prático.',
      icon: <Play className="w-8 h-8 text-orange-600" />,
      action: {
        label: 'Ver Cursos',
        href: '/cursos'
      }
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed
      localStorage.setItem('onboarding_completed', 'true');
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  };

  const handleActionClick = (action: typeof steps[0]['action']) => {
    if (action?.onClick) {
      action.onClick();
    } else if (action?.href) {
      // For now, we'll just continue to next step
      // In a real app, you'd navigate to the href
      handleNext();
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="font-semibold text-gray-900">Primeiros Passos</span>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Pular tutorial"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Etapa {currentStep + 1} de {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-coral h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Action Button */}
          {currentStepData.action && (
            <div className="mb-6">
              <button
                onClick={() => handleActionClick(currentStepData.action)}
                className="w-full bg-gradient-to-r from-coral to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-coral-dark hover:to-red-700 transition-all duration-200 transform hover:scale-105"
              >
                {currentStepData.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentStep 
                    ? 'bg-coral w-6' 
                    : index < currentStep 
                    ? 'bg-coral/60' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            {isLastStep ? 'Finalizar' : 'Próximo'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};