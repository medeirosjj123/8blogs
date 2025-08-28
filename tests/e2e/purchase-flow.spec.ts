/**
 * E2E Test: Complete Purchase Flow
 * Tests the critical path: Kiwify Purchase → User Creation → Email → Access Grant
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../config/test-env';

test.describe('Purchase Flow Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.goto(testConfig.frontend.baseUrl);
  });

  test('complete purchase flow from webhook to course access', async ({ page, request }) => {
    // Step 1: Simulate Kiwify webhook (this creates user and membership)
    const webhookPayload = {
      event: 'pedido_aprovado',
      data: {
        order_id: `test_order_${Date.now()}`,
        customer_id: 'e2e_customer_123',
        customer_email: 'e2e-test@example.com',
        customer_name: 'E2E Test User',
        product_id: 'kiwify_product_basic',
        product_name: 'Escola do SEO - Plano Básico',
        payment_method: 'credit_card',
        subscription_id: null,
        metadata: { test: true }
      }
    };

    // Generate webhook signature
    const crypto = require('crypto');
    const webhookSecret = testConfig.api.webhookSecret || 'test_webhook_secret_for_development_123';
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    // Send webhook request
    const webhookResponse = await request.post(`${testConfig.api.baseUrl}/api/webhooks/kiwify`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Kiwify-Signature': signature
      },
      data: webhookPayload
    });

    expect(webhookResponse.ok()).toBeTruthy();
    const webhookResult = await webhookResponse.json();
    expect(webhookResult.received).toBe(true);

    // Step 2: Test magic link login (simulating email click)
    // First, get the magic link token from the database (in real scenario, user clicks email)
    const userResponse = await request.get(`${testConfig.api.baseUrl}/api/admin/users?email=e2e-test@example.com`, {
      headers: {
        'Authorization': `Bearer ${testConfig.admin.token}`
      }
    });
    
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    const magicToken = userData.data[0]?.magicLinkToken;
    
    expect(magicToken).toBeTruthy();

    // Step 3: Navigate to magic link and verify auto-login
    await page.goto(`${testConfig.frontend.baseUrl}/auth/magic-link?token=${magicToken}`);
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('text=E2E Test User')).toBeVisible();

    // Step 4: Test course access
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Should see courses (not blocked)
    await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
    
    // Click on first course
    await page.locator('[data-testid="course-card"]').first().click();
    
    // Should be able to access course content
    await expect(page.locator('[data-testid="course-content"]')).toBeVisible();

    // Step 5: Test community access
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Should be able to access community
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Should be able to send a message
    await page.fill('[data-testid="message-input"]', 'E2E test message');
    await page.click('[data-testid="send-button"]');
    
    // Message should appear
    await expect(page.locator('text=E2E test message')).toBeVisible();

    // Step 6: Test user profile and membership status
    await page.goto(`${testConfig.frontend.baseUrl}/perfil`);
    
    // Should show active membership
    await expect(page.locator('[data-testid="membership-status"]')).toContainText('Ativo');
    await expect(page.locator('[data-testid="membership-plan"]')).toContainText('Básico');
  });

  test('rejected purchase should not grant access', async ({ page, request }) => {
    // Test cancelled/refunded webhook
    const webhookPayload = {
      event: 'pedido_cancelado',
      data: {
        order_id: 'test_cancelled_order',
        customer_email: 'cancelled-user@example.com',
        customer_name: 'Cancelled User'
      }
    };

    const crypto = require('crypto');
    const webhookSecret = testConfig.api.webhookSecret || 'test_webhook_secret_for_development_123';
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    const webhookResponse = await request.post(`${testConfig.api.baseUrl}/api/webhooks/kiwify`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Kiwify-Signature': signature
      },
      data: webhookPayload
    });

    expect(webhookResponse.ok()).toBeTruthy();

    // Try to access protected content without valid membership
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Should be redirected to login or see access denied
    await expect(page).toHaveURL(/\/(login|acesso-negado)/);
  });

  test('invalid webhook signature should be rejected', async ({ request }) => {
    const webhookPayload = {
      event: 'pedido_aprovado',
      data: {
        order_id: 'test_invalid_signature',
        customer_email: 'invalid@example.com'
      }
    };

    // Send with invalid signature
    const webhookResponse = await request.post(`${testConfig.api.baseUrl}/api/webhooks/kiwify`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Kiwify-Signature': 'invalid_signature_123'
      },
      data: webhookPayload
    });

    expect(webhookResponse.status()).toBe(401);
    const result = await webhookResponse.json();
    expect(result.error).toBe('Invalid signature');
  });
});