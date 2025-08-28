import { Router } from 'express';
import {
  getSuggestions,
  getAllSuggestions,
  createSuggestion,
  bulkCreateSuggestions,
  updateSuggestion,
  deleteSuggestion,
  deleteCategory
} from '../controllers/profileSuggestionController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Public route - get active suggestions for frontend
router.get('/public', getSuggestions);

// Admin routes - require authentication
router.use(authenticate);

// Admin CRUD operations
router.get('/', getAllSuggestions);
router.post('/', createSuggestion);
router.post('/bulk', bulkCreateSuggestions);
router.put('/:id', updateSuggestion);
router.delete('/:id', deleteSuggestion);
router.delete('/category/:category', deleteCategory);

export default router;