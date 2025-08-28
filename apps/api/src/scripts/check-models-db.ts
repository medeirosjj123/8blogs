import mongoose from 'mongoose';
import { AiModel } from '../models/AiModel';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function checkModelsInDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    console.log('🔍 Checking AI Models directly in database...\n');
    
    // Get all models from DB
    const models = await AiModel.find({});
    
    console.log(`Found ${models.length} models in database:\n`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   ID: ${model._id}`);
      console.log(`   Provider: ${model.provider}`);
      console.log(`   Model: ${model.model || 'Not set'}`);
      console.log(`   Primary: ${model.isPrimary}`);
      console.log(`   Active: ${model.isActive}`);
      
      // Check API key status
      if (model.apiKey) {
        const keyPreview = model.apiKey.substring(0, 30);
        console.log(`   API Key exists: YES`);
        console.log(`   Key starts with: ${keyPreview}...`);
        
        if (model.apiKey.startsWith('encrypted:')) {
          console.log(`   🔐 Status: ENCRYPTED`);
          
          // Try to decrypt
          try {
            const decrypted = model.decryptApiKey();
            if (decrypted) {
              console.log(`   ✅ Decryption: SUCCESS`);
              console.log(`   Decrypted preview: ${decrypted.substring(0, 10)}...`);
            } else {
              console.log(`   ❌ Decryption: FAILED (returned null)`);
            }
          } catch (error: any) {
            console.log(`   ❌ Decryption: ERROR - ${error.message}`);
          }
        } else if (model.apiKey.startsWith('sk-')) {
          console.log(`   🔓 Status: PLAIN TEXT (needs encryption)`);
        } else {
          console.log(`   ❓ Status: UNKNOWN FORMAT`);
        }
      } else {
        console.log(`   API Key exists: NO`);
      }
      
      console.log('');
    });
    
    // Check environment variable
    console.log('🔍 Checking environment for OPENAI_API_KEY...');
    if (process.env.OPENAI_API_KEY) {
      console.log('✅ OPENAI_API_KEY found in environment');
      console.log(`   Starts with: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
    } else {
      console.log('❌ OPENAI_API_KEY not found in environment');
    }
    
    // Check encryption key
    console.log('\n🔍 Checking ENCRYPTION_KEY...');
    if (process.env.ENCRYPTION_KEY) {
      console.log('✅ ENCRYPTION_KEY found in environment');
      console.log(`   Length: ${process.env.ENCRYPTION_KEY.length} characters`);
    } else {
      console.log('❌ ENCRYPTION_KEY not found in environment');
      console.log('   This is required for API key encryption/decryption');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkModelsInDB();