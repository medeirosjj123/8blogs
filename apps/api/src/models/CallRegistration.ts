import mongoose, { Schema, Document } from 'mongoose';

export interface ICallRegistration extends Document {
  userId: mongoose.Types.ObjectId;
  callId: mongoose.Types.ObjectId;
  registeredAt: Date;
  attended: boolean;
  joinedAt?: Date;
  leftAt?: Date;
  duration?: number; // minutes
  rating?: number; // 1-5 stars
  feedback?: string;
  remindersSent: {
    initial: boolean;
    oneDayBefore: boolean;
    oneHourBefore: boolean;
  };
  cancelledAt?: Date;
  cancellationReason?: string;
  waitlisted: boolean;
  waitlistPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

const callRegistrationSchema = new Schema<ICallRegistration>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callId: {
    type: Schema.Types.ObjectId,
    ref: 'WeeklyCall',
    required: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  attended: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date
  },
  leftAt: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    min: 0
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: 500,
    trim: true
  },
  remindersSent: {
    initial: {
      type: Boolean,
      default: false
    },
    oneDayBefore: {
      type: Boolean,
      default: false
    },
    oneHourBefore: {
      type: Boolean,
      default: false
    }
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: 200,
    trim: true
  },
  waitlisted: {
    type: Boolean,
    default: false
  },
  waitlistPosition: {
    type: Number,
    min: 1
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

// Compound indexes for better query performance
callRegistrationSchema.index({ userId: 1, callId: 1 }, { unique: true });
callRegistrationSchema.index({ callId: 1, waitlisted: 1 });
callRegistrationSchema.index({ callId: 1, attended: 1 });
callRegistrationSchema.index({ userId: 1, attended: 1 });
callRegistrationSchema.index({ registeredAt: 1 });

// Update the updatedAt field on save
callRegistrationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate duration if both join and leave times are set
  if (this.joinedAt && this.leftAt) {
    this.duration = Math.round((this.leftAt.getTime() - this.joinedAt.getTime()) / (1000 * 60));
  }
  
  next();
});

// Virtual for registration status
callRegistrationSchema.virtual('status').get(function() {
  if (this.cancelledAt) return 'cancelled';
  if (this.waitlisted) return 'waitlisted';
  if (this.attended) return 'attended';
  return 'registered';
});

// Virtual for is active registration
callRegistrationSchema.virtual('isActive').get(function() {
  return !this.cancelledAt && !this.waitlisted;
});

// Method to cancel registration
callRegistrationSchema.methods.cancel = function(reason?: string) {
  this.cancelledAt = new Date();
  if (reason) {
    this.cancellationReason = reason;
  }
  return this.save();
};

// Method to move from waitlist to registered
callRegistrationSchema.methods.promoteFromWaitlist = function() {
  if (this.waitlisted) {
    this.waitlisted = false;
    this.waitlistPosition = undefined;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark as attended with timing
callRegistrationSchema.methods.markAttended = function(joinedAt?: Date, leftAt?: Date) {
  this.attended = true;
  if (joinedAt) this.joinedAt = joinedAt;
  if (leftAt) this.leftAt = leftAt;
  return this.save();
};

// Method to add feedback
callRegistrationSchema.methods.addFeedback = function(rating: number, feedback?: string) {
  if (rating >= 1 && rating <= 5) {
    this.rating = rating;
  }
  if (feedback) {
    this.feedback = feedback.trim();
  }
  return this.save();
};

// Static method to get call statistics
callRegistrationSchema.statics.getCallStats = function(callId: string) {
  return this.aggregate([
    { $match: { callId: new mongoose.Types.ObjectId(callId) } },
    {
      $group: {
        _id: null,
        totalRegistered: { $sum: 1 },
        totalAttended: { $sum: { $cond: ['$attended', 1, 0] } },
        totalCancelled: { $sum: { $cond: ['$cancelledAt', 1, 0] } },
        totalWaitlisted: { $sum: { $cond: ['$waitlisted', 1, 0] } },
        averageRating: { $avg: '$rating' },
        averageDuration: { $avg: '$duration' }
      }
    }
  ]);
};

// Static method to find registrations that need reminders
callRegistrationSchema.statics.findPendingReminders = function(reminderType: 'initial' | 'oneDayBefore' | 'oneHourBefore') {
  const now = new Date();
  let dateFilter: any;
  
  switch (reminderType) {
    case 'initial':
      // Send initial confirmation immediately after registration
      dateFilter = {};
      break;
    case 'oneDayBefore':
      // Send reminder 24 hours before call
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dateFilter = {
        $gte: now,
        $lte: tomorrow
      };
      break;
    case 'oneHourBefore':
      // Send reminder 1 hour before call
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      dateFilter = {
        $gte: now,
        $lte: oneHourFromNow
      };
      break;
  }
  
  return this.aggregate([
    {
      $lookup: {
        from: 'weeklycalls',
        localField: 'callId',
        foreignField: '_id',
        as: 'call'
      }
    },
    { $unwind: '$call' },
    {
      $match: {
        [`remindersSent.${reminderType}`]: false,
        cancelledAt: { $exists: false },
        waitlisted: false,
        'call.date': dateFilter,
        'call.status': 'upcoming'
      }
    }
  ]);
};

export const CallRegistration = mongoose.model<ICallRegistration>('CallRegistration', callRegistrationSchema);