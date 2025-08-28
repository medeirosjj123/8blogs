import mongoose, { Schema, Document } from 'mongoose';

export type FeatureStatus = 'active' | 'disabled' | 'maintenance' | 'deprecated';

export interface IFeatureConfig {
  [key: string]: any;
}

export interface IFeatureDocument extends Document {
  code: string;
  name: string;
  description: string;
  category: string;
  status: FeatureStatus;
  icon?: string;
  route?: string;
  permissions: string[];
  config: IFeatureConfig;
  dependencies: string[];
  version: string;
  releaseDate: Date;
  lastModified: Date;
  modifiedBy?: string;
  deletable: boolean;
  deleted: boolean;
  deletedAt?: Date;
  metadata: {
    usageCount?: number;
    lastUsed?: Date;
    activeUsers?: number;
    errorCount?: number;
    averageLoadTime?: number;
  };
  maintenanceMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<IFeatureDocument>({
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
    required: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'disabled', 'maintenance', 'deprecated'],
    default: 'disabled',
    index: true
  },
  icon: {
    type: String,
    default: 'Settings'
  },
  route: {
    type: String,
    trim: true
  },
  permissions: {
    type: [String],
    default: ['aluno'],
    validate: {
      validator: function(v: string[]) {
        const validRoles = ['aluno', 'mentor', 'moderador', 'admin'];
        return v.every(role => validRoles.includes(role));
      },
      message: 'Invalid role in permissions'
    }
  },
  config: {
    type: Schema.Types.Mixed,
    default: {}
  },
  dependencies: {
    type: [String],
    default: []
  },
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: String,
    ref: 'User'
  },
  deletable: {
    type: Boolean,
    default: true
  },
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  metadata: {
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    },
    averageLoadTime: {
      type: Number,
      default: 0
    }
  },
  maintenanceMessage: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Indexes for performance
featureSchema.index({ status: 1, deleted: 1 });
featureSchema.index({ category: 1, status: 1 });
featureSchema.index({ code: 1, deleted: 1 });

// Virtual for checking if feature is available
featureSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && !this.deleted;
});

// Method to check if user has permission
featureSchema.methods.canAccess = function(userRole: string): boolean {
  if (this.status !== 'active' || this.deleted) return false;
  if (userRole === 'admin') return true;
  return this.permissions.includes(userRole);
};

// Method to toggle status
featureSchema.methods.toggleStatus = function() {
  if (this.status === 'active') {
    this.status = 'disabled';
  } else if (this.status === 'disabled') {
    this.status = 'active';
  }
  this.lastModified = new Date();
  return this.save();
};

// Method to soft delete
featureSchema.methods.softDelete = function(userId?: string) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.status = 'disabled';
  if (userId) this.modifiedBy = userId;
  return this.save();
};

// Method to restore
featureSchema.methods.restore = function(userId?: string) {
  this.deleted = false;
  this.deletedAt = undefined;
  this.status = 'disabled';
  if (userId) this.modifiedBy = userId;
  return this.save();
};

// Method to update usage stats
featureSchema.methods.trackUsage = function(userId?: string) {
  this.metadata.usageCount = (this.metadata.usageCount || 0) + 1;
  this.metadata.lastUsed = new Date();
  
  // Don't update lastModified for usage tracking
  return this.save({ validateBeforeSave: false });
};

// Static method to find active features for user
featureSchema.statics.findActiveForUser = function(userRole: string) {
  const query: any = {
    deleted: false,
    status: 'active'
  };
  
  if (userRole !== 'admin') {
    query.permissions = userRole;
  }
  
  return this.find(query).sort({ category: 1, name: 1 });
};

// Static method to find features by category
featureSchema.statics.findByCategory = function(category: string) {
  return this.find({
    category,
    deleted: false
  }).sort({ name: 1 });
};

// Pre-save middleware to update lastModified
featureSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

export const Feature = mongoose.model<IFeatureDocument>('Feature', featureSchema);