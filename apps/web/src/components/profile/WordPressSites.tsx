import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface WordPressSite {
  _id: string;
  name: string;
  url: string;
  username: string;
  isActive: boolean;
  isDefault: boolean;
  testConnection?: {
    lastTest?: string;
    status: 'connected' | 'failed' | 'pending';
    error?: string;
  };
  statistics?: {
    postsPublished: number;
    lastPublishedAt?: string;
  };
}

export default function WordPressSites() {
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<WordPressSite | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    applicationPassword: '',
    isDefault: false
  });

  const queryClient = useQueryClient();

  // Fetch WordPress sites
  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ['wordpress-sites'],
    queryFn: async () => {
      console.log('Fetching WordPress sites...');
      try {
        const response = await api.get('/wordpress/sites');
        console.log('WordPress sites response:', response.data);
        return response.data.data;
      } catch (err) {
        console.error('Error fetching WordPress sites:', err);
        throw err;
      }
    }
  });

  // Add/Update site mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSite) {
        const response = await api.put(`/wordpress/sites/${editingSite._id}`, data);
        return response.data;
      } else {
        const response = await api.post('/wordpress/sites', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites'] });
      toast.success(editingSite ? 'Site atualizado com sucesso' : 'Site adicionado com sucesso');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar site');
    }
  });

  // Delete site mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/wordpress/sites/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites'] });
      toast.success('Site excluído com sucesso');
    }
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/wordpress/sites/${id}/test`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites'] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error('Falha no teste de conexão');
    }
  });

  // Set default site mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/wordpress/sites/${id}/set-default`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites'] });
      toast.success('Site padrão atualizado');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      username: '',
      applicationPassword: '',
      isDefault: false
    });
    setEditingSite(null);
    setShowForm(false);
    setShowPassword(false);
  };

  const handleEdit = (site: WordPressSite) => {
    setFormData({
      name: site.name,
      url: site.url,
      username: site.username,
      applicationPassword: '',
      isDefault: site.isDefault
    });
    setEditingSite(site);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only send password if it's been changed
    const dataToSend = { ...formData };
    if (editingSite && !formData.applicationPassword) {
      delete dataToSend.applicationPassword;
    }
    
    saveMutation.mutate(dataToSend);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Sites WordPress</h3>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie seus sites WordPress para publicação de conteúdo
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Site
        </button>
      </div>

      {/* Sites List */}
      <div className="grid gap-4">
        {sites.map((site: WordPressSite) => (
          <div
            key={site._id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-white">{site.name}</h4>
                  {site.isDefault && (
                    <span className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded">
                      <Star className="w-3 h-3" />
                      Padrão
                    </span>
                  )}
                  {site.testConnection?.status === 'connected' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {site.testConnection?.status === 'failed' && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Globe className="w-3 h-3" />
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-coral transition-colors flex items-center gap-1"
                  >
                    {site.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {site.statistics && site.statistics.postsPublished > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    {site.statistics.postsPublished} posts publicados
                    {site.statistics.lastPublishedAt && (
                      <span> • Último: {new Date(site.statistics.lastPublishedAt).toLocaleDateString('pt-BR')}</span>
                    )}
                  </p>
                )}

                {site.testConnection?.status === 'failed' && site.testConnection.error && (
                  <div className="mt-2 text-xs text-red-400 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5" />
                    {site.testConnection.error}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!site.isDefault && (
                  <button
                    onClick={() => setDefaultMutation.mutate(site._id)}
                    className="p-2 text-slate-400 hover:text-yellow-500 transition-colors"
                    title="Definir como padrão"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => testMutation.mutate(site._id)}
                  disabled={testMutation.isPending}
                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Testar conexão"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(site)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este site?')) {
                      deleteMutation.mutate(site._id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {sites.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum site WordPress configurado</p>
            <p className="text-sm mt-1">Adicione um site para começar a publicar conteúdo</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 rounded-lg w-full max-w-lg border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-semibold text-white">
                {editingSite ? 'Editar Site WordPress' : 'Adicionar Site WordPress'}
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Site *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Meu Site WordPress"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL do Site *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="https://meusite.com.br"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome de Usuário *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="admin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Senha de Aplicação * {editingSite && '(deixe em branco para manter a atual)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.applicationPassword}
                    onChange={(e) => setFormData({ ...formData, applicationPassword: e.target.value })}
                    className="w-full p-3 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    required={!editingSite}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gerar no WordPress: Usuários → Seu Perfil → Senhas de Aplicação
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                />
                <span className="text-sm text-slate-300">Definir como site padrão para publicação</span>
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSite ? 'Atualizar' : 'Adicionar'} Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}