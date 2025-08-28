import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { Message } from './models/Message';
import { Channel } from './models/Channel';
import mongoose from 'mongoose';
import { getPubSubClients, getRedisClient } from './utils/redis';
import { handleTerminalSocket } from './controllers/terminalController';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userRole?: string;
}

// Rate limiting for socket messages
const SOCKET_RATE_LIMIT = {
  messages: 15, // Max messages per window
  window: 60000, // Time window (1 minute)
  cooldown: 500, // Minimum time between messages (500ms)
  prefix: 'socketio:ratelimit'
};

export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: function (origin: any, callback: any) {
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174'
        ];
        
        // Allow requests with no origin (like mobile apps or postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          logger.warn(`Socket.IO CORS blocked origin: ${origin}`);
          callback(null, true); // Allow in dev, but log warning
        }
      },
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Configure Redis adapter for scaling
  try {
    const { pubClient, subClient } = getPubSubClients();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.IO configured with Redis adapter for horizontal scaling');
  } catch (error) {
    logger.error({ error }, 'Failed to configure Redis adapter - using default in-memory adapter');
  }

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        // In development, allow anonymous connections with limited access
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Socket connection without authentication (dev mode)');
          socket.userId = 'anonymous';
          socket.userName = 'Anonymous User';
          socket.userRole = 'guest';
          return next();
        }
        return next(new Error('Authentication required'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tatame-secret-key-2024') as any;
      
      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.userName = decoded.name || decoded.email;
      socket.userRole = decoded.role;
      
      logger.info({ userId: socket.userId }, 'Socket authenticated');
      
      next();
    } catch (error) {
      logger.error({ error }, 'Socket authentication failed');
      
      // In development, allow connection but mark as guest
      if (process.env.NODE_ENV === 'development') {
        socket.userId = 'guest';
        socket.userName = 'Guest User';
        socket.userRole = 'guest';
        return next();
      }
      
      return next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ 
      socketId: socket.id, 
      userId: socket.userId 
    }, 'User connected');

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle joining installation room (for live output)
    const installationId = socket.handshake.query.installationId as string;
    if (installationId) {
      socket.join(`installation:${installationId}`);
      logger.info({ 
        userId: socket.userId, 
        installationId 
      }, 'User joined installation room');
    }

    // Handle joining channels
    socket.on('join:channel', async (channelId: string) => {
      try {
        // TODO: Verify user has access to this channel
        socket.join(`channel:${channelId}`);
        
        logger.info({ 
          userId: socket.userId, 
          channelId 
        }, 'User joined channel');
        
        // Notify user they've joined
        socket.emit('joined:channel', { channelId });
        
        // Notify others in channel
        socket.to(`channel:${channelId}`).emit('user:joined', {
          channelId,
          userId: socket.userId,
          userName: socket.userName
        });
      } catch (error) {
        logger.error({ error }, 'Error joining channel');
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Handle leaving channels
    socket.on('leave:channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      
      logger.info({ 
        userId: socket.userId, 
        channelId 
      }, 'User left channel');
      
      // Notify others in channel
      socket.to(`channel:${channelId}`).emit('user:left', {
        channelId,
        userId: socket.userId,
        userName: socket.userName
      });
    });

    // Handle sending messages
    socket.on('send:message', async (data: {
      channelId: string;
      content: string;
      type?: 'text' | 'image' | 'file';
      metadata?: any;
    }) => {
      try {
        // Check rate limiting with Redis
        const redis = getRedisClient();
        const now = Date.now();
        const rateLimitKey = `${SOCKET_RATE_LIMIT.prefix}:${socket.userId}`;
        
        // Check cooldown with Redis
        const lastMessageTime = await redis.get(`${rateLimitKey}:last`);
        if (lastMessageTime && now - parseInt(lastMessageTime) < SOCKET_RATE_LIMIT.cooldown) {
          socket.emit('error', { 
            message: 'You are sending messages too quickly. Please slow down.',
            code: 'RATE_LIMIT_COOLDOWN'
          });
          return;
        }
        
        // Check message count with Redis sliding window
        const windowStart = now - SOCKET_RATE_LIMIT.window;
        
        // Clean old entries and count current window
        await redis.zremrangebyscore(rateLimitKey, '-inf', windowStart);
        const messageCount = await redis.zcard(rateLimitKey);
        
        if (messageCount >= SOCKET_RATE_LIMIT.messages) {
          socket.emit('error', { 
            message: 'Message limit reached. Please wait a moment.',
            code: 'RATE_LIMIT_EXCEEDED'
          });
          return;
        }
        
        const { channelId, content, type = 'text', metadata } = data;
        
        // Find the channel
        const channel = await Channel.findOne({
          $or: [
            mongoose.Types.ObjectId.isValid(channelId) ? { _id: channelId } : {},
            { slug: channelId }
          ].filter(q => Object.keys(q).length > 0)
        });
        
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }
        
        // Check if user has access to channel
        const userObjectId = new mongoose.Types.ObjectId(socket.userId!);
        if (channel.type !== 'public' && !channel.isMember(userObjectId)) {
          socket.emit('error', { message: 'You do not have access to this channel' });
          return;
        }
        
        logger.info({ 
          userId: socket.userId, 
          channelId: channel._id.toString(),
          content: content.substring(0, 50) + '...',
          channelName: channel.name
        }, 'Attempting to save WebSocket message to database');
        
        // Save message to database
        const message = new Message({
          channelId: channel._id,
          userId: userObjectId, // Use ObjectId instead of string
          content,
          type,
          metadata
        });
        
        await message.save();
        
        logger.info({ 
          messageId: message._id,
          userId: socket.userId, 
          channelId: channel._id.toString()
        }, '✅ WebSocket message saved successfully to database');
        
        // Update channel's last message info
        channel.lastMessageAt = message.createdAt;
        channel.lastMessagePreview = content.substring(0, 100);
        await channel.save();
        
        // Populate user info for the message
        await message.populate('userId', 'name email');
        
        // Create formatted message for socket emission
        const formattedMessage = {
          id: message._id.toString(),
          channelId: channel._id.toString(),
          userId: socket.userId!,
          userName: socket.userName!,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          timestamp: message.createdAt.toISOString()
        };
        
        // Emit to all users in channel (including sender)
        io.to(`channel:${channel._id}`).emit('new:message', formattedMessage);
        
        // Update rate limiting in Redis (reuse existing variables)
        
        // Add to sliding window
        await redis.zadd(rateLimitKey, now, `${now}-${message._id}`);
        await redis.expire(rateLimitKey, Math.ceil(SOCKET_RATE_LIMIT.window / 1000));
        
        // Update last message time
        await redis.set(`${rateLimitKey}:last`, now, 'EX', Math.ceil(SOCKET_RATE_LIMIT.window / 1000));
        
        logger.info({ 
          userId: socket.userId, 
          channelId: channel._id,
          messageId: message._id 
        }, 'Message sent and saved');
        
      } catch (error) {
        logger.error({ error }, 'Error sending message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('user:typing', {
        channelId,
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on('typing:stop', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('user:stopped:typing', {
        channelId,
        userId: socket.userId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info({ 
        socketId: socket.id, 
        userId: socket.userId 
      }, 'User disconnected');
      
      // Notify all channels user was in
      socket.rooms.forEach(room => {
        if (room.startsWith('channel:')) {
          socket.to(room).emit('user:disconnected', {
            userId: socket.userId,
            userName: socket.userName
          });
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ 
        error, 
        userId: socket.userId 
      }, 'Socket error');
    });
  });

  // Setup terminal namespace for SSH connections
  const terminalNamespace = io.of('/terminal');
  
  terminalNamespace.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tatame-secret-key-2024') as any;
      socket.userId = decoded.userId;
      socket.userName = decoded.name || decoded.email;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication'));
    }
  });
  
  terminalNamespace.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId }, 'Terminal namespace connection');
    handleTerminalSocket(socket);
  });
  
  logger.info('🖥️ SSH Terminal service initialized');

  return io;
}