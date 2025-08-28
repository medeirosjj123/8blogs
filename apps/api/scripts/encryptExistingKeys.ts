#!/usr/bin/env node

/**
 * Migration script to encrypt existing plain text API keys in the database
 * 
 * Usage: npx tsx scripts/encryptExistingKeys.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { encrypt, isEncrypted, getEncryptionKey, maskApiKey } from '../src/utils/encryption';

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Define the schema inline to avoid import issues
const aiModelSchema = new mongoose.Schema({
  name: String,
  provider: String,
  modelId: String,
  apiKey: {
    type: String,
    select: false
  },
  inputCostPer1k: Number,
  outputCostPer1k: Number,
  maxTokens: Number,
  temperature: Number,
  isActive: Boolean,
  isPrimary: Boolean,
  isFallback: Boolean,
  description: String
}, {
  timestamps: true
});

const AiModel = mongoose.model('AiModel', aiModelSchema);

async function migrateApiKeys() {
  console.log('🔐 Starting API key encryption migration...\n');

  try {
    // Get encryption key
    const encryptionKey = getEncryptionKey();
    console.log('✅ Encryption key loaded\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all models with API keys
    const models = await AiModel.find({ apiKey: { $exists: true, $ne: null } }).select('+apiKey');
    console.log(`📊 Found ${models.length} models with API keys\n`);

    if (models.length === 0) {
      console.log('ℹ️ No models with API keys found. Nothing to migrate.');
      await mongoose.disconnect();
      return;
    }

    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;

    // Process each model
    for (const model of models) {
      try {
        if (!model.apiKey) {
          continue;
        }

        // Check if already encrypted
        if (isEncrypted(model.apiKey)) {
          console.log(`⏭️ Model "${model.name}" already has encrypted API key`);
          alreadyEncryptedCount++;
          continue;
        }

        // Store original for display
        const maskedOriginal = maskApiKey(model.apiKey);

        // Encrypt the API key
        const encryptedKey = encrypt(model.apiKey, encryptionKey);

        // Update the model
        await AiModel.updateOne(
          { _id: model._id },
          { $set: { apiKey: encryptedKey } }
        );

        console.log(`✅ Encrypted API key for model "${model.name}" (${model.provider})`);
        console.log(`   Original (masked): ${maskedOriginal}`);
        
        encryptedCount++;
      } catch (error) {
        console.error(`❌ Failed to encrypt key for model "${model.name}":`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully encrypted: ${encryptedCount}`);
    console.log(`   ⏭️ Already encrypted: ${alreadyEncryptedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    if (encryptedCount > 0) {
      console.log('🎉 Migration completed successfully!');
      console.log('   Your API keys are now encrypted at rest.');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateApiKeys().catch(console.error);