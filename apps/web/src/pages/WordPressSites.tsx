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
  Terminal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

interface WordPressSite {
  _id: string;
  domain: string;
  ipAddress: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  sslStatus: 'active' | 'pending' | 'failed' | 'none';
  lastCheck: Date;
  wordpressVersion: string;
  phpVersion: string;
  themes: {
    active: string;
    total: number;
  };
  plugins: {
    active: number;
    total: number;
    needsUpdate: number;
  };
  credentials: {
    username: string;
    password: string;
  };
  backups: {
    last: Date;
    count: number;
  };
  performance: {
    loadTime: number;
    uptime: number;
  };
  security: {
    lastScan: Date;
    issues: number;
    firewall: boolean;
  };
  createdAt: Date;
}

export default function WordPressSites() {
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites');
      setSites(response.data.sites || []);
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
      await api.post(`/sites/${siteId}/refresh-status`);
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
      await api.post(`/sites/${siteId}/toggle-status`);
      toast.success('Status alterado!');
      fetchSites();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const createBackup = async (siteId: string) => {
    try {
      toast.loading('Criando backup...');
      await api.post(`/sites/${siteId}/backup`);
      toast.success('Backup criado com sucesso!');
      fetchSites();
    } catch (error) {
      toast.error('Erro ao criar backup');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const toggleCredentials = (siteId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'maintenance':
        return <Settings className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'inactive':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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
          <h1 className="text-2xl font-bold text-gray-900">Meus Sites WordPress</h1>
          <p className="text-gray-600">Gerencie todos os seus sites WordPress em um só lugar</p>
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
          <Link
            to="/ferramentas"
            className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Site
          </Link>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum site encontrado</h3>
          <p className="text-gray-600 mb-6">
            Crie seu primeiro site WordPress para começar
          </p>
          <Link
            to="/ferramentas"
            className="inline-flex items-center gap-2 px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Site
          </Link>
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
                      {site.domain}
                    </h3>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(site.status)}`}>
                    {getStatusIcon(site.status)}
                    {site.status}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>IP: {site.ipAddress}</span>
                  <span className="flex items-center gap-1">
                    {site.sslStatus === 'active' ? (
                      <Lock className="w-3 h-3 text-green-500" />
                    ) : (
                      <Unlock className="w-3 h-3 text-gray-400" />
                    )}
                    SSL
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-coral">{site.performance?.uptime || 99}%</div>
                    <div className="text-xs text-gray-600">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{site.performance?.loadTime || 1.2}s</div>
                    <div className="text-xs text-gray-600">Load Time</div>
                  </div>
                </div>
              </div>

              {/* WordPress Info */}
              <div className="p-4 border-b border-gray-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">WordPress:</span>
                    <span className="font-medium">{site.wordpressVersion || '6.4'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">PHP:</span>
                    <span className="font-medium">{site.phpVersion || '8.2'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tema Ativo:</span>
                    <span className="font-medium">{site.themes?.active || 'Twenty Twenty-Four'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Plugins:</span>
                    <span className="font-medium">
                      {site.plugins?.active || 0}/{site.plugins?.total || 0}
                      {(site.plugins?.needsUpdate || 0) > 0 && (
                        <span className="ml-1 text-yellow-600">({site.plugins?.needsUpdate} updates)</span>
                      )}
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
                          {site.credentials?.username || 'admin'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(site.credentials?.username || 'admin')}
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
                          {site.credentials?.password || '••••••••'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(site.credentials?.password || '')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`http://${site.ipAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Ver Site
                  </a>
                  <a
                    href={`http://${site.ipAddress}/wp-admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => createBackup(site._id)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Backup
                  </button>
                  <button
                    onClick={() => refreshSiteStatus(site._id)}
                    disabled={refreshing}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                  <button
                    onClick={() => setSelectedSite(site)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs bg-coral-50 text-coral rounded-lg hover:bg-coral-100 transition-colors"
                  >
                    <Terminal className="w-3 h-3" />
                    Manage
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Criado em {new Date(site.createdAt).toLocaleDateString()}</span>
                  <span>
                    Última verificação: {site.lastCheck ? new Date(site.lastCheck).toLocaleDateString() : 'Nunca'}
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
                    {selectedSite.domain}
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
                      <span className={`font-medium ${getStatusColor(selectedSite.status)}`}>
                        {selectedSite.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SSL:</span>
                      <span className={`font-medium ${selectedSite.sslStatus === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                        {selectedSite.sslStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium">{selectedSite.performance?.uptime || 99}%</span>
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
                    selectedSite.status === 'active' 
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {selectedSite.status === 'active' ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Colocar em Manutenção
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
                  href={`http://${selectedSite.ipAddress}/wp-admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-coral-50 text-coral rounded-lg hover:bg-coral-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}