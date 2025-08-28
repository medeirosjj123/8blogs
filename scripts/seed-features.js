const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

const defaultFeatures = [
  {
    code: 'silo-organizer',
    name: 'Silo Organizer',
    description: 'Organize your content into strategic silos for better SEO structure',
    category: 'seo',
    icon: 'FolderTree',
    route: '/tools/silo-organizer',
    status: 'active',
    version: '1.0.0',
    deletable: true,
    permissions: ['aluno'],
    deleted: false,
    metadata: {
      usageCount: 0,
      activeUsers: 0,
      errorCount: 0,
      averageLoadTime: 0
    },
    dependencies: [],
    config: {
      maxSilos: 10,
      maxPagesPerSilo: 50
    },
    releaseDate: new Date(),
    lastModified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'outline-generator',
    name: 'Gerador de Outline',
    description: 'Generate comprehensive content outlines based on top-ranking pages',
    category: 'seo',
    icon: 'FileText',
    route: '/tools/outline-generator',
    status: 'active',
    version: '1.0.0',
    deletable: true,
    permissions: ['aluno'],
    deleted: false,
    metadata: {
      usageCount: 0,
      activeUsers: 0,
      errorCount: 0,
      averageLoadTime: 0
    },
    dependencies: [],
    config: {
      maxHeadings: 20,
      includeQuestions: true
    },
    releaseDate: new Date(),
    lastModified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'article-writer',
    name: 'Escritor de Artigos',
    description: 'AI-powered article writer optimized for SEO',
    category: 'seo',
    icon: 'PenTool',
    route: '/tools/article-writer',
    status: 'active',
    version: '1.0.0',
    deletable: true,
    permissions: ['aluno'],
    deleted: false,
    metadata: {
      usageCount: 0,
      activeUsers: 0,
      errorCount: 0,
      averageLoadTime: 0
    },
    dependencies: [],
    config: {
      minWords: 500,
      maxWords: 5000,
      toneOptions: ['professional', 'casual', 'technical']
    },
    releaseDate: new Date(),
    lastModified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'revenue-calculator',
    name: 'Calculadora de Rendimento',
    description: 'Calculate potential SEO revenue and ROI',
    category: 'analytics',
    icon: 'Calculator',
    route: '/tools/revenue-calculator',
    status: 'active',
    version: '1.0.0',
    deletable: true,
    permissions: ['aluno'],
    deleted: false,
    metadata: {
      usageCount: 0,
      activeUsers: 0,
      errorCount: 0,
      averageLoadTime: 0
    },
    dependencies: [],
    config: {
      currency: 'BRL',
      defaultCTR: 0.03
    },
    releaseDate: new Date(),
    lastModified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'site-installer',
    name: 'Instalador de Sites',
    description: 'Automated WordPress site installation with SEO optimization',
    category: 'automation',
    icon: 'Globe',
    route: '/tools/site-installer',
    status: 'active',
    version: '1.0.0',
    deletable: false,
    permissions: ['aluno'],
    deleted: false,
    metadata: {
      usageCount: 0,
      activeUsers: 0,
      errorCount: 0,
      averageLoadTime: 0
    },
    dependencies: [],
    config: {
      provider: 'wordops',
      defaultTheme: 'generatepress',
      plugins: ['rankmath', 'wp-rocket']
    },
    releaseDate: new Date(),
    lastModified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    code: 'community-chat',
    name: 'Comunidade',
    description: 'Connect with other SEO professionals',
    category: 'content',
    icon: 'Users',
    route: '/community',
    status: 'active',
    version: '1.0.0',
    deletable: false,
    permissions: ['aluno'],
    deleted: false,
    metadata: {
      usageCount: 0,
      activeUsers: 0,
      errorCount: 0,
      averageLoadTime: 0
    },
    dependencies: [],
    config: {
      maxMessageLength: 1000,
      allowFileUploads: true
    },
    releaseDate: new Date(),
    lastModified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedFeatures() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('features');
    
    // Check if features already exist
    const count = await collection.countDocuments();
    console.log(`Found ${count} existing features`);
    
    if (count === 0) {
      // Insert all features
      const result = await collection.insertMany(defaultFeatures);
      console.log(`✅ Inserted ${result.insertedCount} features`);
    } else {
      // Update or insert features
      for (const feature of defaultFeatures) {
        const result = await collection.updateOne(
          { code: feature.code },
          { $set: feature },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          console.log(`✅ Created feature: ${feature.name}`);
        } else if (result.modifiedCount > 0) {
          console.log(`✅ Updated feature: ${feature.name}`);
        } else {
          console.log(`⚪ No changes for: ${feature.name}`);
        }
      }
    }
    
    // Display all features
    const allFeatures = await collection.find({ deleted: false }).toArray();
    console.log('\n📊 Current features:');
    console.log('================================');
    allFeatures.forEach(feature => {
      const statusEmoji = feature.status === 'active' ? '🟢' : 
                         feature.status === 'maintenance' ? '🟡' : 
                         feature.status === 'disabled' ? '🔴' : '⚪';
      console.log(`${statusEmoji} ${feature.name} (${feature.code}): ${feature.status}`);
    });
    console.log('================================');
    console.log(`Total: ${allFeatures.length} features`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedFeatures();