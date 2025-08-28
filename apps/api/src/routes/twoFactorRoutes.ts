import { Router } from 'express';
import {
  setup2FA,
  verify2FA,
  enable2FA,
  disable2FA
} from '../controllers/twoFactorController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All 2FA routes require authentication
router.post('/setup', authenticate, setup2FA);
router.post('/verify', authenticate, verify2FA);
router.post('/enable', authenticate, enable2FA);
router.post('/disable', authenticate, disable2FA);

export default router;