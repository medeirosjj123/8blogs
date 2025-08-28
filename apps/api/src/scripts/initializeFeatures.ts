import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Feature } from '../models/Feature';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

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
    category: 'seo',
    icon: 'Calculator',
    route: '/tools/revenue-calculator',
    status: 'active',
    version: '1.0.0',
    deletable: true,
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
    config: {
      maxMessageLength: 1000,
      allowFileUploads: true
    }
  }
];

async function initializeFeatures() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Check if features already exist
    const existingCount = await Feature.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing features`);
      
      // Update existing features or add new ones
      for (const featureData of defaultFeatures) {
        const existingFeature = await Feature.findOne({ code: featureData.code });
        
        if (!existingFeature) {
          const feature = new Feature(featureData);
          await feature.save();
          console.log(`Created feature: ${featureData.name}`);
        } else {
          console.log(`Feature already exists: ${featureData.name}`);
        }
      }
    } else {
      // Create all features
      for (const featureData of defaultFeatures) {
        const feature = new Feature(featureData);
        await feature.save();
        console.log(`Created feature: ${featureData.name}`);
      }
      console.log(`\nInitialized ${defaultFeatures.length} features successfully`);
    }

    // Display current feature status
    const allFeatures = await Feature.find({ deleted: false });
    console.log('\nCurrent features:');
    allFeatures.forEach(feature => {
      console.log(`- ${feature.name} (${feature.code}): ${feature.status}`);
    });

  } catch (error) {
    console.error('Error initializing features:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the initialization
initializeFeatures();