import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';

const router = Router();

// Get current user profile (protected route)
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const user = await User.findById(req.user.userId).select('-passwordHash');
    
    if (!user) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
      return;
    }
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        membership: user.membership,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Admin-only route example
router.get('/admin/users', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-passwordHash').limit(100);
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      })),
      total: users.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch users'
    });
  }
});

export default router;