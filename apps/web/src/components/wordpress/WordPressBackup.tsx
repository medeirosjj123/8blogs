import React, { useState } from 'react';
import api from '../../services/api';
import {
  Download,
  Server,
  Globe,
  Lock,
  Loader2,
  CheckCircle,
  X,
  Archive
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WordPressBackupProps {
  onClose: () => void;
}

export const WordPressBackup: React.FC<WordPressBackupProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    domain: '',
    vpsHost: '',
    vpsPort: '22',
    vpsUsername: 'root',
    vpsPassword: ''
  });
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{
    success: boolean;
    backupPath?: string;
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

  const handleBackup = async () => {
    if (!validateForm()) return;
    
    setIsBackingUp(true);
    setBackupResult(null);
    
    try {
      const response = await api.post('/api/sites/backup-wordpress', {
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
        setBackupResult({
          success: true,
          backupPath: response.data.backupPath,
          message: response.data.message
        });
        toast.success('Backup criado com sucesso!');
      } else {
        throw new Error(response.data.message || 'Erro ao criar backup');
      }
    } catch (error: any) {
      console.error('Error creating backup:', error);
      setBackupResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao criar backup'
      });
      toast.error(error.response?.data?.message || error.message || 'Erro ao criar backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  if (backupResult?.success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            Backup Concluído
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
              Backup Criado com Sucesso!
            </h4>
            <p className="text-gray-600 mb-6">
              O backup do site {formData.domain} foi criado
            </p>
            
            {backupResult.backupPath && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Local do backup no servidor:</p>
                <code className="bg-white px-3 py-2 rounded border border-gray-200 text-sm block">
                  {backupResult.backupPath}
                </code>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Como acessar o backup:</h5>
              <ol className="text-left text-sm text-blue-800 space-y-1">
                <li>1. Conecte ao servidor via SSH</li>
                <li>2. Navegue até o diretório: <code className="bg-blue-100 px-1 rounded">/backup</code></li>
                <li>3. Use SCP ou SFTP para baixar o arquivo</li>
                <li>4. O backup inclui arquivos e banco de dados</li>
              </ol>
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
          Backup WordPress
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

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 O backup incluirá todos os arquivos do WordPress e o banco de dados. 
            O arquivo será salvo no servidor em /backup/
          </p>
        </div>

        {/* Error Message */}
        {backupResult && !backupResult.success && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{backupResult.message}</p>
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
            onClick={handleBackup}
            disabled={isBackingUp}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando Backup...
              </>
            ) : (
              <>
                <Archive className="w-5 h-5" />
                Criar Backup
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};