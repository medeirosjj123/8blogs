import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { 
  getDashboardStats,
  getUsers,
  updateUserRole,
  deleteUser,
  createUser,
  updateUser,
  resetUserPassword,
  sendPasswordResetEmail,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getModules,
  createModule,
  updateModule,
  deleteModule,
  getLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  publishAllContent
} from '../controllers/adminController';
import {
  getAllPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptStatus,
  testPrompt,
  initializeDefaultPrompts
} from '../controllers/promptController';
import webhookRoutes from './admin/webhookRoutes';
import seoRoutes from './admin/seoRoutes';
import envRoutes from './admin/envRoutes';
import featureRoutes from './admin/featureRoutes';
import categoryRoutes from './admin/categoryRoutes';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.put('/users/:userId/role', updateUserRole);
router.put('/users/:userId/password', resetUserPassword);
router.post('/users/send-reset-email', sendPasswordResetEmail);
router.delete('/users/:userId', deleteUser);

// Course Management
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:courseId', updateCourse);
router.delete('/courses/:courseId', deleteCourse);

// Module Management
router.get('/courses/:courseId/modules', getModules);
router.post('/courses/:courseId/modules', createModule);
router.put('/modules/:moduleId', updateModule);
router.delete('/modules/:moduleId', deleteModule);

// Lesson Management
router.get('/modules/:moduleId/lessons', getLessons);
router.post('/modules/:moduleId/lessons', createLesson);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

// Migration/Utilities
router.post('/publish-all-content', publishAllContent);

// Webhook Management
router.use('/', webhookRoutes);

// SEO Management
router.use('/', seoRoutes);

// Environment Variables Management
router.use('/', envRoutes);

// Feature Management
router.use('/', featureRoutes);

// Category Management
router.use('/', categoryRoutes);

// Prompt Management
router.get('/prompts', getAllPrompts);
router.get('/prompts/:id', getPrompt);
router.post('/prompts', createPrompt);
router.put('/prompts/:id', updatePrompt);
router.delete('/prompts/:id', deletePrompt);
router.post('/prompts/:id/toggle', togglePromptStatus);
router.post('/prompts/:id/test', testPrompt);
router.post('/prompts/initialize', initializeDefaultPrompts);

export default router;