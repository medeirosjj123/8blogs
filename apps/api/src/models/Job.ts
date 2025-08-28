import mongoose, { Schema, Document } from 'mongoose';

export interface IJobDocument extends Document {
  siteId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'site_installation' | 'ssl_setup' | 'backup' | 'restore' | 'dns_check';
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep?: string;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    metadata?: any;
  }>;
  result?: Record<string, any>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  attempts: number;
  maxAttempts: number;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJobDocument>({
  siteId: {
    type: Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['site_installation', 'ssl_setup', 'backup', 'restore', 'dns_check'],
    required: true,
    index: true
  },
  state: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentStep: String,
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    metadata: Schema.Types.Mixed
  }],
  result: Schema.Types.Mixed,
  error: {
    message: String,
    code: String,
    stack: String
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  startedAt: Date,
  completedAt: Date,
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

jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

jobSchema.index({ siteId: 1, state: 1 });
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ state: 1, createdAt: -1 });

jobSchema.methods.addLog = async function(
  level: 'info' | 'warning' | 'error' | 'success',
  message: string,
  metadata?: any
): Promise<void> {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    metadata
  });
  await this.save();
};

jobSchema.methods.updateProgress = async function(
  progress: number,
  currentStep?: string
): Promise<void> {
  this.progress = Math.min(100, Math.max(0, progress));
  if (currentStep) {
    this.currentStep = currentStep;
  }
  await this.save();
};

jobSchema.methods.markAsRunning = async function(): Promise<void> {
  this.state = 'running';
  this.startedAt = new Date();
  this.attempts += 1;
  await this.save();
};

jobSchema.methods.markAsCompleted = async function(result?: any): Promise<void> {
  this.state = 'completed';
  this.progress = 100;
  this.completedAt = new Date();
  if (result) {
    this.result = result;
  }
  await this.save();
};

jobSchema.methods.markAsFailed = async function(error: any): Promise<void> {
  this.state = 'failed';
  this.completedAt = new Date();
  this.error = {
    message: error.message || 'Unknown error',
    code: error.code,
    stack: error.stack
  };
  await this.save();
};

jobSchema.methods.canRetry = function(): boolean {
  return this.attempts < this.maxAttempts && this.state === 'failed';
};

export const Job = mongoose.model<IJobDocument>('Job', jobSchema);