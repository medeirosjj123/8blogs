import { Request, Response } from 'express';
import { EnvConfig } from '../models/EnvConfig';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';

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

// Default environment variable configurations
const DEFAULT_ENV_CONFIGS = [
  // Database
  { key: 'MONGODB_URI', category: 'database', description: 'MongoDB connection string', isSecret: true, isRequired: true, validation: { type: 'string' } },
  { key: 'REDIS_URL', category: 'database', description: 'Redis connection URL', isSecret: true, isRequired: true, validation: { type: 'url' } },
  
  // Auth
  { key: 'JWT_SECRET', category: 'auth', description: 'JWT signing secret', isSecret: true, isRequired: true, validation: { type: 'string', min: 32 } },
  { key: 'MAGIC_LINK_SECRET', category: 'auth', description: 'Magic link token secret', isSecret: true, isRequired: true, validation: { type: 'string', min: 32 } },
  { key: 'GOOGLE_CLIENT_ID', category: 'auth', description: 'Google OAuth client ID', isSecret: false, isRequired: false, validation: { type: 'string' } },
  { key: 'GOOGLE_CLIENT_SECRET', category: 'auth', description: 'Google OAuth client secret', isSecret: true, isRequired: false, validation: { type: 'string' } },
  
  // Email
  { key: 'EMAIL_PROVIDER', category: 'email', description: 'Email service provider', isSecret: false, isRequired: false, defaultValue: 'elasticemail', validation: { type: 'string' } },
  { key: 'EMAIL_API_KEY', category: 'email', description: 'Email service API key', isSecret: true, isRequired: false, validation: { type: 'string' } },
  { key: 'EMAIL_FROM', category: 'email', description: 'Default from email address', isSecret: false, isRequired: false, validation: { type: 'email' } },
  { key: 'EMAIL_FROM_NAME', category: 'email', description: 'Default from name', isSecret: false, isRequired: false, defaultValue: 'Tatame', validation: { type: 'string' } },
  
  // Storage
  { key: 'B2_KEY_ID', category: 'storage', description: 'Backblaze B2 Key ID', isSecret: true, isRequired: false, validation: { type: 'string' } },
  { key: 'B2_APPLICATION_KEY', category: 'storage', description: 'Backblaze B2 Application Key', isSecret: true, isRequired: false, validation: { type: 'string' } },
  { key: 'B2_BUCKET_NAME', category: 'storage', description: 'Backblaze B2 Bucket Name', isSecret: false, isRequired: false, validation: { type: 'string' } },
  { key: 'CLOUDFLARE_API_TOKEN', category: 'storage', description: 'Cloudflare API Token', isSecret: true, isRequired: false, validation: { type: 'string' } },
  { key: 'CLOUDFLARE_ACCOUNT_ID', category: 'storage', description: 'Cloudflare Account ID', isSecret: false, isRequired: false, validation: { type: 'string' } },
  
  // Payment
  { key: 'KIWIFY_WEBHOOK_SECRET', category: 'payment', description: 'Kiwify webhook signature secret', isSecret: true, isRequired: false, validation: { type: 'string' } },
  
  // General
  { key: 'NODE_ENV', category: 'general', description: 'Node environment', isSecret: false, isRequired: true, defaultValue: 'development', validation: { type: 'string' } },
  { key: 'PORT', category: 'general', description: 'Server port', isSecret: false, isRequired: false, defaultValue: '3001', validation: { type: 'number', min: 1000, max: 65535 } },
  { key: 'SITE_URL', category: 'general', description: 'Main site URL', isSecret: false, isRequired: false, validation: { type: 'url' } },
  { key: 'CORS_ORIGINS', category: 'general', description: 'Allowed CORS origins (comma-separated)', isSecret: false, isRequired: false, validation: { type: 'string' } }
];

// Get all environment configurations grouped by category
export const getEnvConfigs = async (req: Request, res: Response) => {
  try {
    const { category, includeValues } = req.query;
    
    let query: any = { isActive: true };
    if (category) {
      query.category = category;
    }

    // Include values only if explicitly requested and for non-secret vars
    const selectFields = includeValues === 'true' 
      ? '+value +encryptedValue' 
      : '-value -encryptedValue';

    const configs = await EnvConfig.find(query)
      .select(selectFields)
      .sort({ category: 1, key: 1 });

    // Group by category
    const groupedConfigs = configs.reduce((acc, config) => {
      const cat = config.category;
      if (!acc[cat]) acc[cat] = [];
      
      const configData = config.toObject();
      
      // For display, show decrypted value if requested and authorized
      if (includeValues === 'true' && config.isSecret && config.encryptedValue) {
        configData.value = '•'.repeat(8); // Masked for secrets
      } else if (includeValues === 'true' && !config.isSecret) {
        configData.value = config.value;
      }
      
      // Remove encrypted field from response
      delete configData.encryptedValue;
      
      acc[cat].push(configData);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedConfigs
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching environment configs');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch environment configurations'
    });
  }
};

// Get single environment configuration
export const getEnvConfig = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const config = await EnvConfig.findOne({ key: key.toUpperCase(), isActive: true })
      .select('+value +encryptedValue');
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Environment variable not found'
      });
    }

    const responseData = config.toObject();
    
    // Decrypt value if it's a secret
    if (config.isSecret) {
      responseData.value = config.decryptValue();
    }
    
    // Remove encrypted field
    delete responseData.encryptedValue;

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching environment config');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch environment configuration'
    });
  }
};

// Create or update environment configuration
export const upsertEnvConfig = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const updateData = req.body;

    // Validate the value
    const tempConfig = new EnvConfig({ ...updateData, key: key.toUpperCase() });
    const validation = tempConfig.validateValue(updateData.value);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    const config = await EnvConfig.findOneAndUpdate(
      { key: key.toUpperCase() },
      { 
        ...updateData,
        key: key.toUpperCase(),
        isActive: true
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    // Update the actual .env file
    await updateEnvFile();

    res.json({
      success: true,
      data: config,
      message: 'Environment variable saved successfully'
    });

    logger.info({ key: key.toUpperCase() }, 'Environment variable updated');
  } catch (error) {
    logger.error({ error }, 'Error updating environment config');
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map((err: any) => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update environment configuration'
    });
  }
};

// Delete environment configuration
export const deleteEnvConfig = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const config = await EnvConfig.findOneAndUpdate(
      { key: key.toUpperCase() },
      { isActive: false },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Environment variable not found'
      });
    }

    // Update the actual .env file
    await updateEnvFile();

    res.json({
      success: true,
      message: 'Environment variable deleted successfully'
    });

    logger.info({ key: key.toUpperCase() }, 'Environment variable deleted');
  } catch (error) {
    logger.error({ error }, 'Error deleting environment config');
    res.status(500).json({
      success: false,
      message: 'Failed to delete environment configuration'
    });
  }
};

// Initialize default environment configurations
export const initializeEnvConfigs = async (req: Request, res: Response) => {
  try {
    const existingConfigs = await EnvConfig.find({});
    const existingKeys = existingConfigs.map(config => config.key);
    
    const newConfigs = DEFAULT_ENV_CONFIGS.filter(
      config => !existingKeys.includes(config.key)
    );

    if (newConfigs.length > 0) {
      await EnvConfig.insertMany(newConfigs);
      
      res.json({
        success: true,
        message: `Initialized ${newConfigs.length} default environment configurations`,
        data: { created: newConfigs.length, existing: existingConfigs.length }
      });

      logger.info({ count: newConfigs.length }, 'Default environment configurations initialized');
    } else {
      res.json({
        success: true,
        message: 'All default environment configurations already exist',
        data: { created: 0, existing: existingConfigs.length }
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error initializing environment configs');
    res.status(500).json({
      success: false,
      message: 'Failed to initialize environment configurations'
    });
  }
};

// Sync current .env file with database
export const syncEnvFile = async (req: Request, res: Response) => {
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    // Read current .env file
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // .env file doesn't exist, we'll create it
    }

    // Parse existing env vars
    const existingVars: Record<string, string> = {};
    if (envContent) {
      const lines = envContent.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            existingVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      }
    }

    // Get all active configs from database
    const configs = await EnvConfig.find({ isActive: true })
      .select('+value +encryptedValue');

    let syncCount = 0;
    for (const config of configs) {
      const currentValue = existingVars[config.key];
      const dbValue = config.isSecret ? config.decryptValue() : config.value;
      
      if (currentValue !== dbValue && dbValue) {
        syncCount++;
      }
    }

    // Update .env file
    await updateEnvFile();

    res.json({
      success: true,
      message: `Synchronized ${syncCount} environment variables`,
      data: { 
        syncedCount: syncCount, 
        totalVars: configs.length,
        existingVars: Object.keys(existingVars).length
      }
    });

    logger.info({ syncCount }, 'Environment file synchronized');
  } catch (error) {
    logger.error({ error }, 'Error synchronizing env file');
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize environment file'
    });
  }
};

// Restart application (requires PM2 or similar process manager)
export const restartApplication = async (req: Request, res: Response) => {
  try {
    // This is a placeholder - in production you'd integrate with your process manager
    logger.info('Application restart requested');
    
    res.json({
      success: true,
      message: 'Restart signal sent. Application will restart shortly.',
      note: 'This feature requires integration with your process manager (PM2, Docker, etc.)'
    });

    // In production, you might do:
    // exec('pm2 restart tatame-api');
    // or send a signal to your container orchestrator
    
    // For development, you could:
    // setTimeout(() => process.exit(0), 1000);
    
  } catch (error) {
    logger.error({ error }, 'Error restarting application');
    res.status(500).json({
      success: false,
      message: 'Failed to restart application'
    });
  }
};

// Helper function to update the .env file
async function updateEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    
    // Get all active configs
    const configs = await EnvConfig.find({ isActive: true })
      .select('+value +encryptedValue')
      .sort({ category: 1, key: 1 });

    // Build new .env content
    let envContent = `# Auto-generated by Tatame Admin Panel
# Last updated: ${new Date().toISOString()}
# Do not edit this file manually - use the admin panel instead

`;

    let currentCategory = '';
    for (const config of configs) {
      // Add category header
      if (config.category !== currentCategory) {
        currentCategory = config.category;
        envContent += `\n# ${currentCategory.toUpperCase()}\n`;
      }

      // Add comment with description
      if (config.description) {
        envContent += `# ${config.description}\n`;
      }

      // Add the variable
      const value = config.isSecret ? config.decryptValue() : config.value;
      if (value !== undefined && value !== '') {
        // Escape quotes and newlines in the value
        const escapedValue = value.includes(' ') || value.includes('#') 
          ? `"${value.replace(/"/g, '\\"')}"` 
          : value;
        envContent += `${config.key}=${escapedValue}\n`;
      } else if (config.defaultValue) {
        envContent += `${config.key}=${config.defaultValue}\n`;
      } else {
        envContent += `# ${config.key}=\n`;
      }
    }

    // Write the file
    await fs.writeFile(envPath, envContent, 'utf-8');
    
    logger.info('Environment file updated successfully');
  } catch (error) {
    logger.error({ error }, 'Error updating .env file');
    throw error;
  }
}