import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getDashboardStats,
  getRecentActivities,
  getAchievements,
  getLeaderboard
} from '../controllers/statsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard stats
router.get('/users/stats', getDashboardStats);

// Activities feed
router.get('/activities/recent', getRecentActivities);

// User achievements
router.get('/users/achievements', getAchievements);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

export default router;