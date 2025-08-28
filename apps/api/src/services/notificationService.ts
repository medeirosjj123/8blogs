import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
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

interface NotificationData {
  channelId?: string;
  messageId?: string;
  userId?: string;
  courseId?: string;
  achievementId?: string;
  url?: string;
  [key: string]: any;
}

class NotificationService {
  // Create a mention notification
  async createMentionNotification(
    recipientId: string,
    mentionerName: string,
    channelId: string,
    messageId: string,
    channelName?: string
  ) {
    try {
      // Check if recipient has mentions enabled
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.notificationPreferences?.communityMentions) {
        return null;
      }

      const notification = await (Notification as any).createMentionNotification(
        new mongoose.Types.ObjectId(recipientId),
        mentionerName,
        new mongoose.Types.ObjectId(channelId),
        new mongoose.Types.ObjectId(messageId),
        channelName
      );

      logger.info({
        recipientId,
        mentionerName,
        channelId,
        notificationId: notification._id
      }, 'Mention notification created');

      // Emit real-time notification via Socket.IO if available
      this.emitRealTimeNotification(recipientId, notification);

      return notification;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating mention notification');
      throw error;
    }
  }

  // Create an achievement notification
  async createAchievementNotification(
    recipientId: string,
    achievementTitle: string,
    achievementDescription: string,
    achievementId?: string
  ) {
    try {
      // Check if recipient has achievement notifications enabled
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.notificationPreferences?.achievementUnlocked) {
        return null;
      }

      const notification = await (Notification as any).createAchievementNotification(
        new mongoose.Types.ObjectId(recipientId),
        achievementTitle,
        achievementDescription,
        achievementId ? new mongoose.Types.ObjectId(achievementId) : undefined
      );

      logger.info({
        recipientId,
        achievementTitle,
        notificationId: notification._id
      }, 'Achievement notification created');

      // Emit real-time notification via Socket.IO if available
      this.emitRealTimeNotification(recipientId, notification);

      return notification;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating achievement notification');
      throw error;
    }
  }

  // Create a course update notification
  async createCourseUpdateNotification(
    recipientId: string,
    courseName: string,
    updateMessage: string,
    courseId: string
  ) {
    try {
      // Check if recipient has course update notifications enabled
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.notificationPreferences?.courseUpdates) {
        return null;
      }

      const notification = await (Notification as any).createCourseUpdateNotification(
        new mongoose.Types.ObjectId(recipientId),
        courseName,
        updateMessage,
        new mongoose.Types.ObjectId(courseId)
      );

      logger.info({
        recipientId,
        courseName,
        notificationId: notification._id
      }, 'Course update notification created');

      // Emit real-time notification via Socket.IO if available
      this.emitRealTimeNotification(recipientId, notification);

      return notification;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating course update notification');
      throw error;
    }
  }

  // Create a direct message notification
  async createDirectMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    channelId: string,
    messageId: string
  ) {
    try {
      // Check if recipient has push notifications enabled (for DMs)
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.notificationPreferences?.pushNotifications) {
        return null;
      }

      const notification = await (Notification as any).createDirectMessageNotification(
        new mongoose.Types.ObjectId(recipientId),
        senderName,
        messagePreview,
        new mongoose.Types.ObjectId(channelId),
        new mongoose.Types.ObjectId(messageId)
      );

      logger.info({
        recipientId,
        senderName,
        channelId,
        notificationId: notification._id
      }, 'Direct message notification created');

      // Emit real-time notification via Socket.IO if available
      this.emitRealTimeNotification(recipientId, notification);

      return notification;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating direct message notification');
      throw error;
    }
  }

  // Create a welcome notification for new users
  async createWelcomeNotification(recipientId: string) {
    try {
      const notification = await (Notification as any).createWelcomeNotification(
        new mongoose.Types.ObjectId(recipientId)
      );

      logger.info({
        recipientId,
        notificationId: notification._id
      }, 'Welcome notification created');

      // Emit real-time notification via Socket.IO if available
      this.emitRealTimeNotification(recipientId, notification);

      return notification;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating welcome notification');
      throw error;
    }
  }

  // Create a system notification
  async createSystemNotification(
    recipientId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    url?: string
  ) {
    try {
      const notification = await (Notification as any).createSystemNotification(
        new mongoose.Types.ObjectId(recipientId),
        title,
        message,
        priority,
        url
      );

      logger.info({
        recipientId,
        title,
        priority,
        notificationId: notification._id
      }, 'System notification created');

      // Emit real-time notification via Socket.IO if available
      this.emitRealTimeNotification(recipientId, notification);

      return notification;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating system notification');
      throw error;
    }
  }

  // Create notifications for multiple users
  async createBulkNotifications(
    recipientIds: string[],
    type: string,
    title: string,
    message: string,
    data?: NotificationData,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ) {
    try {
      const notifications = recipientIds.map(recipientId => ({
        recipientId: new mongoose.Types.ObjectId(recipientId),
        type,
        category: this.getCategoryFromType(type),
        priority,
        title,
        message,
        data: data || {},
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      }));

      const result = await Notification.insertMany(notifications);

      logger.info({
        recipientCount: recipientIds.length,
        type,
        title,
        priority
      }, 'Bulk notifications created');

      // Emit real-time notifications for each recipient
      result.forEach(notification => {
        this.emitRealTimeNotification(notification.recipientId.toString(), notification);
      });

      return result;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error creating bulk notifications');
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(userId: string) {
    try {
      const [unreadCount, totalCount, unreadByCategory] = await Promise.all([
        // Total unread count
        Notification.countDocuments({
          recipientId: new mongoose.Types.ObjectId(userId),
          isRead: false
        }),
        
        // Total notification count
        Notification.countDocuments({
          recipientId: new mongoose.Types.ObjectId(userId)
        }),
        
        // Unread count by category
        Notification.aggregate([
          {
            $match: {
              recipientId: new mongoose.Types.ObjectId(userId),
              isRead: false
            }
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const categoryCounts = unreadByCategory.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      return {
        unreadCount,
        totalCount,
        unreadByCategory: categoryCounts
      };
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error getting notification stats');
      throw error;
    }
  }

  // Emit real-time notification via Socket.IO
  private emitRealTimeNotification(recipientId: string, notification: any) {
    try {
      // Check if Socket.IO is available globally
      if (global.socketIO) {
        global.socketIO.to(`user_${recipientId}`).emit('notification:new', {
          id: notification._id,
          type: notification.type,
          category: notification.category,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data,
          createdAt: notification.createdAt
        });

        logger.debug({
          recipientId,
          notificationId: notification._id
        }, 'Real-time notification emitted');
      }
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error emitting real-time notification');
      // Don't throw - real-time notifications are not critical
    }
  }

  // Helper method to determine category from type
  private getCategoryFromType(type: string): string {
    switch (type) {
      case 'mention':
      case 'direct_message':
      case 'community':
        return 'chat';
      case 'achievement':
        return 'achievement';
      case 'course_update':
        return 'learning';
      case 'system':
      case 'welcome':
        return 'system';
      default:
        return 'system';
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications() {
    try {
      // Delete read notifications older than 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const result = await Notification.deleteMany({
        isRead: true,
        readAt: { $lt: ninetyDaysAgo }
      });

      logger.info({
        deletedCount: result.deletedCount
      }, 'Old notifications cleaned up');

      return result.deletedCount;
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Error cleaning up old notifications');
      throw error;
    }
  }
}

export default new NotificationService();