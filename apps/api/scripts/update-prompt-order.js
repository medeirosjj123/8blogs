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

// Define Prompt schema
const promptSchema = new mongoose.Schema({
  code: String,
  name: String,
  content: String,
  variables: [String],
  category: String,
  order: { type: Number, default: 0 },
  isActive: Boolean,
  isSystem: Boolean,
  metadata: {
    description: String,
    example: String,
    tips: String
  },
  lastUpdatedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const Prompt = mongoose.model('Prompt', promptSchema);

// Define the order for each prompt type
const promptOrder = {
  // BBR prompts - order as they appear in article
  'bbr_intro': 1,           // Introduction
  'review_intro': 1,        // Alternative introduction (fallback)
  'bbr_product': 2,         // Product review
  'review_product': 2,      // Alternative product review (fallback)
  'bbr_conclusion': 3,      // Conclusion
  'review_conclusion': 3,   // Alternative conclusion (fallback)
  
  // SPR prompts - order as they appear in article
  'spr_intro': 1,           // Introduction
  'spr_product': 2,         // Product analysis
  'spr_conclusion': 3,      // Conclusion
  
  // Informational prompts - order as they appear in article
  'content_intro': 1,       // Introduction
  'content_section': 2,     // Content sections
  'content_conclusion': 3   // Conclusion
};

async function updatePromptOrder() {
  try {
    console.log('🚀 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Get all prompts
    const prompts = await Prompt.find({});
    console.log(`Found ${prompts.length} prompts to update\n`);

    let updated = 0;
    
    for (const prompt of prompts) {
      const order = promptOrder[prompt.code] || 99; // Default to 99 if not defined
      
      if (prompt.order !== order) {
        prompt.order = order;
        await prompt.save();
        console.log(`✅ Updated ${prompt.code}: order = ${order}`);
        updated++;
      } else {
        console.log(`⏭️  Skipped ${prompt.code}: already has order = ${order}`);
      }
    }

    console.log(`\n📊 Summary: Updated ${updated} prompts`);
    
    // Show prompts by category with their order
    console.log('\n📋 Prompts by category and order:');
    
    for (const category of ['bbr', 'spr', 'informational']) {
      const categoryPrompts = await Prompt.find({ category }).sort({ order: 1 });
      
      const categoryLabels = {
        'bbr': 'BBR (Best Buy Review)',
        'spr': 'SPR (Single Product Review)',
        'informational': 'Informational Content'
      };
      
      console.log(`\n${categoryLabels[category]}:`);
      categoryPrompts.forEach(p => {
        const position = p.order === 1 ? 'Introduction' : 
                        p.order === 2 ? 'Content/Product' : 
                        p.order === 3 ? 'Conclusion' : 'Other';
        console.log(`  ${p.order}. ${p.name} (${position}) - ${p.code}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the update
updatePromptOrder();