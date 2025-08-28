import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryDocument extends Document {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  isSystem: boolean; // System categories cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategoryDocument>({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 200
  },
  icon: {
    type: String,
    default: 'Folder'
  },
  color: {
    type: String,
    default: '#666666',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for sorting
categorySchema.index({ order: 1, name: 1 });
categorySchema.index({ isActive: 1, order: 1 });

// Static method to find active categories
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

// Method to check if category can be deleted
categorySchema.methods.canDelete = function(): boolean {
  return !this.isSystem;
};

export const Category = mongoose.model<ICategoryDocument>('Category', categorySchema);