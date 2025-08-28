import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IEnvConfig extends Document {
  key: string;
  value: string;
  encryptedValue?: string;
  category: 'database' | 'auth' | 'email' | 'storage' | 'payment' | 'api' | 'general' | 'custom';
  description?: string;
  isSecret: boolean;
  isRequired: boolean;
  isActive: boolean;
  defaultValue?: string;
  validation?: {
    type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
    pattern?: string;
    min?: number;
    max?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  encryptValue(): void;
  decryptValue(): string;
}

const EnvConfigSchema = new Schema<IEnvConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z][A-Z0-9_]*$/,
      index: true
    },
    value: {
      type: String,
      select: false // Don't include in queries by default for secrets
    },
    encryptedValue: {
      type: String,
      select: false
    },
    category: {
      type: String,
      required: true,
      enum: ['database', 'auth', 'email', 'storage', 'payment', 'api', 'general', 'custom'],
      index: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    isSecret: {
      type: Boolean,
      default: false
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    defaultValue: String,
    validation: {
      type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'url', 'email', 'json'],
        default: 'string'
      },
      pattern: String,
      min: Number,
      max: Number
    }
  },
  {
    timestamps: true
  }
);

// Encrypt value before saving
EnvConfigSchema.pre('save', function(next) {
  if (this.isModified('value') && this.value && this.isSecret) {
    this.encryptValue();
  }
  next();
});

// Method to encrypt the value
EnvConfigSchema.methods.encryptValue = function() {
  if (!this.value) return;
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.JWT_SECRET || 'default-secret-key',
    'env-salt',
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(this.value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  this.encryptedValue = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  this.value = undefined;
};

// Method to decrypt the value
EnvConfigSchema.methods.decryptValue = function(): string {
  if (!this.isSecret || !this.encryptedValue) {
    return this.value || '';
  }
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.JWT_SECRET || 'default-secret-key',
    'env-salt',
    32
  );
  
  const parts = this.encryptedValue.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Method to validate environment variable value
EnvConfigSchema.methods.validateValue = function(value: string): { isValid: boolean; error?: string } {
  if (this.isRequired && (!value || value.trim() === '')) {
    return { isValid: false, error: 'This environment variable is required' };
  }
  
  if (!this.validation || !value) {
    return { isValid: true };
  }
  
  const { type, pattern, min, max } = this.validation;
  
  switch (type) {
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        return { isValid: false, error: 'Must be a valid number' };
      }
      if (min !== undefined && num < min) {
        return { isValid: false, error: `Must be at least ${min}` };
      }
      if (max !== undefined && num > max) {
        return { isValid: false, error: `Must be at most ${max}` };
      }
      break;
      
    case 'boolean':
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return { isValid: false, error: 'Must be true, false, 1, or 0' };
      }
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        return { isValid: false, error: 'Must be a valid URL' };
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { isValid: false, error: 'Must be a valid email address' };
      }
      break;
      
    case 'json':
      try {
        JSON.parse(value);
      } catch {
        return { isValid: false, error: 'Must be valid JSON' };
      }
      break;
  }
  
  if (pattern) {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      return { isValid: false, error: 'Value does not match required pattern' };
    }
  }
  
  if (min !== undefined && value.length < min) {
    return { isValid: false, error: `Must be at least ${min} characters` };
  }
  
  if (max !== undefined && value.length > max) {
    return { isValid: false, error: `Must be at most ${max} characters` };
  }
  
  return { isValid: true };
};

// Index for efficient category queries
EnvConfigSchema.index({ category: 1, isActive: 1 });

export const EnvConfig = mongoose.model<IEnvConfig>('EnvConfig', EnvConfigSchema);