import { EventEmitter } from 'events';
import { NodeSSH } from 'node-ssh';
import { VPSConfiguration, IVPSConfiguration } from '../models/VPSConfiguration';
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

export interface VPSSetupOptions {
  userId: string;
  credentials: VPSCredentials;
  userEmail: string;
  forceReset?: boolean;
}

export class VPSSetupService extends EventEmitter {
  private ssh: NodeSSH;
  private vpsConfig: IVPSConfiguration | null = null;
  private isSetupRunning = false;

  constructor() {
    super();
    this.ssh = new NodeSSH();
  }

  /**
   * Setup VPS with complete reset and WordOps installation
   */
  async setupVPS(options: VPSSetupOptions): Promise<IVPSConfiguration> {
    if (this.isSetupRunning) {
      throw new Error('VPS setup is already running');
    }

    this.isSetupRunning = true;
    
    try {
      logger.info({ host: options.credentials.host, userId: options.userId }, 'Starting VPS setup');
      
      // Get or create VPS configuration
      this.vpsConfig = await this.getOrCreateVPSConfig(options);
      
      // Connect to VPS
      await this.connectToVPS(options.credentials);
      
      // Execute setup using script
      await this.executeSetupScript(options);
      
      // Mark as configured
      await this.vpsConfig.markAsConfigured({
        hasWordOps: true,
        hasNginx: true,
        hasMySQL: true,
        hasPHP: true,
        hasSSL: true,
        hasFirewall: true,
        hasRedis: true
      });

      this.emit('setupComplete', { 
        vpsId: this.vpsConfig._id,
        host: options.credentials.host,
        message: 'VPS setup completed successfully'
      });

      logger.info({ host: options.credentials.host, userId: options.userId }, 'VPS setup completed successfully');
      
      return this.vpsConfig;
      
    } catch (error) {
      logger.error({ error, host: options.credentials.host }, 'VPS setup failed');
      
      if (this.vpsConfig) {
        await this.vpsConfig.addLog('error', `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      this.emit('setupError', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        host: options.credentials.host
      });
      
      throw error;
    } finally {
      this.isSetupRunning = false;
      await this.disconnect();
    }
  }

  /**
   * Check VPS current status
   */
  async checkVPSStatus(credentials: VPSCredentials): Promise<{
    isOnline: boolean;
    hasWordOps: boolean;
    hasNginx: boolean;
    hasMySQL: boolean;
    hasPHP: boolean;
    wordOpsVersion?: string;
    osInfo?: string;
  }> {
    try {
      await this.connectToVPS(credentials);
      
      const checks = await Promise.all([
        this.ssh.execCommand('which wo 2>/dev/null || echo "not_found"'),
        this.ssh.execCommand('which nginx 2>/dev/null || echo "not_found"'),
        this.ssh.execCommand('which mysql 2>/dev/null || echo "not_found"'),
        this.ssh.execCommand('which php 2>/dev/null || echo "not_found"'),
        this.ssh.execCommand('lsb_release -d 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2'),
        this.ssh.execCommand('wo --version 2>/dev/null || echo "not_found"')
      ]);

      const [woCheck, nginxCheck, mysqlCheck, phpCheck, osCheck, woVersionCheck] = checks;

      return {
        isOnline: true,
        hasWordOps: !woCheck.stdout.includes('not_found'),
        hasNginx: !nginxCheck.stdout.includes('not_found'),
        hasMySQL: !mysqlCheck.stdout.includes('not_found'),
        hasPHP: !phpCheck.stdout.includes('not_found'),
        wordOpsVersion: woVersionCheck.stdout.includes('not_found') ? undefined : woVersionCheck.stdout.trim(),
        osInfo: osCheck.stdout.trim().replace(/"/g, '')
      };
      
    } catch (error) {
      return {
        isOnline: false,
        hasWordOps: false,
        hasNginx: false,
        hasMySQL: false,
        hasPHP: false
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

  private async getOrCreateVPSConfig(options: VPSSetupOptions): Promise<IVPSConfiguration> {
    let vpsConfig = await VPSConfiguration.findByUserAndHost(options.userId, options.credentials.host);
    
    if (!vpsConfig) {
      vpsConfig = new VPSConfiguration({
        userId: options.userId,
        host: options.credentials.host,
        port: options.credentials.port,
        username: options.credentials.username,
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
    
    return vpsConfig;
  }

  private async executeSetupScript(options: VPSSetupOptions): Promise<void> {
    try {
      this.emit('stepStart', { 
        step: 'download', 
        name: 'Downloading setup script from GitHub',
        progress: 10
      });

      if (this.vpsConfig) {
        await this.vpsConfig.addLog('info', 'Starting VPS setup with GitHub script approach');
      }

      // GitHub raw URL for the automated script
      const scriptUrl = 'https://raw.githubusercontent.com/medeirosjj123/vps/main/scripts/vps-setup-auto.sh';
      const remoteScriptPath = '/tmp/vps-setup.sh';
      
      logger.info({ scriptUrl }, 'Downloading script from GitHub');

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
        name: 'Script downloaded successfully from GitHub',
        progress: 20
      });

      this.emit('stepStart', { 
        step: 'execute', 
        name: 'Executing VPS setup script',
        progress: 20
      });

      // Make script executable and run it
      logger.info('Making script executable');
      const chmodResult = await this.ssh.execCommand(`chmod +x ${remoteScriptPath}`);
      if (chmodResult.code !== 0) {
        throw new Error(`Failed to make script executable: ${chmodResult.stderr}`);
      }

      // Test if script exists and is executable
      const testResult = await this.ssh.execCommand(`test -x ${remoteScriptPath} && echo "executable" || echo "not executable"`);
      logger.info({ testOutput: testResult.stdout }, 'Script executable test');
      
      // Execute the script with the user email as parameter
      logger.info({ userEmail: options.userEmail }, 'Executing VPS setup script');
      const result = await this.ssh.execCommand(`${remoteScriptPath} "${options.userEmail}"`, {
        onStdout: (chunk) => {
          const output = chunk.toString();
          logger.info({ output: output.substring(0, 200) }, 'Script output');
          this.emit('output', output);
          
          // Try to extract progress from script output
          if (output.includes('PHASE 1:')) {
            this.emit('stepStart', { step: 'phase1', name: 'Phase 1: Complete VPS Reset', progress: 25 });
          } else if (output.includes('PHASE 2:')) {
            this.emit('stepStart', { step: 'phase2', name: 'Phase 2: System Update & Dependencies', progress: 40 });
          } else if (output.includes('PHASE 3:')) {
            this.emit('stepStart', { step: 'phase3', name: 'Phase 3: Security Setup (fail2ban + UFW)', progress: 55 });
          } else if (output.includes('PHASE 4:')) {
            this.emit('stepStart', { step: 'phase4', name: 'Phase 4: WordOps Installation', progress: 70 });
          } else if (output.includes('PHASE 5:')) {
            this.emit('stepStart', { step: 'phase5', name: 'Phase 5: Verification & Finalization', progress: 85 });
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
        const errorMsg = `Setup script failed with exit code ${result.code}: ${result.stderr}`;
        logger.error({ result }, errorMsg);
        throw new Error(errorMsg);
      }

      this.emit('stepComplete', { 
        step: 'execute', 
        name: 'VPS setup script completed successfully',
        progress: 100
      });

      if (this.vpsConfig) {
        await this.vpsConfig.addLog('info', 'VPS setup script completed successfully');
      }

      // Clean up the script
      logger.info('Cleaning up script from VPS');
      await this.ssh.execCommand(`rm -f ${remoteScriptPath}`);
      
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'Error in executeSetupScript');
      
      if (this.vpsConfig) {
        await this.vpsConfig.addLog('error', `Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  // Legacy methods removed - now using script approach
}