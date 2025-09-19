import { Router } from 'express';
import {
  getCourses,
  getCourse,
  getModule,
  getLesson,
  getCourseModules,
  createCourse,
  updateCourse,
  deleteCourse,
  debugUserPlan,
  testDb
} from '../controllers/courseController';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware';

const router = Router();

// Public routes (optional auth - populates user if authenticated)
router.get('/', optionalAuth, getCourses);

// Debug routes
router.get('/debug/test-db', testDb);
router.get('/debug/user-plan', authenticate, debugUserPlan);

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