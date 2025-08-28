import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { adminAuth } from '../middleware/adminAuth';
import {
  getAllPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptStatus,
  testPrompt,
  initializeDefaultPrompts
} from '../controllers/promptController';

const router = Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(adminAuth);

// Prompt routes
router.get('/', getAllPrompts);
router.post('/initialize', initializeDefaultPrompts);
router.post('/', createPrompt);
router.get('/:id', getPrompt);
router.put('/:id', updatePrompt);
router.delete('/:id', deletePrompt);
router.post('/:id/toggle', togglePromptStatus);
router.post('/:id/test', testPrompt);

export default router;