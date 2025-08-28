import React, { useState } from 'react';
import { Globe, ExternalLink, X, Loader2, CheckCircle } from 'lucide-react';

interface WordPressSite {
  _id: string;
  name: string;
  url: string;
  username: string;
  isActive: boolean;
  isDefault?: boolean;
}

interface WordPressSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: WordPressSite[];
  onPublish: (siteId: string) => void;
  isPublishing: boolean;
  reviewTitle: string;
  isLoading?: boolean;
  error?: any;
}

export const WordPressSiteModal: React.FC<WordPressSiteModalProps> = ({
  isOpen,
  onClose,
  sites,
  onPublish,
  isPublishing,
  reviewTitle,
  isLoading = false,
  error = null
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  // Reset selected site when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedSiteId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePublish = () => {
    if (selectedSiteId) {
      onPublish(selectedSiteId);
    }
  };

  const activeSites = sites.filter(site => site.isActive === true);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isPublishing}
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Escolher Site WordPress
          </h2>
          <p className="text-gray-600">
            Selecione o site onde deseja criar o rascunho de "{reviewTitle}"
          </p>
        </div>

        {/* Sites list */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Carregando sites WordPress...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">
              Erro ao carregar sites WordPress
            </p>
            <p className="text-sm text-gray-400">
              {error.message || 'Tente novamente em alguns instantes'}
            </p>
          </div>
        ) : activeSites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Nenhum site WordPress configurado.
            </p>
            <p className="text-sm text-gray-400">
              Configure um site em Ferramentas → Instalador WordPress
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {activeSites.map((site) => (
              <label
                key={site._id}
                className={`block p-4 border rounded-xl cursor-pointer transition-all hover:border-blue-300 ${
                  selectedSiteId === site._id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="wordpress-site"
                  value={site._id}
                  checked={selectedSiteId === site._id}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="sr-only"
                  disabled={isPublishing}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedSiteId === site._id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedSiteId === site._id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{site.name}</h3>
                      <p className="text-sm text-gray-500">{site.url}</p>
                      <p className="text-xs text-gray-400">Usuário: {site.username}</p>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-gray-400" />
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {activeSites.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPublishing}
              className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={!selectedSiteId || isPublishing}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Criando Rascunho...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Criar Rascunho
                </>
              )}
            </button>
          </div>
        )}

        {/* Info text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          O post será criado como rascunho no WordPress. Você será redirecionado para o editor onde poderá revisar e publicar.
        </p>
      </div>
    </div>
  );
};