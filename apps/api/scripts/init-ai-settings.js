#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI environment variable is not set. Please configure MongoDB Atlas connection.');
  process.exit(1);
}

async function initAiSettings() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import the model
    const { AiSettings } = require('../dist/models/AiSettings');

    // Check if settings already exist
    const existingSettings = await AiSettings.findOne();
    
    if (existingSettings) {
      console.log('ℹ️  AI settings already exist');
      console.log('Current settings:', {
        provider: existingSettings.provider,
        model: existingSettings.model,
        isActive: existingSettings.isActive
      });
    } else {
      // Create default settings
      const defaultSettings = await AiSettings.create({
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        isActive: true,
        description: 'Default OpenAI GPT-4o Mini configuration - Fast and efficient for content generation',
        costPerInputToken: 0.00015,
        costPerOutputToken: 0.0006
      });

      console.log('✅ Default AI settings created:', {
        provider: defaultSettings.provider,
        model: defaultSettings.model,
        description: defaultSettings.description
      });
    }

    console.log('\n📊 Available models by provider:');
    console.log('\nOpenAI:');
    console.log('  - gpt-4o-mini (Fast and efficient)');
    console.log('  - gpt-4o (Most capable)');
    console.log('  - gpt-4-turbo (High quality with vision)');
    console.log('  - gpt-3.5-turbo (Fast and cheap)');
    
    console.log('\nGemini:');
    console.log('  - gemini-1.5-pro (Most capable)');
    console.log('  - gemini-1.5-flash (Fast and efficient)');
    console.log('  - gemini-pro (Balanced)');
    
    console.log('\nAnthropic:');
    console.log('  - claude-3-opus (Most intelligent)');
    console.log('  - claude-3-sonnet (Balanced)');
    console.log('  - claude-3-haiku (Fast and affordable)');

    console.log('\n✅ AI settings initialization complete!');
    console.log('You can now configure the AI model from the admin panel: /admin/ai-settings');
    
  } catch (error) {
    console.error('❌ Error initializing AI settings:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the initialization
initAiSettings();