import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { VPSConfiguration } from '../models/VPSConfiguration';
import { NodeSSH } from 'node-ssh';
import { VPSSetupService, VPSSetupOptions } from '../services/vpsSetupService';
import { SimpleVpsSetup, SimpleVpsSetupOptions } from '../services/simpleVpsSetup';
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
 * Test VPS connection
 */
export async function testVPSConnection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host, port, username, password, privateKey, authMethod } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!host || !username || (!password && !privateKey)) {
      res.status(400).json({
        success: false,
        message: 'Host, username, and authentication method (password or privateKey) are required'
      });
      return;
    }

    const ssh = new NodeSSH();
    
    try {
      // Attempt to connect
      const connectionConfig: any = {
        host,
        port: port || 22,
        username,
        readyTimeout: 10000
      };

      if (authMethod === 'password' && password) {
        connectionConfig.password = password;
      } else if (authMethod === 'privateKey' && privateKey) {
        connectionConfig.privateKey = privateKey;
      }

      await ssh.connect(connectionConfig);

      // Check if it's Ubuntu
      const osCheckResult = await ssh.execCommand('lsb_release -a 2>/dev/null || cat /etc/os-release');
      const output = osCheckResult.stdout.toLowerCase();
      
      const isUbuntu = output.includes('ubuntu');
      const version = output.match(/\d+\.\d+/)?.[0] || '';

      // Check if user has sudo privileges
      const sudoCheck = await ssh.execCommand('sudo -n true 2>&1');
      const hasSudo = sudoCheck.code === 0 || username === 'root';

      await ssh.dispose();

      if (!isUbuntu) {
        res.json({
          success: false,
          message: 'VPS deve ser Ubuntu. Sistema detectado: ' + (isUbuntu ? 'Ubuntu' : 'Outro'),
          details: { isUbuntu, version, hasSudo }
        });
        return;
      }

      if (!hasSudo) {
        res.json({
          success: false,
          message: 'Usuário precisa ter permissões sudo ou ser root',
          details: { isUbuntu, version, hasSudo }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Conexão estabelecida com sucesso!',
        details: {
          os: `Ubuntu ${version}`,
          hasSudo: true
        }
      });

    } catch (sshError: any) {
      logger.error({ error: sshError }, 'SSH connection failed');
      res.json({
        success: false,
        message: `Falha na conexão: ${sshError.message || 'Erro desconhecido'}`
      });
    }

  } catch (error) {
    logger.error({ error }, 'Error testing VPS connection');
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão'
    });
  }
}

/**
 * Get VPS status
 */
export async function getVPSStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const vpsConfig = await VPSConfiguration.findByUserAndHost(userId, host);

    if (!vpsConfig) {
      res.json({
        success: true,
        vps: null,
        message: 'VPS not found'
      });
      return;
    }

    res.json({
      success: true,
      vps: {
        _id: vpsConfig._id,
        host: vpsConfig.host,
        port: vpsConfig.port,
        username: vpsConfig.username,
        isConfigured: vpsConfig.isConfigured,
        configuredAt: vpsConfig.configuredAt,
        resetAt: vpsConfig.resetAt,
        lastCheckedAt: vpsConfig.lastCheckedAt,
        wordOpsVersion: vpsConfig.wordOpsVersion,
        features: vpsConfig.features,
        sites: vpsConfig.sites.filter(site => site.status !== 'deleted'),
        totalSites: vpsConfig.sites.filter(site => site.status === 'active').length
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error getting VPS status');
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status do VPS'
    });
  }
}

/**
 * Get all user VPS configurations
 */
export async function getUserVPSConfigurations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const vpsConfigs = await VPSConfiguration.find({ userId }).sort({ createdAt: -1 });

    const vpsList = vpsConfigs.map(vps => ({
      _id: vps._id,
      host: vps.host,
      port: vps.port,
      username: vps.username,
      isConfigured: vps.isConfigured,
      configuredAt: vps.configuredAt,
      resetAt: vps.resetAt,
      lastCheckedAt: vps.lastCheckedAt,
      wordOpsVersion: vps.wordOpsVersion,
      features: vps.features,
      totalSites: vps.sites.filter(site => site.status === 'active').length,
      createdAt: vps.createdAt
    }));

    res.json({
      success: true,
      vpsList
    });

  } catch (error) {
    logger.error({ error }, 'Error getting user VPS configurations');
    res.status(500).json({
      success: false,
      message: 'Erro ao obter configurações VPS'
    });
  }
}

/**
 * Save or update VPS configuration
 */
export async function saveVPSConfiguration(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host, port, username, authMethod } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!host || !username || !authMethod) {
      res.status(400).json({
        success: false,
        message: 'Host, username, and authMethod are required'
      });
      return;
    }

    // Check if VPS configuration already exists
    let vpsConfig = await VPSConfiguration.findByUserAndHost(userId, host);

    if (vpsConfig) {
      // Update existing configuration
      vpsConfig.port = port || 22;
      vpsConfig.username = username;
      vpsConfig.lastCheckedAt = new Date();
      await vpsConfig.save();
    } else {
      // Create new VPS configuration
      vpsConfig = new VPSConfiguration({
        userId,
        host,
        port: port || 22,
        username,
        isConfigured: false,
        features: {
          hasWordOps: false,
          hasNginx: false,
          hasMySQL: false,
          hasPHP: false,
          hasSSL: false,
          hasFirewall: false,
          hasRedis: false
        },
        sites: [],
        setupLogs: []
      });
      await vpsConfig.save();
    }

    res.json({
      success: true,
      message: 'VPS configuration saved',
      vps: {
        _id: vpsConfig._id,
        host: vpsConfig.host,
        port: vpsConfig.port,
        username: vpsConfig.username,
        isConfigured: vpsConfig.isConfigured,
        features: vpsConfig.features
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error saving VPS configuration');
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração VPS'
    });
  }
}

/**
 * Check if domain already exists on any VPS
 */
export async function checkDomainExists(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { domain } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const existingVPS = await VPSConfiguration.checkSiteExists(userId, domain);

    res.json({
      success: true,
      exists: !!existingVPS,
      vps: existingVPS ? {
        host: existingVPS.host,
        configuredAt: existingVPS.configuredAt
      } : null
    });

  } catch (error) {
    logger.error({ error }, 'Error checking domain exists');
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar domínio'
    });
  }
}

/**
 * Delete VPS configuration
 */
export async function deleteVPSConfiguration(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { vpsId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const vpsConfig = await VPSConfiguration.findOne({ _id: vpsId, userId });

    if (!vpsConfig) {
      res.status(404).json({
        success: false,
        message: 'VPS configuration not found'
      });
      return;
    }

    // Check if VPS has active sites
    const activeSites = vpsConfig.sites.filter(site => site.status === 'active');
    if (activeSites.length > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete VPS with ${activeSites.length} active site(s). Remove sites first.`,
        activeSites: activeSites.map(site => site.domain)
      });
      return;
    }

    await VPSConfiguration.findByIdAndDelete(vpsId);

    res.json({
      success: true,
      message: 'VPS configuration deleted successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Error deleting VPS configuration');
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar configuração VPS'
    });
  }
}

/**
 * Check VPS real-time status (connects to VPS and checks installed services)
 */
export async function checkVPSRealTimeStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host, port, username, password, privateKey, authMethod } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!host || !username || (!password && !privateKey)) {
      res.status(400).json({
        success: false,
        message: 'Host, username, and authentication method (password or privateKey) are required'
      });
      return;
    }

    const credentials = {
      host,
      port: port || 22,
      username,
      password,
      privateKey,
      authMethod
    };

    const vpsSetupService = new VPSSetupService();
    const status = await vpsSetupService.checkVPSStatus(credentials);

    res.json({
      success: true,
      status
    });

  } catch (error) {
    logger.error({ error }, 'Error checking VPS real-time status');
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do VPS'
    });
  }
}

/**
 * Setup VPS with complete reset and WordOps installation
 */
export async function setupVPS(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host, port, username, password, privateKey, authMethod, userEmail } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!host || !username || !userEmail || (!password && !privateKey)) {
      res.status(400).json({
        success: false,
        message: 'Host, username, userEmail, and authentication method (password or privateKey) are required'
      });
      return;
    }

    // Check if VPS setup is already running for this user
    const existingVPS = await VPSConfiguration.findByUserAndHost(userId, host);
    if (existingVPS && existingVPS.isConfigured) {
      res.status(400).json({
        success: false,
        message: 'VPS is already configured. Use reset endpoint to reconfigure.'
      });
      return;
    }

    const setupOptions: VPSSetupOptions = {
      userId,
      userEmail,
      credentials: {
        host,
        port: port || 22,
        username,
        password,
        privateKey,
        authMethod
      }
    };

    const vpsSetupService = new VPSSetupService();

    // Get WebSocket instance from request (we'll need to add this)
    const io = (req as any).io;
    const userSocketRoom = `user:${userId}`;

    // Setup event listeners for real-time updates
    vpsSetupService.on('connected', (data) => {
      io.to(userSocketRoom).emit('vps:connected', data);
    });

    vpsSetupService.on('stepStart', (data) => {
      io.to(userSocketRoom).emit('vps:stepStart', data);
    });

    vpsSetupService.on('stepComplete', (data) => {
      io.to(userSocketRoom).emit('vps:stepComplete', data);
    });

    vpsSetupService.on('stepError', (data) => {
      io.to(userSocketRoom).emit('vps:stepError', data);
    });

    vpsSetupService.on('output', (output) => {
      io.to(userSocketRoom).emit('vps:output', { output });
    });

    vpsSetupService.on('setupComplete', (data) => {
      io.to(userSocketRoom).emit('vps:setupComplete', data);
    });

    vpsSetupService.on('setupError', (data) => {
      io.to(userSocketRoom).emit('vps:setupError', data);
    });

    // Start setup process
    res.json({
      success: true,
      message: 'VPS setup started. You will receive real-time updates via WebSocket.',
      vpsId: existingVPS?._id
    });

    // Run setup in background
    vpsSetupService.setupVPS(setupOptions).catch((error) => {
      logger.error({ error, host, userId }, 'VPS setup failed');
      io.to(userSocketRoom).emit('vps:setupError', {
        error: error.message,
        host
      });
    });

  } catch (error) {
    logger.error({ error }, 'Error starting VPS setup');
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar configuração do VPS'
    });
  }
}

/**
 * Simple VPS setup with the one-liner command
 */
export async function simpleVpsSetup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host, port, username, password } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!host || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'Host, username, and password are required'
      });
      return;
    }

    const setupOptions: SimpleVpsSetupOptions = {
      userId,
      credentials: {
        host,
        port: port || 22,
        username,
        password
      }
    };

    const simpleVpsSetup = new SimpleVpsSetup();

    // Setup event listeners for real-time updates
    const io = (req as any).io;
    const userSocketRoom = `user:${userId}`;

    simpleVpsSetup.on('connected', (data) => {
      io.to(userSocketRoom).emit('simpleVps:connected', data);
    });

    simpleVpsSetup.on('progress', (data) => {
      io.to(userSocketRoom).emit('simpleVps:progress', data);
    });

    simpleVpsSetup.on('setupComplete', (data) => {
      io.to(userSocketRoom).emit('simpleVps:setupComplete', data);
    });

    simpleVpsSetup.on('setupError', (data) => {
      io.to(userSocketRoom).emit('simpleVps:setupError', data);
    });

    // Start setup process
    res.json({
      success: true,
      message: 'Simple VPS setup started. You will receive real-time updates via WebSocket.'
    });

    // Run setup in background
    simpleVpsSetup.setupVps(setupOptions).catch((error) => {
      logger.error({ error, host, userId }, 'Simple VPS setup failed');
      io.to(userSocketRoom).emit('simpleVps:setupError', {
        error: error.message,
        host
      });
    });

  } catch (error) {
    logger.error({ error }, 'Error starting simple VPS setup');
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar configuração simples do VPS'
    });
  }
}