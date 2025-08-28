/**
 * Test environment setup
 * Load environment variables for tests
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test environment variables
dotenv.config({ 
  path: path.resolve(__dirname, '../.env.test'),
  override: true 
});

// Ensure NODE_ENV is test
process.env.NODE_ENV = 'test';

console.log('✅ Test environment loaded');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('KIWIFY_WEBHOOK_SECRET set:', !!process.env.KIWIFY_WEBHOOK_SECRET);