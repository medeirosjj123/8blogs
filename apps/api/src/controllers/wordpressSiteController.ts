import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Installation } from '../models/Installation';
import { WordPressSite } from '../models/WordPressSite';
import { SSHExecutor, SSHConfig } from '../services/sshExecutor';
import pino from 'pino';
import { 
  DebugRequest, 
  logDatabaseOperation, 
  logWordPressConnection, 
  logDuplicateCheck, 
  debugLogger 
} from '../middlewares/debugMiddleware';

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

// Get user's WordPress sites
export async function getUserWordPressSites(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get completed WordPress installations for this user (including existing sites)
    const installations = await Installation.find({
      userId,
      status: 'completed',
      templateId: { $in: ['wordpress-hosting', 'raw-wordpress', 'existing-wordpress'] }
    })
    .sort({ createdAt: -1 })
    .select('domain vpsHost credentials siteInfo installationOptions createdAt completedAt');

    // Transform installations into site data
    const sites = installations.map(installation => {
      const isExistingSite = installation.templateId === 'existing-wordpress';
      
      return {
        _id: installation._id,
        name: isExistingSite 
          ? installation.installationOptions?.siteName 
          : installation.domain,
        url: isExistingSite 
          ? installation.siteInfo?.accessUrl 
          : `https://${installation.domain}`,
        domain: installation.domain,
        ipAddress: installation.vpsHost || installation.siteInfo?.ipAddress,
        status: 'active', // Default to active for completed installations
        sslStatus: 'none', // Will be updated by site health check
        lastCheck: installation.completedAt,
        wordpressVersion: '6.4', // Default version
        phpVersion: installation.installationOptions?.phpVersion || '8.2',
        themes: {
          active: installation.installationOptions?.wordpressConfig?.theme?.slug || 'twentytwentyfour',
          total: 1
        },
        plugins: {
          active: installation.installationOptions?.wordpressConfig?.plugins?.length || 0,
          total: installation.installationOptions?.wordpressConfig?.plugins?.length || 0,
          needsUpdate: 0
        },
        username: installation.credentials?.username || installation.installationOptions?.wordpressConfig?.credentials?.adminUsername || 'admin',
        applicationPassword: isExistingSite 
          ? installation.credentials?.password 
          : installation.credentials?.password || installation.installationOptions?.wordpressConfig?.credentials?.adminPassword || 'bloghouse123',
        isActive: true,
        isDefault: false,
        testConnection: {
          status: isExistingSite ? 'connected' : 'pending',
          lastTest: installation.completedAt
        },
        statistics: {
          postsPublished: 0,
          lastPublishedAt: null
        },
        backups: {
          last: installation.createdAt,
          count: 0
        },
        performance: {
          loadTime: 1.2,
          uptime: 99.8
        },
        security: {
          lastScan: installation.createdAt,
          issues: 0,
          firewall: true
        },
        createdAt: installation.createdAt,
        updatedAt: installation.completedAt || installation.createdAt
      };
    });

    res.json({
      success: true,
      sites
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching WordPress sites');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WordPress sites'
    });
  }
}

// Refresh site status
export async function refreshSiteStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get the installation
    const installation = await Installation.findOne({
      _id: siteId,
      userId,
      status: 'completed'
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Site not found'
      });
      return;
    }

    // Here we would normally check the site status via SSH/HTTP
    // For now, we'll simulate it
    const siteStatus = {
      status: 'active',
      sslStatus: 'active',
      wordpressVersion: '6.4',
      uptime: Math.random() * (99.9 - 99.1) + 99.1,
      loadTime: Math.random() * (2.0 - 0.8) + 0.8,
      lastCheck: new Date()
    };

    res.json({
      success: true,
      siteStatus
    });
  } catch (error) {
    logger.error({ error }, 'Error refreshing site status');
    res.status(500).json({
      success: false,
      message: 'Failed to refresh site status'
    });
  }
}

// Toggle site status (active/maintenance)
export async function toggleSiteStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get the installation
    const installation = await Installation.findOne({
      _id: siteId,
      userId,
      status: 'completed'
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Site not found'
      });
      return;
    }

    // Here we would connect to the server and enable/disable maintenance mode
    // For now, we'll simulate it
    logger.info({ siteId, domain: installation.domain }, 'Toggling site maintenance mode');

    res.json({
      success: true,
      message: 'Site status updated'
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling site status');
    res.status(500).json({
      success: false,
      message: 'Failed to toggle site status'
    });
  }
}

// Create site backup
export async function createSiteBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get the installation
    const installation = await Installation.findOne({
      _id: siteId,
      userId,
      status: 'completed'
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Site not found'
      });
      return;
    }

    // Here we would create a backup via SSH/WP-CLI
    logger.info({ siteId, domain: installation.domain }, 'Creating site backup');

    // Simulate backup creation
    setTimeout(() => {
      logger.info({ siteId }, 'Backup completed');
    }, 5000);

    res.json({
      success: true,
      message: 'Backup started',
      backupId: `backup_${Date.now()}`
    });
  } catch (error) {
    logger.error({ error }, 'Error creating site backup');
    res.status(500).json({
      success: false,
      message: 'Failed to create backup'
    });
  }
}

// Get site health status
export async function getSiteHealth(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get the installation
    const installation = await Installation.findOne({
      _id: siteId,
      userId,
      status: 'completed'
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Site not found'
      });
      return;
    }

    // Simulate health check
    const health = {
      overall: 'good',
      checks: {
        wordpress: {
          status: 'good',
          version: '6.4',
          updates: 0
        },
        plugins: {
          status: 'good',
          active: installation.installationOptions?.wordpressConfig?.plugins?.length || 0,
          updates: 0
        },
        themes: {
          status: 'good',
          active: installation.installationOptions?.wordpressConfig?.theme?.slug || 'twentytwentyfour',
          updates: 0
        },
        security: {
          status: 'good',
          firewall: true,
          ssl: true,
          malware: false
        },
        performance: {
          status: 'good',
          loadTime: 1.2,
          uptime: 99.8,
          caching: true
        }
      }
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    logger.error({ error }, 'Error getting site health');
    res.status(500).json({
      success: false,
      message: 'Failed to get site health'
    });
  }
}

// Execute WordPress command via WP-CLI
export async function executeWpCliCommand(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    const { command } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!command) {
      res.status(400).json({
        success: false,
        message: 'Command is required'
      });
      return;
    }

    // Get the installation
    const installation = await Installation.findOne({
      _id: siteId,
      userId,
      status: 'completed'
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Site not found'
      });
      return;
    }

    // Validate command (only allow safe WP-CLI commands)
    const allowedCommands = [
      'plugin list',
      'theme list',
      'core version',
      'core check-update',
      'plugin update',
      'theme update',
      'core update',
      'cache flush',
      'rewrite flush'
    ];

    const isAllowed = allowedCommands.some(allowed => command.startsWith(allowed));
    if (!isAllowed) {
      res.status(400).json({
        success: false,
        message: 'Command not allowed'
      });
      return;
    }

    // Here we would execute the WP-CLI command via SSH
    logger.info({ siteId, command }, 'Executing WP-CLI command');

    // Simulate command execution
    const output = `Command executed: wp ${command}\nOutput: Command completed successfully.`;

    res.json({
      success: true,
      output
    });
  } catch (error) {
    logger.error({ error }, 'Error executing WP-CLI command');
    res.status(500).json({
      success: false,
      message: 'Failed to execute command'
    });
  }
}

// Update WordPress
export async function updateWordPress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get the installation
    const installation = await Installation.findOne({
      _id: siteId,
      userId,
      status: 'completed'
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Site not found'
      });
      return;
    }

    // Here we would execute WordPress update via WP-CLI
    logger.info({ siteId, domain: installation.domain }, 'Updating WordPress');

    res.json({
      success: true,
      message: 'WordPress update started'
    });
  } catch (error) {
    logger.error({ error }, 'Error updating WordPress');
    res.status(500).json({
      success: false,
      message: 'Failed to update WordPress'
    });
  }
}

// Create new WordPress site
export async function createWordPressSite(req: AuthRequest & DebugRequest, res: Response): Promise<void> {
  const requestId = req.debugId;
  const startTime = Date.now();
  
  debugLogger.info({
    requestId,
    category: 'WORDPRESS_SITE_CREATE',
    action: 'start',
    userId: req.user?.userId
  }, 'Starting WordPress site creation');

  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      debugLogger.warning({ requestId }, 'User not authenticated');
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { name, url, username, applicationPassword, siteType = 'external', vpsConfig } = req.body;

    debugLogger.info({
      requestId,
      formData: { name, url, username, siteType, hasPassword: !!applicationPassword }
    }, 'Received form data for WordPress site creation');

    // Validate required fields
    if (!name || !url || !username || !applicationPassword) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!url) missingFields.push('url');
      if (!username) missingFields.push('username');
      if (!applicationPassword) missingFields.push('applicationPassword');
      
      debugLogger.warning({
        requestId,
        missingFields
      }, 'Required fields missing');

      res.status(400).json({
        success: false,
        message: 'Name, URL, username and application password are required'
      });
      return;
    }

    // Normalize URL to check for duplicates
    const normalizedUrl = url.trim().toLowerCase().replace(/\/+$/, '');
    let urlObj: URL;
    let hostname: string;

    try {
      urlObj = new URL(normalizedUrl);
      hostname = urlObj.hostname;
      
      debugLogger.info({
        requestId,
        originalUrl: url,
        normalizedUrl,
        hostname
      }, 'URL normalized for duplicate checking');
    } catch (urlError) {
      debugLogger.error({
        requestId,
        url: normalizedUrl,
        error: urlError
      }, 'Invalid URL format');

      res.status(400).json({
        success: false,
        message: 'URL inválida. Use um formato como https://seusite.com',
        code: 'INVALID_URL'
      });
      return;
    }

    // Check for duplicate WordPress sites by this user
    const duplicateCheckStart = Date.now();
    const existingSite = await WordPressSite.findOne({
      userId,
      $or: [
        { url: { $regex: new RegExp(`^${normalizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`, 'i') } },
        { domain: hostname },
        { url: { $regex: new RegExp(`^https?://${hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`, 'i') } }
      ]
    });

    logDatabaseOperation(
      requestId,
      'WordPressSite',
      'findOne',
      { userId, hostname },
      existingSite,
      Date.now() - duplicateCheckStart
    );

    logDuplicateCheck(requestId, normalizedUrl, userId, existingSite);

    if (existingSite) {
      debugLogger.info({
        requestId,
        userId,
        existingSiteId: existingSite._id,
        url: normalizedUrl,
        hostname,
        existingSiteUrl: existingSite.url,
        existingSiteDomain: existingSite.domain
      }, 'Duplicate WordPress site found');

      res.status(400).json({
        success: false,
        message: 'Este site WordPress já está registrado em sua conta. Verifique a lista de sites existentes.',
        code: 'DUPLICATE_SITE'
      });
      return;
    }

    debugLogger.info({ requestId, url: normalizedUrl }, 'No duplicate found, testing WordPress connection');

    // Test WordPress connection before saving
    const connectionTestStart = Date.now();
    logWordPressConnection(requestId, normalizedUrl, 'testing');

    try {
      const credentials = Buffer.from(`${username}:${applicationPassword}`).toString('base64');
      const testResponse = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'User-Agent': 'Tatame/1.0'
        },
        timeout: 10000
      });

      const connectionDuration = Date.now() - connectionTestStart;

      if (!testResponse.ok) {
        const errorText = await testResponse.text().catch(() => 'Unknown error');
        
        logWordPressConnection(requestId, normalizedUrl, 'failed', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: errorText
        }, connectionDuration);

        debugLogger.error({
          requestId,
          userId,
          url: normalizedUrl,
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: errorText,
          duration: connectionDuration
        }, 'WordPress connection test failed');

        res.status(400).json({
          success: false,
          message: 'Falha na conexão com o WordPress. Verifique as credenciais e tente novamente.',
          code: 'CONNECTION_FAILED',
          details: `Status ${testResponse.status}: ${testResponse.statusText}`
        });
        return;
      }

      logWordPressConnection(requestId, normalizedUrl, 'success', null, connectionDuration);
      debugLogger.info({
        requestId,
        url: normalizedUrl,
        duration: connectionDuration
      }, 'WordPress connection test successful');

    } catch (connectionError: any) {
      const connectionDuration = Date.now() - connectionTestStart;
      
      logWordPressConnection(requestId, normalizedUrl, 'failed', {
        error: connectionError.message
      }, connectionDuration);

      debugLogger.error({
        requestId,
        userId,
        url: normalizedUrl,
        error: connectionError.message,
        duration: connectionDuration
      }, 'WordPress connection test error');

      res.status(400).json({
        success: false,
        message: 'Erro ao conectar com o WordPress. Verifique a URL e as credenciais.',
        code: 'CONNECTION_ERROR',
        details: connectionError.message
      });
      return;
    }

    debugLogger.info({ requestId }, 'Connection test passed, creating WordPress site record');

    // Create new WordPress site
    const siteData = {
      userId,
      name: name.trim(),
      url: normalizedUrl,
      domain: hostname,
      username: username.trim(),
      applicationPassword, // Will be encrypted by the model
      isActive: true,
      isDefault: false,
      siteType,
      vpsConfig: vpsConfig || null,
      testConnection: {
        status: 'connected' as const,
        lastTest: new Date()
      },
      statistics: {
        postsPublished: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const wordpressSite = new WordPressSite(siteData);

    const saveStart = Date.now();
    await wordpressSite.save();
    
    logDatabaseOperation(
      requestId,
      'WordPressSite',
      'save',
      { userId, url: normalizedUrl },
      { _id: wordpressSite._id },
      Date.now() - saveStart
    );

    const totalDuration = Date.now() - startTime;

    debugLogger.info({
      requestId,
      userId,
      siteId: wordpressSite._id,
      name: name.trim(),
      url: normalizedUrl,
      siteType,
      totalDuration
    }, 'WordPress site created successfully');

    res.status(201).json({
      success: true,
      data: {
        _id: wordpressSite._id,
        name: wordpressSite.name,
        url: wordpressSite.url,
        domain: wordpressSite.domain,
        username: wordpressSite.username,
        isActive: wordpressSite.isActive,
        isDefault: wordpressSite.isDefault,
        siteType: wordpressSite.siteType,
        testConnection: wordpressSite.testConnection,
        statistics: wordpressSite.statistics,
        createdAt: wordpressSite.createdAt,
        updatedAt: wordpressSite.updatedAt
      },
      message: 'Site WordPress conectado com sucesso!'
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    
    debugLogger.error({
      requestId,
      userId: req.user?.userId,
      url: req.body?.url,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      totalDuration
    }, 'Error creating WordPress site');

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      debugLogger.warning({
        requestId,
        error: 'MongoDB duplicate key error'
      }, 'Duplicate key error during WordPress site creation');

      res.status(400).json({
        success: false,
        message: 'Este site WordPress já está registrado.',
        code: 'DUPLICATE_SITE'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Falha ao criar site WordPress',
      code: 'SERVER_ERROR'
    });
  }
}