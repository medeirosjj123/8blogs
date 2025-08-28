import express from 'express';
import {
  getAllThemes,
  getActiveThemes,
  getDefaultThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  toggleDefaultStatus,
  toggleActiveStatus
} from '../controllers/wordpressThemeController';
import { authenticate } from '../middlewares/authMiddleware';
import { adminRequired } from '../middlewares/adminMiddleware';

const router = express.Router();

// Public routes (no auth required)
router.get('/active', getActiveThemes);
router.get('/default', getDefaultThemes);
router.get('/:id', getTheme);

// Protected routes (auth required)
router.get('/', authenticate, getAllThemes);

// Admin routes (admin auth required)
router.post('/', authenticate, adminRequired, createTheme);
router.put('/:id', authenticate, adminRequired, updateTheme);
router.delete('/:id', authenticate, adminRequired, deleteTheme);
router.post('/:id/toggle-default', authenticate, adminRequired, toggleDefaultStatus);
router.post('/:id/toggle-active', authenticate, adminRequired, toggleActiveStatus);

export default router;