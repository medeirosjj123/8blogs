/**
 * E2E Test: Community Chat Features
 * Tests real-time chat, channels, direct messages, and file uploads
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../config/test-env';

test.describe('Community Chat Features', () => {
  let userToken: string;
  const testUser = {
    email: 'chat-test@example.com',
    name: 'Chat Test User',
    password: 'TestPassword123!'
  };

  test.beforeEach(async ({ page, request }) => {
    // Create and authenticate test user with active membership
    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: testUser
    });

    // Create active membership
    await request.post(`${testConfig.api.baseUrl}/api/admin/memberships`, {
      headers: {
        'Authorization': `Bearer ${testConfig.admin.token}`
      },
      data: {
        userEmail: testUser.email,
        plan: 'basic',
        status: 'active'
      }
    });

    // Login user
    const loginResponse = await request.post(`${testConfig.api.baseUrl}/api/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    const loginData = await loginResponse.json();
    userToken = loginData.token;

    // Set authentication
    await page.goto(testConfig.frontend.baseUrl);
    await page.evaluate((token) => {
      localStorage.setItem('access_token', token);
    }, userToken);
  });

  test('user can access community chat', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Should see chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  });

  test('user can send and receive messages', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Wait for chat to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Send a test message
    const testMessage = `E2E Test Message ${Date.now()}`;
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // Message should appear in chat
    await expect(page.locator(`[data-testid="message"]:has-text("${testMessage}")`)).toBeVisible();
    
    // Message should show user name
    await expect(page.locator(`[data-testid="message-author"]:has-text("${testUser.name}")`)).toBeVisible();
    
    // Message should have timestamp
    await expect(page.locator('[data-testid="message-timestamp"]')).toBeVisible();
  });

  test('user can navigate between channels', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    await expect(page.locator('[data-testid="channel-list"]')).toBeVisible();
    
    // Should have at least one channel
    await expect(page.locator('[data-testid="channel-item"]')).toHaveCountGreaterThan(0);
    
    // Click on different channels
    const channels = page.locator('[data-testid="channel-item"]');
    const channelCount = await channels.count();
    
    if (channelCount > 1) {
      // Click second channel
      await channels.nth(1).click();
      
      // Should switch to new channel
      await expect(page.locator('[data-testid="channel-header"]')).toBeVisible();
      
      // Message area should update
      await expect(page.locator('[data-testid="message-area"]')).toBeVisible();
    }
  });

  test('user can initiate and use direct messages', async ({ page, request }) => {
    // Create a second user for DM testing
    const secondUser = {
      email: 'dm-test@example.com',
      name: 'DM Test User',
      password: 'TestPassword123!'
    };

    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: secondUser
    });

    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Look for user list or people section
    if (await page.locator('[data-testid="user-list"]').isVisible()) {
      // Click on another user to start DM
      await page.locator('[data-testid="user-item"]').first().click();
      
      // Should open DM interface
      await expect(page.locator('[data-testid="dm-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="dm-header"]')).toBeVisible();
      
      // Send DM
      const dmMessage = `Private message ${Date.now()}`;
      await page.fill('[data-testid="message-input"]', dmMessage);
      await page.click('[data-testid="send-button"]');
      
      // Message should appear
      await expect(page.locator(`[data-testid="message"]:has-text("${dmMessage}")`)).toBeVisible();
    }
  });

  test('user can upload and share images', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Look for file upload button
    if (await page.locator('[data-testid="file-upload-button"]').isVisible()) {
      // Create a small test image file
      const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      
      // Set up file chooser
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('[data-testid="file-upload-button"]')
      ]);
      
      await fileChooser.setFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: buffer,
      });
      
      // Should show upload preview
      await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();
      
      // Send the image
      await page.click('[data-testid="send-upload"]');
      
      // Image message should appear
      await expect(page.locator('[data-testid="message-image"]')).toBeVisible();
    }
  });

  test('message reactions work', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Send a message first
    const testMessage = `Reaction test ${Date.now()}`;
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    const message = page.locator(`[data-testid="message"]:has-text("${testMessage}")`);
    await expect(message).toBeVisible();
    
    // Hover over message to see reaction options
    await message.hover();
    
    if (await page.locator('[data-testid="reaction-button"]').isVisible()) {
      await page.click('[data-testid="reaction-button"]');
      
      // Click on a reaction emoji
      await page.click('[data-testid="emoji-like"], [data-testid="emoji-👍"]');
      
      // Reaction should appear on message
      await expect(message.locator('[data-testid="message-reactions"]')).toBeVisible();
    }
  });

  test('real-time message updates work', async ({ page, browser }) => {
    // This test requires two browser contexts to simulate real-time updates
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Set up second user
    await page2.goto(testConfig.frontend.baseUrl);
    await page2.evaluate((token) => {
      localStorage.setItem('access_token', token);
    }, userToken);
    
    // Both pages go to community
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    await page2.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page2.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Send message from first page
    const testMessage = `Real-time test ${Date.now()}`;
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // Message should appear on both pages
    await expect(page.locator(`[data-testid="message"]:has-text("${testMessage}")`)).toBeVisible();
    await expect(page2.locator(`[data-testid="message"]:has-text("${testMessage}")`)).toBeVisible();
    
    await context2.close();
  });

  test('user can edit and delete their own messages', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Send a message
    const testMessage = `Edit test ${Date.now()}`;
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    const message = page.locator(`[data-testid="message"]:has-text("${testMessage}")`);
    await expect(message).toBeVisible();
    
    // Right-click or hover for context menu
    await message.hover();
    
    if (await page.locator('[data-testid="edit-message"]').isVisible()) {
      await page.click('[data-testid="edit-message"]');
      
      // Should show edit input
      await expect(page.locator('[data-testid="edit-input"]')).toBeVisible();
      
      // Edit the message
      await page.fill('[data-testid="edit-input"]', `${testMessage} (edited)`);
      await page.click('[data-testid="save-edit"]');
      
      // Should show edited message
      await expect(page.locator(`[data-testid="message"]:has-text("${testMessage} (edited)")`)).toBeVisible();
      await expect(page.locator('[data-testid="edited-indicator"]')).toBeVisible();
    }
    
    // Test delete
    if (await page.locator('[data-testid="delete-message"]').isVisible()) {
      await page.click('[data-testid="delete-message"]');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');
      
      // Message should be removed or show as deleted
      await expect(page.locator(`[data-testid="message"]:has-text("${testMessage}")`)).not.toBeVisible();
    }
  });

  test('search functionality works in chat', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Send a unique message to search for
    const searchTerm = `SearchTest${Date.now()}`;
    await page.fill('[data-testid="message-input"]', `This is a ${searchTerm} message`);
    await page.click('[data-testid="send-button"]');
    
    // Look for search functionality
    if (await page.locator('[data-testid="chat-search"]').isVisible()) {
      await page.fill('[data-testid="chat-search"]', searchTerm);
      await page.press('[data-testid="chat-search"]', 'Enter');
      
      // Should show search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator(`[data-testid="search-result"]:has-text("${searchTerm}")`)).toBeVisible();
    }
  });

  test('user cannot access chat without valid membership', async ({ page, request }) => {
    // Remove user's membership
    await request.delete(`${testConfig.api.baseUrl}/api/admin/memberships/user/${testUser.email}`, {
      headers: {
        'Authorization': `Bearer ${testConfig.admin.token}`
      }
    });

    await page.goto(`${testConfig.frontend.baseUrl}/comunidade`);
    
    // Should see access restriction
    await expect(page.locator('[data-testid="access-restricted"]')).toBeVisible();
    await expect(page.locator('text=Assine um plano')).toBeVisible();
  });
});