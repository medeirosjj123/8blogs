import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Globe,
  Eye,
  FileText,
  Image,
  Hash,
  ExternalLink,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Monitor,
  Smartphone,
  Loader2,
  Copy,
  Wand2
} from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import toast from 'react-hot-toast';

interface SeoConfig {
  _id: string;
  page: string;
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  robots?: string;
  customMeta?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
  isActive: boolean;
}

const PAGE_OPTIONS = [
  { value: 'home', label: 'Página Inicial' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'courses', label: 'Cursos' },
  { value: 'community', label: 'Comunidade' },
  { value: 'tools', label: 'Ferramentas' },
  { value: 'profile', label: 'Perfil' },
  { value: 'about', label: 'Sobre' },
  { value: 'contact', label: 'Contato' }
];

export default function SeoSettings() {
  const [selectedPage, setSelectedPage] = useState('home');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const queryClient = useQueryClient();

  // Fetch all SEO configs
  const { data: seoConfigs = {} } = useQuery({
    queryKey: ['admin-seo-configs'],
    queryFn: () => adminService.getSeoConfigs()
  });

  // Fetch specific page config
  const { data: pageConfig, isLoading } = useQuery({
    queryKey: ['admin-seo-config', selectedPage],
    queryFn: () => adminService.getSeoConfig(selectedPage),
    enabled: !!selectedPage
  });

  // Initialize SEO configs
  const initializeMutation = useMutation({
    mutationFn: () => adminService.initializeSeoConfigs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-configs'] });
      toast.success('Configurações SEO inicializadas');
    }
  });

  // Save SEO config
  const saveMutation = useMutation({
    mutationFn: ({ page, data }: { page: string; data: any }) =>
      adminService.upsertSeoConfig(page, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-config', selectedPage] });
      queryClient.invalidateQueries({ queryKey: ['admin-seo-configs'] });
      toast.success('Configuração SEO salva com sucesso');
    }
  });

  // Preview SEO
  const previewMutation = useMutation({
    mutationFn: ({ page, data }: { page: string; data: any }) =>
      adminService.previewSeoConfig(page, data),
    onSuccess: (result) => {
      setPreviewData(result);
      setShowPreview(true);
    }
  });

  const [formData, setFormData] = useState<Partial<SeoConfig>>({
    title: '',
    description: '',
    keywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    canonicalUrl: '',
    robots: 'index, follow',
    customMeta: []
  });

  React.useEffect(() => {
    if (pageConfig) {
      setFormData(pageConfig);
    } else {
      // Reset form for new page
      setFormData({
        title: '',
        description: '',
        keywords: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: '',
        twitterDescription: '',
        twitterImage: '',
        canonicalUrl: '',
        robots: 'index, follow',
        customMeta: []
      });
    }
  }, [pageConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Título e descrição são obrigatórios');
      return;
    }

    saveMutation.mutate({ page: selectedPage, data: formData });
  };

  const handlePreview = () => {
    previewMutation.mutate({ page: selectedPage, data: formData });
  };

  const addCustomMeta = () => {
    setFormData(prev => ({
      ...prev,
      customMeta: [...(prev.customMeta || []), { name: '', content: '' }]
    }));
  };

  const removeCustomMeta = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customMeta: prev.customMeta?.filter((_, i) => i !== index) || []
    }));
  };

  const updateCustomMeta = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customMeta: prev.customMeta?.map((meta, i) => 
        i === index ? { ...meta, [field]: value } : meta
      ) || []
    }));
  };

  const copyPreviewUrl = () => {
    const baseUrl = window.location.origin;
    const pageUrl = selectedPage === 'home' ? baseUrl : `${baseUrl}/${selectedPage}`;
    navigator.clipboard.writeText(pageUrl);
    toast.success('URL copiada para área de transferência');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-coral" />
              Configurações SEO
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie títulos, meta tags e Open Graph para otimizar o SEO
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              {initializeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Inicializar Padrões
            </button>
          </div>
        </div>

        {/* Page Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Página para Configurar
          </label>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="w-full max-w-sm p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            {PAGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* SEO Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic SEO */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Título da Página *
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="Título otimizado para SEO (máx. 60 caracteres)"
                maxLength={60}
              />
              <p className="text-xs text-slate-500 mt-1">
                {(formData.title?.length || 0)}/60 caracteres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descrição Meta *
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="Descrição que aparece nos resultados de busca (máx. 160 caracteres)"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-slate-500 mt-1">
                {(formData.description?.length || 0)}/160 caracteres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Palavras-chave
              </label>
              <input
                type="text"
                value={formData.keywords || ''}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="SEO, marketing digital, WordPress (separadas por vírgula)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <ExternalLink className="w-4 h-4 inline mr-1" />
                URL Canônica
              </label>
              <input
                type="url"
                value={formData.canonicalUrl || ''}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="https://tatame.afiliadofaixapreta.com.br/page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Robots Meta
              </label>
              <select
                value={formData.robots || 'index, follow'}
                onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
              >
                <option value="index, follow">Index, Follow</option>
                <option value="noindex, follow">No Index, Follow</option>
                <option value="index, nofollow">Index, No Follow</option>
                <option value="noindex, nofollow">No Index, No Follow</option>
              </select>
            </div>
          </div>

          {/* Open Graph */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-md font-medium text-white mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-coral" />
              Open Graph (Facebook)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  OG Título
                </label>
                <input
                  type="text"
                  value={formData.ogTitle || ''}
                  onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Deixe vazio para usar o título principal"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo OG
                </label>
                <select
                  value={formData.ogType || 'website'}
                  onChange={(e) => setFormData({ ...formData, ogType: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="website">Website</option>
                  <option value="article">Article</option>
                  <option value="product">Product</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  OG Descrição
                </label>
                <textarea
                  value={formData.ogDescription || ''}
                  onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Deixe vazio para usar a descrição principal"
                  rows={2}
                  maxLength={160}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  OG Imagem
                </label>
                <input
                  type="url"
                  value={formData.ogImage || ''}
                  onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="https://exemplo.com/imagem.jpg (1200x630px recomendado)"
                />
              </div>
            </div>
          </div>

          {/* Twitter Cards */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-md font-medium text-white mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-coral" />
              Twitter Cards
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de Card
                </label>
                <select
                  value={formData.twitterCard || 'summary_large_image'}
                  onChange={(e) => setFormData({ ...formData, twitterCard: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Summary Large Image</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Twitter Título
                </label>
                <input
                  type="text"
                  value={formData.twitterTitle || ''}
                  onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Deixe vazio para usar OG título"
                  maxLength={60}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Twitter Descrição
                </label>
                <textarea
                  value={formData.twitterDescription || ''}
                  onChange={(e) => setFormData({ ...formData, twitterDescription: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Deixe vazio para usar OG descrição"
                  rows={2}
                  maxLength={160}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Twitter Imagem
                </label>
                <input
                  type="url"
                  value={formData.twitterImage || ''}
                  onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Deixe vazio para usar OG imagem"
                />
              </div>
            </div>
          </div>

          {/* Custom Meta Tags */}
          <div className="border-t border-slate-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-white">Meta Tags Personalizadas</h3>
              <button
                type="button"
                onClick={addCustomMeta}
                className="px-3 py-1 bg-slate-800 text-white rounded text-sm hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Adicionar
              </button>
            </div>
            
            {formData.customMeta?.map((meta, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="name ou property"
                  value={meta.name || meta.property || ''}
                  onChange={(e) => updateCustomMeta(index, meta.name !== undefined ? 'name' : 'property', e.target.value)}
                  className="flex-1 p-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-coral text-sm"
                />
                <input
                  type="text"
                  placeholder="content"
                  value={meta.content}
                  onChange={(e) => updateCustomMeta(index, 'content', e.target.value)}
                  className="flex-2 p-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-coral text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeCustomMeta(index)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              {previewMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Pré-visualizar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-800 m-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Pré-visualização SEO</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Google Preview */}
              <div>
                <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-coral" />
                  Google Search Results
                </h4>
                <div className="bg-white p-4 rounded">
                  <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                    {previewData.google.title}
                  </div>
                  <div className="text-green-700 text-sm">
                    {previewData.google.url}
                  </div>
                  <div className="text-gray-700 text-sm mt-1">
                    {previewData.google.description}
                  </div>
                </div>
              </div>

              {/* Facebook Preview */}
              <div>
                <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-coral" />
                  Facebook Share
                </h4>
                <div className="bg-white rounded overflow-hidden max-w-lg">
                  {previewData.facebook.image && (
                    <img 
                      src={previewData.facebook.image} 
                      alt="OG" 
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <div className="text-gray-500 text-xs uppercase">
                      {previewData.facebook.siteName}
                    </div>
                    <div className="text-gray-900 font-semibold">
                      {previewData.facebook.title}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {previewData.facebook.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter Preview */}
              <div>
                <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-coral" />
                  Twitter Card
                </h4>
                <div className="bg-white rounded-lg overflow-hidden max-w-lg border">
                  {previewData.twitter.image && (
                    <img 
                      src={previewData.twitter.image} 
                      alt="Twitter" 
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <div className="text-gray-900 font-semibold">
                      {previewData.twitter.title}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {previewData.twitter.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}