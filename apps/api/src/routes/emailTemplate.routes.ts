import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import {
  getEmailTemplates,
  getEmailTemplate,
  upsertEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
  sendTestEmailTemplate,
  initializeDefaultTemplates
} from '../controllers/emailTemplateController';

const router = Router();

// All email template routes require admin authentication
router.use(adminAuth);

// Get all templates
router.get('/', getEmailTemplates);

// Initialize default templates
router.post('/initialize', initializeDefaultTemplates);

// Get single template
router.get('/:id', getEmailTemplate);

// Create or update template
router.post('/', upsertEmailTemplate);
router.put('/:id', upsertEmailTemplate);

// Delete template
router.delete('/:id', deleteEmailTemplate);

// Preview template
router.post('/:id/preview', previewEmailTemplate);

// Send test email
router.post('/:id/test', sendTestEmailTemplate);

export default router;