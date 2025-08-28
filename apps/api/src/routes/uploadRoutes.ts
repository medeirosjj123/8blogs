import { Router } from 'express';
import { uploadImage, uploadImages, upload } from '../controllers/uploadController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// Single image upload
router.post('/image', upload.single('image'), uploadImage);

// Multiple images upload (max 5)
router.post('/images', upload.array('images', 5), uploadImages);

export default router;