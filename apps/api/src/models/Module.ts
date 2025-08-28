import mongoose, { Schema, Document } from 'mongoose';

export interface IModuleDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  order: number;
  lessons: mongoose.Types.ObjectId[];
  duration: number; // in minutes
  isPublished: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<IModuleDocument>({
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
  order: {
    type: Number,
    required: true,
    default: 0
  },
  lessons: [{
    type: Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  duration: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
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

moduleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

moduleSchema.index({ courseId: 1, order: 1 });
moduleSchema.index({ courseId: 1, slug: 1 }, { unique: true });

moduleSchema.virtual('lessonCount').get(function() {
  return this.lessons.length;
});

moduleSchema.methods.addLesson = async function(lessonId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.lessons.includes(lessonId)) {
    this.lessons.push(lessonId);
    await this.save();
  }
};

moduleSchema.methods.removeLesson = async function(lessonId: mongoose.Types.ObjectId): Promise<void> {
  this.lessons = this.lessons.filter(id => !id.equals(lessonId));
  await this.save();
};

moduleSchema.methods.reorderLessons = async function(lessonIds: mongoose.Types.ObjectId[]): Promise<void> {
  this.lessons = lessonIds;
  await this.save();
};

export const Module = mongoose.model<IModuleDocument>('Module', moduleSchema);