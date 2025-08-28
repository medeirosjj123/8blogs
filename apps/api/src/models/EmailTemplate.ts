import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplateDocument extends Document {
  name: string;
  slug: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: 'transactional' | 'marketing' | 'notification';
  isActive: boolean;
  description?: string;
  previewData?: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplateDocument>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: {
    type: String
  },
  variables: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['transactional', 'marketing', 'notification'],
    default: 'transactional',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  },
  previewData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

emailTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get template by slug
emailTemplateSchema.statics.getBySlug = async function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

// Method to render template with variables
emailTemplateSchema.methods.render = function(data: Record<string, any>) {
  let htmlContent = this.htmlContent;
  let textContent = this.textContent || '';
  let subject = this.subject;

  // Replace variables in format {{variable}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    htmlContent = htmlContent.replace(regex, data[key] || '');
    textContent = textContent.replace(regex, data[key] || '');
    subject = subject.replace(regex, data[key] || '');
  });

  return {
    subject,
    htmlContent,
    textContent
  };
};

export const EmailTemplate = mongoose.model<IEmailTemplateDocument>('EmailTemplate', emailTemplateSchema);