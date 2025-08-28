import { Request, Response, NextFunction } from 'express';
import { verifyJWT, extractBearerToken } from '../utils/auth';
import { User } from '../models/User';

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
  try {
    // Try to get token from Authorization header first
    let token = extractBearerToken(req.headers.authorization);
    
    // If not in header, try cookies
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }
    
    // If still no token, try query parameter (for WebSocket)
    if (!token && req.query?.token) {
      token = req.query.token as string;
    }
    
    if (!token) {
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