import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { 
  getAiSettings, 
  updateAiSettings,
  getModelsList
} from '../controllers/aiSettingsController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Get current AI settings and available models
router.get('/', getAiSettings);

// Update AI settings
router.put('/', updateAiSettings);

// Get list of available models
router.get('/models', getModelsList);

export default router;