import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { checkUsageLimit, trackUsage } from '../middlewares/usageLimitsMiddleware';
import {
  generateReview,
  generateBulkReviews,
  getUserReviews,
  getReview,
  updateReview,
  deleteReview,
  getReviewStats,
  publishReview,
  bulkPublishReviews
} from '../controllers/reviewController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Review routes
router.post('/generate', 
  checkUsageLimit({ action: 'review_generation' }),
  generateReview,
  trackUsage('review_generated')
);
// Bulk generate requires a dynamic middleware to check the bulk count
router.post('/bulk-generate', 
  (req, res, next) => {
    const { reviews } = req.body;
    const bulkCount = Array.isArray(reviews) ? reviews.length : 1;
    return checkUsageLimit({ action: 'bulk_review_generation', bulkCount })(req, res, next);
  },
  generateBulkReviews,
  trackUsage('bulk_reviews_generated')
);
router.get('/stats', getReviewStats);
router.get('/', getUserReviews);
router.get('/:id', getReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/publish', publishReview);
router.post('/publish-draft', publishReview); // New endpoint for bulk draft creation
router.post('/bulk-publish', bulkPublishReviews); // New endpoint for bulk publishing

export default router;