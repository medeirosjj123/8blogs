import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import socketService from '../services/socket.service';
import type { Message, Channel } from '../services/socket.service';
import chatService from '../services/chat.service';
import { useAuth } from '../contexts/AuthContext';
import notificationService from '../services/notification.service';
import toast from 'react-hot-toast';

export const useChannels = () => {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => chatService.getChannels(),
  });
};

export const useChannel = (channelId: string) => {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => chatService.getChannel(channelId),
    enabled: !!channelId,
  });
};

export const useMessages = (channelId: string, before?: string) => {
  return useQuery({
    queryKey: ['messages', channelId, before],
    queryFn: () => chatService.getMessages(channelId, 30, before),
    enabled: !!channelId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus to prevent spam
    refetchOnMount: false, // Don't always refetch on mount
  });
};

export const useChat = (channelId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Rate limiting configuration
  const RATE_LIMIT_MESSAGES = 10; // Maximum messages
  const RATE_LIMIT_WINDOW = 60000; // Time window in ms (1 minute)
  const RATE_LIMIT_COOLDOWN = 1000; // Minimum time between messages (1 second)

  // Fetch initial messages
  const { data: initialData, isLoading } = useMessages(channelId);

  // Set initial messages
  useEffect(() => {
    if (initialData) {
      setMessages(initialData.messages);
      setHasMore(initialData.hasMore);
    } else if (!isLoading && channelId) {
      // Clear messages when switching to a channel with no messages
      setMessages([]);
      setHasMore(true);
    }
  }, [initialData, isLoading, channelId]);

  // Socket connection and event handlers
  useEffect(() => {
    // Connect to socket
    socketService.connect();
    setIsConnected(socketService.isConnected());

    // Join channel
    if (channelId) {
      socketService.joinChannel(channelId);
    }

    // Event handlers
    const handleConnected = () => {
      setIsConnected(true);
      if (channelId) {
        socketService.joinChannel(channelId);
      }
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleNewMessage = (message: Message) => {
      // If message is from another user, invalidate cache to ensure it appears when switching back
      if (message.userId !== user?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ['messages', message.channelId] 
        });
      }
      
      if (message.channelId === channelId) {
        setMessages(prev => {
          // Check if this message is replacing an optimistic message from the same user
          const isFromCurrentUser = message.userId === user?.id;
          if (isFromCurrentUser) {
            // Find and replace optimistic message with the real one
            const optimisticIndex = prev.findIndex(m => 
              m.id.startsWith('temp_') && 
              m.userId === user?.id &&
              m.content === message.content &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000 // Within 5 seconds
            );
            
            if (optimisticIndex !== -1) {
              // Also update the React Query cache to replace optimistic message
              queryClient.setQueryData(['messages', channelId, undefined], (oldData: any) => {
                if (!oldData) return oldData;
                
                const optimisticCacheIndex = oldData.messages.findIndex((m: Message) => 
                  m.id.startsWith('temp_') && 
                  m.userId === user?.id &&
                  m.content === message.content
                );
                
                if (optimisticCacheIndex !== -1) {
                  const newMessages = [...oldData.messages];
                  newMessages[optimisticCacheIndex] = message;
                  return { ...oldData, messages: newMessages };
                }
                
                return oldData;
              });
              
              // Replace optimistic message with real message
              const newMessages = [...prev];
              newMessages[optimisticIndex] = message;
              return newMessages;
            }
          }
          
          // Check for duplicate messages (prevent double messages)
          const existingMessage = prev.find(m => m.id === message.id);
          if (existingMessage) {
            return prev; // Message already exists, don't add duplicate
          }
          
          // Add new message normally
          return [...prev, message];
        });
        
        // Show notification if message is from another user
        if (message.userId !== user?.id && document.visibilityState === 'hidden') {
          const channel = queryClient.getQueryData<Channel[]>(['channels'])
            ?.find(c => c.id === channelId);
          
          if (channel) {
            if (channel.type === 'direct') {
              notificationService.showDirectMessageNotification(
                message.userName,
                message.content,
                channelId
              );
            } else {
              notificationService.showMessageNotification(
                channel.name,
                channelId,
                message.userName,
                message.content
              );
            }
            
            // Play sound if not muted
            if (!notificationService.isChannelMuted(channelId)) {
              notificationService.playSound();
            }
          }
        }
      }
    };

    const handleTypingStart = (data: { channelId: string; userId: string }) => {
      if (data.channelId === channelId && data.userId !== user?.id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      }
    };

    const handleTypingStop = (data: { channelId: string; userId: string }) => {
      if (data.channelId === channelId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    const handleUserJoined = (data: any) => {
      if (data.channelId === channelId) {
        toast(`${data.userName} entrou no canal`, { icon: '👋' });
      }
    };

    const handleUserLeft = (data: any) => {
      if (data.channelId === channelId) {
        toast(`${data.userName} saiu do canal`, { icon: '👋' });
      }
    };

    // Register event listeners
    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);
    socketService.on('message:new', handleNewMessage);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);
    socketService.on('user:joined', handleUserJoined);
    socketService.on('user:left', handleUserLeft);

    // Cleanup
    return () => {
      if (channelId) {
        socketService.leaveChannel(channelId);
      }
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
      socketService.off('message:new', handleNewMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
      socketService.off('user:joined', handleUserJoined);
      socketService.off('user:left', handleUserLeft);
    };
  }, [channelId, user?.id]);

  // Reset rate limit counter every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageCount(0);
    }, RATE_LIMIT_WINDOW);
    
    return () => clearInterval(interval);
  }, [RATE_LIMIT_WINDOW]);

  // Send message with rate limiting
  const sendMessage = useCallback((content: string, type: 'text' | 'image' | 'file' = 'text', metadata?: any) => {
    if (!channelId || !content.trim() || !user) return;
    
    const now = Date.now();
    
    // Check cooldown between messages
    if (now - lastMessageTime < RATE_LIMIT_COOLDOWN) {
      toast.error('Aguarde um momento antes de enviar outra mensagem');
      return;
    }
    
    // Check rate limit
    if (messageCount >= RATE_LIMIT_MESSAGES) {
      toast.error(`Limite de ${RATE_LIMIT_MESSAGES} mensagens por minuto atingido. Aguarde um momento.`);
      return;
    }
    
    // Create optimistic message for instant UI update
    const optimisticMessage: Message = {
      id: `temp_${Date.now()}`, // Temporary ID
      channelId,
      userId: user.id,
      userName: user.name,
      content: content.trim(),
      type,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    // Add optimistic message to UI immediately (Slack-like instant feel)
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Update React Query cache immediately so message persists when switching channels
    queryClient.setQueryData(['messages', channelId, undefined], (oldData: any) => {
      if (!oldData) return { messages: [optimisticMessage], hasMore: false };
      
      return {
        ...oldData,
        messages: [...oldData.messages, optimisticMessage]
      };
    });
    
    // Send the message via WebSocket
    socketService.sendMessage(channelId, content, type, metadata);
    
    // Update rate limiting counters
    setMessageCount(prev => prev + 1);
    setLastMessageTime(now);
  }, [channelId, messageCount, lastMessageTime, RATE_LIMIT_MESSAGES, RATE_LIMIT_COOLDOWN, user]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!channelId) return;
    
    socketService.startTyping(channelId);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [channelId]);

  const stopTyping = useCallback(() => {
    if (!channelId) return;
    
    socketService.stopTyping(channelId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [channelId]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!channelId || !hasMore || isLoadingMore || messages.length === 0) return;
    
    setIsLoadingMore(true);
    try {
      // Get the timestamp of the oldest message
      const oldestMessage = messages[0];
      const result = await chatService.getMessages(channelId, 30, oldestMessage.timestamp);
      
      if (result.messages.length > 0) {
        // Prepend older messages to the beginning
        setMessages(prev => [...result.messages, ...prev]);
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Erro ao carregar mensagens anteriores');
    } finally {
      setIsLoadingMore(false);
    }
  }, [channelId, hasMore, isLoadingMore, messages]);

  return {
    messages,
    typingUsers,
    isConnected,
    isLoading,
    sendMessage,
    startTyping,
    stopTyping,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
  };
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string; type: 'public' | 'private' }) => 
      chatService.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canal criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar canal');
    },
  });
};

export const useJoinChannel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (channelId: string) => chatService.joinChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Você entrou no canal!');
    },
    onError: () => {
      toast.error('Erro ao entrar no canal');
    },
  });
};

export const useLeaveChannel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (channelId: string) => chatService.leaveChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Você saiu do canal');
    },
    onError: () => {
      toast.error('Erro ao sair do canal');
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) => 
      chatService.editMessage(messageId, content),
    onSuccess: (_, variables) => {
      // Invalidate messages for the channel
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Mensagem editada');
    },
    onError: () => {
      toast.error('Erro ao editar mensagem');
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: () => {
      // Invalidate messages for the channel
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Mensagem excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir mensagem');
    },
  });
};

export const usePinMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (messageId: string) => chatService.pinMessage(messageId),
    onSuccess: () => {
      // Invalidate both messages and pinned messages
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedMessages'] });
      toast.success('Mensagem fixada');
    },
    onError: () => {
      toast.error('Erro ao fixar mensagem');
    },
  });
};

export const useUnpinMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (messageId: string) => chatService.unpinMessage(messageId),
    onSuccess: () => {
      // Invalidate both messages and pinned messages
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedMessages'] });
      toast.success('Mensagem removida dos fixados');
    },
    onError: () => {
      toast.error('Erro ao remover fixação da mensagem');
    },
  });
};

export const usePinnedMessages = (channelId: string) => {
  return useQuery({
    queryKey: ['pinnedMessages', channelId],
    queryFn: () => chatService.getPinnedMessages(channelId),
    enabled: !!channelId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
};