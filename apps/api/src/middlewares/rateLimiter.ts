import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
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

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  message?: string; // Error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  keyGenerator?: (req: Request | AuthRequest) => string; // Custom key generator
  prefix?: string; // Redis key prefix
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 10, // 10 requests default
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    prefix = 'ratelimit',
    keyGenerator = (req: Request | AuthRequest) => {
      // Use user ID if authenticated, otherwise use IP
      const authReq = req as AuthRequest;
      return authReq.user?.userId || req.ip || 'unknown';
    }
  } = options;

  return async (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    const redis = getRedisClient();
    const identifier = keyGenerator(req);
    const key = `${prefix}:${identifier}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();
      
      // Increment the counter
      pipeline.incr(key);
      
      // Set expiry only if key is new (doesn't reset expiry on increment)
      pipeline.expire(key, windowSeconds, 'NX');
      
      // Get TTL to calculate reset time
      pipeline.ttl(key);
      
      const results = await pipeline.exec();
      
      if (!results) {
        // Redis error, fail open (allow request)
        logger.error('Redis pipeline returned null');
        return next();
      }

      const count = results[0][1] as number;
      const ttl = results[2][1] as number;
      
      // Calculate reset time
      const now = Date.now();
      const resetTime = now + (ttl > 0 ? ttl * 1000 : windowMs);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
      res.setHeader('X-RateLimit-Reset-After', Math.max(0, ttl).toString());

      // Check if limit exceeded
      if (count > maxRequests) {
        res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfter: ttl > 0 ? ttl : Math.ceil(windowMs / 1000)
        });
        return;
      }

      // If skipSuccessfulRequests is true, decrement on successful response
      if (skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode < 400) {
            // Decrement counter for successful requests
            redis.decr(key).catch(err => {
              logger.error({ error: err }, 'Failed to decrement rate limit counter');
            });
          }
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      // Redis error, fail open (allow request)
      logger.error({ error }, 'Redis rate limiter error - failing open');
      next();
    }
  };
}

// Advanced sliding window rate limiter using Redis sorted sets
export function createSlidingWindowRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000,
    maxRequests = 10,
    message = 'Too many requests, please try again later.',
    prefix = 'sliding',
    keyGenerator = (req: Request | AuthRequest) => {
      const authReq = req as AuthRequest;
      return authReq.user?.userId || req.ip || 'unknown';
    }
  } = options;

  return async (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    const redis = getRedisClient();
    const identifier = keyGenerator(req);
    const key = `${prefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      
      // Add current request with current timestamp as score
      const requestId = `${now}-${Math.random()}`;
      pipeline.zadd(key, now, requestId);
      
      // Count requests in current window
      pipeline.zcount(key, windowStart, '+inf');
      
      // Set expiry for cleanup
      pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);
      
      const results = await pipeline.exec();
      
      if (!results) {
        logger.error('Redis pipeline returned null');
        return next();
      }

      const count = results[2][1] as number;
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // Check if limit exceeded
      if (count > maxRequests) {
        // Remove the request we just added since it exceeds the limit
        await redis.zrem(key, requestId);
        
        res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Redis sliding window rate limiter error - failing open');
      next();
    }
  };
}

// Specific rate limiters for different endpoints
export const messageRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 20, // 20 messages per minute
  message: 'You are sending messages too quickly. Please wait a moment.',
  prefix: 'msg'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true, // Only count failed attempts
  prefix: 'auth'
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'API rate limit exceeded. Please slow down.',
  prefix: 'api'
});

// Utility function to reset rate limit for a specific key
export async function resetRateLimit(identifier: string, prefix: string = 'ratelimit'): Promise<void> {
  const redis = getRedisClient();
  const key = `${prefix}:${identifier}`;
  
  try {
    await redis.del(key);
    logger.info({ key }, 'Rate limit reset');
  } catch (error) {
    logger.error({ error, key }, 'Failed to reset rate limit');
  }
}

// Utility function to get current rate limit status
export async function getRateLimitStatus(
  identifier: string, 
  prefix: string = 'ratelimit'
): Promise<{ count: number; ttl: number } | null> {
  const redis = getRedisClient();
  const key = `${prefix}:${identifier}`;
  
  try {
    const pipeline = redis.pipeline();
    pipeline.get(key);
    pipeline.ttl(key);
    
    const results = await pipeline.exec();
    
    if (!results) return null;
    
    const count = parseInt(results[0][1] as string) || 0;
    const ttl = results[1][1] as number;
    
    return { count, ttl };
  } catch (error) {
    logger.error({ error, key }, 'Failed to get rate limit status');
    return null;
  }
}