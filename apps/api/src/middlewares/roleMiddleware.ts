import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
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

type UserRole = 'aluno' | 'mentor' | 'moderador' | 'admin';

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      // Get user from database to ensure we have the latest role
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        res.status(401).json({
          error: 'User not found',
          message: 'User does not exist'
        });
        return;
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(user.role as UserRole)) {
        logger.warn({
          userId: user._id,
          userRole: user.role,
          allowedRoles,
          path: req.path
        }, 'Access denied - insufficient role');
        
        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions to access this resource'
        });
        return;
      }

      // Update req.user with current user data
      req.user.role = user.role;
      next();
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error in role middleware');
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
}

export function requireAdmin() {
  return requireRole(['admin']);
}

export function requireModeratorOrAdmin() {
  return requireRole(['moderador', 'admin']);
}

export function requireMentorOrHigher() {
  return requireRole(['mentor', 'moderador', 'admin']);
}