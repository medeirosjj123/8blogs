import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware';
import { adminAuth } from '../../middleware/adminAuth';
import {
  getContentAnalytics,
  getUserContentStats
} from '../../controllers/analyticsController';

const router = Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(adminAuth);

// Analytics routes
router.get('/content', getContentAnalytics);
router.get('/content/user/:userId', getUserContentStats);

export default router;