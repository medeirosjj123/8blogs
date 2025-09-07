import mongoose, { Schema, Document } from 'mongoose';

export interface IKiwifyPurchaseEvent extends Document {
  // Kiwify data
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  productId: string;
  productName: string;
  event: string; // pedido_aprovado, pedido_pago, etc.
  
  // Processing status
  status: 'received' | 'processing' | 'success' | 'failed';
  
  // Step tracking
  userFound: boolean;
  userCreated: boolean;
  membershipFound: boolean;
  membershipCreated: boolean;
  subscriptionUpdated: boolean;
  welcomeEmailSent: boolean;
  magicLinkSent: boolean;
  credentialsDelivered: boolean;
  
  // Plan mapping
  mappedPlan: string;
  assignedRole: string;
  
  // Error tracking
  errors: {
    step: string;
    error: string;
    timestamp: Date;
  }[];
  
  // Retry tracking
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  
  // Timing
  processedAt?: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  
  // Raw data
  payload: any;
  signature?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const kiwifyPurchaseEventSchema = new Schema<IKiwifyPurchaseEvent>({
  // Kiwify data
  orderId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  customerEmail: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  productName: String,
  event: {
    type: String,
    required: true,
    index: true
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['received', 'processing', 'success', 'failed'],
    default: 'received',
    index: true
  },
  
  // Step tracking
  userFound: { type: Boolean, default: false },
  userCreated: { type: Boolean, default: false },
  membershipFound: { type: Boolean, default: false },
  membershipCreated: { type: Boolean, default: false },
  subscriptionUpdated: { type: Boolean, default: false },
  welcomeEmailSent: { type: Boolean, default: false },
  magicLinkSent: { type: Boolean, default: false },
  credentialsDelivered: { type: Boolean, default: false },
  
  // Plan mapping
  mappedPlan: String,
  assignedRole: String,
  
  // Error tracking
  errors: [{
    step: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Retry tracking
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: Date,
  
  // Timing
  processedAt: Date,
  completedAt: Date,
  processingTimeMs: Number,
  
  // Raw data
  payload: { type: Schema.Types.Mixed, required: true },
  signature: String
}, {
  timestamps: true,
  collection: 'kiwify_purchase_events'
});

// Compound indexes for efficient querying
kiwifyPurchaseEventSchema.index({ customerEmail: 1, status: 1 });
kiwifyPurchaseEventSchema.index({ status: 1, createdAt: -1 });
kiwifyPurchaseEventSchema.index({ credentialsDelivered: 1, status: 1 });
kiwifyPurchaseEventSchema.index({ nextRetryAt: 1, retryCount: 1 }); // For retry processing

// Methods
kiwifyPurchaseEventSchema.methods.addError = function(step: string, error: string) {
  this.errors.push({
    step,
    error: typeof error === 'string' ? error : error.message || 'Unknown error',
    timestamp: new Date()
  });
  return this;
};

kiwifyPurchaseEventSchema.methods.markStep = function(step: keyof IKiwifyPurchaseEvent, success: boolean = true) {
  if (this.schema.paths[step]) {
    (this as any)[step] = success;
  }
  return this;
};

kiwifyPurchaseEventSchema.methods.markCompleted = function() {
  this.status = 'success';
  this.credentialsDelivered = true;
  this.completedAt = new Date();
  if (this.processedAt) {
    this.processingTimeMs = Date.now() - this.processedAt.getTime();
  }
  return this.save();
};

kiwifyPurchaseEventSchema.methods.markFailed = function(error: string, step?: string) {
  this.status = 'failed';
  if (error) {
    this.addError(step || 'general', error);
  }
  
  // Set retry if under limit
  if (this.retryCount < this.maxRetries) {
    const backoffMinutes = [5, 15, 30]; // 5min, 15min, 30min
    const delayMs = backoffMinutes[this.retryCount] * 60 * 1000;
    this.nextRetryAt = new Date(Date.now() + delayMs);
    this.status = 'processing'; // Will be retried
  }
  
  return this.save();
};

// Static methods
kiwifyPurchaseEventSchema.statics.findPendingRetries = function() {
  return this.find({
    status: 'processing',
    nextRetryAt: { $lte: new Date() },
    retryCount: { $lt: 3 }
  });
};

kiwifyPurchaseEventSchema.statics.findFailedCredentials = function() {
  return this.find({
    status: { $in: ['success', 'failed'] },
    credentialsDelivered: false,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  });
};

kiwifyPurchaseEventSchema.statics.getDeliveryStats = function(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        successful: { $sum: { $cond: [{ $eq: ['$credentialsDelivered', true] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
        avgProcessingTime: { $avg: '$processingTimeMs' }
      }
    }
  ]);
};

export const KiwifyPurchaseEvent = mongoose.model<IKiwifyPurchaseEvent>('KiwifyPurchaseEvent', kiwifyPurchaseEventSchema);