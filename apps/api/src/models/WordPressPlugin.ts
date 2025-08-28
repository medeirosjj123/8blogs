import mongoose, { Document, Schema } from 'mongoose';

export interface IWordPressPlugin extends Document {
  name: string;
  slug: string;
  description: string;
  category: 'seo' | 'security' | 'performance' | 'backup' | 'forms' | 'ecommerce' | 'analytics' | 'social' | 'content' | 'utilities';
  version: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  homepageUrl?: string;
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
  dependencies?: string[];
  conflicts?: string[];
  metadata: {
    lastUpdated?: Date;
    homepageUrl?: string;
    supportUrl?: string;
    screenshotUrls?: string[];
    shortDescription?: string;
    installation?: string;
    faq?: string[];
  };
  addedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WordPressPluginSchema = new Schema<IWordPressPlugin>(
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
      enum: ['seo', 'security', 'performance', 'backup', 'forms', 'ecommerce', 'analytics', 'social', 'content', 'utilities']
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    thumbnailUrl: {
      type: String
    },
    downloadUrl: {
      type: String
    },
    homepageUrl: {
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
    dependencies: [{
      type: String
    }],
    conflicts: [{
      type: String
    }],
    metadata: {
      lastUpdated: Date,
      homepageUrl: String,
      supportUrl: String,
      screenshotUrls: [String],
      shortDescription: String,
      installation: String,
      faq: [String]
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
WordPressPluginSchema.index({ slug: 1 });
WordPressPluginSchema.index({ category: 1, isActive: 1 });
WordPressPluginSchema.index({ isDefault: 1 });
WordPressPluginSchema.index({ isActive: 1 });
WordPressPluginSchema.index({ isPremium: 1 });

// Ensure only reasonable number of default plugins per category
WordPressPluginSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Count existing default plugins in the same category
    const defaultCount = await mongoose.models.WordPressPlugin.countDocuments({
      category: this.category,
      _id: { $ne: this._id },
      isDefault: true
    });
    
    // Limit to maximum 3 default plugins per category
    if (defaultCount >= 3) {
      throw new Error(`Maximum of 3 default plugins allowed per category. Current category '${this.category}' already has ${defaultCount} defaults.`);
    }
  }
  next();
});

export const WordPressPlugin = mongoose.model<IWordPressPlugin>('WordPressPlugin', WordPressPluginSchema);