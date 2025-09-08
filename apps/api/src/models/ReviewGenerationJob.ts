import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewGenerationJobDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'single' | 'bulk';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  
  // Job configuration
  config: {
    publishToWordPress: boolean;
    selectedSiteId?: mongoose.Types.ObjectId;
    reviewsData: Array<{
      title: string;
      contentType?: 'bbr' | 'spr' | 'informational';
      products: Array<{
        name: string;
        imageUrl?: string;
        affiliateLink: string;
        pros: string[];
        cons: string[];
        description?: string;
      }>;
      outline?: string[];
    }>;
  };
  
  // Results
  results: {
    completed: Array<{
      reviewId: mongoose.Types.ObjectId;
      title: string;
      status: 'success' | 'failed';
      error?: string;
      wordpressUrl?: string;
      generatedAt: Date;
    }>;
    
    // Summary statistics
    stats: {
      totalReviews: number;
      successfulReviews: number;
      failedReviews: number;
      totalTokensUsed: number;
      totalCost: number;
      totalGenerationTime: number; // in milliseconds
    };
  };
  
  // Current processing info
  currentStep?: string;
  currentReviewIndex?: number;
  
  // Error handling
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  
  // BullMQ job reference
  bullJobId: string;
  
  // Timestamps
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const reviewGenerationJobSchema = new Schema<IReviewGenerationJobDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['single', 'bulk'],
    required: true
  },
  
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },
  
  progress: {
    current: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  config: {
    publishToWordPress: {
      type: Boolean,
      default: false
    },
    selectedSiteId: {
      type: Schema.Types.ObjectId,
      ref: 'WordPressSite'
    },
    reviewsData: [{
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
      outline: [String]
    }]
  },
  
  results: {
    completed: [{
      reviewId: {
        type: Schema.Types.ObjectId,
        ref: 'Review'
      },
      title: String,
      status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
      },
      error: String,
      wordpressUrl: String,
      generatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    stats: {
      totalReviews: {
        type: Number,
        default: 0
      },
      successfulReviews: {
        type: Number,
        default: 0
      },
      failedReviews: {
        type: Number,
        default: 0
      },
      totalTokensUsed: {
        type: Number,
        default: 0
      },
      totalCost: {
        type: Number,
        default: 0
      },
      totalGenerationTime: {
        type: Number,
        default: 0
      }
    }
  },
  
  currentStep: String,
  currentReviewIndex: Number,
  
  error: {
    message: String,
    code: String,
    stack: String
  },
  
  bullJobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  queuedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

reviewGenerationJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-calculate percentage
  if (this.progress.total > 0) {
    this.progress.percentage = Math.round((this.progress.current / this.progress.total) * 100);
  }
  
  next();
});

// Indexes for better query performance
reviewGenerationJobSchema.index({ userId: 1, status: 1 });
reviewGenerationJobSchema.index({ status: 1, createdAt: -1 });
reviewGenerationJobSchema.index({ userId: 1, createdAt: -1 });

// Instance methods
reviewGenerationJobSchema.methods.updateProgress = async function(current: number, step?: string): Promise<void> {
  this.progress.current = Math.min(current, this.progress.total);
  this.progress.percentage = Math.round((this.progress.current / this.progress.total) * 100);
  
  if (step) {
    this.currentStep = step;
  }
  
  await this.save();
};

reviewGenerationJobSchema.methods.addResult = async function(result: {
  reviewId?: mongoose.Types.ObjectId;
  title: string;
  status: 'success' | 'failed';
  error?: string;
  wordpressUrl?: string;
}): Promise<void> {
  this.results.completed.push({
    ...result,
    generatedAt: new Date()
  });
  
  // Update stats
  this.results.stats.totalReviews = this.results.completed.length;
  this.results.stats.successfulReviews = this.results.completed.filter(r => r.status === 'success').length;
  this.results.stats.failedReviews = this.results.completed.filter(r => r.status === 'failed').length;
  
  await this.save();
};

reviewGenerationJobSchema.methods.markAsStarted = async function(): Promise<void> {
  this.status = 'processing';
  this.startedAt = new Date();
  await this.save();
};

reviewGenerationJobSchema.methods.markAsCompleted = async function(): Promise<void> {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.current = this.progress.total;
  this.progress.percentage = 100;
  await this.save();
};

reviewGenerationJobSchema.methods.markAsFailed = async function(error: any): Promise<void> {
  this.status = 'failed';
  this.completedAt = new Date();
  this.error = {
    message: error.message || 'Unknown error',
    code: error.code,
    stack: error.stack
  };
  await this.save();
};

reviewGenerationJobSchema.methods.addStats = async function(stats: {
  tokensUsed: number;
  cost: number;
  generationTime: number;
}): Promise<void> {
  this.results.stats.totalTokensUsed += stats.tokensUsed;
  this.results.stats.totalCost += stats.cost;
  this.results.stats.totalGenerationTime += stats.generationTime;
  await this.save();
};

// Static methods
reviewGenerationJobSchema.statics.findActiveJobsForUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({
    userId,
    status: { $in: ['queued', 'processing'] }
  }).sort({ createdAt: -1 });
};

reviewGenerationJobSchema.statics.findRecentJobsForUser = function(userId: mongoose.Types.ObjectId, limit: number = 10) {
  return this.find({
    userId
  }).sort({ createdAt: -1 }).limit(limit);
};

export const ReviewGenerationJob = mongoose.model<IReviewGenerationJobDocument>('ReviewGenerationJob', reviewGenerationJobSchema);