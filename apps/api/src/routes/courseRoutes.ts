import { Router } from 'express';
import {
  getCourses,
  getCourse,
  getModule,
  getLesson,
  getCourseModules
} from '../controllers/courseController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Public routes (no auth required)
router.get('/', getCourses);

// Protected routes (auth required)
router.get('/:courseId', authenticate, getCourse);
router.get('/:courseId/modules', authenticate, getCourseModules);

// Module routes
router.get('/modules/:moduleId', authenticate, getModule);

// Lesson routes
router.get('/lessons/:lessonId', authenticate, getLesson);

export default router;