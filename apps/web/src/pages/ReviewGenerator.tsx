import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Image,
  Link,
  AlertCircle,
  CheckCircle,
  X,
  ChevronUp,
  ChevronDown,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUsage } from '../hooks/useUsage';

// Import the new modal components
import { ReviewSuccessModal } from '../components/modals/ReviewSuccessModal';
import { WordPressSiteModal } from '../components/modals/WordPressSiteModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { UpgradeModal } from '../components/modals/UpgradeModal';

interface Product {
  name: string;
  affiliateLink: string;
  imageUrl?: string;
}

interface OutlineItem {
  title: string;
  content?: string;
}

interface GeneratedReview {
  _id: string;
  title: string;
  products: Array<{
    name: string;
    affiliateLink: string;
    imageUrl?: string;
    pros: string[];
    cons: string[];
    description: string;
  }>;
  content: {
    introduction: string;
    reviews: string[];
    conclusion: string;
    fullHtml: string;
  };
  metadata: {
    model: string;
    provider: string;
    tokensUsed: {
      total: number;
    };
    cost: number;
    generationTime: number;
  };
  status: string;
  createdAt: string;
}

export default function ReviewGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usage } = useUsage();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'bbr' | 'spr' | 'informational'>('bbr');
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [products, setProducts] = useState<Product[]>([{ name: '', affiliateLink: '', imageUrl: '' }]);
  const [generatedReview, setGeneratedReview] = useState<GeneratedReview | null>(null);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState<'spr' | 'informational'>('spr');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch WordPress sites for publishing
  const { data: wordpressSites, isLoading: sitesLoading, error: sitesError } = useQuery({
    queryKey: ['wordpress-sites'],
    queryFn: async () => {
      const response = await api.get('/api/wordpress/sites');
      return response.data.data;
    }
  });

  // Fetch review generator feature configuration
  const { data: reviewFeature } = useQuery({
    queryKey: ['feature-review-generator'],
    queryFn: async () => {
      const response = await api.get('/api/features/review-generator');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Generate review mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { 
      title: string; 
      contentType: 'bbr' | 'spr' | 'informational';
      products?: Product[];
      outline?: OutlineItem[];
    }) => {
      // Show loading modal with steps
      setShowLoadingModal(true);
      setLoadingSteps([]);

      // Simulate progress steps
      const steps = contentType === 'informational' 
        ? [
            'Analisando o título e tópicos...',
            'Gerando introdução do artigo...',
            'Escrevendo conteúdo dos tópicos...',
            'Criando conclusão...',
            'Finalizando formatação...'
          ]
        : [
            'Analisando produtos e título...',
            'Gerando introdução envolvente...',
            'Escrevendo reviews dos produtos...',
            'Criando tabelas de prós e contras...',
            'Gerando conclusão e CTAs...',
            'Finalizando formatação...'
          ];

      // Add steps progressively during generation
      const stepInterval = setInterval(() => {
        setLoadingSteps(current => {
          if (current.length < steps.length - 1) {
            return [...current, steps[current.length]];
          }
          return current;
        });
      }, 2000);

      try {
        const response = await api.post('/api/reviews/generate', data);
        clearInterval(stepInterval);
        
        // Complete all steps
        setLoadingSteps(steps);
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return response.data.data;
      } catch (error) {
        clearInterval(stepInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setShowLoadingModal(false);
      setGeneratedReview(data);
      setShowSuccessModal(true);
      toast.success(contentType === 'informational' ? 'Conteúdo gerado com sucesso!' : 'Review gerado com sucesso!');
    },
    onError: (error: any) => {
      setShowLoadingModal(false);
      toast.error(error.response?.data?.message || 'Erro ao gerar conteúdo');
    }
  });

  // Publish to WordPress mutation
  const publishMutation = useMutation({
    mutationFn: async (data: { reviewId: string; siteId: string }) => {
      const response = await api.post(`/api/reviews/${data.reviewId}/publish`, {
        siteId: data.siteId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setIsPublishing(false);
      setShowSiteModal(false);
      toast.success('Rascunho criado com sucesso! Redirecionando para o WordPress...');
      
      // Open WordPress editor in new tab
      window.open(data.data.editUrl, '_blank');
    },
    onError: (error: any) => {
      setIsPublishing(false);
      toast.error(error.response?.data?.message || 'Erro ao criar rascunho no WordPress');
    }
  });

  const handleAddProduct = () => {
    setProducts([...products, { name: '', affiliateLink: '', imageUrl: '' }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const handleProductChange = (index: number, field: keyof Product, value: string) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newProducts = [...products];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= products.length) return;
    
    // Swap items
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
    setProducts(newProducts);
  };

  const handleAddOutlineItem = () => {
    setOutline([...outline, { title: '', content: '' }]);
  };

  const handleRemoveOutlineItem = (index: number) => {
    // For BBR and SPR, allow deleting all outline items (optional)
    // For informational content, require at least one outline item
    if (contentType === 'bbr' || contentType === 'spr' || outline.length > 1) {
      setOutline(outline.filter((_, i) => i !== index));
    }
  };

  const handleOutlineChange = (index: number, field: keyof OutlineItem, value: string) => {
    const updatedOutline = [...outline];
    updatedOutline[index] = { ...updatedOutline[index], [field]: value };
    setOutline(updatedOutline);
  };

  // New handlers for the improved workflow
  const handleWriteAnother = () => {
    setShowSuccessModal(false);
    setGeneratedReview(null);
    setTitle('');
    setProducts([{ name: '', affiliateLink: '', imageUrl: '' }]);
    setOutline([]);
    toast.success('Pronto para um novo post!');
  };

  const handleReviewAndPublish = () => {
    setShowSuccessModal(false);
    setShowSiteModal(true);
  };

  const handlePublishToSite = (siteId: string) => {
    if (!generatedReview) return;
    
    setIsPublishing(true);
    publishMutation.mutate({
      reviewId: generatedReview._id,
      siteId: siteId
    });
  };

  const moveOutlineItem = (index: number, direction: 'up' | 'down') => {
    const newOutline = [...outline];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= outline.length) return;
    
    // Swap items
    [newOutline[index], newOutline[newIndex]] = [newOutline[newIndex], newOutline[index]];
    setOutline(newOutline);
  };

  const handleGenerate = () => {
    // Validate inputs
    if (!title.trim()) {
      toast.error('Por favor, insira um título');
      return;
    }

    if (contentType === 'bbr' || contentType === 'spr') {
      const validProducts = products.filter(p => p.name.trim() && p.affiliateLink.trim());
      if (validProducts.length === 0) {
        toast.error(contentType === 'spr' 
          ? 'Por favor, preencha os dados do produto' 
          : 'Adicione pelo menos um produto com nome e link de afiliado');
        return;
      }

      // Outline is optional for product reviews
      const validOutlineItems = outline.filter(item => item.title.trim());

      generateMutation.mutate({
        title,
        contentType: contentType === 'spr' ? 'spr' : 'bbr',
        products: validProducts,
        outline: validOutlineItems.length > 0 ? validOutlineItems : undefined
      });
    } else {
      // Informational content
      const validOutlineItems = outline.filter(item => item.title.trim());
      if (validOutlineItems.length === 0) {
        toast.error('Adicione pelo menos um tópico no outline');
        return;
      }

      generateMutation.mutate({
        title,
        contentType: 'informational',
        outline: validOutlineItems
      });
    }
  };

  // Removed handleSaveEdit - no longer needed with WordPress-native editing

  // Remove the preview section - now using success modal instead

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-tatame-black mb-2">Gerador de Conteúdo</h1>
            <p className="text-tatame-gray-600">
              Crie reviews de produtos ou conteúdo educativo com IA
            </p>
          </div>
          
          {/* Bulk Upload Button - Enhanced with better messaging */}
          <div className="relative">
            <button
              onClick={() => {
                if (usage?.features?.bulkUpload) {
                  setShowBulkUpload(true);
                } else {
                  // Show upgrade modal for non-premium users
                  setShowUpgradeModal(true);
                }
              }}
              className="flex items-center gap-3 gradient-primary hover:shadow-glow text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-200 shadow-medium hover:shadow-glow transform hover:scale-105 group"
            >
              <Upload size={18} className="group-hover:rotate-12 transition-transform duration-200" />
              <div className="flex flex-col items-start">
                <span className="text-white font-bold">🚀 Gerar em Massa</span>
                <span className="text-white/80 text-xs">10-50 reviews em minutos</span>
              </div>
            </button>
            
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Type & Title */}
          <div className="bg-tatame-white rounded-2xl border border-tatame-gray-200 p-6">
            <h2 className="text-lg font-bold text-tatame-black mb-4">Configuração do Conteúdo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tatame-gray-700 mb-3">
                  Tipo de Conteúdo
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setContentType('bbr');
                      // Reset to multiple products for BBR
                      if (products.length === 0) {
                        setProducts([{ name: '', affiliateLink: '', imageUrl: '' }]);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all text-sm font-semibold ${
                      contentType === 'bbr'
                        ? 'border-tatame-red bg-tatame-red text-tatame-white hover:bg-tatame-red-dark'
                        : 'border-tatame-gray-200 bg-tatame-white text-tatame-gray-700 hover:border-tatame-red hover:bg-tatame-gray-50'
                    }`}
                  >
                    <div className="text-xs mb-1">🏆 BBR</div>
                    <div className="text-xs font-normal">Melhores Produtos</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewFeature?.config?.enabledTypes?.spr) {
                        setContentType('spr');
                        // Reset to single product for SPR
                        setProducts([{ name: '', affiliateLink: '', imageUrl: '' }]);
                      } else {
                        setMaintenanceType('spr');
                        setShowMaintenanceModal(true);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all text-sm font-semibold relative ${
                      reviewFeature?.config?.enabledTypes?.spr
                        ? contentType === 'spr'
                          ? 'border-tatame-red bg-tatame-red text-tatame-white hover:bg-tatame-red-dark'
                          : 'border-tatame-gray-200 bg-tatame-white text-tatame-gray-700 hover:border-tatame-red hover:bg-tatame-gray-50'
                        : 'border-tatame-gray-200 bg-tatame-gray-50 text-tatame-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!reviewFeature?.config?.enabledTypes?.spr}
                  >
                    <div className="text-xs mb-1">📦 SPR</div>
                    <div className="text-xs font-normal">Produto Único</div>
                    {!reviewFeature?.config?.enabledTypes?.spr && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                        EM BREVE
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewFeature?.config?.enabledTypes?.informational) {
                        setContentType('informational');
                        // Ensure at least one outline item for informational content
                        if (outline.length === 0) {
                          setOutline([{ title: '', content: '' }]);
                        }
                      } else {
                        setMaintenanceType('informational');
                        setShowMaintenanceModal(true);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all text-sm font-semibold relative ${
                      reviewFeature?.config?.enabledTypes?.informational
                        ? contentType === 'informational'
                          ? 'border-tatame-red bg-tatame-red text-tatame-white hover:bg-tatame-red-dark'
                          : 'border-tatame-gray-200 bg-tatame-white text-tatame-gray-700 hover:border-tatame-red hover:bg-tatame-gray-50'
                        : 'border-tatame-gray-200 bg-tatame-gray-50 text-tatame-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!reviewFeature?.config?.enabledTypes?.informational}
                  >
                    <div className="text-xs mb-1">📚 Informacional</div>
                    <div className="text-xs font-normal">Conteúdo Educativo</div>
                    {!reviewFeature?.config?.enabledTypes?.informational && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                        EM BREVE
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-tatame-gray-700 mb-2">
                  {contentType === 'bbr' ? 'Título do Review (Melhores)' : 
                   contentType === 'spr' ? 'Título do Review (Produto Único)' : 
                   'Título do Artigo Informacional'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 bg-tatame-gray-50 border border-tatame-gray-200 rounded-2xl text-tatame-black focus:outline-none focus:ring-2 focus:ring-tatame-red focus:border-transparent"
                  placeholder={
                    contentType === 'bbr' 
                      ? "Ex: Os 7 Melhores Notebooks para Programação em 2024"
                      : contentType === 'spr'
                      ? "Ex: MacBook Pro M3: Análise Completa Após 6 Meses de Uso"
                      : "Ex: Como Escolher o Notebook Ideal para seu Perfil"
                  }
                />
              </div>
            </div>
          </div>

          {/* Outline - Available for all content types */}
          {(contentType === 'bbr' || contentType === 'spr' || contentType === 'informational') && (
            <div className="bg-tatame-white rounded-2xl border border-tatame-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-tatame-black">
                  {contentType === 'informational' 
                    ? `Outline do Conteúdo (${outline.length})` 
                    : `Seções Adicionais (${outline.length})`}
                </h2>
                <button
                  onClick={handleAddOutlineItem}
                  className="p-2 bg-tatame-red text-tatame-white rounded-2xl hover:bg-tatame-red-dark transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {(contentType === 'bbr' || contentType === 'spr') && (
                <p className="text-sm text-tatame-gray-600 mb-4">
                  {contentType === 'spr' 
                    ? 'Adicione seções detalhadas sobre o produto: especificações, experiência de uso, comparações, etc.'
                    : 'Adicione seções extras como guias de compra, comparações entre os produtos ou FAQs.'}
                </p>
              )}

              <div className="space-y-4">
                {outline.length === 0 && (contentType === 'bbr' || contentType === 'spr') ? (
                  <div className="text-center py-8 text-tatame-gray-500">
                    <p className="text-sm mb-3">Nenhuma seção adicional</p>
                    <button
                      onClick={handleAddOutlineItem}
                      className="text-tatame-red hover:text-tatame-red-dark font-semibold text-sm"
                    >
                      + Adicionar primeira seção
                    </button>
                  </div>
                ) : outline.length === 0 && contentType === 'informational' ? (
                  <div className="text-center py-8 text-tatame-gray-500">
                    <p className="text-sm mb-3">É necessário adicionar pelo menos um tópico</p>
                    <button
                      onClick={handleAddOutlineItem}
                      className="text-tatame-red hover:text-tatame-red-dark font-semibold text-sm"
                    >
                      + Adicionar primeiro tópico
                    </button>
                  </div>
                ) : (
                  outline.map((item, index) => (
                    <div key={index} className="bg-tatame-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-tatame-gray-700">
                          {contentType === 'informational' ? `Tópico ${index + 1}` : `Seção ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Move buttons */}
                          <button
                            onClick={() => moveOutlineItem(index, 'up')}
                            disabled={index === 0}
                            className={`p-1 rounded-lg transition-colors ${
                              index === 0 
                                ? 'text-tatame-gray-300 cursor-not-allowed' 
                                : 'text-tatame-gray-600 hover:bg-tatame-gray-200'
                            }`}
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveOutlineItem(index, 'down')}
                            disabled={index === outline.length - 1}
                            className={`p-1 rounded-lg transition-colors ${
                              index === outline.length - 1 
                                ? 'text-tatame-gray-300 cursor-not-allowed' 
                                : 'text-tatame-gray-600 hover:bg-tatame-gray-200'
                            }`}
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {/* Delete button - always show for BBR/SPR, conditional for informational */}
                          {(contentType === 'bbr' || contentType === 'spr' || outline.length > 1) && (
                            <button
                              onClick={() => handleRemoveOutlineItem(index)}
                              className="p-1 text-tatame-red hover:bg-tatame-red hover:text-white rounded-lg transition-colors ml-2"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-tatame-gray-600 mb-1">
                          {contentType === 'informational' ? 'Título do Tópico *' : 'Título da Seção *'}
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleOutlineChange(index, 'title', e.target.value)}
                          className="w-full p-2.5 bg-tatame-white border border-tatame-gray-200 rounded-xl text-tatame-black text-sm focus:outline-none focus:ring-2 focus:ring-tatame-red focus:border-transparent"
                          placeholder={
                            contentType === 'product' 
                              ? "Ex: Como escolher o modelo ideal"
                              : "Ex: O que considerar na hora da compra"
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-tatame-gray-600 mb-1">
                          {contentType === 'informational' ? 'Descrição do Tópico (opcional)' : 'Descrição da Seção (opcional)'}
                        </label>
                        <textarea
                          value={item.content || ''}
                          onChange={(e) => handleOutlineChange(index, 'content', e.target.value)}
                          className="w-full p-2.5 bg-tatame-white border border-tatame-gray-200 rounded-xl text-tatame-black text-sm focus:outline-none focus:ring-2 focus:ring-tatame-red focus:border-transparent resize-none"
                          rows={2}
                          placeholder="Pontos específicos que devem ser abordados..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )}

          {/* Products - Show for BBR and SPR */}
          {(contentType === 'bbr' || contentType === 'spr') && (
            <div className="bg-tatame-white rounded-2xl border border-tatame-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-tatame-black">
                  {contentType === 'spr' ? 'Produto' : `Produtos (${products.length})`}
                </h2>
                {/* Only show add button for BBR (multiple products) */}
                {contentType === 'bbr' && (
                  <button
                    onClick={handleAddProduct}
                    className="p-2 bg-tatame-red text-tatame-white rounded-2xl hover:bg-tatame-red-dark transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              {contentType === 'spr' && (
                <p className="text-sm text-tatame-gray-600 mb-4">
                  Análise aprofundada de um único produto, com prós, contras e experiência de uso detalhada.
                </p>
              )}

            <div className="space-y-4">
              {products.map((product, index) => (
                <div key={index} className="bg-tatame-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-tatame-gray-700">
                      Produto {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Move buttons - only for BBR with multiple products */}
                      {contentType === 'bbr' && products.length > 1 && (
                        <>
                          <button
                            onClick={() => moveProduct(index, 'up')}
                            disabled={index === 0}
                            className={`p-1 rounded-lg transition-colors ${
                              index === 0 
                                ? 'text-tatame-gray-300 cursor-not-allowed' 
                                : 'text-tatame-gray-600 hover:bg-tatame-gray-200'
                            }`}
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveProduct(index, 'down')}
                            disabled={index === products.length - 1}
                            className={`p-1 rounded-lg transition-colors ${
                              index === products.length - 1 
                                ? 'text-tatame-gray-300 cursor-not-allowed' 
                                : 'text-tatame-gray-600 hover:bg-tatame-gray-200'
                            }`}
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* Delete button - only for BBR with multiple products */}
                      {contentType === 'bbr' && products.length > 1 && (
                        <button
                          onClick={() => handleRemoveProduct(index)}
                          className="p-1 text-tatame-red hover:bg-tatame-red hover:text-white rounded-lg transition-colors ml-2"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-tatame-gray-600 mb-1">
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                        className="w-full p-2.5 bg-tatame-white border border-tatame-gray-200 rounded-xl text-tatame-black text-sm focus:outline-none focus:ring-2 focus:ring-tatame-red focus:border-transparent"
                        placeholder="Ex: MacBook Pro M3"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-tatame-gray-600 mb-1 flex items-center gap-1">
                        <Link className="w-3 h-3" />
                        Link de Afiliado *
                      </label>
                      <input
                        type="url"
                        value={product.affiliateLink}
                        onChange={(e) => handleProductChange(index, 'affiliateLink', e.target.value)}
                        className="w-full p-2.5 bg-tatame-white border border-tatame-gray-200 rounded-xl text-tatame-black text-sm focus:outline-none focus:ring-2 focus:ring-tatame-red focus:border-transparent"
                        placeholder="https://amzn.to/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-tatame-gray-600 mb-1 flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        URL da Imagem (opcional)
                      </label>
                      <input
                        type="url"
                        value={product.imageUrl}
                        onChange={(e) => handleProductChange(index, 'imageUrl', e.target.value)}
                        className="w-full p-2.5 bg-tatame-white border border-tatame-gray-200 rounded-xl text-tatame-black text-sm focus:outline-none focus:ring-2 focus:ring-tatame-red focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full py-4 bg-tatame-red text-tatame-white rounded-2xl font-bold hover:bg-tatame-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {contentType === 'product' ? 'Gerando Review...' : 'Gerando Conteúdo...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {contentType === 'product' ? 'Gerar Review com IA' : 'Gerar Conteúdo com IA'}
              </>
            )}
          </button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="bg-tatame-white rounded-2xl border border-tatame-gray-200 p-6">
            <h3 className="text-lg font-bold text-tatame-black mb-4">Como funciona?</h3>
            <div className="space-y-3">
              {contentType === 'product' ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">Introdução Envolvente</p>
                      <p className="text-xs text-tatame-gray-600">IA cria uma introdução que prende a atenção</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">Análise Detalhada</p>
                      <p className="text-xs text-tatame-gray-600">Prós e contras reais de cada produto</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">Tabela Comparativa</p>
                      <p className="text-xs text-tatame-gray-600">Visualização clara dos pontos fortes e fracos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">CTA Otimizado</p>
                      <p className="text-xs text-tatame-gray-600">Botões de afiliado que convertem</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">Estrutura Baseada no Outline</p>
                      <p className="text-xs text-tatame-gray-600">Conteúdo seguindo a estrutura definida</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">Conteúdo Educativo</p>
                      <p className="text-xs text-tatame-gray-600">Informações relevantes sem focar em vendas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">Tom Profissional</p>
                      <p className="text-xs text-tatame-gray-600">Linguagem apropriada para artigos informativos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tatame-black">SEO Otimizado</p>
                      <p className="text-xs text-tatame-gray-600">Estrutura H2/H3 para melhor rankeamento</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-tatame-black mb-2">Dicas para melhores resultados:</p>
                <ul className="text-xs text-tatame-gray-700 space-y-1">
                  <li>• Use títulos descritivos e específicos</li>
                  <li>• Adicione imagens de alta qualidade</li>
                  <li>• Seja específico nos nomes dos produtos</li>
                  <li>• Use links de afiliado trackáveis</li>
                  <li>• Adicione quantos produtos desejar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-tatame-red rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-tatame-black mb-2">
                {contentType === 'informational' ? 'Criando seu artigo...' : 'Gerando seu review...'}
              </h3>
              <p className="text-tatame-gray-600 text-sm">
                A IA está trabalhando para criar o melhor conteúdo para você
              </p>
            </div>

            <div className="space-y-3">
              {loadingSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-tatame-gray-700">{step}</span>
                </div>
              ))}
              
              {loadingSteps.length < 6 && (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-tatame-gray-200 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-tatame-gray-500 animate-spin" />
                  </div>
                  <span className="text-sm text-tatame-gray-500">
                    {loadingSteps.length === 0 ? 'Iniciando geração...' : 'Processando...'}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-xs text-tatame-gray-500">
              Este processo pode levar alguns segundos...
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-tatame-black mb-2">
                {maintenanceType === 'spr' ? 'SPR em Manutenção' : 'Conteúdo Informacional em Manutenção'}
              </h3>
              <p className="text-tatame-gray-600 text-sm mb-6">
                Esta funcionalidade está temporariamente desabilitada para melhorias.
                <br />
                <strong>Será liberada em breve!</strong>
              </p>
              
              <div className="bg-yellow-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-yellow-800">
                  <strong>Enquanto isso:</strong><br />
                  Use o modo BBR para criar reviews de múltiplos produtos com excelente qualidade.
                </p>
              </div>

              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="w-full py-3 bg-tatame-red text-white rounded-2xl font-semibold hover:bg-tatame-red-dark transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <ReviewSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onWriteAnother={handleWriteAnother}
        onReviewAndPublish={handleReviewAndPublish}
        reviewTitle={generatedReview?.title || ''}
      />

      {/* WordPress Site Selection Modal */}
      <WordPressSiteModal
        isOpen={showSiteModal}
        onClose={() => setShowSiteModal(false)}
        sites={wordpressSites || []}
        onPublish={handlePublishToSite}
        isPublishing={isPublishing}
        reviewTitle={generatedReview?.title || ''}
        isLoading={sitesLoading}
        error={sitesError}
      />

      {/* Bulk Upload Modal - Premium Feature */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={(results) => {
          toast.success(`${results.filter(r => r.status === 'success').length} reviews geradas em massa!`);
          // Could trigger a refresh of the reviews list here
        }}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Upload em Massa"
      />
    </div>
  );
}