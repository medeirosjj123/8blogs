import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, Download, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useUsage } from '../hooks/useUsage';
// WordPress Site interface - embedded to avoid Vite caching issues
interface WordPressSite {
  _id: string;
  name: string;
  url: string;
  username: string;
  isActive: boolean;
  isDefault: boolean;
  testConnection?: {
    lastTest?: Date;
    status: 'connected' | 'failed' | 'pending';
    error?: string;
  };
  statistics?: {
    postsPublished: number;
    lastPublishedAt?: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (results: any[]) => void;
}

interface BulkReviewData {
  title: string;
  products: Array<{
    name: string;
    affiliateLink: string;
    imageUrl?: string;
  }>;
  contentType?: 'bbr' | 'spr' | 'informational';
}

interface ProcessingResult {
  title: string;
  status: 'success' | 'error' | 'processing';
  reviewId?: string;
  error?: string;
  details?: {
    mongoId: string;
    collection: string;
    slug: string;
    aiProvider: string;
    aiModel: string;
    tokensUsed: number;
    cost: number;
    generationTime: number;
    wordpressUrl: string | null;
    publishedAt: string | null;
    preview?: {
      introduction: string;
      conclusion: string;
      productCount: number;
      contentType: string;
      fullContentUrl: string;
    };
  };
}

interface BulkGenerationSummary {
  total: number;
  successful: number;
  failed: number;
  publishedToWordPress: number;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { usage, getRemainingUsage, isLimitReached } = useUsage();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<BulkReviewData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'processing' | 'results'>('upload');
  const [wordPressSites, setWordPressSites] = useState<WordPressSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [publishToWordPress, setPublishToWordPress] = useState(true); // Always true now since it's mandatory
  const [generationSummary, setGenerationSummary] = useState<BulkGenerationSummary | null>(null);
  const [wordPressPublishModal, setWordPressPublishModal] = useState<{
    isOpen: boolean;
    reviewId: string;
    title: string;
    isPublishing: boolean;
  }>({
    isOpen: false,
    reviewId: '',
    title: '',
    isPublishing: false
  });
  const [selectedReviews, setSelectedReviews] = useState<Set<number>>(new Set());
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [bulkPublishModal, setBulkPublishModal] = useState<{
    isOpen: boolean;
    selectedCount: number;
  }>({
    isOpen: false,
    selectedCount: 0
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    parseCSVFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv']
    },
    maxFiles: 1
  });

  // Load WordPress sites on modal open
  useEffect(() => {
    if (isOpen) {
      loadWordPressSites();
    }
  }, [isOpen]);

  const loadWordPressSites = async () => {
    try {
      const response = await api.get('/api/wordpress/sites');
      if (response.data.success) {
        setWordPressSites(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load WordPress sites:', error);
    }
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('Arquivo CSV deve ter pelo menos uma linha de dados');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Check for required headers
        if (!headers.includes('title')) {
          toast.error('Coluna obrigatória faltando: title');
          return;
        }

        const data: BulkReviewData[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          if (row.title) {
            // Extract products using the new format (productname1, affiliatelink1, productimage1, etc.)
            const products = [];
            let productIndex = 1;
            
            while (row[`productname${productIndex}`] && row[`affiliatelink${productIndex}`]) {
              products.push({
                name: row[`productname${productIndex}`],
                affiliateLink: row[`affiliatelink${productIndex}`],
                imageUrl: row[`productimage${productIndex}`] || undefined
              });
              productIndex++;
            }

            // Create review entry
            data.push({
              title: row.title,
              contentType: row.content_type === 'spr' ? 'spr' : (row.content_type === 'informational' ? 'informational' : 'bbr'),
              products: products
            });
          }
        }

        setParsedData(data);
        setCurrentStep('preview');
        toast.success(`${data.length} reviews encontradas no arquivo`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Erro ao processar arquivo CSV');
      }
    };
    
    reader.readAsText(file);
  };

  const processBulkReviews = useMutation({
    mutationFn: async (reviewsData: BulkReviewData[]) => {
      const results: ProcessingResult[] = reviewsData.map(review => ({
        title: review.title,
        status: 'processing' as const
      }));
      
      setResults(results);
      setCurrentStep('processing');
      setIsProcessing(true);

      try {
        console.log(`Starting bulk generation of ${reviewsData.length} reviews`);
        
        const response = await api.post('/api/reviews/bulk-generate', {
          reviews: reviewsData.map(review => ({
            title: review.title,
            contentType: review.contentType || 'bbr',
            products: review.products
          })),
          publishToWordPress,
          selectedSiteId: publishToWordPress ? selectedSiteId : undefined
        });

        if (response.data.success) {
          const bulkResults = response.data.data.results;
          const summary = response.data.data.summary;
          
          // Log detailed results for debugging
          console.group('📊 Bulk Generation Results Details');
          console.log('Bulk ID:', summary.bulkId);
          console.log('Total Time:', summary.totalTime + 'ms');
          console.log('Total Tokens:', summary.totalTokens);
          console.log('Total Cost:', '$' + summary.totalCost?.toFixed(4));
          console.log('Storage:', summary.storage?.database + '.' + summary.storage?.collection);
          console.log('Completed:', summary.completedAt);
          console.log('Results:');
          bulkResults.forEach((result: any, index: number) => {
            if (result.status === 'success') {
              console.log(`  ✓ ${index + 1}. ${result.title}`);
              console.log(`    MongoDB ID: ${result.details?.mongoId}`);
              console.log(`    AI Provider: ${result.details?.aiProvider}`);
              console.log(`    AI Model: ${result.details?.aiModel}`);
              console.log(`    Tokens: ${result.details?.tokensUsed}`);
              console.log(`    Cost: $${result.details?.cost?.toFixed(4)}`);
              console.log(`    Generation Time: ${result.details?.generationTime}ms`);
              if (result.details?.wordpressUrl) {
                console.log(`    WordPress: ${result.details.wordpressUrl}`);
              }
            } else {
              console.log(`  ✗ ${index + 1}. ${result.title} - ${result.error}`);
            }
          });
          console.groupEnd();
          
          // Update results with the actual API response
          setResults(bulkResults.map((result: any) => ({
            title: result.title,
            status: result.status as 'success' | 'error',
            reviewId: result.reviewId,
            error: result.error,
            details: result.details
          })));
          
          setGenerationSummary(summary);
          setIsProcessing(false);
          setCurrentStep('results');
          
          if (summary.successful > 0) {
            toast.success(`${summary.successful} reviews geradas com sucesso!`);
            if (summary.publishedToWordPress > 0) {
              toast.success(`${summary.publishedToWordPress} publicadas no WordPress!`);
              
              // If auto-publishing was enabled, redirect to WordPress admin
              if (publishToWordPress && selectedSiteId) {
                const site = wordPressSites.find(s => s._id === selectedSiteId);
                if (site) {
                  const adminUrl = `${site.url.replace(/\/$/, '')}/wp-admin/edit.php?post_type=post&post_status=draft`;
                  
                  setTimeout(() => {
                    window.open(adminUrl, '_blank');
                    toast.success(`🎉 Abrindo painel do WordPress com ${summary.publishedToWordPress} novos rascunhos!`);
                  }, 1500);
                }
              }
            }
          }
          if (summary.failed > 0) {
            toast.error(`${summary.failed} reviews falharam`);
          }

          if (onSuccess) {
            onSuccess(bulkResults);
          }

          return bulkResults;
        } else {
          throw new Error(response.data.message || 'Falha na geração em massa');
        }
      } catch (error: any) {
        console.error('Bulk generation error:', error);
        
        // Mark all as error
        const errorResults = results.map(result => ({
          ...result,
          status: 'error' as const,
          error: error.response?.data?.message || error.message || 'Erro na geração em massa'
        }));
        
        setResults(errorResults);
        setIsProcessing(false);
        setCurrentStep('results');
        
        toast.error('Falha na geração em massa: ' + (error.response?.data?.message || error.message));
        
        throw error;
      }
    }
  });

  const downloadTemplate = () => {
    const csvContent = `title,productname1,affiliatelink1,productimage1,productname2,affiliatelink2,productimage2,productname3,affiliatelink3,productimage3,productname4,affiliatelink4,productimage4,productname5,affiliatelink5,productimage5,content_type
"🏃‍♀️ Melhores Tênis de Corrida 2024 - Guia Completo","Nike Air Zoom Pegasus 40","https://amzn.to/nike-pegasus-40","https://m.media-amazon.com/images/nike-pegasus.jpg","Adidas UltraBoost 23","https://amzn.to/adidas-ultraboost","https://m.media-amazon.com/images/ultraboost.jpg","Asics Gel-Nimbus 25","https://amzn.to/asics-nimbus","https://m.media-amazon.com/images/asics-nimbus.jpg","Brooks Ghost 15","https://amzn.to/brooks-ghost","https://m.media-amazon.com/images/brooks-ghost.jpg","New Balance Fresh Foam X","https://amzn.to/newbalance-fresh","https://m.media-amazon.com/images/newbalance.jpg","bbr"
"📱 Review Completo: iPhone 15 Pro - Vale a Pena?","Apple iPhone 15 Pro 256GB","https://amzn.to/iphone15pro-256","https://m.media-amazon.com/images/iphone15pro.jpg","","","","","","","","","","","","","spr"
"💻 Top 5 Notebooks Gamer 2024 - Para Todos os Orçamentos","ASUS ROG Strix G15 RTX 4060","https://amzn.to/asus-rog-g15","https://m.media-amazon.com/images/asus-rog.jpg","Dell Alienware m15 R7","https://amzn.to/alienware-m15","https://m.media-amazon.com/images/alienware.jpg","MSI GE76 Raider RTX 4070","https://amzn.to/msi-ge76","https://m.media-amazon.com/images/msi-ge76.jpg","Lenovo Legion 5 Pro","https://amzn.to/legion-5-pro","https://m.media-amazon.com/images/legion.jpg","HP Omen 16 RTX 4050","https://amzn.to/hp-omen-16","https://m.media-amazon.com/images/hp-omen.jpg","bbr"
"⌚ Xiaomi Mi Band 8: Review Após 3 Meses de Uso","Xiaomi Mi Band 8 Global","https://amzn.to/xiaomi-band8","https://m.media-amazon.com/images/miband8.jpg","","","","","","","","","","","","","spr"
"☕ Melhores Cafeteiras Elétricas 2024 - Comparativo Completo","Nespresso Vertuo Next","https://amzn.to/nespresso-vertuo","https://m.media-amazon.com/images/nespresso.jpg","Dolce Gusto Genio S Plus","https://amzn.to/dolce-gusto","https://m.media-amazon.com/images/dolce.jpg","Philips L'OR Barista","https://amzn.to/philips-lor","https://m.media-amazon.com/images/philips.jpg","","","","","","","bbr"
"🎮 PlayStation 5 vs Xbox Series X: Qual Escolher em 2024?","PlayStation 5 Standard","https://amzn.to/ps5-standard","https://m.media-amazon.com/images/ps5.jpg","Xbox Series X","https://amzn.to/xbox-series-x","https://m.media-amazon.com/images/xbox.jpg","","","","","","","","","","bbr"
"🏠 Aspiradores Robô: Top 7 Modelos Para Sua Casa","Roomba i7+","https://amzn.to/roomba-i7","https://m.media-amazon.com/images/roomba.jpg","Xiaomi Robot Vacuum S10","https://amzn.to/xiaomi-s10","https://m.media-amazon.com/images/xiaomi-robot.jpg","Shark IQ Robot","https://amzn.to/shark-iq","https://m.media-amazon.com/images/shark.jpg","Electrolux Pure i9","https://amzn.to/electrolux-i9","https://m.media-amazon.com/images/electrolux.jpg","Multilaser HO041","https://amzn.to/multilaser-ho041","https://m.media-amazon.com/images/multilaser.jpg","bbr"
"📺 Smart TV 55 Polegadas: Melhor Custo-Benefício 2024","Samsung Crystal UHD 55AU7700","https://amzn.to/samsung-55au","https://m.media-amazon.com/images/samsung-tv.jpg","","","","","","","","","","","","","spr"
"🔊 Caixas de Som Bluetooth: 10 Opções Imperdíveis","JBL Charge 5","https://amzn.to/jbl-charge5","https://m.media-amazon.com/images/jbl.jpg","Sony SRS-XB43","https://amzn.to/sony-xb43","https://m.media-amazon.com/images/sony.jpg","Ultimate Ears Boom 3","https://amzn.to/ue-boom3","https://m.media-amazon.com/images/ue-boom.jpg","Anker Soundcore Motion+","https://amzn.to/anker-motion","https://m.media-amazon.com/images/anker.jpg","Marshall Kilburn II","https://amzn.to/marshall-kilburn","https://m.media-amazon.com/images/marshall.jpg","bbr"
"💄 Base Líquida: Review da Fenty Beauty Pro Filt'r","Fenty Beauty Pro Filt'r 240","https://amzn.to/fenty-240","https://m.media-amazon.com/images/fenty.jpg","","","","","","","","","","","","","spr"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_reviews_tatame_2024.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('📥 Template com 10 exemplos baixado! 🎉');
  };

  const handleClose = () => {
    setUploadedFile(null);
    setParsedData([]);
    setResults([]);
    setCurrentStep('upload');
    setIsProcessing(false);
    setGenerationSummary(null);
    setPublishToWordPress(false);
    setSelectedSiteId('');
    setSelectedReviews(new Set());
    closeWordPressPublishModal();
    closeBulkPublishModal();
    onClose();
  };


  const openWordPressPublishModal = (reviewId: string, title: string) => {
    setWordPressPublishModal({
      isOpen: true,
      reviewId: reviewId.replace('/api/reviews/', ''), // Clean the review ID
      title,
      isPublishing: false
    });
  };

  const closeWordPressPublishModal = () => {
    setWordPressPublishModal({
      isOpen: false,
      reviewId: '',
      title: '',
      isPublishing: false
    });
  };

  const publishToWordPressSite = async (siteId: string) => {
    setWordPressPublishModal(prev => ({ ...prev, isPublishing: true }));
    
    try {
      const response = await api.post('/api/reviews/publish-draft', {
        reviewId: wordPressPublishModal.reviewId,
        wordPressSiteId: siteId,
        status: 'draft'
      });

      if (response.data.success) {
        const site = wordPressSites.find(s => s._id === siteId);
        toast.success(`🎉 Rascunho criado em ${site?.name || site?.url}!`);
        
        // Open WordPress admin drafts page instead of individual post
        const adminUrl = `${site?.url.replace(/\/$/, '')}/wp-admin/edit.php?post_type=post&post_status=draft`;
        setTimeout(() => {
          window.open(adminUrl, '_blank');
        }, 500);
        
        closeWordPressPublishModal();
      } else {
        toast.error('Erro ao criar rascunho no WordPress');
      }
    } catch (error) {
      console.error('Error publishing to WordPress:', error);
      toast.error('Erro ao conectar com o WordPress');
    } finally {
      setWordPressPublishModal(prev => ({ ...prev, isPublishing: false }));
    }
  };

  const toggleReviewSelection = (index: number) => {
    setSelectedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const selectAllReviews = () => {
    const successfulIndexes = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'success')
      .map(({ index }) => index);
    
    setSelectedReviews(new Set(successfulIndexes));
  };

  const deselectAllReviews = () => {
    setSelectedReviews(new Set());
  };

  const openBulkPublishModal = () => {
    setBulkPublishModal({
      isOpen: true,
      selectedCount: selectedReviews.size
    });
  };

  const closeBulkPublishModal = () => {
    setBulkPublishModal({
      isOpen: false,
      selectedCount: 0
    });
  };

  const bulkPublishToWordPress = async (siteId: string) => {
    setIsBulkPublishing(true);
    
    try {
      const selectedIndexes = Array.from(selectedReviews);
      const reviewIds = selectedIndexes
        .map(index => results[index])
        .filter(result => result.status === 'success' && result.reviewId)
        .map(result => result.reviewId);

      if (reviewIds.length === 0) {
        toast.error('Nenhum review válido selecionado');
        return;
      }

      console.log(`🚀 Starting bulk publish of ${reviewIds.length} reviews to site ${siteId}`);

      const response = await api.post('/api/reviews/bulk-publish', {
        reviewIds: reviewIds,
        wordPressSiteId: siteId
      });

      if (response.data.success) {
        const summary = response.data.data.summary;
        const results = response.data.data.results;
        
        // Show success message
        toast.success(`🎉 ${summary.successful} reviews publicados no WordPress!`);
        
        if (summary.failed > 0) {
          toast.error(`❌ ${summary.failed} reviews falharam na publicação`);
        }

        if (summary.skipped > 0) {
          toast.warn(`⚠️ ${summary.skipped} reviews já estavam publicados`);
        }

        // Redirect to WordPress admin posts page
        const site = wordPressSites.find(s => s._id === siteId);
        if (site && summary.successful > 0) {
          const adminUrl = `${site.url.replace(/\/$/, '')}/wp-admin/edit.php?post_type=post&post_status=draft`;
          
          setTimeout(() => {
            window.open(adminUrl, '_blank');
            toast.success(`🎉 Abrindo painel do WordPress com seus ${summary.successful} novos rascunhos!`);
          }, 1000);
        }

        // Clear selections
        setSelectedReviews(new Set());
        closeBulkPublishModal();
        
      } else {
        toast.error('Erro na publicação em massa');
      }
    } catch (error: any) {
      console.error('Error bulk publishing:', error);
      toast.error('Erro ao publicar reviews no WordPress');
    } finally {
      setIsBulkPublishing(false);
    }
  };


  const handleStartProcessing = () => {
    processBulkReviews.mutate(parsedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-glow max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-soft">
          <div>
            <h3 className="text-2xl font-bold text-tatame-black flex items-center gap-2">
              🚀 Gerador de Reviews IA
            </h3>
            <p className="text-tatame-gray-600">Crie dezenas de reviews profissionais em poucos minutos com inteligência artificial</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {currentStep === 'upload' && (
            <>
              {/* Welcome & Benefits Section - New Addition */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 border border-green-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-900 text-lg mb-2">🚀 Por que usar Geração em Massa?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span><strong>10x mais rápido:</strong> 50 reviews em 5 minutos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span><strong>Economia:</strong> 80% mais barato que individual</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span><strong>Consistência:</strong> Padrão profissional em tudo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span><strong>SEO Otimizado:</strong> Palavras-chave automáticas</span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-green-700 bg-white/50 rounded-lg p-2">
                      💡 <strong>Ideal para:</strong> Afiliados, E-commerce, Blogs de Review, Agências de Marketing
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-tatame-red rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900 text-lg mb-2">📋 Passo 1: Baixe o Template Mágico</h4>
                    <p className="text-red-700 mb-4">
                      Nosso template especial organiza tudo para você. Só preencher os produtos e deixar a IA fazer o resto!
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="gradient-primary hover:shadow-glow text-white px-6 py-3 rounded-2xl transition-all duration-200 font-semibold shadow-medium hover:shadow-glow transform hover:scale-105 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Template CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload - Mobile-Enhanced */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-6 md:p-10 text-center transition-all duration-300 cursor-pointer group ${
                  isDragActive 
                    ? 'border-tatame-red bg-gradient-to-br from-red-50 to-pink-50 scale-105 shadow-glow' 
                    : 'border-slate-300 hover:border-tatame-red hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 hover:scale-102 hover:shadow-medium'
                }`}
              >
                <input {...getInputProps()} />
                <div className="relative mb-4 md:mb-6">
                  <Upload className={`w-12 h-12 md:w-16 md:h-16 mx-auto transition-all duration-300 ${
                    isDragActive ? 'text-tatame-red animate-bounce' : 'text-slate-400 group-hover:text-tatame-red group-hover:scale-110'
                  }`} />
                  <div className="absolute -inset-2 bg-tatame-red/20 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity"></div>
                </div>
                
                {/* Mobile-specific content */}
                <div className="block md:hidden">
                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    📱 Toque para Enviar CSV
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Selecione o arquivo CSV do seu dispositivo
                  </p>
                  <button 
                    type="button"
                    className="gradient-primary text-white px-6 py-3 rounded-2xl font-semibold shadow-medium transform active:scale-95 transition-all duration-150"
                  >
                    📂 Escolher Arquivo
                  </button>
                </div>
                
                {/* Desktop content */}
                <div className="hidden md:block">
                  <h4 className="text-2xl font-bold text-slate-900 mb-2">
                    {isDragActive ? '🎯 Solte aqui e vamos começar!' : '📁 Passo 2: Envie seu CSV'}
                  </h4>
                  <p className="text-slate-600">
                    {isDragActive ? 'Preparando a mágica da IA...' : 'Arraste e solte ou clique para selecionar seu arquivo preenchido'}
                  </p>
                </div>
              </div>

              {/* Enhanced Instructions */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  📋 Como Preencher o CSV (Super Fácil!)
                </h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold text-blue-800 mb-2">📝 Campos Obrigatórios:</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">title</code>: Título chamativo do review</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">productname1</code>: Nome do produto</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">affiliatelink1</code>: Link do afiliado</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">content_type</code>: bbr/spr/informational</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-green-800 mb-2">✨ Campos Opcionais:</h5>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• <code className="bg-green-100 px-1 rounded">productimage1</code>: URL da imagem</li>
                      <li>• <code className="bg-green-100 px-1 rounded">productname2,3,4,5...</code>: Mais produtos</li>
                      <li>• <em>Máximo 5 produtos por review</em></li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-white/70 rounded-xl border-l-4 border-yellow-400">
                  <h5 className="font-semibold text-yellow-800 mb-2">🎯 Tipos de Conteúdo:</h5>
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-purple-50 p-2 rounded-lg">
                      <strong className="text-purple-800">bbr</strong>
                      <p className="text-purple-600">Comparativo: "Os 5 Melhores..."</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg">
                      <strong className="text-green-800">spr</strong>  
                      <p className="text-green-600">Review único: "Review do iPhone..."</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <strong className="text-blue-800">informational</strong>
                      <p className="text-blue-600">Educativo: "Como escolher..."</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-blue-600 font-medium">
                    🔥 <strong>Dica Profissional:</strong> Use emojis nos títulos para mais engajamento!
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">
                  {parsedData.length} reviews encontradas
                </h4>
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Voltar
                </button>
              </div>

              {/* Usage Limits Check */}
              {usage && (
                <div className="space-y-4">
                  {/* Usage Display */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-blue-900 flex items-center gap-2">
                        📊 Seu Plano: {usage.plan === 'starter' ? '🥉 Starter' : usage.plan === 'pro' ? '🥈 Pro' : '🥇 Black Belt'}
                      </h5>
                      <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                        {usage.usage.reviews.limit === -1 ? 'Ilimitado' : `${usage.usage.reviews.used}/${usage.usage.reviews.limit}`}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Reviews usadas este mês:</span>
                        <span className="font-semibold text-blue-900">
                          {usage.usage.reviews.used}{usage.usage.reviews.limit !== -1 ? ` de ${usage.usage.reviews.limit}` : ' (ilimitado)'}
                        </span>
                      </div>
                      
                      {usage.usage.reviews.limit !== -1 && (
                        <>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(usage.usage.reviews.percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-blue-600">
                            <span>{usage.usage.reviews.percentage}% usado</span>
                            <span>{getRemainingUsage('reviews')} restantes</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Limit Check Warning/Error */}
                  {(() => {
                    const remaining = getRemainingUsage('reviews');
                    const isOverLimit = isLimitReached('reviews') || (usage.usage.reviews.limit !== -1 && parsedData.length > remaining);
                    const isNearLimit = !isOverLimit && usage.usage.reviews.limit !== -1 && remaining < 5;

                    if (isOverLimit) {
                      return (
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-300 rounded-2xl p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-bold text-red-900 text-lg mb-2">
                                🚫 Limite Excedido
                              </h5>
                              <p className="text-red-700 mb-4">
                                Você está tentando gerar <strong>{parsedData.length} reviews</strong> mas tem apenas{' '}
                                <strong>{remaining} reviews</strong> restantes no seu plano.
                              </p>
                              
                              <div className="space-y-2">
                                <div className="text-sm text-red-600 bg-red-100 rounded-lg p-3">
                                  <h6 className="font-semibold mb-1">💡 Soluções:</h6>
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>Gere apenas {remaining} reviews por agora</li>
                                    <li>Faça upgrade para o plano Pro (100 reviews/mês)</li>
                                    <li>Aguarde o reset mensal em {new Date(usage.nextResetDate).toLocaleDateString('pt-BR')}</li>
                                  </ul>
                                </div>
                              </div>
                              
                              <div className="mt-4 flex gap-3">
                                <button className="gradient-primary text-white px-4 py-2 rounded-2xl font-semibold shadow-medium hover:shadow-glow transform hover:scale-105 text-sm">
                                  🚀 Fazer Upgrade
                                </button>
                                <button 
                                  onClick={() => {
                                    const limitedData = parsedData.slice(0, remaining);
                                    setParsedData(limitedData);
                                    toast.success(`✂️ Lista reduzida para ${remaining} reviews`);
                                  }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-2xl font-semibold text-sm"
                                >
                                  ✂️ Usar apenas {remaining}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (isNearLimit) {
                      return (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                            <div className="flex-1">
                              <h5 className="font-semibold text-yellow-900 mb-1">
                                ⚠️ Próximo do Limite
                              </h5>
                              <p className="text-yellow-700 text-sm">
                                Após esta geração você terá <strong>{remaining - parsedData.length} reviews restantes</strong> este mês.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                          <div className="flex-1">
                            <h5 className="font-semibold text-green-900 mb-1">✅ Tudo Certo!</h5>
                            <p className="text-green-700 text-sm">
                              {usage.usage.reviews.limit === -1 
                                ? 'Reviews ilimitadas no seu plano' 
                                : `Você terá ${remaining - parsedData.length} reviews restantes após esta geração`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parsedData.map((review, index) => (
                  <div key={index} className="border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-slate-900">{review.title}</h5>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        review.contentType === 'spr' ? 'bg-coral/10 text-coral-dark' : 'bg-tatame-red/10 text-tatame-red'
                      }`}>
                        {review.contentType === 'spr' ? 'Review Único' : 'Comparativo'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {review.products.length} produto{review.products.length !== 1 ? 's' : ''}:
                      <span className="ml-1">
                        {review.products.map(p => p.name).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* WordPress Site Selection - Mandatory */}
              {wordPressSites && wordPressSites.length > 0 ? (
                <div className="bg-gradient-to-r from-tatame-red/5 to-coral/5 border border-tatame-red/20 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-tatame-red rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">🌐</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-tatame-red mb-1">Selecione o Site WordPress</h5>
                      <p className="text-xs text-slate-600 mb-3">
                        ✨ Todos os reviews serão publicados automaticamente como rascunhos no site selecionado
                      </p>
                      <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="w-full px-3 py-2 border border-tatame-red/30 rounded-xl focus:ring-2 focus:ring-tatame-red focus:border-transparent bg-white"
                        required
                      >
                        <option value="">🎯 Escolha o site para publicação...</option>
                        {wordPressSites?.map((site) => (
                          <option key={site._id} value={site._id}>
                            🌐 {site.name || site.url}
                          </option>
                        ))}
                      </select>
                      {!selectedSiteId && (
                        <p className="text-xs text-tatame-red mt-2 font-medium">
                          ⚠️ Obrigatório: Selecione um site WordPress para continuar
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-yellow-800 mb-1">Site WordPress Necessário</h5>
                      <p className="text-sm text-yellow-700 mb-3">
                        Para usar a geração em massa, você precisa configurar pelo menos um site WordPress.
                      </p>
                      <button
                        onClick={() => {
                          window.open('/profile?tab=wordpress', '_blank');
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        🔧 Configurar Site WordPress
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartProcessing}
                disabled={
                  !selectedSiteId || // Site selection is now mandatory
                  wordPressSites.length === 0 || // No sites available
                  (usage && isLimitReached('reviews')) ||
                  (usage && usage.usage.reviews.limit !== -1 && parsedData.length > getRemainingUsage('reviews'))
                }
                className="w-full gradient-primary hover:shadow-glow text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-medium hover:shadow-glow transform hover:scale-105 text-lg"
              >
                🚀 Gerar {parsedData.length} Reviews com IA e Publicar
              </button>
            </div>
          )}

          {currentStep === 'processing' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div className="absolute -inset-1 bg-tatame-red/40 rounded-full blur opacity-30 animate-ping"></div>
                </div>
                <h4 className="font-bold text-slate-900 text-xl mb-2">🤖 IA Trabalhando para Você</h4>
                <p className="text-slate-600">Criando reviews profissionais com inteligência artificial...</p>
                
                {/* Enhanced Progress Section */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-4 mt-6">
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner mb-3">
                    <div 
                      className="gradient-primary h-4 rounded-full transition-all duration-700 shadow-medium relative overflow-hidden"
                      style={{ 
                        width: `${(results.filter(r => r.status !== 'processing').length / results.length) * 100}%` 
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Progress Stats */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-medium">
                        ✨ {results.filter(r => r.status !== 'processing').length} de {results.length} concluídos
                      </span>
                    </div>
                    <div className="text-tatame-red font-semibold">
                      {Math.round((results.filter(r => r.status !== 'processing').length / results.length) * 100)}%
                    </div>
                  </div>
                  
                  {/* Time Estimate */}
                  <div className="mt-2 text-xs text-slate-600 text-center">
                    ⏱️ Tempo estimado: {Math.max(1, Math.ceil((results.length - results.filter(r => r.status !== 'processing').length) * 0.5))} minutos
                  </div>
                </div>
                
                {/* Processing Tips */}
                <div className="mt-4 text-xs text-slate-500 bg-blue-50 rounded-xl p-3">
                  💡 <strong>Dica:</strong> Enquanto aguarda, que tal preparar mais conteúdo? A IA está criando reviews únicos e otimizados para SEO!
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
                    result.status === 'processing' ? 'bg-gradient-to-r from-coral/10 to-coral/20 border border-coral/30 scale-[1.02] shadow-medium' :
                    result.status === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' :
                    'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium text-slate-900 flex-1 truncate pr-4">
                        {result.title}
                      </span>
                      <div className="flex items-center gap-2">
                        {result.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-coral rounded-full flex items-center justify-center">
                              <Loader2 className="w-3 h-3 text-white animate-spin" />
                            </div>
                            <span className="text-sm text-coral-dark font-medium">🤖 Criando...</span>
                          </div>
                        )}
                        {result.status === 'success' && (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm text-green-700 font-medium">✨ Concluído!</span>
                          </div>
                        )}
                        {result.status === 'error' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-700 font-medium">❌ Erro</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {result.status === 'processing' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-coral/20">
                        <div className="h-1 bg-coral animate-pulse"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'results' && (
            <div className="space-y-6">
              {/* Check if auto-publish was used */}
              {publishToWordPress && selectedSiteId && generationSummary && generationSummary.publishedToWordPress > 0 ? (
                // Simplified success screen for auto-published content
                <div className="text-center py-8">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur opacity-30"></div>
                  </div>
                  
                  <h4 className="font-bold text-slate-900 text-3xl mb-3">🎉 Tudo Pronto!</h4>
                  <p className="text-slate-600 text-lg mb-6">
                    <span className="font-semibold text-green-600">{generationSummary.publishedToWordPress} reviews</span> foram criados e publicados no seu WordPress
                  </p>
                  
                  {/* Direct action button */}
                  <div className="max-w-md mx-auto">
                    <button
                      onClick={() => {
                        const site = wordPressSites.find(s => s._id === selectedSiteId);
                        if (site) {
                          const adminUrl = `${site.url.replace(/\/$/, '')}/wp-admin/edit.php?post_type=post&post_status=draft`;
                          window.open(adminUrl, '_blank');
                          toast.success('🎉 Abrindo seu painel do WordPress!');
                        }
                      }}
                      className="w-full gradient-primary hover:shadow-glow text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 shadow-medium hover:shadow-glow transform hover:scale-105 text-lg flex items-center justify-center gap-3"
                    >
                      <span>🌐 Ir para o Blog</span>
                    </button>
                    
                    <p className="text-xs text-slate-500 mt-3">
                      ✨ Seus reviews estão como rascunhos prontos para revisão e publicação
                    </p>
                  </div>

                  {generationSummary.failed > 0 && (
                    <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 max-w-md mx-auto">
                      <p className="text-red-700 text-sm">
                        ⚠️ {generationSummary.failed} reviews falharam na geração
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Original detailed results screen for manual workflow
                <>
                  <div className="text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <CheckCircle className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur opacity-30"></div>
                    </div>
                    <h4 className="font-bold text-slate-900 text-2xl mb-2">🎉 Missão Cumprida!</h4>
                    {generationSummary ? (
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>
                          <span className="text-green-600 font-medium">{generationSummary.successful}</span> de {generationSummary.total} reviews geradas com sucesso
                        </p>
                        {generationSummary.failed > 0 && (
                          <p className="text-red-600">
                            {generationSummary.failed} falharam
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        {results.filter(r => r.status === 'success').length} de {results.length} reviews geradas com sucesso
                      </p>
                    )}
                  </div>

              {/* Bulk Actions Bar */}
              {results.filter(r => r.status === 'success').length > 1 && (
                <div className="bg-gradient-to-r from-tatame-red/5 to-coral/5 border border-tatame-red/20 rounded-2xl p-4 mb-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-tatame-gray-700">
                        <span className="font-semibold">{selectedReviews.size}</span> de{' '}
                        <span className="font-semibold">{results.filter(r => r.status === 'success').length}</span> selecionados
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={selectAllReviews}
                          className="text-xs text-tatame-red hover:text-tatame-red/80 font-medium"
                        >
                          Selecionar Todos
                        </button>
                        <span className="text-tatame-gray-300">•</span>
                        <button
                          onClick={deselectAllReviews}
                          className="text-xs text-tatame-gray-600 hover:text-tatame-gray-800 font-medium"
                        >
                          Desmarcar Todos
                        </button>
                      </div>
                    </div>
                    
                    {selectedReviews.size > 0 && (
                      <button
                        onClick={openBulkPublishModal}
                        disabled={isBulkPublishing || wordPressSites.length === 0}
                        className="gradient-primary hover:shadow-glow text-white px-4 py-2 rounded-2xl transition-all duration-200 font-semibold shadow-medium hover:shadow-glow transform hover:scale-105 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isBulkPublishing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            📚 Publicar {selectedReviews.size} no WordPress
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {wordPressSites.length === 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                      ⚠️ Configure um site WordPress no seu perfil para usar a publicação em massa
                    </div>
                  )}
                </div>
              )}

              {/* Generation Summary Card */}
              {generationSummary && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-green-900 text-lg">🎉 Conteúdo Criado com Sucesso!</h5>
                      <p className="text-green-700 text-sm">Seus reviews foram gerados pela IA em {(generationSummary.totalTime / 1000).toFixed(1)} segundos</p>
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-slate-700">Reviews Criados:</span>
                        <span className="font-bold text-green-600">{generationSummary.successful}</span>
                      </div>
                      {generationSummary.publishedToWordPress > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-slate-700">Publicados:</span>
                          <span className="font-bold text-blue-600">{generationSummary.publishedToWordPress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        {result.status === 'success' && (
                          <input
                            type="checkbox"
                            checked={selectedReviews.has(index)}
                            onChange={() => toggleReviewSelection(index)}
                            className="mt-1 h-4 w-4 text-tatame-red focus:ring-tatame-red border-gray-300 rounded cursor-pointer"
                          />
                        )}
                        <h6 className="font-medium text-slate-900 flex-1 pr-4">
                          {result.title}
                        </h6>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'success' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">✅ Pronto</span>
                          </>
                        )}
                        {result.status === 'error' && (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-red-600 font-medium">❌ Erro</span>
                          </>
                        )}
                      </div>
                    </div>

                    {result.status === 'success' && result.details && (
                      <div className="text-sm bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-800">Review gerado com sucesso!</span>
                          </div>
                          <button
                            onClick={() => openWordPressPublishModal(result.reviewId || '', result.title)}
                            className="text-xs bg-tatame-red text-white px-3 py-1 rounded-full hover:bg-tatame-red/90 transition-colors font-medium"
                          >
                            📝 Publicar
                          </button>
                        </div>
                      </div>
                    )}


                    {result.status === 'error' && result.error && (
                      <div className="bg-red-50 rounded-2xl p-4 border-l-4 border-red-400">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h6 className="font-semibold text-red-900 mb-1">❌ Falha na Geração</h6>
                            <p className="text-sm text-red-700 mb-2">{result.error}</p>
                            
                            {/* Error solutions */}
                            <div className="bg-white/70 rounded-lg p-3 text-xs text-red-600">
                              <p className="font-medium mb-1">💡 Possíveis soluções:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                <li>Verifique se os links dos produtos estão funcionando</li>
                                <li>Certifique-se que o título não está duplicado</li>
                                <li>Tente novamente em alguns minutos</li>
                              </ul>
                            </div>
                            
                            {/* Retry button could be added here in future */}
                            <div className="mt-3 flex gap-2">
                              <button className="text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors">
                                🔄 Tentar Novamente
                              </button>
                              <button className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-300 transition-colors">
                                ⏭️ Pular
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

                  <button
                    onClick={handleClose}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 shadow-medium hover:shadow-glow transform hover:scale-105 text-lg"
                  >
                    🎉 Finalizar e Fechar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Bulk Publishing Modal */}
      {bulkPublishModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-glow max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-tatame-red to-coral text-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xl font-bold mb-1">📚 Publicação em Massa</h3>
                  <p className="text-white/90 text-sm">{bulkPublishModal.selectedCount} reviews selecionados</p>
                </div>
                <button
                  onClick={closeBulkPublishModal}
                  className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isBulkPublishing}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-tatame-gray-600 mb-4">
                Escolha o site WordPress onde deseja publicar todos os {bulkPublishModal.selectedCount} reviews selecionados como rascunho:
              </p>

              {wordPressSites.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-tatame-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-tatame-red" />
                  </div>
                  <p className="text-tatame-gray-600 mb-4">Nenhum site WordPress configurado</p>
                  <p className="text-sm text-tatame-gray-500">Configure um site no seu perfil primeiro</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {wordPressSites.map((site) => (
                    <button
                      key={site._id}
                      onClick={() => bulkPublishToWordPress(site._id)}
                      disabled={isBulkPublishing}
                      className="w-full p-4 text-left border border-slate-200 rounded-2xl hover:border-tatame-red hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 group-hover:text-tatame-red">
                            {site.name || site.url}
                          </h4>
                          <p className="text-sm text-slate-600">{site.url}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${
                              site.isActive ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></span>
                            <span className="text-xs text-slate-500">{site.isActive ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                        {isBulkPublishing ? (
                          <Loader2 className="w-5 h-5 text-tatame-red animate-spin" />
                        ) : (
                          <div className="text-center">
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-tatame-red mx-auto" />
                            <div className="text-xs text-slate-500 mt-1 group-hover:text-tatame-red">
                              {bulkPublishModal.selectedCount} rascunhos
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  ✨ Todos os artigos serão criados como rascunhos para revisão
                </p>
                <button
                  onClick={closeBulkPublishModal}
                  disabled={isBulkPublishing}
                  className="text-sm text-tatame-gray-600 hover:text-tatame-red font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WordPress Publishing Modal */}
      {wordPressPublishModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-glow max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-tatame-red to-coral text-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xl font-bold mb-1">📝 Publicar no WordPress</h3>
                  <p className="text-white/90 text-sm">{wordPressPublishModal.title}</p>
                </div>
                <button
                  onClick={closeWordPressPublishModal}
                  className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={wordPressPublishModal.isPublishing}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-tatame-gray-600 mb-4">
                Escolha o site WordPress onde deseja publicar este artigo como rascunho:
              </p>

              {wordPressSites.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-tatame-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-tatame-red" />
                  </div>
                  <p className="text-tatame-gray-600">Nenhum site WordPress configurado</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {wordPressSites.map((site) => (
                    <button
                      key={site._id}
                      onClick={() => publishToWordPressSite(site._id)}
                      disabled={wordPressPublishModal.isPublishing}
                      className="w-full p-4 text-left border border-slate-200 rounded-2xl hover:border-tatame-red hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 group-hover:text-tatame-red">
                            {site.name || site.url}
                          </h4>
                          <p className="text-sm text-slate-600">{site.url}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${
                              site.isActive ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></span>
                            <span className="text-xs text-slate-500">{site.isActive ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                        {wordPressPublishModal.isPublishing ? (
                          <Loader2 className="w-5 h-5 text-tatame-red animate-spin" />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-400 group-hover:text-tatame-red" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  ✨ O artigo será criado como rascunho para revisão
                </p>
                <button
                  onClick={closeWordPressPublishModal}
                  disabled={wordPressPublishModal.isPublishing}
                  className="text-sm text-tatame-gray-600 hover:text-tatame-red font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};