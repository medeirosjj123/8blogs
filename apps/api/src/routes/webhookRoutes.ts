import { Router } from 'express';
import { handleKiwifyWebhook } from '../controllers/webhookController';

const router = Router();

// Kiwify webhook endpoint
// Note: This endpoint should NOT use authentication middleware
// as it's called directly by Kiwify servers
router.post('/kiwify', handleKiwifyWebhook);

export default router;