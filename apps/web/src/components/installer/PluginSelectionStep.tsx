import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Plug,
  Shield,
  Zap,
  Search,
  Mail,
  ShoppingCart,
  BarChart,
  Share2,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Star,
  Download,
  AlertTriangle
} from 'lucide-react';

interface PluginSelectionProps {
  onPluginsSelected: (plugins: string[]) => void;
  selectedTheme?: any;
  siteCategory?: string;
}

interface WordPressPlugin {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: 'seo' | 'security' | 'performance' | 'backup' | 'forms' | 'ecommerce' | 'analytics' | 'social' | 'content' | 'utilities';
  version: string;
  author: string;
  rating?: number;
  downloadCount?: number;
  isDefault: boolean;
  isPremium: boolean;
  features: string[];
  dependencies?: string[];
  conflicts?: string[];
}

export const PluginSelectionStep: React.FC<PluginSelectionProps> = ({
  onPluginsSelected,
  selectedTheme,
  siteCategory
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('PluginSelectionStep mounted with props:', { 
      hasOnPluginsSelected: typeof onPluginsSelected === 'function',
      selectedTheme: selectedTheme?.name,
      siteCategory 
    });
  }, [onPluginsSelected, selectedTheme, siteCategory]);
  const [plugins, setPlugins] = useState<WordPressPlugin[]>([]);
  const [pluginsByCategory, setPluginsByCategory] = useState<Record<string, WordPressPlugin[]>>({});
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);

  const categoryConfig = {
    seo: { label: 'SEO', icon: Search, color: 'green', description: 'Otimização para motores de busca' },
    security: { label: 'Segurança', icon: Shield, color: 'red', description: 'Proteção e segurança do site' },
    performance: { label: 'Performance', icon: Zap, color: 'yellow', description: 'Velocidade e otimização' },
    backup: { label: 'Backup', icon: FileText, color: 'blue', description: 'Backup e restauração' },
    forms: { label: 'Formulários', icon: Mail, color: 'purple', description: 'Formulários de contato e leads' },
    ecommerce: { label: 'E-commerce', icon: ShoppingCart, color: 'orange', description: 'Loja virtual e vendas' },
    analytics: { label: 'Analytics', icon: BarChart, color: 'indigo', description: 'Estatísticas e análises' },
    social: { label: 'Social', icon: Share2, color: 'pink', description: 'Redes sociais e compartilhamento' },
    content: { label: 'Conteúdo', icon: FileText, color: 'teal', description: 'Criação e gestão de conteúdo' },
    utilities: { label: 'Utilitários', icon: Settings, color: 'gray', description: 'Ferramentas e utilitários' }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  useEffect(() => {
    // Auto-select recommended plugins based on site category and theme
    if (plugins.length > 0 && selectedPlugins.size === 0) {
      autoSelectRecommendedPlugins();
    }
  }, [plugins, siteCategory, selectedTheme]);

  useEffect(() => {
    // Check for conflicts whenever selection changes
    if (selectedPlugins.size > 0) {
      checkPluginConflicts();
    }
  }, [selectedPlugins]);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/wordpress-plugins/active');
      
      if (response.data.success) {
        setPlugins(response.data.data.plugins);
        setPluginsByCategory(response.data.data.pluginsByCategory);
        setConflicts(response.data.data.conflicts || {});
      } else {
        setError('Erro ao carregar plugins');
      }
    } catch (err) {
      console.error('Error fetching plugins:', err);
      setError('Erro ao carregar plugins');
    } finally {
      setLoading(false);
    }
  };

  const autoSelectRecommendedPlugins = () => {
    const recommended = new Set<string>();

    // Always recommend essential plugins
    const essentialCategories = ['seo', 'security', 'backup'];
    
    essentialCategories.forEach(category => {
      if (pluginsByCategory[category]) {
        const defaultPlugin = pluginsByCategory[category].find(p => p.isDefault);
        if (defaultPlugin) {
          recommended.add(defaultPlugin.slug);
        }
      }
    });

    // Add category-specific recommendations
    if (siteCategory) {
      const categoryRecommendations: Record<string, string[]> = {
        blog: ['performance', 'social'],
        business: ['forms', 'analytics'],
        ecommerce: ['ecommerce', 'performance'],
        portfolio: ['social'],
        agency: ['forms', 'analytics'],
        magazine: ['social', 'content'],
        landing: ['forms', 'analytics']
      };

      const recommendedCategories = categoryRecommendations[siteCategory] || [];
      recommendedCategories.forEach(category => {
        if (pluginsByCategory[category]) {
          const defaultPlugin = pluginsByCategory[category].find(p => p.isDefault);
          if (defaultPlugin) {
            recommended.add(defaultPlugin.slug);
          }
        }
      });
    }

    setSelectedPlugins(recommended);
  };

  const checkPluginConflicts = async () => {
    try {
      const pluginSlugs = Array.from(selectedPlugins);
      const response = await api.post('/api/wordpress-plugins/check-conflicts', {
        pluginSlugs
      });

      if (response.data.success && response.data.data.hasConflicts) {
        setConflictWarnings(response.data.data.conflicts);
      } else {
        setConflictWarnings([]);
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    }
  };

  const togglePlugin = (plugin: WordPressPlugin) => {
    const newSelected = new Set(selectedPlugins);
    
    if (newSelected.has(plugin.slug)) {
      newSelected.delete(plugin.slug);
    } else {
      newSelected.add(plugin.slug);
    }
    
    setSelectedPlugins(newSelected);
  };

  const handleConfirmSelection = () => {
    console.log('handleConfirmSelection called');
    console.log('onPluginsSelected type:', typeof onPluginsSelected);
    console.log('onPluginsSelected value:', onPluginsSelected);
    
    if (typeof onPluginsSelected !== 'function') {
      console.error('onPluginsSelected is not a function:', typeof onPluginsSelected);
      console.error('Props received:', { onPluginsSelected, selectedTheme, siteCategory });
      alert('Error: onPluginsSelected callback is missing. Check console for details.');
      return;
    }
    
    const pluginsList = Array.from(selectedPlugins);
    console.log('Confirming plugin selection:', pluginsList);
    
    try {
      onPluginsSelected(pluginsList);
      console.log('Successfully called onPluginsSelected');
    } catch (error) {
      console.error('Error calling onPluginsSelected:', error);
      alert('Error calling callback function: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
          <p className="text-gray-600">Carregando plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Erro ao Carregar Plugins</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchPlugins}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Selecionar Plugins
        </h2>
        <p className="text-gray-600">
          Escolha os plugins que deseja instalar no seu WordPress
        </p>
      </div>

      {/* Selection Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium">
              {selectedPlugins.size} plugin{selectedPlugins.size !== 1 ? 's' : ''} selecionado{selectedPlugins.size !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedPlugins.size > 0 && (
            <button
              onClick={() => setSelectedPlugins(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Limpar seleção
            </button>
          )}
        </div>
      </div>

      {/* Conflict Warnings */}
      {conflictWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Conflitos Detectados</h4>
              <div className="space-y-1">
                {conflictWarnings.map((warning, index) => (
                  <p key={index} className="text-yellow-800 text-sm">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plugin Categories */}
      <div className="space-y-6">
        {Object.entries(categoryConfig).map(([categoryKey, config]) => {
          const categoryPlugins = pluginsByCategory[categoryKey] || [];
          
          if (categoryPlugins.length === 0) return null;

          const Icon = config.icon;
          
          return (
            <div key={categoryKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div className={`bg-${config.color}-50 border-b border-${config.color}-200 px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 text-${config.color}-600`} />
                    <div>
                      <h3 className={`font-semibold text-${config.color}-900`}>
                        {config.label}
                      </h3>
                      <p className={`text-sm text-${config.color}-700`}>
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <span className={`bg-${config.color}-200 text-${config.color}-800 text-xs px-2 py-1 rounded-full`}>
                    {categoryPlugins.length}
                  </span>
                </div>
              </div>

              {/* Category Plugins */}
              <div className="divide-y divide-gray-200">
                {categoryPlugins.map((plugin) => (
                  <div
                    key={plugin._id}
                    className={`p-4 transition-colors ${
                      selectedPlugins.has(plugin.slug) ? 'bg-coral/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex items-center pt-1">
                        <input
                          type="checkbox"
                          checked={selectedPlugins.has(plugin.slug)}
                          onChange={() => togglePlugin(plugin)}
                          className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                        />
                      </div>

                      {/* Plugin Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {plugin.name}
                              </h4>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                v{plugin.version}
                              </span>
                              {plugin.isDefault && (
                                <span className="text-xs text-coral bg-coral/10 px-2 py-0.5 rounded font-medium">
                                  Recomendado
                                </span>
                              )}
                              {plugin.isPremium && (
                                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded font-medium">
                                  Premium
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {plugin.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                              <span>por {plugin.author}</span>
                              {plugin.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span>{plugin.rating}</span>
                                </div>
                              )}
                              {plugin.downloadCount && (
                                <div className="flex items-center gap-1">
                                  <Download className="w-3 h-3" />
                                  <span>{plugin.downloadCount.toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Features */}
                            {plugin.features.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {plugin.features.slice(0, 4).map((feature, index) => (
                                  <span
                                    key={index}
                                    className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                  >
                                    {feature}
                                  </span>
                                ))}
                                {plugin.features.length > 4 && (
                                  <span className="inline-block text-gray-500 text-xs px-2 py-1">
                                    +{plugin.features.length - 4} mais
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Conflicts Warning */}
                            {plugin.conflicts && plugin.conflicts.length > 0 && (
                              <div className="mt-2 text-xs text-yellow-600">
                                ⚠️ Pode conflitar com: {plugin.conflicts.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Sobre os Plugins</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Plugins recomendados são selecionados automaticamente</li>
              <li>• Você pode adicionar/remover plugins após a instalação</li>
              <li>• Plugins premium requerem licenças separadas</li>
              <li>• Evitamos conflitos conhecidos automaticamente</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Selected Plugins Summary */}
      {selectedPlugins.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">
            Plugins que serão instalados:
          </h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedPlugins).map((slug) => {
              const plugin = plugins.find(p => p.slug === slug);
              if (!plugin) return null;
              
              return (
                <span
                  key={slug}
                  className="bg-green-200 text-green-800 text-sm px-3 py-1 rounded-full flex items-center gap-1"
                >
                  {plugin.name}
                  <button
                    onClick={() => togglePlugin(plugin)}
                    className="text-green-600 hover:text-green-800 ml-1"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleConfirmSelection}
        className="w-full py-3 px-4 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" />
        Continuar com {selectedPlugins.size} Plugin{selectedPlugins.size !== 1 ? 's' : ''}
      </button>
    </div>
  );
};