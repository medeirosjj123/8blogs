import mongoose, { Schema, Document } from 'mongoose';

export interface IWeeklyCall extends Document {
  title: string;
  description: string;
  date: Date;
  duration: number; // minutes
  maxParticipants: number;
  zoomLink?: string;
  recordingLink?: string;
  topics: string[];
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  registeredUsers: mongoose.Types.ObjectId[];
  attendedUsers: mongoose.Types.ObjectId[];
  registrationDeadline?: Date;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyCallSchema = new Schema<IWeeklyCall>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 15,
    max: 300 // 5 hours max
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 25
  },
  zoomLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL format. Please provide a valid meeting link.'
    }
  },
  recordingLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid recording link format'
    }
  },
  topics: {
    type: [String],
    default: [],
    validate: {
      validator: function(topics: string[]) {
        return topics.length <= 10; // Max 10 topics
      },
      message: 'Maximum 10 topics allowed'
    }
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  registeredUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  attendedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  registrationDeadline: {
    type: Date
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly']
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    }
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

// Indexes for better query performance
weeklyCallSchema.index({ date: 1, status: 1 });
weeklyCallSchema.index({ createdBy: 1 });
weeklyCallSchema.index({ registeredUsers: 1 });
weeklyCallSchema.index({ status: 1, date: 1 });

// Update the updatedAt field on save
weeklyCallSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for current participant count
weeklyCallSchema.virtual('currentParticipants').get(function() {
  return this.registeredUsers.length;
});

// Virtual for available spots
weeklyCallSchema.virtual('availableSpots').get(function() {
  return Math.max(0, this.maxParticipants - this.registeredUsers.length);
});

// Virtual for is full
weeklyCallSchema.virtual('isFull').get(function() {
  return this.registeredUsers.length >= this.maxParticipants;
});

// Virtual for registration status
weeklyCallSchema.virtual('canRegister').get(function() {
  const now = new Date();
  const isBeforeDeadline = !this.registrationDeadline || now <= this.registrationDeadline;
  const isBeforeCall = now < this.date;
  const hasSpace = !this.isFull;
  const isUpcoming = this.status === 'upcoming';
  
  return isBeforeDeadline && isBeforeCall && hasSpace && isUpcoming;
});

// Method to check if a user is registered
weeklyCallSchema.methods.isUserRegistered = function(userId: string) {
  return this.registeredUsers.some((id: mongoose.Types.ObjectId) => 
    id.toString() === userId.toString()
  );
};

// Method to register a user
weeklyCallSchema.methods.registerUser = function(userId: string) {
  if (!this.isUserRegistered(userId) && this.canRegister) {
    this.registeredUsers.push(new mongoose.Types.ObjectId(userId));
    return true;
  }
  return false;
};

// Method to unregister a user
weeklyCallSchema.methods.unregisterUser = function(userId: string) {
  const index = this.registeredUsers.findIndex((id: mongoose.Types.ObjectId) => 
    id.toString() === userId.toString()
  );
  if (index !== -1) {
    this.registeredUsers.splice(index, 1);
    return true;
  }
  return false;
};

// Method to mark attendance
weeklyCallSchema.methods.markAttendance = function(userId: string, attended: boolean = true) {
  if (!this.isUserRegistered(userId)) {
    return false; // User must be registered
  }
  
  const isAlreadyMarked = this.attendedUsers.some((id: mongoose.Types.ObjectId) => 
    id.toString() === userId.toString()
  );
  
  if (attended && !isAlreadyMarked) {
    this.attendedUsers.push(new mongoose.Types.ObjectId(userId));
  } else if (!attended && isAlreadyMarked) {
    const index = this.attendedUsers.findIndex((id: mongoose.Types.ObjectId) => 
      id.toString() === userId.toString()
    );
    this.attendedUsers.splice(index, 1);
  }
  
  return true;
};

// Static method to find upcoming calls
weeklyCallSchema.statics.findUpcoming = function() {
  return this.find({
    status: 'upcoming',
    date: { $gte: new Date() }
  }).sort({ date: 1 });
};

// Static method to find past calls
weeklyCallSchema.statics.findPast = function() {
  return this.find({
    $or: [
      { status: 'completed' },
      { status: 'cancelled' },
      { date: { $lt: new Date() }, status: 'upcoming' }
    ]
  }).sort({ date: -1 });
};

export const WeeklyCall = mongoose.model<IWeeklyCall>('WeeklyCall', weeklyCallSchema);