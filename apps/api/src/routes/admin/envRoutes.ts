import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import {
  getEnvConfigs,
  getEnvConfig,
  upsertEnvConfig,
  deleteEnvConfig,
  initializeEnvConfigs,
  syncEnvFile,
  restartApplication
} from '../../controllers/envController';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Environment configuration routes
router.get('/env', getEnvConfigs);
router.get('/env/:key', getEnvConfig);
router.put('/env/:key', upsertEnvConfig);
router.delete('/env/:key', deleteEnvConfig);

// Utility routes
router.post('/env/initialize', initializeEnvConfigs);
router.post('/env/sync', syncEnvFile);
router.post('/env/restart', restartApplication);

export default router;