import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { getPublicCategories } from '../controllers/categoryController';

const router = Router();

// Public category routes (requires authentication but not admin)
router.get('/', authenticate, getPublicCategories);

export default router;