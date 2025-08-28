import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: 'mention' | 'achievement' | 'course_update' | 'system' | 'welcome' | 'community' | 'direct_message';
  title: string;
  message: string;
  data?: {
    channelId?: string;
    messageId?: string;
    userId?: string;
    courseId?: string;
    achievementId?: string;
    url?: string;
    [key: string]: any;
  };
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'chat' | 'learning' | 'system' | 'social' | 'achievement';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['mention', 'achievement', 'course_update', 'system', 'welcome', 'community', 'direct_message'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  data: {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel'
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    url: {
      type: String,
      maxlength: 500
    }
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    enum: ['chat', 'learning', 'system', 'social', 'achievement'],
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for auto-deletion
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Pre-save middleware to update timestamps
notificationSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Set readAt timestamp when marking as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  next();
});

// Static methods for creating specific notification types
notificationSchema.statics.createMentionNotification = function(
  recipientId: mongoose.Types.ObjectId,
  mentionerName: string,
  channelId: mongoose.Types.ObjectId,
  messageId: mongoose.Types.ObjectId,
  channelName?: string
) {
  return this.create({
    recipientId,
    type: 'mention',
    category: 'chat',
    priority: 'high',
    title: 'Você foi mencionado',
    message: `${mentionerName} mencionou você${channelName ? ` em #${channelName}` : ' na conversa'}`,
    data: {
      channelId,
      messageId,
      url: `/chat/${channelId}`
    },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
  });
};

notificationSchema.statics.createAchievementNotification = function(
  recipientId: mongoose.Types.ObjectId,
  achievementTitle: string,
  achievementDescription: string,
  achievementId?: mongoose.Types.ObjectId
) {
  return this.create({
    recipientId,
    type: 'achievement',
    category: 'achievement',
    priority: 'high',
    title: '🏆 Nova conquista desbloqueada!',
    message: `Parabéns! Você desbloqueou: ${achievementTitle}`,
    data: {
      achievementId,
      url: '/conquistas'
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
  });
};

notificationSchema.statics.createCourseUpdateNotification = function(
  recipientId: mongoose.Types.ObjectId,
  courseName: string,
  updateMessage: string,
  courseId: mongoose.Types.ObjectId
) {
  return this.create({
    recipientId,
    type: 'course_update',
    category: 'learning',
    priority: 'medium',
    title: 'Atualização de curso',
    message: `${courseName}: ${updateMessage}`,
    data: {
      courseId,
      url: `/cursos/${courseId}`
    },
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Expires in 14 days
  });
};

notificationSchema.statics.createDirectMessageNotification = function(
  recipientId: mongoose.Types.ObjectId,
  senderName: string,
  messagePreview: string,
  channelId: mongoose.Types.ObjectId,
  messageId: mongoose.Types.ObjectId
) {
  return this.create({
    recipientId,
    type: 'direct_message',
    category: 'chat',
    priority: 'high',
    title: `Mensagem de ${senderName}`,
    message: messagePreview.length > 100 ? `${messagePreview.substring(0, 100)}...` : messagePreview,
    data: {
      channelId,
      messageId,
      url: `/chat/${channelId}`
    },
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Expires in 3 days
  });
};

notificationSchema.statics.createWelcomeNotification = function(recipientId: mongoose.Types.ObjectId) {
  return this.create({
    recipientId,
    type: 'welcome',
    category: 'system',
    priority: 'medium',
    title: '🎉 Bem-vindo à Escola do SEO!',
    message: 'Seja bem-vindo à nossa escola de SEO! Explore os cursos, participe da comunidade e comece sua jornada de aprendizado.',
    data: {
      url: '/onboarding'
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
  });
};

notificationSchema.statics.createSystemNotification = function(
  recipientId: mongoose.Types.ObjectId,
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  url?: string
) {
  return this.create({
    recipientId,
    type: 'system',
    category: 'system',
    priority,
    title,
    message,
    data: {
      url
    },
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Expires in 14 days
  });
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = undefined;
  return this.save();
};

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);