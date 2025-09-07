import React from 'react';
import { Check, X, Star, Zap, Users, Upload } from 'lucide-react';
import { KIWIFY_PRODUCTS, PLAN_PRICING } from '../config/kiwify';

const Pricing = () => {
  const plans = [
    {
      ...PLAN_PRICING.starter,
      description: 'Perfeito para quem está começando',
      button: 'Começar Agora',
      buttonColor: 'bg-slate-900 hover:bg-slate-800',
      popular: false,
      kiwifyUrl: KIWIFY_PRODUCTS.starter.checkoutUrl,
    },
    {
      ...PLAN_PRICING.pro,
      description: 'Para bloggers que querem escalar',
      button: 'Escolher Pro',
      buttonColor: 'bg-red-600 hover:bg-red-700',
      popular: false,
      kiwifyUrl: KIWIFY_PRODUCTS.pro.checkoutUrl,
    },
    {
      ...PLAN_PRICING.black_belt,
      description: 'Comunidade exclusiva + ferramentas ilimitadas',
      button: 'Virar Black Belt',
      buttonColor: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
      popular: true,
      kiwifyUrl: KIWIFY_PRODUCTS.black_belt.checkoutUrl,
    },
  ];

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'IA Integrada',
      description: 'Geração automática de reviews otimizados com IA',
    },
    {
      icon: <Upload className="w-5 h-5" />,
      title: 'WordPress Automático',
      description: 'Instale sites WordPress em 1 clique',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Comunidade Ativa',
      description: 'Networking com outros blogueiros profissionais',
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: 'Templates Otimizados',
      description: 'Layouts testados e aprovados para Amazon Afiliados',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">BH</span>
              </div>
              <span className="text-2xl font-bold text-slate-900">Blog House</span>
            </div>
            <a 
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Já tenho conta
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
          Monetize seus blogs com{' '}
          <span className="text-red-600">Amazon Afiliados</span>
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
          Na era da IA, não faz sentido aprender tudo. Nossa plataforma faz o trabalho pesado 
          enquanto você foca no que importa: <strong>gerar receita</strong>.
        </p>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Escolha seu plano
          </h2>
          <p className="text-xl text-slate-600">
            Comece hoje mesmo a monetizar seus blogs profissionalmente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl ${
                plan.popular ? 'border-red-200 transform scale-105' : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center mb-6">
                    <span className="text-4xl lg:text-5xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600 ml-1">{plan.period}</span>
                  </div>
                  <button 
                    className={`w-full py-3 px-6 rounded-2xl font-semibold text-white transition-all duration-200 ${plan.buttonColor}`}
                    onClick={() => window.open(plan.kiwifyUrl, '_blank')}
                  >
                    {plan.button}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      Incluído no plano:
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <X className="w-4 h-4 text-slate-400 mr-2" />
                        Não incluído:
                      </h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, limitIndex) => (
                          <li key={limitIndex} className="flex items-center text-sm">
                            <X className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                            <span className="text-slate-500">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Posso trocar de plano a qualquer momento?
              </h3>
              <p className="text-slate-600">
                Sim! Você pode fazer upgrade a qualquer momento e o valor é calculado proporcionalmente. 
                Para downgrades, a mudança entra em vigor na próxima renovação.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                O que acontece se eu ultrapassar meu limite de reviews?
              </h3>
              <p className="text-slate-600">
                O sistema irá notificar quando você atingir 80% do limite. Se ultrapassar, 
                você receberá uma sugestão de upgrade ou pode aguardar o reset mensal.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Os cursos do plano Premium são vitalícios?
              </h3>
              <p className="text-slate-600">
                Sim! Uma vez que você assina o Premium, tem acesso vitalício a todos os cursos, 
                mesmo se cancelar a assinatura posteriormente.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Como funcionam as chamadas semanais do Premium?
              </h3>
              <p className="text-slate-600">
                São encontros semanais em grupo via Zoom para tirar dúvidas, networking e 
                estratégias avançadas. Você pode agendar através da plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Junte-se a centenas de blogueiros que já monetizam com o Blog House
          </p>
          <button 
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-colors duration-200"
            onClick={() => window.open(KIWIFY_PRODUCTS.starter.checkoutUrl, '_blank')}
          >
            Começar Gratuitamente
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;