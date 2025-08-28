import React from 'react';
import { CheckCircle, RefreshCw, Send, X } from 'lucide-react';

interface ReviewSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWriteAnother: () => void;
  onReviewAndPublish: () => void;
  reviewTitle: string;
}

export const ReviewSuccessModal: React.FC<ReviewSuccessModalProps> = ({
  isOpen,
  onClose,
  onWriteAnother,
  onReviewAndPublish,
  reviewTitle
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Review Gerado com Sucesso! 🎉
          </h2>
          <p className="text-gray-600">
            "{reviewTitle}" foi criado e está pronto para publicação.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={onReviewAndPublish}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Send size={20} />
            Revisar e Publicar
          </button>
          
          <button
            onClick={onWriteAnother}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} />
            Escrever Outro Post
          </button>
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Ao escolher "Revisar e Publicar", você será redirecionado para o editor do WordPress onde poderá fazer ajustes finais antes de publicar.
        </p>
      </div>
    </div>
  );
};