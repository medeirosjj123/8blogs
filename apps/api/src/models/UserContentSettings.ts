import mongoose, { Document, Schema } from 'mongoose';
import * as crypto from 'crypto';

export interface IUserContentSettings extends Document {
  userId: mongoose.Types.ObjectId;
  pexels: {
    apiKey?: string; // Encrypted
    isActive: boolean;
    defaultImageCount: number;
    preferredOrientation?: 'landscape' | 'portrait' | 'square';
    preferredSize?: 'small' | 'medium' | 'large';
  };
  contentDefaults: {
    language: string;
    tone: 'professional' | 'casual' | 'friendly' | 'formal';
    includeImages: boolean;
    includeTables: boolean;
    includeCallToAction: boolean;
    defaultWordCount: number;
    autoPublish: boolean;
  };
  seo: {
    includeMetaDescription: boolean;
    includeFocusKeyword: boolean;
    includeYoastFields: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userContentSettingsSchema = new Schema<IUserContentSettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  pexels: {
    apiKey: {
      type: String,
      select: false // Don't return API key by default
    },
    isActive: {
      type: Boolean,
      default: false
    },
    defaultImageCount: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    preferredOrientation: {
      type: String,
      enum: ['landscape', 'portrait', 'square'],
      default: 'landscape'
    },
    preferredSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'large'
    }
  },
  contentDefaults: {
    language: {
      type: String,
      default: 'pt-BR'
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'friendly', 'formal'],
      default: 'professional'
    },
    includeImages: {
      type: Boolean,
      default: true
    },
    includeTables: {
      type: Boolean,
      default: true
    },
    includeCallToAction: {
      type: Boolean,
      default: true
    },
    defaultWordCount: {
      type: Number,
      default: 1500,
      min: 300,
      max: 5000
    },
    autoPublish: {
      type: Boolean,
      default: false
    }
  },
  seo: {
    includeMetaDescription: {
      type: Boolean,
      default: true
    },
    includeFocusKeyword: {
      type: Boolean,
      default: true
    },
    includeYoastFields: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Encrypt Pexels API key before saving
const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

userContentSettingsSchema.pre('save', function(next) {
  if (this.isModified('pexels.apiKey') && this.pexels.apiKey && !this.pexels.apiKey.includes(':')) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(this.pexels.apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    this.pexels.apiKey = iv.toString('hex') + ':' + encrypted;
  }
  
  next();
});

// Method to decrypt Pexels API key
userContentSettingsSchema.methods.getDecryptedPexelsKey = function(): string | null {
  if (!this.pexels.apiKey) return null;
  
  try {
    const parts = this.pexels.apiKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting Pexels API key:', error);
    return null;
  }
};

// Test Pexels API connection
userContentSettingsSchema.methods.testPexelsConnection = async function(): Promise<boolean> {
  const apiKey = this.getDecryptedPexelsKey();
  if (!apiKey) return false;

  try {
    const response = await fetch('https://api.pexels.com/v1/search?query=test&per_page=1', {
      headers: {
        'Authorization': apiKey
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Pexels connection test failed:', error);
    return false;
  }
};

export const UserContentSettings = mongoose.model<IUserContentSettings>('UserContentSettings', userContentSettingsSchema);