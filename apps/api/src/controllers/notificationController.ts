import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification, INotification } from '../models/Notification';
import { AuthRequest } from '../middlewares/authMiddleware';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// Get user notifications with pagination
export async function getUserNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const {
      page = '1',
      limit = '20',
      category,
      type,
      unreadOnly = 'false',
      priority
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = { recipientId: new mongoose.Types.ObjectId(req.user.userId) };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    if (priority) {
      query.priority = priority;
    }

    // Execute query with pagination
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('data.userId', 'name avatar')
        .lean(),
      Notification.countDocuments(query)
    ]);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(req.user.userId),
      isRead: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        },
        unreadCount
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting user notifications');
    res.status(500).json({
      error: 'Failed to get notifications',
      message: 'An error occurred while fetching notifications'
    });
  }
}

// Get notification by ID
export async function getNotificationById(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid notification ID format'
      });
      return;
    }

    const notification = await Notification.findOne({
      _id: id,
      recipientId: new mongoose.Types.ObjectId(req.user.userId)
    }).populate('data.userId', 'name avatar');

    if (!notification) {
      res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or you do not have permission to view it'
      });
      return;
    }

    res.json({
      success: true,
      data: { notification }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting notification by ID');
    res.status(500).json({
      error: 'Failed to get notification',
      message: 'An error occurred while fetching the notification'
    });
  }
}

// Mark notification as read
export async function markNotificationAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid notification ID format'
      });
      return;
    }

    const notification = await Notification.findOne({
      _id: id,
      recipientId: new mongoose.Types.ObjectId(req.user.userId)
    });

    if (!notification) {
      res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or you do not have permission to modify it'
      });
      return;
    }

    await notification.markAsRead();

    logger.info({ notificationId: id, userId: req.user.userId }, 'Notification marked as read');

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error marking notification as read');
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: 'An error occurred while updating the notification'
    });
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { category, type } = req.query;

    // Build query filters
    const query: any = {
      recipientId: new mongoose.Types.ObjectId(req.user.userId),
      isRead: false
    };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    const result = await Notification.updateMany(query, {
      $set: {
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.info({ 
      userId: req.user.userId, 
      modifiedCount: result.modifiedCount 
    }, 'Marked all notifications as read');

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error marking all notifications as read');
    res.status(500).json({
      error: 'Failed to mark notifications as read',
      message: 'An error occurred while updating notifications'
    });
  }
}

// Delete notification
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid notification ID format'
      });
      return;
    }

    const result = await Notification.deleteOne({
      _id: id,
      recipientId: new mongoose.Types.ObjectId(req.user.userId)
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or you do not have permission to delete it'
      });
      return;
    }

    logger.info({ notificationId: id, userId: req.user.userId }, 'Notification deleted');

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting notification');
    res.status(500).json({
      error: 'Failed to delete notification',
      message: 'An error occurred while deleting the notification'
    });
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { category, type } = req.query;

    // Build query filters
    const query: any = {
      recipientId: new mongoose.Types.ObjectId(req.user.userId),
      isRead: false
    };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    const unreadCount = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting unread notification count');
    res.status(500).json({
      error: 'Failed to get unread count',
      message: 'An error occurred while counting unread notifications'
    });
  }
}

// Delete old read notifications (cleanup)
export async function deleteOldReadNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    // Delete read notifications older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Notification.deleteMany({
      recipientId: new mongoose.Types.ObjectId(req.user.userId),
      isRead: true,
      readAt: { $lt: thirtyDaysAgo }
    });

    logger.info({ 
      userId: req.user.userId, 
      deletedCount: result.deletedCount 
    }, 'Old read notifications cleaned up');

    res.json({
      success: true,
      message: 'Old notifications cleaned up',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error cleaning up old notifications');
    res.status(500).json({
      error: 'Failed to clean up notifications',
      message: 'An error occurred while cleaning up old notifications'
    });
  }
}

// Admin: Create system notification for all users
export async function createSystemNotificationForAll(req: Request, res: Response): Promise<void> {
  try {
    const { title, message, priority = 'medium', url, expiresInDays = 14 } = req.body;

    if (!title || !message) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and message are required'
      });
      return;
    }

    // Get all user IDs
    const { User } = await import('../models/User');
    const users = await User.find({}, '_id');

    // Create notifications for all users
    const notifications = users.map(user => ({
      recipientId: user._id,
      type: 'system',
      category: 'system',
      priority,
      title,
      message,
      data: url ? { url } : {},
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    }));

    const result = await Notification.insertMany(notifications);

    logger.info({ 
      notificationCount: result.length,
      title,
      priority 
    }, 'System notification sent to all users');

    res.json({
      success: true,
      message: `System notification sent to ${result.length} users`,
      data: {
        notificationCount: result.length
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error creating system notification for all users');
    res.status(500).json({
      error: 'Failed to create system notification',
      message: 'An error occurred while creating the system notification'
    });
  }
}