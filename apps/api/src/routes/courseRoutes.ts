import { Router } from 'express';
import {
  getCourses,
  getCourse,
  getModule,
  getLesson,
  getCourseModules,
  createCourse,
  updateCourse,
  deleteCourse
} from '../controllers/courseController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Public routes (no auth required)
router.get('/', getCourses);

// Protected routes (auth required)
router.post('/', authenticate, createCourse);
router.get('/:courseId', authenticate, getCourse);
router.put('/:courseId', authenticate, updateCourse);
router.delete('/:courseId', authenticate, deleteCourse);
router.get('/:courseId/modules', authenticate, getCourseModules);

// Module routes
router.get('/modules/:moduleId', authenticate, getModule);

// Lesson routes
router.get('/lessons/:lessonId', authenticate, getLesson);

export default router;