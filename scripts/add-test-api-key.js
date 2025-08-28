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

async function addTestKey() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Add a test key for testing (using a dummy key)
    const testApiKey = 'sk-test123456789abcdef'; // This is just for testing the system
    
    console.log('🔑 Adding test API key to OpenAI configuration...');
    
    const openaiConfig = await ApiConfig.findOne({ provider: 'openai' });
    if (openaiConfig) {
      openaiConfig.settings.apiKey = testApiKey;
      openaiConfig.isActive = true;
      openaiConfig.isPrimary = true;
      await openaiConfig.save();
      
      console.log('✅ Test API key added and OpenAI config activated');
      console.log('  - Provider: openai');
      console.log('  - Is Active: true');
      console.log('  - Is Primary: true');
      console.log('  - API Key: sk-test123456789abcdef');
      
      // Make sure other configs are not primary
      await ApiConfig.updateMany(
        { provider: { $ne: 'openai' } },
        { isPrimary: false }
      );
      
      console.log('\n📋 Current configurations:');
      const configs = await ApiConfig.find();
      configs.forEach(config => {
        console.log(`- ${config.provider}: Active=${config.isActive}, Primary=${config.isPrimary}, HasKey=${!!config.settings.apiKey}`);
      });
      
      console.log('\n✨ Now try the review generator!');
      console.log('   Go to: http://localhost:5173/ferramentas/gerador-reviews');
      
    } else {
      console.log('❌ OpenAI configuration not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addTestKey();