import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { getUserUsage } from '../controllers/usageController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get user usage statistics
router.get('/', getUserUsage);

export { router as usageRoutes };