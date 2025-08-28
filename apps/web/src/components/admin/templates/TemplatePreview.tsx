import React from 'react';
import { 
  X, 
  Globe, 
  Download, 
  Zap, 
  Award, 
  HardDrive,
  Server,
  Code,
  Package,
  ExternalLink,
  Clock,
  User
} from 'lucide-react';

interface TemplatePreviewProps {
  template: any;
  onClose: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onClose }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      blog: 'Blog',
      affiliate: 'Afiliados',
      business: 'Negócios',
      ecommerce: 'E-commerce',
      portfolio: 'Portfolio',
      landing: 'Landing Page'
    };
    return labels[category] || category;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado'
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: 'text-green-400',
      intermediate: 'text-yellow-400',
      advanced: 'text-red-400'
    };
    return colors[difficulty] || 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white">
            Detalhes do Template
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Thumbnail */}
              <div>
                <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Globe className="w-16 h-16 text-slate-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{template.name}</h3>
                <p className="text-slate-400 mb-4">{template.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm">
                    {getCategoryLabel(template.category)}
                  </span>
                  <span className={`px-3 py-1 bg-slate-800 rounded-full text-sm ${getDifficultyColor(template.difficulty)}`}>
                    {getDifficultyLabel(template.difficulty)}
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm">
                    v{template.version}
                  </span>
                  {template.pricingTier && (
                    <span className="px-3 py-1 bg-slate-800 text-coral rounded-full text-sm font-medium">
                      {template.pricingTier === 'free' ? 'Gratuito' : 
                       template.pricingTier === 'pro' ? 'Pro' : 'Premium'}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              {template.features && template.features.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.features.map((feature: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-coral/10 text-coral rounded-lg text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Plugins */}
              {template.requiredPlugins && template.requiredPlugins.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Plugins Necessários</h4>
                  <div className="space-y-2">
                    {template.requiredPlugins.map((plugin: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-slate-400">
                        <Package className="w-4 h-4" />
                        <span className="text-sm">{plugin}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Métricas de Performance</h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Performance Score
                      </span>
                      <span className="text-sm font-medium text-white">{template.performanceScore}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-coral to-coral-dark h-2 rounded-full"
                        style={{ width: `${template.performanceScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        SEO Score
                      </span>
                      <span className="text-sm font-medium text-white">{template.seoScore}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                        style={{ width: `${template.seoScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Detalhes Técnicos</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Tamanho do Arquivo
                    </span>
                    <span className="text-sm text-white">{formatFileSize(template.fileSize)}</span>
                  </div>

                  {template.wordpressVersion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        WordPress
                      </span>
                      <span className="text-sm text-white">v{template.wordpressVersion}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      PHP
                    </span>
                    <span className="text-sm text-white">v{template.phpVersion}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Downloads
                    </span>
                    <span className="text-sm text-white">{template.downloads}</span>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Informações do Sistema</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      template.status === 'active' ? 'bg-green-100 text-green-800' :
                      template.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {template.status === 'active' ? 'Ativo' :
                       template.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Criado em
                    </span>
                    <span className="text-sm text-white">{formatDate(template.createdAt)}</span>
                  </div>

                  {template.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Atualizado em
                      </span>
                      <span className="text-sm text-white">{formatDate(template.updatedAt)}</span>
                    </div>
                  )}

                  {template.createdBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Criado por
                      </span>
                      <span className="text-sm text-white">
                        {template.createdBy.name || template.createdBy.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {template.demoUrl && (
                  <a
                    href={template.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Demo
                  </a>
                )}
                <a
                  href={template.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-coral hover:bg-coral-dark text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar Template
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};