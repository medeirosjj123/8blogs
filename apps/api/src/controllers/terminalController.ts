import { Request, Response } from 'express';
import { Socket } from 'socket.io';
import { sshService } from '../services/sshService';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

/**
 * Test VPS connection
 */
export const testVPSConnection = async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, privateKey } = req.body;

    if (!host || !username || (!password && !privateKey)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required connection parameters'
      });
    }

    const isValid = await sshService.testConnection({
      host,
      port: port || 22,
      username,
      password,
      privateKey
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Connection failed or VPS is not Ubuntu 22.04'
      });
    }

    res.json({
      success: true,
      message: 'Connection successful! VPS is Ubuntu 22.04'
    });
  } catch (error: any) {
    logger.error(`VPS connection test failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
};

/**
 * Connect to VPS and create session
 */
export const connectToVPS = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { host, port, username, password, privateKey } = req.body;

    if (!host || !username || (!password && !privateKey)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required connection parameters'
      });
    }

    // Create SSH connection
    const sessionId = await sshService.connect(userId, {
      host,
      port: port || 22,
      username,
      password,
      privateKey
    });

    res.json({
      success: true,
      sessionId,
      message: 'Connected to VPS successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to connect to VPS: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to VPS',
      error: error.message
    });
  }
};

/**
 * Execute command on VPS
 */
export const executeCommand = async (req: Request, res: Response) => {
  try {
    const { sessionId, command } = req.body;
    const userId = (req as any).user?.id;

    if (!sessionId || !command) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionId or command'
      });
    }

    // Verify session belongs to user
    const session = sshService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    const output = await sshService.executeCommand(sessionId, command);

    res.json({
      success: true,
      output
    });
  } catch (error: any) {
    logger.error(`Failed to execute command: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to execute command',
      error: error.message
    });
  }
};

/**
 * Start WordPress installation
 */
export const startInstallation = async (req: Request, res: Response) => {
  try {
    const { sessionId, templateId, domain } = req.body;
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;

    if (!sessionId || !templateId || !domain) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Verify session belongs to user
    const session = sshService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Start installation in background
    sshService.executeInstallation(sessionId, templateId, domain, userEmail)
      .then(() => {
        logger.info(`Installation completed for session ${sessionId}`);
      })
      .catch((error) => {
        logger.error(`Installation failed for session ${sessionId}: ${error.message}`);
      });

    res.json({
      success: true,
      message: 'Installation started',
      sessionId
    });
  } catch (error: any) {
    logger.error(`Failed to start installation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to start installation',
      error: error.message
    });
  }
};

/**
 * Disconnect from VPS
 */
export const disconnectFromVPS = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;

    // Verify session belongs to user
    const session = sshService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    sshService.closeSession(sessionId);

    res.json({
      success: true,
      message: 'Disconnected from VPS'
    });
  } catch (error: any) {
    logger.error(`Failed to disconnect from VPS: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect',
      error: error.message
    });
  }
};

/**
 * Get active sessions for user
 */
export const getUserSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const sessions = sshService.getUserSessions(userId);
    
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        vpsInfo: s.vpsInfo,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity
      }))
    });
  } catch (error: any) {
    logger.error(`Failed to get user sessions: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    });
  }
};

/**
 * Handle WebSocket terminal connections
 */
export const handleTerminalSocket = (socket: AuthenticatedSocket) => {
  const userId = socket.userId;
  
  if (!userId) {
    socket.disconnect();
    return;
  }

  logger.info(`Terminal socket connected for user ${userId}`);

  // Handle terminal creation
  socket.on('terminal:create', async (data: { sessionId: string }) => {
    try {
      const session = sshService.getSession(data.sessionId);
      if (!session || session.userId !== userId) {
        socket.emit('terminal:error', { message: 'Invalid or expired session' });
        return;
      }

      // Create shell stream
      const stream = await sshService.createShell(data.sessionId);
      
      // Store session ID in socket for later use
      socket.sessionId = data.sessionId;

      // Forward data from SSH to client
      stream.on('data', (data: Buffer) => {
        socket.emit('terminal:data', data.toString('utf8'));
      });

      // Handle stream close
      stream.on('close', () => {
        socket.emit('terminal:close', { sessionId: data.sessionId });
      });

      socket.emit('terminal:ready', { sessionId: data.sessionId });
    } catch (error: any) {
      logger.error(`Failed to create terminal: ${error.message}`);
      socket.emit('terminal:error', { message: error.message });
    }
  });

  // Handle data from client to SSH
  socket.on('terminal:input', (data: string) => {
    if (socket.sessionId) {
      sshService.writeToShell(socket.sessionId, data);
    }
  });

  // Handle terminal resize
  socket.on('terminal:resize', (data: { cols: number; rows: number }) => {
    if (socket.sessionId) {
      sshService.resizeTerminal(socket.sessionId, data.cols, data.rows);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`Terminal socket disconnected for user ${userId}`);
    if (socket.sessionId) {
      // Don't close SSH session on socket disconnect (user might reconnect)
      // Session will be cleaned up by timeout
    }
  });

  // Forward installation events
  sshService.on('installation:output', (data) => {
    if (data.sessionId === socket.sessionId) {
      socket.emit('installation:output', data.data);
    }
  });

  sshService.on('installation:progress', (data) => {
    if (data.sessionId === socket.sessionId) {
      socket.emit('installation:progress', data);
    }
  });

  sshService.on('installation:complete', (data) => {
    if (data.sessionId === socket.sessionId) {
      socket.emit('installation:complete', {});
    }
  });

  sshService.on('installation:error', (data) => {
    if (data.sessionId === socket.sessionId) {
      socket.emit('installation:error', data.error);
    }
  });
};