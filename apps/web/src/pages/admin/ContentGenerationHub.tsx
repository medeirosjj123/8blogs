import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Cpu, 
  FileText, 
  Activity,
  Plus,
  Trash2,
  Edit,
  Power,
  Star,
  Shield,
  DollarSign,
  Save,
  X,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  Key
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
interface AiModel {
  _id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  modelId: string;
  hasApiKey?: boolean; // Flag to indicate if API key is set
  apiKeyMasked?: string; // Masked API key for display
  inputCostPer1k: number;
  outputCostPer1k: number;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
  description?: string;
}

interface Prompt {
  _id: string;
  name: string;
  code: string;
  category: 'bbr' | 'spr' | 'informational';
  template?: string;
  content?: string;
  variables: string[];
  description?: string;
  isActive: boolean;
  order: number;
}

interface ContentStats {
  totalGenerated: number;
  totalTokens: number;
  totalCost: number;
  averageTime: number;
  byType: {
    bbr: { count: number; tokens: number; cost: number };
    spr: { count: number; tokens: number; cost: number };
    informational: { count: number; tokens: number; cost: number };
  };
  recentContent: Array<{
    _id: string;
    title: string;
    contentType: string;
    metadata: {
      tokensUsed: { total: number };
      cost: number;
      generationTime: number;
      provider: string;
      model: string;
    };
    createdAt: string;
    userId: {
      name: string;
      email: string;
    };
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
    tokens: number;
    cost: number;
  }>;
}

export const ContentGenerationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'models' | 'prompts' | 'analytics'>('models');
  const [loading, setLoading] = useState(true);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  
  // Models State
  const [models, setModels] = useState<AiModel[]>([]);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);
  const [modelFormData, setModelFormData] = useState({
    name: '',
    provider: 'openai' as 'openai' | 'gemini' | 'anthropic',
    modelId: '',
    apiKey: '',
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    maxTokens: 2000,
    temperature: 0.7,
    description: ''
  });

  // Prompts State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [promptFormData, setPromptFormData] = useState({
    name: '',
    code: '',
    category: 'bbr' as 'bbr' | 'spr' | 'informational',
    template: '',
    variables: '',
    description: '',
    order: 0
  });

  // Analytics Query
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ContentStats>({
    queryKey: ['content-analytics', selectedDateRange],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/content?range=${selectedDateRange}`);
      return response.data.data;
    }
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'models') {
        await fetchModels();
      } else if (activeTab === 'prompts') {
        await fetchPrompts();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Fetch functions
  const fetchModels = async () => {
    try {
      const response = await api.get('/admin/ai-models');
      if (response.data.success) {
        setModels(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };


  const fetchPrompts = async () => {
    try {
      const response = await api.get('/admin/prompts');
      if (response.data.success) {
        setPrompts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  // Model Management
  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Include all model data including API key
      const modelData = {
        name: modelFormData.name,
        provider: modelFormData.provider,
        modelId: modelFormData.modelId,
        apiKey: modelFormData.apiKey, // Include API key directly
        inputCostPer1k: modelFormData.inputCostPer1k,
        outputCostPer1k: modelFormData.outputCostPer1k,
        maxTokens: modelFormData.maxTokens,
        temperature: modelFormData.temperature,
        description: modelFormData.description
      };

      if (editingModel) {
        const response = await api.put(`/admin/ai-models/${editingModel._id}`, modelData);
        if (response.data.success) {
          toast.success('Modelo atualizado com sucesso!');
        }
      } else {
        const response = await api.post('/admin/ai-models', modelData);
        if (response.data.success) {
          toast.success('Modelo criado com sucesso!');
        }
      }

      await fetchModels();
      setShowModelModal(false);
      setEditingModel(null);
      resetModelForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar modelo');
    }
  };

  const resetModelForm = () => {
    setModelFormData({
      name: '',
      provider: 'openai',
      modelId: '',
      apiKey: '',
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      maxTokens: 2000,
      temperature: 0.7,
      description: ''
    });
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/set-primary`);
      if (response.data.success) {
        toast.success('Modelo definido como primário!');
        fetchModels();
      }
    } catch (error: any) {
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
      toast.error(error.response?.data?.error || 'Erro ao definir como fallback');
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      const response = await api.delete(`/admin/ai-models/${id}`);
      if (response.data.success) {
        toast.success('Modelo excluído com sucesso!');
        fetchModels();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir modelo');
    }
  };

  const handleToggleModelStatus = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/toggle-status`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchModels();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status');
    }
  };

  // Prompt Management
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...promptFormData,
        content: promptFormData.template, // Map template to content for backend
        variables: promptFormData.variables.split(',').map(v => v.trim()).filter(v => v)
      };
      
      if (editingPrompt) {
        const response = await api.put(`/admin/prompts/${editingPrompt._id}`, data);
        if (response.data.success) {
          toast.success('Prompt atualizado!');
          fetchPrompts();
          setShowPromptModal(false);
          setEditingPrompt(null);
        }
      } else {
        const response = await api.post('/admin/prompts', data);
        if (response.data.success) {
          toast.success('Prompt criado!');
          fetchPrompts();
          setShowPromptModal(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar prompt');
    }
  };

  // Helper functions
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'text-green-400';
      case 'gemini': return 'text-blue-400';
      case 'anthropic': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bbr': return 'bg-blue-500/20 text-blue-400';
      case 'spr': return 'bg-green-500/20 text-green-400';
      case 'informational': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value * 6); // Converting USD to BRL
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const tabs = [
    { id: 'models', label: 'AI Models & API', icon: Cpu },
    { id: 'prompts', label: 'Prompts', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: Activity }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Content Generation Hub</h1>
        <p className="text-slate-400">Gerencie modelos de IA, prompts e analise o uso</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-coral text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Models & API Tab */}
      {activeTab === 'models' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Modelos de IA e Configuração de API</h2>
              <p className="text-sm text-slate-400">Configure modelos e suas chaves de API</p>
            </div>
            <button
              onClick={() => setShowModelModal(true)}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Modelo
            </button>
          </div>

          {/* API Status Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['openai', 'gemini', 'anthropic'].map(provider => {
              const hasApiKey = models.some(m => m.provider === provider && m.hasApiKey);
              const modelCount = models.filter(m => m.provider === provider).length;
              return (
                <div key={provider} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${getProviderColor(provider)}`}>
                      {provider.toUpperCase()}
                    </span>
                    <Key className={`w-4 h-4 ${hasApiKey ? 'text-green-400' : 'text-slate-600'}`} />
                  </div>
                  <p className="text-xs text-slate-400">
                    {modelCount} modelo{modelCount !== 1 ? 's' : ''}
                    {hasApiKey ? ' (com API Key)' : ''}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Models List */}
          <div className="grid gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-coral animate-spin" />
              </div>
            ) : models.length === 0 ? (
              <div className="bg-slate-900 rounded-lg p-8 text-center border border-slate-800">
                <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhum modelo configurado</p>
                <p className="text-sm text-slate-500 mt-2">Clique em "Adicionar Modelo" para começar</p>
              </div>
            ) : (
              models.map((model) => (
                <div
                  key={model._id}
                  className={`bg-slate-900 rounded-lg p-4 border ${
                    !model.isActive ? 'border-slate-800 opacity-60' :
                    model.isPrimary ? 'border-green-500/50' : 
                    model.isFallback ? 'border-yellow-500/50' : 
                    'border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{model.name}</h3>
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
                      
                      {/* API Key Status */}
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <Key className={`w-4 h-4 ${model.hasApiKey ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-slate-400">API Key:</span>
                        {model.hasApiKey ? (
                          <code className="text-green-400 bg-green-900/20 px-2 py-0.5 rounded font-mono text-xs">
                            {model.apiKeyMasked || 'Configurada'}
                          </code>
                        ) : (
                          <span className="text-red-400 text-xs">Não configurada</span>
                        )}
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
                        onClick={() => handleToggleModelStatus(model._id)}
                        className={`p-2 ${
                          model.isActive ? 'text-green-400 hover:bg-green-500/20' : 'text-red-400 hover:bg-red-500/20'
                        } rounded-lg transition-colors`}
                        title={model.isActive ? 'Desativar' : 'Ativar'}
                        disabled={model.isPrimary || model.isFallback}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingModel(model);
                          setModelFormData({
                            name: model.name,
                            provider: model.provider,
                            modelId: model.modelId,
                            apiKey: '', // Leave empty for user to enter new key if desired
                            inputCostPer1k: model.inputCostPer1k,
                            outputCostPer1k: model.outputCostPer1k,
                            maxTokens: model.maxTokens,
                            temperature: model.temperature,
                            description: model.description || ''
                          });
                          setShowModelModal(true);
                        }}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteModel(model._id)}
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
        </div>
      )}

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Templates de Prompt</h2>
            <button
              onClick={() => setShowPromptModal(true)}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Prompt
            </button>
          </div>

          <div className="grid gap-6">
            {['bbr', 'spr', 'informational'].map(category => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">
                  {category === 'bbr' ? 'Best Buy Reviews (BBR)' : 
                   category === 'spr' ? 'Single Product Reviews (SPR)' : 
                   'Conteúdo Informacional'}
                </h3>
                <div className="grid gap-2">
                  {prompts
                    .filter(p => p.category === category)
                    .sort((a, b) => a.order - b.order)
                    .map((prompt) => (
                      <div key={prompt._id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-white">{prompt.name}</h4>
                              <code className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                {prompt.code}
                              </code>
                              <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(prompt.category)}`}>
                                {prompt.category.toUpperCase()}
                              </span>
                            </div>
                            {prompt.description && (
                              <p className="text-sm text-slate-400 mb-2">{prompt.description}</p>
                            )}
                            <div className="flex gap-4 text-xs text-slate-500">
                              <span>Variáveis: {prompt.variables.join(', ')}</span>
                              <span>Ordem: {prompt.order}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingPrompt(prompt);
                              setPromptFormData({
                                name: prompt.name,
                                code: prompt.code,
                                category: prompt.category,
                                template: prompt.content || prompt.template || '',
                                variables: prompt.variables.join(', '),
                                description: prompt.description || '',
                                order: prompt.order
                              });
                              setShowPromptModal(true);
                            }}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab - Using Original Component Style */}
      {activeTab === 'analytics' && (
        <div>
          {/* Date Range Selector */}
          <div className="flex gap-2 mb-6">
            {[
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: '90d', label: '90 dias' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setSelectedDateRange(range.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDateRange === range.value
                    ? 'bg-coral text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-coral animate-spin" />
            </div>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Gerado</span>
                    <FileText className="w-4 h-4 text-coral" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.totalGenerated)}</p>
                  <p className="text-xs text-slate-500 mt-1">conteúdos</p>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Tokens Usados</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalTokens > 1000000 
                      ? `${(stats.totalTokens / 1000000).toFixed(1)}M`
                      : `${(stats.totalTokens / 1000).toFixed(1)}k`
                    }
                  </p>
                  <p className="text-xs text-slate-500 mt-1">tokens totais</p>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Custo Total</span>
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalCost)}</p>
                  <p className="text-xs text-slate-500 mt-1">≈ ${stats.totalCost.toFixed(2)} USD</p>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Tempo Médio</span>
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.averageTime.toFixed(1)}s</p>
                  <p className="text-xs text-slate-500 mt-1">por geração</p>
                </div>
              </div>

              {/* Content by Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Por Tipo de Conteúdo</h3>
                  <div className="space-y-4">
                    {Object.entries(stats.byType).map(([type, data]) => (
                      <div key={type}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-300">
                            {type.toUpperCase()}
                          </span>
                          <span className="text-sm text-white">{data.count} conteúdos</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              type === 'bbr' ? 'bg-blue-500' :
                              type === 'spr' ? 'bg-green-500' :
                              'bg-purple-500'
                            }`}
                            style={{
                              width: `${(data.count / stats.totalGenerated) * 100}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-slate-500">
                          <span>{(data.tokens / 1000).toFixed(1)}k tokens</span>
                          <span>{formatCurrency(data.cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Chart */}
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Atividade Diária</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stats.dailyStats.map((day, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-sm text-slate-400">
                          {format(new Date(day.date), 'dd/MM', { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-white">{day.count} conteúdos</span>
                          <span className="text-xs text-slate-500">{formatCurrency(day.cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Content */}
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">Conteúdo Recente</h3>
                <div className="space-y-3">
                  {stats.recentContent.map((content) => (
                    <div
                      key={content._id}
                      className="p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setExpandedContent(expandedContent === content._id ? null : content._id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{content.title}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>{content.userId.name}</span>
                            <span>{format(new Date(content.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                            <span className={`px-2 py-0.5 rounded ${getCategoryColor(content.contentType)}`}>
                              {content.contentType.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedContent === content._id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                      
                      {expandedContent === content._id && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Tokens</span>
                              <p className="text-white font-medium">
                                {formatNumber(content.metadata.tokensUsed.total)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Custo</span>
                              <p className="text-white font-medium">
                                {formatCurrency(content.metadata.cost)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Tempo</span>
                              <p className="text-white font-medium">
                                {content.metadata.generationTime.toFixed(1)}s
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Modelo</span>
                              <p className="text-white font-medium">
                                {content.metadata.provider}/{content.metadata.model}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 rounded-lg p-12 text-center border border-slate-800">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum dado de analytics disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingModel ? 'Editar Modelo' : 'Adicionar Modelo'}
            </h2>
            <form onSubmit={handleModelSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Modelo</label>
                  <input
                    type="text"
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    placeholder="Ex: GPT-4 Mini"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Provedor</label>
                  <select
                    value={modelFormData.provider}
                    onChange={(e) => setModelFormData({ ...modelFormData, provider: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">ID do Modelo</label>
                <input
                  type="text"
                  value={modelFormData.modelId}
                  onChange={(e) => setModelFormData({ ...modelFormData, modelId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral font-mono text-sm"
                  placeholder="Ex: gpt-4o-mini, gemini-1.5-pro"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key {modelFormData.provider && `(${modelFormData.provider})`}
                  <span className="text-xs text-slate-500 ml-2">Opcional - usa .env se vazio</span>
                </label>
                <input
                  type="password"
                  value={modelFormData.apiKey}
                  onChange={(e) => setModelFormData({ ...modelFormData, apiKey: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                  placeholder="sk-... (deixe vazio para usar OPENAI_API_KEY do .env)"
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
                    value={modelFormData.inputCostPer1k}
                    onChange={(e) => setModelFormData({ ...modelFormData, inputCostPer1k: parseFloat(e.target.value) })}
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
                    value={modelFormData.outputCostPer1k}
                    onChange={(e) => setModelFormData({ ...modelFormData, outputCostPer1k: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    placeholder="0.0006"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={modelFormData.maxTokens}
                    onChange={(e) => setModelFormData({ ...modelFormData, maxTokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    min="100"
                    max="10000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    value={modelFormData.temperature}
                    onChange={(e) => setModelFormData({ ...modelFormData, temperature: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                    min="0"
                    max="2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descrição (opcional)</label>
                <textarea
                  value={modelFormData.description}
                  onChange={(e) => setModelFormData({ ...modelFormData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                  rows={3}
                  placeholder="Ex: Modelo rápido e eficiente para geração de conteúdo"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModelModal(false);
                    setEditingModel(null);
                    resetModelForm();
                  }}
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

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingPrompt ? 'Editar Prompt' : 'Adicionar Prompt'}
            </h2>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              {/* Form fields remain the same as in original */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                  <input
                    type="text"
                    value={promptFormData.name}
                    onChange={(e) => setPromptFormData({ ...promptFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Código</label>
                  <input
                    type="text"
                    value={promptFormData.code}
                    onChange={(e) => setPromptFormData({ ...promptFormData, code: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                  <select
                    value={promptFormData.category}
                    onChange={(e) => setPromptFormData({ ...promptFormData, category: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="bbr">BBR</option>
                    <option value="spr">SPR</option>
                    <option value="informational">Informacional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ordem</label>
                  <input
                    type="number"
                    value={promptFormData.order}
                    onChange={(e) => setPromptFormData({ ...promptFormData, order: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Variáveis (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={promptFormData.variables}
                  onChange={(e) => setPromptFormData({ ...promptFormData, variables: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="title, product_name, previous_context"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Template</label>
                <textarea
                  value={promptFormData.template}
                  onChange={(e) => setPromptFormData({ ...promptFormData, template: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  rows={8}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPromptModal(false);
                    setEditingPrompt(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};