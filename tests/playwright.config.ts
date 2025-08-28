/**
 * Playwright Configuration for E2E Tests
 * Configured specifically for Tatame platform testing
 */

import { defineConfig, devices } from '@playwright/test';
import { testConfig } from './config/test-env';

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Test output
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL from test config
    baseURL: testConfig.frontend.baseUrl,
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on first retry
    video: 'retain-on-failure',
    
    // Test timeout
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: [
    {
      command: 'pnpm dev:web',
      url: testConfig.frontend.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'pnpm dev:api',
      url: testConfig.api.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  ],
});