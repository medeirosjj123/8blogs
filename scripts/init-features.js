require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

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
    config: {
      maxSilos: 10,
      maxPagesPerSilo: 50
    }
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
    config: {
      maxHeadings: 20,
      includeQuestions: true
    }
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
    config: {
      minWords: 500,
      maxWords: 5000,
      toneOptions: ['professional', 'casual', 'technical']
    }
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
    config: {
      currency: 'BRL',
      defaultCTR: 0.03
    }
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
    config: {
      provider: 'wordops',
      defaultTheme: 'generatepress',
      plugins: ['rankmath', 'wp-rocket']
    }
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
    config: {
      maxMessageLength: 1000,
      allowFileUploads: true
    }
  }
];

async function initializeFeatures() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define feature schema inline
    const featureSchema = new mongoose.Schema({
      code: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      category: { type: String, required: true },
      status: { type: String, required: true, default: 'disabled' },
      icon: String,
      route: String,
      permissions: { type: [String], default: ['aluno'] },
      config: { type: mongoose.Schema.Types.Mixed, default: {} },
      dependencies: { type: [String], default: [] },
      version: { type: String, default: '1.0.0' },
      releaseDate: { type: Date, default: Date.now },
      lastModified: { type: Date, default: Date.now },
      modifiedBy: String,
      deletable: { type: Boolean, default: true },
      deleted: { type: Boolean, default: false },
      deletedAt: Date,
      metadata: {
        usageCount: { type: Number, default: 0 },
        lastUsed: Date,
        activeUsers: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        averageLoadTime: { type: Number, default: 0 }
      },
      maintenanceMessage: String
    }, { timestamps: true });

    const Feature = mongoose.models.Feature || mongoose.model('Feature', featureSchema);

    // Check if features already exist
    const existingCount = await Feature.countDocuments();
    console.log(`Found ${existingCount} existing features`);

    if (existingCount === 0) {
      // Create all features
      for (const featureData of defaultFeatures) {
        try {
          const feature = new Feature(featureData);
          await feature.save();
          console.log(`✅ Created feature: ${featureData.name}`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`⚠️  Feature already exists: ${featureData.name}`);
          } else {
            console.error(`❌ Error creating ${featureData.name}:`, error.message);
          }
        }
      }
    } else {
      // Update existing features or add new ones
      for (const featureData of defaultFeatures) {
        try {
          const existingFeature = await Feature.findOne({ code: featureData.code });
          
          if (!existingFeature) {
            const feature = new Feature(featureData);
            await feature.save();
            console.log(`✅ Created feature: ${featureData.name}`);
          } else {
            // Update existing feature (keeping its current status)
            existingFeature.name = featureData.name;
            existingFeature.description = featureData.description;
            existingFeature.category = featureData.category;
            existingFeature.icon = featureData.icon;
            existingFeature.route = featureData.route;
            existingFeature.permissions = featureData.permissions;
            existingFeature.config = featureData.config;
            existingFeature.version = featureData.version;
            await existingFeature.save();
            console.log(`✅ Updated feature: ${featureData.name}`);
          }
        } catch (error) {
          console.error(`❌ Error with ${featureData.name}:`, error.message);
        }
      }
    }

    // Display current feature status
    const allFeatures = await Feature.find({ deleted: false });
    console.log('\n📊 Current features status:');
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
    console.error('❌ Error initializing features:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the initialization
initializeFeatures();