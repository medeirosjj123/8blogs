import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Folder,
  Search,
  BarChart,
  Zap,
  Shield,
  Globe,
  FileText,
  Activity,
  Rocket,
  Package,
  Settings,
  Layout,
  Archive,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  isSystem: boolean;
  featureCount?: number;
}

const iconOptions = [
  { name: 'Folder', icon: Folder },
  { name: 'Search', icon: Search },
  { name: 'BarChart', icon: BarChart },
  { name: 'Zap', icon: Zap },
  { name: 'Shield', icon: Shield },
  { name: 'Globe', icon: Globe },
  { name: 'FileText', icon: FileText },
  { name: 'Activity', icon: Activity },
  { name: 'Rocket', icon: Rocket },
  { name: 'Package', icon: Package },
  { name: 'Settings', icon: Settings },
  { name: 'Layout', icon: Layout },
  { name: 'Archive', icon: Archive }
];

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'Folder',
    color: '#666666',
    order: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` },
        params: { includeInactive: true }
      });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('Initialize default categories? This will create system categories if they don\'t exist.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/admin/categories/initialize', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Default categories initialized');
      await fetchCategories();
    } catch (error) {
      console.error('Error initializing categories:', error);
      toast.error('Failed to initialize default categories');
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/admin/categories', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Category created successfully');
      setCreatingNew(false);
      setFormData({
        code: '',
        name: '',
        description: '',
        icon: 'Folder',
        color: '#666666',
        order: 0
      });
      await fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/admin/categories/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Category updated successfully');
      setEditingId(null);
      await fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/categories/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Category status updated');
      await fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Failed to toggle category status');
    }
  };

  const handleDelete = async (id: string, name: string, featureCount?: number, isSystem?: boolean) => {
    // Check if category has features
    if (featureCount && featureCount > 0) {
      toast.error(`Não é possível excluir. Esta categoria tem ${featureCount} feature(s) associada(s).`);
      return;
    }
    
    let confirmMessage = `Tem certeza que deseja excluir a categoria "${name}"?`;
    
    if (isSystem) {
      confirmMessage = `⚠️ ATENÇÃO: "${name}" é uma categoria do SISTEMA!\n\nExcluir categorias do sistema pode afetar o funcionamento da plataforma.\n\nTem CERTEZA ABSOLUTA que deseja excluir?`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // For system categories, ask for double confirmation
    if (isSystem) {
      const secondConfirm = prompt(`Para confirmar a exclusão da categoria do sistema "${name}", digite o nome da categoria:`);
      if (secondConfirm !== name) {
        toast.error('Nome incorreto. Exclusão cancelada.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { forceDelete: isSystem } // Send forceDelete flag for system categories
      });
      
      toast.success('Categoria excluída com sucesso');
      await fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      
      // Handle special case where backend asks for confirmation
      if (error.response?.data?.requiresConfirmation) {
        if (confirm('Esta é uma categoria do sistema. Tem certeza ABSOLUTA que deseja excluir?')) {
          try {
            await axios.delete(`/api/admin/categories/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
              data: { forceDelete: true }
            });
            toast.success('Categoria do sistema excluída com sucesso');
            await fetchCategories();
          } catch (retryError: any) {
            toast.error(retryError.response?.data?.message || 'Falha ao excluir categoria');
          }
        }
      } else {
        toast.error(error.response?.data?.message || 'Falha ao excluir categoria');
      }
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category._id);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'Folder',
      color: category.color || '#666666',
      order: category.order
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setCreatingNew(false);
    setFormData({
      code: '',
      name: '',
      description: '',
      icon: 'Folder',
      color: '#666666',
      order: 0
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.name === iconName);
    const Icon = iconOption?.icon || Folder;
    return <Icon size={20} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorias</h1>
          <p className="text-slate-400 mt-1">
            Gerencie as categorias das ferramentas
          </p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Inicializar Padrões
            </button>
          )}
          <button
            onClick={() => setCreatingNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/80 transition-colors"
          >
            <Plus size={20} />
            Nova Categoria
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <div className="grid grid-cols-7 gap-4 text-sm font-medium text-slate-400">
            <div>Ícone</div>
            <div>Código</div>
            <div>Nome</div>
            <div className="col-span-2">Descrição</div>
            <div>Features</div>
            <div>Ações</div>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {creatingNew && (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    {getIconComponent(formData.icon)}
                  </div>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="text-sm bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                  >
                    {iconOptions.map(opt => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="codigo-categoria"
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
                  pattern="[a-z0-9-]+"
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da Categoria"
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional"
                  className="col-span-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
                />
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                  >
                    <Save size={20} />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {categories.map((category) => (
            <div key={category._id} className="p-4">
              {editingId === category._id ? (
                <div className="grid grid-cols-7 gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: formData.color }}
                    >
                      {getIconComponent(formData.icon)}
                    </div>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="text-sm bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    >
                      {iconOptions.map(opt => (
                        <option key={opt.name} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
                    disabled={category.isSystem}
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="col-span-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(category._id)}
                      className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                    >
                      <Save size={20} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: category.color || '#666666' }}
                    >
                      {getIconComponent(category.icon || 'Folder')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-300">{category.code}</span>
                    {category.isSystem && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                        Sistema
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-white">{category.name}</div>
                  <div className="col-span-2 text-slate-400 text-sm">
                    {category.description || '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{category.featureCount || 0}</span>
                    <span className="text-slate-400 text-sm"> features</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleStatus(category._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        category.isActive 
                          ? 'text-green-500 hover:bg-green-500/10' 
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      title={category.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {category.isActive ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(category._id, category.name, category.featureCount, category.isSystem)}
                      className={`p-2 rounded-lg transition-colors relative ${
                        category.featureCount && category.featureCount > 0
                          ? 'text-gray-400 hover:bg-gray-500/10 cursor-not-allowed'
                          : category.isSystem
                          ? 'text-orange-500 hover:bg-orange-500/10'
                          : 'text-red-500 hover:bg-red-500/10'
                      }`}
                      title={
                        category.featureCount && category.featureCount > 0 
                          ? `Não pode excluir - ${category.featureCount} features usando` 
                          : category.isSystem
                          ? "⚠️ Excluir categoria do sistema (requer confirmação dupla)"
                          : "Excluir categoria"
                      }
                    >
                      {category.isSystem && !(category.featureCount && category.featureCount > 0) && (
                        <AlertTriangle size={12} className="absolute -top-1 -right-1 text-orange-500" />
                      )}
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};