#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI environment variable is not set. Please configure MongoDB Atlas connection.');
  process.exit(1);
}

async function initAiModels() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import the model
    const { AiModel } = require('../dist/models/AiModel');

    // Check if models already exist
    const existingModels = await AiModel.find();
    
    if (existingModels.length > 0) {
      console.log(`ℹ️  ${existingModels.length} AI models already exist`);
      console.log('\nExisting models:');
      existingModels.forEach(model => {
        console.log(`  - ${model.name} (${model.provider}/${model.modelId}) - ${model.isPrimary ? '⭐ Primary' : model.isFallback ? '🛡️ Fallback' : ''}`);
      });
      
      const response = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        readline.question('\nDo you want to add default models? (y/n): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase());
        });
      });
      
      if (response !== 'y' && response !== 'yes') {
        console.log('Skipping default models creation.');
        process.exit(0);
      }
    }

    // Default models to create
    const defaultModels = [
      {
        name: 'GPT-4o Mini',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        inputCostPer1k: 0.00015,
        outputCostPer1k: 0.0006,
        maxTokens: 2000,
        temperature: 0.7,
        description: 'Fast and efficient model, ideal for most content generation',
        isActive: true,
        isPrimary: true,
        isFallback: false
      },
      {
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        inputCostPer1k: 0.0005,
        outputCostPer1k: 0.0015,
        maxTokens: 2000,
        temperature: 0.7,
        description: 'Very fast and cheap, good for simple tasks',
        isActive: true,
        isPrimary: false,
        isFallback: true
      },
      {
        name: 'GPT-4o',
        provider: 'openai',
        modelId: 'gpt-4o',
        inputCostPer1k: 0.005,
        outputCostPer1k: 0.015,
        maxTokens: 2000,
        temperature: 0.7,
        description: 'Most capable OpenAI model, best quality',
        isActive: false,
        isPrimary: false,
        isFallback: false
      },
      {
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        inputCostPer1k: 0.000075,
        outputCostPer1k: 0.0003,
        maxTokens: 2000,
        temperature: 0.7,
        description: 'Google\'s fast and efficient model',
        isActive: false,
        isPrimary: false,
        isFallback: false
      },
      {
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        modelId: 'claude-3-haiku-20240307',
        inputCostPer1k: 0.00025,
        outputCostPer1k: 0.00125,
        maxTokens: 2000,
        temperature: 0.7,
        description: 'Fast and affordable Claude model',
        isActive: false,
        isPrimary: false,
        isFallback: false
      }
    ];

    console.log('\n📝 Creating default AI models...');
    
    for (const modelData of defaultModels) {
      const existingModel = await AiModel.findOne({ 
        provider: modelData.provider, 
        modelId: modelData.modelId 
      });
      
      if (!existingModel) {
        const model = await AiModel.create(modelData);
        console.log(`✅ Created: ${model.name} (${model.provider}/${model.modelId}) ${model.isPrimary ? '- PRIMARY' : model.isFallback ? '- FALLBACK' : ''}`);
      } else {
        console.log(`⏭️  Skipped: ${modelData.name} (already exists)`);
      }
    }

    console.log('\n✅ AI models initialization complete!');
    console.log('You can now manage AI models from the admin panel: /admin/ai-models');
    console.log('\n📊 Summary:');
    
    const finalModels = await AiModel.find();
    const primaryModel = finalModels.find(m => m.isPrimary);
    const fallbackModel = finalModels.find(m => m.isFallback);
    
    console.log(`  Total models: ${finalModels.length}`);
    console.log(`  Active models: ${finalModels.filter(m => m.isActive).length}`);
    if (primaryModel) {
      console.log(`  ⭐ Primary: ${primaryModel.name} (${primaryModel.provider}/${primaryModel.modelId})`);
    }
    if (fallbackModel) {
      console.log(`  🛡️ Fallback: ${fallbackModel.name} (${fallbackModel.provider}/${fallbackModel.modelId})`);
    }
    
  } catch (error) {
    console.error('❌ Error initializing AI models:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the initialization
initAiModels();