import React from 'react';
import { MapPin, Users, Briefcase, Heart, Clock, Check, X, UserPlus, ChevronRight } from 'lucide-react';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
    location?: string;
    abilities?: string[];
    interests?: string[];
    lookingFor?: string[];
    availability?: 'available' | 'busy' | 'not_interested';
    role: string;
    connectionCount?: number;
    connectionStatus?: 'pending' | 'accepted' | 'blocked' | 'rejected' | null;
  };
  onConnect: () => void;
  onViewProfile: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onConnect, onViewProfile }) => {
  const getAvailabilityBadge = () => {
    switch (user.availability) {
      case 'available':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            Disponível
          </span>
        );
      case 'busy':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            Ocupado
          </span>
        );
      case 'not_interested':
        return (
          <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
            Indisponível
          </span>
        );
      default:
        return null;
    }
  };

  const getConnectionButton = () => {
    switch (user.connectionStatus) {
      case 'accepted':
        return (
          <button className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <Check size={16} />
            Conectado
          </button>
        );
      case 'pending':
        return (
          <button className="w-full px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <Clock size={16} />
            Pendente
          </button>
        );
      case 'blocked':
        return (
          <button className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <X size={16} />
            Bloqueado
          </button>
        );
      default:
        return (
          <button 
            onClick={onConnect}
            className="w-full px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Conectar
          </button>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-soft hover:shadow-lg transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-coral to-coral-dark rounded-full flex items-center justify-center text-white font-bold text-lg">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900">{user.name}</h3>
            <p className="text-sm text-slate-500">{user.role}</p>
          </div>
        </div>
        {getAvailabilityBadge()}
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {user.bio}
        </p>
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm text-slate-500">
        {user.location && (
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span>{user.location}</span>
          </div>
        )}
        {user.connectionCount !== undefined && (
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{user.connectionCount} conexões</span>
          </div>
        )}
      </div>

      {/* Skills and Interests */}
      {(user.abilities?.length || user.interests?.length) && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {user.abilities?.slice(0, 3).map(ability => (
              <span key={ability} className="px-2 py-1 bg-coral/10 text-coral text-xs rounded-full">
                {ability}
              </span>
            ))}
            {user.interests?.slice(0, 2).map(interest => (
              <span key={interest} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {interest}
              </span>
            ))}
            {((user.abilities?.length || 0) + (user.interests?.length || 0)) > 5 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
                +{(user.abilities?.length || 0) + (user.interests?.length || 0) - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Looking For */}
      {user.lookingFor && user.lookingFor.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Procurando por:</p>
          <div className="flex flex-wrap gap-1">
            {user.lookingFor.map(item => (
              <span key={item} className="text-xs text-slate-700">
                {item === 'mentorship' && 'Mentoria'}
                {item === 'collaboration' && 'Colaboração'}
                {item === 'partnership' && 'Parceria'}
                {item === 'networking' && 'Networking'}
                {item === 'learning' && 'Aprendizado'}
                {user.lookingFor!.indexOf(item) < user.lookingFor!.length - 1 && ' •'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={onViewProfile}
          className="flex-1 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          Ver Perfil
          <ChevronRight size={16} />
        </button>
        {getConnectionButton()}
      </div>
    </div>
  );
};