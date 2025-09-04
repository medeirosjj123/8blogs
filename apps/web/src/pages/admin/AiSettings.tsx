import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Cpu, Save, AlertCircle, DollarSign, Zap, Info } from 'lucide-react';
import { api } from '../../services/api';

interface AiSettings {
  _id?: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isActive: boolean;
  description?: string;
  costPerInputToken: number;
  costPerOutputToken: number;
}

interface ModelOption {
  value: string;
  label: string;
  description: string;
  costPerInputToken: number;
  costPerOutputToken: number;
}

interface AvailableModels {
  openai: ModelOption[];
  gemini: ModelOption[];
  anthropic: ModelOption[];
}

export const AiSettings: React.FC = () => {
  const [settings, setSettings] = useState<AiSettings>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    isActive: true,
    costPerInputToken: 0.00015,
    costPerOutputToken: 0.0006
  });
  const [availableModels, setAvailableModels] = useState<AvailableModels>({
    openai: [],
    gemini: [],
    anthropic: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Update selected model info when provider or model changes
    if (availableModels[settings.provider]) {
      const model = availableModels[settings.provider].find(m => m.value === settings.model);
      setSelectedModel(model || null);
    }
  }, [settings.provider, settings.model, availableModels]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/admin/ai-settings');
      if (response.data.success) {
        setSettings(response.data.data.settings);
        setAvailableModels(response.data.data.availableModels);
      }
    } catch (error: any) {
      console.error('Error fetching AI settings:', error);
      toast.error('Erro ao carregar configurações de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/api/admin/ai-settings', settings);
      if (response.data.success) {
        toast.success('Configurações de IA atualizadas com sucesso!');
        setSettings(response.data.data);
      }
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      toast.error('Erro ao salvar configurações de IA');
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (provider: 'openai' | 'gemini' | 'anthropic') => {
    // When provider changes, select the first model from that provider
    const firstModel = availableModels[provider]?.[0];
    if (firstModel) {
      setSettings({
        ...settings,
        provider,
        model: firstModel.value,
        costPerInputToken: firstModel.costPerInputToken,
        costPerOutputToken: firstModel.costPerOutputToken
      });
    }
  };

  const handleModelChange = (modelValue: string) => {
    const model = availableModels[settings.provider].find(m => m.value === modelValue);
    if (model) {
      setSettings({
        ...settings,
        model: modelValue,
        costPerInputToken: model.costPerInputToken,
        costPerOutputToken: model.costPerOutputToken
      });
    }
  };

  const calculateEstimatedCost = (inputTokens: number = 1000, outputTokens: number = 1000) => {
    const inputCost = (inputTokens / 1000) * settings.costPerInputToken;
    const outputCost = (outputTokens / 1000) * settings.costPerOutputToken;
    return (inputCost + outputCost).toFixed(4);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-slate-800 rounded"></div>
            <div className="h-32 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-coral" />
          Configurações de IA
        </h1>
        <p className="text-slate-400">Configure o modelo de IA para geração de conteúdo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Provider Selection */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">Provedor de IA</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(availableModels).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider as keyof AvailableModels)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    settings.provider === provider
                      ? 'border-coral bg-coral/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium capitalize">{provider}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {availableModels[provider as keyof AvailableModels].length} modelos
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">Modelo</h2>
            <select
              value={settings.model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
            >
              {availableModels[settings.provider]?.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label} - {model.description}
                </option>
              ))}
            </select>

            {selectedModel && (
              <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">{selectedModel.description}</p>
                    <div className="mt-2 flex gap-4 text-xs">
                      <span className="text-slate-400">
                        Input: ${selectedModel.costPerInputToken}/1K tokens
                      </span>
                      <span className="text-slate-400">
                        Output: ${selectedModel.costPerOutputToken}/1K tokens
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">Configurações Avançadas</h2>
            <div className="space-y-4">
              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Máximo de Tokens
                  <span className="ml-2 text-xs text-slate-500">(Tamanho máximo da resposta)</span>
                </label>
                <input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                  min="100"
                  max="4000"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-coral"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature
                  <span className="ml-2 text-xs text-slate-500">(0 = determinístico, 2 = criativo)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={settings.temperature}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    min="0"
                    max="2"
                    step="0.1"
                    className="flex-1"
                  />
                  <span className="text-white w-12 text-right">{settings.temperature}</span>
                </div>
              </div>

              {/* Top P */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Top P
                  <span className="ml-2 text-xs text-slate-500">(Núcleo de amostragem)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={settings.topP}
                    onChange={(e) => setSettings({ ...settings, topP: parseFloat(e.target.value) })}
                    min="0"
                    max="1"
                    step="0.1"
                    className="flex-1"
                  />
                  <span className="text-white w-12 text-right">{settings.topP}</span>
                </div>
              </div>

              {/* Frequency Penalty */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Frequency Penalty
                  <span className="ml-2 text-xs text-slate-500">(Reduz repetições)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={settings.frequencyPenalty}
                    onChange={(e) => setSettings({ ...settings, frequencyPenalty: parseFloat(e.target.value) })}
                    min="-2"
                    max="2"
                    step="0.1"
                    className="flex-1"
                  />
                  <span className="text-white w-12 text-right">{settings.frequencyPenalty}</span>
                </div>
              </div>

              {/* Presence Penalty */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Presence Penalty
                  <span className="ml-2 text-xs text-slate-500">(Aumenta diversidade)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={settings.presencePenalty}
                    onChange={(e) => setSettings({ ...settings, presencePenalty: parseFloat(e.target.value) })}
                    min="-2"
                    max="2"
                    step="0.1"
                    className="flex-1"
                  />
                  <span className="text-white w-12 text-right">{settings.presencePenalty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cost Estimation */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Estimativa de Custo
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400 mb-1">Por artigo (≈2000 tokens)</p>
                <p className="text-xl font-mono text-white">
                  ${calculateEstimatedCost(1000, 1000)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ≈ R$ {(parseFloat(calculateEstimatedCost(1000, 1000)) * 6).toFixed(2)}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800">
                <p className="text-sm text-slate-400 mb-1">Por 100 artigos</p>
                <p className="text-lg font-mono text-white">
                  ${(parseFloat(calculateEstimatedCost(1000, 1000)) * 100).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ≈ R$ {(parseFloat(calculateEstimatedCost(1000, 1000)) * 100 * 6).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Model Comparison */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Comparação Rápida
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Velocidade:</span>
                <span className="text-white">
                  {settings.model.includes('mini') || settings.model.includes('flash') || settings.model.includes('haiku')
                    ? '⚡⚡⚡'
                    : settings.model.includes('turbo')
                    ? '⚡⚡'
                    : '⚡'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Qualidade:</span>
                <span className="text-white">
                  {settings.model.includes('opus') || settings.model.includes('gpt-4o')
                    ? '⭐⭐⭐'
                    : settings.model.includes('sonnet') || settings.model.includes('pro')
                    ? '⭐⭐'
                    : '⭐'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Custo:</span>
                <span className="text-white">
                  {settings.costPerInputToken < 0.001
                    ? '💰'
                    : settings.costPerInputToken < 0.01
                    ? '💰💰'
                    : '💰💰💰'}
                </span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/50">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Dica de Otimização</p>
                <p className="text-xs opacity-90">
                  Para conteúdo de produtos, use modelos mais baratos como GPT-4o Mini ou Gemini Flash. 
                  Reserve modelos premium para conteúdo complexo.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-coral text-white rounded-lg font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};