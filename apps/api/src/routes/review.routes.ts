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
  bulkPublishReviews,
  queueBulkReviewGeneration,
  getJobStatus,
  getUserJobs,
  getQueueStats
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

// ========================= QUEUE-BASED ENDPOINTS =========================

// Queue bulk review generation (NEW - replaces /bulk-generate for async processing)
router.post('/queue-bulk-generate', 
  (req, res, next) => {
    const { reviews } = req.body;
    const bulkCount = Array.isArray(reviews) ? reviews.length : 1;
    return checkUsageLimit({ action: 'bulk_review_generation', bulkCount })(req, res, next);
  },
  queueBulkReviewGeneration,
  trackUsage('bulk_reviews_generated')
);

// Job status and management
router.get('/jobs/:jobId', getJobStatus); // Get specific job status
router.get('/jobs', getUserJobs); // Get user's jobs
router.get('/queue/stats', getQueueStats); // Queue statistics (admin)

export default router;