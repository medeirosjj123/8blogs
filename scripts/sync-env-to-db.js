const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Simple schema
const apiConfigSchema = new mongoose.Schema({
  provider: String,
  name: String,
  settings: {
    apiKey: String,
    model: String,
    maxTokens: Number,
    temperature: Number
  },
  pricing: {
    inputCost: Number,
    outputCost: Number
  },
  isActive: Boolean,
  isPrimary: Boolean,
  isFallback: Boolean,
  order: Number,
  healthCheck: {
    status: String
  },
  limits: {
    requestsPerMinute: Number,
    tokensPerDay: Number,
    currentUsage: {
      requests: Number,
      tokens: Number,
      resetAt: Date
    }
  }
}, { timestamps: true });

const ApiConfig = mongoose.model('ApiConfig', apiConfigSchema);

async function syncEnvToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check both possible environment variable names
    const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;

    console.log('🔍 Checking environment variables:');
    console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Not found'}`);
    console.log(`  OPENAI_KEY: ${process.env.OPENAI_KEY ? '✅ Found' : '❌ Not found'}`);
    console.log(`  GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Found' : '❌ Not found'}`);
    console.log(`  GEMINI_KEY: ${process.env.GEMINI_KEY ? '✅ Found' : '❌ Not found'}\n`);

    if (openaiKey) {
      console.log('🔑 Updating OpenAI configuration in database...');
      
      const openaiConfig = await ApiConfig.findOne({ provider: 'openai' });
      if (openaiConfig) {
        openaiConfig.settings.apiKey = openaiKey;
        openaiConfig.isActive = true;
        openaiConfig.isPrimary = true;
        await openaiConfig.save();
        
        // Make sure other configs are not primary
        await ApiConfig.updateMany(
          { provider: { $ne: 'openai' } },
          { isPrimary: false }
        );
        
        console.log('✅ OpenAI configuration updated:');
        console.log(`  - API Key: ${openaiKey.substring(0, 7)}...${openaiKey.slice(-4)}`);
        console.log('  - Is Active: true');
        console.log('  - Is Primary: true');
      }
    }

    if (geminiKey) {
      console.log('🔑 Updating Gemini configuration in database...');
      
      const geminiConfig = await ApiConfig.findOne({ provider: 'gemini' });
      if (geminiConfig) {
        geminiConfig.settings.apiKey = geminiKey;
        geminiConfig.isActive = true;
        
        // If no OpenAI key, make Gemini primary
        if (!openaiKey) {
          geminiConfig.isPrimary = true;
          await ApiConfig.updateMany(
            { provider: { $ne: 'gemini' } },
            { isPrimary: false }
          );
        } else {
          geminiConfig.isFallback = true;
        }
        
        await geminiConfig.save();
        
        console.log('✅ Gemini configuration updated:');
        console.log(`  - API Key: ${geminiKey.substring(0, 7)}...${geminiKey.slice(-4)}`);
        console.log('  - Is Active: true');
        console.log(`  - Is Primary: ${!openaiKey}`);
        console.log(`  - Is Fallback: ${!!openaiKey}`);
      }
    }

    if (!openaiKey && !geminiKey) {
      console.log('⚠️ No API keys found in environment variables');
      console.log('\nChecked for:');
      console.log('  - OPENAI_API_KEY');
      console.log('  - OPENAI_KEY');
      console.log('  - GEMINI_API_KEY');
      console.log('  - GEMINI_KEY');
    }

    // Show final status
    console.log('\n📋 Final database configurations:');
    const configs = await ApiConfig.find();
    configs.forEach(config => {
      const hasKey = config.settings.apiKey && !config.settings.apiKey.startsWith('sk-test');
      const keyPreview = config.settings.apiKey ? 
        `${config.settings.apiKey.substring(0, 7)}...${config.settings.apiKey.slice(-4)}` : 
        'No key';
      
      console.log(`- ${config.provider}:`);
      console.log(`    Active: ${config.isActive}`);
      console.log(`    Primary: ${config.isPrimary}`);
      console.log(`    Fallback: ${config.isFallback}`);
      console.log(`    Key: ${keyPreview}`);
      console.log(`    Has real key: ${hasKey}`);
    });

    if (openaiKey || geminiKey) {
      console.log('\n🚀 API key updated! Now test the review generator:');
      console.log('   http://localhost:5173/ferramentas/gerador-reviews');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

syncEnvToDatabase();