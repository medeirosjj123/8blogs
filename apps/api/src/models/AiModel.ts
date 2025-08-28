import mongoose, { Document, Schema } from 'mongoose';

export interface IAiModel extends Document {
  name: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  modelId: string; // e.g., 'gpt-4o-mini', 'gemini-1.5-pro'
  apiKey?: string; // API key for this provider (plain text)
  inputCostPer1k: number; // Cost per 1000 input tokens
  outputCostPer1k: number; // Cost per 1000 output tokens
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  isActive: boolean;
  isPrimary: boolean;
  isFallback: boolean;
  description?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  getMaskedApiKey(): string;
}

const aiModelSchema = new Schema<IAiModel>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,
    enum: ['openai', 'gemini', 'anthropic'],
    required: true
  },
  modelId: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String,
    select: false // Don't include in queries by default for security
  },
  inputCostPer1k: {
    type: Number,
    required: true,
    min: 0
  },
  outputCostPer1k: {
    type: Number,
    required: true,
    min: 0
  },
  maxTokens: {
    type: Number,
    default: 2000,
    min: 100,
    max: 10000
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2
  },
  topP: {
    type: Number,
    default: 1,
    min: 0,
    max: 1
  },
  frequencyPenalty: {
    type: Number,
    default: 0,
    min: -2,
    max: 2
  },
  presencePenalty: {
    type: Number,
    default: 0,
    min: -2,
    max: 2
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  isFallback: {
    type: Boolean,
    default: false
  },
  description: {
    type: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save middleware - only handle primary/fallback uniqueness
aiModelSchema.pre('save', async function(next) {
  // Ensure only one primary model
  if (this.isPrimary && this.isActive) {
    await mongoose.model('AiModel').updateMany(
      { _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  
  // Ensure only one fallback model
  if (this.isFallback && this.isActive) {
    await mongoose.model('AiModel').updateMany(
      { _id: { $ne: this._id } },
      { isFallback: false }
    );
  }
  
  next();
});

// Removed encryption middleware - API keys are now stored as plain text

// Instance method to get masked API key
aiModelSchema.methods.getMaskedApiKey = function(): string {
  if (!this.apiKey) return '';
  
  // Simple masking for plain text API keys
  const key = this.apiKey;
  if (key.length < 8) return '***';
  
  const start = key.substring(0, 7);
  const end = key.substring(key.length - 4);
  return `${start}...${end}`;
};

// Index for faster queries
aiModelSchema.index({ isActive: 1, isPrimary: 1 });
aiModelSchema.index({ isActive: 1, isFallback: 1 });
aiModelSchema.index({ provider: 1 });

// Virtual field for masked API key (for serialization)
aiModelSchema.virtual('apiKeyMasked').get(function() {
  return this.getMaskedApiKey();
});

// Ensure virtuals are included in JSON
aiModelSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Never include the actual encrypted API key in JSON
    delete ret.apiKey;
    return ret;
  }
});

export const AiModel = mongoose.model<IAiModel>('AiModel', aiModelSchema);