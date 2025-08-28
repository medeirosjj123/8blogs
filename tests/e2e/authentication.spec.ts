/**
 * E2E Test: Authentication Flows
 * Tests login, logout, magic links, and session management
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../config/test-env';

test.describe('Authentication Flows', () => {
  const testUser = {
    email: 'auth-test@example.com',
    name: 'Auth Test User',
    password: 'TestPassword123!'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto(testConfig.frontend.baseUrl);
  });

  test('user registration and email verification', async ({ page, request }) => {
    // Navigate to registration
    await page.goto(`${testConfig.frontend.baseUrl}/cadastro`);
    
    // Fill registration form
    await page.fill('[data-testid="register-name"]', testUser.name);
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.check('[data-testid="terms-checkbox"]');
    
    // Submit registration
    await page.click('[data-testid="register-submit"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    await expect(page.locator('text=Verifique seu email')).toBeVisible();
    
    // In test environment, auto-verify email
    // Get user from API to verify creation
    const userResponse = await request.get(`${testConfig.api.baseUrl}/api/admin/users?email=${testUser.email}`, {
      headers: {
        'Authorization': `Bearer ${testConfig.admin.token}`
      }
    });
    
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    expect(userData.data).toHaveLength(1);
    expect(userData.data[0].email).toBe(testUser.email);
  });

  test('magic link login', async ({ page, request }) => {
    // Create test user first
    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: testUser
    });

    // Navigate to login
    await page.goto(`${testConfig.frontend.baseUrl}/login`);
    
    // Use magic link option
    await page.click('[data-testid="magic-link-tab"]');
    await page.fill('[data-testid="magic-link-email"]', testUser.email);
    await page.click('[data-testid="send-magic-link"]');
    
    // Should show success message
    await expect(page.locator('text=Link enviado')).toBeVisible();
    
    // Get magic link token from database
    const userResponse = await request.get(`${testConfig.api.baseUrl}/api/admin/users?email=${testUser.email}`, {
      headers: {
        'Authorization': `Bearer ${testConfig.admin.token}`
      }
    });
    
    const userData = await userResponse.json();
    const magicToken = userData.data[0]?.magicLinkToken;
    
    // Navigate to magic link
    await page.goto(`${testConfig.frontend.baseUrl}/auth/magic-link?token=${magicToken}`);
    
    // Should be logged in and redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('password login and logout', async ({ page, request }) => {
    // Create test user first
    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: testUser
    });

    // Navigate to login
    await page.goto(`${testConfig.frontend.baseUrl}/login`);
    
    // Fill login form
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Should be logged in
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Test logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should be logged out and redirected
    await expect(page).toHaveURL(/\/(login|home)/);
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test('session persistence across page reloads', async ({ page, request }) => {
    // Create and login test user
    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: testUser
    });

    await page.goto(`${testConfig.frontend.baseUrl}/login`);
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('expired magic link should show error', async ({ page, request }) => {
    // Try to access with expired/invalid token
    await page.goto(`${testConfig.frontend.baseUrl}/auth/magic-link?token=invalid_expired_token`);
    
    // Should show error and redirect to login
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('text=Link inválido ou expirado')).toBeVisible();
    
    // Should have option to request new link
    await expect(page.locator('[data-testid="request-new-link"]')).toBeVisible();
  });

  test('protected routes require authentication', async ({ page }) => {
    // Try to access protected routes without login
    const protectedRoutes = [
      '/dashboard',
      '/cursos',
      '/comunidade',
      '/perfil',
      '/admin'
    ];

    for (const route of protectedRoutes) {
      await page.goto(`${testConfig.frontend.baseUrl}${route}`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('role-based access control', async ({ page, request }) => {
    // Create regular user
    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: testUser
    });

    // Login as regular user
    await page.goto(`${testConfig.frontend.baseUrl}/login`);
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Try to access admin area
    await page.goto(`${testConfig.frontend.baseUrl}/admin`);
    
    // Should be denied access
    await expect(page).toHaveURL(/\/(dashboard|acesso-negado)/);
    await expect(page.locator('text=Acesso negado')).toBeVisible();
  });
});