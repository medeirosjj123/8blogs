import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { adminRequired } from '../middlewares/adminMiddleware';
import {
  getAllCalls,
  getUpcomingCalls,
  getPastCalls,
  getCall,
  createCall,
  updateCall,
  deleteCall,
  registerForCall,
  unregisterFromCall,
  getCallParticipants,
  updateRecording
} from '../controllers/callController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin-only routes (must come first to avoid conflicts)
router.get('/', adminRequired, getAllCalls);

// Public routes for authenticated users (specific routes before parameterized)
router.get('/upcoming', getUpcomingCalls);
router.get('/past', getPastCalls);

// User registration routes (specific routes before parameterized)
router.post('/:id/register', registerForCall);
router.delete('/:id/register', unregisterFromCall);

// Parameterized routes (must come last)
router.get('/:id', getCall);
router.post('/', adminRequired, createCall);
router.put('/:id', adminRequired, updateCall);
router.delete('/:id', adminRequired, deleteCall);
router.get('/:id/participants', adminRequired, getCallParticipants);
router.put('/:id/recording', adminRequired, updateRecording);

export default router;