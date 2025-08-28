import mongoose, { Schema, Document } from 'mongoose';

export interface ILessonProgressDocument extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: Date;
  startedAt?: Date;
  watchTime?: number; // in seconds
  totalWatchTime?: number; // cumulative watch time
  lastPosition?: number; // last video position in seconds
  quizScore?: number;
  quizAttempts?: number;
  assignmentSubmitted?: boolean;
  assignmentScore?: number;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const lessonProgressSchema = new Schema<ILessonProgressDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
    index: true
  },
  lessonId: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
    index: true
  },
  completedAt: Date,
  startedAt: Date,
  watchTime: {
    type: Number,
    default: 0
  },
  totalWatchTime: {
    type: Number,
    default: 0
  },
  lastPosition: {
    type: Number,
    default: 0
  },
  quizScore: Number,
  quizAttempts: {
    type: Number,
    default: 0
  },
  assignmentSubmitted: {
    type: Boolean,
    default: false
  },
  assignmentScore: Number,
  notes: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
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

lessonProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound index for unique progress per user-lesson combination
lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, courseId: 1, status: 1 });
lessonProgressSchema.index({ userId: 1, moduleId: 1, status: 1 });

lessonProgressSchema.methods.markAsStarted = async function(): Promise<void> {
  if (this.status === 'not_started') {
    this.status = 'in_progress';
    this.startedAt = new Date();
    await this.save();
  }
};

lessonProgressSchema.methods.markAsCompleted = async function(): Promise<void> {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
};

lessonProgressSchema.methods.updateWatchTime = async function(position: number, duration: number): Promise<void> {
  this.lastPosition = position;
  this.watchTime = duration;
  this.totalWatchTime = (this.totalWatchTime || 0) + duration;
  
  // Auto-complete if watched 90% of the video
  const lesson = await mongoose.model('Lesson').findById(this.lessonId);
  if (lesson && lesson.duration) {
    const watchPercentage = (position / (lesson.duration * 60)) * 100;
    if (watchPercentage >= 90 && this.status !== 'completed') {
      await this.markAsCompleted();
      return;
    }
  }
  
  if (this.status === 'not_started') {
    await this.markAsStarted();
  } else {
    await this.save();
  }
};

export const LessonProgress = mongoose.model<ILessonProgressDocument>('LessonProgress', lessonProgressSchema);