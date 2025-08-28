import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Activity
} from 'lucide-react';
import api from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContentStats {
  totalGenerated: number;
  totalTokens: number;
  totalCost: number;
  averageTime: number;
  byType: {
    bbr: { count: number; tokens: number; cost: number };
    spr: { count: number; tokens: number; cost: number };
    informational: { count: number; tokens: number; cost: number };
  };
  recentContent: Array<{
    _id: string;
    title: string;
    contentType: string;
    metadata: {
      tokensUsed: { total: number };
      cost: number;
      generationTime: number;
      provider: string;
      model: string;
    };
    createdAt: string;
    userId: {
      name: string;
      email: string;
    };
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
    tokens: number;
    cost: number;
  }>;
}

export const ContentAnalytics: React.FC = () => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days

  // Fetch analytics data
  const { data: stats, isLoading } = useQuery<ContentStats>({
    queryKey: ['content-analytics', dateRange],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/content?days=${dateRange}`);
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    bbr: 'BBR (Comparação)',
    spr: 'SPR (Único)',
    informational: 'Informacional'
  };

  const typeColors: Record<string, string> = {
    bbr: 'bg-blue-500',
    spr: 'bg-green-500',
    informational: 'bg-purple-500'
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics de Geração de Conteúdo</h1>
        <p className="text-slate-400">Acompanhe o uso e custos da geração de conteúdo com IA</p>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-slate-400">Total</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalGenerated || 0}</div>
          <div className="text-sm text-slate-400">Conteúdos gerados</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-xs text-slate-400">Tokens</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {((stats?.totalTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-sm text-slate-400">Tokens utilizados</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-slate-400">Custo</span>
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {((stats?.totalCost || 0) * 6).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">Custo total</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-slate-400">Tempo</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {(stats?.averageTime || 0).toFixed(1)}s
          </div>
          <div className="text-sm text-slate-400">Tempo médio</div>
        </div>
      </div>

      {/* Content Types Breakdown */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Por Tipo de Conteúdo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats?.byType || {}).map(([type, data]) => (
            <div key={type} className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${typeColors[type]}`} />
                <span className="font-medium text-white">{typeLabels[type]}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantidade:</span>
                  <span className="text-white">{data.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tokens:</span>
                  <span className="text-white">{(data.tokens / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custo:</span>
                  <span className="text-white">R$ {(data.cost * 6).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Content Table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Conteúdos Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Custo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {stats?.recentContent.map((content) => (
                <React.Fragment key={content._id}>
                  <tr className="hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === content._id ? null : content._id)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white truncate max-w-xs">
                        {content.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        content.contentType === 'bbr' ? 'bg-blue-500/20 text-blue-400' :
                        content.contentType === 'spr' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {typeLabels[content.contentType]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{content.userId.name}</div>
                      <div className="text-xs text-slate-500">{content.userId.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {(content.metadata.tokensUsed.total / 1000).toFixed(1)}k
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      R$ {(content.metadata.cost * 6).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {content.metadata.generationTime.toFixed(1)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {format(new Date(content.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expandedRow === content._id ? 
                        <ChevronUp className="w-4 h-4 text-slate-400" /> : 
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </td>
                  </tr>
                  {expandedRow === content._id && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-slate-900/50">
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-4">
                            <span className="text-slate-400">Provider:</span>
                            <span className="text-white">{content.metadata.provider}</span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-slate-400">Model:</span>
                            <span className="text-white">{content.metadata.model}</span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-slate-500 font-mono">{content._id}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};