import mongoose from 'mongoose';
import { AiModel } from '../models/AiModel';
import { encrypt, decrypt, isEncrypted, getEncryptionKey } from '../utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function fixApiKeyEncryption() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('❌ OPENAI_API_KEY environment variable is required');
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('❌ ENCRYPTION_KEY environment variable is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const apiKey = process.env.OPENAI_API_KEY;
    const encryptionKey = getEncryptionKey();
    
    console.log('🔑 Testing encryption/decryption...');
    console.log(`   Original API key starts with: ${apiKey.substring(0, 10)}...`);
    console.log(`   Encryption key length: ${encryptionKey.length}`);
    
    // Test encryption
    const encrypted = encrypt(apiKey, encryptionKey);
    console.log(`   Encrypted: ${encrypted.substring(0, 30)}...`);
    console.log(`   Is encrypted format: ${isEncrypted(encrypted)}`);
    
    // Test decryption
    const decrypted = decrypt(encrypted, encryptionKey);
    console.log(`   Decrypted starts with: ${decrypted.substring(0, 10)}...`);
    console.log(`   Decryption successful: ${decrypted === apiKey ? '✅' : '❌'}`);
    
    console.log('\n🔧 Updating models with properly encrypted API key...\n');
    
    // Update all models
    const models = await AiModel.find({});
    
    for (const model of models) {
      console.log(`Updating ${model.name}...`);
      
      // Directly set the encrypted API key
      await AiModel.updateOne(
        { _id: model._id },
        { 
          $set: { 
            apiKey: encrypted,
            model: 'gpt-4o-mini'
          }
        }
      );
      
      console.log(`   ✅ Updated with encrypted API key`);
    }
    
    console.log('\n🔍 Verifying updates...\n');
    
    // Verify the updates
    const updatedModels = await AiModel.find({});
    
    for (const model of updatedModels) {
      console.log(`${model.name}:`);
      console.log(`   Has API key: ${model.apiKey ? 'YES' : 'NO'}`);
      
      if (model.apiKey) {
        console.log(`   Is encrypted: ${isEncrypted(model.apiKey) ? 'YES' : 'NO'}`);
        
        try {
          const decryptedKey = model.decryptApiKey();
          if (decryptedKey) {
            console.log(`   Decryption works: ✅`);
            console.log(`   Decrypted starts with: ${decryptedKey.substring(0, 10)}...`);
          } else {
            console.log(`   Decryption works: ❌ (returned null)`);
          }
        } catch (error: any) {
          console.log(`   Decryption works: ❌ (${error.message})`);
        }
      }
      
      console.log(`   Model ID: ${model.model}`);
      console.log(`   Is Primary: ${model.isPrimary}`);
      console.log('');
    }
    
    console.log('✨ API keys fixed and encrypted successfully!');
    console.log('   Try generating content now.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

fixApiKeyEncryption();