/**
 * Test Setup and Teardown Utilities
 * Manages database connections and test data lifecycle
 */

import mongoose from 'mongoose';
import { testConfig } from '../config/test-env';

// Store the connection for cleanup
let connection: typeof mongoose | null = null;

/**
 * Connect to test database
 * Creates a fresh database connection for tests
 */
export async function connectTestDB(): Promise<void> {
  try {
    // Disconnect if already connected
    if (connection) {
      await disconnectTestDB();
    }

    // Connect to test database
    connection = await mongoose.connect(testConfig.database.uri);
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * Clear all collections in test database
 * Useful for resetting state between test suites
 */
export async function clearTestDB(): Promise<void> {
  if (!connection) {
    throw new Error('No database connection');
  }

  const collections = await connection.connection.db.collections();
  
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  
  console.log('🧹 Cleared test database');
}

/**
 * Drop entire test database
 * Use with caution - removes everything
 */
export async function dropTestDB(): Promise<void> {
  if (!connection) {
    throw new Error('No database connection');
  }

  await connection.connection.db.dropDatabase();
  console.log('💥 Dropped test database');
}

/**
 * Disconnect from test database
 */
export async function disconnectTestDB(): Promise<void> {
  if (connection) {
    await connection.disconnect();
    connection = null;
    console.log('👋 Disconnected from test database');
  }
}

/**
 * Seed initial test data
 * Creates basic data needed for most tests
 */
export async function seedTestData(): Promise<void> {
  // Import models (adjust paths as needed)
  const User = connection?.models.User || require('../../apps/api/src/models/User').User;
  const Channel = connection?.models.Channel || require('../../apps/api/src/models/Channel').Channel;
  const Module = connection?.models.Module || require('../../apps/api/src/models/Module').Module;

  // Create test users
  const adminUser = await User.create({
    email: testConfig.testUsers.admin.email,
    password: testConfig.testUsers.admin.password,
    name: testConfig.testUsers.admin.name,
    role: testConfig.testUsers.admin.role,
    isEmailVerified: true,
  });

  const studentUser = await User.create({
    email: testConfig.testUsers.student.email,
    password: testConfig.testUsers.student.password,
    name: testConfig.testUsers.student.name,
    role: testConfig.testUsers.student.role,
    isEmailVerified: true,
  });

  // Create default channels
  await Channel.create([
    {
      name: 'general',
      description: 'General discussion',
      isPublic: true,
      createdBy: adminUser._id,
    },
    {
      name: 'help',
      description: 'Get help with your questions',
      isPublic: true,
      createdBy: adminUser._id,
    },
  ]);

  // Create sample module
  await Module.create({
    title: 'Introduction to SEO',
    description: 'Learn the basics of SEO',
    order: 1,
    isPublished: true,
  });

  console.log('🌱 Seeded test data');
}

/**
 * Setup function for integration tests
 * Call this in beforeAll()
 */
export async function setupIntegrationTest(): Promise<void> {
  await connectTestDB();
  await clearTestDB();
  await seedTestData();
}

/**
 * Cleanup function for integration tests
 * Call this in afterAll()
 */
export async function cleanupIntegrationTest(): Promise<void> {
  await clearTestDB();
  await disconnectTestDB();
}

/**
 * Reset database between tests
 * Call this in beforeEach() if needed
 */
export async function resetTestDB(): Promise<void> {
  await clearTestDB();
  await seedTestData();
}

/**
 * Helper to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to retry operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxAttempts - 1) {
        await waitFor(delay);
      }
    }
  }
  
  throw lastError;
}

// Additional helper functions for comprehensive testing

/**
 * Connect to database for integration tests
 */
export async function connectDatabase(): Promise<void> {
  return connectTestDB();
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  return disconnectTestDB();
}

/**
 * Create test admin user
 */
export async function createTestAdmin() {
  const User = connection?.models.User || require('../../apps/api/src/models/User').User;
  const { hashPassword } = require('../../apps/api/src/utils/auth');
  
  const hashedPassword = await hashPassword('AdminPassword123!');
  
  const admin = new User({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'admin',
    emailVerified: true
  });
  
  return await admin.save();
}

/**
 * Create test regular user
 */
export async function createTestUser() {
  const User = connection?.models.User || require('../../apps/api/src/models/User').User;
  const { hashPassword } = require('../../apps/api/src/utils/auth');
  
  const hashedPassword = await hashPassword('TestPassword123!');
  
  const user = new User({
    name: 'Test User',
    email: 'user@test.com',
    password: hashedPassword,
    role: 'aluno',
    emailVerified: true
  });
  
  return await user.save();
}

/**
 * Create test membership for user
 */
export async function createTestMembership(userId: string, plan: string = 'basic') {
  const Membership = connection?.models.Membership || require('../../apps/api/src/models/Membership').Membership;
  
  const membership = new Membership({
    userId,
    plan,
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    kiwifyOrderId: `test_order_${Date.now()}`,
    paymentMethod: 'credit_card'
  });
  
  return await membership.save();
}

/**
 * Generate random test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Create test webhook payload
 */
export function createTestWebhookPayload(overrides: any = {}) {
  return {
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
      ...overrides
    }
  };
}

/**
 * Generate webhook signature
 */
export function generateWebhookSignature(payload: any, secret: string) {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}