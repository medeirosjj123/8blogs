import React, { useState, useRef, useEffect } from 'react';
import { Hash, Send, Plus, Search, Users, Settings, Loader2, Smile, Paperclip, MoreVertical, Bell, BellOff, X, MessageCircle, Pin } from 'lucide-react';
import { useChannels, useChat, useEditMessage, useDeleteMessage, usePinMessage, useUnpinMessage } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChannelModal } from '../components/ChannelModal';
import { DirectMessageModal } from '../components/DirectMessageModal';
import { MessageActions } from '../components/MessageActions';
import { MessageContent } from '../components/MessageContent';
import { MentionInput } from '../components/MentionInput';
import { EmojiPicker } from '../components/EmojiPicker';
import { SearchModal } from '../components/SearchModal';
import { ChannelSettings } from '../components/ChannelSettings';
import { PinnedMessagesModal } from '../components/PinnedMessagesModal';
import notificationService from '../services/notification.service';
import toast from 'react-hot-toast';

export const Community: React.FC = () => {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showDirectMessageModal, setShowDirectMessageModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [messageMenuPosition, setMessageMenuPosition] = useState({ x: 0, y: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: channels, isLoading: channelsLoading } = useChannels();
  
  // Set initial channel when channels load
  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      // Try to find general channel by slug, otherwise use first channel
      const generalChannel = channels.find(c => c.slug === 'general');
      setSelectedChannelId(generalChannel?.id || channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // Initialize muted channels from notification service
  useEffect(() => {
    if (channels && channels.length > 0) {
      const muted = new Set<string>();
      channels.forEach(channel => {
        if (notificationService.isChannelMuted(channel.id)) {
          muted.add(channel.id);
        }
      });
      setMutedChannels(muted);
    }
  }, [channels]);
  
  const { 
    messages, 
    typingUsers, 
    isConnected, 
    sendMessage, 
    startTyping, 
    stopTyping,
    isLoading: messagesLoading,
    loadMoreMessages,
    hasMore,
    isLoadingMore
  } = useChat(selectedChannelId);

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);
  
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();
  
  const handleEditMessage = (messageId: string, content: string) => {
    editMessage.mutate({ messageId, content });
    setActiveMessageMenu(null);
  };
  
  const handleDeleteMessage = (messageId: string) => {
    deleteMessage.mutate(messageId);
    setActiveMessageMenu(null);
  };

  const handlePinMessage = (messageId: string) => {
    pinMessage.mutate(messageId);
    setActiveMessageMenu(null);
  };

  const handleUnpinMessage = (messageId: string) => {
    unpinMessage.mutate(messageId);
    setActiveMessageMenu(null);
  };
  
  const handleMessageMenuClick = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close any existing menu first
    if (activeMessageMenu === messageId) {
      setActiveMessageMenu(null);
      return;
    }
    
    // Close any other menu and open this one
    setActiveMessageMenu(null);
    setTimeout(() => {
      setActiveMessageMenu(messageId);
      setMessageMenuPosition({ x: e.clientX, y: e.clientY });
    }, 10);
  };
  
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };
  
  const handleToggleMute = () => {
    if (!selectedChannelId) return;
    
    const isMuted = notificationService.toggleChannelMute(selectedChannelId);
    
    // Update React state immediately
    setMutedChannels(prev => {
      const newMuted = new Set(prev);
      if (isMuted) {
        newMuted.add(selectedChannelId);
      } else {
        newMuted.delete(selectedChannelId);
      }
      return newMuted;
    });
    
    if (isMuted) {
      toast.success('Notificações silenciadas para este canal');
    } else {
      toast.success('Notificações ativadas para este canal');
    }
  };
  
  const isChannelMuted = selectedChannelId ? mutedChannels.has(selectedChannelId) : false;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() || uploadedImage) {
      const messageContent = message.trim();
      const messageType = uploadedImage ? 'image' : 'text';
      
      // If there's an image, send it as metadata
      if (uploadedImage) {
        sendMessage(messageContent || 'Imagem enviada', messageType, { imageUrl: uploadedImage });
        setUploadedImage(null);
      } else {
        sendMessage(messageContent);
      }
      
      setMessage('');
      stopTyping();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens.');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setUploadedImage(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    startTyping();
  };

  // Separate public/private channels from direct messages
  const publicChannels = channels?.filter(channel => 
    channel.type !== 'direct' && 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const directChannels = channels?.filter(channel => 
    channel.type === 'direct'
  );

  if (channelsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
          <p className="text-slate-600">Carregando comunidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6 bg-white rounded-2xl shadow-soft overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar canais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Canais</h3>
              <button
                onClick={() => setShowNewChannelModal(true)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {publicChannels?.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedChannelId === channel.id
                      ? 'bg-coral text-white'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash size={16} />
                    <span className="font-medium">{channel.name}</span>
                  </div>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      selectedChannelId === channel.id
                        ? 'bg-white text-coral'
                        : 'bg-coral text-white'
                    }`}>
                      {channel.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mensagens Diretas</h3>
              <button
                onClick={() => setShowDirectMessageModal(true)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {directChannels && directChannels.length > 0 ? (
                directChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedChannelId === channel.id
                        ? 'bg-coral text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {channel.name.substring(0, 2).toUpperCase()}
                      </div>
                      {/* TODO: Add online status indicator */}
                    </div>
                    <span className="font-medium truncate">{channel.name}</span>
                  </button>
                ))
              ) : (
                <button 
                  onClick={() => setShowDirectMessageModal(true)}
                  className="w-full px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle size={16} />
                    <span>Iniciar conversa</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-xs text-slate-600">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedChannel?.type === 'direct' ? (
                <MessageCircle size={20} className="text-slate-400" />
              ) : (
                <Hash size={20} className="text-slate-400" />
              )}
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedChannel?.name || 'general'}
              </h2>
              {selectedChannel?.description && selectedChannel.type !== 'direct' && (
                <span className="text-sm text-slate-500">
                  {selectedChannel.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPinnedMessages(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Ver mensagens fixadas"
              >
                <Pin size={18} />
              </button>
              <button 
                onClick={() => setShowSearchModal(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Buscar mensagens"
              >
                <Search size={18} />
              </button>
              <button 
                onClick={handleToggleMute}
                className={`p-2 hover:bg-slate-100 rounded-lg transition-all ${
                  isChannelMuted ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={isChannelMuted ? 'Ativar notificações' : 'Silenciar notificações'}
              >
                {isChannelMuted ? <BellOff size={18} /> : <Bell size={18} />}
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <Users size={18} />
              </button>
              <button 
                onClick={() => setShowChannelSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Configurações do canal"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Hash size={48} className="mb-4" />
              <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
              <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          ) : (
            <>
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={loadMoreMessages}
                    disabled={isLoadingMore}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      'Carregar mensagens anteriores'
                    )}
                  </button>
                </div>
              )}
              
              {messages.map((msg) => (
              <div 
                key={msg.id} 
                className="flex items-start gap-3 group relative"
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleMessageMenuClick(e, msg.id);
                }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {msg.userName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{msg.userName}</span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(msg.timestamp), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                    {msg.isPinned && (
                      <div className="flex items-center gap-1 text-xs text-coral">
                        <Pin size={12} />
                        <span>Fixada</span>
                      </div>
                    )}
                  </div>
                  {msg.type === 'image' && msg.metadata?.imageUrl ? (
                    <div>
                      <img 
                        src={msg.metadata.imageUrl} 
                        alt="Imagem enviada" 
                        className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.metadata.imageUrl, '_blank')}
                      />
                      {msg.content !== 'Imagem enviada' && (
                        <p className="text-slate-700 break-words mt-2">{msg.content}</p>
                      )}
                    </div>
                  ) : (
                    <MessageContent 
                      content={msg.content}
                      currentUserId={user?.id}
                    />
                  )}
                </div>
                <div className="flex-shrink-0">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMessageMenuClick(e, msg.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-full border-2 border-slate-400 bg-white shadow-md transition-all"
                    title="Opções da mensagem"
                    style={{ zIndex: 999 }}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
                
                {/* Message Actions Menu */}
                <MessageActions
                  messageId={msg.id}
                  userId={msg.userId}
                  currentUserId={user?.id || ''}
                  content={msg.content}
                  isOpen={activeMessageMenu === msg.id}
                  onClose={() => setActiveMessageMenu(null)}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onPin={handlePinMessage}
                  onUnpin={handleUnpinMessage}
                  isPinned={msg.isPinned || false}
                  position={messageMenuPosition}
                />
              </div>
            ))}
              
              {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500 italic">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>
                {Array.from(typingUsers).length === 1 
                  ? 'Alguém está digitando...' 
                  : `${Array.from(typingUsers).length} pessoas estão digitando...`}
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          {/* Image preview */}
          {uploadedImage && (
            <div className="mb-3 relative inline-block">
              <img 
                src={uploadedImage} 
                alt="Preview" 
                className="h-20 rounded-lg border border-slate-200"
              />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* File upload button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Paperclip size={20} />
              )}
            </button>
            
            <div className="flex-1 relative">
              <MentionInput
                value={message}
                onChange={(value) => setMessage(value)}
                onKeyPress={handleKeyPress}
                onInput={handleTyping}
                placeholder={`Mensagem para #${selectedChannel?.name || 'general'}`}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent transition-all"
                channelId={selectedChannelId}
                onMentionSelect={(mentions) => {
                  console.log('Mentions detected:', mentions);
                }}
              />
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Smile size={20} />
              </button>
              
              {/* Emoji Picker */}
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelectEmoji={handleEmojiSelect}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={(!message.trim() && !uploadedImage) || isUploading}
              className={`p-3 rounded-xl transition-all ${
                (message.trim() || uploadedImage) && !isUploading
                  ? 'bg-coral text-white hover:bg-coral-dark shadow-lg shadow-coral/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Channel Modal */}
      <ChannelModal 
        isOpen={showNewChannelModal} 
        onClose={() => setShowNewChannelModal(false)} 
      />

      {/* Direct Message Modal */}
      <DirectMessageModal
        isOpen={showDirectMessageModal}
        onClose={() => setShowDirectMessageModal(false)}
        onSelectChannel={(channelId) => {
          setSelectedChannelId(channelId);
          setShowDirectMessageModal(false);
        }}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        channelId={selectedChannelId}
        onSelectMessage={(channelId) => {
          setSelectedChannelId(channelId);
        }}
      />

      {/* Channel Settings Modal */}
      <ChannelSettings
        isOpen={showChannelSettings}
        onClose={() => setShowChannelSettings(false)}
        channel={selectedChannel}
        onChannelUpdate={() => {
          // Refresh channels after update
          window.location.reload();
        }}
        onChannelDelete={() => {
          // Redirect to first channel after delete
          setSelectedChannelId('');
          window.location.reload();
        }}
      />

      {/* Pinned Messages Modal */}
      <PinnedMessagesModal
        isOpen={showPinnedMessages}
        onClose={() => setShowPinnedMessages(false)}
        channel={selectedChannel}
      />
    </div>
  );
};