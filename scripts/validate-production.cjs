/**
 * Production Environment Validation Script
 * Checks if all required environment variables and services are properly configured
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

console.log('🔍 Validating Production Environment...\n');

// Required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'REDIS_URL',
  'JWT_SECRET',
  'MAGIC_LINK_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'KIWIFY_WEBHOOK_SECRET',
  'ELASTIC_EMAIL_API_KEY',
  'ELASTIC_EMAIL_FROM_EMAIL',
  'API_URL',
  'FRONTEND_URL',
  'NODE_ENV'
];

// Optional but recommended variables
const recommendedEnvVars = [
  'SENTRY_DSN',
  'CLOUDFLARE_API_TOKEN',
  'GOOGLE_CLIENT_ID',
  'B2_KEY_ID'
];

let hasErrors = false;
let hasWarnings = false;

function logError(message) {
  console.log(`❌ ERROR: ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.log(`⚠️  WARNING: ${message}`);
  hasWarnings = true;
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// Validate environment variables
console.log('📋 Checking Environment Variables...');
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    logError(`Missing required environment variable: ${varName}`);
  } else if (process.env[varName].includes('your_') || process.env[varName].includes('change-this')) {
    logError(`Environment variable ${varName} contains placeholder value`);
  } else {
    logSuccess(`${varName} is configured`);
  }
});

console.log('\n📋 Checking Optional Environment Variables...');
recommendedEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    logWarning(`Missing recommended environment variable: ${varName}`);
  } else if (process.env[varName].includes('your_') || process.env[varName].includes('change-this')) {
    logWarning(`Environment variable ${varName} contains placeholder value`);
  } else {
    logSuccess(`${varName} is configured`);
  }
});

// Validate specific configurations
console.log('\n🔒 Checking Security Configuration...');

// Check JWT secret strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
  logWarning('JWT_SECRET should be at least 64 characters long for security');
} else if (process.env.JWT_SECRET) {
  logSuccess('JWT_SECRET has adequate length');
}

// Check NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  logWarning(`NODE_ENV is set to '${process.env.NODE_ENV}', should be 'production' for production deployment`);
} else {
  logSuccess('NODE_ENV is set to production');
}

// Check URLs
if (process.env.API_URL && process.env.API_URL.includes('localhost')) {
  logWarning('API_URL contains localhost - should be production domain');
}

if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('localhost')) {
  logWarning('FRONTEND_URL contains localhost - should be production domain');
}

// Test database connection
async function testDatabaseConnection() {
  console.log('\n🗄️  Testing Database Connection...');
  
  if (!process.env.MONGODB_URI) {
    logError('MONGODB_URI not configured - skipping database test');
    return;
  }
  
  let client;
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    await client.db().admin().ping();
    logSuccess('MongoDB connection successful');
    
    // Check if indexes exist
    const db = client.db();
    const collections = await db.listCollections().toArray();
    logInfo(`Found ${collections.length} collections in database`);
    
    // Check if admin user exists
    const users = db.collection('users');
    const adminCount = await users.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      logWarning('No admin users found - run setup-database.js to create initial admin');
    } else {
      logSuccess(`Found ${adminCount} admin user(s)`);
    }
    
  } catch (error) {
    logError(`MongoDB connection failed: ${error.message}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Test Redis connection (basic check)
async function testRedisConnection() {
  console.log('\n🔴 Testing Redis Connection...');
  
  if (!process.env.REDIS_URL) {
    logError('REDIS_URL not configured - skipping Redis test');
    return;
  }
  
  // Basic URL validation
  if (!process.env.REDIS_URL.startsWith('redis://')) {
    logError('REDIS_URL should start with redis://');
    return;
  }
  
  logSuccess('Redis URL format appears valid');
  logInfo('Note: Full Redis connection test requires Redis client - test manually with: redis-cli ping');
}

// Test email configuration
function testEmailConfiguration() {
  console.log('\n📧 Checking Email Configuration...');
  
  const hasElasticEmail = process.env.ELASTIC_EMAIL_API_KEY && process.env.ELASTIC_EMAIL_FROM_EMAIL;
  const hasBrevo = process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL;
  
  if (!hasElasticEmail && !hasBrevo) {
    logError('No email service configured - need either ElasticEmail or Brevo');
  } else if (hasElasticEmail) {
    logSuccess('ElasticEmail configuration found');
  } else if (hasBrevo) {
    logSuccess('Brevo configuration found');
  }
  
  // Check email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fromEmail = process.env.ELASTIC_EMAIL_FROM_EMAIL || process.env.BREVO_FROM_EMAIL;
  if (fromEmail && !emailRegex.test(fromEmail)) {
    logError('FROM_EMAIL is not a valid email address');
  }
}

// Check storage configuration
function testStorageConfiguration() {
  console.log('\n💾 Checking Storage Configuration...');
  
  if (!process.env.B2_KEY_ID || !process.env.B2_APPLICATION_KEY) {
    logWarning('Backblaze B2 storage not configured - file uploads will not work');
  } else {
    logSuccess('Backblaze B2 storage configured');
  }
}

// Check Cloudflare configuration
function testCloudflareConfiguration() {
  console.log('\n☁️  Checking Cloudflare Configuration...');
  
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    logWarning('Cloudflare API token not configured - CDN features may not work');
  } else {
    logSuccess('Cloudflare API token configured');
  }
}

// Main validation function
async function runValidation() {
  try {
    await testDatabaseConnection();
    await testRedisConnection();
    testEmailConfiguration();
    testStorageConfiguration();
    testCloudflareConfiguration();
    
    console.log('\n📊 Validation Summary:');
    
    if (hasErrors) {
      console.log('❌ CRITICAL ERRORS FOUND - Deployment will likely fail');
      console.log('   Please fix all errors before deploying to production');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('⚠️  WARNINGS FOUND - Some features may not work correctly');
      console.log('   Consider addressing warnings before production deployment');
    } else {
      console.log('✅ ALL CHECKS PASSED - Ready for production deployment!');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Run: npm run build:all');
    console.log('2. Run: node scripts/setup-database.js');
    console.log('3. Deploy to production server');
    console.log('4. Test critical user flows');
    
  } catch (error) {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  }
}

// Run validation
runValidation();