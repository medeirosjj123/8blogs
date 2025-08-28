import mongoose, { Document, Schema } from 'mongoose';

export interface IAiSettings extends Document {
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isActive: boolean;
  description?: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const aiSettingsSchema = new Schema<IAiSettings>({
  provider: {
    type: String,
    enum: ['openai', 'gemini', 'anthropic'],
    required: true,
    default: 'openai'
  },
  model: {
    type: String,
    required: true,
    default: 'gpt-4o-mini'
  },
  maxTokens: {
    type: Number,
    default: 2000
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
  description: {
    type: String
  },
  costPerInputToken: {
    type: Number,
    default: 0.00015 // Default for gpt-4o-mini
  },
  costPerOutputToken: {
    type: Number,
    default: 0.0006 // Default for gpt-4o-mini
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one active configuration exists
aiSettingsSchema.pre('save', async function(next) {
  if (this.isActive) {
    await mongoose.model('AiSettings').updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

// Add interface for static methods
export interface IAiSettingsModel extends mongoose.Model<IAiSettings> {
  getActive(): Promise<IAiSettings>;
}

// Static method to get active settings
aiSettingsSchema.statics.getActive = async function(): Promise<IAiSettings> {
  let settings = await this.findOne({ isActive: true });
  
  // If no settings exist, create default
  if (!settings) {
    settings = await this.create({
      provider: 'openai',
      model: 'gpt-4o-mini',
      isActive: true,
      description: 'Default OpenAI GPT-4 Mini configuration'
    });
  }
  
  return settings;
};

export const AiSettings = mongoose.model<IAiSettings, IAiSettingsModel>('AiSettings', aiSettingsSchema);