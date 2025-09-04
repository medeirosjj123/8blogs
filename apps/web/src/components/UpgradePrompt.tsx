import React from 'react';
import { X, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLAN_PRICING } from '../config/kiwify';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'reviews' | 'blogs';
  currentPlan: 'starter' | 'pro' | 'black_belt';
  used: number;
  limit: number;
  onUpgrade?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  limitType,
  currentPlan,
  used,
  limit,
  onUpgrade
}) => {
  const navigate = useNavigate();
  
  if (!isOpen) return null;

  const getRecommendedPlan = (): 'pro' | 'black_belt' => {
    if (currentPlan === 'starter') return 'pro';
    if (currentPlan === 'pro') return 'black_belt';
    return 'black_belt';
  };

  const getPlanDetails = (plan: 'pro' | 'black_belt') => {
    return PLAN_PRICING[plan];
  };

  const recommendedPlan = getRecommendedPlan();
  const planDetails = getPlanDetails(recommendedPlan);

  const handleUpgrade = () => {
    // Navigate to pricing page internally
    navigate('/precos');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Limite atingido!
          </h3>
          <p className="text-slate-600">
            Você atingiu o limite de {limit} {limitType === 'reviews' ? 'reviews' : 'blogs'} do plano {PLAN_PRICING[currentPlan].name}.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">
              Plano {planDetails.name}
            </h4>
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-900">{planDetails.price}</span>
              <span className="text-sm text-slate-600">{planDetails.period}</span>
            </div>
          </div>
          
          <ul className="space-y-2">
            {planDetails.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-slate-700">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-slate-600 font-medium rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Depois
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            Fazer Upgrade
            <ArrowRight size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          {limitType === 'reviews' 
            ? 'Seus limites de reviews resetam no início do próximo mês'
            : 'Upgrade imediato disponível'
          }
        </p>
      </div>
    </div>
  );
};