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

// Category Schema
const categorySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 200
  },
  icon: {
    type: String,
    default: 'Folder'
  },
  color: {
    type: String,
    default: '#666666'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

async function createTestCategory() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const testCategory = {
      code: 'test-category',
      name: 'Categoria de Teste',
      description: 'Esta categoria pode ser excluída para testar a funcionalidade',
      icon: 'Folder',
      color: '#FF69B4',
      order: 999,
      isActive: true,
      isSystem: false  // Not a system category, so it can be deleted
    };

    // Check if already exists
    const existing = await Category.findOne({ code: testCategory.code });
    
    if (existing) {
      console.log('⚠️  Test category already exists');
      console.log('   ID:', existing._id);
      console.log('   Name:', existing.name);
    } else {
      const category = new Category(testCategory);
      await category.save();
      console.log('✅ Test category created successfully!');
      console.log('   ID:', category._id);
      console.log('   Name:', category.name);
      console.log('   Code:', category.code);
      console.log('\n📝 This category:');
      console.log('   - Is NOT a system category (can be deleted)');
      console.log('   - Has NO features assigned');
      console.log('   - Should have a DELETE button in the admin panel');
    }

    console.log('\n✨ Done! Check the admin panel at /admin/categories');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
createTestCategory();