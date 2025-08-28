/**
 * Integration Test: Webhook Processing
 * Tests complete webhook flow including signature verification, user creation, and email sending
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '@/index';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import { connectDatabase, closeDatabaseConnection } from '@tests/helpers/setup';
import { emailService } from '@/services/email.service';

// Mock email service to prevent actual emails during tests
vi.mock('@/services/email.service', () => ({
  emailService: {
    sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
    sendMagicLinkEmail: vi.fn().mockResolvedValue({ success: true }),
    initialize: vi.fn().mockResolvedValue(true)
  }
}));

describe('Webhook Integration Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    await Membership.deleteMany({});
    
    // Clear mock calls
    vi.clearAllMocks();
  });

  describe('Kiwify Webhook Processing', () => {
    const webhookSecret = process.env.KIWIFY_WEBHOOK_SECRET || 'test_webhook_secret_for_development_123';
    
    const createWebhookPayload = (data: any) => {
      const payload = {
        event: 'pedido_aprovado',
        data: {
          order_id: `test_order_${Date.now()}`,
          customer_id: 'test_customer_123',
          customer_email: 'webhook-test@example.com',
          customer_name: 'Webhook Test User',
          product_id: 'kiwify_product_basic',
          product_name: 'Escola do SEO - Plano Básico',
          payment_method: 'credit_card',
          subscription_id: null,
          metadata: { test: true },
          ...data
        }
      };
      
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return { payload, signature };
    };

    it('should process successful purchase webhook and create user', async () => {
      const { payload, signature } = createWebhookPayload({});
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      
      // Verify user was created
      const user = await User.findOne({ email: 'webhook-test@example.com' });
      expect(user).toBeTruthy();
      expect(user?.name).toBe('Webhook Test User');
      expect(user?.role).toBe('aluno');
      expect(user?.emailVerified).toBe(true);
      
      // Verify membership was created
      const membership = await Membership.findOne({ userId: user?._id });
      expect(membership).toBeTruthy();
      expect(membership?.status).toBe('active');
      expect(membership?.plan).toBe('basic');
      expect(membership?.kiwifyOrderId).toBe(payload.data.order_id);
      
      // Verify emails were sent
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'webhook-test@example.com',
        'Webhook Test User'
      );
      expect(emailService.sendMagicLinkEmail).toHaveBeenCalled();
    });

    it('should handle existing user with new purchase', async () => {
      // Create existing user
      const existingUser = new User({
        email: 'existing-user@example.com',
        name: 'Existing User',
        role: 'aluno'
      });
      await existingUser.save();
      
      const { payload, signature } = createWebhookPayload({
        customer_email: 'existing-user@example.com',
        customer_name: 'Existing User'
      });
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // User should not be duplicated
      const users = await User.find({ email: 'existing-user@example.com' });
      expect(users).toHaveLength(1);
      
      // New membership should be created
      const membership = await Membership.findOne({ userId: existingUser._id });
      expect(membership).toBeTruthy();
      expect(membership?.status).toBe('active');
      
      // Should send magic link email (but not welcome email)
      expect(emailService.sendMagicLinkEmail).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('should handle purchase cancellation', async () => {
      // Create user and membership first
      const user = new User({
        email: 'cancel-test@example.com',
        name: 'Cancel Test User',
        role: 'aluno'
      });
      await user.save();
      
      const membership = new Membership({
        userId: user._id,
        plan: 'basic',
        status: 'active',
        kiwifyOrderId: 'cancel_test_order'
      });
      await membership.save();
      
      const payload = {
        event: 'pedido_cancelado',
        data: {
          order_id: 'cancel_test_order',
          customer_email: 'cancel-test@example.com',
          customer_name: 'Cancel Test User'
        }
      };
      
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Membership should be cancelled
      const updatedMembership = await Membership.findById(membership._id);
      expect(updatedMembership?.status).toBe('cancelled');
      
      // User membership status should be updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.membership?.status).toBe('cancelled');
    });

    it('should handle chargeback', async () => {
      // Create user and membership first
      const user = new User({
        email: 'chargeback-test@example.com',
        name: 'Chargeback Test User',
        role: 'aluno'
      });
      await user.save();
      
      const membership = new Membership({
        userId: user._id,
        plan: 'basic',
        status: 'active',
        kiwifyOrderId: 'chargeback_test_order'
      });
      await membership.save();
      
      const payload = {
        event: 'chargeback',
        data: {
          order_id: 'chargeback_test_order',
          customer_email: 'chargeback-test@example.com',
          customer_name: 'Chargeback Test User'
        }
      };
      
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Membership should be suspended
      const updatedMembership = await Membership.findById(membership._id);
      expect(updatedMembership?.status).toBe('suspended');
      
      // User membership status should be updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.membership?.status).toBe('cancelled');
    });

    it('should reject webhook with invalid signature', async () => {
      const { payload } = createWebhookPayload({});
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', 'invalid_signature')
        .send(payload);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
      
      // No user should be created
      const user = await User.findOne({ email: 'webhook-test@example.com' });
      expect(user).toBeFalsy();
    });

    it('should reject webhook without signature', async () => {
      const { payload } = createWebhookPayload({});
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .send(payload);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should handle subscription renewal', async () => {
      // Create existing membership
      const user = new User({
        email: 'renewal-test@example.com',
        name: 'Renewal Test User',
        role: 'aluno'
      });
      await user.save();
      
      const membership = new Membership({
        userId: user._id,
        plan: 'basic',
        status: 'active',
        kiwifySubscriptionId: 'test_subscription_123',
        currentPeriodEnd: new Date()
      });
      await membership.save();
      
      const payload = {
        event: 'assinatura_renovada',
        data: {
          subscription_id: 'test_subscription_123',
          customer_email: 'renewal-test@example.com',
          customer_name: 'Renewal Test User',
          next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // Membership period should be extended
      const updatedMembership = await Membership.findById(membership._id);
      expect(updatedMembership?.currentPeriodEnd).toBeInstanceOf(Date);
      expect(updatedMembership?.status).toBe('active');
    });

    it('should handle premium product upgrade', async () => {
      const { payload, signature } = createWebhookPayload({
        product_id: 'kiwify_product_premium'
      });
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      expect(response.status).toBe(200);
      
      // User should be created with mentor role
      const user = await User.findOne({ email: 'webhook-test@example.com' });
      expect(user?.role).toBe('mentor');
      
      // Membership should be premium
      const membership = await Membership.findOne({ userId: user?._id });
      expect(membership?.plan).toBe('premium');
    });

    it('should be idempotent for duplicate webhooks', async () => {
      const { payload, signature } = createWebhookPayload({
        order_id: 'duplicate_test_order'
      });
      
      // Send webhook twice
      await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      // Should only create one user and membership
      const users = await User.find({ email: 'webhook-test@example.com' });
      expect(users).toHaveLength(1);
      
      const memberships = await Membership.find({ kiwifyOrderId: 'duplicate_test_order' });
      expect(memberships).toHaveLength(1);
      
      // Welcome email should only be sent once
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    });

    it('should handle webhook processing errors gracefully', async () => {
      // Mock email service to throw error
      vi.mocked(emailService.sendWelcomeEmail).mockRejectedValueOnce(new Error('Email service unavailable'));
      
      const { payload, signature } = createWebhookPayload({});
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', signature)
        .send(payload);
      
      // Webhook should still succeed even if emails fail
      expect(response.status).toBe(200);
      
      // User and membership should still be created
      const user = await User.findOne({ email: 'webhook-test@example.com' });
      expect(user).toBeTruthy();
      
      const membership = await Membership.findOne({ userId: user?._id });
      expect(membership).toBeTruthy();
    });
  });

  describe('Webhook Configuration', () => {
    it('should reject webhook when KIWIFY_WEBHOOK_SECRET is not configured', async () => {
      // Temporarily remove webhook secret
      const originalSecret = process.env.KIWIFY_WEBHOOK_SECRET;
      delete process.env.KIWIFY_WEBHOOK_SECRET;
      
      const payload = {
        event: 'pedido_aprovado',
        data: {
          order_id: 'test_order',
          customer_email: 'test@example.com'
        }
      };
      
      const response = await request(app)
        .post('/api/webhooks/kiwify')
        .set('X-Kiwify-Signature', 'any_signature')
        .send(payload);
      
      expect(response.status).toBe(401);
      
      // Restore webhook secret
      process.env.KIWIFY_WEBHOOK_SECRET = originalSecret;
    });
  });
});