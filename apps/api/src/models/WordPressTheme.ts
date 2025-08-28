import mongoose, { Document, Schema } from 'mongoose';

export interface IWordPressTheme extends Document {
  name: string;
  slug: string;
  description: string;
  category: 'blog' | 'business' | 'ecommerce' | 'portfolio' | 'agency' | 'magazine' | 'landing';
  version: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  demoUrl?: string;
  author: string;
  rating?: number;
  downloadCount?: number;
  isDefault: boolean;
  isActive: boolean;
  isPremium: boolean;
  features: string[];
  tags: string[];
  minWordPressVersion?: string;
  testedUpTo?: string;
  requiresPHP?: string;
  metadata: {
    lastUpdated?: Date;
    homepageUrl?: string;
    supportUrl?: string;
    screenshotUrls?: string[];
  };
  addedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WordPressThemeSchema = new Schema<IWordPressTheme>(
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
      maxlength: 1000
    },
    category: {
      type: String,
      required: true,
      enum: ['blog', 'business', 'ecommerce', 'portfolio', 'agency', 'magazine', 'landing']
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    thumbnailUrl: {
      type: String
    },
    previewUrl: {
      type: String
    },
    demoUrl: {
      type: String
    },
    author: {
      type: String,
      default: 'WordPress.org'
    },
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    features: [{
      type: String
    }],
    tags: [{
      type: String
    }],
    minWordPressVersion: {
      type: String,
      default: '5.0'
    },
    testedUpTo: {
      type: String
    },
    requiresPHP: {
      type: String,
      default: '7.4'
    },
    metadata: {
      lastUpdated: Date,
      homepageUrl: String,
      supportUrl: String,
      screenshotUrls: [String]
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
WordPressThemeSchema.index({ slug: 1 });
WordPressThemeSchema.index({ category: 1, isActive: 1 });
WordPressThemeSchema.index({ isDefault: 1 });
WordPressThemeSchema.index({ isActive: 1 });

// Ensure only one default theme per category
WordPressThemeSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default from other themes in the same category
    await mongoose.models.WordPressTheme.updateMany(
      { 
        category: this.category, 
        _id: { $ne: this._id },
        isDefault: true 
      },
      { isDefault: false }
    );
  }
  next();
});

export const WordPressTheme = mongoose.model<IWordPressTheme>('WordPressTheme', WordPressThemeSchema);