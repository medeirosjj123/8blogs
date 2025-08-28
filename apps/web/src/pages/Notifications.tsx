import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  type: 'mention' | 'achievement' | 'course_update' | 'system' | 'welcome' | 'community' | 'direct_message';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'chat' | 'learning' | 'system' | 'social' | 'achievement';
  data?: {
    url?: string;
    [key: string]: any;
  };
  createdAt: string;
}

type FilterType = 'all' | 'unread' | 'chat' | 'learning' | 'system' | 'achievement';

export const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Get notifications with filtering
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.append('isRead', 'false');
      } else if (filter !== 'all') {
        params.append('category', filter);
      }
      params.append('limit', '50');

      const response = await api.get(`/notifications?${params}`);
      return response.data.data;
    },
  });

  const notifications: Notification[] = data?.notifications || [];
  const totalCount = data?.total || 0;
  const unreadCount = data?.unreadCount || 0;

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (notificationIds.length === 1) {
        return await api.put(`/notifications/${notificationIds[0]}/read`);
      } else {
        // For multiple, mark all as read
        return await api.put('/notifications/mark-all-read');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      setSelectedNotifications([]);
      toast.success('Notificações marcadas como lidas');
    },
  });

  // Delete notifications mutation
  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const promises = notificationIds.map(id => api.delete(`/notifications/${id}`));
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCount'] });
      setSelectedNotifications([]);
      toast.success('Notificações excluídas');
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'mention':
      case 'direct_message':
        return '💬';
      case 'course_update':
        return '📚';
      case 'welcome':
        return '👋';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification._id]);
    }

    // Navigate to URL if provided
    if (notification.data?.url) {
      window.open(notification.data.url, '_blank');
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId) 
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  const getFilterLabel = (filterType: FilterType) => {
    switch (filterType) {
      case 'all': return 'Todas';
      case 'unread': return 'Não lidas';
      case 'chat': return 'Comunidade';
      case 'learning': return 'Aprendizado';
      case 'system': return 'Sistema';
      case 'achievement': return 'Conquistas';
      default: return 'Todas';
    }
  };

  const filterOptions: FilterType[] = ['all', 'unread', 'chat', 'learning', 'system', 'achievement'];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
              <p className="text-slate-600 mt-1">
                {totalCount} notificações • {unreadCount} não lidas
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {filterOptions.map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-coral text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {getFilterLabel(filterOption)}
                {filterOption === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 text-xs">({unreadCount})</span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === notifications.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-coral focus:ring-coral"
                  />
                  <span className="text-sm text-slate-600">
                    {selectedNotifications.length > 0 
                      ? `${selectedNotifications.length} selecionadas`
                      : 'Selecionar todas'
                    }
                  </span>
                </label>
              </div>

              {selectedNotifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markAsReadMutation.mutate(selectedNotifications)}
                    disabled={markAsReadMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Marcar como lidas
                  </button>
                  <button
                    onClick={() => deleteNotificationsMutation.mutate(selectedNotifications)}
                    disabled={deleteNotificationsMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-coral mx-auto mb-3" />
              <p className="text-slate-500">Carregando notificações...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-2">Nenhuma notificação encontrada</p>
              <p className="text-sm text-slate-400">
                {filter === 'unread' 
                  ? 'Você não tem notificações não lidas'
                  : 'Você não tem notificações ainda'
                }
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-6 hover:bg-slate-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50/30 border-l-4 border-l-coral' : ''
                }`}
              >
                <div className="flex gap-4">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification._id)}
                    onChange={() => handleSelectNotification(notification._id)}
                    className="mt-1 rounded border-slate-300 text-coral focus:ring-coral"
                  />
                  
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${
                            !notification.isRead ? 'text-slate-900' : 'text-slate-700'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-coral rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-slate-600 mb-3 leading-relaxed">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-400">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(notification.priority)}`}>
                            {notification.priority}
                          </span>
                          <span className="text-slate-400 capitalize">
                            {notification.category}
                          </span>
                        </div>
                      </div>

                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate([notification._id]);
                          }}
                          disabled={markAsReadMutation.isPending}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => markAsReadMutation.mutate([])}
              disabled={markAsReadMutation.isPending}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas ({unreadCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};