import mongoose, { Document, Schema } from 'mongoose';
import * as crypto from 'crypto';

export interface IWordPressSite extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  username: string;
  applicationPassword: string; // Encrypted
  isActive: boolean;
  isDefault: boolean;
  // Site management fields (for VPS integration)
  ipAddress?: string;
  domain?: string;
  siteType: 'managed' | 'external'; // managed = VPS managed, external = user added
  vpsConfig?: {
    host?: string;
    port?: number;
    username?: string;
    hasAccess: boolean;
  };
  // WordPress info
  wordpressVersion?: string;
  phpVersion?: string;
  installedPlugins?: Array<{
    slug: string;
    name: string;
    version?: string;
    isActive: boolean;
  }>;
  activeTheme?: {
    slug: string;
    name: string;
    version?: string;
  };
  testConnection?: {
    lastTest?: Date;
    status: 'connected' | 'failed' | 'pending';
    error?: string;
  };
  statistics?: {
    postsPublished: number;
    lastPublishedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const wordPressSiteSchema = new Schema<IWordPressSite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  applicationPassword: {
    type: String,
    required: true,
    select: false // Don't return password by default
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  // Site management fields
  ipAddress: String,
  domain: String,
  siteType: {
    type: String,
    enum: ['managed', 'external'],
    default: 'external'
  },
  vpsConfig: {
    host: String,
    port: Number,
    username: String,
    hasAccess: {
      type: Boolean,
      default: false
    }
  },
  // WordPress info
  wordpressVersion: String,
  phpVersion: String,
  installedPlugins: [{
    slug: String,
    name: String,
    version: String,
    isActive: {
      type: Boolean,
      default: false
    }
  }],
  activeTheme: {
    slug: String,
    name: String,
    version: String
  },
  testConnection: {
    lastTest: Date,
    status: {
      type: String,
      enum: ['connected', 'failed', 'pending'],
      default: 'pending'
    },
    error: String
  },
  statistics: {
    postsPublished: {
      type: Number,
      default: 0
    },
    lastPublishedAt: Date
  }
}, {
  timestamps: true
});

// Encrypt application password before saving
const algorithm = 'aes-256-cbc';
// Use a stable key - in production, this should be from env variable
const secretKey = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : Buffer.from('a'.repeat(64), 'hex'); // Stable development key

wordPressSiteSchema.pre('save', function(next) {
  if (this.isModified('applicationPassword') && !this.applicationPassword.includes(':')) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(this.applicationPassword, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    this.applicationPassword = iv.toString('hex') + ':' + encrypted;
  }
  
  next();
});

// Method to decrypt password
wordPressSiteSchema.methods.getDecryptedPassword = function(): string {
  try {
    const parts = this.applicationPassword.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid password format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, it might be due to a different encryption key
    throw new Error('Failed to decrypt password - password may have been encrypted with a different key');
  }
};

// Ensure only one default site per user
wordPressSiteSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await WordPressSite.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Test WordPress connection
wordPressSiteSchema.methods.testWordPressConnection = async function(): Promise<boolean> {
  try {
    // Check if password is already encrypted (contains ':')
    let password;
    if (this.applicationPassword.includes(':')) {
      try {
        password = this.getDecryptedPassword();
      } catch (decryptError: any) {
        // If decryption fails, the password may have been encrypted with a different key
        this.testConnection = {
          lastTest: new Date(),
          status: 'failed',
          error: 'Password decryption failed - please re-enter your password'
        };
        await this.save();
        return false;
      }
    } else {
      password = this.applicationPassword;
    }
    const credentials = Buffer.from(`${this.username}:${password}`).toString('base64');
    
    const response = await fetch(`${this.url}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (response.ok) {
      this.testConnection = {
        lastTest: new Date(),
        status: 'connected',
        error: undefined
      };
      await this.save();
      return true;
    } else {
      throw new Error(`Connection failed: ${response.status}`);
    }
  } catch (error: any) {
    this.testConnection = {
      lastTest: new Date(),
      status: 'failed',
      error: error.message
    };
    await this.save();
    return false;
  }
};

export const WordPressSite = mongoose.model<IWordPressSite>('WordPressSite', wordPressSiteSchema);