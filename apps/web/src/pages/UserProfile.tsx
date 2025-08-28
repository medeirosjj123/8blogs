import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Globe, Facebook, Instagram, Youtube, 
  Users, Briefcase, Heart, MessageCircle, UserPlus, UserMinus,
  Clock, Check, X, Shield, Loader2, Link2, Music, Dumbbell,
  Plane, Book, Film, Languages, Utensils
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { ConnectionModal } from '../components/ConnectionModal';

interface UserProfileData {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  location?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    youtube?: string;
    website?: string;
  };
  role: string;
  abilities?: string[];
  interests?: string[];
  lookingFor?: string[];
  availability?: 'available' | 'busy' | 'not_interested';
  connectionCount?: number;
  profileCompleteness?: number;
  personalInterests?: {
    music?: string[];
    hobbies?: string[];
    gymFrequency?: 'never' | 'rarely' | '1-2x_week' | '3-4x_week' | '5+_week' | 'daily';
    travelInterests?: string[];
    favoriteBooks?: string[];
    favoriteMovies?: string[];
    languages?: string[];
    dietPreferences?: string[];
  };
  createdAt: string;
  connectionStatus?: 'pending' | 'accepted' | 'blocked' | 'rejected' | null;
  connectionId?: string | null;
  mutualConnectionsCount?: number;
}

export const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch user profile');
      const result = await response.json();
      return result.data as UserProfileData;
    },
    enabled: !!userId
  });

  // Send connection request
  const sendConnectionRequest = useMutation({
    mutationFn: async (message?: string) => {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ toUserId: userId, message })
      });

      if (!response.ok) throw new Error('Failed to send connection request');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Solicitação de conexão enviada!');
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      setShowConnectionModal(false);
    },
    onError: () => {
      toast.error('Erro ao enviar solicitação de conexão');
    }
  });

  // Accept connection
  const acceptConnection = useMutation({
    mutationFn: async () => {
      if (!profile?.connectionId) throw new Error('No connection ID');
      
      const response = await fetch(`/api/connections/${profile.connectionId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to accept connection');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Conexão aceita!');
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    }
  });

  // Remove connection
  const removeConnection = useMutation({
    mutationFn: async () => {
      if (!profile?.connectionId) throw new Error('No connection ID');
      
      const response = await fetch(`/api/connections/${profile.connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to remove connection');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Conexão removida');
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    }
  });

  // Block user
  const blockUser = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/connections/${userId}/block`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to block user');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Usuário bloqueado');
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    }
  });

  const getConnectionButton = () => {
    if (currentUser?.id === userId) return null;

    switch (profile?.connectionStatus) {
      case 'accepted':
        return (
          <div className="flex gap-2">
            <button className="px-6 py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center gap-2">
              <Check size={18} />
              Conectado
            </button>
            <button 
              onClick={() => removeConnection.mutate()}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <UserMinus size={18} />
            </button>
          </div>
        );
      case 'pending':
        // Check if it's an incoming request
        return (
          <div className="flex gap-2">
            <button className="px-6 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium flex items-center gap-2">
              <Clock size={18} />
              Pendente
            </button>
            {/* You might want to add logic to determine if it's incoming */}
          </div>
        );
      case 'blocked':
        return (
          <button className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-medium flex items-center gap-2">
            <X size={18} />
            Bloqueado
          </button>
        );
      default:
        return (
          <button 
            onClick={() => setShowConnectionModal(true)}
            className="px-6 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors flex items-center gap-2"
          >
            <UserPlus size={18} />
            Conectar
          </button>
        );
    }
  };

  const getAvailabilityBadge = () => {
    switch (profile?.availability) {
      case 'available':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            Disponível para networking
          </span>
        );
      case 'busy':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            Ocupado no momento
          </span>
        );
      case 'not_interested':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-sm">
            Não disponível
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-slate-600 mb-4">Usuário não encontrado</p>
        <button
          onClick={() => navigate('/descobrir')}
          className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          Voltar para Descobrir
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-soft p-8 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                alt={profile.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-coral to-coral-dark rounded-full flex items-center justify-center text-white font-bold text-3xl">
                {profile.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">{profile.name}</h1>
                <p className="text-lg text-slate-600 mb-2">{profile.role}</p>
                {getAvailabilityBadge()}
              </div>
              <div className="flex gap-2">
                {getConnectionButton()}
                {currentUser?.id !== userId && profile.connectionStatus === 'accepted' && (
                  <button 
                    onClick={() => navigate(`/comunidade`)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <MessageCircle size={18} />
                    Mensagem
                  </button>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="mt-4 text-slate-700">{profile.bio}</p>
            )}

            {/* Meta Info */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={16} />
                  {profile.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users size={16} />
                {profile.connectionCount || 0} conexões
              </div>
              {profile.mutualConnectionsCount !== undefined && profile.mutualConnectionsCount > 0 && (
                <div className="flex items-center gap-1">
                  <Link2 size={16} />
                  {profile.mutualConnectionsCount} conexões em comum
                </div>
              )}
            </div>

            {/* Social Links */}
            {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {profile.socialLinks.website && (
                  <a 
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Globe size={18} />
                  </a>
                )}
                {profile.socialLinks.facebook && (
                  <a 
                    href={profile.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Facebook size={18} />
                  </a>
                )}
                {profile.socialLinks.instagram && (
                  <a 
                    href={profile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors"
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {profile.socialLinks.youtube && (
                  <a 
                    href={profile.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Youtube size={18} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills & Interests */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Abilities */}
        {profile.abilities && profile.abilities.length > 0 && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="text-coral" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">Habilidades</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.abilities.map(ability => (
                <span key={ability} className="px-3 py-1 bg-coral/10 text-coral rounded-full text-sm">
                  {ability}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">Interesses</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(interest => (
                <span key={interest} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Looking For */}
      {profile.lookingFor && profile.lookingFor.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Procurando por</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {profile.lookingFor.map(item => (
              <div key={item} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center">
                  {item === 'mentorship' && <Users className="text-coral" size={20} />}
                  {item === 'collaboration' && <Link2 className="text-coral" size={20} />}
                  {item === 'partnership' && <Briefcase className="text-coral" size={20} />}
                  {item === 'networking' && <Globe className="text-coral" size={20} />}
                  {item === 'learning' && <Heart className="text-coral" size={20} />}
                </div>
                <span className="text-slate-700">
                  {item === 'mentorship' && 'Mentoria'}
                  {item === 'collaboration' && 'Colaboração'}
                  {item === 'partnership' && 'Parceria'}
                  {item === 'networking' && 'Networking'}
                  {item === 'learning' && 'Aprendizado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Interests Section */}
      {profile.personalInterests && (
        <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Interesses Pessoais</h2>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Music */}
            {profile.personalInterests.music && profile.personalInterests.music.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Music className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Música</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.music.map(item => (
                    <span key={item} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hobbies */}
            {profile.personalInterests.hobbies && profile.personalInterests.hobbies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Hobbies</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.hobbies.map(item => (
                    <span key={item} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gym Frequency */}
            {profile.personalInterests.gymFrequency && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Academia</h3>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                  {profile.personalInterests.gymFrequency === 'never' && 'Nunca'}
                  {profile.personalInterests.gymFrequency === 'rarely' && 'Raramente'}
                  {profile.personalInterests.gymFrequency === '1-2x_week' && '1-2x por semana'}
                  {profile.personalInterests.gymFrequency === '3-4x_week' && '3-4x por semana'}
                  {profile.personalInterests.gymFrequency === '5+_week' && '5+ vezes por semana'}
                  {profile.personalInterests.gymFrequency === 'daily' && 'Diariamente'}
                </span>
              </div>
            )}

            {/* Travel */}
            {profile.personalInterests.travelInterests && profile.personalInterests.travelInterests.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Destinos de Interesse</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.travelInterests.map(item => (
                    <span key={item} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Books */}
            {profile.personalInterests.favoriteBooks && profile.personalInterests.favoriteBooks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Book className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Livros Favoritos</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.favoriteBooks.map(item => (
                    <span key={item} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Movies */}
            {profile.personalInterests.favoriteMovies && profile.personalInterests.favoriteMovies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Film className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Filmes Favoritos</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.favoriteMovies.map(item => (
                    <span key={item} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.personalInterests.languages && profile.personalInterests.languages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Languages className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Idiomas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.languages.map(item => (
                    <span key={item} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diet */}
            {profile.personalInterests.dietPreferences && profile.personalInterests.dietPreferences.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="text-coral" size={18} />
                  <h3 className="font-medium text-slate-700">Preferências Alimentares</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.personalInterests.dietPreferences.map(item => (
                    <span key={item} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Completeness */}
      {currentUser?.id === userId && profile.profileCompleteness !== undefined && (
        <div className="bg-gradient-to-r from-coral/10 to-coral/5 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Completude do Perfil</h3>
            <span className="text-2xl font-bold text-coral">{profile.profileCompleteness}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-coral to-coral-dark transition-all"
              style={{ width: `${profile.profileCompleteness}%` }}
            />
          </div>
          {profile.profileCompleteness < 100 && (
            <p className="text-sm text-slate-600 mt-3">
              Complete seu perfil para aumentar suas chances de conexão!
            </p>
          )}
        </div>
      )}

      {/* Actions for own profile */}
      {currentUser?.id === userId && (
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/perfil')}
            className="flex-1 px-6 py-3 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            Editar Perfil
          </button>
          <button
            onClick={() => navigate('/perfil/networking')}
            className="flex-1 px-6 py-3 border border-coral text-coral rounded-lg font-medium hover:bg-coral/5 transition-colors"
          >
            Configurar Networking
          </button>
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && profile && (
        <ConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          user={profile}
          onSend={(message) => sendConnectionRequest.mutate(message)}
        />
      )}
    </div>
  );
};