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

export const adminRequired = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Get user from database to check role
    const user = await User.findById(userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      logger.warn({ 
        userId: user._id, 
        email: user.email,
        role: user.role,
        attemptedRoute: req.path
      }, 'Non-admin user attempted to access admin route');

      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    // User is admin, continue
    next();
  } catch (error) {
    logger.error({ error }, 'Error in admin middleware');
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};