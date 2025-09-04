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
  Image,
  ExternalLink,
  Download,
  Users,
  Calendar,
  Tag
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Theme {
  _id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  authorUrl?: string;
  category: string;
  description: string;
  previewUrl?: string;
  downloadUrl?: string;
  demoUrl?: string;
  screenshotUrls: string[];
  tags: string[];
  rating: number;
  downloadCount: number;
  lastUpdated: Date;
  isActive: boolean;
  isDefault: boolean;
  isPremium: boolean;
  price?: number;
}

const categories = [
  { key: 'blog', label: 'Blog', icon: '📝' },
  { key: 'business', label: 'Negócios', icon: '🏢' },
  { key: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { key: 'portfolio', label: 'Portfólio', icon: '🎨' },
  { key: 'agency', label: 'Agência', icon: '💼' },
  { key: 'magazine', label: 'Revista', icon: '📰' },
  { key: 'landing', label: 'Landing Page', icon: '🎯' },
];

export default function ThemeManagement() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    version: '',
    author: '',
    authorUrl: '',
    category: 'blog',
    description: '',
    previewUrl: '',
    downloadUrl: '',
    demoUrl: '',
    screenshotUrls: [''],
    tags: [''],
    rating: 5,
    isActive: true,
    isDefault: false,
    isPremium: false,
    price: 0
  });

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await api.get('/api/wordpress-themes');
      setThemes(response.data.data.themes || []);
    } catch (error) {
      toast.error('Erro ao carregar temas');
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredThemes = themes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         theme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         theme.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || theme.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = () => {
    setEditingTheme(null);
    setFormData({
      name: '',
      slug: '',
      version: '',
      author: '',
      authorUrl: '',
      category: 'blog',
      description: '',
      previewUrl: '',
      downloadUrl: '',
      demoUrl: '',
      screenshotUrls: [''],
      tags: [''],
      rating: 5,
      isActive: true,
      isDefault: false,
      isPremium: false,
      price: 0
    });
    setShowModal(true);
  };

  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme);
    setFormData({
      name: theme.name,
      slug: theme.slug,
      version: theme.version,
      author: theme.author,
      authorUrl: theme.authorUrl || '',
      category: theme.category,
      description: theme.description,
      previewUrl: theme.previewUrl || '',
      downloadUrl: theme.downloadUrl || '',
      demoUrl: theme.demoUrl || '',
      screenshotUrls: theme.screenshotUrls.length ? theme.screenshotUrls : [''],
      tags: theme.tags.length ? theme.tags : [''],
      rating: theme.rating,
      isActive: theme.isActive,
      isDefault: theme.isDefault,
      isPremium: theme.isPremium,
      price: theme.price || 0
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        screenshotUrls: formData.screenshotUrls.filter(url => url.trim() !== ''),
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        price: formData.isPremium ? formData.price : undefined
      };

      if (editingTheme) {
        await api.put('/api/wordpress-themes/${editingTheme._id}', payload);
        toast.success('Tema atualizado com sucesso!');
      } else {
        await api.post('/api/wordpress-themes', payload);
        toast.success('Tema criado com sucesso!');
      }
      
      setShowModal(false);
      fetchThemes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar tema');
    }
  };

  const handleToggleActive = async (theme: Theme) => {
    try {
      await api.post('/api/wordpress-themes/${theme._id}/toggle-active');
      toast.success(`Tema ${theme.isActive ? 'desativado' : 'ativado'} com sucesso!`);
      fetchThemes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleToggleDefault = async (theme: Theme) => {
    try {
      await api.post('/api/wordpress-themes/${theme._id}/toggle-default');
      toast.success(`Status de padrão ${theme.isDefault ? 'removido' : 'definido'}!`);
      fetchThemes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status padrão');
    }
  };

  const handleDelete = async (theme: Theme) => {
    if (!confirm(`Tem certeza que deseja excluir o tema "${theme.name}"?`)) return;
    
    try {
      await api.delete('/api/wordpress-themes/${theme._id}');
      toast.success('Tema excluído com sucesso!');
      fetchThemes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir tema');
    }
  };

  const addArrayField = (field: 'screenshotUrls' | 'tags') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'screenshotUrls' | 'tags', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayField = (field: 'screenshotUrls' | 'tags', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
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
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Temas WordPress</h1>
          <p className="text-gray-600">Adicione, edite e gerencie os temas disponíveis para instalação</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Tema
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar temas..."
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

      {/* Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map(theme => (
          <div key={theme._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative h-48 bg-gray-100">
              {theme.screenshotUrls[0] ? (
                <img 
                  src={theme.screenshotUrls[0]} 
                  alt={theme.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Image className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                {theme.isDefault && (
                  <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Padrão
                  </span>
                )}
                {theme.isPremium && (
                  <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Premium
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  theme.isActive 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-500 text-white'
                }`}>
                  {theme.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm text-gray-600">{theme.rating}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{theme.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>por {theme.author}</span>
                <span>v{theme.version}</span>
              </div>

              <div className="flex items-center gap-1 mb-3">
                <Tag className="w-3 h-3 text-gray-400" />
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                  {categories.find(c => c.key === theme.category)?.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  <span>{theme.downloadCount} downloads</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(theme.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(theme)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(theme)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
                    theme.isActive
                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {theme.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleToggleDefault(theme)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
                    theme.isDefault
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {theme.isDefault ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleDelete(theme)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredThemes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Image className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum tema encontrado</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione seu primeiro tema WordPress'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h2 className="text-xl font-bold mb-6">
                {editingTheme ? 'Editar Tema' : 'Adicionar Novo Tema'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Tema *
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
                    URL de Download
                  </label>
                  <input
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({...formData, downloadUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                />
              </div>

              {/* Screenshots URLs */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URLs das Screenshots
                </label>
                {formData.screenshotUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateArrayField('screenshotUrls', index, e.target.value)}
                      placeholder="https://example.com/screenshot.png"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayField('screenshotUrls', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('screenshotUrls')}
                  className="text-sm text-coral hover:text-coral-dark"
                >
                  + Adicionar Screenshot
                </button>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => updateArrayField('tags', index, e.target.value)}
                      placeholder="responsive, minimal, clean"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral focus:border-coral"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayField('tags', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('tags')}
                  className="text-sm text-coral hover:text-coral-dark"
                >
                  + Adicionar Tag
                </button>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Tema Ativo</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                    className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Tema Padrão da Categoria</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPremium}
                    onChange={(e) => setFormData({...formData, isPremium: e.target.checked})}
                    className="w-4 h-4 text-coral focus:ring-coral border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Tema Premium</span>
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
                  {editingTheme ? 'Atualizar' : 'Criar'} Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}