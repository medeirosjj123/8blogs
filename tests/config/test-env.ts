/**
 * Test Environment Configuration
 * Centralized configuration for all test suites
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export const testConfig = {
  // API Configuration
  api: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:3001',
    timeout: 30000,
    webhookSecret: process.env.TEST_KIWIFY_WEBHOOK_SECRET || 'test_webhook_secret_for_development_123',
    adminToken: process.env.TEST_ADMIN_TOKEN || '', // Set by tests
  },

  // Frontend Configuration
  frontend: {
    baseUrl: process.env.TEST_FRONTEND_URL || 'http://localhost:5173',
  },

  // Database Configuration
  database: {
    uri: (() => {
      const uri = process.env.TEST_MONGODB_URI;
      if (!uri) {
        console.error('❌ TEST_MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
        process.exit(1);
      }
      return uri;
    })(),
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // Redis Configuration
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
    db: 1, // Use different DB for tests
  },

  // Test User Credentials
  testUsers: {
    admin: {
      email: 'admin@test.tatame.com',
      password: 'AdminPass123!',
      name: 'Test Admin',
      role: 'admin',
    },
    student: {
      email: 'student@test.tatame.com',
      password: 'StudentPass123!',
      name: 'Test Student',
      role: 'aluno',
    },
    mentor: {
      email: 'mentor@test.tatame.com',
      password: 'MentorPass123!',
      name: 'Test Mentor',
      role: 'mentor',
    },
  },

  // Test Timeouts
  timeouts: {
    unit: 5000,
    integration: 10000,
    e2e: 30000,
  },

  // Feature Flags for Tests
  features: {
    testPayments: false, // Don't test real payment providers
    testEmails: false, // Don't send real emails
    testSMS: false, // Don't send real SMS
  },
};

// Helper to get test user by role
export function getTestUser(role: 'admin' | 'student' | 'mentor') {
  return testConfig.testUsers[role];
}

// Helper to build API URL
export function apiUrl(path: string): string {
  return `${testConfig.api.baseUrl}${path}`;
}

// Helper to build Frontend URL
export function frontendUrl(path: string): string {
  return `${testConfig.frontend.baseUrl}${path}`;
}