import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Bell, Mail, MessageSquare, Trophy, 
  BookOpen, Users, Calendar, Check, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  communityMentions: boolean;
  courseUpdates: boolean;
  achievementUnlocked: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      const response = await api.get('/api/auth/notification-preferences');
      return response.data.data || {
        emailNotifications: true,
        pushNotifications: true,
        communityMentions: true,
        courseUpdates: true,
        achievementUnlocked: true,
        weeklyDigest: true,
        marketingEmails: false
      };
    }
  });

  const [settings, setSettings] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    communityMentions: true,
    courseUpdates: true,
    achievementUnlocked: true,
    weeklyDigest: true,
    marketingEmails: false
  });

  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setSettings(preferences);
    }
  }, [preferences]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: NotificationPreferences) => {
      return await api.put('/api/auth/notification-preferences', newPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferências salvas com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao salvar preferências';
      toast.error(message);
    }
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    updatePreferencesMutation.mutate(newSettings);
  };

  const ToggleSwitch: React.FC<{ 
    enabled: boolean; 
    onChange: () => void; 
    disabled?: boolean 
  }> = ({ enabled, onChange, disabled }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-coral' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="w-11 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Link
              to="/perfil"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
              <p className="text-gray-600">Configure como e quando você quer ser notificado</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Email Notifications */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">E-mail</h2>
                <p className="text-sm text-gray-600">Receba notificações por e-mail</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Notificações gerais</h3>
                  <p className="text-sm text-gray-600">Receber notificações importantes por e-mail</p>
                </div>
                <ToggleSwitch
                  enabled={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Resumo semanal</h3>
                  <p className="text-sm text-gray-600">Receber um resumo das suas atividades da semana</p>
                </div>
                <ToggleSwitch
                  enabled={settings.weeklyDigest}
                  onChange={() => handleToggle('weeklyDigest')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">E-mails promocionais</h3>
                  <p className="text-sm text-gray-600">Receber novidades e ofertas especiais</p>
                </div>
                <ToggleSwitch
                  enabled={settings.marketingEmails}
                  onChange={() => handleToggle('marketingEmails')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Course Notifications */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cursos</h2>
                <p className="text-sm text-gray-600">Notificações sobre novos cursos e atualizações</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Atualizações de cursos</h3>
                  <p className="text-sm text-gray-600">Quando novos conteúdos forem adicionados aos seus cursos</p>
                </div>
                <ToggleSwitch
                  enabled={settings.courseUpdates}
                  onChange={() => handleToggle('courseUpdates')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Community Notifications */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Comunidade</h2>
                <p className="text-sm text-gray-600">Interações na comunidade</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Menções</h3>
                  <p className="text-sm text-gray-600">Quando alguém mencionar você na comunidade</p>
                </div>
                <ToggleSwitch
                  enabled={settings.communityMentions}
                  onChange={() => handleToggle('communityMentions')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Achievement Notifications */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Conquistas</h2>
                <p className="text-sm text-gray-600">Celebre seus marcos e conquistas</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Conquistas desbloqueadas</h3>
                  <p className="text-sm text-gray-600">Quando você conquistar uma nova conquista</p>
                </div>
                <ToggleSwitch
                  enabled={settings.achievementUnlocked}
                  onChange={() => handleToggle('achievementUnlocked')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Browser/Push Notifications */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-coral/10 rounded-lg">
                <Bell className="w-5 h-5 text-coral" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Push</h2>
                <p className="text-sm text-gray-600">Notificações no navegador</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Notificações push</h3>
                  <p className="text-sm text-gray-600">Receber notificações diretamente no navegador</p>
                </div>
                <ToggleSwitch
                  enabled={settings.pushNotifications}
                  onChange={() => handleToggle('pushNotifications')}
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>

        {updatePreferencesMutation.isPending && (
          <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando preferências...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};