import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  X,
  Save,
  Loader2,
  Info,
  Key,
  Globe,
  List,
  RefreshCw
} from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import toast from 'react-hot-toast';

interface WebhookFormProps {
  webhook?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDER_EVENTS = {
  kiwify: [
    { value: 'pedido_aprovado', label: 'Pedido Aprovado' },
    { value: 'pedido_pago', label: 'Pedido Pago' },
    { value: 'pedido_cancelado', label: 'Pedido Cancelado' },
    { value: 'pedido_reembolsado', label: 'Pedido Reembolsado' },
    { value: 'chargeback', label: 'Chargeback' },
    { value: 'assinatura_renovada', label: 'Assinatura Renovada' },
    { value: 'assinatura_cancelada', label: 'Assinatura Cancelada' }
  ],
  stripe: [
    { value: 'payment_intent.succeeded', label: 'Pagamento Bem-sucedido' },
    { value: 'payment_intent.failed', label: 'Pagamento Falhou' },
    { value: 'customer.subscription.created', label: 'Assinatura Criada' },
    { value: 'customer.subscription.deleted', label: 'Assinatura Cancelada' },
    { value: 'charge.dispute.created', label: 'Disputa Criada' }
  ],
  paypal: [
    { value: 'PAYMENT.SALE.COMPLETED', label: 'Venda Completa' },
    { value: 'PAYMENT.SALE.REFUNDED', label: 'Venda Reembolsada' },
    { value: 'BILLING.SUBSCRIPTION.CREATED', label: 'Assinatura Criada' },
    { value: 'BILLING.SUBSCRIPTION.CANCELLED', label: 'Assinatura Cancelada' }
  ],
  custom: [
    { value: '*', label: 'Todos os Eventos' }
  ]
};

export default function WebhookForm({ webhook, onClose, onSuccess }: WebhookFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'kiwify' as 'kiwify' | 'stripe' | 'paypal' | 'custom',
    url: '',
    secret: '',
    events: [] as string[],
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000
    }
  });

  const [showSecret, setShowSecret] = useState(false);
  const [generateSecret, setGenerateSecret] = useState(!webhook);

  useEffect(() => {
    if (webhook) {
      setFormData({
        name: webhook.name,
        description: webhook.description || '',
        provider: webhook.provider,
        url: webhook.url,
        secret: '',
        events: webhook.events || [],
        retryPolicy: webhook.retryPolicy || {
          maxRetries: 3,
          backoffMs: 1000
        }
      });
    }
  }, [webhook]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (webhook) {
        return adminService.updateWebhook(webhook._id, data);
      }
      return adminService.createWebhook(data);
    },
    onSuccess: (response) => {
      toast.success(webhook ? 'Webhook atualizado' : 'Webhook criado');
      
      // Show secret if it's a new webhook
      if (!webhook && response.data?.secret) {
        navigator.clipboard.writeText(response.data.secret);
        toast.success('Secret copiado para a área de transferência', {
          duration: 5000,
          icon: '🔐'
        });
      }
      
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar webhook');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.events.length === 0) {
      toast.error('Selecione pelo menos um evento');
      return;
    }

    const dataToSave = {
      ...formData,
      secret: generateSecret ? undefined : formData.secret
    };

    saveMutation.mutate(dataToSave);
  };

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const selectAllEvents = () => {
    const allEvents = PROVIDER_EVENTS[formData.provider].map(e => e.value);
    setFormData(prev => ({ ...prev, events: allEvents }));
  };

  const clearAllEvents = () => {
    setFormData(prev => ({ ...prev, events: [] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white">
            {webhook ? 'Editar Webhook' : 'Novo Webhook'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome do Webhook *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
              placeholder="Ex: Kiwify Production"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
              placeholder="Descrição do webhook (opcional)"
              rows={2}
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ 
                ...formData, 
                provider: e.target.value as any,
                events: [] // Reset events when provider changes
              })}
              disabled={!!webhook}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
            >
              <option value="kiwify">Kiwify</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URL do Endpoint *
            </label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              disabled={!!webhook}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
              placeholder="/api/webhooks/kiwify"
            />
            {!webhook && (
              <p className="text-xs text-slate-500 mt-1">
                URL completa: {window.location.origin}{formData.url || '/api/webhooks/...'}
              </p>
            )}
          </div>

          {/* Secret */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Secret Key
            </label>
            {!webhook ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generateSecret}
                    onChange={(e) => setGenerateSecret(e.target.checked)}
                    className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">
                    Gerar secret automaticamente (recomendado)
                  </span>
                </label>
                {!generateSecret && (
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Digite um secret personalizado"
                  />
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg">
                <p className="text-sm text-slate-400">
                  <Info className="w-4 h-4 inline mr-1" />
                  O secret não pode ser visualizado após a criação
                </p>
              </div>
            )}
          </div>

          {/* Events */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <List className="w-4 h-4 inline mr-1" />
              Eventos para Escutar *
            </label>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-slate-500">
                Selecione os eventos que deseja receber
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllEvents}
                  className="text-xs text-coral hover:text-coral-dark"
                >
                  Selecionar todos
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={clearAllEvents}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-800 p-3 rounded-lg border border-slate-700">
              {PROVIDER_EVENTS[formData.provider].map(event => (
                <label key={event.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.value)}
                    onChange={() => handleEventToggle(event.value)}
                    className="w-4 h-4 text-coral bg-slate-700 border-slate-600 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">{event.label}</span>
                  <code className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-500">
                    {event.value}
                  </code>
                </label>
              ))}
            </div>
          </div>

          {/* Retry Policy */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Política de Retry
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Máximo de Tentativas
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.retryPolicy.maxRetries}
                  onChange={(e) => setFormData({
                    ...formData,
                    retryPolicy: {
                      ...formData.retryPolicy,
                      maxRetries: parseInt(e.target.value)
                    }
                  })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Delay Base (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  max="60000"
                  step="100"
                  value={formData.retryPolicy.backoffMs}
                  onChange={(e) => setFormData({
                    ...formData,
                    retryPolicy: {
                      ...formData.retryPolicy,
                      backoffMs: parseInt(e.target.value)
                    }
                  })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {webhook ? 'Atualizar' : 'Criar'} Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}