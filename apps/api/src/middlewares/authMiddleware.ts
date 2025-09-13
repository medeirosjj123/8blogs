import { Request, Response, NextFunction } from 'express';
import { verifyJWT, extractBearerToken } from '../utils/auth';
import { User } from '../models/User';
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

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | null = null;
  
  try {
    // Try to get token from Authorization header first
    token = extractBearerToken(req.headers.authorization);
    
    // If not in header, try cookies
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }
    
    // If still no token, try query parameter (for WebSocket)
    if (!token && req.query?.token) {
      token = req.query.token as string;
    }
    
    if (!token) {
      logger.warn({
        url: req.url,
        method: req.method,
        cookies: req.cookies ? Object.keys(req.cookies) : [],
        headers: {
          authorization: req.headers.authorization ? 'present' : 'missing',
          cookie: req.headers.cookie ? 'present' : 'missing'
        },
        remoteAddress: req.ip || req.connection.remoteAddress
      }, 'Authentication failed: No token provided');
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
      return;
    }
    
    const payload = verifyJWT(token);
    
    // Verify user still exists and is active
    const user = await User.findById(payload.userId);
    
    if (!user) {
      logger.warn({
        userId: payload.userId,
        email: payload.email,
        url: req.url,
        method: req.method
      }, 'Authentication failed: User not found in database');
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
      return;
    }
    
    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
    
    next();
  } catch (error) {
    logger.warn({
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.url,
      method: req.method,
      hasToken: !!token,
      tokenSource: req.headers.authorization ? 'header' : req.cookies?.access_token ? 'cookie' : 'query'
    }, 'Authentication failed: Token verification error');
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
      return;
    }
    
    next();
  };
}

// Middleware to require admin role
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
};

// Optional authentication middleware - continues even if no token
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | null = null;
  
  try {
    // Try to get token from Authorization header first
    token = extractBearerToken(req.headers.authorization);
    
    // If not in header, try cookies
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }
    
    // If still no token, try query parameter (for WebSocket)
    if (!token && req.query?.token) {
      token = req.query.token as string;
    }
    
    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }
    
    const payload = verifyJWT(token);
    
    // Verify user still exists and is active
    const user = await User.findById(payload.userId);
    
    if (!user) {
      logger.warn({
        userId: payload.userId,
        email: payload.email,
        url: req.url,
        method: req.method
      }, 'Optional auth failed: User not found in database');
      
      // Continue without authentication
      next();
      return;
    }
    
    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
    
    next();
  } catch (error) {
    logger.warn({
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.url,
      method: req.method,
      hasToken: !!token
    }, 'Optional authentication failed: Invalid token, continuing without auth');
    
    // Continue without authentication even if token is invalid
    next();
  }
}