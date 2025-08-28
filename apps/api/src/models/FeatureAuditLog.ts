import mongoose, { Schema, Document } from 'mongoose';

export interface IFeatureAuditLogDocument extends Document {
  featureCode: string;
  featureName: string;
  action: 'created' | 'updated' | 'deleted' | 'restored' | 'status_changed' | 'config_changed';
  previousState?: {
    status?: string;
    config?: any;
    permissions?: string[];
  };
  newState?: {
    status?: string;
    config?: any;
    permissions?: string[];
  };
  performedBy: string;
  performedByEmail: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const featureAuditLogSchema = new Schema<IFeatureAuditLogDocument>({
  featureCode: {
    type: String,
    required: true,
    index: true
  },
  featureName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'deleted', 'restored', 'status_changed', 'config_changed']
  },
  previousState: {
    status: String,
    config: Schema.Types.Mixed,
    permissions: [String]
  },
  newState: {
    status: String,
    config: Schema.Types.Mixed,
    permissions: [String]
  },
  performedBy: {
    type: String,
    ref: 'User',
    required: true
  },
  performedByEmail: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Index for efficient querying
featureAuditLogSchema.index({ featureCode: 1, createdAt: -1 });
featureAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
featureAuditLogSchema.index({ action: 1, createdAt: -1 });

export const FeatureAuditLog = mongoose.model<IFeatureAuditLogDocument>('FeatureAuditLog', featureAuditLogSchema);