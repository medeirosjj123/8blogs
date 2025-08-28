import { Router } from 'express';
import {
  getAllFeatures,
  getFeature,
  createFeature,
  updateFeature,
  toggleFeatureStatus,
  setMaintenanceMode,
  updateFeatureStatus,
  deleteFeature,
  restoreFeature,
  getFeatureAuditLogs,
  bulkUpdateFeatures,
  scanForFeatures,
  initializeFeatures
} from '../../controllers/featureController';

const router = Router();

// Feature management routes (all require admin auth, applied in parent router)
router.get('/features', getAllFeatures);
router.post('/features/scan', scanForFeatures);
router.post('/features/initialize', initializeFeatures);
router.post('/features/bulk', bulkUpdateFeatures);
router.get('/features/:id', getFeature);
router.post('/features', createFeature);
router.put('/features/:id', updateFeature);
router.put('/features/:id/status', updateFeatureStatus);
router.post('/features/:id/toggle', toggleFeatureStatus);
router.post('/features/:id/maintenance', setMaintenanceMode);
router.delete('/features/:id', deleteFeature);
router.post('/features/:id/restore', restoreFeature);
router.get('/features/:id/audit', getFeatureAuditLogs);

export default router;