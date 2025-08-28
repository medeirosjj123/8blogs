import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import {
  getAllModels,
  createModel,
  updateModel,
  deleteModel,
  toggleModelStatus,
  setPrimaryModel,
  setFallbackModel
} from '../controllers/aiModelController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// CRUD operations
router.get('/', getAllModels);
router.post('/', createModel);
router.put('/:id', updateModel);
router.delete('/:id', deleteModel);

// Special actions
router.post('/:id/toggle-status', toggleModelStatus);
router.post('/:id/set-primary', setPrimaryModel);
router.post('/:id/set-fallback', setFallbackModel);

export default router;