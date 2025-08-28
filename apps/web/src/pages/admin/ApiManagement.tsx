import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  TestTube, 
  Save, 
  AlertCircle, 
  Loader2,
  Check,
  X,
  Settings,
  Activity
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ApiConfig {
  _id: string;
  provider: 'openai' | 'gemini';
  name: string;
  settings: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  pricing: {
    inputCost: number;
    outputCost: number;
  };
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
  healthCheck: {
    status: 'online' | 'offline' | 'error';
    lastCheck?: string;
    responseTime?: number;
    errorMessage?: string;
  };
  limits: {
    currentUsage: {
      requests: number;
      tokens: number;
    };
  };
}

const modelOptions = {
  openai: ['gpt-5-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
};

export const ApiManagement: React.FC = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      console.log('Using token for API configs:', token ? token.substring(0, 20) + '...' : 'No token');
      const response = await axios.get('/api/admin/api-configs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setConfigs(response.data.data);
        
        // Initialize form data
        const initialData: Record<string, any> = {};
        response.data.data.forEach((config: ApiConfig) => {
          initialData[config.provider] = {
            apiKey: config.settings.apiKey,
            model: config.settings.model,
            maxTokens: config.settings.maxTokens,
            temperature: config.settings.temperature,
            inputCost: config.pricing.inputCost,
            outputCost: config.pricing.outputCost,
            isActive: config.isActive,
            isPrimary: config.isPrimary,
            isFallback: config.isFallback
          };
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error fetching API configs:', error);
      toast.error('Failed to load API configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const data = formData[provider];
      
      const response = await axios.put(
        `/api/admin/api-configs/${provider}`,
        {
          settings: {
            apiKey: data.apiKey,
            model: data.model,
            maxTokens: data.maxTokens,
            temperature: data.temperature
          },
          pricing: {
            inputCost: data.inputCost,
            outputCost: data.outputCost
          },
          isActive: data.isActive,
          isPrimary: data.isPrimary,
          isFallback: data.isFallback
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(`${provider} configuration saved`);
        await fetchConfigs();
      }
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: string) => {
    setTesting(provider);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const response = await axios.post(
        `/api/admin/api-configs/test/${provider}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(`${provider} connection successful (${response.data.responseTime}ms)`);
        await fetchConfigs();
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const handleInitialize = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/admin/api-configs/initialize',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Default configurations created');
        await fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize');
    }
  };

  const updateFormData = (provider: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-gray-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Check className="w-4 h-4" />;
      case 'offline': return <X className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No API Configurations</h2>
          <p className="text-slate-400 mb-4">Initialize default configurations to get started</p>
          <button
            onClick={handleInitialize}
            className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/80"
          >
            Initialize Defaults
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">API Management</h1>
        <p className="text-slate-400 mt-1">Configure AI providers and models</p>
      </div>

      {configs.map((config) => (
        <div key={config._id} className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">{config.name}</h2>
              {config.isPrimary && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Primary
                </span>
              )}
              {config.isFallback && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  Fallback
                </span>
              )}
            </div>
            <div className={`flex items-center gap-2 ${getStatusColor(config.healthCheck.status)}`}>
              {getStatusIcon(config.healthCheck.status)}
              <span className="text-sm capitalize">{config.healthCheck.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-sm">API Key</label>
              <div className="flex gap-2">
                <input
                  type={showKeys[config.provider] ? "text" : "password"}
                  value={formData[config.provider]?.apiKey || ''}
                  onChange={(e) => updateFormData(config.provider, 'apiKey', e.target.value)}
                  className="flex-1 bg-slate-700 text-white p-2 rounded"
                  placeholder="Enter API key..."
                />
                <button
                  onClick={() => setShowKeys(prev => ({ ...prev, [config.provider]: !prev[config.provider] }))}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  {showKeys[config.provider] ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-sm">Model</label>
              <select
                value={formData[config.provider]?.model || ''}
                onChange={(e) => updateFormData(config.provider, 'model', e.target.value)}
                className="w-full bg-slate-700 text-white p-2 rounded"
              >
                {modelOptions[config.provider].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-sm">Max Tokens</label>
              <input
                type="number"
                value={formData[config.provider]?.maxTokens || 2000}
                onChange={(e) => updateFormData(config.provider, 'maxTokens', parseInt(e.target.value))}
                className="w-full bg-slate-700 text-white p-2 rounded"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData[config.provider]?.temperature || 0.7}
                onChange={(e) => updateFormData(config.provider, 'temperature', parseFloat(e.target.value))}
                className="w-full bg-slate-700 text-white p-2 rounded"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm">Input Cost (per 1M tokens)</label>
              <input
                type="number"
                step="0.01"
                value={formData[config.provider]?.inputCost || 0}
                onChange={(e) => updateFormData(config.provider, 'inputCost', parseFloat(e.target.value))}
                className="w-full bg-slate-700 text-white p-2 rounded"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm">Output Cost (per 1M tokens)</label>
              <input
                type="number"
                step="0.01"
                value={formData[config.provider]?.outputCost || 0}
                onChange={(e) => updateFormData(config.provider, 'outputCost', parseFloat(e.target.value))}
                className="w-full bg-slate-700 text-white p-2 rounded"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={formData[config.provider]?.isActive || false}
                onChange={(e) => updateFormData(config.provider, 'isActive', e.target.checked)}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={formData[config.provider]?.isPrimary || false}
                onChange={(e) => updateFormData(config.provider, 'isPrimary', e.target.checked)}
              />
              Primary
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={formData[config.provider]?.isFallback || false}
                onChange={(e) => updateFormData(config.provider, 'isFallback', e.target.checked)}
              />
              Fallback
            </label>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => handleTest(config.provider)}
              disabled={testing === config.provider}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {testing === config.provider ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube size={16} />
              )}
              Test Connection
            </button>

            <button
              onClick={() => handleSave(config.provider)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Configuration
            </button>
          </div>

          {config.limits && (
            <div className="mt-4 p-4 bg-slate-900 rounded">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Usage Today</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Requests:</span>
                  <span className="text-white ml-2">{config.limits.currentUsage.requests}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tokens:</span>
                  <span className="text-white ml-2">{config.limits.currentUsage.tokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};