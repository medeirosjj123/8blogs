import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Sparkles,
  ExternalLink 
} from 'lucide-react';

interface JobProgressCardProps {
  job: {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: {
      current: number;
      total: number;
      percentage: number;
    };
    currentStep?: string;
    results: {
      completed: Array<{
        reviewId?: string;
        title: string;
        status: 'success' | 'failed';
        error?: string;
        wordpressUrl?: string;
        generatedAt: string;
      }>;
      stats: {
        totalReviews: number;
        successfulReviews: number;
        failedReviews: number;
        totalTokensUsed: number;
        totalCost: number;
        totalGenerationTime: number;
      };
    };
    error?: {
      message: string;
      code?: string;
      stack?: string;
    };
    queuedAt: string;
    startedAt?: string;
    completedAt?: string;
  };
  className?: string;
  hideCompletionDetails?: boolean;
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({ job, className = '', hideCompletionDetails = false }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return <Clock className="w-5 h-5 text-bloghouse-accent-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-bloghouse-primary-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-bloghouse-secondary-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-bloghouse-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'queued':
        return 'Na Fila';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'queued':
        return 'bg-bloghouse-accent-50 border-bloghouse-accent-200';
      case 'processing':
        return 'bg-bloghouse-primary-50 border-bloghouse-primary-200 bloghouse-glow';
      case 'completed':
        return 'bg-bloghouse-secondary-50 border-bloghouse-secondary-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-bloghouse-gray-50 border-bloghouse-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`bg-white border ${getStatusColor()} rounded-2xl p-8 shadow-medium transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-2 rounded-2xl bg-gradient-to-br from-white to-transparent backdrop-blur-sm border border-white/20">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-bloghouse-gray-900 text-lg">{getStatusText()}</h3>
            <p className="text-sm text-bloghouse-gray-600 font-medium">
              {job.progress.total} review{job.progress.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-bloghouse-gray-600">
          <div className="font-medium">Iniciado: {formatTime(job.queuedAt)}</div>
          {job.startedAt && (
            <div className="text-bloghouse-primary-500 font-semibold">
              Duração: {formatDuration(job.startedAt, job.completedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {job.status === 'processing' || job.status === 'completed' ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-bloghouse-gray-700">
              {job.progress.current} de {job.progress.total} reviews
            </span>
            <div className="px-3 py-1 rounded-2xl bg-gradient-primary text-white text-sm font-bold shadow-glow">
              {Math.round(job.progress.percentage)}%
            </div>
          </div>
          <div className="relative w-full bg-bloghouse-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                job.status === 'completed' 
                  ? 'gradient-secondary shadow-glow' 
                  : 'gradient-primary bloghouse-glow'
              }`}
              style={{ width: `${job.progress.percentage}%` }}
            />
            {job.status === 'processing' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
          {job.currentStep && (
            <p className="text-sm text-bloghouse-primary-600 mt-3 flex items-center font-medium">
              <Sparkles className="w-4 h-4 mr-2 text-bloghouse-primary-500 animate-pulse" />
              {job.currentStep}
            </p>
          )}
        </div>
      ) : null}

      {/* Results Summary */}
      {job.status === 'completed' && job.results.stats.totalReviews > 0 && !hideCompletionDetails && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-secondary rounded-2xl p-4 shadow-soft border border-bloghouse-secondary-100">
            <div className="text-2xl font-bold text-white mb-1">
              {job.results.stats.successfulReviews}
            </div>
            <div className="text-sm text-white/80 font-medium">Sucessos</div>
          </div>
          {job.results.stats.failedReviews > 0 && (
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-soft border border-red-200">
              <div className="text-2xl font-bold text-white mb-1">
                {job.results.stats.failedReviews}
              </div>
              <div className="text-sm text-white/80 font-medium">Falhas</div>
            </div>
          )}
        </div>
      )}

      {/* Completed Reviews List */}
      {job.results.completed.length > 0 && !hideCompletionDetails && (
        <div className="space-y-3">
          <h4 className="font-semibold text-bloghouse-gray-900 text-sm mb-3">
            Reviews Geradas ({job.results.completed.length})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
            {job.results.completed.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-2xl text-sm transition-all duration-200 hover:scale-[1.02] ${
                  result.status === 'success'
                    ? 'bg-gradient-to-r from-bloghouse-secondary-50 to-bloghouse-secondary-100 text-bloghouse-secondary-800 border border-bloghouse-secondary-200'
                    : 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border border-red-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1 rounded-full bg-white/50">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-bloghouse-secondary-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <span className="truncate max-w-xs font-medium">{result.title}</span>
                </div>
                {result.status === 'success' && result.wordpressUrl && (
                  <a
                    href={result.wordpressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-bloghouse-primary-600 hover:text-bloghouse-primary-700 p-1 rounded-xl hover:bg-white/50 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {job.status === 'failed' && job.error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-4 shadow-soft">
          <p className="text-sm text-red-800 font-semibold mb-1">Erro:</p>
          <p className="text-sm text-red-700 font-medium">{job.error.message}</p>
        </div>
      )}

      {/* Stats for completed jobs */}
      {job.status === 'completed' && job.results.stats.totalCost > 0 && !hideCompletionDetails && (
        <div className="mt-6 pt-6 border-t border-bloghouse-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-bloghouse-primary-50 to-bloghouse-primary-100 rounded-2xl border border-bloghouse-primary-200">
              <div className="text-lg font-bold text-bloghouse-primary-700">
                {job.results.stats.totalTokensUsed.toLocaleString()}
              </div>
              <div className="text-xs text-bloghouse-primary-600 font-medium">Tokens</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-bloghouse-secondary-50 to-bloghouse-secondary-100 rounded-2xl border border-bloghouse-secondary-200">
              <div className="text-lg font-bold text-bloghouse-secondary-700">
                ${job.results.stats.totalCost.toFixed(4)}
              </div>
              <div className="text-xs text-bloghouse-secondary-600 font-medium">Custo</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-bloghouse-accent-50 to-bloghouse-accent-100 rounded-2xl border border-bloghouse-accent-200">
              <div className="text-lg font-bold text-bloghouse-accent-700">
                {Math.round(job.results.stats.totalGenerationTime / 1000)}s
              </div>
              <div className="text-xs text-bloghouse-accent-600 font-medium">Tempo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};