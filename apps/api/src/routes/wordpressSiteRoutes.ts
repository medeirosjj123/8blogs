import express from 'express';
import { 
  getUserWordPressSites,
  refreshSiteStatus,
  toggleSiteStatus,
  createSiteBackup,
  getSiteHealth,
  executeWpCliCommand,
  updateWordPress
} from '../controllers/wordpressSiteController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Get user's WordPress sites
router.get('/', authenticate, getUserWordPressSites);

// Refresh site status
router.post('/:siteId/refresh-status', authenticate, refreshSiteStatus);

// Toggle site status (active/maintenance)
router.post('/:siteId/toggle-status', authenticate, toggleSiteStatus);

// Create site backup
router.post('/:siteId/backup', authenticate, createSiteBackup);

// Get site health status
router.get('/:siteId/health', authenticate, getSiteHealth);

// Execute WP-CLI command
router.post('/:siteId/wp-cli', authenticate, executeWpCliCommand);

// Update WordPress core
router.post('/:siteId/update-wp', authenticate, updateWordPress);

export default router;