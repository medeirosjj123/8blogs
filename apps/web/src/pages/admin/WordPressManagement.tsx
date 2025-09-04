import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Plug, 
  Settings,
  TrendingUp,
  Users,
  Download,
  Star,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Stats {
  themes: {
    total: number;
    active: number;
    defaults: number;
    premium: number;
  };
  plugins: {
    total: number;
    active: number;
    defaults: number;
    premium: number;
  };
}

interface RecentItem {
  _id: string;
  name: string;
  type: 'theme' | 'plugin';
  category: string;
  rating: number;
  isActive: boolean;
  isDefault: boolean;
  isPremium: boolean;
  downloadCount?: number;
  lastUpdated: Date;
}

export default function WordPressManagement() {
  const [stats, setStats] = useState<Stats>({
    themes: { total: 0, active: 0, defaults: 0, premium: 0 },
    plugins: { total: 0, active: 0, defaults: 0, premium: 0 }
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats and recent items in parallel
      const [themesRes, pluginsRes] = await Promise.all([
        api.get('/api/wordpress-themes'),
        api.get('/api/wordpress-plugins')
      ]);

      const themes = themesRes.data.data?.themes || [];
      const plugins = pluginsRes.data.data?.plugins || [];

      // Calculate stats
      const themeStats = {
        total: themes.length,
        active: themes.filter((t: any) => t.isActive).length,
        defaults: themes.filter((t: any) => t.isDefault).length,
        premium: themes.filter((t: any) => t.isPremium).length
      };

      const pluginStats = {
        total: plugins.length,
        active: plugins.filter((p: any) => p.isActive).length,
        defaults: plugins.filter((p: any) => p.isDefault).length,
        premium: plugins.filter((p: any) => p.isPremium).length
      };

      setStats({ themes: themeStats, plugins: pluginStats });

      // Combine and sort recent items
      const allItems = [
        ...themes.map((t: any) => ({ ...t, type: 'theme' as const })),
        ...plugins.map((p: any) => ({ ...p, type: 'plugin' as const }))
      ];
      
      const sortedItems = allItems
        .sort((a, b) => new Date(b.lastUpdated || b.updatedAt).getTime() - new Date(a.lastUpdated || a.updatedAt).getTime())
        .slice(0, 10);

      setRecentItems(sortedItems);

    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (item: RecentItem, action: 'active' | 'default') => {
    try {
      const endpoint = item.type === 'theme' ? 'wordpress-themes' : 'wordpress-plugins';
      const toggleEndpoint = action === 'active' ? 'toggle-active' : 'toggle-default';
      
      await api.post('/api/${endpoint}/${item._id}/${toggleEndpoint}');
      
      const actionText = action === 'active' 
        ? (item.isActive ? 'desativado' : 'ativado')
        : (item.isDefault ? 'removido como padrão' : 'definido como padrão');
      
      toast.success(`${item.type === 'theme' ? 'Tema' : 'Plugin'} ${actionText}!`);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento WordPress</h1>
          <p className="text-gray-600 mt-1">
            Configure temas e plugins disponíveis para instalação
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/wordpress/themes"
          className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2 group-hover:text-purple-700">
                Gerenciar Temas
              </h3>
              <p className="text-purple-700 text-sm">
                Adicione, edite e configure temas WordPress
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center group-hover:bg-purple-300 transition-colors">
              <Palette className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link
          to="/admin/wordpress/plugins"
          className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2 group-hover:text-blue-700">
                Gerenciar Plugins
              </h3>
              <p className="text-blue-700 text-sm">
                Adicione, edite e configure plugins WordPress
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center group-hover:bg-blue-300 transition-colors">
              <Plug className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Temas</p>
              <p className="text-3xl font-bold text-gray-900">{stats.themes.total}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Palette className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats.themes.active} ativos</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-yellow-600 font-medium">{stats.themes.defaults} padrão</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Plugins</p>
              <p className="text-3xl font-bold text-gray-900">{stats.plugins.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plug className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats.plugins.active} ativos</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-yellow-600 font-medium">{stats.plugins.defaults} padrão</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Itens Premium</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.themes.premium + stats.plugins.premium}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-purple-600 font-medium">{stats.themes.premium} temas</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-blue-600 font-medium">{stats.plugins.premium} plugins</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Ativação</p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(((stats.themes.active + stats.plugins.active) / (stats.themes.total + stats.plugins.total)) * 100) || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            dos itens estão ativos
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Atualizações Recentes</h2>
            <Link
              to="/admin/wordpress/themes"
              className="text-sm text-coral hover:text-coral-dark font-medium"
            >
              Ver todos →
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {recentItems.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</h3>
              <p className="text-gray-600 mb-4">Adicione temas e plugins para começar</p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/admin/wordpress/themes"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Tema
                </Link>
                <Link
                  to="/admin/wordpress/plugins"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Plugin
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentItems.map((item) => (
                <div
                  key={`${item.type}-${item._id}`}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.type === 'theme' 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {item.type === 'theme' ? (
                        <Palette className="w-5 h-5" />
                      ) : (
                        <Plug className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'theme'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.type === 'theme' ? 'Tema' : 'Plugin'}
                        </span>
                        {item.isPremium && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            Premium
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{item.category}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span>{item.rating}</span>
                        </div>
                        {item.downloadCount && (
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            <span>{item.downloadCount.toLocaleString()}</span>
                          </div>
                        )}
                        <span>{new Date(item.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badges */}
                    <div className="flex items-center gap-1">
                      {item.isDefault && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          Padrão
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickToggle(item, 'active')}
                        className={`p-2 rounded-lg transition-colors ${
                          item.isActive
                            ? 'text-gray-600 hover:bg-gray-100'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={item.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleQuickToggle(item, 'default')}
                        className={`p-2 rounded-lg transition-colors ${
                          item.isDefault
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={item.isDefault ? 'Remover como padrão' : 'Definir como padrão'}
                      >
                        <Star className={`w-4 h-4 ${item.isDefault ? 'fill-current' : ''}`} />
                      </button>

                      <Link
                        to={`/admin/wordpress/${item.type === 'theme' ? 'themes' : 'plugins'}`}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Gerenciar"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Dicas de Uso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Temas Padrão</h4>
            <p>Defina um tema padrão por categoria para instalações automáticas mais rápidas.</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Conflitos de Plugins</h4>
            <p>Configure conflitos entre plugins para evitar incompatibilidades nas instalações.</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Organização</h4>
            <p>Use tags e categorias para organizar e facilitar a busca de temas e plugins.</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Atualizações</h4>
            <p>Mantenha as versões atualizadas para garantir compatibilidade e segurança.</p>
          </div>
        </div>
      </div>
    </div>
  );
}