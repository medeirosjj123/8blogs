import React, { useState } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Settings, 
  Shield, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Trash2,
  RefreshCw,
  Zap,
  Eye,
  Users,
  BarChart3
} from 'lucide-react';
import { BlogMetrics } from './BlogMetrics';
import { AddAnalyticsModal } from './AddAnalyticsModal';
import toast from 'react-hot-toast';

interface Blog {
  _id: string;
  name: string;
  url: string;
  domain: string;
  status: 'active' | 'maintenance' | 'error';
  healthStatus: 'good' | 'warning' | 'error';
  googleAnalyticsId?: string;
  metrics?: {
    realtimeUsers: number;
    todayViews: number;
    weekViews: number;
    monthViews: number;
    averageSessionDuration: number;
    bounceRate: number;
    topPost?: string;
    topSource?: string;
    growthRate?: number;
  };
  wordpress?: {
    version: string;
    pluginsNeedUpdate: number;
    lastBackup?: string;
    sslActive: boolean;
  };
  createdAt: string;
}

interface BlogCardProps {
  blog: Blog;
  onUpdateAnalytics?: (blogId: string, analyticsId: string) => Promise<void>;
  onQuickAction?: (blogId: string, action: 'delete' | 'refresh' | 'maintenance') => Promise<void>;
}

export const BlogCard: React.FC<BlogCardProps> = ({ 
  blog, 
  onUpdateAnalytics,
  onQuickAction 
}) => {
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState<string | null>(null);

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getHealthText = (status: string) => {
    switch (status) {
      case 'good':
        return 'Tudo funcionando perfeitamente';
      case 'warning':
        return 'Atenção necessária';
      case 'error':
        return 'Problema detectado';
      default:
        return 'Verificando status...';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAnalyticsSave = async (analyticsId: string) => {
    if (onUpdateAnalytics) {
      await onUpdateAnalytics(blog._id, analyticsId);
    }
  };

  const handleQuickAction = async (action: 'delete' | 'refresh' | 'maintenance') => {
    if (!onQuickAction) return;
    
    setIsLoadingAction(action);
    try {
      await onQuickAction(blog._id, action);
      
      switch (action) {
        case 'delete':
          toast.success('🗑️ Site removido com sucesso!');
          break;
        case 'refresh':
          toast.success('🔄 Status atualizado!');
          break;
        case 'maintenance':
          toast.success(`🔧 Modo ${blog.status === 'maintenance' ? 'normal' : 'manutenção'} ativado!`);
          break;
      }
    } catch (error) {
      toast.error('❌ Erro na operação. Tente novamente.');
    } finally {
      setIsLoadingAction(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft hover:shadow-medium overflow-hidden transition-all duration-300 group">
      {/* Blog Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-coral transition-colors line-clamp-1">
              {blog.name || blog.domain}
            </h3>
            <a 
              href={blog.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-coral transition-colors flex items-center gap-1 font-medium"
            >
              {blog.domain}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(blog.status)}`}>
              {blog.status === 'active' ? '✅ Ativo' : blog.status === 'maintenance' ? '🔧 Manutenção' : '❌ Erro'}
            </span>
          </div>
        </div>

        {/* Health Status */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          {getHealthIcon(blog.healthStatus || 'good')}
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-700">
              {getHealthText(blog.healthStatus || 'good')}
            </span>
          </div>
          {blog.wordpress?.sslActive && (
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">SSL Ativo</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics/Metrics Section */}
      <div className="p-6">
        {blog.googleAnalyticsId ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                Métricas em Tempo Real
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-1 rounded-full font-medium border border-green-300">
                  ✓ Conectado
                </span>
              </div>
            </div>
            
            {/* Show Google Analytics ID */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Google Analytics ID:</span>
                  <p className="text-sm font-mono text-slate-700 mt-1">{blog.googleAnalyticsId}</p>
                </div>
                <button 
                  onClick={() => setShowAnalyticsModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
            
            <BlogMetrics blogId={blog._id} metrics={blog.metrics} />
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-coral/10 to-coral/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-coral/20">
              <TrendingUp className="w-8 h-8 text-coral" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">
              Conecte o Google Analytics
            </h4>
            <p className="text-sm text-slate-600 mb-4 max-w-xs mx-auto">
              Veja visitantes em tempo real, posts mais populares e de onde vem seu tráfego
            </p>
            <button 
              onClick={() => setShowAnalyticsModal(true)}
              className="bg-coral hover:bg-coral-dark text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-medium inline-flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Conectar em 30 segundos
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 pb-6">
        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <a
            href={blog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all text-sm font-medium"
          >
            <Globe className="w-4 h-4" />
            Ver Site
          </a>
          
          <a
            href={`${blog.url}/wp-admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-coral hover:bg-coral-dark text-white rounded-xl transition-all text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            WordPress Admin
          </a>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickAction('refresh')}
            disabled={isLoadingAction === 'refresh'}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all text-xs font-medium disabled:opacity-50"
          >
            {isLoadingAction === 'refresh' ? (
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Atualizar
          </button>

          <button
            onClick={() => handleQuickAction('maintenance')}
            disabled={isLoadingAction === 'maintenance'}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium disabled:opacity-50 ${
              blog.status === 'maintenance' 
                ? 'bg-green-50 hover:bg-green-100 text-green-700'
                : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
            }`}
          >
            {isLoadingAction === 'maintenance' ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Zap className="w-3 h-3" />
            )}
            {blog.status === 'maintenance' ? 'Ativar' : 'Manutenção'}
          </button>

          <button
            onClick={() => {
              if (confirm(`Tem certeza que deseja remover "${blog.name || blog.domain}"? Esta ação não pode ser desfeita.`)) {
                handleQuickAction('delete');
              }
            }}
            disabled={isLoadingAction === 'delete'}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all text-xs font-medium disabled:opacity-50"
          >
            {isLoadingAction === 'delete' ? (
              <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Remover
          </button>
        </div>

        {/* Backup Notice */}
        <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700 text-center">
            💾 Backup automático em desenvolvimento
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Criado em {new Date(blog.createdAt).toLocaleDateString('pt-BR')}</span>
          {blog.wordpress?.pluginsNeedUpdate && blog.wordpress.pluginsNeedUpdate > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertCircle className="w-3 h-3" />
              {blog.wordpress.pluginsNeedUpdate} updates disponíveis
            </span>
          )}
        </div>
      </div>

      {/* Analytics Modal */}
      <AddAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        onSave={handleAnalyticsSave}
        blogName={blog.name || blog.domain}
      />
    </div>
  );
};