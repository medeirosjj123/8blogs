import api from './api';
import type { IApiResponse } from '@tatame/types';
import type { Message, Channel } from './socket.service';

class ChatService {
  async getChannels(): Promise<Channel[]> {
    const response = await api.get<any>('/api/chat/channels');
    return response.data.channels || [];
  }

  async getChannel(channelId: string): Promise<Channel> {
    const response = await api.get<IApiResponse<Channel>>(`/api/chat/channels/${channelId}`);
    return response.data.data!;
  }

  async createChannel(data: {
    name: string;
    description?: string;
    type: 'public' | 'private';
  }): Promise<Channel> {
    const response = await api.post<IApiResponse<Channel>>('/api/chat/channels', data);
    return response.data.data!;
  }

  async joinChannel(channelId: string): Promise<void> {
    await api.post(`/api/chat/channels/${channelId}/join`);
  }

  async leaveChannel(channelId: string): Promise<void> {
    await api.post(`/api/chat/channels/${channelId}/leave`);
  }

  async getMessages(channelId: string, limit = 30, before?: string): Promise<{ messages: Message[], hasMore: boolean }> {
    const params = new URLSearchParams();
    // Request one extra to check if there are more messages
    params.append('limit', (limit + 1).toString());
    if (before) params.append('before', before);
    
    const response = await api.get<any>(
      `/api/chat/channels/${channelId}/messages?${params.toString()}`
    );
    
    // Map the backend response to match frontend Message type
    const messages = response.data.messages || [];
    const hasMore = messages.length > limit;
    
    // Remove the extra message if it exists
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
    
    return {
      messages: messagesToReturn.map((msg: any) => ({
        id: msg.id,
        channelId: msg.channelId,
        userId: typeof msg.userId === 'object' ? msg.userId._id : msg.userId,
        userName: typeof msg.userId === 'object' ? msg.userId.name : 'Unknown',
        content: msg.content,
        type: msg.type || 'text',
        metadata: msg.metadata,
        timestamp: msg.createdAt || msg.timestamp,
        isPinned: msg.isPinned || false
      })),
      hasMore
    };
  }

  async sendMessage(channelId: string, content: string, type: 'text' | 'image' | 'file' = 'text'): Promise<Message> {
    const response = await api.post<IApiResponse<Message>>(
      `/api/chat/channels/${channelId}/messages`,
      { content, type }
    );
    return response.data.data!;
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await api.put<IApiResponse<Message>>(
      `/api/chat/messages/${messageId}`,
      { content }
    );
    return response.data.data!;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/api/chat/messages/${messageId}`);
  }

  async uploadFile(file: File): Promise<{ url: string; type: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<IApiResponse<{ url: string; type: string; size: number }>>(
      '/api/chat/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async getDirectChannel(userId: string): Promise<Channel> {
    const response = await api.get<IApiResponse<Channel>>(`/api/chat/direct/${userId}`);
    return response.data.data!;
  }

  async searchMessages(query: string, channelId?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (channelId) params.append('channelId', channelId);
    
    const response = await api.get<IApiResponse<Message[]>>(
      `/api/chat/messages/search?${params.toString()}`
    );
    return response.data.data || [];
  }

  async getAvailableUsers(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isOnline: boolean;
  }>> {
    const response = await api.get<any>('/api/chat/users');
    return response.data.users || [];
  }

  async getOrCreateDirectChannel(targetUserId: string): Promise<{
    id: string;
    name: string;
    slug: string;
    type: 'direct';
    otherUser: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  }> {
    const response = await api.get<any>(`/api/chat/direct/${targetUserId}`);
    return response.data.channel;
  }

  async pinMessage(messageId: string): Promise<void> {
    await api.post(`/api/chat/messages/${messageId}/pin`);
  }

  async unpinMessage(messageId: string): Promise<void> {
    await api.delete(`/api/chat/messages/${messageId}/pin`);
  }

  async getPinnedMessages(channelId: string): Promise<Message[]> {
    const response = await api.get<any>(`/api/chat/channels/${channelId}/pinned`);
    const messages = response.data.pinnedMessages || [];
    
    return messages.map((msg: any) => ({
      id: msg.id,
      channelId: msg.channelId,
      userId: typeof msg.userId === 'object' ? msg.userId._id : msg.userId,
      userName: typeof msg.userId === 'object' ? msg.userId.name : 'Unknown',
      content: msg.content,
      type: msg.type || 'text',
      metadata: msg.metadata,
      timestamp: msg.createdAt || msg.timestamp,
      isPinned: true
    }));
  }
}

export default new ChatService();