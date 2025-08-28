import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  TestTube,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import toast from 'react-hot-toast';
import WebhookForm from './WebhookForm';
import WebhookEventLog from './WebhookEventLog';

interface Webhook {
  _id: string;
  name: string;
  description?: string;
  provider: 'kiwify' | 'stripe' | 'paypal' | 'custom';
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt?: string;
  successCount: number;
  failureCount: number;
  recentEventsCount?: number;
  failedEventsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function WebhookSettings() {
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch webhooks
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['admin-webhooks'],
    queryFn: () => adminService.getWebhooks()
  });

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
      toast.success('Webhook excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir webhook');
    }
  });

  // Toggle webhook status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminService.updateWebhook(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
      toast.success('Status do webhook atualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });

  // Test webhook
  const handleTestWebhook = async (webhook: Webhook) => {
    setTestingWebhook(webhook._id);
    try {
      const result = await adminService.testWebhook(webhook._id);
      if (result.success) {
        toast.success('Webhook de teste enviado com sucesso!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao testar webhook');
    } finally {
      setTestingWebhook(null);
    }
  };

  // Copy webhook URL
  const copyWebhookUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('URL copiada para a área de transferência');
  };

  // Get provider color
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'kiwify':
        return 'bg-green-500';
      case 'stripe':
        return 'bg-purple-500';
      case 'paypal':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (webhook: Webhook) => {
    if (!webhook.isActive) {
      return <XCircle className="w-5 h-5 text-slate-500" />;
    }
    if (webhook.failedEventsCount && webhook.failedEventsCount > 0) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
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
              <Webhook className="w-5 h-5 text-coral" />
              Gerenciamento de Webhooks
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure e monitore webhooks para integrações externas
            </p>
          </div>
          <button
            onClick={() => {
              setEditingWebhook(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Webhook
          </button>
        </div>

        {/* Webhook List */}
        <div className="space-y-4">
          {webhooks && webhooks.length > 0 ? (
            webhooks.map((webhook: Webhook) => (
              <div
                key={webhook._id}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${getProviderColor(webhook.provider)}`} />
                      <h3 className="text-white font-medium">{webhook.name}</h3>
                      {getStatusIcon(webhook)}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        webhook.isActive 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {webhook.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* Description */}
                    {webhook.description && (
                      <p className="text-sm text-slate-400 mb-2">{webhook.description}</p>
                    )}

                    {/* URL */}
                    <div className="flex items-center gap-2 mb-3">
                      <code className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-300">
                        {webhook.url}
                      </code>
                      <button
                        onClick={() => copyWebhookUrl(webhook.url)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Provider:</span>
                        <span className="text-slate-300 ml-2 capitalize">{webhook.provider}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Eventos:</span>
                        <span className="text-slate-300 ml-2">{webhook.events.length} tipos</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Sucesso:</span>
                        <span className="text-green-500 ml-2">{webhook.successCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Falhas:</span>
                        <span className="text-red-500 ml-2">{webhook.failureCount}</span>
                      </div>
                    </div>

                    {/* Last triggered */}
                    {webhook.lastTriggeredAt && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        Último evento: {new Date(webhook.lastTriggeredAt).toLocaleString('pt-BR')}
                      </div>
                    )}

                    {/* Recent activity */}
                    {webhook.recentEventsCount !== undefined && (
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Activity className="w-3 h-3" />
                          {webhook.recentEventsCount} eventos (24h)
                        </span>
                        {webhook.failedEventsCount !== undefined && webhook.failedEventsCount > 0 && (
                          <span className="flex items-center gap-1 text-yellow-500">
                            <AlertCircle className="w-3 h-3" />
                            {webhook.failedEventsCount} falhas pendentes
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ 
                        id: webhook._id, 
                        isActive: !webhook.isActive 
                      })}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title={webhook.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {webhook.isActive ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingWebhook(webhook);
                        setShowForm(true);
                      }}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTestWebhook(webhook)}
                      disabled={testingWebhook === webhook._id}
                      className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                      title="Testar"
                    >
                      {testingWebhook === webhook._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowEvents(webhook._id)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title="Ver logs"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este webhook?')) {
                          deleteMutation.mutate(webhook._id);
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
            ))
          ) : (
            <div className="text-center py-12">
              <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum webhook configurado</p>
              <p className="text-sm text-slate-500 mt-1">
                Clique em "Adicionar Webhook" para começar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Form Modal */}
      {showForm && (
        <WebhookForm
          webhook={editingWebhook}
          onClose={() => {
            setShowForm(false);
            setEditingWebhook(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingWebhook(null);
            queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
          }}
        />
      )}

      {/* Event Log Modal */}
      {showEvents && (
        <WebhookEventLog
          webhookId={showEvents}
          onClose={() => setShowEvents(null)}
        />
      )}
    </div>
  );
}