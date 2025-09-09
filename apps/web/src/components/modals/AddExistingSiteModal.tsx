import React, { useState } from 'react';
import { X, Globe, User, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UpgradePrompt } from '../UpgradePrompt';
import { useUsage } from '../../hooks/useUsage';
import { debugLogger } from '../../utils/debugLogger';

interface AddExistingSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSiteAdded?: () => void;
}

export const AddExistingSiteModal: React.FC<AddExistingSiteModalProps> = ({
  isOpen,
  onClose,
  onSiteAdded
}) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    applicationPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Usage hook for upgrade prompt
  const { 
    usage,
    showUpgradePrompt,
    upgradePromptType,
    handleUpgradePromptClose,
    showUpgradePromptFor
  } = useUsage();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do site é obrigatório';
    }
    
    if (!formData.url.trim()) {
      newErrors.url = 'URL é obrigatória';
    } else if (!/^https?:\/\/.+/.test(formData.url.trim())) {
      newErrors.url = 'URL deve começar com http:// ou https://';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Usuário é obrigatório';
    }
    
    if (!formData.applicationPassword.trim()) {
      newErrors.applicationPassword = 'Application Password é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    debugLogger.info('EXISTING_SITE_MODAL', 'Starting WordPress site addition process', { 
      modal: 'AddExistingSiteModal',
      formData: {
        name: formData.name.trim(),
        url: formData.url.trim(),
        username: formData.username.trim(),
        hasPassword: !!formData.applicationPassword,
        isDefault: false
      }
    });

    if (!validateForm()) {
      debugLogger.warning('EXISTING_SITE_MODAL', 'Form validation failed', {
        errors,
        formData: {
          hasName: !!formData.name.trim(),
          hasUrl: !!formData.url.trim(),
          hasUsername: !!formData.username.trim(),
          hasPassword: !!formData.applicationPassword.trim()
        }
      });
      return;
    }

    debugLogger.info('EXISTING_SITE_MODAL', 'Form validation passed, making API call', {
      endpoint: '/api/wordpress/sites',
      method: 'POST'
    });
    
    setIsLoading(true);
    const startTime = Date.now();
    let requestId: string | undefined;
    
    try {
      // Log the API call with sanitized data
      requestId = debugLogger.logApiCall('/api/wordpress/sites', 'POST', {
        name: formData.name.trim(),
        url: formData.url.trim(),
        username: formData.username.trim(),
        applicationPassword: '[REDACTED]', // Don't log sensitive data
        isDefault: false
      });

      const response = await api.post('/api/wordpress/sites', {
        name: formData.name.trim(),
        url: formData.url.trim(),
        username: formData.username.trim(),
        applicationPassword: formData.applicationPassword.trim(),
        isDefault: false
      });

      const duration = Date.now() - startTime;
      debugLogger.logApiResponse(requestId, response.data, response.status, duration);

      debugLogger.info('EXISTING_SITE_MODAL', 'API response received', { 
        success: response.data.success,
        hasMessage: !!response.data.message,
        hasData: !!response.data.data,
        responseKeys: Object.keys(response.data),
        duration
      }, requestId);
      
      if (response.data.success) {
        debugLogger.success('EXISTING_SITE_MODAL', 'WordPress site added successfully', {
          url: formData.url.trim(),
          name: formData.name.trim(),
          siteId: response.data.data?._id
        }, requestId);

        toast.success('Site WordPress adicionado com sucesso!');
        setFormData({ name: '', url: '', username: '', applicationPassword: '' });
        setErrors({});
        onSiteAdded?.();
        onClose();
      } else {
        debugLogger.warning('EXISTING_SITE_MODAL', 'API returned success=false', { 
          message: response.data.message,
          responseData: response.data
        }, requestId);

        throw new Error(response.data.message || 'Erro ao adicionar site');
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (requestId) {
        debugLogger.logApiError(requestId, error, duration);
      }

      debugLogger.error('EXISTING_SITE_MODAL', 'Error adding WordPress site', {
        error: {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        },
        url: formData.url.trim(),
        duration
      }, requestId);

      console.error('Error adding WordPress site:', error);
      
      // Handle blog limit error (429 status)
      if (error.response?.status === 429 && error.response?.data?.limitInfo) {
        debugLogger.warning('EXISTING_SITE_MODAL', 'Blog limit exceeded', {
          limitInfo: error.response.data.limitInfo
        }, requestId);

        showUpgradePromptFor('blogs');
        setIsLoading(false);
        return;
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao adicionar site';
      toast.error(errorMessage);
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
      debugLogger.info('EXISTING_SITE_MODAL', 'WordPress site addition process completed', {
        isLoading: false
      }, requestId);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Adicionar Blog Existente</h3>
            <p className="text-sm text-gray-600">Conecte seu site WordPress existente</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{errors.general}</span>
            </div>
          )}

          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Site
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Meu Blog Incrível"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Site URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL do Site
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://meublog.com"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral ${
                errors.url ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.url && (
              <p className="mt-1 text-sm text-red-600">{errors.url}</p>
            )}
          </div>

          {/* WordPress Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuário WordPress
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="admin"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral ${
                  errors.username ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {/* Application Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={formData.applicationPassword}
                onChange={(e) => handleInputChange('applicationPassword', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral ${
                  errors.applicationPassword ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.applicationPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.applicationPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Crie uma Application Password em WordPress Admin → Usuários → Perfil → Application Passwords
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Adicionar Site
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={handleUpgradePromptClose}
        limitType={upgradePromptType}
        currentPlan={usage?.plan || 'starter'}
        used={usage?.usage?.blogs?.used || 0}
        limit={usage?.usage?.blogs?.limit || 1}
      />
    </div>
  );
};