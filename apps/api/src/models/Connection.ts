import mongoose, { Schema, Document } from 'mongoose';
import type { IConnection, ConnectionStatus } from '@tatame/types';

export interface IConnectionDocument extends Omit<IConnection, 'id'>, Document {}

const connectionSchema = new Schema<IConnectionDocument>({
  fromUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked', 'rejected'],
    default: 'pending',
    required: true
  },
  message: {
    type: String,
    maxlength: 500,
    trim: true
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  blockedAt: {
    type: Date,
    default: null
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

// Indexes for efficient queries
connectionSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
connectionSchema.index({ toUserId: 1, status: 1 });
connectionSchema.index({ fromUserId: 1, status: 1 });
connectionSchema.index({ status: 1, createdAt: -1 });

// Prevent duplicate connections
connectionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if connection already exists in either direction
    const existingConnection = await Connection.findOne({
      $or: [
        { fromUserId: this.fromUserId, toUserId: this.toUserId },
        { fromUserId: this.toUserId, toUserId: this.fromUserId }
      ]
    });
    
    if (existingConnection) {
      throw new Error('Connection already exists');
    }
  }
  
  this.updatedAt = new Date();
  next();
});

// Update user connection counts when connection is accepted
connectionSchema.post('save', async function() {
  if (this.status === 'accepted') {
    const User = mongoose.model('User');
    
    // Update both users' connection counts
    await User.findByIdAndUpdate(this.fromUserId, { $inc: { connectionCount: 1 } });
    await User.findByIdAndUpdate(this.toUserId, { $inc: { connectionCount: 1 } });
  }
});

// Update user connection counts when connection is removed
connectionSchema.post('remove', async function() {
  if (this.status === 'accepted') {
    const User = mongoose.model('User');
    
    // Decrement both users' connection counts
    await User.findByIdAndUpdate(this.fromUserId, { $inc: { connectionCount: -1 } });
    await User.findByIdAndUpdate(this.toUserId, { $inc: { connectionCount: -1 } });
  }
});

export const Connection = mongoose.model<IConnectionDocument>('Connection', connectionSchema);