import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Eye, Clock, Globe } from 'lucide-react';

interface BlogMetricsProps {
  blogId: string;
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
  isLoading?: boolean;
}

export const BlogMetrics: React.FC<BlogMetricsProps> = ({ 
  blogId, 
  metrics, 
  isLoading = false 
}) => {
  const [animatedRealtimeUsers, setAnimatedRealtimeUsers] = useState(0);
  const [animatedTodayViews, setAnimatedTodayViews] = useState(0);

  // Animate numbers when metrics change
  useEffect(() => {
    if (!metrics) return;

    // Animate realtime users
    let realtimeCount = 0;
    const realtimeTarget = metrics.realtimeUsers || 0;
    const realtimeInterval = setInterval(() => {
      if (realtimeCount < realtimeTarget) {
        realtimeCount++;
        setAnimatedRealtimeUsers(realtimeCount);
      } else {
        clearInterval(realtimeInterval);
      }
    }, 50);

    // Animate today views
    let todayCount = 0;
    const todayTarget = metrics.todayViews || 0;
    const todayStep = Math.ceil(todayTarget / 30);
    const todayInterval = setInterval(() => {
      if (todayCount < todayTarget) {
        todayCount = Math.min(todayCount + todayStep, todayTarget);
        setAnimatedTodayViews(todayCount);
      } else {
        clearInterval(todayInterval);
      }
    }, 30);

    return () => {
      clearInterval(realtimeInterval);
      clearInterval(todayInterval);
    };
  }, [metrics]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getGrowthTrend = (rate?: number) => {
    if (!rate) return { icon: null, color: 'text-gray-400', text: 'Sem dados' };
    if (rate > 0) return { 
      icon: <TrendingUp className="w-4 h-4" />, 
      color: 'text-green-600', 
      text: `+${rate}%` 
    };
    if (rate < 0) return { 
      icon: <TrendingDown className="w-4 h-4" />, 
      color: 'text-red-600', 
      text: `${rate}%` 
    };
    return { icon: null, color: 'text-gray-400', text: '0%' };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-200 h-16 rounded-lg"></div>
            <div className="bg-gray-200 h-16 rounded-lg"></div>
          </div>
          <div className="bg-gray-200 h-8 rounded mb-2"></div>
          <div className="bg-gray-200 h-6 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Show nice placeholder when GA is connected but no real data yet
  if (!metrics) {
    return (
      <div className="space-y-4">
        {/* Connected Status with nice placeholder */}
        <div className="text-center py-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">Google Analytics Conectado</span>
          </div>
          <p className="text-xs text-blue-600 mb-3">Preparando dados em tempo real...</p>
          
          {/* Nice preview cards showing what's coming */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm">
              <Users className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <div className="text-xs text-gray-600">Visitantes Online</div>
              <div className="text-sm font-semibold text-gray-400">Em breve</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm">
              <Eye className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-xs text-gray-600">Visualizações Hoje</div>
              <div className="text-sm font-semibold text-gray-400">Em breve</div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-500">
              💡 Em breve você verá estatísticas em tempo real aqui
            </p>
          </div>
        </div>
      </div>
    );
  }

  const growthTrend = getGrowthTrend(metrics.growthRate);

  return (
    <div className="space-y-4">
      {/* Real-time Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Live Visitors */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Online Agora</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="text-3xl font-bold text-green-900 mb-1">
            {animatedRealtimeUsers}
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Users className="w-3 h-3" />
            visitantes ativos
          </div>
        </div>

        {/* Today's Views */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Hoje</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-900 mb-1">
            {animatedTodayViews.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            {growthTrend.icon}
            <span className={growthTrend.color}>{growthTrend.text}</span>
            vs. ontem
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-purple-700">Esta Semana</span>
          <TrendingUp className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-purple-900 mb-2">
          {metrics.weekViews?.toLocaleString() || 0}
        </div>
        
        {/* Simple progress bar showing week progress */}
        <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${Math.min(100, ((metrics.todayViews || 0) / (metrics.weekViews || 1)) * 100)}%` }}
          />
        </div>
        <span className="text-xs text-purple-600">visualizações totais</span>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Tempo Médio</span>
          </div>
          <div className="font-bold text-gray-900">
            {formatDuration(metrics.averageSessionDuration || 0)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Taxa de Rejeição</span>
          </div>
          <div className="font-bold text-gray-900">
            {Math.round(metrics.bounceRate || 0)}%
          </div>
        </div>
      </div>

      {/* Top Content */}
      {(metrics.topPost || metrics.topSource) && (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-orange-900 mb-3">🏆 Destaques</h4>
          <div className="space-y-2">
            {metrics.topPost && (
              <div>
                <span className="text-xs text-orange-600 font-medium">Post mais visitado:</span>
                <p className="text-sm font-medium text-orange-900 truncate">{metrics.topPost}</p>
              </div>
            )}
            {metrics.topSource && (
              <div>
                <span className="text-xs text-orange-600 font-medium">Principal fonte:</span>
                <p className="text-sm font-medium text-orange-900">{metrics.topSource}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      <div className="text-center py-2">
        <p className="text-xs text-gray-500">
          ✨ Atualizado em tempo real via Google Analytics
        </p>
      </div>
    </div>
  );
};