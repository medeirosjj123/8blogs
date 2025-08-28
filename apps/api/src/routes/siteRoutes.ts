import { Router } from 'express';
import {
  getTemplates,
  createSite,
  getUserSites,
  getSite,
  getJobStatus,
  generateInstallationCommand,
  getInstallationHistory,
  getInstallationDetails,
  removeWordPress,
  backupWordPress,
  addWordPressSite
} from '../controllers/siteInstallerController';
import {
  testVPSConnection,
  generateInstallationScript
} from '../controllers/generateInstallationScript';
import {
  executeInstallation,
  getInstallationStatus,
  getInstallationLogs,
  cancelInstallation
} from '../controllers/executeInstallation';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All site routes require authentication
router.use(authenticate);

// Template routes
router.get('/templates', getTemplates);

// Site management
router.get('/', getUserSites);
router.post('/', createSite);
router.get('/:siteId', getSite);

// Job status
router.get('/jobs/:jobId', getJobStatus);

// Installation command generation (authenticated)
router.post('/generate-command', generateInstallationCommand);

// New unified installation endpoints
router.post('/test-vps', testVPSConnection);
router.post('/generate-installation', generateInstallationScript);

// Direct VPS execution endpoints
router.post('/execute-installation', (req, res) => {
  try {
    const io = global.socketIO;
    if (!io) {
      console.error('Socket.IO not initialized');
      return res.status(500).json({
        success: false,
        message: 'Socket.IO not available'
      });
    }
    return executeInstallation(req as any, res, io);
  } catch (error) {
    console.error('Execute installation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start installation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
router.get('/installation-status/:installationId', getInstallationStatus);
router.get('/installation-logs/:installationId', getInstallationLogs);
router.post('/cancel-installation/:installationId', cancelInstallation);

// Installation history
router.get('/installations', getInstallationHistory);
router.get('/installations/:installationId', getInstallationDetails);

// WordPress management endpoints
router.post('/add-wordpress', addWordPressSite);
router.post('/remove-wordpress', removeWordPress);
router.post('/backup-wordpress', backupWordPress);

export default router;