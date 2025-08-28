import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Download,
  Search,
  Filter,
  MoreVertical,
  Upload,
  Globe,
  Zap,
  Award
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';
import { TemplateForm } from '../../components/admin/templates/TemplateForm';
import { TemplatePreview } from '../../components/admin/templates/TemplatePreview';

interface Template {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: 'active' | 'draft' | 'archived';
  thumbnailUrl?: string;
  downloadUrl: string;
  downloads: number;
  seoScore: number;
  performanceScore: number;
  difficulty: string;
  pricingTier: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

const AdminTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, filterCategory, filterStatus]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await adminService.getTemplates({
        page: currentPage,
        limit: 10,
        category: filterCategory || undefined,
        status: filterStatus || undefined
      });
      
      console.log('Templates response:', response);
      
      // The service should return the data directly now
      setTemplates(response?.templates || []);
      setTotalPages(response?.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
      setTemplates([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      try {
        await adminService.deleteTemplate(id);
        toast.success('Template excluído com sucesso');
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('Erro ao excluir template');
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await adminService.toggleTemplateStatus(id);
      toast.success('Status atualizado com sucesso');
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      blog: 'bg-blue-100 text-blue-800',
      affiliate: 'bg-green-100 text-green-800',
      business: 'bg-purple-100 text-purple-800',
      ecommerce: 'bg-yellow-100 text-yellow-800',
      portfolio: 'bg-pink-100 text-pink-800',
      landing: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Templates WordPress</h1>
        <p className="text-slate-400">Gerencie os templates disponíveis para instalação</p>
      </div>

      {/* Actions Bar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              <option value="">Todas Categorias</option>
              <option value="blog">Blog</option>
              <option value="affiliate">Afiliados</option>
              <option value="business">Negócios</option>
              <option value="ecommerce">E-commerce</option>
              <option value="portfolio">Portfolio</option>
              <option value="landing">Landing Page</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              <option value="">Todos Status</option>
              <option value="active">Ativo</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>

            <button
              onClick={() => {
                setSelectedTemplate(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-coral hover:bg-coral-dark text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Template
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <p className="text-slate-400">Nenhum template encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-slate-800 relative">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Globe className="w-12 h-12 text-slate-600" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(template.status)}`}>
                    {template.status === 'active' ? 'Ativo' : 
                     template.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                  <div className="relative group">
                    <button className="text-slate-400 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreview(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowForm(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleStatus(template._id)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                      >
                        {template.status === 'active' ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Ativar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template._id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatFileSize(template.fileSize)}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{template.performanceScore}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>SEO {template.seoScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>{template.downloads}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === page
                  ? 'bg-coral text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <TemplateForm
          template={selectedTemplate}
          onClose={() => {
            setShowForm(false);
            setSelectedTemplate(null);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedTemplate(null);
            fetchTemplates();
          }}
        />
      )}

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => {
            setShowPreview(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminTemplates;