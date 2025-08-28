import React, { useState, useEffect } from 'react';
import { 
  Search, Users, MapPin, Briefcase, Heart, Link2, 
  Filter, Grid3X3, List, ChevronRight, Loader2,
  UserPlus, Clock, Check, X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { ConnectionModal } from '../components/ConnectionModal';
import { UserCard } from '../components/UserCard';

interface DiscoveryUser {
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
  connectionId?: string | null;
  matchScore?: number;
  sharedAbilities?: string[];
  sharedInterests?: string[];
}

export const Discover: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DiscoveryUser | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Common abilities and interests for filters
  const commonAbilities = ['SEO', 'WordPress', 'Marketing Digital', 'Copywriting', 'Design', 'Programação', 'E-commerce', 'Análise de Dados'];
  const commonInterests = ['Networking', 'Empreendedorismo', 'Tecnologia', 'Educação', 'Inovação', 'Startups', 'Investimentos', 'Growth'];

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['discovery-users', currentPage, searchTerm, selectedAbilities, selectedInterests, selectedAvailability],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedAbilities.length) params.append('abilities', selectedAbilities.join(','));
      if (selectedInterests.length) params.append('interests', selectedInterests.join(','));
      if (selectedAvailability) params.append('availability', selectedAvailability);

      const response = await fetch(`/api/users/discover?${params}`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Fetch recommended users
  const { data: recommendedUsers } = useQuery({
    queryKey: ['recommended-users'],
    queryFn: async () => {
      const response = await fetch('/api/users/discover/recommended', {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const result = await response.json();
      return result.data;
    }
  });

  // Send connection request
  const sendConnectionRequest = useMutation({
    mutationFn: async ({ toUserId, message }: { toUserId: string; message?: string }) => {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ toUserId, message })
      });

      if (!response.ok) throw new Error('Failed to send connection request');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Solicitação de conexão enviada!');
      queryClient.invalidateQueries({ queryKey: ['discovery-users'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-users'] });
      setShowConnectionModal(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Erro ao enviar solicitação de conexão');
    }
  });

  const handleConnect = (user: DiscoveryUser) => {
    setSelectedUser(user);
    setShowConnectionModal(true);
  };

  const handleToggleAbility = (ability: string) => {
    setSelectedAbilities(prev => 
      prev.includes(ability) 
        ? prev.filter(a => a !== ability)
        : [...prev, ability]
    );
  };

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const getConnectionButton = (user: DiscoveryUser) => {
    switch (user.connectionStatus) {
      case 'accepted':
        return (
          <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <Check size={16} />
            Conectado
          </button>
        );
      case 'pending':
        return (
          <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <Clock size={16} />
            Pendente
          </button>
        );
      case 'blocked':
        return (
          <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <X size={16} />
            Bloqueado
          </button>
        );
      default:
        return (
          <button 
            onClick={() => handleConnect(user)}
            className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors flex items-center gap-2"
          >
            <UserPlus size={16} />
            Conectar
          </button>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Descobrir Pessoas</h1>
        <p className="text-slate-600">Encontre e conecte-se com outros membros da comunidade</p>
      </div>

      {/* Recommended Users */}
      {recommendedUsers && recommendedUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Recomendados para você</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {recommendedUsers.slice(0, 5).map((user: DiscoveryUser) => (
              <div key={user.id} className="flex-shrink-0 w-64 bg-white rounded-xl shadow-soft p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-coral to-coral-dark rounded-full flex items-center justify-center text-white font-bold">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{user.name}</h3>
                    <p className="text-xs text-slate-500">{user.role}</p>
                  </div>
                </div>
                
                {user.sharedAbilities && user.sharedAbilities.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-slate-500 mb-1">Habilidades em comum:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.sharedAbilities.slice(0, 3).map(ability => (
                        <span key={ability} className="px-2 py-1 bg-coral/10 text-coral text-xs rounded-full">
                          {ability}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <button 
                    onClick={() => window.location.href = `/usuarios/${user.id}`}
                    className="text-sm text-slate-600 hover:text-coral transition-colors"
                  >
                    Ver perfil
                  </button>
                  {getConnectionButton(user)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome, habilidades ou interesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-coral text-white border-coral' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter size={20} />
            Filtros
            {(selectedAbilities.length + selectedInterests.length > 0 || selectedAvailability) && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {selectedAbilities.length + selectedInterests.length + (selectedAvailability ? 1 : 0)}
              </span>
            )}
          </button>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-coral text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Grid3X3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-coral text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Abilities Filter */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Habilidades</h3>
                <div className="flex flex-wrap gap-2">
                  {commonAbilities.map(ability => (
                    <button
                      key={ability}
                      onClick={() => handleToggleAbility(ability)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedAbilities.includes(ability)
                          ? 'bg-coral text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {ability}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests Filter */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Interesses</h3>
                <div className="flex flex-wrap gap-2">
                  {commonInterests.map(interest => (
                    <button
                      key={interest}
                      onClick={() => handleToggleInterest(interest)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedInterests.includes(interest)
                          ? 'bg-coral text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Disponibilidade</h3>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="available">Disponível</option>
                  <option value="busy">Ocupado</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedAbilities.length + selectedInterests.length > 0 || selectedAvailability) && (
              <button
                onClick={() => {
                  setSelectedAbilities([]);
                  setSelectedInterests([]);
                  setSelectedAvailability('');
                }}
                className="mt-4 text-sm text-coral hover:text-coral-dark transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Users Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-coral" />
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {usersData?.data?.users?.map((user: DiscoveryUser) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onConnect={() => handleConnect(user)}
                  onViewProfile={() => window.location.href = `/usuarios/${user.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {usersData?.data?.users?.map((user: DiscoveryUser) => (
                <div key={user.id} className="bg-white rounded-xl shadow-soft p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-coral to-coral-dark rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                          <p className="text-sm text-slate-500">{user.role}</p>
                          {user.bio && (
                            <p className="mt-2 text-slate-600">{user.bio}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => window.location.href = `/usuarios/${user.id}`}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <ChevronRight size={20} />
                          </button>
                          {getConnectionButton(user)}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4">
                        {user.location && (
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <MapPin size={14} />
                            {user.location}
                          </div>
                        )}
                        {user.connectionCount !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Users size={14} />
                            {user.connectionCount} conexões
                          </div>
                        )}
                      </div>

                      {(user.abilities?.length || user.interests?.length) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {user.abilities?.slice(0, 3).map(ability => (
                            <span key={ability} className="px-3 py-1 bg-coral/10 text-coral text-sm rounded-full">
                              {ability}
                            </span>
                          ))}
                          {user.interests?.slice(0, 2).map(interest => (
                            <span key={interest} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {usersData?.data?.pagination && usersData.data.pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, usersData.data.pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-coral text-white'
                          : 'bg-white border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(usersData.data.pagination.totalPages, prev + 1))}
                disabled={currentPage === usersData.data.pagination.totalPages}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          )}
        </>
      )}

      {/* Connection Modal */}
      {showConnectionModal && selectedUser && (
        <ConnectionModal
          isOpen={showConnectionModal}
          onClose={() => {
            setShowConnectionModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSend={(message) => sendConnectionRequest.mutate({ 
            toUserId: selectedUser.id, 
            message 
          })}
        />
      )}
    </div>
  );
};