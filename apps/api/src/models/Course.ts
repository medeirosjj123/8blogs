import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseDocument extends Document {
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  instructor: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  modules: mongoose.Types.ObjectId[];
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  order: number;
  requirements?: string[];
  objectives?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourseDocument>({
  title: {
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
    required: true
  },
  thumbnail: String,
  instructor: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number,
    default: 0
  },
  modules: [{
    type: Schema.Types.ObjectId,
    ref: 'Module'
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: Date,
  order: {
    type: Number,
    default: 0
  },
  requirements: [String],
  objectives: [String],
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

courseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

courseSchema.index({ isPublished: 1, order: 1 });
courseSchema.index({ tags: 1 });

courseSchema.virtual('moduleCount').get(function() {
  return this.modules.length;
});

courseSchema.methods.publish = async function(): Promise<void> {
  this.isPublished = true;
  this.publishedAt = new Date();
  await this.save();
};

courseSchema.methods.unpublish = async function(): Promise<void> {
  this.isPublished = false;
  await this.save();
};

export const Course = mongoose.model<ICourseDocument>('Course', courseSchema);