import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  simpleBlogCreate,
  checkDomainAvailable
} from '../controllers/simpleBlogController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Simple blog creation
router.post('/simple-create', simpleBlogCreate);

// Domain availability checking
router.get('/check-domain/:domain', checkDomainAvailable);

export default router;