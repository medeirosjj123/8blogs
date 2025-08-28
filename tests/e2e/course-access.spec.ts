/**
 * E2E Test: Course Access and Learning Flow
 * Tests course navigation, lesson completion, and progress tracking
 */

import { test, expect } from '@playwright/test';
import { testConfig } from '../config/test-env';

test.describe('Course Access and Learning', () => {
  let userToken: string;
  const testUser = {
    email: 'course-test@example.com',
    name: 'Course Test User',
    password: 'TestPassword123!'
  };

  test.beforeEach(async ({ page, request }) => {
    // Create and authenticate test user with active membership
    await request.post(`${testConfig.api.baseUrl}/api/auth/register`, {
      data: testUser
    });

    // Create active membership for user
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

    // Set authentication context
    await page.goto(testConfig.frontend.baseUrl);
    await page.evaluate((token) => {
      localStorage.setItem('access_token', token);
    }, userToken);
  });

  test('user can access course catalog', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Should see course catalog
    await expect(page.locator('[data-testid="course-catalog"]')).toBeVisible();
    await expect(page.locator('[data-testid="course-card"]')).toHaveCountGreaterThan(0);
    
    // Course cards should have essential information
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    await expect(firstCourse.locator('[data-testid="course-title"]')).toBeVisible();
    await expect(firstCourse.locator('[data-testid="course-description"]')).toBeVisible();
    await expect(firstCourse.locator('[data-testid="course-progress"]')).toBeVisible();
  });

  test('user can access and navigate course content', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Click on first course
    await page.locator('[data-testid="course-card"]').first().click();
    
    // Should be on course page
    await expect(page).toHaveURL(/\/cursos\/[a-zA-Z0-9-]+/);
    await expect(page.locator('[data-testid="course-content"]')).toBeVisible();
    
    // Should see course navigation
    await expect(page.locator('[data-testid="lesson-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="lesson-list"]')).toBeVisible();
    
    // Should see first lesson content
    await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="lesson-title"]')).toBeVisible();
  });

  test('user can complete lessons and track progress', async ({ page, request }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    await page.locator('[data-testid="course-card"]').first().click();
    
    // Start first lesson
    await page.locator('[data-testid="lesson-item"]').first().click();
    
    // Should see lesson content
    await expect(page.locator('[data-testid="lesson-video"], [data-testid="lesson-text"]')).toBeVisible();
    
    // Mark lesson as complete
    await page.click('[data-testid="complete-lesson-button"]');
    
    // Should show completion confirmation
    await expect(page.locator('[data-testid="lesson-completed"]')).toBeVisible();
    
    // Progress should be updated
    await expect(page.locator('[data-testid="course-progress"]')).toContainText(/[1-9]/);
    
    // Navigate to next lesson
    if (await page.locator('[data-testid="next-lesson-button"]').isVisible()) {
      await page.click('[data-testid="next-lesson-button"]');
      await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
    }
  });

  test('user can access video content and controls', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    await page.locator('[data-testid="course-card"]').first().click();
    
    // Find lesson with video content
    await page.locator('[data-testid="lesson-item"]').first().click();
    
    // If video lesson exists
    if (await page.locator('[data-testid="lesson-video"]').isVisible()) {
      const video = page.locator('[data-testid="lesson-video"]');
      await expect(video).toBeVisible();
      
      // Should have video controls
      await expect(page.locator('[data-testid="video-play-button"], video')).toBeVisible();
      
      // Should be able to play video
      await page.click('[data-testid="video-play-button"], video');
      
      // Check if video progress is tracked
      await page.waitForTimeout(2000); // Let video play briefly
      await expect(page.locator('[data-testid="video-progress"]')).toBeVisible();
    }
  });

  test('user can download course materials', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    await page.locator('[data-testid="course-card"]').first().click();
    
    // If downloadable materials exist
    if (await page.locator('[data-testid="lesson-materials"]').isVisible()) {
      await expect(page.locator('[data-testid="download-material"]')).toBeVisible();
      
      // Click download should initiate download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-material"]')
      ]);
      
      expect(download).toBeTruthy();
    }
  });

  test('course progress persists across sessions', async ({ page, request }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    await page.locator('[data-testid="course-card"]').first().click();
    
    // Complete first lesson
    await page.locator('[data-testid="lesson-item"]').first().click();
    await page.click('[data-testid="complete-lesson-button"]');
    
    // Get initial progress
    const initialProgress = await page.locator('[data-testid="course-progress"]').textContent();
    
    // Simulate session end and restart
    await page.reload();
    
    // Progress should persist
    await expect(page.locator('[data-testid="course-progress"]')).toContainText(initialProgress || '');
    
    // Completed lesson should still show as completed
    await expect(page.locator('[data-testid="lesson-item"]').first().locator('[data-testid="lesson-completed-icon"]')).toBeVisible();
  });

  test('user cannot access content without valid membership', async ({ page, request }) => {
    // Remove user's membership
    await request.delete(`${testConfig.api.baseUrl}/api/admin/memberships/user/${testUser.email}`, {
      headers: {
        'Authorization': `Bearer ${testConfig.admin.token}`
      }
    });

    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Should see access restriction message
    await expect(page.locator('[data-testid="access-restricted"]')).toBeVisible();
    await expect(page.locator('text=Assine um plano')).toBeVisible();
    
    // Should have upgrade/purchase options
    await expect(page.locator('[data-testid="upgrade-button"]')).toBeVisible();
  });

  test('search functionality works in course catalog', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Should see search input
    await expect(page.locator('[data-testid="course-search"]')).toBeVisible();
    
    // Search for specific term
    await page.fill('[data-testid="course-search"]', 'SEO');
    await page.press('[data-testid="course-search"]', 'Enter');
    
    // Should filter results
    await expect(page.locator('[data-testid="course-card"]')).toHaveCountGreaterThan(0);
    
    // Clear search
    await page.fill('[data-testid="course-search"]', '');
    await page.press('[data-testid="course-search"]', 'Enter');
    
    // Should show all courses again
    await expect(page.locator('[data-testid="course-card"]')).toHaveCountGreaterThan(0);
  });

  test('course categories and filtering work', async ({ page }) => {
    await page.goto(`${testConfig.frontend.baseUrl}/cursos`);
    
    // Should see category filters if they exist
    if (await page.locator('[data-testid="category-filter"]').isVisible()) {
      // Click on a category
      await page.locator('[data-testid="category-filter"]').first().click();
      
      // Should filter courses
      await expect(page.locator('[data-testid="course-card"]')).toHaveCountGreaterThan(0);
      
      // Reset filter
      await page.click('[data-testid="clear-filters"]');
    }
  });
});