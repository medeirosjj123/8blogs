import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Settings, 
  Shield, 
  TrendingUp, 
  Database, 
  RefreshCw, 
  Plus, 
  Eye, 
  EyeOff,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Zap,
  Lock,
  Unlock,
  Edit,
  Copy,
  Terminal,
  Rocket,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { WordPressSite } from '../types/wp-site';
import { AddExistingSiteModal } from '../components/modals/AddExistingSiteModal';
import { SimpleWordPressInstaller } from '../components/installer/SimpleWordPressInstaller';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { useUsage } from '../hooks/useUsage';
import { VPSSetupButton } from '../components/vps/VPSSetupButton';
import { SimpleVpsConfigModal } from '../components/vps/SimpleVpsConfigModal';
import { SimpleBlogCreatorModal } from '../components/blog/SimpleBlogCreatorModal';
import vpsService from '../services/vpsService';

export default function WordPressSites() {
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInstaller, setShowInstaller] = useState(false);
  const [showSimpleVpsConfig, setShowSimpleVpsConfig] = useState(false);
  const [showSimpleBlogCreator, setShowSimpleBlogCreator] = useState(false);
  const [hasConfiguredVPS, setHasConfiguredVPS] = useState(false);
  const [checkingVPS, setCheckingVPS] = useState(true);
  
  // Usage hook for limit checking
  const { 
    usage, 
    canAddBlog, 
    showUpgradePromptFor, 
    showUpgradePrompt, 
    upgradePromptType,
    handleUpgradePromptClose 
  } = useUsage();

  useEffect(() => {
    fetchSites();
    checkVPSStatus();
  }, []);

  const checkVPSStatus = async () => {
    try {
      const hasVPS = await vpsService.hasConfiguredVPS();
      setHasConfiguredVPS(hasVPS);
    } catch (error) {
      console.error('Error checking VPS status:', error);
    } finally {
      setCheckingVPS(false);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await api.get('/api/wordpress/sites');
      setSites(response.data.data || []);
    } catch (error) {
      toast.error('Erro ao carregar sites');
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSiteStatus = async (siteId: string) => {
    setRefreshing(true);
    try {
      await api.post(`/api/wordpress/sites/${siteId}/test`);
      toast.success('Status atualizado!');
      fetchSites();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSiteStatus = async (siteId: string) => {
    try {
      const site = sites.find(s => s._id === siteId);
      if (!site) return;
      
      await api.put(`/api/wordpress/sites/${siteId}`, {
        isActive: !site.isActive
      });
      toast.success('Status alterado!');
      fetchSites();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const createBackup = async (siteId: string) => {
    try {
      toast.loading('Criando backup...');
      // This would need to be implemented in the WordPress controller
      // For now, just show a message
      toast.dismiss();
      toast('Funcionalidade de backup será implementada em breve');
    } catch (error) {
      toast.error('Erro ao criar backup');
    }
  };

  const deleteSite = async (siteId: string, siteName: string) => {
    if (!confirm(`⚠️ Remover "${siteName}"?\n\nIsto apenas remove o site da sua lista no Tatame.\nO site continuará funcionando normalmente.\n\nDeseja continuar?`)) {
      return;
    }

    try {
      await api.delete(`/api/wordpress/sites/${siteId}`);
      toast.success('Site removido com sucesso!');
      fetchSites(); // Refresh the list
      setSelectedSite(null); // Close modal if open
    } catch (error: any) {
      console.error('Error deleting site:', error);
      toast.error('Erro ao remover site');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  // Check if user can add a blog before opening modals
  const handleAddExistingSite = () => {
    if (!canAddBlog()) {
      showUpgradePromptFor('blogs');
      return;
    }
    setShowAddModal(true);
  };

  const handleCreateNewSite = async () => {
    if (!canAddBlog()) {
      showUpgradePromptFor('blogs');
      return;
    }
    
    setShowSimpleBlogCreator(true);
  };

  const toggleCredentials = (siteId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  const getStatusIcon = (site: WordPressSite) => {
    if (!site.isActive) {
      return <Clock className="w-4 h-4 text-gray-500" />;
    }
    
    const connectionStatus = site.testConnection?.status;
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = (site: WordPressSite) => {
    if (!site.isActive) return 'Inativo';
    
    const connectionStatus = site.testConnection?.status;
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'failed':
        return 'Erro';
      case 'pending':
      default:
        return 'Verificando';
    }
  };

  const getStatusColor = (site: WordPressSite) => {
    if (!site.isActive) {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
    
    const connectionStatus = site.testConnection?.status;
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Sites</h1>
          <p className="text-gray-600">Gerencie todos os seus sites e blogs em um só lugar</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSites}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          
          {/* Simple VPS Config Button */}
          <button
            onClick={() => setShowSimpleVpsConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Server className="w-4 h-4" />
            Configurar Servidor
          </button>
          
          <button
            onClick={handleAddExistingSite}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Conectar um site WordPress que já existe"
          >
            <Plus className="w-4 h-4" />
            Conectar Site Existente
          </button>
          
          <button
            onClick={handleCreateNewSite}
            className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
            title="Criar um novo blog WordPress"
          >
            <Rocket className="w-4 h-4" />
            Criar Novo Blog
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum site encontrado</h3>
          <p className="text-gray-600 mb-6">
            Conecte um site existente ou crie um novo para começar
          </p>
          <div className="flex justify-center gap-4">
            {!hasConfiguredVPS && !checkingVPS && (
              <VPSSetupButton 
                className="inline-flex items-center gap-2 px-6 py-3"
                size="lg"
                variant="primary"
              >
                <Server className="w-5 h-5" />
                Configurar Servidor Primeiro
              </VPSSetupButton>
            )}
            
            {hasConfiguredVPS && (
              <>
                <button
                  onClick={handleAddExistingSite}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Conectar Site Existente
                </button>
                <button
                  onClick={handleCreateNewSite}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
                >
                  <Rocket className="w-5 h-5" />
                  Criar Novo Site
                </button>
              </>
            )}
            
            {checkingVPS && (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-600 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando servidor...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sites.map((site) => (
            <div key={site._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900 truncate">
                      {site.name}
                    </h3>
                    {site.siteType === 'managed' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                        Servidor
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(site)}`}>
                    {getStatusIcon(site)}
                    {getStatusText(site)}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="truncate">{site.url.replace(/^https?:\/\//, '')}</span>
                  {site.ipAddress && (
                    <span className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {site.ipAddress}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-coral">
                      {site.statistics?.postsPublished || 0}
                    </div>
                    <div className="text-xs text-gray-600">Posts Publicados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {site.testConnection?.status === 'connected' ? '✓' : site.testConnection?.status === 'failed' ? '✗' : '?'}
                    </div>
                    <div className="text-xs text-gray-600">Conexão</div>
                  </div>
                </div>
              </div>

              {/* WordPress Info */}
              <div className="p-4 border-b border-gray-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">WordPress:</span>
                    <span className="font-medium">{site.wordpressVersion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">PHP:</span>
                    <span className="font-medium">{site.phpVersion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tema Ativo:</span>
                    <span className="font-medium">{site.activeTheme?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Plugins:</span>
                    <span className="font-medium">
                      {site.installedPlugins?.filter(p => p.isActive).length || 0}/{site.installedPlugins?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Credenciais</span>
                  <button
                    onClick={() => toggleCredentials(site._id)}
                    className="text-coral hover:text-coral-dark transition-colors"
                  >
                    {showCredentials[site._id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {showCredentials[site._id] && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Usuário:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {site.username}
                        </code>
                        <button
                          onClick={() => copyToClipboard(site.username)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Senha:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          ••••••••••••
                        </code>
                        <span className="text-xs text-gray-500">
                          (Senha de Acesso)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Ver Site
                  </a>
                  <a
                    href={`${site.url}/wp-admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Painel
                  </a>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => createBackup(site._id)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Criar cópia de segurança do seu site"
                  >
                    <Download className="w-3 h-3" />
                    Backup
                  </button>
                  <button
                    onClick={() => refreshSiteStatus(site._id)}
                    disabled={refreshing}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
                    title="Verificar se o site está funcionando"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Status
                  </button>
                  <button
                    onClick={() => setSelectedSite(site)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-coral-50 text-coral rounded-lg hover:bg-coral-100 transition-colors"
                    title="Configurações avançadas do site"
                  >
                    <Settings className="w-3 h-3" />
                    Config
                  </button>
                  <button
                    onClick={() => deleteSite(site._id, site.name)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Remover site da lista (não exclui o site)"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remover
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Criado em {new Date(site.createdAt).toLocaleDateString()}</span>
                  <span>
                    Última verificação: {site.testConnection?.lastTest ? new Date(site.testConnection.lastTest).toLocaleDateString() : 'Nunca'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Site Management Modal */}
      {selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-6 h-6" />
                    {selectedSite.name}
                  </h2>
                  <p className="text-gray-600">Gerenciar site WordPress</p>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Site Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Status do Site
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${getStatusColor(selectedSite).split(' ')[0]}`}>
                        {getStatusText(selectedSite)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">
                        {selectedSite.siteType === 'managed' ? 'Servidor Próprio' : 'Site Externo'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Posts:</span>
                      <span className="font-medium">{selectedSite.statistics?.postsPublished || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Segurança
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Firewall:</span>
                      <span className={`font-medium ${selectedSite.security?.firewall ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedSite.security?.firewall ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issues:</span>
                      <span className={`font-medium ${(selectedSite.security?.issues || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedSite.security?.issues || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Último Scan:</span>
                      <span className="text-gray-600 text-sm">
                        {selectedSite.security?.lastScan ? new Date(selectedSite.security.lastScan).toLocaleDateString() : 'Nunca'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Performance
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Load Time:</span>
                      <span className="font-medium">{selectedSite.performance?.loadTime || 1.2}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plugins:</span>
                      <span className="font-medium">{selectedSite.plugins?.active || 0} ativos</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Updates:</span>
                      <span className={`font-medium ${(selectedSite.plugins?.needsUpdate || 0) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {selectedSite.plugins?.needsUpdate || 0} pendentes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => toggleSiteStatus(selectedSite._id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedSite.isActive 
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {selectedSite.isActive ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Desativar Site
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Ativar Site
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => createBackup(selectedSite._id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Criar Backup
                </button>
                
                <button
                  onClick={() => refreshSiteStatus(selectedSite._id)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar Status
                </button>
                
                <a
                  href={`${selectedSite.url}/wp-admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-coral-50 text-coral rounded-lg hover:bg-coral-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Painel
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Existing Site Modal */}
      <AddExistingSiteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSiteAdded={fetchSites}
      />

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
              <SimpleWordPressInstaller 
                onClose={() => {
                  setShowInstaller(false);
                  fetchSites(); // Refresh sites after installation
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Existing Site Modal */}
      <AddExistingSiteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSiteAdded={fetchSites}
      />

      {/* Simple VPS Config Modal */}
      <SimpleVpsConfigModal
        isOpen={showSimpleVpsConfig}
        onClose={() => setShowSimpleVpsConfig(false)}
        onSuccess={() => {
          setHasConfiguredVPS(true);
          fetchSites();
        }}
      />

      {/* Simple Blog Creator Modal */}
      <SimpleBlogCreatorModal
        isOpen={showSimpleBlogCreator}
        onClose={() => setShowSimpleBlogCreator(false)}
        onSuccess={() => {
          fetchSites();
        }}
      />

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={handleUpgradePromptClose}
        limitType={upgradePromptType}
        currentPlan={usage?.plan || 'starter'}
        used={usage?.usage?.blogs?.used || 0}
        limit={usage?.usage?.blogs?.limit || 1}
      />
    </div>
  );
}