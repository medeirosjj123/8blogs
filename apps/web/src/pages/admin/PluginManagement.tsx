import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  StarOff,
  Search,
  Filter,
  Plug,
  ExternalLink,
  Download,
  Users,
  Calendar,
  Tag,
  AlertTriangle,
  Shield,
  Zap
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Plugin {
  _id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  authorUrl?: string;
  category: string;
  description: string;
  shortDescription: string;
  downloadUrl?: string;
  repositoryUrl?: string;
  tags: string[];
  rating: number;
  downloadCount: number;
  activeInstalls: number;
  lastUpdated: Date;
  testedUpTo: string;
  requiresWp: string;
  isActive: boolean;
  isDefault: boolean;
  isPremium: boolean;
  price?: number;
  conflicts?: string[];
  dependencies?: string[];
}

const categories = [
  { key: 'seo', label: 'SEO', icon: '🔍' },
  { key: 'security', label: 'Segurança', icon: '🛡️' },
  { key: 'performance', label: 'Performance', icon: '⚡' },
  { key: 'backup', label: 'Backup', icon: '💾' },
  { key: 'forms', label: 'Formulários', icon: '📝' },
  { key: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'social', label: 'Social Media', icon: '📱' },
  { key: 'content', label: 'Conteúdo', icon: '📄' },
  { key: 'utilities', label: 'Utilitários', icon: '🔧' },
];

export default function PluginManagement() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    version: '',
    author: '',
    authorUrl: '',
    category: 'utilities',
    description: '',
    shortDescription: '',
    downloadUrl: '',
    repositoryUrl: '',
    tags: [''],
    rating: 5,
    testedUpTo: '6.4',
    requiresWp: '5.0',
    isActive: true,
    isDefault: false,
    isPremium: false,
    price: 0,
    conflicts: [''],
    dependencies: ['']
  });

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    try {
      const response = await api.get('/wordpress-plugins');
      setPlugins(response.data.data.plugins || []);
    } catch (error) {
      toast.error('Erro ao carregar plugins');
      console.error('Error fetching plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || plugin.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = () => {
    setEditingPlugin(null);
    setFormData({
      name: '',
      slug: '',
      version: '',
      author: '',
      authorUrl: '',
      category: 'utilities',
      description: '',
      shortDescription: '',
      downloadUrl: '',
      repositoryUrl: '',
      tags: [''],
      rating: 5,
      testedUpTo: '6.4',
      requiresWp: '5.0',
      isActive: true,
      isDefault: false,
      isPremium: false,
      price: 0,
      conflicts: [''],
      dependencies: ['']
    });
    setShowModal(true);
  };

  const handleEdit = (plugin: Plugin) => {
    setEditingPlugin(plugin);
    setFormData({
      name: plugin.name,
      slug: plugin.slug,
      version: plugin.version,
      author: plugin.author,
      authorUrl: plugin.authorUrl || '',
      category: plugin.category,
      description: plugin.description,
      shortDescription: plugin.shortDescription,
      downloadUrl: plugin.downloadUrl || '',
      repositoryUrl: plugin.repositoryUrl || '',
      tags: plugin.tags.length ? plugin.tags : [''],
      rating: plugin.rating,
      testedUpTo: plugin.testedUpTo,
      requiresWp: plugin.requiresWp,
      isActive: plugin.isActive,
      isDefault: plugin.isDefault,
      isPremium: plugin.isPremium,
      price: plugin.price || 0,
      conflicts: plugin.conflicts?.length ? plugin.conflicts : [''],
      dependencies: plugin.dependencies?.length ? plugin.dependencies : ['']
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        conflicts: formData.conflicts.filter(conflict => conflict.trim() !== ''),
        dependencies: formData.dependencies.filter(dep => dep.trim() !== ''),
        price: formData.isPremium ? formData.price : undefined
      };

      if (editingPlugin) {
        await api.put(`/wordpress-plugins/${editingPlugin._id}`, payload);
        toast.success('Plugin atualizado com sucesso!');
      } else {
        await api.post('/wordpress-plugins', payload);
        toast.success('Plugin criado com sucesso!');
      }
      
      setShowModal(false);
      fetchPlugins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar plugin');
    }
  };

  const handleToggleActive = async (plugin: Plugin) => {
    try {
      await api.post(`/wordpress-plugins/${plugin._id}/toggle-active`);
      toast.success(`Plugin ${plugin.isActive ? 'desativado' : 'ativado'} com sucesso!`);
      fetchPlugins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleToggleDefault = async (plugin: Plugin) => {
    try {
      await api.post(`/wordpress-plugins/${plugin._id}/toggle-default`);
      toast.success(`Status de padrão ${plugin.isDefault ? 'removido' : 'definido'}!`);
      fetchPlugins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status padrão');
    }
  };

  const handleDelete = async (plugin: Plugin) => {
    if (!confirm(`Tem certeza que deseja excluir o plugin "${plugin.name}"?`)) return;
    
    try {
      await api.delete(`/wordpress-plugins/${plugin._id}`);
      toast.success('Plugin excluído com sucesso!');
      fetchPlugins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir plugin');
    }
  };

  const addArrayField = (field: 'tags' | 'conflicts' | 'dependencies') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'tags' | 'conflicts' | 'dependencies', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayField = (field: 'tags' | 'conflicts' | 'dependencies', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.key === category);
    return cat?.icon || '🔧';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Plugins WordPress</h1>
          <p className="text-gray-600">Adicione, edite e gerencie os plugins disponíveis para instalação</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Plugin
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral bg-white"
            >
              <option value="">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins.map(plugin => (
          <div key={plugin._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    <Plug className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                    <p className="text-sm text-gray-600">v{plugin.version}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {plugin.isDefault && (
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium text-center">
                      Padrão
                    </span>
                  )}
                  {plugin.isPremium && (
                    <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium text-center">
                      Premium
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium text-center ${
                    plugin.isActive 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-500 text-white'
                  }`}>
                    {plugin.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plugin.shortDescription}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>por {plugin.author}</span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-gray-600">{plugin.rating}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 mb-3">
                <span className="text-lg">{getCategoryIcon(plugin.category)}</span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                  {categories.find(c => c.key === plugin.category)?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  <span>{plugin.downloadCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{plugin.activeInstalls?.toLocaleString() || '0'}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                <div>Testado até: WordPress {plugin.testedUpTo}</div>
                <div>Requer: WordPress {plugin.requiresWp}+</div>
              </div>

              {/* Conflicts & Dependencies */}
              {(plugin.conflicts?.length || plugin.dependencies?.length) && (
                <div className="mb-3">
                  {plugin.conflicts?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Conflitos: {plugin.conflicts.length}</span>
                    </div>
                  )}
                  {plugin.dependencies?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Shield className="w-3 h-3" />
                      <span>Dependências: {plugin.dependencies.length}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(plugin)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(plugin)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
                    plugin.isActive
                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {plugin.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleToggleDefault(plugin)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
                    plugin.isDefault
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {plugin.isDefault ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleDelete(plugin)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plug className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum plugin encontrado</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione seu primeiro plugin WordPress'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h2 className="text-xl font-bold mb-6">
                {editingPlugin ? 'Editar Plugin' : 'Adicionar Novo Plugin'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Plugin *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Versão *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  >
                    {categories.map(cat => (
                      <option key={cat.key} value={cat.key}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Autor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do Autor
                  </label>
                  <input
                    type="url"
                    value={formData.authorUrl}
                    onChange={(e) => setFormData({...formData, authorUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Avaliação (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Testado até (WordPress)
                  </label>
                  <input
                    type="text"
                    value={formData.testedUpTo}
                    onChange={(e) => setFormData({...formData, testedUpTo: e.target.value})}
                    placeholder="6.4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requer WordPress
                  </label>
                  <input
                    type="text"
                    value={formData.requiresWp}
                    onChange={(e) => setFormData({...formData, requiresWp: e.target.value})}
                    placeholder="5.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Download
                  </label>
                  <input
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({...formData, downloadUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do Repositório
                  </label>
                  <input
                    type="url"
                    value={formData.repositoryUrl}
                    onChange={(e) => setFormData({...formData, repositoryUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição Curta *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição Completa *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>
              </div>

              {/* Arrays */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  {formData.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateArrayField('tags', index, e.target.value)}
                        placeholder="seo, security"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayField('tags', index)}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('tags')}
                    className="text-xs text-coral hover:text-coral-dark"
                  >
                    + Adicionar Tag
                  </button>
                </div>

                {/* Conflicts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conflitos (Slugs de Plugins)
                  </label>
                  {formData.conflicts.map((conflict, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={conflict}
                        onChange={(e) => updateArrayField('conflicts', index, e.target.value)}
                        placeholder="plugin-slug"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayField('conflicts', index)}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('conflicts')}
                    className="text-xs text-coral hover:text-coral-dark"
                  >
                    + Adicionar Conflito
                  </button>
                </div>

                {/* Dependencies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dependências (Slugs de Plugins)
                  </label>
                  {formData.dependencies.map((dependency, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={dependency}
                        onChange={(e) => updateArrayField('dependencies', index, e.target.value)}
                        placeholder="required-plugin-slug"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayField('dependencies', index)}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('dependencies')}
                    className="text-xs text-coral hover:text-coral-dark"
                  >
                    + Adicionar Dependência
                  </button>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Plugin Ativo</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                    className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Plugin Padrão</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPremium}
                    onChange={(e) => setFormData({...formData, isPremium: e.target.checked})}
                    className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Plugin Premium</span>
                </label>

                {formData.isPremium && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
                >
                  {editingPlugin ? 'Atualizar' : 'Criar'} Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}