import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getUserContentSettings,
  updateUserContentSettings,
  testPexelsConnection,
  searchPexelsImages
} from '../controllers/contentSettingsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Content settings management
router.get('/', getUserContentSettings);
router.put('/', updateUserContentSettings);
router.post('/pexels/test', testPexelsConnection);
router.get('/pexels/search', searchPexelsImages);

export default router;