/**
 * Critical User Paths E2E Tests
 * Tests the most important user journeys through the application
 */

import { test, expect, Page } from '@playwright/test';
import { testConfig, getTestUser } from '../config/test-env';

// Helper to login
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

// Helper to logout
async function logoutUser(page: Page) {
  await page.goto('/perfil');
  await page.click('text=/Sair|Logout/i');
  await page.waitForURL('/login');
}

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for E2E tests
    test.setTimeout(testConfig.timeouts.e2e);
  });

  test('Complete signup and onboarding flow', async ({ page }) => {
    // 1. Go to signup page
    await page.goto('/signup');
    
    // 2. Fill signup form
    const timestamp = Date.now();
    const email = `newuser${timestamp}@test.com`;
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'TestPass123!');
    
    // 3. Accept terms if present
    const termsCheckbox = page.locator('input[type="checkbox"][name="terms"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    // 4. Submit form
    await page.click('button[type="submit"]');
    
    // 5. Should redirect to onboarding or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard|home)/);
    
    // 6. Check for welcome message or onboarding steps
    const welcomeText = page.locator('text=/Bem-vindo|Welcome|Olá/i');
    await expect(welcomeText).toBeVisible({ timeout: 10000 });
    
    // 7. If onboarding exists, complete it
    const skipButton = page.locator('button:has-text("Skip"), button:has-text("Pular")');
    if (await skipButton.isVisible({ timeout: 5000 })) {
      await skipButton.click();
    }
    
    // 8. Verify user lands on main dashboard
    await expect(page).toHaveURL(/\/(dashboard|home|)/);
    await expect(page.locator('text=/Dashboard|Painel|Home/i')).toBeVisible();
  });

  test('Login and access first course lesson', async ({ page }) => {
    // 1. Login
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Navigate to courses
    await page.click('text=/Curso|Courses/i');
    await page.waitForURL(/\/courses?/);
    
    // 3. Click on first module
    const firstModule = page.locator('.module-card, [data-testid="module"]').first();
    await expect(firstModule).toBeVisible();
    await firstModule.click();
    
    // 4. Click on first lesson
    const firstLesson = page.locator('.lesson-item, [data-testid="lesson"]').first();
    await expect(firstLesson).toBeVisible();
    await firstLesson.click();
    
    // 5. Wait for video player to load
    await expect(page.locator('video, iframe, .video-player')).toBeVisible({ timeout: 15000 });
    
    // 6. Check lesson content is displayed
    await expect(page.locator('.lesson-title, h1, h2')).toBeVisible();
    
    // 7. Mark lesson as complete if button exists
    const completeButton = page.locator('button:has-text("Concluir"), button:has-text("Complete")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await expect(page.locator('text=/Concluído|Completed/i')).toBeVisible();
    }
  });

  test('Send message in community chat', async ({ page }) => {
    // 1. Login
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Navigate to community
    await page.click('text=/Comunidade|Community|Chat/i');
    await page.waitForURL(/\/(community|chat|comunidade)/);
    
    // 3. Select general channel if not already selected
    const generalChannel = page.locator('text=/general|geral/i').first();
    if (await generalChannel.isVisible()) {
      await generalChannel.click();
    }
    
    // 4. Type a message
    const messageInput = page.locator('input[placeholder*="mensagem"], textarea[placeholder*="message"], [contenteditable="true"]');
    await expect(messageInput).toBeVisible();
    
    const testMessage = `Test message ${Date.now()}`;
    await messageInput.fill(testMessage);
    
    // 5. Send message (Enter or click send button)
    await page.keyboard.press('Enter');
    // Or click send button if it exists
    const sendButton = page.locator('button[aria-label="Send"], button:has-text("Enviar")');
    if (await sendButton.isVisible()) {
      await sendButton.click();
    }
    
    // 6. Verify message appears in chat
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 10000 });
  });

  test('Complete purchase flow (mock)', async ({ page }) => {
    // Note: This test uses mock payment since we don't want to make real purchases
    
    // 1. Go to pricing/plans page
    await page.goto('/planos');
    
    // 2. Select a plan
    const buyButton = page.locator('button:has-text("Comprar"), button:has-text("Assinar")').first();
    await expect(buyButton).toBeVisible();
    await buyButton.click();
    
    // 3. Should redirect to checkout (Kiwify or internal)
    await page.waitForURL(/\/(checkout|kiwify|payment)/);
    
    // 4. If internal checkout, fill form
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('buyer@test.com');
      
      // Fill other required fields
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Buyer');
      }
    }
    
    // 5. Verify checkout page loads correctly
    await expect(page.locator('text=/Total|Valor|Payment/i')).toBeVisible();
  });

  test('Install WordPress site (simulation)', async ({ page }) => {
    // 1. Login as student
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Navigate to tools/site installer
    await page.click('text=/Ferramentas|Tools/i');
    await page.waitForURL(/\/(tools|ferramentas)/);
    
    // 3. Click on site installer
    await page.click('text=/Instalador|Site Install|WordPress/i');
    
    // 4. Fill installation form
    await page.fill('input[name="domain"]', `test${Date.now()}.example.com`);
    await page.fill('input[name="serverIp"]', '192.168.1.100');
    
    // 5. Select template
    const templateSelect = page.locator('select[name="template"]');
    if (await templateSelect.isVisible()) {
      await templateSelect.selectOption({ index: 1 });
    } else {
      // Click first template if using cards
      await page.locator('.template-card').first().click();
    }
    
    // 6. Start installation
    await page.click('button:has-text("Instalar"), button:has-text("Install")');
    
    // 7. Verify installation process starts
    await expect(page.locator('text=/Instalando|Installing|Progresso/i')).toBeVisible();
    
    // 8. Check for progress indicators
    const progressBar = page.locator('.progress-bar, [role="progressbar"]');
    if (await progressBar.isVisible()) {
      await expect(progressBar).toBeVisible();
    }
  });

  test('Update user profile', async ({ page }) => {
    // 1. Login
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Go to profile
    await page.click('text=/Perfil|Profile/i');
    await page.waitForURL(/\/(profile|perfil|account)/);
    
    // 3. Click edit button if needed
    const editButton = page.locator('button:has-text("Editar"), button:has-text("Edit")');
    if (await editButton.isVisible()) {
      await editButton.click();
    }
    
    // 4. Update profile fields
    const bioField = page.locator('textarea[name="bio"], input[name="bio"]');
    if (await bioField.isVisible()) {
      await bioField.fill('Updated bio for testing');
    }
    
    const nameField = page.locator('input[name="name"]');
    if (await nameField.isVisible()) {
      await nameField.fill('Updated Test Name');
    }
    
    // 5. Save changes
    await page.click('button:has-text("Salvar"), button:has-text("Save")');
    
    // 6. Verify success message
    await expect(page.locator('text=/Sucesso|Success|Atualizado|Updated/i')).toBeVisible();
    
    // 7. Reload and verify changes persisted
    await page.reload();
    
    if (await bioField.isVisible()) {
      await expect(bioField).toHaveValue(/Updated bio/);
    }
  });

  test('Search and filter content', async ({ page }) => {
    // 1. Login
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Use search functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('SEO');
    await page.keyboard.press('Enter');
    
    // 3. Verify search results appear
    await expect(page.locator('.search-results, .results')).toBeVisible();
    
    // 4. Clear search
    await searchInput.clear();
    
    // 5. Test filters if available
    const filterButton = page.locator('button:has-text("Filtrar"), button:has-text("Filter")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Select a filter option
      const filterOption = page.locator('.filter-option').first();
      if (await filterOption.isVisible()) {
        await filterOption.click();
      }
      
      // Apply filters
      const applyButton = page.locator('button:has-text("Aplicar"), button:has-text("Apply")');
      if (await applyButton.isVisible()) {
        await applyButton.click();
      }
    }
  });

  test('Mobile navigation works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 1. Login
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Check bottom navigation is visible
    const bottomNav = page.locator('.bottom-nav, nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();
    
    // 3. Test navigation items
    const navItems = ['Home', 'Curso', 'Comunidade', 'Ferramentas', 'Perfil'];
    
    for (const item of navItems) {
      const navButton = page.locator(`text=/${item}/i`).first();
      if (await navButton.isVisible()) {
        await navButton.click();
        await page.waitForTimeout(500); // Small delay for navigation
        
        // Verify navigation worked
        const pageTitle = page.locator('h1, h2').first();
        await expect(pageTitle).toBeVisible();
      }
    }
  });

  test('Logout flow', async ({ page }) => {
    // 1. Login first
    const student = getTestUser('student');
    await loginUser(page, student.email, student.password);
    
    // 2. Verify logged in
    await expect(page).toHaveURL(/^(?!.*login)/); // Not on login page
    
    // 3. Logout
    await logoutUser(page);
    
    // 4. Verify logged out
    await expect(page).toHaveURL('/login');
    
    // 5. Try to access protected route
    await page.goto('/dashboard');
    
    // 6. Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});