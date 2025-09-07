import { Router } from 'express';
import { handleKiwifyWebhook, checkOrderStatus, resendCredentials } from '../controllers/webhookController';
import { createRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Rate limiters for customer self-service endpoints
const orderCheckLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many order status checks. Please wait before trying again.',
  prefix: 'order-check'
});

const resendLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many credential resend requests. Please wait before trying again.',
  prefix: 'resend-creds'
});

// Kiwify webhook endpoint
// Note: This endpoint should NOT use authentication middleware
// as it's called directly by Kiwify servers
router.post('/kiwify', handleKiwifyWebhook);

// Customer self-service endpoints
// These endpoints allow customers to check order status and resend credentials
router.post('/check-order', orderCheckLimiter, checkOrderStatus);
router.post('/resend-credentials', resendLimiter, resendCredentials);

export default router;