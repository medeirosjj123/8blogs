import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  ToggleLeft,
  Trash2,
  Edit2,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  Shield,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Plus,
  History,
  Globe,
  Server,
  Zap,
  BarChart,
  Folder,
  FileText,
  Edit,
  DollarSign,
  X,
  Save,
  Eye,
  Power,
  Wrench,
  Activity,
  Package,
  Scan,
  RotateCcw,
  Info
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';

type FeatureStatus = 'active' | 'disabled' | 'maintenance' | 'deprecated';

interface Category {
  _id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

interface Feature {
  _id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  status: FeatureStatus;
  icon?: string;
  route?: string;
  permissions: string[];
  config: any;
  dependencies: string[];
  version: string;
  releaseDate: Date;
  lastModified: Date;
  modifiedBy?: string;
  deletable: boolean;
  deleted: boolean;
  deletedAt?: Date;
  metadata: {
    usageCount?: number;
    lastUsed?: Date;
    activeUsers?: number;
    errorCount?: number;
    averageLoadTime?: number;
  };
  maintenanceMessage?: string;
}


const statusConfig = {
  active: {
    label: 'Ativo',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  disabled: {
    label: 'Desativado',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle
  },
  maintenance: {
    label: 'Manutenção',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Wrench
  },
  deprecated: {
    label: 'Descontinuado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle
  }
};

const iconMap: Record<string, React.ElementType> = {
  Globe,
  Server,
  Search,
  BarChart,
  Zap,
  Shield,
  Folder,
  FileText,
  Edit,
  DollarSign,
  Settings,
  Package,
  Activity
};

export default function AdminFeatures() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable' | 'delete' | null>(null);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [editFormData, setEditFormData] = useState<Partial<Feature>>({});
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/categories', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);
  
  const queryClient = useQueryClient();
  
  const { data: featuresData, isLoading, refetch } = useQuery({
    queryKey: ['admin-features', selectedCategory, selectedStatus],
    queryFn: () => adminService.getFeatures({
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      includeDeleted: false
    })
  });
  
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['feature-audit', selectedFeature?._id],
    queryFn: () => selectedFeature ? adminService.getFeatureAuditLogs(selectedFeature._id, 20) : null,
    enabled: !!selectedFeature && showAuditModal
  });
  
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.toggleFeatureStatus(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Status alterado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar status');
    }
  });
  
  const setMaintenanceMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      adminService.setFeatureMaintenanceMode(id, { maintenanceMessage: message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Modo de manutenção ativado');
      setShowMaintenanceModal(false);
      setMaintenanceMessage('');
      setSelectedFeature(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao ativar modo de manutenção');
    }
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, maintenanceMessage }: { id: string; status: string; maintenanceMessage?: string }) =>
      adminService.updateFeatureStatus(id, { status, maintenanceMessage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });
  
  const updateFeatureMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Feature> }) =>
      adminService.updateFeature(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Feature atualizada com sucesso');
      setShowEditModal(false);
      setSelectedFeature(null);
      setEditFormData({});
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar feature');
    }
  });
  
  const deleteFeatureMutation = useMutation({
    mutationFn: ({ id, code, reason }: { id: string; code: string; reason?: string }) =>
      adminService.deleteFeature(id, code, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Feature removida com sucesso');
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      setDeleteReason('');
      setSelectedFeature(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover feature');
    }
  });
  
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, action, reason }: { ids: string[]; action: 'enable' | 'disable' | 'delete'; reason?: string }) =>
      adminService.bulkUpdateFeatures(ids, action, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success(data.message || 'Operação em lote concluída');
      setSelectedFeatures([]);
      setBulkAction(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na operação em lote');
    }
  });
  
  const scanFeaturesMutation = useMutation({
    mutationFn: () => adminService.scanForFeatures(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      const { added, updated, deprecated } = data.data;
      toast.success(
        `Scan concluído: ${added.length} adicionadas, ${updated.length} atualizadas, ${deprecated.length} descontinuadas`
      );
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao escanear features');
    }
  });
  
  const initializeFeaturesMutation = useMutation({
    mutationFn: () => adminService.initializeFeatures(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Features padrão inicializadas');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao inicializar features');
    }
  });
  
  const features = featuresData?.features || [];
  const stats = featuresData?.stats || {};
  
  // Filter features
  const filteredFeatures = features.filter((feature: Feature) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        feature.name.toLowerCase().includes(search) ||
        feature.code.toLowerCase().includes(search) ||
        feature.description.toLowerCase().includes(search)
      );
    }
    return true;
  });
  
  const handleToggleStatus = (feature: Feature) => {
    if (feature.status === 'deprecated') {
      toast.error('Não é possível alternar features descontinuadas');
      return;
    }
    
    // Cycle through: active -> maintenance -> disabled -> active
    let newStatus: 'active' | 'maintenance' | 'disabled';
    if (feature.status === 'active') {
      newStatus = 'maintenance';
    } else if (feature.status === 'maintenance') {
      newStatus = 'disabled';
    } else {
      newStatus = 'active';
    }
    
    updateStatusMutation.mutate({ 
      id: feature._id, 
      status: newStatus,
      maintenanceMessage: newStatus === 'maintenance' ? 'Esta funcionalidade está em manutenção e será liberada em breve' : undefined
    });
  };
  
  const handleSetMaintenance = () => {
    if (!selectedFeature || !maintenanceMessage) {
      toast.error('Digite uma mensagem de manutenção');
      return;
    }
    
    setMaintenanceMutation.mutate({
      id: selectedFeature._id,
      message: maintenanceMessage
    });
  };
  
  const handleDelete = () => {
    if (!selectedFeature) return;
    
    if (deleteConfirmation !== selectedFeature.code) {
      toast.error('Código de confirmação incorreto');
      return;
    }
    
    deleteFeatureMutation.mutate({
      id: selectedFeature._id,
      code: selectedFeature.code,
      reason: deleteReason
    });
  };
  
  const handleBulkAction = () => {
    if (!bulkAction || selectedFeatures.length === 0) return;
    
    bulkUpdateMutation.mutate({
      ids: selectedFeatures,
      action: bulkAction,
      reason: `Ação em lote: ${bulkAction}`
    });
  };
  
  const getFeatureIcon = (iconName?: string) => {
    const Icon = iconMap[iconName || 'Settings'] || Settings;
    return Icon;
  };
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Features</h1>
          <p className="text-slate-400 mt-1">Controle as funcionalidades da plataforma</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => initializeFeaturesMutation.mutate()}
            disabled={initializeFeaturesMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Inicializar Padrões
          </button>
          <button
            onClick={() => scanFeaturesMutation.mutate()}
            disabled={scanFeaturesMutation.isPending}
            className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
          >
            {scanFeaturesMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4" />
            )}
            Escanear Código
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="text-2xl font-bold text-white">{stats.total || 0}</div>
          <div className="text-sm text-slate-400">Total</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="text-2xl font-bold text-green-400">{stats.active || 0}</div>
          <div className="text-sm text-slate-400">Ativas</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="text-2xl font-bold text-gray-400">{stats.disabled || 0}</div>
          <div className="text-sm text-slate-400">Desativadas</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="text-2xl font-bold text-yellow-400">{stats.maintenance || 0}</div>
          <div className="text-sm text-slate-400">Manutenção</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="text-2xl font-bold text-red-400">{stats.deprecated || 0}</div>
          <div className="text-sm text-slate-400">Descontinuadas</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="all">Todas as categorias</option>
            {categories.filter(cat => cat.isActive).map((cat) => (
              <option key={cat.code} value={cat.code}>{cat.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as FeatureStatus | 'all')}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="all">Todos os status</option>
            {Object.entries(statusConfig).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        
        {/* Bulk Actions */}
        {selectedFeatures.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-slate-800 rounded-lg">
            <span className="text-white">
              {selectedFeatures.length} selecionadas
            </span>
            <select
              value={bulkAction || ''}
              onChange={(e) => setBulkAction(e.target.value as 'enable' | 'disable' | 'delete' | null)}
              className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              <option value="">Ação em lote...</option>
              <option value="enable">Ativar</option>
              <option value="disable">Desativar</option>
              <option value="delete">Remover</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || bulkUpdateMutation.isPending}
              className="px-3 py-1 bg-coral text-white rounded text-sm hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              Aplicar
            </button>
            <button
              onClick={() => setSelectedFeatures([])}
              className="px-3 py-1 bg-slate-700 text-white rounded text-sm hover:bg-slate-600 transition-colors"
            >
              Limpar
            </button>
          </div>
        )}
      </div>
      
      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-slate-400">
            Carregando features...
          </div>
        ) : filteredFeatures.length > 0 ? (
          filteredFeatures.map((feature: Feature) => {
            const Icon = getFeatureIcon(feature.icon);
            const StatusIcon = statusConfig[feature.status].icon;
            
            return (
              <div
                key={feature._id}
                className={`bg-slate-900 rounded-lg p-4 border transition-all ${
                  selectedFeatures.includes(feature._id)
                    ? 'border-coral ring-2 ring-coral/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(feature._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFeatures([...selectedFeatures, feature._id]);
                        } else {
                          setSelectedFeatures(selectedFeatures.filter(id => id !== feature._id));
                        }
                      }}
                      className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                    />
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-coral" />
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${statusConfig[feature.status].color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig[feature.status].label}
                  </span>
                </div>
                
                <h3 className="text-white font-semibold mb-1">{feature.name}</h3>
                <p className="text-xs text-slate-500 mb-2">Código: {feature.code}</p>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{feature.description}</p>
                
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{categories.find(c => c.code === feature.category)?.name || feature.category}</span>
                  <span>v{feature.version}</span>
                </div>
                
                {feature.metadata?.usageCount && (
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span>{feature.metadata.usageCount} usos</span>
                    {feature.metadata.activeUsers && (
                      <span>{feature.metadata.activeUsers} usuários ativos</span>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  {feature.status !== 'deprecated' && (
                    <button
                      onClick={() => handleToggleStatus(feature)}
                      disabled={toggleStatusMutation.isPending}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                        feature.status === 'active'
                          ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
                          : feature.status === 'disabled'
                          ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                      title={`Alterar status (${feature.status})`}
                    >
                      <Power className="w-3 h-3" />
                      {feature.status === 'active' ? 'Manutenção' 
                        : feature.status === 'maintenance' ? 'Desativar' 
                        : 'Ativar'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedFeature(feature);
                      setShowDetailsModal(true);
                    }}
                    className="p-1.5 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedFeature(feature);
                      setEditFormData({
                        name: feature.name,
                        description: feature.description,
                        category: feature.category,
                        icon: feature.icon,
                        route: feature.route,
                        permissions: feature.permissions
                      });
                      setShowEditModal(true);
                    }}
                    className="p-1.5 bg-blue-900/20 text-blue-400 rounded hover:bg-blue-900/30 transition-colors"
                    title="Editar feature"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  {feature.status !== 'maintenance' && feature.status !== 'deprecated' && (
                    <button
                      onClick={() => {
                        setSelectedFeature(feature);
                        setShowMaintenanceModal(true);
                      }}
                      className="p-1.5 bg-yellow-900/20 text-yellow-400 rounded hover:bg-yellow-900/30 transition-colors"
                      title="Modo de manutenção"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                  )}
                  
                  {feature.deletable && (
                    <button
                      onClick={() => {
                        setSelectedFeature(feature);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 bg-red-900/20 text-red-400 rounded hover:bg-red-900/30 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-slate-400">
            Nenhuma feature encontrada
          </div>
        )}
      </div>
      
      {/* Feature Details Modal */}
      {showDetailsModal && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Detalhes da Feature</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                  <p className="text-white">{selectedFeature.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Código</label>
                  <p className="text-white font-mono">{selectedFeature.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Categoria</label>
                  <p className="text-white">{categories.find(c => c.code === selectedFeature.category)?.name || selectedFeature.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusConfig[selectedFeature.status].color}`}>
                    {statusConfig[selectedFeature.status].label}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Versão</label>
                  <p className="text-white">{selectedFeature.version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Deletável</label>
                  <p className="text-white">{selectedFeature.deletable ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
                <p className="text-white">{selectedFeature.description}</p>
              </div>
              
              {selectedFeature.route && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Rota</label>
                  <p className="text-white font-mono">{selectedFeature.route}</p>
                </div>
              )}
              
              {selectedFeature.permissions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Permissões</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFeature.permissions.map(perm => (
                      <span key={perm} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedFeature.dependencies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Dependências</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFeature.dependencies.map(dep => (
                      <span key={dep} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedFeature.config && Object.keys(selectedFeature.config).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Configuração</label>
                  <pre className="bg-slate-800 p-3 rounded text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedFeature.config, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Data de Lançamento</label>
                  <p className="text-white">{formatDate(selectedFeature.releaseDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Última Modificação</label>
                  <p className="text-white">{formatDate(selectedFeature.lastModified)}</p>
                </div>
              </div>
              
              {selectedFeature.metadata && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Estatísticas</label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedFeature.metadata.usageCount !== undefined && (
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400">Usos:</span> <span className="text-white">{selectedFeature.metadata.usageCount}</span>
                      </div>
                    )}
                    {selectedFeature.metadata.activeUsers !== undefined && (
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400">Usuários ativos:</span> <span className="text-white">{selectedFeature.metadata.activeUsers}</span>
                      </div>
                    )}
                    {selectedFeature.metadata.errorCount !== undefined && (
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400">Erros:</span> <span className="text-white">{selectedFeature.metadata.errorCount}</span>
                      </div>
                    )}
                    {selectedFeature.metadata.averageLoadTime !== undefined && (
                      <div className="bg-slate-800 p-2 rounded">
                        <span className="text-slate-400">Tempo médio:</span> <span className="text-white">{selectedFeature.metadata.averageLoadTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowAuditModal(true);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Ver Histórico
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 py-2 px-4 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Audit Logs Modal */}
      {showAuditModal && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Histórico de Alterações</h3>
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedFeature(null);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {auditLoading ? (
              <div className="text-center py-8 text-slate-400">
                Carregando histórico...
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log._id} className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{log.action}</span>
                      <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-300">{log.performedByEmail}</p>
                    {log.reason && (
                      <p className="text-sm text-slate-400 mt-1">Motivo: {log.reason}</p>
                    )}
                    {log.previousState?.status && log.newState?.status && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">Status:</span>
                        <span className="text-xs text-slate-400">{log.previousState.status}</span>
                        <span className="text-xs text-slate-500">→</span>
                        <span className="text-xs text-white">{log.newState.status}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                Nenhum histórico encontrado
              </div>
            )}
            
            <div className="flex justify-end mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedFeature(null);
                }}
                className="py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Maintenance Mode Modal */}
      {showMaintenanceModal && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Ativar Modo de Manutenção</h3>
              <button
                onClick={() => {
                  setShowMaintenanceModal(false);
                  setMaintenanceMessage('');
                  setSelectedFeature(null);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-4">
                Ativando manutenção para: <strong className="text-white">{selectedFeature.name}</strong>
              </p>
              
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mensagem de Manutenção
              </label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Esta funcionalidade está em manutenção. Voltaremos em breve."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral resize-none"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMaintenanceModal(false);
                  setMaintenanceMessage('');
                  setSelectedFeature(null);
                }}
                className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetMaintenance}
                disabled={setMaintenanceMutation.isPending || !maintenanceMessage}
                className="flex-1 py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {setMaintenanceMutation.isPending ? 'Ativando...' : 'Ativar Manutenção'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Feature Modal */}
      {showEditModal && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Editar Feature</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedFeature(null);
                  setEditFormData({});
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral resize-none"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                  <select
                    value={editFormData.category || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    {categories.filter(cat => cat.isActive).map((cat) => (
                      <option key={cat.code} value={cat.code}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ícone</label>
                  <select
                    value={editFormData.icon || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, icon: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    {Object.keys(iconMap).map(iconName => (
                      <option key={iconName} value={iconName}>{iconName}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rota (opcional)</label>
                <input
                  type="text"
                  value={editFormData.route || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, route: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="/feature/route"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Permissões</label>
                <div className="flex flex-wrap gap-3">
                  {['aluno', 'mentor', 'moderador', 'admin'].map(role => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editFormData.permissions?.includes(role) || false}
                        onChange={(e) => {
                          const perms = editFormData.permissions || [];
                          if (e.target.checked) {
                            setEditFormData({ ...editFormData, permissions: [...perms, role] });
                          } else {
                            setEditFormData({ ...editFormData, permissions: perms.filter(p => p !== role) });
                          }
                        }}
                        className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                      />
                      <span className="text-sm text-slate-300 capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedFeature(null);
                  setEditFormData({});
                }}
                className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedFeature) {
                    updateFeatureMutation.mutate({
                      id: selectedFeature._id,
                      data: editFormData
                    });
                  }
                }}
                disabled={updateFeatureMutation.isPending}
                className="flex-1 py-2 px-4 bg-coral text-white rounded-lg hover:bg-coral/80 transition-colors disabled:opacity-50"
              >
                {updateFeatureMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Remover Feature</h3>
                <p className="text-sm text-slate-400">Esta ação não pode ser desfeita imediatamente</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-300">
                  Você está prestes a remover: <strong className="text-white">{selectedFeature.name}</strong>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  A feature será marcada como deletada e poderá ser restaurada em até 30 dias
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Digite o código da feature para confirmar: <strong className="text-coral">{selectedFeature.code}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Digite o código da feature"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Motivo da remoção (opcional)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral resize-none"
                  rows={3}
                  placeholder="Descreva o motivo..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setDeleteReason('');
                  setSelectedFeature(null);
                }}
                className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteFeatureMutation.isPending || deleteConfirmation !== selectedFeature.code}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteFeatureMutation.isPending ? 'Removendo...' : 'Remover Feature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}