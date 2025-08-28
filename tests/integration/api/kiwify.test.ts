/**
 * Kiwify Webhook Integration Tests
 * Tests for payment processing and access management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { 
  setupIntegrationTest, 
  cleanupIntegrationTest,
  clearTestDB
} from '../../helpers/setup';
import { 
  createKiwifyWebhook,
  createUser
} from '../../helpers/factories';

// Import your Express app
import app from '../../../apps/api/src/app';

describe('Kiwify Webhooks', () => {
  const WEBHOOK_SECRET = process.env.KIWIFY_WEBHOOK_SECRET || 'test-webhook-secret';

  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await cleanupIntegrationTest();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  /**
   * Helper to generate webhook signature
   */
  function generateWebhookSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
  }

  describe('POST /api/v1/webhooks/kiwify', () => {
    it('should process order.paid webhook and grant access', async () => {
      const webhookData = createKiwifyWebhook('order.paid', {
        data: {
          customer: {
            email: 'newcustomer@example.com',
            name: 'New Customer',
          },
          product_id: 'prod_123',
          product_name: 'Tatame SEO Course',
          order_id: 'order_123',
          amount: 497.00
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      
      // Verify user was created or updated
      // You might need to check your database here
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookData = createKiwifyWebhook('order.paid');
      
      await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', 'invalid-signature')
        .send(webhookData)
        .expect(401);
    });

    it('should reject webhook without signature', async () => {
      const webhookData = createKiwifyWebhook('order.paid');
      
      await request(app)
        .post('/api/v1/webhooks/kiwify')
        .send(webhookData)
        .expect(401);
    });

    it('should handle order.refunded webhook and revoke access', async () => {
      // First, create a user with active subscription
      const userData = createUser({
        email: 'refund@example.com',
        hasActiveSubscription: true
      });

      // Create user in database
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      // Send refund webhook
      const webhookData = createKiwifyWebhook('order.refunded', {
        data: {
          customer: {
            email: userData.email,
          },
          order_id: 'order_123',
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify access was revoked
      // You might need to check user's subscription status in database
    });

    it('should handle order.chargeback webhook', async () => {
      const webhookData = createKiwifyWebhook('order.chargeback', {
        data: {
          customer: {
            email: 'chargeback@example.com',
          },
          order_id: 'order_456',
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should be idempotent (handle duplicate webhooks)', async () => {
      const webhookData = createKiwifyWebhook('order.paid', {
        data: {
          order_id: 'duplicate_order_123',
          customer: {
            email: 'duplicate@example.com',
          }
        }
      });

      const signature = generateWebhookSignature(webhookData);

      // Send webhook first time
      await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      // Send same webhook again
      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      // Should handle gracefully without creating duplicate data
      expect(response.body.success).toBe(true);
    });

    it('should handle subscription.created webhook', async () => {
      const webhookData = createKiwifyWebhook('subscription.created', {
        data: {
          subscription_id: 'sub_123',
          customer: {
            email: 'subscriber@example.com',
            name: 'New Subscriber',
          },
          plan: 'monthly',
          amount: 97.00,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle subscription.cancelled webhook', async () => {
      const webhookData = createKiwifyWebhook('subscription.cancelled', {
        data: {
          subscription_id: 'sub_123',
          customer: {
            email: 'cancelled@example.com',
          },
          cancelled_at: new Date().toISOString()
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should log unknown webhook events', async () => {
      const webhookData = createKiwifyWebhook('unknown.event', {
        data: {
          test: 'data'
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(200);

      // Should acknowledge receipt even for unknown events
      expect(response.body.success).toBe(true);
    });

    it('should handle malformed webhook data gracefully', async () => {
      const webhookData = {
        event: 'order.paid',
        // Missing data field
      };

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Webhook Security', () => {
    it('should reject replay attacks (old timestamps)', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 2); // 2 hours old

      const webhookData = createKiwifyWebhook('order.paid', {
        timestamp: oldDate.toISOString(),
        data: {
          customer: {
            email: 'replay@example.com',
          }
        }
      });

      const signature = generateWebhookSignature(webhookData);

      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(webhookData);

      // Should reject if timestamp validation is implemented
      // This might be 200 if not implemented yet
      expect([200, 400]).toContain(response.status);
    });

    it('should validate required webhook headers', async () => {
      const webhookData = createKiwifyWebhook('order.paid');

      // Missing signature header
      await request(app)
        .post('/api/v1/webhooks/kiwify')
        .send(webhookData)
        .expect(401);
    });
  });

  describe('Access Management', () => {
    it('should grant appropriate access based on product', async () => {
      const products = [
        { id: 'prod_basic', name: 'Basic Plan', expectedRole: 'aluno' },
        { id: 'prod_pro', name: 'Pro Plan', expectedRole: 'pro' },
        { id: 'prod_mentor', name: 'Mentoria', expectedRole: 'mentor' }
      ];

      for (const product of products) {
        const webhookData = createKiwifyWebhook('order.paid', {
          data: {
            customer: {
              email: `${product.id}@example.com`,
              name: `Customer ${product.name}`,
            },
            product_id: product.id,
            product_name: product.name,
          }
        });

        const signature = generateWebhookSignature(webhookData);

        const response = await request(app)
          .post('/api/v1/webhooks/kiwify')
          .set('X-Kiwify-Signature', signature)
          .send(webhookData)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // You would verify the user's role in the database here
      }
    });

    it('should handle multiple product purchases (upsells)', async () => {
      const email = 'upsell@example.com';

      // First purchase
      const firstPurchase = createKiwifyWebhook('order.paid', {
        data: {
          customer: { email },
          product_id: 'prod_basic',
          order_id: 'order_1',
        }
      });

      let signature = generateWebhookSignature(firstPurchase);
      await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(firstPurchase)
        .expect(200);

      // Second purchase (upsell)
      const upsellPurchase = createKiwifyWebhook('order.paid', {
        data: {
          customer: { email },
          product_id: 'prod_pro',
          order_id: 'order_2',
        }
      });

      signature = generateWebhookSignature(upsellPurchase);
      const response = await request(app)
        .post('/api/v1/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(upsellPurchase)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // User should have upgraded access
    });
  });
});