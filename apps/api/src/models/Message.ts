import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageDocument extends Document {
  channelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  editedAt?: Date;
  editHistory?: Array<{
    content: string;
    editedAt: Date;
  }>;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
    thumbnailUrl?: string;
  }>;
  mentions?: mongoose.Types.ObjectId[];
  reactions?: Array<{
    emoji: string;
    users: mongoose.Types.ObjectId[];
  }>;
  replyTo?: mongoose.Types.ObjectId;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessageDocument>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 4000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  editedAt: Date,
  editHistory: [{
    content: String,
    editedAt: Date
  }],
  attachments: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    thumbnailUrl: String
  }],
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
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

messageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for efficient queries
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, isPinned: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ content: 'text' }); // Text search index
messageSchema.index({ mentions: 1 });
messageSchema.index({ 'reactions.users': 1 });

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions?.reduce((sum, reaction) => sum + reaction.users.length, 0) || 0;
});

// Methods
messageSchema.methods.edit = async function(newContent: string): Promise<void> {
  if (!this.editHistory) {
    this.editHistory = [];
  }
  
  this.editHistory.push({
    content: this.content,
    editedAt: this.editedAt || this.createdAt
  });
  
  this.content = newContent;
  this.editedAt = new Date();
  await this.save();
};

messageSchema.methods.softDelete = async function(): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[Message deleted]';
  await this.save();
};

messageSchema.methods.addReaction = async function(
  emoji: string, 
  userId: mongoose.Types.ObjectId
): Promise<void> {
  if (!this.reactions) {
    this.reactions = [];
  }
  
  let reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (!reaction) {
    reaction = { emoji, users: [] };
    this.reactions.push(reaction);
  }
  
  if (!reaction.users.some(id => id.equals(userId))) {
    reaction.users.push(userId);
    await this.save();
  }
};

messageSchema.methods.removeReaction = async function(
  emoji: string, 
  userId: mongoose.Types.ObjectId
): Promise<void> {
  if (!this.reactions) return;
  
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    reaction.users = reaction.users.filter(id => !id.equals(userId));
    
    if (reaction.users.length === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
    
    await this.save();
  }
};

messageSchema.methods.pin = async function(): Promise<void> {
  this.isPinned = true;
  await this.save();
};

messageSchema.methods.unpin = async function(): Promise<void> {
  this.isPinned = false;
  await this.save();
};

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema);