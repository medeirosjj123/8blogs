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
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({ job, className = '' }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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
        return 'bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
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
    <div className={`bg-white border ${getStatusColor()} rounded-xl p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900">{getStatusText()}</h3>
            <p className="text-sm text-gray-500">
              {job.progress.total} review{job.progress.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>Iniciado: {formatTime(job.queuedAt)}</div>
          {job.startedAt && (
            <div>
              Duração: {formatDuration(job.startedAt, job.completedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {job.status === 'processing' || job.status === 'completed' ? (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {job.progress.current} de {job.progress.total} reviews
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(job.progress.percentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${job.progress.percentage}%` }}
            />
          </div>
          {job.currentStep && (
            <p className="text-sm text-gray-600 mt-2 flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-blue-500" />
              {job.currentStep}
            </p>
          )}
        </div>
      ) : null}

      {/* Results Summary */}
      {job.status === 'completed' && job.results.stats.totalReviews > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-lg font-bold text-green-700">
              {job.results.stats.successfulReviews}
            </div>
            <div className="text-sm text-green-600">Sucessos</div>
          </div>
          {job.results.stats.failedReviews > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-lg font-bold text-red-700">
                {job.results.stats.failedReviews}
              </div>
              <div className="text-sm text-red-600">Falhas</div>
            </div>
          )}
        </div>
      )}

      {/* Completed Reviews List */}
      {job.results.completed.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 text-sm mb-2">
            Reviews Geradas ({job.results.completed.length})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {job.results.completed.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                  result.status === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span className="truncate max-w-xs">{result.title}</span>
                </div>
                {result.status === 'success' && result.wordpressUrl && (
                  <a
                    href={result.wordpressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800 font-medium">Erro:</p>
          <p className="text-sm text-red-700">{job.error.message}</p>
        </div>
      )}

      {/* Stats for completed jobs */}
      {job.status === 'completed' && job.results.stats.totalCost > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {job.results.stats.totalTokensUsed.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Tokens</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                ${job.results.stats.totalCost.toFixed(4)}
              </div>
              <div className="text-xs text-gray-500">Custo</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {Math.round(job.results.stats.totalGenerationTime / 1000)}s
              </div>
              <div className="text-xs text-gray-500">Tempo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};