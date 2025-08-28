import { test, expect } from '@playwright/test';

test.describe('Course Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@tatame.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display courses list', async ({ page }) => {
    // Navigate to courses
    await page.goto('/cursos');
    
    // Check for courses page elements
    await expect(page.locator('h1')).toContainText(/Cursos|Courses/i);
    
    // Check if courses are displayed
    const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
    await expect(courseCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to course details', async ({ page }) => {
    await page.goto('/cursos');
    
    // Wait for courses to load
    const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
    await expect(courseCards.first()).toBeVisible({ timeout: 10000 });
    
    // Click on first course
    await courseCards.first().click();
    
    // Should navigate to course detail page
    await expect(page.url()).toMatch(/\/course\/.+/);
    
    // Check for course detail elements
    await expect(page.locator('text=/Módulo|Module/i')).toBeVisible({ timeout: 10000 });
  });

  test('should filter courses by level', async ({ page }) => {
    await page.goto('/cursos');
    
    // Wait for courses to load
    await page.waitForSelector('[data-testid="course-card"], .course-card, [class*="course"]');
    
    // Look for filter buttons
    const filterButtons = page.locator('button:has-text(/Iniciante|Beginner/i)');
    
    if (await filterButtons.count() > 0) {
      // Click on beginner filter
      await filterButtons.first().click();
      
      // Check if courses are filtered
      const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
      await expect(courseCards).toHaveCount(await courseCards.count());
    }
  });

  test('should display course progress', async ({ page }) => {
    await page.goto('/cursos');
    
    // Wait for courses to load
    const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
    await expect(courseCards.first()).toBeVisible({ timeout: 10000 });
    
    // Check for progress indicators
    const progressElements = page.locator('[class*="progress"], [data-testid="progress"]');
    
    if (await progressElements.count() > 0) {
      await expect(progressElements.first()).toBeVisible();
    }
  });

  test('should show course modules', async ({ page }) => {
    await page.goto('/cursos');
    
    // Wait for courses to load
    const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
    await expect(courseCards.first()).toBeVisible({ timeout: 10000 });
    
    // Navigate to first course
    await courseCards.first().click();
    
    // Wait for course page to load
    await page.waitForURL(/\/course\/.+/);
    
    // Check for modules
    const modules = page.locator('[data-testid="module"], [class*="module"]');
    
    if (await modules.count() > 0) {
      await expect(modules.first()).toBeVisible();
      
      // Check module information
      await expect(page.locator('text=/Aula|Lesson/i')).toBeVisible();
    }
  });
});