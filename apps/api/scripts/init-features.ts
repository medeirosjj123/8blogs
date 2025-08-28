import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Feature } from '../src/models/Feature';
import { featureScanner } from '../src/services/featureScanner';
import pino from 'pino';

// Load environment variables
dotenv.config({ path: '../../../.env' });

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

async function initializeFeatures() {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      logger.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB Atlas');
    
    // Initialize default features
    logger.info('Initializing default features...');
    await featureScanner.initializeDefaults();
    
    // Get feature stats
    const features = await Feature.find({ deleted: false });
    const stats = {
      total: features.length,
      active: features.filter(f => f.status === 'active').length,
      disabled: features.filter(f => f.status === 'disabled').length,
      maintenance: features.filter(f => f.status === 'maintenance').length,
      deprecated: features.filter(f => f.status === 'deprecated').length
    };
    
    logger.info('Feature Statistics:');
    logger.info(`  Total: ${stats.total}`);
    logger.info(`  Active: ${stats.active}`);
    logger.info(`  Disabled: ${stats.disabled}`);
    logger.info(`  Maintenance: ${stats.maintenance}`);
    logger.info(`  Deprecated: ${stats.deprecated}`);
    
    logger.info('\nFeatures initialized:');
    features.forEach(feature => {
      const statusEmoji = {
        active: '✅',
        disabled: '⭕',
        maintenance: '🔧',
        deprecated: '❌'
      }[feature.status as string];
      
      logger.info(`  ${statusEmoji} ${feature.name} (${feature.code}) - ${feature.status}`);
    });
    
    logger.info('\n✅ Feature initialization completed successfully!');
    
  } catch (error) {
    logger.error('Error initializing features:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the initialization
initializeFeatures();