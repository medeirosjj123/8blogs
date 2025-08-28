import mongoose, { Document, Schema } from 'mongoose';

export interface IPrompt extends Document {
  code: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  order: number;
  isActive: boolean;
  isSystem: boolean;
  metadata: {
    description?: string;
    example?: string;
    tips?: string;
  };
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const promptSchema = new Schema<IPrompt>({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  variables: [{
    type: String
  }],
  category: {
    type: String,
    required: true,
    enum: ['bbr', 'spr', 'informational']
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  metadata: {
    description: String,
    example: String,
    tips: String
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method to replace variables in prompt
promptSchema.methods.compile = function(variables: Record<string, any>): string {
  let compiled = this.content;
  
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    compiled = compiled.replace(regex, variables[key]);
  });
  
  return compiled;
};

export const Prompt = mongoose.model<IPrompt>('Prompt', promptSchema);