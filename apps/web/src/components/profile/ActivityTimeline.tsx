import React, { useState } from 'react';
import { Clock, CheckCircle, PlayCircle, BookOpen, Trophy, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserActivity } from '../../hooks/useUserStats';
import { useQuery } from '@tanstack/react-query';
import userStatsService from '../../services/userStats.service';

export const ActivityTimeline: React.FC = () => {
  const [limit, setLimit] = useState(10);
  const { data, isLoading, error } = useQuery({
    queryKey: ['userActivity', limit, 0],
    queryFn: () => userStatsService.getActivity(limit, 0),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data?.activities) {
    return (
      <div className="text-center py-8 text-gray-500">
        Erro ao carregar atividades
      </div>
    );
  }

  if (data.activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma atividade ainda</p>
        <p className="text-sm mt-1">Comece assistindo uma aula!</p>
      </div>
    );
  }

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatWatchTime = (seconds?: number) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="space-y-4">
      {data.activities.map((activity, index) => (
        <div key={activity.id} className="relative">
          {/* Timeline line */}
          {index < data.activities.length - 1 && (
            <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200"></div>
          )}
          
          <div className="flex gap-4">
            {/* Icon */}
            <div className="relative z-10 flex-shrink-0">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                {getActivityIcon(activity.status)}
              </div>
            </div>
            
            {/* Content */}
            <div className={`flex-1 p-4 rounded-xl border ${getActivityColor(activity.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {activity.lessonTitle}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.courseTitle}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {activity.watchTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatWatchTime(activity.watchTime)}
                      </span>
                    )}
                    
                    {activity.quizScore !== undefined && (
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {activity.quizScore}% no quiz
                      </span>
                    )}
                    
                    <span>
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Status Badge */}
                {activity.status === 'completed' && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Completo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {data.hasMore && (
        <button 
          onClick={() => setLimit(prev => prev + 10)}
          disabled={isLoading}
          className="w-full py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </>
          ) : (
            'Ver mais atividades'
          )}
        </button>
      )}
    </div>
  );
};