import { EventEmitter } from 'events';
import { NodeSSH } from 'node-ssh';
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

export interface SimpleVpsCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface SimpleVpsSetupOptions {
  userId: string;
  credentials: SimpleVpsCredentials;
}

export class SimpleVpsSetup extends EventEmitter {
  private ssh: NodeSSH;
  private isSetupRunning = false;

  constructor() {
    super();
    this.ssh = new NodeSSH();
  }

  async setupVps(options: SimpleVpsSetupOptions): Promise<void> {
    if (this.isSetupRunning) {
      throw new Error('VPS setup is already running');
    }

    this.isSetupRunning = true;
    
    try {
      logger.info({ host: options.credentials.host, userId: options.userId }, 'Starting simple VPS setup');
      
      // Step 1: Connect
      this.emit('progress', {
        step: 'connecting',
        message: '🤖 IA trabalhando: Conectando ao servidor...',
        progress: 5
      });
      
      await this.connectToVps(options.credentials);
      
      // Step 2: Execute complete setup command chain
      const fullCommand = 'git config --global user.name "admin" && git config --global user.email "blog@bloghouse.com.br" && wget -qO wo wops.cc && bash wo && wo stack install --all && apt-get install -y fail2ban ufw && systemctl enable fail2ban && systemctl start fail2ban && ufw --force enable && ufw allow 22 && ufw allow 80 && ufw allow 443 && echo "✅ WordOps installed with firewall configured!"';
      
      // Real-time progress will be tracked based on actual command output

      logger.info('Executing complete VPS setup command chain');
      
      // Execute command with real-time output monitoring
      const result = await this.ssh.execCommand(fullCommand, {
        onStdout: (chunk) => {
          const output = chunk.toString();
          logger.info({ output: output.substring(0, 200) }, 'VPS setup output');
          
          // Track real progress based on actual command output
          if (output.includes('git config') || output.includes('Configured')) {
            this.emit('progress', {
              step: 'git_config',
              message: '🤖 IA trabalhando: Git configurado com sucesso...',
              progress: 15
            });
          } else if (output.includes('wo wops.cc') || output.includes('WordOps')) {
            this.emit('progress', {
              step: 'wordops_download',
              message: '🤖 IA trabalhando: WordOps baixado, iniciando instalação...',
              progress: 25
            });
          } else if (output.includes('Stack installed successfully') || output.includes('MySQL installed') || output.includes('NGINX installed')) {
            this.emit('progress', {
              step: 'stack_install',
              message: '🤖 IA trabalhando: Stack WordPress instalado com sucesso...',
              progress: 70
            });
          } else if (output.includes('fail2ban') || output.includes('ufw')) {
            this.emit('progress', {
              step: 'security_setup',
              message: '🤖 IA trabalhando: Configurando segurança (firewall + fail2ban)...',
              progress: 85
            });
          } else if (output.includes('WordOps installed with firewall configured')) {
            this.emit('progress', {
              step: 'finalizing',
              message: '🤖 IA trabalhando: Finalizando configuração...',
              progress: 95
            });
          }
        },
        onStderr: (chunk) => {
          const errorOutput = chunk.toString();
          logger.warn({ errorOutput }, 'VPS setup stderr');
          // Don't emit progress for stderr, but log for debugging
        }
      });
      
      if (result.code !== 0) {
        throw new Error(`VPS setup failed with exit code ${result.code}: ${result.stderr}`);
      }

      logger.info('VPS setup command chain completed successfully');
      logger.info(`Command output: ${result.stdout}`);

      this.emit('progress', {
        step: 'completed',
        message: '✅ Servidor configurado com sucesso!',
        progress: 100
      });

      this.emit('setupComplete', {
        host: options.credentials.host,
        message: 'VPS setup completed successfully'
      });

      logger.info({ host: options.credentials.host }, 'Simple VPS setup completed successfully');
      
    } catch (error) {
      logger.error({ error, host: options.credentials.host }, 'Simple VPS setup failed');
      
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

  private async connectToVps(credentials: SimpleVpsCredentials): Promise<void> {
    const connectionConfig = {
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      readyTimeout: 30000
    };

    await this.ssh.connect(connectionConfig);
    this.emit('connected', { host: credentials.host });
  }

  private async disconnect(): Promise<void> {
    if (this.ssh.isConnected()) {
      this.ssh.dispose();
    }
  }
}