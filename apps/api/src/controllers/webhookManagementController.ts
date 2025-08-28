import { Request, Response } from 'express';
import { WebhookConfig } from '../models/WebhookConfig';
import { WebhookEvent } from '../models/WebhookEvent';
import { webhookService } from '../services/webhookService';
import crypto from 'crypto';

// Get all webhook configurations
export const getWebhooks = async (req: Request, res: Response) => {
  try {
    const webhooks = await WebhookConfig.find()
      .select('-encryptedSecret')
      .sort({ createdAt: -1 });

    // Add recent events count for each webhook
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const recentEvents = await WebhookEvent.countDocuments({
          configId: webhook._id,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        const failedEvents = await WebhookEvent.countDocuments({
          configId: webhook._id,
          status: 'failed'
        });

        return {
          ...webhook.toObject(),
          recentEventsCount: recentEvents,
          failedEventsCount: failedEvents
        };
      })
    );

    res.json({
      success: true,
      data: webhooksWithStats
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhooks'
    });
  }
};

// Get single webhook configuration
export const getWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const webhook = await WebhookConfig.findById(id).select('-encryptedSecret');
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      data: webhook
    });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhook'
    });
  }
};

// Create new webhook configuration
export const createWebhook = async (req: Request, res: Response) => {
  try {
    const { name, description, provider, url, events, headers, retryPolicy } = req.body;

    // Generate a secure secret if not provided
    const secret = req.body.secret || crypto.randomBytes(32).toString('hex');

    // Check if URL is already in use
    const existingWebhook = await WebhookConfig.findOne({ url });
    if (existingWebhook) {
      return res.status(400).json({
        success: false,
        message: 'A webhook with this URL already exists'
      });
    }

    const webhook = new WebhookConfig({
      name,
      description,
      provider,
      url,
      secret,
      events: events || getDefaultEventsForProvider(provider),
      headers: headers || new Map(),
      retryPolicy: retryPolicy || {
        maxRetries: 3,
        backoffMs: 1000
      },
      isActive: true
    });

    await webhook.save();

    // Register the webhook endpoint dynamically
    await webhookService.registerWebhook(webhook);

    res.status(201).json({
      success: true,
      data: {
        ...webhook.toObject(),
        secret: secret // Return the secret only on creation
      },
      message: 'Webhook created successfully'
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create webhook'
    });
  }
};

// Update webhook configuration
export const updateWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating the URL directly (would break existing integrations)
    delete updates.url;
    delete updates.encryptedSecret;

    const webhook = await WebhookConfig.findById(id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // If secret is being updated, handle it specially
    if (updates.secret) {
      webhook.secret = updates.secret;
      delete updates.secret;
    }

    // Update other fields
    Object.assign(webhook, updates);
    await webhook.save();

    // Re-register webhook if it's active
    if (webhook.isActive) {
      await webhookService.registerWebhook(webhook);
    } else {
      await webhookService.unregisterWebhook(webhook.url);
    }

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook updated successfully'
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update webhook'
    });
  }
};

// Delete webhook configuration
export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const webhook = await WebhookConfig.findById(id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // Unregister the webhook endpoint
    await webhookService.unregisterWebhook(webhook.url);

    // Delete associated events
    await WebhookEvent.deleteMany({ configId: webhook._id });

    // Delete the webhook config
    await webhook.deleteOne();

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete webhook'
    });
  }
};

// Get webhook events
export const getWebhookEvents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    const query: any = { configId: id };
    if (status) {
      query.status = status;
    }

    const events = await WebhookEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await WebhookEvent.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching webhook events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhook events'
    });
  }
};

// Test webhook
export const testWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payload } = req.body;

    const webhook = await WebhookConfig.findById(id).select('+encryptedSecret');
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // Create a test payload if not provided
    const testPayload = payload || getTestPayloadForProvider(webhook.provider);

    // Send test webhook
    const result = await webhookService.sendWebhook(webhook, 'test', testPayload);

    res.json({
      success: true,
      data: result,
      message: 'Test webhook sent successfully'
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook'
    });
  }
};

// Retry failed webhook events
export const retryWebhookEvents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { eventIds } = req.body;

    const query: any = { configId: id, status: 'failed' };
    if (eventIds && eventIds.length > 0) {
      query._id = { $in: eventIds };
    }

    const events = await WebhookEvent.find(query);
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No failed events found to retry'
      });
    }

    // Queue events for retry
    const retryResults = await Promise.all(
      events.map(event => webhookService.retryWebhookEvent(event))
    );

    res.json({
      success: true,
      data: {
        retriedCount: retryResults.filter(r => r).length,
        failedCount: retryResults.filter(r => !r).length
      },
      message: `Queued ${retryResults.filter(r => r).length} events for retry`
    });
  } catch (error) {
    console.error('Error retrying webhook events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry webhook events'
    });
  }
};

// Helper function to get default events for a provider
function getDefaultEventsForProvider(provider: string): string[] {
  switch (provider) {
    case 'kiwify':
      return [
        'pedido_aprovado',
        'pedido_pago',
        'pedido_cancelado',
        'pedido_reembolsado',
        'chargeback',
        'assinatura_renovada',
        'assinatura_cancelada'
      ];
    case 'stripe':
      return [
        'payment_intent.succeeded',
        'payment_intent.failed',
        'customer.subscription.created',
        'customer.subscription.deleted',
        'charge.dispute.created'
      ];
    case 'paypal':
      return [
        'PAYMENT.SALE.COMPLETED',
        'PAYMENT.SALE.REFUNDED',
        'BILLING.SUBSCRIPTION.CREATED',
        'BILLING.SUBSCRIPTION.CANCELLED'
      ];
    default:
      return ['*'];
  }
}

// Helper function to get test payload for a provider
function getTestPayloadForProvider(provider: string): any {
  const timestamp = new Date().toISOString();
  
  switch (provider) {
    case 'kiwify':
      return {
        event: 'test_webhook',
        data: {
          order_id: 'test_order_' + Date.now(),
          customer_id: 'test_customer',
          customer_email: 'test@example.com',
          customer_name: 'Test User',
          product_id: 'test_product',
          product_name: 'Test Product',
          amount: 99.90,
          currency: 'BRL',
          status: 'approved',
          created_at: timestamp
        }
      };
    case 'stripe':
      return {
        id: 'evt_test_' + Date.now(),
        object: 'event',
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'pi_test_' + Date.now(),
            amount: 9990,
            currency: 'brl',
            status: 'succeeded'
          }
        }
      };
    default:
      return {
        event: 'test',
        timestamp,
        data: {
          message: 'This is a test webhook',
          id: Date.now()
        }
      };
  }
}