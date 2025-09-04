import React, { useState } from 'react';
import { X, Link, Globe } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface AddExistingBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BlogFormData {
  name: string;
  url: string;
  username: string;
  applicationPassword: string;
  googleAnalyticsId?: string;
}

export const AddExistingBlogModal: React.FC<AddExistingBlogModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<BlogFormData>({
    name: '',
    url: '',
    username: '',
    applicationPassword: '',
    googleAnalyticsId: ''
  });
  const [errors, setErrors] = useState<any>({});
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    // Reset errors
    setErrors({});

    // Basic validation
    if (!formData.url || !formData.username || !formData.applicationPassword) {
      const newErrors: any = {};
      if (!formData.url) newErrors.url = 'URL é obrigatória';
      if (!formData.username) newErrors.username = 'Usuário é obrigatório';
      if (!formData.applicationPassword) newErrors.applicationPassword = 'Senha de aplicação é obrigatória';
      setErrors(newErrors);
      return;
    }

    setIsConnecting(true);
    
    try {
      const response = await api.post('/api/sites/existing', formData);
      const result = response.data;

      if (result.success) {
        toast.success('🎉 Blog conectado com sucesso!');
        onSuccess();
        onClose();
        setFormData({
          name: '',
          url: '',
          username: '',
          applicationPassword: '',
          googleAnalyticsId: ''
        });
      } else {
        const message = result.message || 'Falha na conexão. Verifique suas credenciais.';
        if (message.includes('já está registrado')) {
          setErrors({ 
            url: '⚠️ Este blog já está registrado na plataforma. Você já pode vê-lo no seu dashboard.' 
          });
        } else {
          setErrors({ 
            applicationPassword: message 
          });
        }
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      const message = error.response?.data?.message || 'Erro ao conectar. Tente novamente.';
      setErrors({ 
        applicationPassword: message
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100">
        {/* Clean Header */}
        <div className="text-center pt-8 pb-6 px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-coral/90 to-coral rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Conectar Blog WordPress</h2>
          <p className="text-gray-500">Adicione seu blog existente em segundos</p>
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL do seu blog *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://meublog.com.br"
              className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-coral focus:border-coral transition-all ${
                errors.url ? 'border-red-300' : 'border-gray-200'
              }`}
              autoFocus
            />
            {errors.url && <p className="text-red-500 text-sm mt-2">{errors.url}</p>}
          </div>

          {/* Blog Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do blog (opcional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Será detectado automaticamente"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral focus:border-coral transition-all"
            />
          </div>

          {/* WordPress Credentials */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Credenciais WordPress</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário WordPress *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="admin"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral transition-all ${
                  errors.username ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Aplicação *
              </label>
              <input
                type="password"
                value={formData.applicationPassword}
                onChange={(e) => setFormData({ ...formData, applicationPassword: e.target.value })}
                placeholder="xxxx xxxx xxxx xxxx"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral font-mono transition-all ${
                  errors.applicationPassword ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {errors.applicationPassword && <p className="text-red-500 text-sm mt-1">{errors.applicationPassword}</p>}
              <p className="text-xs text-gray-500 mt-1">
                💡 Mais seguro que sua senha normal • Pode ser revogada a qualquer momento
              </p>
            </div>
          </div>

          {/* Google Analytics (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Analytics ID (opcional)
            </label>
            <input
              type="text"
              value={formData.googleAnalyticsId}
              onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value.toUpperCase() })}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral focus:border-coral font-mono transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">Para ver estatísticas no dashboard</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || !formData.url || !formData.username || !formData.applicationPassword}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-coral to-coral/90 hover:from-coral-dark hover:to-coral text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Conectando...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  Conectar Blog
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};