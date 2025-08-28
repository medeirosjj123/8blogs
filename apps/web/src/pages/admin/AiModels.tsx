import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Power, 
  Star, 
  Shield,
  DollarSign,
  Cpu,
  Save,
  X
} from 'lucide-react';
import { api } from '../../services/api';

interface AiModel {
  _id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  modelId: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
  description?: string;
}

export const AiModels: React.FC = () => {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai' as 'openai' | 'gemini' | 'anthropic',
    modelId: '',
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    maxTokens: 2000,
    temperature: 0.7,
    description: ''
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await api.get('/admin/ai-models');
      if (response.data.success) {
        setModels(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching AI models:', error);
      toast.error('Erro ao carregar modelos de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingModel) {
        // Update existing model
        const response = await api.put(`/admin/ai-models/${editingModel._id}`, formData);
        if (response.data.success) {
          toast.success('Modelo atualizado com sucesso!');
          fetchModels();
          handleCloseModal();
        }
      } else {
        // Create new model
        const response = await api.post('/admin/ai-models', formData);
        if (response.data.success) {
          toast.success('Modelo criado com sucesso!');
          fetchModels();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving model:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar modelo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    
    try {
      const response = await api.delete(`/admin/ai-models/${id}`);
      if (response.data.success) {
        toast.success('Modelo excluído com sucesso!');
        fetchModels();
      }
    } catch (error: any) {
      console.error('Error deleting model:', error);
      toast.error(error.response?.data?.error || 'Erro ao excluir modelo');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/toggle-status`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchModels();
      }
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/set-primary`);
      if (response.data.success) {
        toast.success('Modelo definido como primário!');
        fetchModels();
      }
    } catch (error: any) {
      console.error('Error setting primary:', error);
      toast.error(error.response?.data?.error || 'Erro ao definir como primário');
    }
  };

  const handleSetFallback = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/set-fallback`);
      if (response.data.success) {
        toast.success('Modelo definido como fallback!');
        fetchModels();
      }
    } catch (error: any) {
      console.error('Error setting fallback:', error);
      toast.error(error.response?.data?.error || 'Erro ao definir como fallback');
    }
  };

  const handleEdit = (model: AiModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      inputCostPer1k: model.inputCostPer1k,
      outputCostPer1k: model.outputCostPer1k,
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      description: model.description || ''
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingModel(null);
    setFormData({
      name: '',
      provider: 'openai',
      modelId: '',
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      maxTokens: 2000,
      temperature: 0.7,
      description: ''
    });
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'text-green-400';
      case 'gemini': return 'text-blue-400';
      case 'anthropic': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-coral" />
            Gerenciamento de Modelos IA
          </h1>
          <p className="text-slate-400">Adicione, remova e configure modelos de IA customizados</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Adicionar Modelo
        </button>
      </div>

      {/* Models List */}
      <div className="grid gap-4">
        {models.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center border border-slate-800">
            <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nenhum modelo configurado</p>
            <p className="text-sm text-slate-500 mt-2">Clique em "Adicionar Modelo" para começar</p>
          </div>
        ) : (
          models.map((model) => (
            <div
              key={model._id}
              className={`bg-slate-900 rounded-lg p-6 border ${
                !model.isActive ? 'border-slate-800 opacity-60' : 
                model.isPrimary ? 'border-green-500/50' : 
                model.isFallback ? 'border-yellow-500/50' : 
                'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{model.name}</h3>
                    <span className={`text-sm font-medium ${getProviderColor(model.provider)}`}>
                      {model.provider.toUpperCase()}
                    </span>
                    <code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                      {model.modelId}
                    </code>
                    {model.isPrimary && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Primário
                      </span>
                    )}
                    {model.isFallback && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Fallback
                      </span>
                    )}
                    {!model.isActive && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg">
                        Inativo
                      </span>
                    )}
                  </div>
                  
                  {model.description && (
                    <p className="text-sm text-slate-400 mb-3">{model.description}</p>
                  )}

                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400">Input:</span>
                      <span className="text-white font-mono">${model.inputCostPer1k}/1k</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400">Output:</span>
                      <span className="text-white font-mono">${model.outputCostPer1k}/1k</span>
                    </div>
                    <div className="text-slate-400">
                      Max Tokens: <span className="text-white">{model.maxTokens}</span>
                    </div>
                    <div className="text-slate-400">
                      Temperature: <span className="text-white">{model.temperature}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {model.isActive && !model.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(model._id)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Definir como Primário"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {model.isActive && !model.isFallback && !model.isPrimary && (
                    <button
                      onClick={() => handleSetFallback(model._id)}
                      className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      title="Definir como Fallback"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleStatus(model._id)}
                    className={`p-2 ${
                      model.isActive ? 'text-green-400 hover:bg-green-500/20' : 'text-red-400 hover:bg-red-500/20'
                    } rounded-lg transition-colors`}
                    title={model.isActive ? 'Desativar' : 'Ativar'}
                    disabled={model.isPrimary || model.isFallback}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(model)}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(model._id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Excluir"
                    disabled={model.isPrimary || model.isFallback}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingModel ? 'Editar Modelo' : 'Adicionar Novo Modelo'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome do Modelo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    placeholder="Ex: GPT-4 Mini"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Provedor
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ID do Modelo
                </label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral font-mono text-sm"
                  placeholder="Ex: gpt-4o-mini, gemini-1.5-pro, claude-3-opus-20240229"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custo Input (por 1k tokens)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.inputCostPer1k}
                    onChange={(e) => setFormData({ ...formData, inputCostPer1k: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    placeholder="0.00015"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custo Output (por 1k tokens)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.outputCostPer1k}
                    onChange={(e) => setFormData({ ...formData, outputCostPer1k: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    placeholder="0.0006"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    min="100"
                    max="10000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    min="0"
                    max="2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                  rows={3}
                  placeholder="Ex: Modelo rápido e eficiente para geração de conteúdo"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral/90 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingModel ? 'Salvar Alterações' : 'Adicionar Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};