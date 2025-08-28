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

async function checkAndFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all configurations
    const configs = await ApiConfig.find();
    
    console.log('📋 Current API Configurations:');
    console.log('==============================\n');
    
    configs.forEach(config => {
      console.log(`Provider: ${config.provider}`);
      console.log(`  Name: ${config.name}`);
      console.log(`  Model: ${config.settings.model}`);
      console.log(`  Has API Key: ${config.settings.apiKey ? 'Yes' : 'No'}`);
      console.log(`  Is Active: ${config.isActive}`);
      console.log(`  Is Primary: ${config.isPrimary}`);
      console.log(`  Is Fallback: ${config.isFallback}`);
      console.log('---');
    });

    // Check if any config has an API key
    const configWithKey = configs.find(c => c.settings.apiKey && c.settings.apiKey !== '');
    
    if (configWithKey) {
      console.log(`\n✅ Found API key for ${configWithKey.provider}`);
      
      // Ensure it's set as primary and active
      if (!configWithKey.isActive || !configWithKey.isPrimary) {
        console.log('🔧 Fixing configuration...');
        
        // First, remove primary flag from all others
        await ApiConfig.updateMany(
          { _id: { $ne: configWithKey._id } },
          { isPrimary: false }
        );
        
        // Set this one as primary and active
        configWithKey.isActive = true;
        configWithKey.isPrimary = true;
        await configWithKey.save();
        
        console.log('✅ Configuration updated:');
        console.log(`  - ${configWithKey.provider} is now PRIMARY and ACTIVE`);
      } else {
        console.log('✅ Configuration is already PRIMARY and ACTIVE');
      }
      
      // Set other config as fallback if it exists
      const otherConfig = configs.find(c => c._id.toString() !== configWithKey._id.toString());
      if (otherConfig && !otherConfig.isFallback) {
        otherConfig.isFallback = true;
        await otherConfig.save();
        console.log(`  - ${otherConfig.provider} is set as FALLBACK`);
      }
      
    } else {
      console.log('\n⚠️ No API keys found in any configuration');
      console.log('\nTo add an API key:');
      console.log('1. Go to http://localhost:5173/admin/api-management');
      console.log('2. Click on the provider (OpenAI or Gemini)');
      console.log('3. Add your API key');
      console.log('4. Toggle "Active" and "Primary" switches');
      console.log('5. Click "Save Configuration"');
    }
    
    // If environment variables have API keys, update the database
    if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
      console.log('\n🔍 Found API keys in environment variables');
      
      if (process.env.OPENAI_API_KEY) {
        const openaiConfig = await ApiConfig.findOne({ provider: 'openai' });
        if (openaiConfig && !openaiConfig.settings.apiKey) {
          openaiConfig.settings.apiKey = process.env.OPENAI_API_KEY;
          openaiConfig.isActive = true;
          openaiConfig.isPrimary = true;
          await openaiConfig.save();
          console.log('✅ Added OpenAI API key from environment');
        }
      }
      
      if (process.env.GEMINI_API_KEY) {
        const geminiConfig = await ApiConfig.findOne({ provider: 'gemini' });
        if (geminiConfig && !geminiConfig.settings.apiKey) {
          geminiConfig.settings.apiKey = process.env.GEMINI_API_KEY;
          geminiConfig.isActive = true;
          geminiConfig.isFallback = true;
          await geminiConfig.save();
          console.log('✅ Added Gemini API key from environment');
        }
      }
    }
    
    console.log('\n✨ Configuration check complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndFix();