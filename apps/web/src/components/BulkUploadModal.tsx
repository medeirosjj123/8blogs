import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, Download, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useUsage } from '../hooks/useUsage';
import { useJobStatus } from '../hooks/useJobStatus';
import { JobProgressCard } from './JobProgressCard';
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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
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

  // Add timeout detection for stuck processing
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Job status tracking
  const {
    job: currentJob,
    isLoading: jobLoading,
    error: jobError,
    startPolling,
    stopPolling,
    isPolling
  } = useJobStatus({
    jobId: currentJobId,
    enabled: !!currentJobId,
    onComplete: (job) => {
      console.log('✅ [BULK-MODAL] Job completed successfully:', {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        stats: job.results.stats,
        completedCount: job.results.completed.length
      });
      
      // Clear timeout
      if (processingTimeout) {
        clearTimeout(processingTimeout);
        setProcessingTimeout(null);
      }
      
      setIsProcessing(false);
      setCurrentStep('results');
      
      // Convert job results to the format expected by existing UI
      const convertedResults = job.results.completed.map(result => ({
        title: result.title,
        status: result.status,
        reviewId: result.reviewId,
        error: result.error,
        details: {
          mongoId: result.reviewId || '',
          collection: 'reviews',
          slug: result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          aiProvider: 'unknown',
          aiModel: 'unknown',
          tokensUsed: 0,
          cost: 0,
          generationTime: 0,
          wordpressUrl: result.wordpressUrl || null,
          publishedAt: result.generatedAt,
          preview: {
            introduction: '',
            conclusion: '',
            productCount: 0,
            contentType: 'bbr',
            fullContentUrl: result.wordpressUrl || ''
          }
        }
      }));
      
      console.log('🔄 [BULK-MODAL] Setting results:', {
        convertedResultsCount: convertedResults.length,
        firstResult: convertedResults[0]?.title
      });
      
      setResults(convertedResults);
      setGenerationSummary({
        total: job.results.stats.totalReviews,
        successful: job.results.stats.successfulReviews,
        failed: job.results.stats.failedReviews,
        publishedToWordPress: job.results.completed.filter(r => r.wordpressUrl).length
      });
      
      toast.success(`${job.results.stats.successfulReviews} reviews geradas com sucesso!`);
    },
    onProgress: (job) => {
      console.log('📈 [BULK-MODAL] Job progress update:', {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        completedReviews: job.results?.completed?.length || 0,
        isPollingActive: isPolling
      });
      // Progress is handled by the JobProgressCard component
    },
    onError: (error) => {
      console.error('❌ [BULK-MODAL] Job failed with error:', {
        error,
        message: error?.message,
        jobId: currentJobId
      });
      
      // Clear timeout
      if (processingTimeout) {
        clearTimeout(processingTimeout);
        setProcessingTimeout(null);
      }
      
      setIsProcessing(false);
      setCurrentStep('results');
      toast.error('Erro na geração de reviews: ' + (error?.message || 'Erro desconhecido'));
    },
    pollInterval: 2000
  });
  // Removed bulk selection state as part of simplified completion flow

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

  // Start polling when job ID changes
  useEffect(() => {
    if (currentJobId) {
      console.log('🔄 [BULK-MODAL] Job ID changed, starting polling:', {
        jobId: currentJobId,
        currentStep,
        isProcessing,
        isPollingActive: isPolling
      });
      startPolling();
    } else {
      console.log('❌ [BULK-MODAL] No job ID available, cannot start polling');
    }
  }, [currentJobId, startPolling]);

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
        console.log(`🚀 Starting queue-based bulk generation of ${reviewsData.length} reviews`);
        console.log('📝 WordPress Publishing Parameters:', {
          publishToWordPress,
          selectedSiteId,
          willPublish: publishToWordPress && selectedSiteId ? 'YES' : 'NO'
        });
        
        const response = await api.post('/api/reviews/queue-bulk-generate', {
          reviews: reviewsData.map(review => ({
            title: review.title,
            contentType: review.contentType || 'bbr',
            products: review.products
          })),
          publishToWordPress,
          selectedSiteId: publishToWordPress ? selectedSiteId : undefined
        });

        if (response.data.success) {
          const { jobId, reviewCount, estimatedTime } = response.data.data;
          
          console.log('🎯 [BULK-MODAL] Job queued successfully:', {
            jobId,
            reviewCount,
            estimatedTime,
            responseData: response.data
          });
          
          // Set the job ID to start polling
          console.log('📝 [BULK-MODAL] Setting job ID to start polling:', jobId);
          setCurrentJobId(jobId);
          
          // Verify the job ID was set
          setTimeout(() => {
            console.log('🔍 [BULK-MODAL] Job ID verification after setState:', {
              setJobId: jobId,
              currentStateJobId: currentJobId,
              // Note: currentJobId may not be updated yet due to async setState
            });
          }, 100);
          
          // Set timeout to detect stuck jobs (3x estimated time + 5 minutes buffer)
          const timeoutMs = Math.max((estimatedTime * 3 + 300) * 1000, 10 * 60 * 1000); // Min 10 minutes
          const timeout = setTimeout(() => {
            console.log('⏰ [BULK-MODAL] Job timeout detected - job may be stuck');
            toast.error('O job parece estar travado. Use o botão "Forçar" para fechar.');
          }, timeoutMs);
          setProcessingTimeout(timeout);
          
          toast.success(`${reviewCount} reviews na fila! Tempo estimado: ${Math.round(estimatedTime / 60)} min`);
          
          // The job status hook will handle the rest of the process
          return { jobId, reviewCount, estimatedTime };
        } else {
          throw new Error(response.data.message || 'Failed to queue bulk generation');
        }
      } catch (error: any) {
        console.error('🚨 [BULK-GENERATION] Full error details:', {
          error,
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method
        });
        
        // Get the actual error message from the API response
        let errorMessage = 'Erro na geração em massa';
        
        if (error.response?.data?.message) {
          // API returned an error message
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          // API returned an error field
          errorMessage = error.response.data.error;
        } else if (error.response?.status === 404) {
          errorMessage = `Endpoint não encontrado: ${error.config?.method?.toUpperCase()} ${error.config?.url}`;
        } else if (error.response?.status) {
          errorMessage = `Erro ${error.response.status}: ${error.response.statusText}`;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.error('🚨 [BULK-GENERATION] Processed error message:', errorMessage);
        
        // Mark all as error
        const errorResults = results.map(result => ({
          ...result,
          status: 'error' as const,
          error: errorMessage
        }));
        
        setResults(errorResults);
        setIsProcessing(false);
        setCurrentStep('results');
        
        toast.error(`Falha na geração em massa: ${errorMessage}`);
        
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
    // Clear timeout
    if (processingTimeout) {
      clearTimeout(processingTimeout);
      setProcessingTimeout(null);
    }
    
    // Clean up state
    setUploadedFile(null);
    setParsedData([]);
    setResults([]);
    setCurrentStep('upload');
    setIsProcessing(false);
    setGenerationSummary(null);
    // Keep publishToWordPress as true since it's mandatory for bulk generation
    setSelectedSiteId(''); // Reset site selection so user must choose again
    setCurrentJobId(null);
    closeWordPressPublishModal();
    
    // Stop polling
    stopPolling();
    
    onClose();
  };

  const handleForceClose = () => {
    console.log('🚨 Force closing modal during processing');
    
    // Clear timeout
    if (processingTimeout) {
      clearTimeout(processingTimeout);
      setProcessingTimeout(null);
    }
    
    setIsProcessing(false);
    stopPolling();
    handleClose();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processingTimeout]);


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

  // Selection functions removed as part of simplified completion flow

  // Bulk publishing functions removed as part of simplified completion flow


  const handleStartProcessing = () => {
    processBulkReviews.mutate(parsedData);
  };

  if (!isOpen) return null;

  return (
    <>
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
          <div className="flex items-center gap-2">
            {isProcessing && (
              <button
                onClick={handleForceClose}
                className="text-red-500 hover:text-red-700 transition-colors text-sm font-medium flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                title="Forçar fechamento"
              >
                <X size={14} />
                Forçar
              </button>
            )}
            <button
              onClick={isProcessing ? undefined : handleClose}
              className={`transition-colors ${
                isProcessing 
                  ? 'text-slate-300 cursor-not-allowed' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              disabled={isProcessing}
            >
              <X size={20} />
            </button>
          </div>
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
              <div className="text-center mb-6">
                <h4 className="font-bold text-slate-900 text-xl mb-2">🤖 IA Trabalhando para Você</h4>
                <p className="text-slate-600">Reviews sendo geradas em segundo plano...</p>
                {currentJobId && (
                  <p className="text-xs text-gray-500 mt-1">Job ID: {currentJobId}</p>
                )}
              </div>

              {currentJob && (
                <>
                  <JobProgressCard 
                    job={currentJob} 
                    className="border-2 border-blue-200 shadow-lg"
                    hideCompletionDetails={false}
                  />
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                    <strong>Status:</strong> {currentJob.status} | <strong>Progresso:</strong> {currentJob.progress.current}/{currentJob.progress.total} ({currentJob.progress.percentage}%)
                    {currentJob.currentStep && <span> | <strong>Etapa:</strong> {currentJob.currentStep}</span>}
                    <br />
                    <strong>Job ID:</strong> {currentJob.id} | <strong>Polling:</strong> {isPolling ? '🟢 Ativo' : '🔴 Inativo'}
                    {currentJob.results && <span> | <strong>Concluídos:</strong> {currentJob.results.completed?.length || 0}</span>}
                  </div>
                </>
              )}

              {!currentJob && currentJobId && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Conectando ao sistema de fila...</p>
                  <p className="text-xs text-gray-500 mt-2">Aguardando resposta da API...</p>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 mt-4">
                    <strong>Job ID:</strong> {currentJobId} | <strong>Polling:</strong> {isPolling ? '🟢 Ativo' : '🔴 Inativo'} | <strong>Loading:</strong> {jobLoading ? '🔄 Sim' : '❌ Não'}
                    {jobError && <span> | <strong>Erro:</strong> {jobError.message}</span>}
                  </div>
                </div>
              )}

              {!currentJob && !currentJobId && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Iniciando processamento...</p>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm text-blue-700">
                  💡 <strong>Dica:</strong> Você pode fechar esta janela. O progresso continuará em segundo plano!
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Se o modal travar, use o botão "Forçar" para fechá-lo
                </p>
              </div>
            </div>
          )}

          {currentStep === 'results' && (
            <div className="space-y-6">
              {/* Simplified "Go to WordPress" screen - always used */}
              <div className="text-center py-8">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur opacity-30"></div>
                </div>
                
                <h4 className="font-bold text-slate-900 text-3xl mb-3">🎉 Tudo Pronto!</h4>
                <p className="text-slate-600 text-lg mb-6">
                  {generationSummary ? (
                    <>
                      <span className="font-semibold text-green-600">{generationSummary.successful} reviews</span> foram gerados{publishToWordPress && selectedSiteId ? ' e publicados' : ''} com sucesso
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-green-600">{results.filter(r => r.status === 'success').length} reviews</span> foram gerados{publishToWordPress && selectedSiteId ? ' e publicados' : ''} com sucesso
                    </>
                  )}
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

                {/* Show failed count if any */}
                {((generationSummary && generationSummary.failed > 0) || (!generationSummary && results.filter(r => r.status === 'failed').length > 0)) && (
                  <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 max-w-md mx-auto">
                    <p className="text-red-700 text-sm">
                      ⚠️ {generationSummary ? generationSummary.failed : results.filter(r => r.status === 'failed').length} reviews falharam na geração
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 flex justify-between items-center rounded-b-2xl">
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-800 font-medium py-2 px-4 rounded-xl transition-colors duration-200"
          >
            Fechar
          </button>
          
          {currentStep === 'processing' && currentJob?.status !== 'completed' && (
            <button
              onClick={() => {
                console.log('🔴 [BULK-MODAL] Force close requested - stopping polling and closing modal');
                stopPolling();
                setCurrentStep('upload');
                setCurrentJobId(null);
                setIsProcessing(false);
                if (processingTimeout) {
                  clearTimeout(processingTimeout);
                  setProcessingTimeout(null);
                }
                toast.info('Modal fechado. O processamento continua em segundo plano.');
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-xl transition-colors duration-200"
            >
              Forçar Fechamento
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Bulk Publish Modal - Removed as part of simplified completion flow */}

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
    </>
  );
};