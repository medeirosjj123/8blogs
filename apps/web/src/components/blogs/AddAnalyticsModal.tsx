import React, { useState } from 'react';
import { X, TrendingUp, ExternalLink, Copy, Check, HelpCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (analyticsId: string) => void;
  blogName: string;
}

export const AddAnalyticsModal: React.FC<AddAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  blogName
}) => {
  const [analyticsId, setAnalyticsId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!analyticsId.trim()) {
      toast.error('Por favor, insira o ID do Google Analytics');
      return;
    }

    // Validate GA4 ID format
    if (!analyticsId.match(/^G-[A-Z0-9]{10}$/)) {
      toast.error('Formato inválido. Use o formato: G-XXXXXXXXXX');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(analyticsId);
      toast.success('🎉 Google Analytics conectado! Suas métricas aparecerão em breve.');
      onClose();
      setAnalyticsId('');
    } catch (error) {
      toast.error('Erro ao conectar Google Analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleCopy = () => {
    navigator.clipboard.writeText('G-XXXXXXXXXX');
    toast.success('Exemplo copiado!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100">
        {/* Clean Header */}
        <div className="text-center pt-8 pb-6 px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Google Analytics</h2>
          <p className="text-gray-500">{blogName}</p>
        </div>

        <div className="px-6 pb-8">
          {/* Simple Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cole seu ID do Google Analytics
              </label>
              <input
                type="text"
                value={analyticsId}
                onChange={(e) => setAnalyticsId(e.target.value.toUpperCase())}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center text-lg transition-all"
                autoFocus
              />
              <p className="text-xs text-gray-400 text-center mt-2">
                Formato: G- seguido de 10 caracteres
              </p>
            </div>

            {/* Simple Help Link */}
            <div className="text-center">
              <button
                onClick={() => setShowHelper(!showHelper)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Onde encontrar meu ID?
              </button>
            </div>

            {/* Simplified Helper */}
            {showHelper && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-medium">📍 3 passos simples:</p>
                  <div className="space-y-1 text-blue-700">
                    <p><strong>1.</strong> Acesse <a href="https://analytics.google.com" target="_blank" className="underline">analytics.google.com</a></p>
                    <p><strong>2.</strong> Vá em Admin → Propriedade → Configurações</p>
                    <p><strong>3.</strong> Copie o "ID de mensuração" (G-...)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clean Action Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !analyticsId.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Conectando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Conectar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};