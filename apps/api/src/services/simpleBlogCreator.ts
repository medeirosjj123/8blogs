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

export interface SimpleBlogCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface SimpleBlogOptions {
  userId: string;
  credentials: SimpleBlogCredentials;
  domain: string;
}

export interface BlogCreationResult {
  success: boolean;
  domain: string;
  url: string;
  adminUrl: string;
  adminUsername: string;
  adminPassword: string;
  message?: string;
}

export class SimpleBlogCreator extends EventEmitter {
  private ssh: NodeSSH;
  private isCreating = false;

  constructor() {
    super();
    this.ssh = new NodeSSH();
  }

  async createBlog(options: SimpleBlogOptions): Promise<BlogCreationResult> {
    if (this.isCreating) {
      throw new Error('Blog creation is already running');
    }

    this.isCreating = true;
    
    try {
      logger.info({ 
        host: options.credentials.host, 
        domain: options.domain,
        userId: options.userId 
      }, 'Starting simple blog creation');
      
      // Step 1: Connect
      this.emit('progress', {
        step: 'connecting',
        message: '🤖 IA trabalhando: Conectando ao servidor...',
        progress: 10
      });
      
      await this.connectToBlogServer(options.credentials);
      
      // Step 2: Create WordPress site
      this.emit('progress', {
        step: 'creating',
        message: '🤖 IA trabalhando: Criando blog WordPress...',
        progress: 30
      });

      const createCommand = `wo site create ${options.domain} --wp --user admin --pass bloghouse123`;
      
      logger.info({ domain: options.domain, command: createCommand }, 'Creating WordPress site');
      
      const result = await this.ssh.execCommand(createCommand, {
        onStdout: (chunk) => {
          const output = chunk.toString();
          logger.info({ output: output.substring(0, 200) }, 'Blog creation output');
          
          // Update progress based on output
          if (output.includes('Creating WordPress site')) {
            this.emit('progress', {
              step: 'wordpress',
              message: '🤖 IA trabalhando: Configurando WordPress...',
              progress: 60
            });
          } else if (output.includes('WordPress Admin')) {
            this.emit('progress', {
              step: 'credentials',
              message: '🤖 IA trabalhando: Gerando credenciais...',
              progress: 80
            });
          }
        },
        onStderr: (chunk) => {
          const errorOutput = chunk.toString();
          logger.warn({ errorOutput }, 'Blog creation stderr');
        }
      });

      if (result.code !== 0) {
        throw new Error(`Blog creation failed: ${result.stderr || 'Unknown error'}`);
      }

      // Step 3: Get WordPress credentials
      this.emit('progress', {
        step: 'info',
        message: '🤖 IA trabalhando: Obtendo informações do blog...',
        progress: 90
      });

      const infoResult = await this.ssh.execCommand(`wo site info ${options.domain} --admin`);
      
      // Parse credentials from output
      const credentials = this.parseCredentials(infoResult.stdout, options.domain);

      // Step 4: Save to database
      await this.saveBlogToDatabase(options, credentials);

      this.emit('progress', {
        step: 'completed',
        message: '✅ Blog criado com sucesso!',
        progress: 100
      });

      this.emit('blogCreated', {
        userId: options.userId,
        domain: options.domain,
        url: credentials.url,
        message: 'Blog created successfully'
      });

      logger.info({ 
        domain: options.domain,
        userId: options.userId 
      }, 'Simple blog creation completed successfully');
      
      return credentials;
      
    } catch (error) {
      logger.error({ error, domain: options.domain }, 'Simple blog creation failed');
      
      this.emit('blogError', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        domain: options.domain
      });
      
      throw error;
    } finally {
      this.isCreating = false;
      await this.disconnect();
    }
  }

  private async connectToBlogServer(credentials: SimpleBlogCredentials): Promise<void> {
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

  private parseCredentials(output: string, domain: string): BlogCreationResult {
    // Parse WordOps output to extract credentials
    const lines = output.split('\n');
    let adminUsername = 'admin';
    let adminPassword = '';

    for (const line of lines) {
      if (line.includes('WordPress Admin Username:')) {
        adminUsername = line.split(':')[1]?.trim() || 'admin';
      }
      if (line.includes('WordPress Admin Password:')) {
        adminPassword = line.split(':')[1]?.trim() || '';
      }
    }

    // If we can't parse credentials, use defaults
    if (!adminPassword) {
      adminPassword = 'bloghouse123';
    }

    return {
      success: true,
      domain,
      url: `https://${domain}`,
      adminUrl: `https://${domain}/wp-admin`,
      adminUsername,
      adminPassword,
      message: 'Blog created successfully'
    };
  }

  private async saveBlogToDatabase(options: SimpleBlogOptions, credentials: BlogCreationResult): Promise<void> {
    try {
      const site = new WordPressSite({
        userId: options.userId,
        name: credentials.domain,
        url: credentials.url,
        username: credentials.adminUsername,
        applicationPassword: credentials.adminPassword,
        isActive: true,
        testConnection: {
          status: 'connected',
          lastTested: new Date()
        }
      });

      await site.save();
      logger.info({ domain: credentials.domain, userId: options.userId }, 'Blog saved to database');
    } catch (error) {
      logger.error({ error, domain: credentials.domain }, 'Failed to save blog to database');
      // Don't throw here, the blog was created successfully
    }
  }

  private async disconnect(): Promise<void> {
    if (this.ssh.isConnected()) {
      this.ssh.dispose();
    }
  }
}