import React, { useState } from 'react';
import { X, Link, Globe } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { debugLogger } from '../../utils/debugLogger';

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
    debugLogger.info('EXISTING_BLOG_MODAL', 'Starting blog connection process', { 
      modal: 'AddExistingBlogModal',
      formData: {
        name: formData.name,
        url: formData.url,
        username: formData.username,
        hasPassword: !!formData.applicationPassword,
        googleAnalyticsId: formData.googleAnalyticsId
      }
    });

    // Reset errors
    setErrors({});

    // Basic validation
    if (!formData.url || !formData.username || !formData.applicationPassword) {
      const newErrors: any = {};
      if (!formData.url) newErrors.url = 'URL é obrigatória';
      if (!formData.username) newErrors.username = 'Usuário é obrigatório';
      if (!formData.applicationPassword) newErrors.applicationPassword = 'Senha de aplicação é obrigatória';
      
      debugLogger.warning('EXISTING_BLOG_MODAL', 'Form validation failed', { 
        errors: newErrors,
        formData: {
          url: !!formData.url,
          username: !!formData.username,
          applicationPassword: !!formData.applicationPassword
        }
      });
      
      setErrors(newErrors);
      return;
    }

    setIsConnecting(true);
    debugLogger.info('EXISTING_BLOG_MODAL', 'Form validation passed, making API call', {
      endpoint: '/api/sites/existing',
      method: 'POST'
    });

    const startTime = Date.now();
    let requestId: string | undefined;
    
    try {
      // Log the API call with sanitized data
      requestId = debugLogger.logApiCall('/api/sites/existing', 'POST', {
        ...formData,
        applicationPassword: '[REDACTED]' // Don't log sensitive data
      });

      const response = await api.post('/api/sites/existing', formData);
      const result = response.data;
      const duration = Date.now() - startTime;

      debugLogger.logApiResponse(requestId, result, response.status, duration);

      debugLogger.info('EXISTING_BLOG_MODAL', 'API response received', { 
        success: result.success,
        hasMessage: !!result.message,
        responseKeys: Object.keys(result),
        duration
      }, requestId);

      if (result.success) {
        debugLogger.success('EXISTING_BLOG_MODAL', 'Blog connected successfully', {
          url: formData.url,
          name: formData.name
        }, requestId);

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
        
        debugLogger.warning('EXISTING_BLOG_MODAL', 'API returned success=false', { 
          message,
          result
        }, requestId);

        if (message.includes('já está registrado')) {
          debugLogger.info('EXISTING_BLOG_MODAL', 'Blog already registered error', {
            url: formData.url
          }, requestId);
          
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
      const duration = Date.now() - startTime;
      
      if (requestId) {
        debugLogger.logApiError(requestId, error, duration);
      }

      debugLogger.error('EXISTING_BLOG_MODAL', 'Connection error occurred', {
        error: {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        },
        url: formData.url,
        duration
      }, requestId);

      console.error('Connection error:', error);
      const message = error.response?.data?.message || 'Erro ao conectar. Tente novamente.';
      setErrors({ 
        applicationPassword: message
      });
    } finally {
      setIsConnecting(false);
      debugLogger.info('EXISTING_BLOG_MODAL', 'Connection process completed', {
        isConnecting: false
      }, requestId);
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