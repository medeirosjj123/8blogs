import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SimpleBlogCreator, SimpleBlogOptions } from '../services/simpleBlogCreator';
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
 * Simple blog creation with wo site create command
 */
export async function simpleBlogCreate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { host, port, username, password, domain } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!host || !username || !password || !domain) {
      res.status(400).json({
        success: false,
        message: 'Host, username, password, and domain are required'
      });
      return;
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]*\..*$/;
    if (!domainRegex.test(domain)) {
      res.status(400).json({
        success: false,
        message: 'Invalid domain format. Example: exemplo.com.br'
      });
      return;
    }

    const blogOptions: SimpleBlogOptions = {
      userId,
      credentials: {
        host,
        port: port || 22,
        username,
        password
      },
      domain
    };

    const simpleBlogCreator = new SimpleBlogCreator();

    // Get WebSocket instance from request
    const io = (req as any).io;
    const userSocketRoom = `user:${userId}`;

    // Setup event listeners for real-time updates
    simpleBlogCreator.on('connected', (data) => {
      io.to(userSocketRoom).emit('simpleBlog:connected', data);
    });

    simpleBlogCreator.on('progress', (data) => {
      io.to(userSocketRoom).emit('simpleBlog:progress', data);
    });

    simpleBlogCreator.on('blogCreated', (data) => {
      io.to(userSocketRoom).emit('simpleBlog:created', data);
    });

    simpleBlogCreator.on('blogError', (data) => {
      io.to(userSocketRoom).emit('simpleBlog:error', data);
    });

    // Start blog creation process
    res.json({
      success: true,
      message: 'Blog creation started. You will receive real-time updates via WebSocket.',
      domain
    });

    // Run blog creation in background
    try {
      const result = await simpleBlogCreator.createBlog(blogOptions);
      
      // Send final result to client
      io.to(userSocketRoom).emit('simpleBlog:completed', {
        success: true,
        credentials: result,
        domain
      });

    } catch (error) {
      logger.error({ error, host, domain, userId }, 'Simple blog creation failed');
      io.to(userSocketRoom).emit('simpleBlog:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domain,
        host
      });
    }

  } catch (error) {
    logger.error({ error }, 'Error starting simple blog creation');
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar criação do blog'
    });
  }
}

/**
 * Check if domain is available on the VPS
 */
export async function checkDomainAvailable(req: AuthRequest, res: Response): Promise<void> {
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

    if (!domain) {
      res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
      return;
    }

    // TODO: Implement actual domain availability check
    // For now, just return available
    res.json({
      success: true,
      available: true,
      domain,
      message: 'Domain is available'
    });

  } catch (error) {
    logger.error({ error }, 'Error checking domain availability');
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar disponibilidade do domínio'
    });
  }
}