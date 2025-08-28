import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import {
  getAllSettings,
  getCategorySettings,
  updateEmailSettings,
  testEmailConfiguration,
  updateGeneralSettings,
  updateSecuritySettings
} from '../controllers/settingsController';

const router = Router();

// All settings routes require admin authentication
router.use(adminAuth);

// Get all settings
router.get('/', getAllSettings);

// Get settings by category
router.get('/:category', getCategorySettings);

// Update email settings
router.put('/email', updateEmailSettings);

// Test email configuration
router.post('/email/test', testEmailConfiguration);

// Update general settings
router.put('/general', updateGeneralSettings);

// Update security settings
router.put('/security', updateSecuritySettings);

export default router;