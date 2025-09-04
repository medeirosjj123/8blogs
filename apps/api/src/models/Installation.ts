import mongoose, { Schema, Document } from 'mongoose';

export interface IInstallationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  siteId?: mongoose.Types.ObjectId;
  vpsId?: mongoose.Types.ObjectId;
  templateId: string;
  templateName: string;
  domain?: string;
  vpsIp?: string;
  vpsHost?: string;
  installToken: string;
  tokenUsed: boolean;
  expiresAt: Date;
  status: 'started' | 'in_progress' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  errorMessage?: string;
  credentials?: {
    siteUrl: string;
    adminUrl: string;
    username: string;
    password: string;
  };
  siteInfo?: {
    domain: string;
    ipAddress: string;
    accessUrl: string;
    adminUrl: string;
  };
  // New fields for multi-site preview support
  previewPort?: number;
  previewDomain?: string;
  accessMethods?: Array<{
    type: 'ip' | 'port' | 'preview' | 'domain';
    url: string;
    primary?: boolean;
  }>;
  dnsInstructions?: {
    cloudflare: string[];
    generic: string[];
  };
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    startedAt?: Date;
    completedAt?: Date;
    progress?: number;
    message?: string;
  }>;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    step?: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  failureReason?: string;
  siteUrl?: string;
  installationOptions: {
    phpVersion?: string;
    mysqlVersion?: string;
    enableSSL?: boolean;
    enableCaching?: boolean;
    enableSecurity?: boolean;
    installPlugins?: boolean;
    siteName?: string;
    isExisting?: boolean;
    googleAnalyticsId?: string;
    wordpressConfig?: {
      credentials?: {
        siteTitle: string;
        adminUsername: string;
        adminEmail: string;
        adminPassword: string;
      };
      theme?: {
        _id: string;
        slug: string;
        downloadUrl?: string;
      };
      plugins?: string[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const installationSchema = new Schema<IInstallationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  siteId: {
    type: Schema.Types.ObjectId,
    ref: 'Site',
    index: true
  },
  templateId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    lowercase: true,
    trim: true
  },
  vpsIp: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  vpsHost: {
    type: String,
    trim: true
  },
  errorMessage: String,
  credentials: {
    siteUrl: String,
    adminUrl: String,
    username: String,
    password: String
  },
  siteInfo: {
    domain: String,
    ipAddress: String,
    accessUrl: String,
    adminUrl: String
  },
  // New fields for multi-site preview support
  previewPort: {
    type: Number,
    min: 8000,
    max: 9999,
    index: true
  },
  previewDomain: {
    type: String,
    lowercase: true,
    trim: true
  },
  accessMethods: [{
    type: {
      type: String,
      enum: ['ip', 'port', 'preview', 'domain'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    primary: {
      type: Boolean,
      default: false
    }
  }],
  dnsInstructions: {
    cloudflare: [String],
    generic: [String]
  },
  installToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tokenUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    index: true
  },
  status: {
    type: String,
    enum: ['started', 'in_progress', 'running', 'completed', 'failed', 'cancelled'],
    default: 'started',
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentStep: String,
  steps: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'error'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    progress: { type: Number, min: 0, max: 100 },
    message: String
  }],
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info'
    },
    message: { type: String, required: true },
    step: String
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failureReason: String,
  siteUrl: String,
  installationOptions: {
    phpVersion: String,
    mysqlVersion: String,
    enableSSL: { type: Boolean, default: true },
    enableCaching: { type: Boolean, default: true },
    enableSecurity: { type: Boolean, default: true },
    installPlugins: { type: Boolean, default: true },
    siteName: String,
    isExisting: { type: Boolean, default: false },
    googleAnalyticsId: String,
    wordpressConfig: {
      credentials: {
        siteTitle: String,
        adminUsername: String,
        adminEmail: String,
        adminPassword: String
      },
      theme: {
        _id: String,
        slug: String,
        downloadUrl: String
      },
      plugins: [String]
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

installationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

installationSchema.index({ userId: 1, status: 1 });
installationSchema.index({ installToken: 1 });
installationSchema.index({ createdAt: -1 });

installationSchema.methods.addLog = function(level: string, message: string, step?: string) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    step
  });
  // Use save with options to handle validation errors
  return this.save().catch(error => {
    console.error(`Failed to save log for installation ${this._id}:`, error.message);
    // Return resolved promise to prevent breaking the flow
    return Promise.resolve();
  });
};

installationSchema.methods.updateStep = function(stepId: string, status: string, progress?: number, message?: string) {
  const stepIndex = this.steps.findIndex((s: any) => s.id === stepId);
  if (stepIndex === -1) {
    // Add new step
    this.steps.push({
      id: stepId,
      name: stepId,
      status,
      progress,
      message,
      startedAt: status === 'running' ? new Date() : undefined,
      completedAt: status === 'completed' || status === 'error' ? new Date() : undefined
    });
  } else {
    // Update existing step
    this.steps[stepIndex].status = status;
    if (progress !== undefined) this.steps[stepIndex].progress = progress;
    if (message) this.steps[stepIndex].message = message;
    
    if (status === 'running' && !this.steps[stepIndex].startedAt) {
      this.steps[stepIndex].startedAt = new Date();
    }
    if ((status === 'completed' || status === 'error') && !this.steps[stepIndex].completedAt) {
      this.steps[stepIndex].completedAt = new Date();
    }
  }
  
  this.currentStep = stepId;
  // Use save with error handling to prevent breaking the flow
  return this.save().catch(error => {
    console.error(`Failed to update step ${stepId} for installation ${this._id}:`, error.message);
    // Return resolved promise to prevent breaking the flow
    return Promise.resolve();
  });
};

installationSchema.methods.markCompleted = function(siteUrl?: string) {
  this.status = 'completed';
  this.progress = 100;
  this.completedAt = new Date();
  if (siteUrl) this.siteUrl = siteUrl;
  return this.save();
};

installationSchema.methods.markFailed = function(reason: string) {
  this.status = 'failed';
  this.failureReason = reason;
  this.completedAt = new Date();
  return this.save();
};

export const Installation = mongoose.model<IInstallationDocument>('Installation', installationSchema);