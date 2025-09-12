import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  testVPSConnection,
  getVPSStatus,
  getUserVPSConfigurations,
  saveVPSConfiguration,
  checkDomainExists,
  deleteVPSConfiguration,
  setupVPS,
  checkVPSRealTimeStatus,
  simpleVpsSetup
} from '../controllers/vpsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// VPS connection testing
router.post('/test-connection', testVPSConnection);

// VPS configuration management
router.get('/configurations', getUserVPSConfigurations);
router.post('/configurations', saveVPSConfiguration);
router.delete('/configurations/:vpsId', deleteVPSConfiguration);

// VPS status checking
router.get('/status/:host', getVPSStatus);
router.post('/check-status', checkVPSRealTimeStatus);

// Domain checking
router.get('/check-domain/:domain', checkDomainExists);

// VPS setup and reset endpoints
router.post('/setup', setupVPS);
router.post('/simple-setup', simpleVpsSetup);

export default router;