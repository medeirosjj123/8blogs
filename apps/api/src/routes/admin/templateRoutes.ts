import { Router, Request, Response, NextFunction } from 'express';
import {
  getAllTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateStatus,
  uploadMiddleware
} from '../../controllers/templateController';
import { authenticate } from '../../middlewares/authMiddleware';

const router = Router();

// All template admin routes require authentication
router.use(authenticate);

// Wrapper to handle multer errors
const uploadWithErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      console.error('Upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 1GB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file'
      });
    }
    next();
  });
};

// Template CRUD routes
router.get('/', getAllTemplates);
router.get('/:id', getTemplate);
router.post('/', uploadWithErrorHandler, createTemplate);
router.put('/:id', uploadWithErrorHandler, updateTemplate);
router.delete('/:id', deleteTemplate);

// Toggle template status
router.patch('/:id/toggle-status', toggleTemplateStatus);

export default router;