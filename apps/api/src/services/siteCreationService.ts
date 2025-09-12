import { EventEmitter } from 'events';
import { NodeSSH } from 'node-ssh';
import { WordPressSite } from '../models/WordPressSite';
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

export interface VPSCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  authMethod: 'password' | 'privateKey';
}

export interface SiteCreationOptions {
  userId: string;
  credentials: VPSCredentials;
  domain: string;
  adminEmail: string;
  adminUser?: string;
  templateUrl?: string;
  phpVersion?: string;
  enableCache?: boolean;
  enableSSL?: boolean;
  enableRedis?: boolean;
}

export interface SiteCredentials {
  success: boolean;
  domain: string;
  url: string;
  admin_url: string;
  username: string;
  password: string;
  application_password: string;
  email: string;
  db_name: string;
  db_user: string;
  db_pass: string;
  php_version: string;
  ssl_enabled: boolean;
  cache_enabled: boolean;
  redis_enabled: boolean;
  created_at: string;
}

export class SiteCreationService extends EventEmitter {
  private ssh: NodeSSH;
  private isCreating = false;

  constructor() {
    super();
    this.ssh = new NodeSSH();
  }

  /**
   * Create WordPress site using GitHub-hosted script
   */
  async createSite(options: SiteCreationOptions): Promise<SiteCredentials> {
    if (this.isCreating) {
      throw new Error('Site creation is already running');
    }

    this.isCreating = true;
    
    try {
      logger.info({ 
        host: options.credentials.host, 
        domain: options.domain,
        userId: options.userId 
      }, 'Starting site creation');
      
      // Connect to VPS
      await this.connectToVPS(options.credentials);
      
      // Execute site creation script
      const credentials = await this.executeCreationScript(options);
      
      // Save site to database
      await this.saveSiteToDatabase(options, credentials);
      
      this.emit('siteCreated', { 
        userId: options.userId,
        domain: options.domain,
        url: credentials.url,
        message: 'Site created successfully'
      });

      logger.info({ 
        host: options.credentials.host, 
        domain: options.domain,
        userId: options.userId 
      }, 'Site creation completed successfully');
      
      return credentials;
      
    } catch (error) {
      logger.error({ error, host: options.credentials.host, domain: options.domain }, 'Site creation failed');
      
      this.emit('siteCreationError', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        host: options.credentials.host,
        domain: options.domain
      });
      
      throw error;
    } finally {
      this.isCreating = false;
      await this.disconnect();
    }
  }

  /**
   * Check if VPS has WordOps installed and ready
   */
  async checkVPSReadiness(credentials: VPSCredentials): Promise<{
    isReady: boolean;
    hasWordOps: boolean;
    wordOpsVersion?: string;
    error?: string;
  }> {
    try {
      await this.connectToVPS(credentials);
      
      const checks = await Promise.all([
        this.ssh.execCommand('which wo 2>/dev/null || echo "not_found"'),
        this.ssh.execCommand('wo --version 2>/dev/null || echo "not_found"')
      ]);

      const [woCheck, woVersionCheck] = checks;

      const hasWordOps = !woCheck.stdout.includes('not_found');
      const wordOpsVersion = woVersionCheck.stdout.includes('not_found') ? undefined : woVersionCheck.stdout.trim();

      return {
        isReady: hasWordOps,
        hasWordOps,
        wordOpsVersion
      };
      
    } catch (error) {
      return {
        isReady: false,
        hasWordOps: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await this.disconnect();
    }
  }

  private async connectToVPS(credentials: VPSCredentials): Promise<void> {
    const connectionConfig: any = {
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      readyTimeout: 30000
    };

    if (credentials.authMethod === 'password' && credentials.password) {
      connectionConfig.password = credentials.password;
    } else if (credentials.authMethod === 'privateKey' && credentials.privateKey) {
      connectionConfig.privateKey = credentials.privateKey;
    } else {
      throw new Error('Invalid authentication method or missing credentials');
    }

    await this.ssh.connect(connectionConfig);
    this.emit('connected', { host: credentials.host });
  }

  private async disconnect(): Promise<void> {
    if (this.ssh.isConnected()) {
      this.ssh.dispose();
    }
  }

  private async executeCreationScript(options: SiteCreationOptions): Promise<SiteCredentials> {
    try {
      this.emit('stepStart', { 
        step: 'download', 
        name: 'Downloading site creation script',
        progress: 10
      });

      // GitHub raw URL for the add-site script
      const scriptUrl = 'https://raw.githubusercontent.com/medeirosjj123/vps/main/scripts/add-site.sh';
      const remoteScriptPath = '/tmp/add-site.sh';
      
      logger.info({ scriptUrl }, 'Downloading add-site script from GitHub');

      // Download script from GitHub using wget
      const downloadResult = await this.ssh.execCommand(`wget "${scriptUrl}" -O "${remoteScriptPath}"`);
      if (downloadResult.code !== 0) {
        // Try with curl as fallback
        logger.info('wget failed, trying curl as fallback');
        const curlResult = await this.ssh.execCommand(`curl -fsSL "${scriptUrl}" -o "${remoteScriptPath}"`);
        if (curlResult.code !== 0) {
          throw new Error(`Failed to download script: wget: ${downloadResult.stderr}, curl: ${curlResult.stderr}`);
        }
      }
      
      logger.info({ remoteScriptPath }, 'Script downloaded successfully from GitHub');
      
      this.emit('stepComplete', { 
        step: 'download', 
        name: 'Script downloaded successfully',
        progress: 20
      });

      // Make script executable
      const chmodResult = await this.ssh.execCommand(`chmod +x ${remoteScriptPath}`);
      if (chmodResult.code !== 0) {
        throw new Error(`Failed to make script executable: ${chmodResult.stderr}`);
      }

      this.emit('stepStart', { 
        step: 'execute', 
        name: 'Creating WordPress site',
        progress: 30
      });

      // Prepare parameters with defaults
      const domain = options.domain;
      const adminEmail = options.adminEmail;
      const adminUser = options.adminUser || 'admin';
      const templateUrl = options.templateUrl || '';
      const phpVersion = options.phpVersion || '8.1';
      const enableCache = options.enableCache !== false ? 'true' : 'false';
      const enableSSL = options.enableSSL !== false ? 'true' : 'false';
      const enableRedis = options.enableRedis !== false ? 'true' : 'false';

      // Escape parameters to prevent shell injection
      const escapedParams = [
        domain,
        adminEmail,
        adminUser,
        templateUrl,
        phpVersion,
        enableCache,
        enableSSL,
        enableRedis
      ].map(param => `'${param.replace(/'/g, "'\\''")}'`);

      // Execute the script with parameters
      logger.info({ 
        domain,
        adminEmail,
        adminUser,
        phpVersion,
        enableCache,
        enableSSL,
        enableRedis
      }, 'Executing site creation script');

      const command = `${remoteScriptPath} ${escapedParams.join(' ')}`;
      const result = await this.ssh.execCommand(command, {
        onStdout: (chunk) => {
          const output = chunk.toString();
          logger.info({ output: output.substring(0, 200) }, 'Script output');
          this.emit('output', output);
          
          // Try to extract progress from script output
          if (output.includes('PHASE 1:')) {
            this.emit('stepStart', { step: 'phase1', name: 'Pre-installation Checks', progress: 40 });
          } else if (output.includes('PHASE 2:')) {
            this.emit('stepStart', { step: 'phase2', name: 'Generating Credentials', progress: 50 });
          } else if (output.includes('PHASE 3:')) {
            this.emit('stepStart', { step: 'phase3', name: 'Building WordOps Command', progress: 60 });
          } else if (output.includes('PHASE 4:')) {
            this.emit('stepStart', { step: 'phase4', name: 'Creating WordPress Site', progress: 70 });
          } else if (output.includes('PHASE 5:')) {
            this.emit('stepStart', { step: 'phase5', name: 'Configuring WordPress', progress: 80 });
          } else if (output.includes('PHASE 6:')) {
            this.emit('stepStart', { step: 'phase6', name: 'Applying Template', progress: 85 });
          } else if (output.includes('PHASE 7:')) {
            this.emit('stepStart', { step: 'phase7', name: 'Setting Security', progress: 90 });
          } else if (output.includes('PHASE 8:')) {
            this.emit('stepStart', { step: 'phase8', name: 'Generating Passwords', progress: 95 });
          } else if (output.includes('PHASE 9:')) {
            this.emit('stepStart', { step: 'phase9', name: 'Final Verification', progress: 98 });
          }
        },
        onStderr: (chunk) => {
          const errorOutput = chunk.toString();
          logger.warn({ errorOutput }, 'Script stderr output');
          this.emit('output', `[ERROR] ${errorOutput}`);
        }
      });

      logger.info({ 
        exitCode: result.code, 
        stdout: result.stdout?.substring(0, 500), 
        stderr: result.stderr?.substring(0, 500) 
      }, 'Script execution completed');

      if (result.code !== 0) {
        const errorMsg = `Site creation script failed with exit code ${result.code}: ${result.stderr}`;
        logger.error({ result }, errorMsg);
        throw new Error(errorMsg);
      }

      // Parse credentials from script output
      const credentials = this.parseCredentials(result.stdout);

      this.emit('stepComplete', { 
        step: 'execute', 
        name: 'WordPress site created successfully',
        progress: 100
      });

      // Clean up the script
      logger.info('Cleaning up script from VPS');
      await this.ssh.execCommand(`rm -f ${remoteScriptPath}`);
      
      return credentials;
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'Error in executeCreationScript');
      throw error;
    }
  }

  private parseCredentials(output: string): SiteCredentials {
    try {
      // Extract credentials from script output
      const credentialsMatch = output.match(/===CREDENTIALS_START===([\s\S]*?)===CREDENTIALS_END===/);
      if (!credentialsMatch) {
        throw new Error('Failed to find credentials in script output');
      }

      const credentialsJson = credentialsMatch[1].trim();
      const credentials = JSON.parse(credentialsJson);

      logger.info({ domain: credentials.domain }, 'Credentials parsed successfully');
      
      return credentials;
    } catch (error) {
      logger.error({ error, output: output.substring(0, 1000) }, 'Failed to parse credentials');
      throw new Error('Failed to parse site credentials from script output');
    }
  }

  private async saveSiteToDatabase(options: SiteCreationOptions, credentials: SiteCredentials): Promise<void> {
    try {
      // Check if site already exists
      const existingSite = await WordPressSite.findOne({ 
        userId: options.userId, 
        $or: [
          { url: credentials.url },
          { domain: credentials.domain }
        ]
      });

      if (existingSite) {
        logger.warn({ domain: credentials.domain }, 'Site already exists in database, updating instead');
        
        // Update existing site
        existingSite.username = credentials.username;
        existingSite.applicationPassword = credentials.application_password;
        existingSite.testConnection = {
          status: 'success',
          lastTest: new Date(),
          error: null
        };
        await existingSite.save();
        
        logger.info({ siteId: existingSite._id }, 'Existing site updated in database');
        return;
      }

      // Create new site record
      const site = new WordPressSite({
        userId: options.userId,
        name: `WordPress Site - ${credentials.domain}`,
        url: credentials.url,
        domain: credentials.domain,
        username: credentials.username,
        applicationPassword: credentials.application_password,
        isDefault: false,
        siteType: 'managed',
        ipAddress: options.credentials.host,
        vpsConfig: {
          host: options.credentials.host,
          port: options.credentials.port,
          username: options.credentials.username,
          hasAccess: true
        },
        wordpressVersion: 'latest',
        phpVersion: credentials.php_version,
        testConnection: {
          status: 'success',
          lastTest: new Date(),
          error: null
        },
        sslEnabled: credentials.ssl_enabled,
        cacheEnabled: credentials.cache_enabled,
        redisEnabled: credentials.redis_enabled
      });

      await site.save();
      
      logger.info({ 
        siteId: site._id, 
        domain: credentials.domain 
      }, 'Site saved to database successfully');
      
    } catch (error) {
      logger.error({ error }, 'Failed to save site to database');
      throw new Error('Failed to save site to database');
    }
  }
}