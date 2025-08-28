import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Key, 
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
  Check,
  AlertCircle,
  TrendingUp,
  Calendar,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

// Import existing components styles and logic
interface ApiConfig {
  _id: string;
  provider: 'openai' | 'gemini';
  name: string;
  settings: {
    apiKey: string;
    model: string;
  };
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
}

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

interface Prompt {
  _id: string;
  name: string;
  code: string;
  category: 'bbr' | 'spr' | 'informational';
  template: string;
  variables: string[];
  description?: string;
  isActive: boolean;
  order: number;
}

interface Analytics {
  totalReviews: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTokensPerReview: number;
  averageCostPerReview: number;
  reviewsByType: {
    bbr: number;
    spr: number;
    informational: number;
  };
  recentActivity: Array<{
    date: string;
    count: number;
    tokens: number;
    cost: number;
  }>;
}

export const ContentHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'models' | 'prompts' | 'analytics'>('api');
  const [loading, setLoading] = useState(true);
  
  // API Keys State
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [apiFormData, setApiFormData] = useState({
    provider: 'openai' as 'openai' | 'gemini',
    name: '',
    apiKey: '',
    model: ''
  });

  // AI Models State
  const [models, setModels] = useState<AiModel[]>([]);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);
  const [modelFormData, setModelFormData] = useState({
    name: '',
    provider: 'openai' as 'openai' | 'gemini' | 'anthropic',
    modelId: '',
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

  // Analytics State
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'api':
          await fetchApiConfigs();
          break;
        case 'models':
          await fetchModels();
          break;
        case 'prompts':
          await fetchPrompts();
          break;
        case 'analytics':
          await fetchAnalytics();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // API Keys Functions
  const fetchApiConfigs = async () => {
    try {
      const response = await api.get('/admin/api-configs');
      if (response.data.success) {
        setApiConfigs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching API configs:', error);
    }
  };

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApi) {
        const response = await api.put(`/admin/api-configs/${editingApi._id}`, apiFormData);
        if (response.data.success) {
          toast.success('API configuration updated!');
          fetchApiConfigs();
          setShowApiModal(false);
          setEditingApi(null);
        }
      } else {
        const response = await api.post('/admin/api-configs', apiFormData);
        if (response.data.success) {
          toast.success('API configuration created!');
          fetchApiConfigs();
          setShowApiModal(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error saving API configuration');
    }
  };

  // AI Models Functions
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

  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingModel) {
        const response = await api.put(`/admin/ai-models/${editingModel._id}`, modelFormData);
        if (response.data.success) {
          toast.success('Model updated!');
          fetchModels();
          setShowModelModal(false);
          setEditingModel(null);
        }
      } else {
        const response = await api.post('/admin/ai-models', modelFormData);
        if (response.data.success) {
          toast.success('Model created!');
          fetchModels();
          setShowModelModal(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error saving model');
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/set-primary`);
      if (response.data.success) {
        toast.success('Model set as primary!');
        fetchModels();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error setting primary');
    }
  };

  const handleSetFallback = async (id: string) => {
    try {
      const response = await api.post(`/admin/ai-models/${id}/set-fallback`);
      if (response.data.success) {
        toast.success('Model set as fallback!');
        fetchModels();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error setting fallback');
    }
  };

  // Prompts Functions
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

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...promptFormData,
        variables: promptFormData.variables.split(',').map(v => v.trim()).filter(v => v)
      };
      
      if (editingPrompt) {
        const response = await api.put(`/admin/prompts/${editingPrompt._id}`, data);
        if (response.data.success) {
          toast.success('Prompt updated!');
          fetchPrompts();
          setShowPromptModal(false);
          setEditingPrompt(null);
        }
      } else {
        const response = await api.post('/admin/prompts', data);
        if (response.data.success) {
          toast.success('Prompt created!');
          fetchPrompts();
          setShowPromptModal(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error saving prompt');
    }
  };

  // Analytics Functions
  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const response = await api.get(`/admin/analytics/content?${params}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

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

  const tabs = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'models', label: 'AI Models', icon: Cpu },
    { id: 'prompts', label: 'Prompts', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: Activity }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Content Generation Hub</h1>
        <p className="text-slate-400">Manage all aspects of AI content generation in one place</p>
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

      {loading ? (
        <div className="animate-pulse">
          <div className="h-32 bg-slate-800 rounded-lg mb-4"></div>
          <div className="h-32 bg-slate-800 rounded-lg"></div>
        </div>
      ) : (
        <>
          {/* API Keys Tab */}
          {activeTab === 'api' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">API Configurations</h2>
                <button
                  onClick={() => setShowApiModal(true)}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add API Key
                </button>
              </div>

              <div className="grid gap-4">
                {apiConfigs.map((config) => (
                  <div key={config._id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">{config.name}</h3>
                          <span className={`text-sm ${getProviderColor(config.provider)}`}>
                            {config.provider.toUpperCase()}
                          </span>
                          {config.isPrimary && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                              Primary
                            </span>
                          )}
                          {config.isFallback && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              Fallback
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">
                          Model: <span className="text-white font-mono">{config.settings?.model || 'Not configured'}</span>
                        </p>
                        <p className="text-sm text-slate-400">
                          API Key: <span className="text-white font-mono">
                            {config.settings?.apiKey ? `${config.settings.apiKey.substring(0, 10)}...` : 'Not set'}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingApi(config);
                            setApiFormData({
                              provider: config.provider,
                              name: config.name,
                              apiKey: config.settings?.apiKey || '',
                              model: config.settings?.model || ''
                            });
                            setShowApiModal(true);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Models Tab */}
          {activeTab === 'models' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">AI Models</h2>
                <button
                  onClick={() => setShowModelModal(true)}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Model
                </button>
              </div>

              <div className="grid gap-4">
                {models.map((model) => (
                  <div
                    key={model._id}
                    className={`bg-slate-900 rounded-lg p-4 border ${
                      model.isPrimary ? 'border-green-500/50' : 
                      model.isFallback ? 'border-yellow-500/50' : 
                      'border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">{model.name}</h3>
                          <span className={`text-sm ${getProviderColor(model.provider)}`}>
                            {model.provider.toUpperCase()}
                          </span>
                          <code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                            {model.modelId}
                          </code>
                          {model.isPrimary && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Primary
                            </span>
                          )}
                          {model.isFallback && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Fallback
                            </span>
                          )}
                        </div>
                        <div className="flex gap-6 text-sm">
                          <span className="text-slate-400">
                            Input: <span className="text-white font-mono">${model.inputCostPer1k}/1k</span>
                          </span>
                          <span className="text-slate-400">
                            Output: <span className="text-white font-mono">${model.outputCostPer1k}/1k</span>
                          </span>
                          <span className="text-slate-400">
                            Max: <span className="text-white">{model.maxTokens}</span>
                          </span>
                          <span className="text-slate-400">
                            Temp: <span className="text-white">{model.temperature}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {model.isActive && !model.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(model._id)}
                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                            title="Set as Primary"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        {model.isActive && !model.isFallback && !model.isPrimary && (
                          <button
                            onClick={() => handleSetFallback(model._id)}
                            className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg"
                            title="Set as Fallback"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingModel(model);
                            setModelFormData({
                              name: model.name,
                              provider: model.provider,
                              modelId: model.modelId,
                              inputCostPer1k: model.inputCostPer1k,
                              outputCostPer1k: model.outputCostPer1k,
                              maxTokens: model.maxTokens,
                              temperature: model.temperature,
                              description: model.description || ''
                            });
                            setShowModelModal(true);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompts Tab */}
          {activeTab === 'prompts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Prompt Templates</h2>
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Prompt
                </button>
              </div>

              <div className="grid gap-4">
                {['bbr', 'spr', 'informational'].map(category => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
                      {category === 'bbr' ? 'Best Buy Reviews' : 
                       category === 'spr' ? 'Single Product Reviews' : 
                       'Informational Content'}
                    </h3>
                    <div className="grid gap-2">
                      {prompts
                        .filter(p => p.category === category)
                        .sort((a, b) => a.order - b.order)
                        .map((prompt) => (
                          <div key={prompt._id} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white">{prompt.name}</h4>
                                  <code className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                    {prompt.code}
                                  </code>
                                  <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(prompt.category)}`}>
                                    {prompt.category.toUpperCase()}
                                  </span>
                                </div>
                                {prompt.description && (
                                  <p className="text-xs text-slate-400 mb-1">{prompt.description}</p>
                                )}
                                <div className="flex gap-4 text-xs">
                                  <span className="text-slate-500">
                                    Variables: {prompt.variables.join(', ')}
                                  </span>
                                  <span className="text-slate-500">
                                    Order: {prompt.order}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingPrompt(prompt);
                                  setPromptFormData({
                                    name: prompt.name,
                                    code: prompt.code,
                                    category: prompt.category,
                                    template: prompt.template,
                                    variables: prompt.variables.join(', '),
                                    description: prompt.description || '',
                                    order: prompt.order
                                  });
                                  setShowPromptModal(true);
                                }}
                                className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded"
                              >
                                <Edit className="w-3 h-3" />
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

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div>
              <div className="mb-6 flex gap-4">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <button
                  onClick={fetchAnalytics}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90"
                >
                  Filter
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Reviews</span>
                    <FileText className="w-4 h-4 text-coral" />
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalReviews || 0}</p>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Tokens</span>
                    <Hash className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {((analytics?.totalTokensUsed || 0) / 1000).toFixed(1)}k
                  </p>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Cost</span>
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ${(analytics?.totalCost || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    ≈ R$ {((analytics?.totalCost || 0) * 6).toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Avg Cost/Review</span>
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    ${(analytics?.averageCostPerReview || 0).toFixed(3)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Content by Type</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">BBR Reviews</span>
                      <span className="text-white font-semibold">{analytics?.reviewsByType?.bbr || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">SPR Reviews</span>
                      <span className="text-white font-semibold">{analytics?.reviewsByType?.spr || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Informational</span>
                      <span className="text-white font-semibold">{analytics?.reviewsByType?.informational || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(analytics?.recentActivity || []).map((activity, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                        <div className="flex gap-4">
                          <span className="text-white">{activity.count} reviews</span>
                          <span className="text-slate-500">${activity.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* API Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingApi ? 'Edit API Configuration' : 'Add API Configuration'}
            </h2>
            <form onSubmit={handleApiSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={apiFormData.name}
                  onChange={(e) => setApiFormData({ ...apiFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Provider</label>
                <select
                  value={apiFormData.provider}
                  onChange={(e) => setApiFormData({ ...apiFormData, provider: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiFormData.apiKey}
                  onChange={(e) => setApiFormData({ ...apiFormData, apiKey: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                <input
                  type="text"
                  value={apiFormData.model}
                  onChange={(e) => setApiFormData({ ...apiFormData, model: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="e.g., gpt-4o-mini"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApiModal(false);
                    setEditingApi(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingModel ? 'Edit Model' : 'Add Model'}
            </h2>
            <form onSubmit={handleModelSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Provider</label>
                  <select
                    value={modelFormData.provider}
                    onChange={(e) => setModelFormData({ ...modelFormData, provider: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Model ID</label>
                <input
                  type="text"
                  value={modelFormData.modelId}
                  onChange={(e) => setModelFormData({ ...modelFormData, modelId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Input Cost/1k</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={modelFormData.inputCostPer1k}
                    onChange={(e) => setModelFormData({ ...modelFormData, inputCostPer1k: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Output Cost/1k</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={modelFormData.outputCostPer1k}
                    onChange={(e) => setModelFormData({ ...modelFormData, outputCostPer1k: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModelModal(false);
                    setEditingModel(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90"
                >
                  Save
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
              {editingPrompt ? 'Edit Prompt' : 'Add Prompt'}
            </h2>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={promptFormData.name}
                    onChange={(e) => setPromptFormData({ ...promptFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Code</label>
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select
                    value={promptFormData.category}
                    onChange={(e) => setPromptFormData({ ...promptFormData, category: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="bbr">BBR</option>
                    <option value="spr">SPR</option>
                    <option value="informational">Informational</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Order</label>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Variables (comma-separated)</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};