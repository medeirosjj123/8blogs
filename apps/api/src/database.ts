import mongoose from 'mongoose';
import pino from 'pino';

// Create logger instance
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

// MongoDB connection options
const mongoOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false, // Disable buffering when not connected
};

// Connection state
let isConnected = false;

// Connect to MongoDB
export const connectDatabase = async (): Promise<void> => {
  if (isConnected) {
    logger.info('MongoDB is already connected');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Please configure MongoDB Atlas connection.');
  }
  
  // Log the MongoDB URI (with password masked)
  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  logger.info(`MongoDB URI: ${maskedUri}`);

  try {
    logger.info('Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, mongoOptions);
    
    isConnected = true;
    logger.info('✅ MongoDB Atlas connected successfully');
    
    // Connection event handlers
    mongoose.connection.on('error', (error) => {
      logger.error({ error }, 'MongoDB connection error');
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB Atlas');
    
    // No fallback to local MongoDB - only use Atlas
    
    // For development, allow server to start without MongoDB (but warn)
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ Starting server without MongoDB connection - Some features will not work');
      logger.warn('⚠️ Please configure MONGODB_URI environment variable with your Atlas connection string');
      return;
    }
    
    throw error;
  }
};

// Disconnect from MongoDB
export const disconnectDatabase = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from MongoDB');
    throw error;
  }
};

// Check if database is connected
export const isDatabaseConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

// Get database connection instance
export const getDatabase = () => mongoose.connection;

export default {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
  getDatabase
};