import mongoose, { Document, Schema } from 'mongoose';

export interface IWordPressSiteCredentials extends Document {
  siteId: mongoose.Types.ObjectId;
  domain: string;
  adminUsername: string;
  adminPassword: string; // This should be encrypted
  adminEmail: string;
  siteTitle: string;
  wpVersion?: string;
  installedThemes: {
    slug: string;
    name: string;
    version?: string;
    isActive: boolean;
  }[];
  installedPlugins: {
    slug: string;
    name: string;
    version?: string;
    isActive: boolean;
  }[];
  databaseName?: string;
  databaseUser?: string;
  databasePassword?: string; // This should be encrypted
  sslEnabled: boolean;
  lastHealthCheck?: Date;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  notes?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WordPressSiteCredentialsSchema = new Schema<IWordPressSiteCredentials>(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'WordPressSite',
      required: true,
      unique: true
    },
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    adminUsername: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    adminPassword: {
      type: String,
      required: true,
      minlength: 8
    },
    adminEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    siteTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    wpVersion: {
      type: String,
      default: 'latest'
    },
    installedThemes: [{
      slug: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      version: String,
      isActive: {
        type: Boolean,
        default: false
      }
    }],
    installedPlugins: [{
      slug: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      version: String,
      isActive: {
        type: Boolean,
        default: false
      }
    }],
    databaseName: {
      type: String
    },
    databaseUser: {
      type: String
    },
    databasePassword: {
      type: String
    },
    sslEnabled: {
      type: Boolean,
      default: false
    },
    lastHealthCheck: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'error'],
      default: 'active'
    },
    notes: {
      type: String,
      maxlength: 1000
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
WordPressSiteCredentialsSchema.index({ siteId: 1 });
WordPressSiteCredentialsSchema.index({ domain: 1 });
WordPressSiteCredentialsSchema.index({ userId: 1 });
WordPressSiteCredentialsSchema.index({ status: 1 });

// Pre-save hook to ensure only one active theme per site
WordPressSiteCredentialsSchema.pre('save', async function(next) {
  if (this.isModified('installedThemes')) {
    const activeThemes = this.installedThemes.filter(theme => theme.isActive);
    if (activeThemes.length > 1) {
      // Ensure only the first active theme remains active
      this.installedThemes.forEach((theme, index) => {
        if (theme.isActive && index > 0) {
          theme.isActive = false;
        }
      });
    }
  }
  next();
});

export const WordPressSiteCredentials = mongoose.model<IWordPressSiteCredentials>('WordPressSiteCredentials', WordPressSiteCredentialsSchema);