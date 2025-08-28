import mongoose from 'mongoose';
import { AiModel } from '../models/AiModel';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function addApiKey() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('❌ OPENAI_API_KEY environment variable is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    console.log('🔑 Adding OpenAI API key to models...\n');
    
    // Find the primary model
    const primaryModel = await AiModel.findOne({ isPrimary: true });
    
    if (primaryModel) {
      console.log(`Found primary model: ${primaryModel.name}`);
      
      // Update with the API key (it will be encrypted automatically by the pre-save hook)
      primaryModel.apiKey = process.env.OPENAI_API_KEY;
      primaryModel.model = 'gpt-4o-mini'; // Set the correct model name
      
      await primaryModel.save();
      
      console.log('✅ API key added to primary model');
      console.log(`   Model: ${primaryModel.name}`);
      console.log(`   Provider: ${primaryModel.provider}`);
      console.log(`   Model ID: ${primaryModel.model}`);
      
      // Verify it was encrypted
      const updated = await AiModel.findById(primaryModel._id);
      if (updated && updated.apiKey) {
        if (updated.apiKey.startsWith('encrypted:')) {
          console.log('   🔐 API key was encrypted successfully');
          
          // Test decryption
          try {
            const decrypted = updated.decryptApiKey();
            if (decrypted && decrypted.startsWith('sk-')) {
              console.log('   ✅ Decryption test: SUCCESS');
            } else {
              console.log('   ❌ Decryption test: FAILED');
            }
          } catch (error: any) {
            console.log(`   ❌ Decryption error: ${error.message}`);
          }
        } else {
          console.log('   ⚠️  API key was not encrypted (check encryption setup)');
        }
      }
    } else {
      console.log('❌ No primary model found');
      
      // List all models
      const allModels = await AiModel.find({});
      if (allModels.length > 0) {
        console.log('\nAvailable models:');
        allModels.forEach(m => {
          console.log(`  - ${m.name} (ID: ${m._id})`);
        });
        
        // Set the first one as primary and add API key
        const firstModel = allModels[0];
        console.log(`\n🔧 Setting ${firstModel.name} as primary...`);
        
        firstModel.isPrimary = true;
        firstModel.apiKey = process.env.OPENAI_API_KEY;
        firstModel.model = 'gpt-4o-mini';
        
        await firstModel.save();
        console.log('✅ Done! API key added and model set as primary');
      } else {
        console.log('❌ No models found in database');
      }
    }
    
    // Also update the GPT 5 Nano model if it exists (as backup)
    const gpt5Model = await AiModel.findOne({ name: /GPT 5 Nano/i });
    if (gpt5Model && !gpt5Model.apiKey) {
      console.log('\n🔧 Also adding API key to GPT 5 Nano as backup...');
      gpt5Model.apiKey = process.env.OPENAI_API_KEY;
      gpt5Model.model = 'gpt-4o-mini'; // Use the same model
      await gpt5Model.save();
      console.log('✅ Backup model configured');
    }
    
    console.log('\n✨ API keys configured successfully!');
    console.log('   You can now generate content.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

addApiKey();