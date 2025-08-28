import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Copy,
  Filter
} from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import toast from 'react-hot-toast';

interface WebhookEventLogProps {
  webhookId: string;
  onClose: () => void;
}

interface WebhookEvent {
  _id: string;
  eventType: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  attempts: number;
  payload: any;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  createdAt: string;
  lastAttemptAt: string;
  nextRetryAt?: string;
}

export default function WebhookEventLog({ webhookId, onClose }: WebhookEventLogProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Fetch events
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-events', webhookId, statusFilter, offset],
    queryFn: () => adminService.getWebhookEvents(webhookId, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit,
      offset
    })
  });

  // Retry failed events
  const retryMutation = useMutation({
    mutationFn: (eventIds?: string[]) => 
      adminService.retryWebhookEvents(webhookId, eventIds),
    onSuccess: (result) => {
      toast.success(`${result.retriedCount} eventos enviados para retry`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao reenviar eventos');
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'retrying':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'retrying':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-slate-700 text-slate-400';
    }
  };

  const copyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success('Payload copiado');
  };

  const events = data?.events || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-coral" />
              Logs de Eventos do Webhook
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Total de {total} eventos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setOffset(0);
                }}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-coral"
              >
                <option value="all">Todos</option>
                <option value="success">Sucesso</option>
                <option value="failed">Falha</option>
                <option value="pending">Pendente</option>
                <option value="retrying">Retry</option>
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {events.some(e => e.status === 'failed') && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="px-3 py-1 bg-coral text-white rounded text-sm hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {retryMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Reenviar Falhas
            </button>
          )}
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event: WebhookEvent) => (
                <div
                  key={event._id}
                  className="bg-slate-800 rounded-lg border border-slate-700"
                >
                  {/* Event Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    onClick={() => setExpandedEvent(
                      expandedEvent === event._id ? null : event._id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(event.status)}
                        <div>
                          <p className="text-white font-medium">
                            {event.eventType}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                            <span>
                              {new Date(event.createdAt).toLocaleString('pt-BR')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${getStatusColor(event.status)}`}>
                              {event.status}
                            </span>
                            {event.attempts > 1 && (
                              <span>
                                Tentativas: {event.attempts}
                              </span>
                            )}
                            {event.processingTimeMs && (
                              <span>
                                {event.processingTimeMs}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.responseCode && (
                          <span className={`text-sm px-2 py-1 rounded ${
                            event.responseCode >= 200 && event.responseCode < 300
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            HTTP {event.responseCode}
                          </span>
                        )}
                        {expandedEvent === event._id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  {expandedEvent === event._id && (
                    <div className="p-4 pt-0 space-y-4">
                      {/* Error Message */}
                      {event.errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                          <p className="text-sm text-red-400">
                            <strong>Erro:</strong> {event.errorMessage}
                          </p>
                        </div>
                      )}

                      {/* Next Retry */}
                      {event.nextRetryAt && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                          <p className="text-sm text-blue-400">
                            <strong>Próximo Retry:</strong> {new Date(event.nextRetryAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )}

                      {/* Payload */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-300">
                            Payload
                          </label>
                          <button
                            onClick={() => copyPayload(event.payload)}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copiar
                          </button>
                        </div>
                        <pre className="p-3 bg-slate-950 rounded text-xs text-slate-300 overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>

                      {/* Response */}
                      {event.responseBody && (
                        <div>
                          <label className="text-sm font-medium text-slate-300 block mb-2">
                            Response
                          </label>
                          <pre className="p-3 bg-slate-950 rounded text-xs text-slate-300 overflow-x-auto">
                            {event.responseBody}
                          </pre>
                        </div>
                      )}

                      {/* Actions */}
                      {event.status === 'failed' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => retryMutation.mutate([event._id])}
                            disabled={retryMutation.isPending}
                            className="px-3 py-1 bg-coral text-white rounded text-sm hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {retryMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Reenviar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum evento encontrado</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 bg-slate-800 text-white rounded text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 bg-slate-800 text-white rounded text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}