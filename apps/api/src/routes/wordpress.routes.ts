import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getUserWordPressSites,
  addWordPressSite,
  updateWordPressSite,
  deleteWordPressSite,
  testWordPressConnection,
  setDefaultWordPressSite
} from '../controllers/wordpressController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// WordPress sites management
router.get('/sites', getUserWordPressSites);
router.post('/sites', addWordPressSite);
router.put('/sites/:id', updateWordPressSite);
router.delete('/sites/:id', deleteWordPressSite);
router.post('/sites/:id/test', testWordPressConnection);
router.post('/sites/:id/set-default', setDefaultWordPressSite);

export default router;