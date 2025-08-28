import mongoose, { Document, Schema } from 'mongoose';

export interface ISeoConfig extends Document {
  page: string; // 'home', 'about', 'courses', 'community', etc.
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  robots?: string;
  structuredData?: any;
  customMeta?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SeoConfigSchema = new Schema<ISeoConfig>(
  {
    page: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 60
    },
    description: {
      type: String,
      required: true,
      maxlength: 160
    },
    keywords: {
      type: String,
      maxlength: 500
    },
    ogTitle: {
      type: String,
      maxlength: 60
    },
    ogDescription: {
      type: String,
      maxlength: 160
    },
    ogImage: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'OG Image must be a valid image URL'
      }
    },
    ogType: {
      type: String,
      default: 'website',
      enum: ['website', 'article', 'product', 'video', 'music']
    },
    twitterCard: {
      type: String,
      default: 'summary_large_image',
      enum: ['summary', 'summary_large_image', 'app', 'player']
    },
    twitterTitle: {
      type: String,
      maxlength: 60
    },
    twitterDescription: {
      type: String,
      maxlength: 160
    },
    twitterImage: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Twitter Image must be a valid image URL'
      }
    },
    canonicalUrl: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Canonical URL must be a valid URL'
      }
    },
    robots: {
      type: String,
      default: 'index, follow'
    },
    structuredData: {
      type: Schema.Types.Mixed
    },
    customMeta: [{
      name: String,
      property: String,
      content: {
        type: String,
        required: true
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for automatic OG fallbacks
SeoConfigSchema.virtual('finalOgTitle').get(function() {
  return this.ogTitle || this.title;
});

SeoConfigSchema.virtual('finalOgDescription').get(function() {
  return this.ogDescription || this.description;
});

SeoConfigSchema.virtual('finalTwitterTitle').get(function() {
  return this.twitterTitle || this.ogTitle || this.title;
});

SeoConfigSchema.virtual('finalTwitterDescription').get(function() {
  return this.twitterDescription || this.ogDescription || this.description;
});

// Method to get full SEO data with fallbacks
SeoConfigSchema.methods.getFullSeoData = function() {
  return {
    title: this.title,
    description: this.description,
    keywords: this.keywords,
    og: {
      title: this.finalOgTitle,
      description: this.finalOgDescription,
      image: this.ogImage,
      type: this.ogType
    },
    twitter: {
      card: this.twitterCard,
      title: this.finalTwitterTitle,
      description: this.finalTwitterDescription,
      image: this.twitterImage || this.ogImage
    },
    canonical: this.canonicalUrl,
    robots: this.robots,
    structuredData: this.structuredData,
    customMeta: this.customMeta
  };
};

export const SeoConfig = mongoose.model<ISeoConfig>('SeoConfig', SeoConfigSchema);