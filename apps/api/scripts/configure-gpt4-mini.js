#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
  process.exit(1);
}

// Define ApiConfig schema
const apiConfigSchema = new mongoose.Schema({
  provider: String,
  name: String,
  description: String,
  settings: {
    apiKey: String,
    model: String,
    temperature: Number,
    maxTokens: Number,
    topP: Number,
    frequencyPenalty: Number,
    presencePenalty: Number,
    timeout: Number
  },
  pricing: {
    inputTokens: Number,
    outputTokens: Number,
    currency: String
  },
  isPrimary: Boolean,
  isFallback: Boolean,
  isActive: Boolean,
  usage: {
    tokensUsed: Number,
    requestCount: Number,
    errorCount: Number,
    lastUsed: Date,
    dailyStats: [{
      date: Date,
      requests: Number,
      tokens: Number,
      errors: Number,
      cost: Number
    }]
  },
  createdAt: Date,
  updatedAt: Date
});

const ApiConfig = mongoose.model('ApiConfig', apiConfigSchema);

async function configureGPT4Mini() {
  try {
    console.log('🚀 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Check if OpenAI configuration exists
    let openAIConfig = await ApiConfig.findOne({ provider: 'openai' });
    
    if (openAIConfig) {
      console.log('📋 Found existing OpenAI configuration');
      console.log(`   Current model: ${openAIConfig.settings.model}`);
      
      // Update to gpt-4o-mini
      openAIConfig.settings.model = 'gpt-5-mini';
      openAIConfig.settings.temperature = 0.7;
      openAIConfig.settings.maxTokens = 2000;
      
      // Update pricing for gpt-4o-mini
      openAIConfig.pricing = {
        inputTokens: 0.00015,  // $0.15 per 1M input tokens
        outputTokens: 0.0006,   // $0.60 per 1M output tokens
        currency: 'USD'
      };
      
      openAIConfig.isPrimary = true;
      openAIConfig.isActive = true;
      openAIConfig.updatedAt = new Date();
      
      await openAIConfig.save();
      console.log('✅ Updated OpenAI configuration to use gpt-4o-mini');
      
    } else {
      // Create new configuration
      console.log('⚠️  No OpenAI configuration found. Creating new one...');
      console.log('   Please set OPENAI_API_KEY in your .env file');
      
      const newConfig = new ApiConfig({
        provider: 'openai',
        name: 'OpenAI GPT-4o Mini',
        description: 'GPT-4o Mini for efficient content generation',
        settings: {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
          timeout: 60000
        },
        pricing: {
          inputTokens: 0.00015,  // $0.15 per 1M input tokens
          outputTokens: 0.0006,   // $0.60 per 1M output tokens
          currency: 'USD'
        },
        isPrimary: true,
        isFallback: false,
        isActive: true,
        usage: {
          tokensUsed: 0,
          requestCount: 0,
          errorCount: 0,
          dailyStats: []
        }
      });
      
      await newConfig.save();
      console.log('✅ Created new OpenAI configuration with gpt-4o-mini');
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('\n⚠️  WARNING: OPENAI_API_KEY not found in environment variables');
        console.log('   Please add it to your .env file to enable content generation');
      }
    }
    
    // Display current configuration
    console.log('\n📊 Current AI Service Configuration:');
    const configs = await ApiConfig.find({ isActive: true });
    
    for (const config of configs) {
      console.log(`\n${config.isPrimary ? '🎯 PRIMARY' : config.isFallback ? '🔄 FALLBACK' : '📌 ADDITIONAL'}:`);
      console.log(`   Provider: ${config.provider}`);
      console.log(`   Model: ${config.settings.model}`);
      console.log(`   Temperature: ${config.settings.temperature}`);
      console.log(`   Max Tokens: ${config.settings.maxTokens}`);
      console.log(`   API Key: ${config.settings.apiKey ? '✅ Configured' : '❌ Missing'}`);
      console.log(`   Pricing: $${config.pricing.inputTokens}/1K input, $${config.pricing.outputTokens}/1K output`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run configuration
configureGPT4Mini();