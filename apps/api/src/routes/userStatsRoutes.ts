import express from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { getUserStats, getUserActivity } from '../controllers/userStatsController';

const router = express.Router();

// Get user statistics
router.get('/stats', authenticate, getUserStats);

// Get user activity timeline
router.get('/activity', authenticate, getUserActivity);

export default router;