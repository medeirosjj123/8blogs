import React, { useState } from 'react';
import api from '../../services/api';
import {
  Plus,
  Server,
  Globe,
  Lock,
  Loader2,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WordPressAddProps {
  onClose: () => void;
}

export const WordPressAdd: React.FC<WordPressAddProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    domain: '',
    vpsHost: '',
    vpsPort: '22',
    vpsUsername: 'root',
    vpsPassword: ''
  });
  
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState<{
    success: boolean;
    credentials?: {
      username: string;
      password: string;
      adminUrl: string;
    };
    message?: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.domain.trim()) {
      newErrors.domain = 'Domínio é obrigatório';
    }
    
    if (!formData.vpsHost.trim()) {
      newErrors.vpsHost = 'IP do servidor é obrigatório';
    }
    
    if (!formData.vpsUsername.trim()) {
      newErrors.vpsUsername = 'Usuário é obrigatório';
    }
    
    if (!formData.vpsPassword.trim()) {
      newErrors.vpsPassword = 'Senha é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    
    setIsAdding(true);
    setAddResult(null);
    
    try {
      // Clean domain
      let cleanDomain = formData.domain.trim().toLowerCase();
      cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
      cleanDomain = cleanDomain.replace(/^www\./, '');
      cleanDomain = cleanDomain.replace(/\/$/, '');
      
      const response = await api.post('/sites/add-wordpress', {
        domain: cleanDomain,
        vpsConfig: {
          host: formData.vpsHost,
          port: parseInt(formData.vpsPort),
          username: formData.vpsUsername,
          password: formData.vpsPassword,
          authMethod: 'password'
        }
      });
      
      if (response.data.success) {
        setAddResult({
          success: true,
          credentials: response.data.credentials,
          message: response.data.message
        });
        toast.success('Site WordPress adicionado com sucesso!');
      } else {
        throw new Error(response.data.message || 'Erro ao adicionar site');
      }
    } catch (error: any) {
      console.error('Error adding WordPress:', error);
      setAddResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao adicionar site'
      });
      toast.error(error.response?.data?.message || error.message || 'Erro ao adicionar site');
    } finally {
      setIsAdding(false);
    }
  };

  if (addResult?.success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            Site Adicionado com Sucesso!
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Content */}
        <div className="p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              WordPress Instalado!
            </h4>
            <p className="text-gray-600 mb-6">
              O site {formData.domain} foi adicionado ao servidor
            </p>
            
            {addResult.credentials && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h5 className="font-semibold text-gray-900 mb-3">Credenciais de Acesso:</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admin URL:</span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {addResult.credentials.adminUrl}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Usuário:</span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {addResult.credentials.username}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Senha:</span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {addResult.credentials.password}
                    </code>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 Lembre-se de configurar o DNS do domínio para apontar para o IP {formData.vpsHost}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-tatame-red text-white rounded-lg hover:bg-tatame-red-dark transition-colors font-medium"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">
          Adicionar Site WordPress
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Info Box */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Use esta ferramenta para adicionar sites ADICIONAIS em um VPS que já tem WordPress instalado.
            Para primeira instalação, use "Instalar WordPress".
          </p>
        </div>

        {/* Domain */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            Domínio do Novo Site *
          </label>
          <input
            type="text"
            value={formData.domain}
            onChange={(e) => {
              setFormData({ ...formData, domain: e.target.value });
              setErrors({ ...errors, domain: '' });
            }}
            placeholder="exemplo.com.br"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.domain ? 'border-red-500' : 'border-gray-200'
            } focus:border-tatame-red focus:ring-2 focus:ring-tatame-red/20 transition-colors`}
          />
          {errors.domain && (
            <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
          )}
        </div>

        {/* VPS Host */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Server className="w-4 h-4" />
            IP do Servidor VPS *
          </label>
          <input
            type="text"
            value={formData.vpsHost}
            onChange={(e) => {
              setFormData({ ...formData, vpsHost: e.target.value });
              setErrors({ ...errors, vpsHost: '' });
            }}
            placeholder="192.168.1.100"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.vpsHost ? 'border-red-500' : 'border-gray-200'
            } focus:border-tatame-red focus:ring-2 focus:ring-tatame-red/20 transition-colors`}
          />
          {errors.vpsHost && (
            <p className="mt-1 text-sm text-red-600">{errors.vpsHost}</p>
          )}
        </div>

        {/* Port and Username */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Porta SSH
            </label>
            <input
              type="text"
              value={formData.vpsPort}
              onChange={(e) => setFormData({ ...formData, vpsPort: e.target.value })}
              placeholder="22"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-tatame-red focus:ring-2 focus:ring-tatame-red/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Usuário SSH *
            </label>
            <input
              type="text"
              value={formData.vpsUsername}
              onChange={(e) => {
                setFormData({ ...formData, vpsUsername: e.target.value });
                setErrors({ ...errors, vpsUsername: '' });
              }}
              placeholder="root"
              className={`w-full px-4 py-3 rounded-lg border-2 ${
                errors.vpsUsername ? 'border-red-500' : 'border-gray-200'
              } focus:border-tatame-red focus:ring-2 focus:ring-tatame-red/20 transition-colors`}
            />
            {errors.vpsUsername && (
              <p className="mt-1 text-sm text-red-600">{errors.vpsUsername}</p>
            )}
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Lock className="w-4 h-4" />
            Senha SSH *
          </label>
          <input
            type="password"
            value={formData.vpsPassword}
            onChange={(e) => {
              setFormData({ ...formData, vpsPassword: e.target.value });
              setErrors({ ...errors, vpsPassword: '' });
            }}
            placeholder="••••••••"
            className={`w-full px-4 py-3 rounded-lg border-2 ${
              errors.vpsPassword ? 'border-red-500' : 'border-gray-200'
            } focus:border-tatame-red focus:ring-2 focus:ring-tatame-red/20 transition-colors`}
          />
          {errors.vpsPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.vpsPassword}</p>
          )}
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 Este comando criará um novo site WordPress no servidor usando WordOps. 
            O servidor precisa ter WordOps já instalado.
          </p>
        </div>

        {/* Error Message */}
        {addResult && !addResult.success && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{addResult.message}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adicionando Site...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Adicionar Site
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};