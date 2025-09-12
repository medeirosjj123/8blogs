import mongoose, { Document, Schema } from 'mongoose';

export interface VPSSite {
  domain: string;
  createdAt: Date;
  type: 'wordpress' | 'static' | 'php';
  status: 'active' | 'suspended' | 'deleted';
}

export interface VPSFeatures {
  hasWordOps: boolean;
  hasNginx: boolean;
  hasMySQL: boolean;
  hasPHP: boolean;
  hasSSL: boolean;
  hasFirewall: boolean;
  hasRedis: boolean;
}

export interface IVPSConfiguration extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  host: string;
  port: number;
  username: string;
  isConfigured: boolean;
  configuredAt?: Date;
  resetAt?: Date;
  lastCheckedAt?: Date;
  wordOpsVersion?: string;
  features: VPSFeatures;
  sites: VPSSite[];
  setupLogs: {
    timestamp: Date;
    level: 'info' | 'error' | 'warning';
    message: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const VPSSiteSchema = new Schema({
  domain: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['wordpress', 'static', 'php'],
    default: 'wordpress'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  }
});

const VPSFeaturesSchema = new Schema({
  hasWordOps: {
    type: Boolean,
    default: false
  },
  hasNginx: {
    type: Boolean,
    default: false
  },
  hasMySQL: {
    type: Boolean,
    default: false
  },
  hasPHP: {
    type: Boolean,
    default: false
  },
  hasSSL: {
    type: Boolean,
    default: false
  },
  hasFirewall: {
    type: Boolean,
    default: false
  },
  hasRedis: {
    type: Boolean,
    default: false
  }
});

const SetupLogSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['info', 'error', 'warning'],
    required: true
  },
  message: {
    type: String,
    required: true
  }
});

const VPSConfigurationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  host: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  port: {
    type: Number,
    default: 22,
    min: 1,
    max: 65535
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  isConfigured: {
    type: Boolean,
    default: false,
    index: true
  },
  configuredAt: {
    type: Date
  },
  resetAt: {
    type: Date
  },
  lastCheckedAt: {
    type: Date
  },
  wordOpsVersion: {
    type: String,
    trim: true
  },
  features: {
    type: VPSFeaturesSchema,
    default: () => ({})
  },
  sites: [VPSSiteSchema],
  setupLogs: [SetupLogSchema]
}, {
  timestamps: true,
  collection: 'vpsconfigurations'
});

// Compound indexes for efficient queries
VPSConfigurationSchema.index({ userId: 1, host: 1 }, { unique: true });
VPSConfigurationSchema.index({ userId: 1, isConfigured: 1 });
VPSConfigurationSchema.index({ 'sites.domain': 1 });

// Instance methods
VPSConfigurationSchema.methods.addSite = function(siteData: Partial<VPSSite>) {
  this.sites.push({
    domain: siteData.domain,
    type: siteData.type || 'wordpress',
    status: siteData.status || 'active',
    createdAt: new Date()
  });
  return this.save();
};

VPSConfigurationSchema.methods.removeSite = function(domain: string) {
  const siteIndex = this.sites.findIndex((site: VPSSite) => site.domain === domain);
  if (siteIndex > -1) {
    this.sites[siteIndex].status = 'deleted';
    return this.save();
  }
  return Promise.resolve(this);
};

VPSConfigurationSchema.methods.addLog = function(level: 'info' | 'error' | 'warning', message: string) {
  this.setupLogs.push({
    timestamp: new Date(),
    level,
    message
  });
  
  // Keep only last 100 logs to prevent document from growing too large
  if (this.setupLogs.length > 100) {
    this.setupLogs = this.setupLogs.slice(-100);
  }
  
  return this.save();
};

VPSConfigurationSchema.methods.markAsConfigured = function(features: Partial<VPSFeatures>, wordOpsVersion?: string) {
  this.isConfigured = true;
  this.configuredAt = new Date();
  this.lastCheckedAt = new Date();
  this.features = { ...this.features, ...features };
  if (wordOpsVersion) {
    this.wordOpsVersion = wordOpsVersion;
  }
  return this.save();
};

VPSConfigurationSchema.methods.markAsReset = function() {
  this.isConfigured = false;
  this.resetAt = new Date();
  this.lastCheckedAt = new Date();
  this.configuredAt = undefined;
  this.wordOpsVersion = undefined;
  this.features = {
    hasWordOps: false,
    hasNginx: false,
    hasMySQL: false,
    hasPHP: false,
    hasSSL: false,
    hasFirewall: false,
    hasRedis: false
  };
  this.sites = [];
  return this.save();
};

// Static methods
VPSConfigurationSchema.statics.findByUserAndHost = function(userId: string, host: string) {
  return this.findOne({ userId, host });
};

VPSConfigurationSchema.statics.findConfiguredVPS = function(userId: string) {
  return this.find({ userId, isConfigured: true });
};

VPSConfigurationSchema.statics.checkSiteExists = function(userId: string, domain: string) {
  return this.findOne({ 
    userId, 
    'sites.domain': domain,
    'sites.status': { $ne: 'deleted' }
  });
};

export const VPSConfiguration = mongoose.model<IVPSConfiguration>('VPSConfiguration', VPSConfigurationSchema);