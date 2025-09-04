import { WebhookConfig, IWebhookConfig } from '../models/WebhookConfig';
import { WebhookEvent, IWebhookEvent } from '../models/WebhookEvent';
import axios from 'axios';
import crypto from 'crypto';
import { Express, Request, Response } from 'express';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

class WebhookService {
  private app: Express | null = null;
  private webhookRoutes: Map<string, IWebhookConfig> = new Map();

  // Initialize the service with Express app
  initialize(app: Express) {
    this.app = app;
    this.loadWebhooks();
  }

  // Load all active webhooks and register their routes
  async loadWebhooks() {
    try {
      const webhooks = await WebhookConfig.find({ isActive: true });
      
      for (const webhook of webhooks) {
        await this.registerWebhook(webhook);
      }
      
      logger.info(`Loaded ${webhooks.length} active webhooks`);
    } catch (error) {
      logger.error({ error }, 'Failed to load webhooks');
    }
  }

  // Register a webhook endpoint dynamically
  async registerWebhook(webhook: IWebhookConfig) {
    if (!this.app) {
      logger.error('Express app not initialized');
      return;
    }

    const path = webhook.url.startsWith('/') ? webhook.url : `/${webhook.url}`;
    
    // Remove existing route if it exists
    this.unregisterWebhook(path);
    
    // Create route handler
    this.app.post(path, async (req: Request, res: Response) => {
      await this.handleWebhookRequest(webhook, req, res);
    });
    
    this.webhookRoutes.set(path, webhook);
    logger.info({ path, provider: webhook.provider }, 'Webhook registered');
  }

  // Unregister a webhook endpoint
  unregisterWebhook(path: string) {
    if (!this.app) return;
    
    // Remove from our tracking
    this.webhookRoutes.delete(path);
    
    // Note: Express doesn't have a built-in way to remove routes
    // In production, you might want to use a more sophisticated routing solution
    logger.info({ path }, 'Webhook unregistered');
  }

  // Handle incoming webhook request
  async handleWebhookRequest(webhook: IWebhookConfig, req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      // Reload webhook config to get latest settings
      const currentWebhook = await WebhookConfig.findById(webhook._id).select('+encryptedSecret');
      
      if (!currentWebhook || !currentWebhook.isActive) {
        return res.status(404).json({ error: 'Webhook not found or inactive' });
      }

      // Verify signature based on provider
      const isValid = await this.verifyWebhookSignature(
        currentWebhook,
        req.body,
        req.headers
      );
      
      if (!isValid) {
        logger.warn({ provider: currentWebhook.provider }, 'Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Extract event type
      const eventType = this.extractEventType(currentWebhook.provider, req.body);
      
      // Check if we should process this event
      if (currentWebhook.events.length > 0 && 
          !currentWebhook.events.includes('*') && 
          !currentWebhook.events.includes(eventType)) {
        return res.status(200).json({ received: true, skipped: true });
      }

      // Create webhook event record
      const event = new WebhookEvent({
        configId: currentWebhook._id,
        provider: currentWebhook.provider,
        eventType,
        payload: req.body,
        headers: new Map(Object.entries(req.headers as any)),
        status: 'pending',
        attempts: 1
      });
      
      await event.save();

      // Process the webhook based on provider
      await this.processWebhook(currentWebhook, event);

      // Update webhook stats
      currentWebhook.lastTriggeredAt = new Date();
      currentWebhook.successCount += 1;
      await currentWebhook.save();

      // Mark event as successful
      const processingTime = Date.now() - startTime;
      await event.markSuccess(200, 'Processed successfully', processingTime);

      res.status(200).json({ received: true, eventId: event._id });
      
    } catch (error: any) {
      logger.error({ error, provider: webhook.provider }, 'Error processing webhook');
      
      // Update failure count
      if (webhook._id) {
        await WebhookConfig.findByIdAndUpdate(webhook._id, {
          $inc: { failureCount: 1 }
        });
      }
      
      return res.status(200).json({ received: true, error: 'Processing error' });
    }
  }

  // Verify webhook signature based on provider
  async verifyWebhookSignature(
    webhook: IWebhookConfig,
    payload: any,
    headers: any
  ): Promise<boolean> {
    try {
      const secret = webhook.decryptSecret();
      
      switch (webhook.provider) {
        case 'kiwify':
          return this.verifyKiwifySignature(payload, headers['x-kiwify-signature'], secret);
        
        case 'stripe':
          return this.verifyStripeSignature(
            JSON.stringify(payload),
            headers['stripe-signature'],
            secret
          );
        
        case 'paypal':
          return true; // PayPal uses certificate validation
        
        case 'custom':
          // For custom webhooks, use a generic HMAC verification
          return this.verifyGenericSignature(payload, headers['x-webhook-signature'], secret);
        
        default:
          return true;
      }
    } catch (error) {
      logger.error({ error }, 'Error verifying webhook signature');
      return false;
    }
  }

  // Verify Kiwify signature
  private verifyKiwifySignature(payload: any, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Verify Stripe signature
  private verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    
    const elements = signature.split(',');
    let timestamp = '';
    let signatures: string[] = [];
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }
    
    if (!timestamp) return false;
    
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    return signatures.some(sig => 
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))
    );
  }

  // Verify generic HMAC signature
  private verifyGenericSignature(payload: any, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Extract event type from payload
  private extractEventType(provider: string, payload: any): string {
    switch (provider) {
      case 'kiwify':
        return payload.event || 'unknown';
      case 'stripe':
        return payload.type || 'unknown';
      case 'paypal':
        return payload.event_type || 'unknown';
      default:
        return payload.event || payload.type || 'unknown';
    }
  }

  // Process webhook based on provider
  async processWebhook(webhook: IWebhookConfig, event: IWebhookEvent) {
    // This is where you'd add business logic for each provider
    // For now, just log it
    logger.info({
      provider: webhook.provider,
      eventType: event.eventType,
      eventId: event._id
    }, 'Processing webhook');
    
    // You can add provider-specific processing here
    // For example, updating user memberships for Kiwify events
  }

  // Send a webhook (for testing or retries)
  async sendWebhook(
    webhook: IWebhookConfig,
    _eventType: string,
    payload: any
  ): Promise<any> {
    try {
      const secret = webhook.decryptSecret();
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'Tatame-Webhook/1.0'
      };
      
      // Add custom headers
      if (webhook.headers) {
        webhook.headers.forEach((value, key) => {
          headers[key] = value;
        });
      }
      
      // Add signature based on provider
      const payloadString = JSON.stringify(payload);
      
      switch (webhook.provider) {
        case 'kiwify':
          headers['X-Kiwify-Signature'] = crypto
            .createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex');
          break;
        
        case 'custom':
          headers['X-Webhook-Signature'] = crypto
            .createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex');
          break;
      }
      
      // Send the webhook
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: () => true // Don't throw on any status code
      });
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
      
    } catch (error: any) {
      logger.error({ error, webhookId: webhook._id }, 'Failed to send webhook');
      throw error;
    }
  }

  // Retry a failed webhook event
  async retryWebhookEvent(event: IWebhookEvent): Promise<boolean> {
    try {
      const webhook = await WebhookConfig.findById(event.configId).select('+encryptedSecret');
      
      if (!webhook || !webhook.isActive) {
        return false;
      }
      
      // Increment attempt count
      event.attempts += 1;
      event.status = 'retrying';
      await event.save();
      
      // Send the webhook
      const result = await this.sendWebhook(webhook, event.eventType, event.payload);
      
      if (result.status >= 200 && result.status < 300) {
        await event.markSuccess(result.status, JSON.stringify(result.data));
        return true;
      } else {
        await event.markFailed(
          `HTTP ${result.status}: ${result.statusText}`,
          result.status,
          event.attempts < webhook.retryPolicy.maxRetries
        );
        return false;
      }
      
    } catch (error: any) {
      await event.markFailed(
        error.message,
        undefined,
        event.attempts < 3
      );
      return false;
    }
  }

  // Get webhook statistics
  async getWebhookStats(webhookId: string) {
    const [
      totalEvents,
      successfulEvents,
      failedEvents,
      pendingEvents,
      last24Hours
    ] = await Promise.all([
      WebhookEvent.countDocuments({ configId: webhookId }),
      WebhookEvent.countDocuments({ configId: webhookId, status: 'success' }),
      WebhookEvent.countDocuments({ configId: webhookId, status: 'failed' }),
      WebhookEvent.countDocuments({ configId: webhookId, status: { $in: ['pending', 'retrying'] } }),
      WebhookEvent.countDocuments({
        configId: webhookId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);
    
    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      pendingEvents,
      last24Hours,
      successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0
    };
  }
}

export const webhookService = new WebhookService();