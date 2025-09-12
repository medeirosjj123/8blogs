import mongoose, { Schema, Document } from 'mongoose';

export interface ILessonDocument extends Document {
  moduleId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  order: number;
  duration: number; // in minutes
  videoUrl?: string;
  videoProvider?: 'vimeo' | 'youtube' | 'custom';
  videoId?: string;
  content?: string; // For text lessons
  materials?: Array<{
    title: string;
    url: string;
    type: string;
  }>;
  quiz?: {
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }>;
    passingScore: number;
  };
  assignment?: {
    instructions: string;
    dueDate?: Date;
    maxScore?: number;
  };
  isPublished: boolean;
  isFree: boolean;
  xpReward?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILessonDocument>({
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
    index: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['video', 'text', 'quiz', 'assignment'],
    default: 'video',
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: Number,
    default: 0
  },
  videoUrl: String,
  videoProvider: {
    type: String,
    enum: ['vimeo', 'youtube', 'custom']
  },
  videoId: String,
  content: String,
  materials: [{
    title: String,
    url: String,
    type: String
  }],
  quiz: {
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number,
      explanation: String
    }],
    passingScore: {
      type: Number,
      default: 70
    }
  },
  assignment: {
    instructions: String,
    dueDate: Date,
    maxScore: Number
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFree: {
    type: Boolean,
    default: false
  },
  xpReward: {
    type: Number,
    default: 50
  },
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

lessonSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

lessonSchema.index({ moduleId: 1, order: 1 });
lessonSchema.index({ courseId: 1, moduleId: 1, slug: 1 }, { unique: true });
lessonSchema.index({ type: 1, isPublished: 1 });

lessonSchema.methods.getVimeoEmbedUrl = function(): string | null {
  if (this.videoProvider === 'vimeo' && this.videoId) {
    return `https://player.vimeo.com/video/${this.videoId}`;
  }
  return null;
};

lessonSchema.methods.publish = async function(): Promise<void> {
  this.isPublished = true;
  await this.save();
};

lessonSchema.methods.unpublish = async function(): Promise<void> {
  this.isPublished = false;
  await this.save();
};

export const Lesson = mongoose.model<ILessonDocument>('Lesson', lessonSchema);