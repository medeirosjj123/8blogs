#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

const defaultCategories = [
  { 
    code: 'seo', 
    name: 'SEO', 
    description: 'Ferramentas de otimização para mecanismos de busca',
    icon: 'Search', 
    color: '#10B981', 
    order: 10, 
    isSystem: true 
  },
  { 
    code: 'automation', 
    name: 'Automação', 
    description: 'Automatize tarefas repetitivas e economize tempo',
    icon: 'Zap', 
    color: '#F59E0B', 
    order: 20, 
    isSystem: true 
  },
  { 
    code: 'monitoring', 
    name: 'Monitoramento', 
    description: 'Monitore o desempenho e saúde dos seus sites',
    icon: 'Activity', 
    color: '#3B82F6', 
    order: 30, 
    isSystem: true 
  },
  { 
    code: 'optimization', 
    name: 'Otimização', 
    description: 'Melhore a performance e velocidade dos sites',
    icon: 'Rocket', 
    color: '#8B5CF6', 
    order: 40, 
    isSystem: true 
  },
  { 
    code: 'security', 
    name: 'Segurança', 
    description: 'Proteja seus sites contra ameaças',
    icon: 'Shield', 
    color: '#EF4444', 
    order: 50, 
    isSystem: true 
  },
  { 
    code: 'analytics', 
    name: 'Analytics', 
    description: 'Análise de dados e métricas dos sites',
    icon: 'BarChart', 
    color: '#06B6D4', 
    order: 60, 
    isSystem: true 
  },
  { 
    code: 'content', 
    name: 'Conteúdo', 
    description: 'Criação e gestão de conteúdo',
    icon: 'FileText', 
    color: '#EC4899', 
    order: 70, 
    isSystem: true 
  },
  { 
    code: 'wordpress', 
    name: 'WordPress', 
    description: 'Gestão e manutenção de sites WordPress',
    icon: 'Globe', 
    color: '#E10600', 
    order: 80, 
    isSystem: true 
  },
  { 
    code: 'ai-tools', 
    name: 'IA Tools', 
    description: 'Ferramentas de inteligência artificial',
    icon: 'Zap', 
    color: '#9333EA', 
    order: 90, 
    isSystem: true 
  },
  { 
    code: 'social-media', 
    name: 'Social Media', 
    description: 'Gestão de redes sociais',
    icon: 'Share2', 
    color: '#0EA5E9', 
    order: 100, 
    isSystem: true 
  }
];

async function initializeCategories() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    console.log('\n📂 Initializing default categories...\n');

    let created = 0;
    let skipped = 0;

    for (const categoryData of defaultCategories) {
      const existing = await Category.findOne({ code: categoryData.code });
      
      if (!existing) {
        const category = new Category(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name} (${categoryData.code})`);
        created++;
      } else {
        console.log(`⏭️  Skipped category: ${categoryData.name} (already exists)`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  - Created: ${created} categories`);
    console.log(`  - Skipped: ${skipped} categories`);
    console.log(`  - Total: ${defaultCategories.length} categories`);

    console.log('\n✨ Category initialization complete!');

  } catch (error) {
    console.error('\n❌ Error initializing categories:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the initialization
initializeCategories();