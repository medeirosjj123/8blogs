import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Database,
  Lock,
  Mail,
  Cloud,
  CreditCard,
  Globe,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Power,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Wand2,
  Shield,
  Key
} from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import toast from 'react-hot-toast';

interface EnvConfig {
  _id: string;
  key: string;
  value?: string;
  category: string;
  description?: string;
  isSecret: boolean;
  isRequired: boolean;
  isActive: boolean;
  defaultValue?: string;
  validation?: {
    type: string;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

const CATEGORY_ICONS = {
  database: Database,
  auth: Lock,
  email: Mail,
  storage: Cloud,
  payment: CreditCard,
  api: Key,
  general: Settings,
  custom: Globe
};

const CATEGORY_LABELS = {
  database: 'Database',
  auth: 'Autenticação',
  email: 'Email',
  storage: 'Armazenamento',
  payment: 'Pagamentos',
  api: 'API Keys',
  general: 'Geral',
  custom: 'Personalizado'
};

export default function EnvSettings() {
  const [activeCategory, setActiveCategory] = useState('database');
  const [showForm, setShowForm] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvConfig | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch environment configurations
  const { data: envConfigs = {}, isLoading } = useQuery({
    queryKey: ['admin-env-configs'],
    queryFn: () => adminService.getEnvConfigs({ includeValues: true })
  });

  // Initialize default configs
  const initializeMutation = useMutation({
    mutationFn: () => adminService.initializeEnvConfigs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-env-configs'] });
      toast.success('Configurações padrão inicializadas');
    }
  });

  // Initialize AI configs specifically
  const initializeAiConfigs = async () => {
    const aiVars = [
      { key: 'OPENAI_API_KEY', value: '', category: 'api', description: 'OpenAI API key', isSecret: true },
      { key: 'OPENAI_MODEL', value: 'gpt-4o-mini', category: 'api', description: 'OpenAI model', isSecret: false },
      { key: 'GEMINI_API_KEY', value: '', category: 'api', description: 'Google Gemini API key', isSecret: true },
      { key: 'GEMINI_MODEL', value: 'gemini-1.5-flash', category: 'api', description: 'Gemini model', isSecret: false }
    ];

    for (const config of aiVars) {
      const existing = envConfigs.api?.find((c: EnvConfig) => c.key === config.key);
      if (!existing) {
        await saveMutation.mutateAsync({ key: config.key, data: config });
      }
    }
    toast.success('AI API variables initialized');
  };

  // Save env variable
  const saveMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: any }) =>
      adminService.upsertEnvConfig(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-env-configs'] });
      toast.success('Variável de ambiente salva');
      setShowForm(false);
      setEditingVar(null);
    }
  });

  // Delete env variable
  const deleteMutation = useMutation({
    mutationFn: (key: string) => adminService.deleteEnvConfig(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-env-configs'] });
      toast.success('Variável de ambiente removida');
    }
  });

  // Sync .env file
  const syncMutation = useMutation({
    mutationFn: () => adminService.syncEnvFile(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-env-configs'] });
      toast.success(`Arquivo .env sincronizado (${result.syncedCount} alterações)`);
    }
  });

  // Restart application
  const restartMutation = useMutation({
    mutationFn: () => adminService.restartApplication(),
    onSuccess: () => {
      toast.success('Sinal de reinício enviado');
      setShowRestartDialog(false);
    }
  });

  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: 'custom',
    description: '',
    isSecret: false,
    isRequired: false,
    defaultValue: '',
    validation: {
      type: 'string',
      min: undefined,
      max: undefined,
      pattern: ''
    }
  });

  const resetForm = () => {
    setFormData({
      key: '',
      value: '',
      category: 'custom',
      description: '',
      isSecret: false,
      isRequired: false,
      defaultValue: '',
      validation: {
        type: 'string',
        min: undefined,
        max: undefined,
        pattern: ''
      }
    });
  };

  const handleEdit = (envVar: EnvConfig) => {
    setFormData({
      key: envVar.key,
      value: envVar.value || '',
      category: envVar.category,
      description: envVar.description || '',
      isSecret: envVar.isSecret,
      isRequired: envVar.isRequired,
      defaultValue: envVar.defaultValue || '',
      validation: envVar.validation || {
        type: 'string',
        min: undefined,
        max: undefined,
        pattern: ''
      }
    });
    setEditingVar(envVar);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.key) {
      toast.error('Nome da variável é obrigatório');
      return;
    }

    const dataToSave = {
      ...formData,
      key: formData.key.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    };

    saveMutation.mutate({ key: dataToSave.key, data: dataToSave });
  };

  const toggleSecretVisibility = (key: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleSecrets(newVisible);
  };

  const categories = Object.keys(envConfigs).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-coral" />
              Variáveis de Ambiente
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie configurações do sistema sem editar código
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              {initializeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Inicializar
            </button>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sincronizar .env
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingVar(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Variável
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-slate-800 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {categories.map((category) => {
              const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Globe;
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-coral text-coral'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <IconComponent className="w-4 h-4 inline mr-2" />
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                  <span className="ml-2 text-xs bg-slate-700 px-2 py-1 rounded">
                    {envConfigs[category]?.length || 0}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Environment Variables List */}
        <div className="space-y-3">
          {/* Show helper for API category */}
          {activeCategory === 'api' && (!envConfigs.api?.length || !envConfigs.api?.find((c: EnvConfig) => c.key === 'OPENAI_API_KEY')) && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
              <p className="text-slate-400 mb-3">No AI API configurations found</p>
              <button
                onClick={initializeAiConfigs}
                className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2 mx-auto"
              >
                <Wand2 className="w-4 h-4" />
                Initialize AI Variables
              </button>
            </div>
          )}

          {envConfigs[activeCategory]?.map((envVar: EnvConfig) => (
            <div
              key={envVar.key}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-coral font-mono text-sm font-semibold">
                      {envVar.key}
                    </code>
                    {envVar.isRequired && (
                      <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                        Obrigatório
                      </span>
                    )}
                    {envVar.isSecret && (
                      <Shield className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  
                  {envVar.description && (
                    <p className="text-sm text-slate-400 mb-2">
                      {envVar.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    {envVar.isSecret ? (
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded text-slate-300">
                          {visibleSecrets.has(envVar.key) 
                            ? envVar.value || '(não definido)'
                            : '••••••••'
                          }
                        </code>
                        <button
                          onClick={() => toggleSecretVisibility(envVar.key)}
                          className="text-slate-400 hover:text-white"
                        >
                          {visibleSecrets.has(envVar.key) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <code className="text-sm bg-slate-900 px-2 py-1 rounded text-slate-300">
                        {envVar.value || envVar.defaultValue || '(não definido)'}
                      </code>
                    )}
                  </div>

                  {envVar.validation && (
                    <div className="text-xs text-slate-500 mt-1">
                      Tipo: {envVar.validation.type}
                      {envVar.validation.min && ` | Min: ${envVar.validation.min}`}
                      {envVar.validation.max && ` | Max: ${envVar.validation.max}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(envVar)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!envVar.isRequired && (
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover esta variável?')) {
                          deleteMutation.mutate(envVar.key);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!envConfigs[activeCategory]?.length && (
            <div className="text-center py-8 text-slate-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma variável encontrada nesta categoria</p>
            </div>
          )}
        </div>

        {/* Restart Warning */}
        {Object.keys(envConfigs).some(cat => 
          envConfigs[cat].some((v: EnvConfig) => v.isRequired && !v.value)
        ) && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">
                Algumas variáveis obrigatórias não estão definidas. 
                A aplicação pode não funcionar corretamente.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            <p>Alterações nas variáveis de ambiente requerem reinicialização da aplicação</p>
          </div>
          <button
            onClick={() => setShowRestartDialog(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            Reiniciar Aplicação
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-semibold text-white">
                {editingVar ? 'Editar Variável' : 'Nova Variável'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingVar(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome da Variável *
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
                    })}
                    disabled={!!editingVar}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50 font-mono"
                    placeholder="MINHA_VARIAVEL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Valor
                </label>
                <input
                  type={formData.isSecret ? 'password' : 'text'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Valor da variável"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Descrição da variável"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isSecret}
                    onChange={(e) => setFormData({ ...formData, isSecret: e.target.checked })}
                    className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">É sensível/secreta</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">Obrigatória</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVar(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restart Confirmation Dialog */}
      {showRestartDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 rounded-lg max-w-md w-full border border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Power className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-white">
                Reiniciar Aplicação
              </h3>
            </div>
            <p className="text-slate-400 mb-6">
              Tem certeza que deseja reiniciar a aplicação? Isso aplicará todas as 
              alterações nas variáveis de ambiente e pode causar uma breve interrupção.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRestartDialog(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => restartMutation.mutate()}
                disabled={restartMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {restartMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}