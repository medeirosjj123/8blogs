import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IWebhookConfig extends Document {
  name: string;
  description?: string;
  provider: 'kiwify' | 'stripe' | 'paypal' | 'custom';
  url: string;
  secret: string;
  encryptedSecret?: string;
  events: string[];
  isActive: boolean;
  headers?: Map<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  lastTriggeredAt?: Date;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
  encryptSecret(): void;
  decryptSecret(): string;
}

const WebhookConfigSchema = new Schema<IWebhookConfig>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    provider: {
      type: String,
      required: true,
      enum: ['kiwify', 'stripe', 'paypal', 'custom']
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    secret: {
      type: String,
      select: false // Don't include in queries by default
    },
    encryptedSecret: {
      type: String,
      select: false
    },
    events: [{
      type: String,
      required: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    headers: {
      type: Map,
      of: String,
      default: new Map()
    },
    retryPolicy: {
      maxRetries: {
        type: Number,
        default: 3
      },
      backoffMs: {
        type: Number,
        default: 1000
      }
    },
    lastTriggeredAt: Date,
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Encrypt secret before saving
WebhookConfigSchema.pre('save', function(next) {
  if (this.isModified('secret') && this.secret) {
    this.encryptSecret();
  }
  next();
});

// Method to encrypt the secret
WebhookConfigSchema.methods.encryptSecret = function() {
  if (!this.secret) return;
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.JWT_SECRET || 'default-secret-key',
    'salt',
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(this.secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  this.encryptedSecret = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  this.secret = undefined;
};

// Method to decrypt the secret
WebhookConfigSchema.methods.decryptSecret = function(): string {
  if (!this.encryptedSecret) return '';
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.JWT_SECRET || 'default-secret-key',
    'salt',
    32
  );
  
  const parts = this.encryptedSecret.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Index for quick lookups
WebhookConfigSchema.index({ provider: 1, isActive: 1 });
WebhookConfigSchema.index({ url: 1 });

export const WebhookConfig = mongoose.model<IWebhookConfig>('WebhookConfig', WebhookConfigSchema);