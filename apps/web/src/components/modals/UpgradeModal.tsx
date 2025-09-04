import React from 'react';
import { X, Crown, Zap, Users, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature
}) => {
  const navigate = useNavigate();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Premium icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Funcionalidade Premium 🥋
          </h2>
          <p className="text-gray-600">
            <strong>{feature}</strong> é exclusivo do plano Black Belt
          </p>
        </div>

        {/* Features preview */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
            O que você ganha com Black Belt:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 text-sm">Upload em Massa</p>
                <p className="text-xs text-gray-600">Gere múltiplas reviews de uma vez</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 text-sm">Calls Semanais</p>
                <p className="text-xs text-gray-600">Acesso direto ao time Tatame</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 text-sm">Recursos Ilimitados</p>
                <p className="text-xs text-gray-600">Blogs e reviews sem limites</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // Navigate to pricing page
              navigate('/precos');
              onClose();
            }}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Crown size={20} />
            Fazer Upgrade para Black Belt
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Talvez Depois
          </button>
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Upgrade agora e desbloqueie todas as funcionalidades premium do Tatame para turbinar sua produtividade.
        </p>
      </div>
    </div>
  );
};