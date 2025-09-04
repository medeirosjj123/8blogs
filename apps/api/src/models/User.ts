import mongoose, { Schema, Document } from 'mongoose';
import type { IUser, UserRole } from '@tatame/types';

export interface IUserDocument extends Omit<IUser, 'id'>, Document {
  passwordHash?: string;
  magicLinkToken?: string;
  magicLinkExpiresAt?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorBackupCodes?: string[];
  notificationPreferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    communityMentions: boolean;
    courseUpdates: boolean;
    achievementUnlocked: boolean;
    weeklyDigest: boolean;
    marketingEmails: boolean;
  };
  // Subscription fields
  subscription?: {
    plan: 'starter' | 'pro' | 'premium';
    blogsLimit: number;
    reviewsLimit: number;
    reviewsUsed: number;
    billingCycle: 'monthly' | 'yearly';
    nextResetDate: Date;
    features: {
      bulkUpload: boolean;
      weeklyCalls: boolean;
      coursesAccess: boolean;
      prioritySupport: boolean;
    };
  };
  // Networking fields
  abilities?: string[];
  interests?: string[];
  lookingFor?: ('mentorship' | 'collaboration' | 'partnership' | 'networking' | 'learning')[];
  availability?: 'available' | 'busy' | 'not_interested';
  profileCompleteness?: number;
  connectionCount?: number;
}

const userSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 200,
    trim: true
  },
  avatar: {
    type: String, // URL to avatar image
    default: null
  },
  location: {
    type: String,
    maxlength: 100,
    trim: true
  },
  socialLinks: {
    facebook: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    youtube: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  role: {
    type: String,
    enum: ['starter', 'pro', 'black_belt', 'admin'],
    default: 'starter'
  },
  membership: {
    type: {
      product: String,
      status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'pending']
      },
      expiresAt: Date
    },
    default: null
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'pt-BR'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['starter', 'pro', 'black_belt'],
      default: 'starter'
    },
    blogsLimit: {
      type: Number,
      default: 1 // Starter plan limit
    },
    reviewsLimit: {
      type: Number,
      default: 30 // Starter: 30, Pro: 100, Black Belt: unlimited (-1)
    },
    reviewsUsed: {
      type: Number,
      default: 0
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    nextResetDate: {
      type: Date,
      default: () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      }
    },
    features: {
      bulkUpload: {
        type: Boolean,
        default: false // Only Black Belt has bulk generation
      },
      weeklyCalls: {
        type: Boolean,
        default: false
      },
      coursesAccess: {
        type: Boolean,
        default: false // Only Black Belt has access
      },
      prioritySupport: {
        type: Boolean,
        default: false
      }
    }
  },
  magicLinkToken: {
    type: String,
    select: false
  },
  magicLinkExpiresAt: {
    type: Date,
    select: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpiresAt: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpiresAt: {
    type: Date,
    select: false
  },
  lastLoginAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: Date,
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: {
    type: [String],
    select: false
  },
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    communityMentions: {
      type: Boolean,
      default: true
    },
    courseUpdates: {
      type: Boolean,
      default: true
    },
    achievementUnlocked: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  // Networking fields
  abilities: {
    type: [String],
    default: []
  },
  interests: {
    type: [String],
    default: []
  },
  lookingFor: {
    type: [String],
    enum: ['mentorship', 'collaboration', 'partnership', 'networking', 'learning'],
    default: []
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'not_interested'],
    default: 'available'
  },
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  connectionCount: {
    type: Number,
    default: 0
  },
  personalInterests: {
    music: {
      type: [String],
      default: []
    },
    hobbies: {
      type: [String],
      default: []
    },
    gymFrequency: {
      type: String,
      enum: ['never', 'rarely', '1-2x_week', '3-4x_week', '5+_week', 'daily']
    },
    travelInterests: {
      type: [String],
      default: []
    },
    favoriteBooks: {
      type: [String],
      default: []
    },
    favoriteMovies: {
      type: [String],
      default: []
    },
    languages: {
      type: [String],
      default: []
    },
    dietPreferences: {
      type: [String],
      default: []
    }
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

userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

userSchema.index({ email: 1 });
userSchema.index({ magicLinkToken: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
});

userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockedUntil && this.lockedUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockedUntil: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockedUntil: new Date(Date.now() + lockTime) };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockedUntil: 1 }
  });
};

export const User = mongoose.model<IUserDocument>('User', userSchema);