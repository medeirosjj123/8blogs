import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  generateReview,
  getUserReviews,
  getReview,
  updateReview,
  deleteReview,
  getReviewStats,
  publishReview
} from '../controllers/reviewController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Review routes
router.post('/generate', generateReview);
router.get('/stats', getReviewStats);
router.get('/', getUserReviews);
router.get('/:id', getReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/publish', publishReview);

export default router;