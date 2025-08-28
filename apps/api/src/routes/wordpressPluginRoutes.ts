import express from 'express';
import {
  getAllPlugins,
  getActivePlugins,
  getDefaultPlugins,
  getRecommendedPlugins,
  checkPluginConflicts,
  getPlugin,
  createPlugin,
  updatePlugin,
  deletePlugin,
  toggleDefaultStatus,
  toggleActiveStatus
} from '../controllers/wordpressPluginController';
import { authenticate } from '../middlewares/authMiddleware';
import { adminRequired } from '../middlewares/adminMiddleware';

const router = express.Router();

// Public routes (no auth required)
router.get('/active', getActivePlugins);
router.get('/default', getDefaultPlugins);
router.get('/recommended', getRecommendedPlugins);
router.post('/check-conflicts', checkPluginConflicts);
router.get('/:id', getPlugin);

// Protected routes (auth required)
router.get('/', authenticate, getAllPlugins);

// Admin routes (admin auth required)
router.post('/', authenticate, adminRequired, createPlugin);
router.put('/:id', authenticate, adminRequired, updatePlugin);
router.delete('/:id', authenticate, adminRequired, deletePlugin);
router.post('/:id/toggle-default', authenticate, adminRequired, toggleDefaultStatus);
router.post('/:id/toggle-active', authenticate, adminRequired, toggleActiveStatus);

export default router;