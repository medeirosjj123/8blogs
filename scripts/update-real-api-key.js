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

async function updateApiKey() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if API key is in environment
    if (process.env.OPENAI_API_KEY) {
      console.log('🔑 Found OpenAI API key in environment variables');
      
      const openaiConfig = await ApiConfig.findOne({ provider: 'openai' });
      if (openaiConfig) {
        openaiConfig.settings.apiKey = process.env.OPENAI_API_KEY;
        openaiConfig.isActive = true;
        openaiConfig.isPrimary = true;
        await openaiConfig.save();
        
        console.log('✅ Updated OpenAI configuration with real API key');
        console.log('  - Provider: openai');
        console.log('  - Is Active: true');
        console.log('  - Is Primary: true');
        console.log(`  - API Key: ${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}`);
      }
    } else if (process.env.GEMINI_API_KEY) {
      console.log('🔑 Found Gemini API key in environment variables');
      
      const geminiConfig = await ApiConfig.findOne({ provider: 'gemini' });
      if (geminiConfig) {
        geminiConfig.settings.apiKey = process.env.GEMINI_API_KEY;
        geminiConfig.isActive = true;
        geminiConfig.isPrimary = true;
        await geminiConfig.save();
        
        // Make OpenAI fallback
        await ApiConfig.updateOne(
          { provider: 'openai' },
          { isPrimary: false, isFallback: true }
        );
        
        console.log('✅ Updated Gemini configuration with real API key');
        console.log('  - Provider: gemini');
        console.log('  - Is Active: true');
        console.log('  - Is Primary: true');
        console.log(`  - API Key: ${process.env.GEMINI_API_KEY.substring(0, 7)}...${process.env.GEMINI_API_KEY.slice(-4)}`);
      }
    } else {
      console.log('⚠️ No API keys found in environment variables');
      console.log('\nTo add your API key:');
      console.log('1. Edit the .env file and add:');
      console.log('   OPENAI_API_KEY=sk-your-real-key-here');
      console.log('   OR');
      console.log('   GEMINI_API_KEY=your-gemini-key-here');
      console.log('2. Run this script again');
      console.log('3. OR use the admin panel at http://localhost:5173/admin/api-management');
    }
    
    // Show current status
    console.log('\n📋 Current configurations:');
    const configs = await ApiConfig.find();
    configs.forEach(config => {
      const hasKey = config.settings.apiKey && !config.settings.apiKey.startsWith('sk-test');
      console.log(`- ${config.provider}: Active=${config.isActive}, Primary=${config.isPrimary}, HasRealKey=${hasKey}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateApiKey();