import express from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { 
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  deleteOldReadNotifications,
  createSystemNotificationForAll
} from '../controllers/notificationController';
import { requireRole } from '../middlewares/roleMiddleware';

const router = express.Router();

// Get user notifications with filtering and pagination
router.get('/', authenticate, getUserNotifications);

// Get unread notification count
router.get('/unread-count', authenticate, getUnreadNotificationCount);

// Get specific notification by ID
router.get('/:id', authenticate, getNotificationById);

// Mark notification as read
router.put('/:id/read', authenticate, markNotificationAsRead);

// Mark all notifications as read
router.put('/mark-all-read', authenticate, markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', authenticate, deleteNotification);

// Clean up old read notifications
router.delete('/cleanup/old', authenticate, deleteOldReadNotifications);

// Admin routes
router.post('/system/broadcast', authenticate, requireRole(['admin', 'moderador']), createSystemNotificationForAll);

export default router;