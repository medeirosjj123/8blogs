import { Client, ConnectConfig, ClientChannel } from 'ssh2';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

interface SSHSession {
  id: string;
  userId: string;
  client: Client;
  stream?: ClientChannel;
  createdAt: Date;
  lastActivity: Date;
  vpsInfo: {
    host: string;
    port: number;
    username: string;
  };
}

interface SSHCredentials {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export class SSHService extends EventEmitter {
  private sessions: Map<string, SSHSession>;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.sessions = new Map();
    
    // Cleanup inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new SSH connection to a VPS
   */
  async connect(userId: string, credentials: SSHCredentials): Promise<string> {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const client = new Client();

    return new Promise((resolve, reject) => {
      const config: ConnectConfig = {
        host: credentials.host,
        port: credentials.port || 22,
        username: credentials.username,
        tryKeyboard: true,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3
      };

      // Add authentication method
      if (credentials.password) {
        config.password = credentials.password;
      } else if (credentials.privateKey) {
        config.privateKey = credentials.privateKey;
        if (credentials.passphrase) {
          config.passphrase = credentials.passphrase;
        }
      }

      client.on('ready', () => {
        logger.info(`SSH connection established for user ${userId} to ${credentials.host}`);
        
        const session: SSHSession = {
          id: sessionId,
          userId,
          client,
          createdAt: new Date(),
          lastActivity: new Date(),
          vpsInfo: {
            host: credentials.host,
            port: credentials.port || 22,
            username: credentials.username
          }
        };

        this.sessions.set(sessionId, session);
        this.emit('session:created', { sessionId, userId });
        
        resolve(sessionId);
      });

      client.on('error', (err) => {
        logger.error(`SSH connection error for user ${userId}: ${err.message}`);
        reject(new Error(`Connection failed: ${err.message}`));
      });

      client.on('end', () => {
        logger.info(`SSH connection ended for session ${sessionId}`);
        this.closeSession(sessionId);
      });

      client.on('close', () => {
        logger.info(`SSH connection closed for session ${sessionId}`);
        this.closeSession(sessionId);
      });

      // Attempt connection
      try {
        client.connect(config);
      } catch (error: any) {
        logger.error(`Failed to initiate SSH connection: ${error.message}`);
        reject(new Error(`Failed to connect: ${error.message}`));
      }
    });
  }

  /**
   * Execute a command on the VPS
   */
  async executeCommand(sessionId: string, command: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    session.lastActivity = new Date();

    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      session.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('close', (code: number, signal: string) => {
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          } else {
            resolve(output);
          }
        });

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
      });
    });
  }

  /**
   * Create an interactive shell session
   */
  async createShell(sessionId: string): Promise<ClientChannel> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    session.lastActivity = new Date();

    return new Promise((resolve, reject) => {
      session.client.shell({
        term: 'xterm-256color',
        cols: 80,
        rows: 24
      }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        session.stream = stream;
        
        // Handle stream events
        stream.on('close', () => {
          logger.info(`Shell stream closed for session ${sessionId}`);
          this.emit('shell:closed', { sessionId });
        });

        stream.on('error', (error) => {
          logger.error(`Shell stream error for session ${sessionId}: ${error.message}`);
          this.emit('shell:error', { sessionId, error: error.message });
        });

        resolve(stream);
      });
    });
  }

  /**
   * Write data to the shell
   */
  writeToShell(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      return false;
    }

    session.lastActivity = new Date();
    session.stream.write(data);
    return true;
  }

  /**
   * Resize the terminal
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      return false;
    }

    session.lastActivity = new Date();
    session.stream.setWindow(rows, cols, 0, 0);
    return true;
  }

  /**
   * Test SSH connection without creating a session
   */
  async testConnection(credentials: SSHCredentials): Promise<boolean> {
    const client = new Client();

    return new Promise((resolve) => {
      const config: ConnectConfig = {
        host: credentials.host,
        port: credentials.port || 22,
        username: credentials.username,
        readyTimeout: 10000
      };

      if (credentials.password) {
        config.password = credentials.password;
      } else if (credentials.privateKey) {
        config.privateKey = credentials.privateKey;
        if (credentials.passphrase) {
          config.passphrase = credentials.passphrase;
        }
      }

      const timeout = setTimeout(() => {
        client.end();
        resolve(false);
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);
        // Test if it's Ubuntu 22.04
        client.exec('lsb_release -a 2>/dev/null | grep "Ubuntu 22.04"', (err, stream) => {
          if (err) {
            client.end();
            resolve(false);
            return;
          }

          let output = '';
          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });

          stream.on('close', () => {
            client.end();
            resolve(output.includes('Ubuntu 22.04'));
          });
        });
      });

      client.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      try {
        client.connect(config);
      } catch {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): SSHSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SSHSession[] {
    const userSessions: SSHSession[] = [];
    this.sessions.forEach(session => {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    });
    return userSessions;
  }

  /**
   * Close a specific session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        if (session.stream) {
          session.stream.close();
        }
        session.client.end();
      } catch (error: any) {
        logger.error(`Error closing session ${sessionId}: ${error.message}`);
      }
      this.sessions.delete(sessionId);
      this.emit('session:closed', { sessionId, userId: session.userId });
      logger.info(`Session ${sessionId} closed for user ${session.userId}`);
    }
  }

  /**
   * Close all sessions for a user
   */
  closeUserSessions(userId: string): void {
    this.sessions.forEach((session, sessionId) => {
      if (session.userId === userId) {
        this.closeSession(sessionId);
      }
    });
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    const expired: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > this.sessionTimeout) {
        expired.push(sessionId);
      }
    });

    expired.forEach(sessionId => {
      logger.info(`Closing inactive session ${sessionId}`);
      this.closeSession(sessionId);
    });

    if (expired.length > 0) {
      logger.info(`Cleaned up ${expired.length} inactive sessions`);
    }
  }

  /**
   * Execute installation script
   */
  async executeInstallation(
    sessionId: string, 
    templateId: string,
    domain: string,
    userEmail: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    // Generate installation script command
    const installCommand = this.generateInstallCommand(templateId, domain, userEmail);
    
    // Execute the installation
    session.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      session.client.exec(installCommand, { pty: true }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('close', (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Installation failed with exit code ${code}`));
          }
        });

        stream.on('data', (data: Buffer) => {
          const output = data.toString();
          // Emit progress events
          this.emit('installation:output', {
            sessionId,
            data: output
          });
          
          // Parse progress from output
          if (output.includes('Phase 1:')) {
            this.emit('installation:progress', { sessionId, phase: 1, message: 'System Preparation' });
          } else if (output.includes('Phase 2:')) {
            this.emit('installation:progress', { sessionId, phase: 2, message: 'Installing WordOps' });
          } else if (output.includes('Phase 3:')) {
            this.emit('installation:progress', { sessionId, phase: 3, message: 'Installing Web Stack' });
          } else if (output.includes('Phase 4:')) {
            this.emit('installation:progress', { sessionId, phase: 4, message: 'Creating WordPress Site' });
          } else if (output.includes('Phase 5:')) {
            this.emit('installation:progress', { sessionId, phase: 5, message: 'Applying Template' });
          } else if (output.includes('Phase 6:')) {
            this.emit('installation:progress', { sessionId, phase: 6, message: 'Verification' });
          } else if (output.includes('INSTALLATION COMPLETE!')) {
            this.emit('installation:complete', { sessionId });
          }
        });

        stream.stderr.on('data', (data: Buffer) => {
          const error = data.toString();
          logger.warn(`Installation stderr: ${error}`);
          this.emit('installation:error', { sessionId, error });
        });
      });
    });
  }

  private generateInstallCommand(templateId: string, domain: string, userEmail: string): string {
    const apiUrl = process.env.API_URL || 'https://api.escoladoseo.com.br';
    const templateUrl = `${apiUrl}/uploads/templates/${templateId}.wpress`;
    
    return `curl -sL ${apiUrl}/api/install-script | bash -s -- "${domain}" "${templateUrl}" "${userEmail}"`;
  }

  /**
   * Cleanup on service shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.forEach((_, sessionId) => {
      this.closeSession(sessionId);
    });
  }
}

// Create singleton instance
export const sshService = new SSHService();