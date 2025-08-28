import { Router } from 'express';
import {
  completeLesson,
  updateLessonProgress,
  getCourseProgress,
  getUserProgress
} from '../controllers/progressController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All progress routes require authentication
router.use(authenticate);

// Lesson progress
router.post('/lessons/:lessonId/complete', completeLesson);
router.post('/lessons/:lessonId/update', updateLessonProgress);

// Course progress
router.get('/courses/:courseId', getCourseProgress);

// User overall progress
router.get('/user', getUserProgress);

export default router;