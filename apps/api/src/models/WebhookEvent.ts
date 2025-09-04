import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWebhookEvent extends Document {
  configId: Types.ObjectId;
  provider: string;
  eventType: string;
  payload: any;
  headers?: Map<string, string>;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  attempts: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
  processingTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
  canRetry: boolean;
  markSuccess(responseCode: number, responseBody?: string, processingTimeMs?: number): Promise<this>;
  markFailed(errorMessage: string, responseCode?: number, shouldRetry?: boolean): Promise<this>;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    configId: {
      type: Schema.Types.ObjectId,
      ref: 'WebhookConfig',
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    headers: {
      type: Map,
      of: String
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending', 'retrying'],
      default: 'pending',
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now
    },
    nextRetryAt: {
      type: Date,
      index: true
    },
    responseCode: Number,
    responseBody: {
      type: String,
      maxlength: 5000 // Limit response body size
    },
    errorMessage: String,
    processingTimeMs: Number
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
WebhookEventSchema.index({ configId: 1, status: 1, createdAt: -1 });
WebhookEventSchema.index({ provider: 1, eventType: 1, createdAt: -1 });
WebhookEventSchema.index({ status: 1, nextRetryAt: 1 }); // For retry queue

// TTL index to automatically delete old events after 30 days
WebhookEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// Virtual for checking if event can be retried
WebhookEventSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.attempts < 3;
});

// Method to mark event as successful
WebhookEventSchema.methods.markSuccess = function(responseCode: number, responseBody?: string, processingTimeMs?: number) {
  this.status = 'success';
  this.responseCode = responseCode;
  this.responseBody = responseBody;
  this.processingTimeMs = processingTimeMs;
  this.lastAttemptAt = new Date();
  return this.save();
};

// Method to mark event as failed
WebhookEventSchema.methods.markFailed = function(errorMessage: string, responseCode?: number, shouldRetry = true) {
  this.status = shouldRetry && this.attempts < 3 ? 'retrying' : 'failed';
  this.errorMessage = errorMessage;
  this.responseCode = responseCode;
  this.lastAttemptAt = new Date();
  
  if (shouldRetry && this.attempts < 3) {
    // Exponential backoff: 1min, 5min, 15min
    const backoffMinutes = [1, 5, 15];
    const delayMs = backoffMinutes[this.attempts] * 60 * 1000;
    this.nextRetryAt = new Date(Date.now() + delayMs);
  }
  
  return this.save();
};

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);