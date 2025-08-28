import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Shield, Bell, ChevronRight, Camera, Check, X, 
  Award, Calendar, LogOut, MapPin, Link as LinkIcon, Loader2,
  Facebook, Instagram, MessageCircle, Youtube, Globe, Edit2, Trophy, Clock, BookOpen,
  TrendingUp, Users, Music, Heart, Dumbbell, Plane, Book, Film, Languages, Utensils, Network,
  Settings, FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUserStats, useUpdateProfile } from '../hooks/useUserStats';
import { AvatarUpload } from '../components/profile/AvatarUpload';
import { ActivityTimeline } from '../components/profile/ActivityTimeline';
import WordPressSites from '../components/profile/WordPressSites';
import ContentSettings from '../components/profile/ContentSettings';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvatarUrl, getInitials } from '../utils/avatar';
import { formatUrl, formatInstagramUrl, formatWhatsAppUrl, formatYouTubeUrl, formatFacebookUrl } from '../utils/socialLinks';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'networking' | 'settings'>('overview');
  
  // Form states
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [socialLinks, setSocialLinks] = useState({
    facebook: user?.socialLinks?.facebook || '',
    instagram: user?.socialLinks?.instagram || '',
    whatsapp: user?.socialLinks?.whatsapp || '',
    youtube: user?.socialLinks?.youtube || '',
    website: user?.socialLinks?.website || ''
  });

  // Fetch real stats
  const { data: statsData, isLoading: statsLoading } = useUserStats();
  const updateProfileMutation = useUpdateProfile();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    await updateProfileMutation.mutateAsync({
      name,
      bio,
      location,
      socialLinks
    });
    setIsEditingProfile(false);
  };

  const getBeltColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-gray-900 to-black';
      case 'mentor':
        return 'bg-gradient-to-r from-purple-600 to-purple-800';
      case 'moderador':
        return 'bg-gradient-to-r from-blue-600 to-blue-800';
      default:
        return 'bg-gradient-to-r from-gray-300 to-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Faixa Preta';
      case 'mentor':
        return 'Faixa Roxa';
      case 'moderador':
        return 'Faixa Azul';
      default:
        return 'Faixa Branca';
    }
  };

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  const stats = statsData?.stats || {
    lessonsCompleted: 0,
    totalWatchTime: 0,
    coursesCompleted: 0,
    rank: 0,
    currentStreak: 0,
    totalXP: 0
  };

  const achievements = statsData?.achievements || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* Header Banner */}
        <div className="h-48 bg-gradient-to-r from-coral to-coral-dark relative">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        <div className="px-6 pb-6">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-end -mt-20 mb-6 relative z-10">
            <div className="relative mb-4 md:mb-0">
              {user?.avatar ? (
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-300 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-600">
                    {getInitials(user?.name)}
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowAvatarUpload(true)}
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              >
                <Camera className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            
            <div className="md:ml-6 mb-4 flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
              <div className="flex items-center gap-4 text-white/90">
                <div className={`${getBeltColor(user?.role || 'aluno')} px-3 py-1 rounded-full text-sm font-medium text-white`}>
                  {getRoleLabel(user?.role || 'aluno')}
                </div>
                {user?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {user.location}
                  </span>
                )}
              </div>
              {user?.bio && (
                <p className="mt-3 text-white/80 max-w-2xl">{user.bio}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all hover:shadow-lg flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar Perfil
              </button>
              <button
                onClick={() => navigate('/perfil/networking')}
                className="px-5 py-2.5 bg-coral text-white rounded-xl font-semibold hover:bg-coral-dark transition-all hover:shadow-lg flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Configurar Networking
              </button>
            </div>
          </div>

          {/* Bio and Social Links Section */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            {user?.bio && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">Sobre</h3>
                <p className="text-gray-800 leading-relaxed">{user.bio}</p>
              </div>
            )}
            
            {(user?.socialLinks?.facebook || user?.socialLinks?.instagram || user?.socialLinks?.whatsapp || user?.socialLinks?.youtube || user?.socialLinks?.website) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Redes Sociais</h3>
                <div className="flex gap-3">
              {user.socialLinks.facebook && (
                  <a href={formatFacebookUrl(user.socialLinks.facebook)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white rounded-xl hover:bg-gray-100 transition-all hover:shadow-md" title="Facebook">
                  <Facebook className="w-5 h-5 text-gray-700" />
                </a>
              )}
              {user.socialLinks.instagram && (
                  <a href={formatInstagramUrl(user.socialLinks.instagram)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white rounded-xl hover:bg-gray-100 transition-all hover:shadow-md" title="Instagram">
                  <Instagram className="w-5 h-5 text-gray-700" />
                </a>
              )}
              {user.socialLinks.whatsapp && (
                  <a href={formatWhatsAppUrl(user.socialLinks.whatsapp)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white rounded-xl hover:bg-gray-100 transition-all hover:shadow-md" title="WhatsApp">
                  <MessageCircle className="w-5 h-5 text-gray-700" />
                </a>
              )}
              {user.socialLinks.youtube && (
                  <a href={formatYouTubeUrl(user.socialLinks.youtube)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white rounded-xl hover:bg-gray-100 transition-all hover:shadow-md" title="YouTube">
                  <Youtube className="w-5 h-5 text-gray-700" />
                </a>
              )}
              {user.socialLinks.website && (
                  <a href={formatUrl(user.socialLinks.website)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white rounded-xl hover:bg-gray-100 transition-all hover:shadow-md" title="Website">
                  <Globe className="w-5 h-5 text-gray-700" />
                </a>
              )}
                </div>
              </div>
            )}
            
            {!user?.bio && !(user?.socialLinks?.facebook || user?.socialLinks?.instagram || user?.socialLinks?.whatsapp || user?.socialLinks?.youtube || user?.socialLinks?.website) && (
              <div className="text-center py-4">
                <p className="text-gray-500">Adicione uma bio e suas redes sociais para completar seu perfil</p>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="mt-3 text-coral font-semibold hover:underline"
                >
                  Editar Perfil
                </button>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estatísticas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200">
                <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.lessonsCompleted}
                </div>
                <div className="text-sm text-gray-600">Aulas</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
                <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : formatWatchTime(stats.totalWatchTime)}
                </div>
                <div className="text-sm text-gray-600">Estudado</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
                <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.coursesCompleted}
                </div>
                <div className="text-sm text-gray-600">Cursos</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center border border-yellow-200">
                <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `#${stats.rank}`}
                </div>
                <div className="text-sm text-gray-600">Ranking</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200">
                <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      {stats.currentStreak}
                      <span className="text-orange-500">🔥</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-600">Sequência</div>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center border border-pink-200">
                <Award className="w-6 h-6 text-pink-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.totalXP}
                </div>
                <div className="text-sm text-gray-600">XP Total</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-coral text-coral font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'border-coral text-coral font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Atividade
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'achievements'
                    ? 'border-coral text-coral font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Conquistas
                <span className="px-2 py-0.5 bg-coral text-white text-xs rounded-full">
                  {achievements.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('networking')}
                className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'networking'
                    ? 'border-coral text-coral font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Network className="w-4 h-4" />
                Perfil de Networking
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'border-coral text-coral font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Configurações
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Personal Data */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Informações Pessoais</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">E-mail</span>
                      <span className="font-medium text-gray-900">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">Membro desde</span>
                      <span className="font-medium text-gray-900">
                        {user?.createdAt ? formatDistanceToNow(new Date(user.createdAt), { 
                          addSuffix: false, 
                          locale: ptBR 
                        }) : 'N/A'}
                      </span>
                    </div>
                    {statsData?.lastActive && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-600">Última atividade</span>
                        <span className="font-medium text-gray-900">
                          {formatDistanceToNow(new Date(statsData.lastActive), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscription Status */}
                <div className="border-t pt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Status da Assinatura</h2>
                  <div className="bg-gradient-to-r from-coral/10 to-red-50 rounded-xl p-4 border border-coral/20">
                    {user?.membership ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Plano</span>
                          <span className="font-bold text-coral capitalize">
                            {user.membership.product || 'Escola do SEO Premium'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Status</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              user.membership.status === 'active' ? 'bg-green-500' : 
                              user.membership.status === 'expired' ? 'bg-red-500' : 
                              user.membership.status === 'cancelled' ? 'bg-yellow-500' : 
                              'bg-gray-500'
                            }`} />
                            <span className={`font-medium capitalize ${
                              user.membership.status === 'active' ? 'text-green-700' : 
                              user.membership.status === 'expired' ? 'text-red-700' : 
                              user.membership.status === 'cancelled' ? 'text-yellow-700' : 
                              'text-gray-700'
                            }`}>
                              {user.membership.status === 'active' ? 'Ativo' :
                               user.membership.status === 'expired' ? 'Expirado' :
                               user.membership.status === 'cancelled' ? 'Cancelado' :
                               'Pendente'}
                            </span>
                          </div>
                        </div>
                        {user.membership.expiresAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Expira em</span>
                            <span className="font-medium text-gray-900">
                              {new Date(user.membership.expiresAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-coral/20">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Acesso completo às ferramentas premium</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">Plano Gratuito</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Atualize para acessar todas as funcionalidades premium
                        </p>
                        <button className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors text-sm font-medium">
                          Fazer Upgrade
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings */}
                <div className="border-t pt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Configurações da Conta</h2>
                  <div className="space-y-3">
                    <Link to="/profile/security" className="block">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <Shield className="w-5 h-5 mr-3 text-coral" />
                          <span className="font-medium text-gray-900">Segurança</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                    
                    <Link to="/profile/notifications" className="block">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <Bell className="w-5 h-5 mr-3 text-coral" />
                          <span className="font-medium text-gray-900">Notificações</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <LogOut className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-600">Sair da Conta</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <ActivityTimeline />
            )}

            {activeTab === 'achievements' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements.length > 0 ? (
                  achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-gray-50 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors group"
                    >
                      <div className={`w-16 h-16 ${achievement.color || 'bg-gradient-to-br from-yellow-400 to-yellow-600'} rounded-full flex items-center justify-center mx-auto mb-3 text-3xl group-hover:scale-110 transition-transform`}>
                        {achievement.icon ? (
                          <span>{achievement.icon}</span>
                        ) : (
                          <Trophy className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(achievement.unlockedAt), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma conquista ainda</p>
                    <p className="text-sm text-gray-400 mt-1">Continue estudando para desbloquear conquistas!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Configurações de Ferramentas</h2>
                  <p className="text-gray-600 mb-8">Configure suas credenciais para usar as ferramentas de criação de conteúdo.</p>
                  
                  {/* WordPress Sites Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-coral" />
                      Sites WordPress
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Adicione seus sites WordPress para publicar conteúdo automaticamente.</p>
                    <WordPressSites />
                  </div>

                  {/* Pexels API Section */}
                  <div className="border-t pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-coral" />
                      API de Imagens (Pexels)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Configure sua chave de API do Pexels para gerar imagens automaticamente.</p>
                    <ContentSettings />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'networking' && (
              <div className="space-y-6">
                {/* Professional Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Informações Profissionais
                  </h3>
                  
                  {/* Abilities */}
                  {user?.abilities && user.abilities.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Habilidades</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.abilities.map((ability, index) => (
                          <span key={index} className="px-3 py-1 bg-coral/10 text-coral rounded-full text-sm font-medium">
                            {ability}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Professional Interests */}
                  {user?.interests && user.interests.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Interesses Profissionais</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.interests.map((interest, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Looking For */}
                  {user?.lookingFor && user.lookingFor.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Procurando por</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.lookingFor.map((item, index) => (
                          <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {item === 'mentorship' && 'Mentoria'}
                            {item === 'collaboration' && 'Colaboração'}
                            {item === 'partnership' && 'Parceria'}
                            {item === 'networking' && 'Networking'}
                            {item === 'learning' && 'Aprendizado'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Availability */}
                  {user?.availability && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Disponibilidade</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.availability === 'available' 
                          ? 'bg-green-100 text-green-700'
                          : user.availability === 'busy'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.availability === 'available' && 'Disponível'}
                        {user.availability === 'busy' && 'Ocupado'}
                        {user.availability === 'not_interested' && 'Não disponível'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Personal Interests */}
                {user?.personalInterests && Object.keys(user.personalInterests).some(key => {
                  const value = user.personalInterests[key as keyof typeof user.personalInterests];
                  return Array.isArray(value) ? value.length > 0 : value;
                }) && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-purple-600" />
                      Interesses Pessoais
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Music */}
                      {user.personalInterests.music && user.personalInterests.music.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Music className="w-4 h-4 text-pink-600" />
                            Música
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.music.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hobbies */}
                      {user.personalInterests.hobbies && user.personalInterests.hobbies.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Heart className="w-4 h-4 text-purple-600" />
                            Hobbies
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.hobbies.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gym Frequency */}
                      {user.personalInterests.gymFrequency && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Dumbbell className="w-4 h-4 text-orange-600" />
                            Academia
                          </h4>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                            {user.personalInterests.gymFrequency === 'never' && 'Nunca'}
                            {user.personalInterests.gymFrequency === 'rarely' && 'Raramente'}
                            {user.personalInterests.gymFrequency === '1-2x_week' && '1-2x por semana'}
                            {user.personalInterests.gymFrequency === '3-4x_week' && '3-4x por semana'}
                            {user.personalInterests.gymFrequency === '5+_week' && '5+ vezes por semana'}
                            {user.personalInterests.gymFrequency === 'daily' && 'Diariamente'}
                          </span>
                        </div>
                      )}

                      {/* Travel Interests */}
                      {user.personalInterests.travelInterests && user.personalInterests.travelInterests.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Plane className="w-4 h-4 text-green-600" />
                            Viagens
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.travelInterests.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Books */}
                      {user.personalInterests.favoriteBooks && user.personalInterests.favoriteBooks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Book className="w-4 h-4 text-amber-600" />
                            Livros
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.favoriteBooks.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Movies */}
                      {user.personalInterests.favoriteMovies && user.personalInterests.favoriteMovies.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Film className="w-4 h-4 text-red-600" />
                            Filmes/Séries
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.favoriteMovies.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {user.personalInterests.languages && user.personalInterests.languages.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Languages className="w-4 h-4 text-indigo-600" />
                            Idiomas
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.languages.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Diet */}
                      {user.personalInterests.dietPreferences && user.personalInterests.dietPreferences.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-teal-600" />
                            Dieta
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {user.personalInterests.dietPreferences.map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!user?.abilities || user.abilities.length === 0) && 
                 (!user?.interests || user.interests.length === 0) && 
                 (!user?.personalInterests || Object.keys(user.personalInterests).every(key => {
                   const value = user.personalInterests![key as keyof typeof user.personalInterests];
                   return Array.isArray(value) ? value.length === 0 : !value;
                 })) && (
                  <div className="text-center py-12">
                    <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Perfil de networking não configurado</p>
                    <p className="text-sm text-gray-400 mb-4">Configure seu perfil para conectar-se com outros membros</p>
                    <button
                      onClick={() => navigate('/perfil/networking')}
                      className="px-6 py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral-dark transition-all hover:shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <Users className="w-4 h-4" />
                      Configurar Networking
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Editar Perfil</h2>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio <span className="text-gray-400">({bio.length}/200)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.substring(0, 200))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral resize-none"
                  placeholder="Conte um pouco sobre você..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Cidade, Estado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Links Sociais</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                      placeholder="https://facebook.com/seu-perfil"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Instagram className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                      placeholder="@seu_usuario ou https://instagram.com/seu_usuario"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={socialLinks.whatsapp}
                      onChange={(e) => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                      placeholder="55 11 98765-4321"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Youtube className="w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                      placeholder="https://youtube.com/@seu-canal"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={socialLinks.website}
                      onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral"
                      placeholder="https://seu-website.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={updateProfileMutation.isPending}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <AvatarUpload
          currentAvatar={user?.avatar}
          userName={user?.name || ''}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}
    </div>
  );
};