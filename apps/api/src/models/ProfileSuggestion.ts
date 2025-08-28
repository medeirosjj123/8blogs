import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileSuggestion extends Document {
  category: 'abilities' | 'interests' | 'music' | 'hobbies' | 'travel' | 'languages' | 'diet' | 'books' | 'movies';
  value: string;
  order: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSuggestionSchema = new Schema<IProfileSuggestion>({
  category: {
    type: String,
    required: true,
    enum: ['abilities', 'interests', 'music', 'hobbies', 'travel', 'languages', 'diet', 'books', 'movies'],
    index: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for category and order
ProfileSuggestionSchema.index({ category: 1, order: 1 });
ProfileSuggestionSchema.index({ category: 1, isActive: 1 });

// Prevent duplicate suggestions in same category
ProfileSuggestionSchema.index({ category: 1, value: 1 }, { unique: true });

export const ProfileSuggestion = mongoose.model<IProfileSuggestion>('ProfileSuggestion', ProfileSuggestionSchema);