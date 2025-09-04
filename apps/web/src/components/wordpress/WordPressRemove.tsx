import React, { useState } from 'react';
import api from '../../services/api';
import {
  Trash2,
  Server,
  Globe,
  Lock,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WordPressRemoveProps {
  onClose: () => void;
}

export const WordPressRemove: React.FC<WordPressRemoveProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    domain: '',
    vpsHost: '',
    vpsPort: '22',
    vpsUsername: 'root',
    vpsPassword: ''
  });
  
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmDomain, setConfirmDomain] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handleRemove = async () => {
    if (!validateForm()) return;
    
    // Show confirmation dialog
    setShowConfirm(true);
  };

  const executeRemoval = async () => {
    if (confirmDomain !== formData.domain) {
      toast.error('O domínio de confirmação não corresponde');
      return;
    }
    
    setIsRemoving(true);
    
    try {
      const response = await api.post('/api/sites/remove-wordpress', {
        domain: formData.domain.trim().toLowerCase(),
        vpsConfig: {
          host: formData.vpsHost,
          port: parseInt(formData.vpsPort),
          username: formData.vpsUsername,
          password: formData.vpsPassword,
          authMethod: 'password'
        }
      });
      
      if (response.data.success) {
        toast.success('WordPress removido com sucesso!');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Erro ao remover WordPress');
      }
    } catch (error: any) {
      console.error('Error removing WordPress:', error);
      toast.error(error.response?.data?.message || error.message || 'Erro ao remover WordPress');
      setIsRemoving(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Confirmar Remoção
          </h3>
          <button
            onClick={() => setShowConfirm(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold mb-2">
              ⚠️ ATENÇÃO: Esta ação é irreversível!
            </p>
            <p className="text-red-700 text-sm">
              Todo o site WordPress, incluindo banco de dados, arquivos e configurações serão permanentemente removidos.
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Para confirmar a remoção do site <strong>{formData.domain}</strong>, 
              digite o domínio abaixo:
            </p>
            <input
              type="text"
              value={confirmDomain}
              onChange={(e) => setConfirmDomain(e.target.value)}
              placeholder={formData.domain}
              className="w-full px-4 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors"
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={executeRemoval}
              disabled={isRemoving || confirmDomain !== formData.domain}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Confirmar Remoção
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">
          Remover WordPress
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
        {/* Domain */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            Domínio do Site *
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

        {/* Warning */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Certifique-se de ter um backup antes de remover o site. Esta ação não pode ser desfeita.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Remover WordPress
          </button>
        </div>
      </div>
    </div>
  );
};