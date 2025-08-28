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

// Feature Schema
const featureSchema = new mongoose.Schema({
  code: String,
  name: String,
  description: String,
  category: String,
  status: String,
  deleted: Boolean,
  maintenanceMessage: String
});

const Feature = mongoose.model('Feature', featureSchema);

async function checkWordPressFeatures() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Find all WordPress features
    const wordpressFeatures = await Feature.find({ 
      category: 'wordpress',
      deleted: false 
    }).sort({ name: 1 });

    console.log('📂 WordPress Category Features:');
    console.log('================================\n');
    
    if (wordpressFeatures.length === 0) {
      console.log('⚠️  No WordPress features found');
    } else {
      console.log(`Found ${wordpressFeatures.length} WordPress features:\n`);
      
      wordpressFeatures.forEach((feature, index) => {
        console.log(`${index + 1}. ${feature.name}`);
        console.log(`   Code: ${feature.code}`);
        console.log(`   Status: ${feature.status}`);
        console.log(`   Category: ${feature.category}`);
        if (feature.maintenanceMessage) {
          console.log(`   Maintenance Message: ${feature.maintenanceMessage}`);
        }
        console.log('');
      });
    }

    // Count by status
    const statusCounts = {};
    wordpressFeatures.forEach(f => {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
    });

    console.log('📊 Status Summary:');
    console.log('==================');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === 'active' ? '✅' : status === 'maintenance' ? '🔧' : '❌';
      console.log(`${emoji} ${status}: ${count} features`);
    });

    // Check all categories with features
    console.log('\n\n📁 All Categories Summary:');
    console.log('==========================\n');
    
    const allFeatures = await Feature.find({ deleted: false });
    const categoryMap = new Map();
    
    allFeatures.forEach(f => {
      if (!categoryMap.has(f.category)) {
        categoryMap.set(f.category, { active: 0, maintenance: 0, disabled: 0, total: 0 });
      }
      const cat = categoryMap.get(f.category);
      cat[f.status] = (cat[f.status] || 0) + 1;
      cat.total++;
    });
    
    for (const [category, counts] of categoryMap) {
      console.log(`${category}: ${counts.total} total`);
      console.log(`  ✅ Active: ${counts.active || 0}`);
      console.log(`  🔧 Maintenance: ${counts.maintenance || 0}`);
      console.log(`  ❌ Disabled: ${counts.disabled || 0}`);
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the check
checkWordPressFeatures();