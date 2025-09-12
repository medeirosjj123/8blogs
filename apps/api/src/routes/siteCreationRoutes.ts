import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { createWordPressSite, checkVPSReadiness } from '../controllers/siteCreationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/sites/create
 * @desc Create a new WordPress site using add-site.sh script
 * @access Private
 */
router.post('/create', createWordPressSite);

/**
 * @route POST /api/sites/check-vps
 * @desc Check if VPS is ready for site creation (has WordOps)
 * @access Private
 */
router.post('/check-vps', checkVPSReadiness);

export default router;