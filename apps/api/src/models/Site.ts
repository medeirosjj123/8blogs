import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteDocument extends Document {
  userId: mongoose.Types.ObjectId;
  domain: string;
  subdomain?: string;
  ipAddress: string;
  templateId: string;
  templateName: string;
  status: 'pending' | 'provisioning' | 'active' | 'failed' | 'suspended';
  cloudflareZoneId?: string;
  cloudflareDnsId?: string;
  sslStatus: 'pending' | 'active' | 'failed' | 'none';
  dnsStatus: 'pending' | 'propagating' | 'propagated' | 'failed';
  wordpressVersion?: string;
  phpVersion?: string;
  mysqlVersion?: string;
  installedPlugins?: string[];
  lastBackupAt?: Date;
  provisionedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISiteDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  subdomain: {
    type: String,
    lowercase: true,
    trim: true
  },
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  templateId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'provisioning', 'active', 'failed', 'suspended'],
    default: 'pending',
    index: true
  },
  cloudflareZoneId: String,
  cloudflareDnsId: String,
  sslStatus: {
    type: String,
    enum: ['pending', 'active', 'failed', 'none'],
    default: 'none'
  },
  dnsStatus: {
    type: String,
    enum: ['pending', 'propagating', 'propagated', 'failed'],
    default: 'pending'
  },
  wordpressVersion: String,
  phpVersion: String,
  mysqlVersion: String,
  installedPlugins: [String],
  lastBackupAt: Date,
  provisionedAt: Date,
  failureReason: String,
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

siteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

siteSchema.index({ userId: 1, status: 1 });
siteSchema.index({ domain: 1 });

siteSchema.methods.markAsActive = async function(): Promise<void> {
  this.status = 'active';
  this.provisionedAt = new Date();
  await this.save();
};

siteSchema.methods.markAsFailed = async function(reason: string): Promise<void> {
  this.status = 'failed';
  this.failureReason = reason;
  await this.save();
};

siteSchema.methods.updateDnsStatus = async function(status: string): Promise<void> {
  this.dnsStatus = status;
  await this.save();
};

siteSchema.methods.updateSslStatus = async function(status: string): Promise<void> {
  this.sslStatus = status;
  await this.save();
};

export const Site = mongoose.model<ISiteDocument>('Site', siteSchema);