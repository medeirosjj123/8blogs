import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import {
  getSeoConfigs,
  getSeoConfig,
  upsertSeoConfig,
  deleteSeoConfig,
  initializeSeoConfigs,
  generateSitemap,
  previewSeoConfig
} from '../../controllers/seoController';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// SEO configuration routes
router.get('/seo', getSeoConfigs);
router.get('/seo/:page', getSeoConfig);
router.put('/seo/:page', upsertSeoConfig);
router.delete('/seo/:page', deleteSeoConfig);

// Utility routes
router.post('/seo/initialize', initializeSeoConfigs);
router.get('/seo/:page/preview', previewSeoConfig);
router.post('/seo/:page/preview', previewSeoConfig);
router.get('/sitemap/generate', generateSitemap);

export default router;