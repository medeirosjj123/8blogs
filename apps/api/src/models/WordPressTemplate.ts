import mongoose, { Document, Schema } from 'mongoose';

export interface IWordPressTemplate extends Document {
  name: string;
  slug: string;
  description: string;
  category: 'blog' | 'affiliate' | 'business' | 'ecommerce' | 'portfolio' | 'landing';
  version: string;
  thumbnailUrl?: string;
  downloadUrl: string;
  demoUrl?: string;
  features: string[];
  seoScore: number;
  performanceScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  fileSize: number; // in bytes
  fileName: string;
  wordpressVersion?: string;
  phpVersion?: string;
  requiredPlugins?: string[];
  pricingTier: 'free' | 'pro' | 'premium';
  status: 'active' | 'draft' | 'archived';
  downloads: number;
  rating?: number;
  metadata?: {
    pageCount?: number;
    postCount?: number;
    hasWooCommerce?: boolean;
    hasElementor?: boolean;
    hasContactForm?: boolean;
    schemaTypes?: string[];
  };
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WordPressTemplateSchema = new Schema<IWordPressTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    category: {
      type: String,
      required: true,
      enum: ['blog', 'affiliate', 'business', 'ecommerce', 'portfolio', 'landing']
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    thumbnailUrl: {
      type: String
    },
    downloadUrl: {
      type: String,
      required: true
    },
    demoUrl: {
      type: String
    },
    features: [{
      type: String
    }],
    seoScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    performanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    wordpressVersion: {
      type: String
    },
    phpVersion: {
      type: String,
      default: '8.1'
    },
    requiredPlugins: [{
      type: String
    }],
    pricingTier: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'draft'
    },
    downloads: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    metadata: {
      pageCount: Number,
      postCount: Number,
      hasWooCommerce: Boolean,
      hasElementor: Boolean,
      hasContactForm: Boolean,
      schemaTypes: [String]
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
WordPressTemplateSchema.index({ slug: 1 });
WordPressTemplateSchema.index({ category: 1, status: 1 });
WordPressTemplateSchema.index({ status: 1 });
WordPressTemplateSchema.index({ pricingTier: 1 });

// Pre-save hook to generate slug if not provided
WordPressTemplateSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Virtual for formatted file size
WordPressTemplateSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
});

// Method to increment download count
WordPressTemplateSchema.methods.incrementDownloads = async function() {
  this.downloads += 1;
  return this.save();
};

export const WordPressTemplate = mongoose.model<IWordPressTemplate>('WordPressTemplate', WordPressTemplateSchema);