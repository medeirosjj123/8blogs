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
      
      const progressSteps = [
        { progress: 15, message: '🤖 IA trabalhando: Configurando Git...' },
        { progress: 25, message: '🤖 IA trabalhando: Baixando WordOps...' },
        { progress: 45, message: '🤖 IA trabalhando: Instalando WordOps (pode demorar 5-10 minutos)...' },
        { progress: 70, message: '🤖 IA trabalhando: Instalando stack WordPress (pode demorar 5 minutos)...' },
        { progress: 80, message: '🤖 IA trabalhando: Instalando fail2ban e firewall...' },
        { progress: 85, message: '🤖 IA trabalhando: Configurando fail2ban...' },
        { progress: 95, message: '🤖 IA trabalhando: Configurando firewall...' }
      ];

      logger.info('Executing complete VPS setup command chain');
      
      // Start progress updates
      let progressIndex = 0;
      const progressInterval = setInterval(() => {
        if (progressIndex < progressSteps.length) {
          this.emit('progress', {
            step: `step_${progressIndex}`,
            message: progressSteps[progressIndex].message,
            progress: progressSteps[progressIndex].progress
          });
          progressIndex++;
        }
      }, 120000); // Update every 2 minutes
      
      // Execute the full command
      const result = await this.ssh.execCommand(fullCommand);
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
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