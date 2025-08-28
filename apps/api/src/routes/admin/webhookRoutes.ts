import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookEvents,
  testWebhook,
  retryWebhookEvents
} from '../../controllers/webhookManagementController';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Webhook CRUD operations
router.get('/webhooks', getWebhooks);
router.get('/webhooks/:id', getWebhook);
router.post('/webhooks', createWebhook);
router.put('/webhooks/:id', updateWebhook);
router.delete('/webhooks/:id', deleteWebhook);

// Webhook events and testing
router.get('/webhooks/:id/events', getWebhookEvents);
router.post('/webhooks/:id/test', testWebhook);
router.post('/webhooks/:id/retry', retryWebhookEvents);

export default router;