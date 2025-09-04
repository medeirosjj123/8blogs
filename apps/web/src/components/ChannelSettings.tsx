import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Trash2, LogOut, Crown, Shield, UserMinus, Loader2, Hash, Lock, Info } from 'lucide-react';
import { useJoinChannel, useLeaveChannel } from '../hooks/useChat';
import chatService from '../services/chat.service';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface ChannelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  channel: any;
  onChannelUpdate?: () => void;
  onChannelDelete?: () => void;
}

interface Member {
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export const ChannelSettings: React.FC<ChannelSettingsProps> = ({
  isOpen,
  onClose,
  channel,
  onChannelUpdate,
  onChannelDelete
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editedChannel, setEditedChannel] = useState({
    name: '',
    description: ''
  });

  const joinChannel = useJoinChannel();
  const leaveChannel = useLeaveChannel();

  useEffect(() => {
    if (isOpen && channel) {
      setEditedChannel({
        name: channel.name,
        description: channel.description || ''
      });
      if (activeTab === 'members') {
        fetchMembers();
      }
    }
  }, [isOpen, channel, activeTab]);

  const fetchMembers = async () => {
    if (!channel) return;
    
    setIsLoading(true);
    try {
      const response = await api.get(`/api/chat/channels/${channel._id || channel.id}/members`);
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Erro ao carregar membros');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateChannel = async () => {
    if (!channel) return;
    
    setIsUpdating(true);
    try {
      await api.put(`/api/chat/channels/${channel._id || channel.id}`, {
        name: editedChannel.name,
        description: editedChannel.description
      });
      toast.success('Canal atualizado com sucesso');
      onChannelUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating channel:', error);
      toast.error('Erro ao atualizar canal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channel) return;
    
    if (!window.confirm('Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    setIsUpdating(true);
    try {
      await api.delete(`/api/chat/channels/${channel._id || channel.id}`);
      toast.success('Canal excluído com sucesso');
      onChannelDelete?.();
      onClose();
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error('Erro ao excluir canal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeaveChannel = async () => {
    if (!channel) return;
    
    if (!window.confirm('Tem certeza que deseja sair deste canal?')) {
      return;
    }
    
    try {
      await leaveChannel.mutateAsync(channel._id || channel.id);
      onClose();
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!channel) return;
    
    if (!window.confirm('Tem certeza que deseja remover este membro?')) {
      return;
    }
    
    try {
      await api.delete(`/api/chat/channels/${channel._id || channel.id}/members/${memberId}`);
      toast.success('Membro removido com sucesso');
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!channel) return;
    
    try {
      await api.put(`/api/chat/channels/${channel._id || channel.id}/members/${memberId}`, {
        role: newRole
      });
      toast.success('Permissão atualizada com sucesso');
      fetchMembers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  if (!isOpen || !channel) return null;

  const currentUserMember = members.find(m => m.userId._id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = isOwner || currentUserMember?.role === 'admin';
  const isMember = channel.isMember;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {channel.type === 'private' ? <Lock size={20} /> : <Hash size={20} />}
            <h2 className="text-xl font-semibold text-slate-900">
              Configurações do Canal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-coral border-b-2 border-coral'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info size={16} />
            Informações
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-coral border-b-2 border-coral'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            Membros ({channel.memberCount || 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Channel Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do Canal
                  </label>
                  <input
                    type="text"
                    value={editedChannel.name}
                    onChange={(e) => setEditedChannel(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isAdmin}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={editedChannel.description}
                    onChange={(e) => setEditedChannel(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isAdmin}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Sobre o que é este canal?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Canal
                  </label>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    {channel.type === 'private' ? (
                      <>
                        <Lock size={16} className="text-slate-600" />
                        <span className="text-slate-700">Privado</span>
                      </>
                    ) : (
                      <>
                        <Hash size={16} className="text-slate-600" />
                        <span className="text-slate-700">Público</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Update Button */}
                {isAdmin && (
                  <button
                    onClick={handleUpdateChannel}
                    disabled={isUpdating || !editedChannel.name.trim()}
                    className="w-full px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                )}
              </div>

              {/* Danger Zone */}
              <div className="border-t border-slate-200 pt-6 space-y-3">
                <h3 className="text-sm font-semibold text-red-600 mb-3">Zona de Perigo</h3>
                
                {isMember && !isOwner && (
                  <button
                    onClick={handleLeaveChannel}
                    className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Sair do Canal
                  </button>
                )}

                {isOwner && (
                  <button
                    onClick={handleDeleteChannel}
                    disabled={isUpdating}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Excluir Canal
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-coral" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum membro encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.userId._id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          {member.userId.avatar ? (
                            <img
                              src={member.userId.avatar}
                              alt={member.userId.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white font-bold">
                              {member.userId.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {member.userId.name}
                            </span>
                            {member.role === 'owner' && (
                              <Crown size={14} className="text-yellow-500" />
                            )}
                            {member.role === 'admin' && (
                              <Shield size={14} className="text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{member.userId.email}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {isAdmin && member.userId._id !== user?.id && member.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.userId._id, e.target.value as 'admin' | 'member')}
                              className="px-3 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                            >
                              <option value="member">Membro</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member.userId._id)}
                            className="p-1 text-red-500 hover:text-red-600 transition-colors"
                            title="Remover membro"
                          >
                            <UserMinus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};