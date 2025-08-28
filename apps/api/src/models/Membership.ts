import mongoose, { Schema, Document } from 'mongoose';

export interface IMembershipDocument extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'basic' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'suspended';
  kiwifyOrderId: string;
  kiwifyCustomerId: string;
  kiwifyProductId: string;
  kiwifySubscriptionId?: string;
  paymentMethod?: string;
  billingCycle?: 'monthly' | 'annual' | 'lifetime';
  currentPeriodStart: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembershipDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'premium'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending', 'suspended'],
    default: 'pending',
    index: true
  },
  kiwifyOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  kiwifyCustomerId: {
    type: String,
    required: true,
    index: true
  },
  kiwifyProductId: {
    type: String,
    required: true
  },
  kiwifySubscriptionId: {
    type: String,
    sparse: true,
    index: true
  },
  paymentMethod: String,
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual', 'lifetime']
  },
  currentPeriodStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentPeriodEnd: Date,
  cancelledAt: Date,
  cancelReason: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
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

membershipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ kiwifyCustomerId: 1 });

membershipSchema.methods.isActive = function(): boolean {
  return this.status === 'active' && 
         (!this.currentPeriodEnd || this.currentPeriodEnd > new Date());
};

membershipSchema.methods.activate = async function(): Promise<void> {
  this.status = 'active';
  await this.save();
};

membershipSchema.methods.cancel = async function(reason?: string): Promise<void> {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.cancelReason = reason;
  }
  await this.save();
};

membershipSchema.methods.suspend = async function(): Promise<void> {
  this.status = 'suspended';
  await this.save();
};

membershipSchema.methods.renew = async function(periodEnd: Date): Promise<void> {
  this.status = 'active';
  this.currentPeriodEnd = periodEnd;
  await this.save();
};

export const Membership = mongoose.model<IMembershipDocument>('Membership', membershipSchema);