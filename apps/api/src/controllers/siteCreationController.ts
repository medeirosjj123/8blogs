import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SiteCreationService, SiteCreationOptions } from '../services/siteCreationService';
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

/**
 * Create WordPress site using add-site.sh script
 */
export async function createWordPressSite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { 
      domain,
      vpsConfig,
      adminUser,
      templateUrl,
      phpVersion,
      enableCache,
      enableSSL,
      enableRedis
    } = req.body;

    // Validate required fields
    if (!domain || !vpsConfig) {
      res.status(400).json({
        success: false,
        message: 'Domain and VPS configuration are required'
      });
      return;
    }

    // Validate VPS config
    if (!vpsConfig.host || !vpsConfig.username || !vpsConfig.authMethod) {
      res.status(400).json({
        success: false,
        message: 'VPS host, username, and authentication method are required'
      });
      return;
    }

    if (vpsConfig.authMethod === 'password' && !vpsConfig.password) {
      res.status(400).json({
        success: false,
        message: 'Password is required for password authentication'
      });
      return;
    }

    if (vpsConfig.authMethod === 'privateKey' && !vpsConfig.privateKey) {
      res.status(400).json({
        success: false,
        message: 'Private key is required for key-based authentication'
      });
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid domain name'
      });
      return;
    }

    logger.info({ 
      userId, 
      domain,
      host: vpsConfig.host,
      templateUrl,
      phpVersion 
    }, 'Starting WordPress site creation');

    const siteCreationService = new SiteCreationService();

    // Set up real-time progress events
    siteCreationService.on('stepStart', (data) => {
      // Could emit to WebSocket here for real-time updates
      logger.info({ step: data.step, progress: data.progress }, data.name);
    });

    siteCreationService.on('stepComplete', (data) => {
      logger.info({ step: data.step, progress: data.progress }, data.name);
    });

    siteCreationService.on('output', (output) => {
      // Log script output for debugging
      logger.debug({ output: output.substring(0, 200) }, 'Script output');
    });

    // Prepare site creation options
    const options: SiteCreationOptions = {
      userId,
      credentials: {
        host: vpsConfig.host,
        port: vpsConfig.port || 22,
        username: vpsConfig.username,
        password: vpsConfig.password,
        privateKey: vpsConfig.privateKey,
        authMethod: vpsConfig.authMethod
      },
      domain,
      adminEmail: userEmail,
      adminUser: adminUser || 'admin',
      templateUrl,
      phpVersion: phpVersion || '8.1',
      enableCache: enableCache !== false,
      enableSSL: enableSSL !== false,
      enableRedis: enableRedis !== false
    };

    // Create the site
    const credentials = await siteCreationService.createSite(options);

    logger.info({ 
      userId, 
      domain,
      url: credentials.url 
    }, 'WordPress site created successfully');

    res.status(201).json({
      success: true,
      message: 'WordPress site created successfully',
      data: {
        domain: credentials.domain,
        url: credentials.url,
        admin_url: credentials.admin_url,
        username: credentials.username,
        // Don't expose passwords in the response for security
        ssl_enabled: credentials.ssl_enabled,
        cache_enabled: credentials.cache_enabled,
        redis_enabled: credentials.redis_enabled,
        php_version: credentials.php_version,
        created_at: credentials.created_at
      }
    });

  } catch (error: any) {
    logger.error({ error }, 'WordPress site creation failed');
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create WordPress site'
    });
  }
}

/**
 * Check VPS readiness for site creation
 */
export async function checkVPSReadiness(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { vpsConfig } = req.body;

    // Validate VPS config
    if (!vpsConfig || !vpsConfig.host || !vpsConfig.username || !vpsConfig.authMethod) {
      res.status(400).json({
        success: false,
        message: 'Complete VPS configuration is required'
      });
      return;
    }

    logger.info({ userId, host: vpsConfig.host }, 'Checking VPS readiness');

    const siteCreationService = new SiteCreationService();

    const readinessCheck = await siteCreationService.checkVPSReadiness({
      host: vpsConfig.host,
      port: vpsConfig.port || 22,
      username: vpsConfig.username,
      password: vpsConfig.password,
      privateKey: vpsConfig.privateKey,
      authMethod: vpsConfig.authMethod
    });

    if (!readinessCheck.isReady) {
      res.status(400).json({
        success: false,
        message: readinessCheck.hasWordOps 
          ? 'WordOps is installed but not functioning properly'
          : 'WordOps is not installed. Please run VPS setup first.',
        data: readinessCheck
      });
      return;
    }

    logger.info({ 
      userId, 
      host: vpsConfig.host,
      wordOpsVersion: readinessCheck.wordOpsVersion 
    }, 'VPS is ready for site creation');

    res.json({
      success: true,
      message: 'VPS is ready for WordPress site creation',
      data: readinessCheck
    });

  } catch (error: any) {
    logger.error({ error }, 'VPS readiness check failed');
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check VPS readiness'
    });
  }
}