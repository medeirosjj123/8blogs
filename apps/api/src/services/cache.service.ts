import { getRedisClient } from '../utils/redis';
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

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

class CacheService {
  private defaultTTL = 3600; // 1 hour default
  private prefix = 'cache';

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const redis = getRedisClient();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      const value = await redis.get(fullKey);
      if (!value) return null;

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      logger.error({ error, key: fullKey }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const redis = getRedisClient();
    const fullKey = this.buildKey(key, options.prefix);
    const ttl = options.ttl || this.defaultTTL;

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttl > 0) {
        await redis.set(fullKey, serialized, 'EX', ttl);
      } else {
        await redis.set(fullKey, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error({ error, key: fullKey }, 'Cache set error');
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const redis = getRedisClient();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      const result = await redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error({ error, key: fullKey }, 'Cache delete error');
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const redis = getRedisClient();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      const result = await redis.exists(fullKey);
      return result > 0;
    } catch (error) {
      logger.error({ error, key: fullKey }, 'Cache exists error');
      return false;
    }
  }

  /**
   * Get or set a value in cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      logger.debug({ key }, 'Cache hit');
      return cached;
    }

    // Cache miss, call factory function
    logger.debug({ key }, 'Cache miss, fetching from source');
    try {
      const value = await factory();
      
      // Store in cache for next time
      await this.set(key, value, options);
      
      return value;
    } catch (error) {
      logger.error({ error, key }, 'Factory function error in getOrSet');
      return null;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const redis = getRedisClient();
    const fullPattern = this.buildKey(pattern, this.prefix);

    try {
      const keys = await redis.keys(fullPattern);
      if (keys.length === 0) return 0;

      const result = await redis.del(...keys);
      logger.info({ pattern: fullPattern, count: result }, 'Cache invalidated by pattern');
      return result;
    } catch (error) {
      logger.error({ error, pattern: fullPattern }, 'Cache invalidate pattern error');
      return 0;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    const redis = getRedisClient();
    const fullKeys = keys.map(k => this.buildKey(k, options.prefix));

    try {
      const values = await redis.mget(...fullKeys);
      
      return values.map(value => {
        if (!value) return null;
        
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      logger.error({ error, keys: fullKeys }, 'Cache mget error');
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(entries: Array<{ key: string; value: T }>, options: CacheOptions = {}): Promise<boolean> {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    const ttl = options.ttl || this.defaultTTL;

    try {
      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, options.prefix);
        const serialized = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
        
        if (ttl > 0) {
          pipeline.set(fullKey, serialized, 'EX', ttl);
        } else {
          pipeline.set(fullKey, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error({ error }, 'Cache mset error');
      return false;
    }
  }

  /**
   * Increment a counter in cache
   */
  async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    const redis = getRedisClient();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      const result = await redis.incrby(fullKey, amount);
      
      // Set TTL if specified and key is new
      if (options.ttl && options.ttl > 0) {
        await redis.expire(fullKey, options.ttl, 'NX');
      }
      
      return result;
    } catch (error) {
      logger.error({ error, key: fullKey }, 'Cache increment error');
      return 0;
    }
  }

  /**
   * Build a full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.prefix;
    return `${keyPrefix}:${key}`;
  }
}

// Specific cache instances for different purposes
export const cache = new CacheService();

// User session cache
export const sessionCache = {
  async get(userId: string) {
    return cache.get(`session:${userId}`, { prefix: 'user', ttl: 3600 });
  },
  
  async set(userId: string, data: any, ttl: number = 3600) {
    return cache.set(`session:${userId}`, data, { prefix: 'user', ttl });
  },
  
  async delete(userId: string) {
    return cache.delete(`session:${userId}`, { prefix: 'user' });
  }
};

// Channel cache
export const channelCache = {
  async get(channelId: string) {
    return cache.get(`channel:${channelId}`, { prefix: 'channel', ttl: 300 });
  },
  
  async set(channelId: string, data: any) {
    return cache.set(`channel:${channelId}`, data, { prefix: 'channel', ttl: 300 });
  },
  
  async invalidate(channelId: string) {
    return cache.delete(`channel:${channelId}`, { prefix: 'channel' });
  },
  
  async invalidateAll() {
    return cache.invalidatePattern('channel:*');
  }
};

// User profile cache
export const userCache = {
  async get(userId: string) {
    return cache.get(`profile:${userId}`, { prefix: 'user', ttl: 600 });
  },
  
  async set(userId: string, data: any) {
    return cache.set(`profile:${userId}`, data, { prefix: 'user', ttl: 600 });
  },
  
  async invalidate(userId: string) {
    return cache.delete(`profile:${userId}`, { prefix: 'user' });
  }
};

// Message cache for recent messages
export const messageCache = {
  async getRecent(channelId: string, limit: number = 50) {
    return cache.get<any[]>(`recent:${channelId}:${limit}`, { prefix: 'messages', ttl: 60 });
  },
  
  async setRecent(channelId: string, messages: any[], limit: number = 50) {
    return cache.set(`recent:${channelId}:${limit}`, messages, { prefix: 'messages', ttl: 60 });
  },
  
  async invalidate(channelId: string) {
    return cache.invalidatePattern(`messages:recent:${channelId}:*`);
  }
};

// Online users tracking
export const presenceCache = {
  async setOnline(userId: string) {
    const redis = getRedisClient();
    const key = `presence:online`;
    const timestamp = Date.now();
    
    await redis.zadd(key, timestamp, userId);
    // Remove users who haven't been seen in 5 minutes
    await redis.zremrangebyscore(key, '-inf', timestamp - 300000);
  },
  
  async setOffline(userId: string) {
    const redis = getRedisClient();
    await redis.zrem('presence:online', userId);
  },
  
  async getOnlineUsers(): Promise<string[]> {
    const redis = getRedisClient();
    const timestamp = Date.now();
    
    // Get users active in the last 5 minutes
    const users = await redis.zrangebyscore('presence:online', timestamp - 300000, '+inf');
    return users;
  },
  
  async isOnline(userId: string): Promise<boolean> {
    const redis = getRedisClient();
    const score = await redis.zscore('presence:online', userId);
    
    if (!score) return false;
    
    // Check if last activity was within 5 minutes
    return Date.now() - parseInt(score) < 300000;
  }
};

export default cache;