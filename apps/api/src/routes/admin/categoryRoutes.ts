import { Router } from 'express';
import {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  reorderCategories,
  initializeDefaultCategories
} from '../../controllers/categoryController';

const router = Router();

// Category management routes (all require admin auth, applied in parent router)
router.get('/categories', getAllCategories);
router.post('/categories/initialize', initializeDefaultCategories);
router.post('/categories/reorder', reorderCategories);
router.get('/categories/:id', getCategory);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.post('/categories/:id/toggle', toggleCategoryStatus);
router.delete('/categories/:id', deleteCategory);

export default router;