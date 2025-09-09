import express from 'express';
import { 
  getUserWordPressSites,
  createWordPressSite,
  refreshSiteStatus,
  toggleSiteStatus,
  createSiteBackup,
  getSiteHealth,
  executeWpCliCommand,
  updateWordPress
} from '../controllers/wordpressSiteController';
import { authenticate } from '../middlewares/authMiddleware';
import { debugMiddleware } from '../middlewares/debugMiddleware';

const router = express.Router();

// Apply debug middleware to all routes
router.use(debugMiddleware);

// Get user's WordPress sites
router.get('/', authenticate, getUserWordPressSites);

// Create new WordPress site
router.post('/', authenticate, createWordPressSite);

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