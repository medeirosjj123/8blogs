import Redis from 'ioredis';
import pino from 'pino';

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

class RedisClient {
  private static instance: Redis | null = null;
  private static pubClient: Redis | null = null;
  private static subClient: Redis | null = null;
  private static isConnected: boolean = false;
  private static connectionAttempts: number = 0;
  private static maxRetries: number = 5;

  /**
   * Get the main Redis client instance
   */
  static getInstance(): Redis {
    if (!this.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          this.connectionAttempts = times;
          
          if (times > this.maxRetries) {
            logger.error(`Redis connection failed after ${times} attempts`);
            this.isConnected = false;
            return null;
          }
          
          const delay = Math.min(times * 100, 3000);
          logger.info(`Retrying Redis connection in ${delay}ms (attempt ${times}/${this.maxRetries})`);
          return delay;
        },
        enableOfflineQueue: true,
        lazyConnect: false,
        connectionName: 'tatame-main',
        showFriendlyErrorStack: process.env.NODE_ENV === 'development'
      });

      // Connection event handlers
      this.instance.on('connect', () => {
        logger.info('✅ Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.instance.on('ready', () => {
        logger.info('✅ Redis is ready to accept commands');
      });

      this.instance.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED' || this.connectionAttempts === 1) {
          logger.error({ error: err }, 'Redis connection error');
        }
        this.isConnected = false;
      });

      this.instance.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.instance.on('reconnecting', (delay: number) => {
        logger.info(`Reconnecting to Redis in ${delay}ms`);
      });
    }

    return this.instance;
  }

  /**
   * Get pub/sub clients for Socket.IO adapter
   */
  static getPubSubClients(): { pubClient: Redis; subClient: Redis } {
    if (!this.pubClient || !this.subClient) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.pubClient = new Redis(redisUrl, {
        connectionName: 'tatame-pub',
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        lazyConnect: false
      });
      
      this.subClient = new Redis(redisUrl, {
        connectionName: 'tatame-sub',
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        lazyConnect: false
      });

      this.pubClient.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED') {
          logger.error({ error: err }, 'Redis PUB client error');
        }
      });

      this.subClient.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED') {
          logger.error({ error: err }, 'Redis SUB client error');
        }
      });
    }

    return { pubClient: this.pubClient, subClient: this.subClient };
  }

  /**
   * Check if Redis is connected
   */
  static isHealthy(): boolean {
    // Check if instance exists and is ready
    if (!this.instance) return false;
    return this.instance.status === 'ready';
  }

  /**
   * Get connection info
   */
  static async getInfo(): Promise<{
    connected: boolean;
    attempts: number;
    memory?: string;
    clients?: number;
    uptime?: number;
  }> {
    const info = {
      connected: this.isHealthy(),
      attempts: this.connectionAttempts
    };

    if (this.isHealthy() && this.instance) {
      try {
        const serverInfo = await this.instance.info('memory');
        const memoryMatch = serverInfo.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          info.memory = memoryMatch[1].trim();
        }

        const clientsInfo = await this.instance.info('clients');
        const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
        if (clientsMatch) {
          info.clients = parseInt(clientsMatch[1]);
        }

        const statsInfo = await this.instance.info('stats');
        const uptimeMatch = statsInfo.match(/uptime_in_seconds:(\d+)/);
        if (uptimeMatch) {
          info.uptime = parseInt(uptimeMatch[1]);
        }
      } catch (error) {
        logger.error({ error }, 'Error getting Redis info');
      }
    }

    return info;
  }

  /**
   * Gracefully disconnect all Redis connections
   */
  static async disconnect(): Promise<void> {
    const clients = [this.instance, this.pubClient, this.subClient].filter(Boolean);
    
    await Promise.all(
      clients.map(client => {
        return new Promise<void>((resolve) => {
          if (client) {
            client.quit((err) => {
              if (err) {
                logger.error({ error: err }, 'Error disconnecting Redis client');
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      })
    );

    this.instance = null;
    this.pubClient = null;
    this.subClient = null;
    this.isConnected = false;
    logger.info('All Redis connections closed');
  }

  /**
   * Flush all Redis data (use with caution!)
   */
  static async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush Redis in production');
    }
    
    const client = this.getInstance();
    await client.flushall();
    logger.warn('⚠️  All Redis data has been flushed');
  }
}

// Export the Redis client instance and utility functions
export const redis = RedisClient.getInstance();
export const getRedisClient = () => RedisClient.getInstance();
export const getPubSubClients = () => RedisClient.getPubSubClients();
export const isRedisHealthy = () => RedisClient.isHealthy();
export const getRedisInfo = () => RedisClient.getInfo();
export const disconnectRedis = () => RedisClient.disconnect();
export const flushRedis = () => RedisClient.flushAll();

export default RedisClient;