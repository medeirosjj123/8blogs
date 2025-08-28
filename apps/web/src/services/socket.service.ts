import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export type Message = {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'image' | 'file';
  metadata?: any;
  timestamp: string;
  isPinned?: boolean;
}

export type Channel = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members?: number;
  lastMessage?: Message;
  unreadCount?: number;
}

export type TypingUser = {
  userId: string;
  userName: string;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    // Disconnect any existing socket first
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    const token = Cookies.get('access_token') || localStorage.getItem('token');
    if (!token) {
      console.error('No token available for socket connection');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    
    console.log('🔌 Connecting to WebSocket server...');
    this.socket = io(apiUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true // Force new connection to avoid reusing
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.emit('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      this.emit('disconnected', {});
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('error', error);
      
      // Handle specific error types
      if (error.code === 'RATE_LIMIT_EXCEEDED' || error.code === 'RATE_LIMIT_COOLDOWN') {
        this.emit('message:rateLimit', error);
      } else {
        this.emit('message:failed', error);
      }
    });

    // Channel events
    this.socket.on('joined:channel', (data: { channelId: string }) => {
      this.emit('channel:joined', data);
    });

    this.socket.on('user:joined', (data: any) => {
      this.emit('user:joined', data);
    });

    this.socket.on('user:left', (data: any) => {
      this.emit('user:left', data);
    });

    // Message events
    this.socket.on('new:message', (message: Message) => {
      this.emit('message:new', message);
    });

    // Typing events
    this.socket.on('user:typing', (data: { channelId: string; userId: string; userName: string }) => {
      const channelTyping = this.typingUsers.get(data.channelId) || new Set();
      channelTyping.add(data.userId);
      this.typingUsers.set(data.channelId, channelTyping);
      this.emit('typing:start', data);
    });

    this.socket.on('user:stopped:typing', (data: { channelId: string; userId: string }) => {
      const channelTyping = this.typingUsers.get(data.channelId);
      if (channelTyping) {
        channelTyping.delete(data.userId);
      }
      this.emit('typing:stop', data);
    });

    this.socket.on('user:disconnected', (data: any) => {
      this.emit('user:disconnected', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChannel(channelId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('join:channel', channelId);
  }

  leaveChannel(channelId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('leave:channel', channelId);
  }

  sendMessage(channelId: string, content: string, type: 'text' | 'image' | 'file' = 'text', metadata?: any) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      this.emit('message:failed', { channelId, content, error: 'Not connected' });
      return;
    }
    
    console.log(`📤 Sending message to channel ${channelId}: "${content}"`);
    this.socket.emit('send:message', {
      channelId,
      content,
      type,
      metadata
    });
  }

  startTyping(channelId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:start', channelId);
  }

  stopTyping(channelId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:stop', channelId);
  }

  getTypingUsers(channelId: string): Set<string> {
    return this.typingUsers.get(channelId) || new Set();
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new SocketService();