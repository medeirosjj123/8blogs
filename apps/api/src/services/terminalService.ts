import { Server as SocketIOServer, Socket } from 'socket.io';
import * as pty from 'node-pty';
import pino from 'pino';
import jwt from 'jsonwebtoken';

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

interface TerminalSession {
  id: string;
  socket: Socket;
  ptyProcess: pty.IPty | null;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
}

export class TerminalService {
  private io: SocketIOServer;
  private sessions: Map<string, TerminalSession> = new Map();
  private readonly JWT_SECRET: string;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor(io: SocketIOServer) {
    this.io = io;
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    this.setupTerminalNamespace();
    this.startSessionCleanup();
  }

  private setupTerminalNamespace(): void {
    const terminalNamespace = this.io.of('/terminal');

    // Authentication middleware
    terminalNamespace.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('No authentication token provided'));
        }

        const decoded = jwt.verify(token, this.JWT_SECRET) as any;
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    terminalNamespace.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    const sessionId = `${socket.userId}-${Date.now()}`;
    
    logger.info({ 
      sessionId, 
      userId: socket.userId,
      socketId: socket.id 
    }, 'New terminal session connected');

    // Create session
    const session: TerminalSession = {
      id: sessionId,
      socket,
      ptyProcess: null,
      userId: socket.userId,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);

    // Send welcome message
    socket.emit('terminal_output', '\\r\\n\\x1b[1;36m🌟 Terminal session established\\x1b[0m\\r\\n');
    socket.emit('terminal_output', '\\x1b[1;37mRun commands or connect to your VPS:\\x1b[0m\\r\\n');
    socket.emit('terminal_output', '\\x1b[1;33m$ ssh root@your-vps-ip\\x1b[0m\\r\\n\\r\\n');

    // Handle terminal input
    socket.on('terminal_input', (data: string) => {
      this.handleTerminalInput(sessionId, data);
    });

    // Handle create shell request
    socket.on('create_shell', (options = {}) => {
      this.createShell(sessionId, options);
    });

    // Handle resize
    socket.on('terminal_resize', (size: { cols: number; rows: number }) => {
      this.handleResize(sessionId, size);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(sessionId);
    });

    // Auto-create a shell for immediate use
    setTimeout(() => {
      this.createShell(sessionId);
    }, 1000);
  }

  private createShell(sessionId: string, options: any = {}): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.ptyProcess) {
      session.ptyProcess.kill();
    }

    try {
      // Create a new shell process
      const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: options.cols || 120,
        rows: options.rows || 30,
        cwd: process.env.HOME || process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-color',
          COLORTERM: 'truecolor'
        }
      });

      session.ptyProcess = ptyProcess;

      // Handle process output
      ptyProcess.onData((data: string) => {
        session.lastActivity = new Date();
        session.socket.emit('terminal_output', data);
      });

      // Handle process exit
      ptyProcess.onExit((exitCode) => {
        logger.info({ sessionId, exitCode }, 'Shell process exited');
        session.socket.emit('terminal_output', `\\r\\n\\x1b[1;33m[Process exited with code ${exitCode.exitCode}]\\x1b[0m\\r\\n`);
        session.ptyProcess = null;
      });

      logger.info({ sessionId }, 'Shell created successfully');

    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to create shell');
      session.socket.emit('terminal_output', `\\r\\n\\x1b[1;31m[Error: Failed to create shell - ${error}]\\x1b[0m\\r\\n`);
    }
  }

  private handleTerminalInput(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) return;

    session.lastActivity = new Date();

    try {
      session.ptyProcess.write(data);
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to write to terminal');
      session.socket.emit('terminal_output', `\\r\\n\\x1b[1;31m[Error: Failed to write to terminal]\\x1b[0m\\r\\n`);
    }
  }

  private handleResize(sessionId: string, size: { cols: number; rows: number }): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) return;

    try {
      session.ptyProcess.resize(size.cols, size.rows);
      session.lastActivity = new Date();
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to resize terminal');
    }
  }

  private handleDisconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    logger.info({ sessionId }, 'Terminal session disconnected');

    if (session.ptyProcess) {
      session.ptyProcess.kill();
    }

    this.sessions.delete(sessionId);
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      this.sessions.forEach((session, sessionId) => {
        if (now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
          expiredSessions.push(sessionId);
        }
      });

      expiredSessions.forEach((sessionId) => {
        logger.info({ sessionId }, 'Cleaning up expired session');
        this.handleDisconnect(sessionId);
      });

    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Public methods for external use
  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  public getSessionsByUserId(userId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );
  }

  public killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.handleDisconnect(sessionId);
      return true;
    }
    return false;
  }

  public killAllUserSessions(userId: string): number {
    const userSessions = this.getSessionsByUserId(userId);
    userSessions.forEach(session => {
      this.handleDisconnect(session.id);
    });
    return userSessions.length;
  }
}

// Extend Socket interface to include userId
declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}