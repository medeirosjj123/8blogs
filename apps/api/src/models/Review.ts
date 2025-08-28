import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct {
  name: string;
  imageUrl?: string;
  affiliateLink: string;
  pros: string[];
  cons: string[];
  description?: string;
}

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  contentType?: 'bbr' | 'spr' | 'informational';
  products: IProduct[];
  content: {
    introduction: string;
    reviews: string[];
    conclusion?: string;
    fullHtml: string;
  };
  metadata: {
    model: string;
    provider: string;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    generationTime: number; // in seconds
    generatedAt: Date;
  };
  published: Array<{
    siteId: mongoose.Types.ObjectId;
    wordpressId?: number;
    url?: string;
    publishedAt: Date;
    status: 'published' | 'draft' | 'failed';
  }>;
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['bbr', 'spr', 'informational'],
    default: 'bbr'
  },
  products: [{
    name: {
      type: String,
      required: true
    },
    imageUrl: String,
    affiliateLink: {
      type: String,
      required: true
    },
    pros: [{
      type: String,
      required: true
    }],
    cons: [{
      type: String,
      required: true
    }],
    description: String
  }],
  content: {
    introduction: {
      type: String,
      required: true
    },
    reviews: [{
      type: String,
      required: true
    }],
    conclusion: String,
    fullHtml: {
      type: String,
      required: true
    }
  },
  metadata: {
    model: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      required: true,
      enum: ['openai', 'gemini', 'anthropic']
    },
    tokensUsed: {
      input: {
        type: Number,
        default: 0
      },
      output: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0
      }
    },
    cost: {
      type: Number,
      default: 0
    },
    generationTime: {
      type: Number,
      default: 0
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  published: [{
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'WordPressSite'
    },
    wordpressId: Number,
    url: String,
    publishedAt: Date,
    status: {
      type: String,
      enum: ['published', 'draft', 'failed'],
      default: 'draft'
    }
  }],
  analytics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Index for better query performance
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ 'published.siteId': 1 });
reviewSchema.index({ status: 1 });

// Virtual for total cost in BRL
reviewSchema.virtual('costBRL').get(function() {
  return (this.metadata.cost * 6).toFixed(2); // Assuming 1 USD = 6 BRL
});

// Method to calculate estimated reading time
reviewSchema.methods.getReadingTime = function(): number {
  const wordsPerMinute = 200;
  const text = this.content.fullHtml.replace(/<[^>]*>/g, ''); // Strip HTML
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

export const Review = mongoose.model<IReview>('Review', reviewSchema);