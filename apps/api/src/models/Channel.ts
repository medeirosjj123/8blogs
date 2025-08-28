import mongoose, { Schema, Document } from 'mongoose';

export interface IChannelDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  category?: string;
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'member';
    joinedAt: Date;
  }>;
  pinnedMessages: mongoose.Types.ObjectId[];
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  isArchived: boolean;
  metadata?: Record<string, any>;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannelDocument>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['public', 'private', 'direct'],
    default: 'public',
    index: true
  },
  category: {
    type: String,
    enum: ['general', 'course', 'support', 'announcement'],
    default: 'general'
  },
  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  pinnedMessages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastMessageAt: Date,
  lastMessagePreview: String,
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

channelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for efficient queries
channelSchema.index({ 'members.userId': 1 });
channelSchema.index({ type: 1, isArchived: 1 });
channelSchema.index({ lastMessageAt: -1 });
channelSchema.index({ name: 'text', description: 'text' });

// Virtual for member count
channelSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Methods
channelSchema.methods.addMember = async function(
  userId: mongoose.Types.ObjectId, 
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  const existingMember = this.members.find(m => m.userId.equals(userId));
  
  if (!existingMember) {
    this.members.push({
      userId,
      role,
      joinedAt: new Date()
    });
    await this.save();
  }
};

channelSchema.methods.removeMember = async function(userId: mongoose.Types.ObjectId): Promise<void> {
  this.members = this.members.filter(m => !m.userId.equals(userId));
  await this.save();
};

channelSchema.methods.updateMemberRole = async function(
  userId: mongoose.Types.ObjectId,
  role: 'admin' | 'member'
): Promise<void> {
  const member = this.members.find(m => m.userId.equals(userId));
  if (member && member.role !== 'owner') {
    member.role = role;
    await this.save();
  }
};

channelSchema.methods.isMember = function(userId: mongoose.Types.ObjectId): boolean {
  return this.members.some(m => m.userId.equals(userId));
};

channelSchema.methods.getMemberRole = function(userId: mongoose.Types.ObjectId): string | null {
  const member = this.members.find(m => m.userId.equals(userId));
  return member ? member.role : null;
};

channelSchema.methods.archive = async function(): Promise<void> {
  this.isArchived = true;
  await this.save();
};

channelSchema.methods.unarchive = async function(): Promise<void> {
  this.isArchived = false;
  await this.save();
};

export const Channel = mongoose.model<IChannelDocument>('Channel', channelSchema);