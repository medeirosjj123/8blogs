import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Server, 
  Search, 
  BarChart, 
  Zap, 
  Shield, 
  Rocket, 
  Settings,
  Folder,
  FileText,
  Edit,
  DollarSign,
  Package,
  Activity,
  AlertTriangle,
  Wrench,
  Loader2,
  Layout,
  Trash2,
  Archive,
  Plus,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SimpleWordPressInstaller } from '../components/installer/SimpleWordPressInstaller';
import { WordPressAdd } from '../components/wordpress/WordPressAdd';
import { WordPressRemove } from '../components/wordpress/WordPressRemove';
import { WordPressBackup } from '../components/wordpress/WordPressBackup';
import { useFeatures, isFeatureActive, isFeatureInMaintenance } from '../hooks/useFeatures';
import toast from 'react-hot-toast';

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
  Activity,
  Rocket,
  Layout,
  Trash2,
  Archive,
  Plus,
  Sparkles
};

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  featureCount: number;
}

export const Tools: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'maintenance'>('all');
  const [showInstaller, setShowInstaller] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  const { data: features, isLoading, error } = useFeatures();

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/categories', {
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
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showInstaller) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // When modal closes, ensure features are refreshed to prevent blank state
      if (!isLoading && !error && features) {
        console.log('Modal closed, features available:', features.length);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showInstaller, isLoading, error, features]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showInstaller) {
        setShowInstaller(false);
      }
    };

    if (showInstaller) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showInstaller]);

  // Format categories for display
  const displayCategories = React.useMemo(() => {
    if (!features || categoriesLoading) return [];
    
    // Count features per category
    const categoryMap = new Map<string, number>();
    features.forEach(feature => {
      const count = categoryMap.get(feature.category) || 0;
      categoryMap.set(feature.category, count + 1);
    });
    
    // Merge with fetched categories
    const cats = categories.map(cat => ({
      id: cat.code,
      name: cat.name,
      count: categoryMap.get(cat.code) || 0,
      color: cat.color,
      icon: cat.icon
    })).filter(cat => cat.count > 0);
    
    // Add 'all' option at the beginning
    return [
      { id: 'all', name: 'Todas', count: features.length },
      ...cats
    ];
  }, [features, categories, categoriesLoading]);
  
  // Filter features by category and status, then sort by status (active first)
  const filteredFeatures = React.useMemo(() => {
    if (!features) return [];
    
    let filtered = [...features];
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(f => f.status === selectedStatus);
    }
    
    // Sort by status: active first, then maintenance
    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0;
    });
    
    return filtered;
  }, [features, selectedCategory, selectedStatus]);
  
  const handleFeatureClick = (feature: any) => {
    if (feature.status === 'maintenance') {
      toast.error(feature.maintenanceMessage || 'Esta funcionalidade está em manutenção');
      return;
    }
    
    if (feature.status === 'disabled') {
      toast.error('Esta funcionalidade está desativada');
      return;
    }
    
    // Special handling for WordPress features
    if (feature.code === 'wp-installer') {
      setShowInstaller(true);
      return;
    }
    
    if (feature.code === 'wordpress-add') {
      setShowAdd(true);
      return;
    }
    
    if (feature.code === 'wordpress-remove') {
      setShowRemove(true);
      return;
    }
    
    if (feature.code === 'wordpress-backup') {
      setShowBackup(true);
      return;
    }
    
    // For other features, navigate to their routes
    if (feature.route) {
      toast.success(`Abrindo ${feature.name}...`);
      navigate(feature.route);
    } else {
      toast('Esta funcionalidade será implementada em breve');
    }
  };
  
  const getFeatureIcon = (iconName?: string) => {
    const Icon = iconMap[iconName || 'Settings'] || Settings;
    return <Icon className="text-tatame-red" size={24} />;
  };

  console.log('🟢 TOOLS: Rendering Tools component');
  console.log('🔍 TOOLS: Current render state:');
  console.log('  - showInstaller:', showInstaller);
  console.log('  - isLoading:', isLoading);
  console.log('  - error:', !!error);
  console.log('  - features:', features?.length || 0);
  console.log('  - filteredFeatures:', filteredFeatures?.length || 0);
  console.log('  - categories:', categories?.length || 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Debug info */}
      <div className="mb-4 p-2 bg-blue-100 rounded text-xs">
        Debug: showInstaller={showInstaller ? 'true' : 'false'}, isLoading={isLoading ? 'true' : 'false'}, features={features?.length || 0}, filteredFeatures={filteredFeatures?.length || 0}
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-tatame-black mb-2">Ferramentas</h1>
        <p className="text-tatame-gray-600">Crie, otimize e monetize seus blogs com facilidade</p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="text-sm text-tatame-gray-600 flex items-center mr-2">Filtrar por status:</div>
        <button
          onClick={() => setSelectedStatus('active')}
          className={`px-4 py-2 rounded-2xl font-medium transition-colors flex items-center gap-2 ${
            selectedStatus === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-tatame-gray-100 text-tatame-gray-700 hover:bg-tatame-gray-200'
          }`}
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Online
        </button>
        <button
          onClick={() => setSelectedStatus('maintenance')}
          className={`px-4 py-2 rounded-2xl font-medium transition-colors flex items-center gap-2 ${
            selectedStatus === 'maintenance'
              ? 'bg-yellow-500 text-white'
              : 'bg-tatame-gray-100 text-tatame-gray-700 hover:bg-tatame-gray-200'
          }`}
        >
          <Wrench size={16} />
          Manutenção
        </button>
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 rounded-2xl font-medium transition-colors ${
            selectedStatus === 'all'
              ? 'bg-tatame-red text-tatame-white'
              : 'bg-tatame-gray-100 text-tatame-gray-700 hover:bg-tatame-gray-200'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Categories Filter */}
      {displayCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {displayCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                // Reset status filter to 'all' when selecting a specific category
                if (category.id !== 'all') {
                  setSelectedStatus('all');
                }
              }}
              className={`px-4 py-2 rounded-2xl font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-tatame-red text-tatame-white'
                  : 'bg-tatame-gray-100 text-tatame-gray-700 hover:bg-tatame-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tatame-red mb-4" />
          <p className="text-tatame-gray-600">Carregando ferramentas...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-tatame-gray-600">Erro ao carregar ferramentas</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-tatame-red text-white rounded-lg hover:bg-tatame-red-dark"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Features Grid */}
      {!isLoading && !error && filteredFeatures && filteredFeatures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature) => (
            <div
              key={feature.id}
              className={`bg-tatame-white border rounded-2xl p-6 transition-all hover:shadow-lg ${
                feature.status === 'disabled' || feature.status === 'deprecated'
                  ? 'border-tatame-gray-200 opacity-60' 
                  : feature.status === 'maintenance'
                  ? 'border-yellow-400'
                  : 'border-tatame-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-tatame-gray-50 rounded-2xl flex items-center justify-center">
                  {getFeatureIcon(feature.icon)}
                </div>
                {feature.status === 'maintenance' && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full flex items-center gap-1">
                    <Wrench size={12} />
                    MANUTENÇÃO
                  </span>
                )}
                {feature.status === 'deprecated' && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                    DESCONTINUADO
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-tatame-black mb-2">{feature.name}</h3>
              <p className="text-sm text-tatame-gray-600 mb-4">{feature.description}</p>
              
              <button
                className={`w-full py-2 px-4 rounded-2xl font-semibold transition-colors ${
                  feature.status === 'active'
                    ? 'bg-tatame-red text-tatame-white hover:bg-tatame-red-dark'
                    : feature.status === 'maintenance'
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-tatame-gray-200 text-tatame-gray-500 cursor-not-allowed'
                }`}
                disabled={feature.status === 'disabled' || feature.status === 'deprecated'}
                onClick={() => handleFeatureClick(feature)}
              >
                {feature.status === 'active' 
                  ? 'Acessar' 
                  : feature.status === 'maintenance'
                  ? 'Em Manutenção'
                  : feature.status === 'deprecated'
                  ? 'Descontinuado'
                  : 'Desativado'}
              </button>
            </div>
          ))}
          
          {filteredFeatures.length === 0 && (
            <div className="col-span-full text-center py-12 text-tatame-gray-600">
              Nenhuma ferramenta disponível nesta categoria
            </div>
          )}
        </div>
      )}

      {/* Fallback when features are temporarily unavailable */}
      {!isLoading && !error && (!filteredFeatures || filteredFeatures.length === 0) && (
        <div className="text-center py-12">
          <div className="bg-tatame-gray-50 rounded-2xl p-8">
            <Activity className="w-12 h-12 text-tatame-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-tatame-gray-700 mb-2">
              Carregando Ferramentas...
            </h3>
            <p className="text-tatame-gray-500 mb-4">
              Suas ferramentas estão sendo carregadas. Por favor, aguarde.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-tatame-red text-white rounded-lg hover:bg-tatame-red-dark transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Section - Temporarily Disabled */}
      {/* <div className="mt-12 bg-gradient-to-br from-tatame-black to-tatame-gray-900 rounded-2xl p-8 text-tatame-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-3">
              <Rocket size={32} className="mr-3" />
              <h2 className="text-2xl font-bold">Desbloqueie Todas as Ferramentas</h2>
            </div>
            <p className="text-tatame-gray-300 mb-4">
              Tenha acesso ilimitado a todas as ferramentas premium e acelere seus resultados
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-tatame-red rounded-full mr-2"></span>
                Acesso a todas as ferramentas premium
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-tatame-red rounded-full mr-2"></span>
                Suporte prioritário via WhatsApp
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-tatame-red rounded-full mr-2"></span>
                Atualizações e novas ferramentas primeiro
              </li>
            </ul>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black mb-1">R$ 97/mês</div>
            <div className="text-sm text-tatame-gray-400 line-through mb-3">R$ 197/mês</div>
            <button className="bg-tatame-red text-tatame-white px-6 py-3 rounded-2xl font-bold hover:bg-tatame-red-dark transition-colors">
              Fazer Upgrade Agora
            </button>
          </div>
        </div>
      </div> */}

      {/* WordPress Installer Modal */}
      {showInstaller && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInstaller(false);
            }
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-7xl">
              <SimpleWordPressInstaller onClose={() => {
                console.log('🔴 TOOLS: onClose called - about to close installer modal');
                console.log('🔍 TOOLS: Current state:');
                console.log('  - isLoading:', isLoading);
                console.log('  - error:', !!error);
                console.log('  - features count:', features?.length || 0);
                console.log('  - filteredFeatures count:', filteredFeatures?.length || 0);
                console.log('  - categories count:', categories?.length || 0);
                console.log('  - selectedCategory:', selectedCategory);
                console.log('  - selectedStatus:', selectedStatus);
                setShowInstaller(false);
                console.log('🔴 TOOLS: setShowInstaller(false) called - modal should close now');
                
                // Force a small delay to ensure features are loaded
                setTimeout(() => {
                  console.log('🔍 TOOLS: After modal close - checking state again:');
                  console.log('  - isLoading:', isLoading);
                  console.log('  - error:', !!error);
                  console.log('  - features count:', features?.length || 0);
                }, 500);
              }} />
            </div>
          </div>
        </div>
      )}

      {/* WordPress Add Modal */}
      {showAdd && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdd(false);
            }
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <WordPressAdd onClose={() => setShowAdd(false)} />
          </div>
        </div>
      )}

      {/* WordPress Remove Modal */}
      {showRemove && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRemove(false);
            }
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <WordPressRemove onClose={() => setShowRemove(false)} />
          </div>
        </div>
      )}

      {/* WordPress Backup Modal */}
      {showBackup && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBackup(false);
            }
          }}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <WordPressBackup onClose={() => setShowBackup(false)} />
          </div>
        </div>
      )}

    </div>
  );
};