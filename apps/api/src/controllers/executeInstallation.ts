import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Installation } from '../models/Installation';
import { WordPressTemplate } from '../models/WordPressTemplate';
import { SSHExecutor, SSHConfig, InstallationOptions } from '../services/sshExecutor';
import { Server } from 'socket.io';
import { Types } from 'mongoose';
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

// Store active installations
const activeInstallations = new Map<string, SSHExecutor>();

// Fallback templates if no templates in database
const FALLBACK_TEMPLATES = [
  {
    id: 'starter-blog',
    name: 'Starter Blog',
    description: 'Blog otimizado para SEO com schema markup',
    downloadUrl: 'https://f005.backblazeb2.com/file/wordpress-templates/starter-blog.wpress'
  },
  {
    id: 'template02',
    name: 'Template 02',
    description: 'WordPress Template Customizado para SEO',
    downloadUrl: 'https://ed97c456556a.ngrok-free.app/uploads/templates/template02.wpress'
  }
];

/**
 * Execute installation directly on VPS
 */
export async function executeInstallation(req: AuthRequest, res: Response, io: Server): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const { domain, vpsConfig, wordpressConfig } = req.body;

    if (!userId || !userEmail) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Validate inputs
    if (!domain || !vpsConfig) {
      res.status(400).json({
        success: false,
        message: 'Domain and VPS configuration are required'
      });
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid domain name'
      });
      return;
    }


    // Generate unique installation ID
    const installationId = crypto.randomBytes(16).toString('hex');

    // Create installation record with WordPress configuration
    const installation = new Installation({
      userId,
      userEmail,
      templateId: 'wordpress-hosting',
      templateName: 'WordPress with Custom Theme & Plugins',
      domain,
      vpsHost: vpsConfig.host,
      installToken: installationId,
      tokenUsed: false,
      status: 'running',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      installationOptions: {
        phpVersion: '8.2',
        mysqlVersion: '8.0',
        enableSSL: true,
        enableCaching: true,
        enableSecurity: true,
        installPlugins: true,
        wordpressConfig: wordpressConfig || null
      }
    });

    await installation.save();

    // Configure SSH connection
    const sshConfig: SSHConfig = {
      host: vpsConfig.host,
      port: vpsConfig.port || 22,
      username: vpsConfig.username,
      password: vpsConfig.password,
      privateKey: vpsConfig.privateKey,
      authMethod: vpsConfig.authMethod
    };

    // Create SSH executor
    let executor = new SSHExecutor(sshConfig);
    activeInstallations.set(installationId, executor);

    // Set up event listeners for real-time updates and detailed logging
    executor.on('output', async (line: string) => {
      io.to(`installation:${installationId}`).emit('installation:output', { line });
      try {
        await installation.addLog('info', line);
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to add log entry');
      }
    });

    executor.on('stepStart', async (data: { id: string; name: string }) => {
      io.to(`installation:${installationId}`).emit('installation:step', { 
        step: data.id, 
        status: 'running', 
        message: data.name 
      });
      try {
        await installation.updateStep(data.id, 'running', 0, data.name);
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to update step');
      }
    });

    executor.on('stepComplete', async (data: { id: string; name: string }) => {
      io.to(`installation:${installationId}`).emit('installation:step', { 
        step: data.id, 
        status: 'completed', 
        message: data.name 
      });
      try {
        await installation.updateStep(data.id, 'completed', 100, data.name);
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to update step completion');
      }
    });

    executor.on('stepError', async (data: { id: string; name: string; error: string; stack?: string; duration?: number }) => {
      io.to(`installation:${installationId}`).emit('installation:step', { 
        step: data.id, 
        status: 'error', 
        message: `${data.name}: ${data.error}` 
      });
      try {
        await installation.updateStep(data.id, 'error', 0, `Error: ${data.error}`);
        await installation.addLog('error', `Step ${data.id} failed: ${data.error}`);
        if (data.stack) {
          await installation.addLog('error', `Stack trace: ${data.stack}`);
        }
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to log step error');
      }
    });

    executor.on('error', async (errorMessage: string) => {
      io.to(`installation:${installationId}`).emit('installation:error', { error: errorMessage });
      try {
        await installation.addLog('error', errorMessage);
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to add error log');
      }
    });

    executor.on('installationComplete', async (data: { success: boolean; message: string }) => {
      logger.info({ installationId, domain }, 'Installation completed event received from SSH executor');
      io.to(`installation:${installationId}`).emit('installation:progress', { 
        message: '🎉 Instalação concluída! Finalizando processo...',
        step: 'completion'
      });
      try {
        await installation.addLog('info', 'All installation steps completed successfully');
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to add completion log');
      }
    });

    // Return response immediately with installation ID
    res.json({
      success: true,
      installationId,
      message: 'Installation started'
    });

    // Execute installation in background with WordPress configuration
    const installationOptions: InstallationOptions = {
      domain,
      userEmail,
      wordpressConfig: wordpressConfig || null
    };

    try {
      logger.info({ installationId, domain }, 'Starting WordPress installation');
      
      // Retry configuration following industry standards
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds base delay
      let lastError: Error | null = null;
      let result: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info({ 
            installationId, 
            domain, 
            attempt, 
            maxRetries 
          }, `Installation attempt ${attempt}/${maxRetries}`);
          
          result = await executor.executeInstallation(installationOptions);
          
          // If we get here, installation succeeded
          logger.info({ installationId, domain, attempt }, 'Installation completed successfully');
          break; // Exit retry loop on success
          
        } catch (error) {
          lastError = error as Error;
          logger.error({ 
            error: lastError, 
            installationId, 
            domain, 
            attempt, 
            maxRetries 
          }, `Installation attempt ${attempt} failed`);
          
          // Don't retry on the last attempt
          if (attempt === maxRetries) {
            logger.error({ 
              installationId, 
              domain, 
              totalAttempts: maxRetries 
            }, 'All installation attempts failed');
            throw lastError;
          }
          
          // Calculate exponential backoff with jitter
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 1000; // Up to 1 second jitter
          const delay = exponentialDelay + jitter;
          
          logger.info({ 
            installationId, 
            domain, 
            attempt, 
            delayMs: Math.round(delay) 
          }, `Retrying in ${Math.round(delay / 1000)}s...`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Create new executor for retry (fresh SSH connection)
          const newExecutor = new SSHExecutor(vpsConfig);
          
          // Set up event handlers for the new executor
          newExecutor.on('output', (line: string) => {
            io.to(`installation:${installationId}`).emit('installation:output', { line });
          });
          
          newExecutor.on('stepStart', (data: { id: string; name: string }) => {
            io.to(`installation:${installationId}`).emit('installation:step', {
              step: data.id,
              status: 'running',
              message: data.name
            });
          });
          
          newExecutor.on('stepComplete', (data: { id: string; name: string }) => {
            io.to(`installation:${installationId}`).emit('installation:step', {
              step: data.id,
              status: 'completed',
              message: data.name
            });
          });
          
          newExecutor.on('stepError', (data: { id: string; name: string; error: string }) => {
            io.to(`installation:${installationId}`).emit('installation:step', {
              step: data.id,
              status: 'error',
              message: data.error
            });
          });
          
          // Replace the executor for next attempt
          executor = newExecutor;
        }
      }
      
      // If we exited the loop without success, result will be null
      if (!result) {
        throw lastError || new Error('Installation failed after all retry attempts');
      }
      
      // Log the result to verify SSH executor completed successfully
      logger.info({ 
        installationId, 
        resultReceived: !!result,
        hasCredentials: !!result?.credentials,
        hasSiteInfo: !!result?.siteInfo,
        hasAccessMethods: !!result?.accessMethods,
        hasDnsInstructions: !!result?.dnsInstructions
      }, 'SSH executor completed, updating database');
      
      // Update installation record with validation
      installation.status = 'completed';
      installation.completedAt = new Date();
      installation.credentials = result.credentials || null;
      installation.siteInfo = result.siteInfo || null;
      
      // Ensure accessMethods has valid structure
      if (result.accessMethods && Array.isArray(result.accessMethods)) {
        installation.accessMethods = result.accessMethods.filter(method => 
          method && 
          method.type && 
          method.url && 
          ['ip', 'port', 'preview', 'domain'].includes(method.type)
        );
      } else {
        installation.accessMethods = [];
      }
      
      installation.dnsInstructions = result.dnsInstructions || null;
      
      // Add logging before database save
      logger.info({ 
        installationId, 
        domain,
        dataToSave: {
          status: installation.status,
          completedAt: installation.completedAt,
          hasCredentials: !!installation.credentials,
          hasSiteInfo: !!installation.siteInfo,
          accessMethodsCount: installation.accessMethods?.length || 0,
          accessMethodsValid: installation.accessMethods?.every(m => m.type && m.url) || false,
          hasDnsInstructions: !!installation.dnsInstructions
        }
      }, 'About to save installation to database');
      
      // Emit completion event first (before database save)
      logger.info({ installationId, domain }, 'Emitting completion event to frontend');
      io.to(`installation:${installationId}`).emit('installation:complete', {
        success: true,
        credentials: result.credentials,
        siteInfo: result.siteInfo,
        accessMethods: result.accessMethods,
        dnsInstructions: result.dnsInstructions
      });
      
      // Try to save to database with timeout
      try {
        const savePromise = installation.save();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database save timeout')), 30000); // 30 second timeout
        });
        
        await Promise.race([savePromise, timeoutPromise]);
        logger.info({ installationId, domain }, 'Successfully saved installation to database');
      } catch (saveError) {
        // Log detailed validation errors
        const errorDetails = {
          name: saveError.name,
          message: saveError.message,
          errors: saveError.errors || {},
          installationData: {
            status: installation.status,
            completedAt: installation.completedAt,
            credentialsExists: !!installation.credentials,
            siteInfoExists: !!installation.siteInfo,
            accessMethodsExists: !!installation.accessMethods,
            accessMethodsLength: installation.accessMethods?.length || 0
          }
        };
        
        logger.error({ 
          error: saveError,
          errorDetails,
          installationId, 
          domain 
        }, 'Failed to save installation to database - detailed error analysis');
        
        // Try to force save without validation to complete the installation
        try {
          await installation.save({ validateBeforeSave: false });
          logger.info({ installationId, domain }, 'Successfully force-saved installation without validation');
        } catch (forceSaveError) {
          logger.error({ 
            error: forceSaveError, 
            installationId, 
            domain 
          }, 'Even force save failed - installation complete but status not updated');
        }
      }
      
      logger.info({ installationId, domain }, 'WordPress installation completed successfully');
      
    } catch (error) {
      logger.error({ error, installationId, domain, vpsHost: vpsConfig.host }, 'Installation failed');
      
      // Add comprehensive error logging
      try {
        await installation.addLog('error', `Installation failed: ${error.message}`);
        if (error.stack) {
          await installation.addLog('error', `Error stack: ${error.stack}`);
        }
        
        // Add context about the configuration
        await installation.addLog('error', `Installation context:`);
        await installation.addLog('error', `  • Domain: ${domain}`);
        await installation.addLog('error', `  • VPS Host: ${vpsConfig.host}:${vpsConfig.port || 22}`);
        await installation.addLog('error', `  • Username: ${vpsConfig.username}`);
        await installation.addLog('error', `  • Auth Method: ${vpsConfig.authMethod || (vpsConfig.privateKey ? 'key' : 'password')}`);
        await installation.addLog('error', `  • WordPress Config: ${wordpressConfig ? 'Yes' : 'No'}`);
        
        if (wordpressConfig?.credentials) {
          await installation.addLog('error', `  • WP Site Title: ${wordpressConfig.credentials.siteTitle}`);
          await installation.addLog('error', `  • WP Admin User: ${wordpressConfig.credentials.adminUsername}`);
          await installation.addLog('error', `  • WP Admin Email: ${wordpressConfig.credentials.adminEmail}`);
        }
        if (wordpressConfig?.theme) {
          await installation.addLog('error', `  • Selected Theme: ${wordpressConfig.theme.slug}`);
        }
        if (wordpressConfig?.plugins?.length) {
          await installation.addLog('error', `  • Selected Plugins: ${wordpressConfig.plugins.join(', ')}`);
        }
      } catch (logError) {
        logger.error({ logError, installationId }, 'Failed to add comprehensive error logs');
      }
      
      // Update installation record with detailed error information
      installation.status = 'failed';
      installation.errorMessage = error.message;
      installation.failureReason = `Installation failed at step: ${executor.currentStep || 'unknown'}. ${error.message}`;
      installation.completedAt = new Date();
      await installation.save();
      
      // Emit error event
      io.to(`installation:${installationId}`).emit('installation:complete', {
        success: false,
        error: error.message,
        failureReason: installation.failureReason,
        currentStep: executor.currentStep
      });
    } finally {
      // Clean up
      activeInstallations.delete(installationId);
    }

  } catch (error) {
    logger.error({ error }, 'Error executing installation controller');
    // Don't send response here as we already sent one above
    // The background installation will handle any errors via Socket.IO
  }
}

/**
 * Get installation status
 */
export async function getInstallationStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { installationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const installation = await Installation.findOne({
      installToken: installationId,
      userId
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Installation not found'
      });
      return;
    }

    // Disable caching for installation status to ensure real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      installation: {
        id: installation.installToken,
        domain: installation.domain,
        status: installation.status,
        progress: installation.progress,
        steps: installation.steps,
        credentials: installation.status === 'completed' ? installation.credentials : null,
        siteInfo: installation.status === 'completed' ? installation.siteInfo : null,
        accessMethods: installation.status === 'completed' ? installation.accessMethods : null,
        dnsInstructions: installation.status === 'completed' ? installation.dnsInstructions : null,
        error: installation.errorMessage,
        failureReason: installation.failureReason,
        startedAt: installation.startedAt,
        completedAt: installation.completedAt
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error getting installation status');
    res.status(500).json({
      success: false,
      message: 'Failed to get installation status'
    });
  }
}

/**
 * Get detailed installation logs
 */
export async function getInstallationLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { installationId } = req.params;
    const userId = req.user?.userId;
    const { level, limit = 100, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const installation = await Installation.findOne({
      installToken: installationId,
      userId
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Installation not found'
      });
      return;
    }

    // Filter logs by level if specified
    let logs = installation.logs || [];
    if (level && ['info', 'warn', 'error'].includes(level as string)) {
      logs = logs.filter(log => log.level === level);
    }

    // Apply pagination
    const totalLogs = logs.length;
    const startIndex = parseInt(offset as string) || 0;
    const limitNum = Math.min(parseInt(limit as string) || 100, 1000); // Max 1000 logs
    const paginatedLogs = logs.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        installation: {
          id: installation.installToken,
          domain: installation.domain,
          status: installation.status,
          progress: installation.progress,
          currentStep: installation.currentStep,
          startedAt: installation.startedAt,
          completedAt: installation.completedAt,
          errorMessage: installation.errorMessage,
          failureReason: installation.failureReason
        },
        logs: paginatedLogs,
        pagination: {
          total: totalLogs,
          offset: startIndex,
          limit: limitNum,
          hasMore: startIndex + limitNum < totalLogs
        },
        steps: installation.steps || [],
        summary: {
          totalLogs: installation.logs?.length || 0,
          errorLogs: installation.logs?.filter(l => l.level === 'error').length || 0,
          warnLogs: installation.logs?.filter(l => l.level === 'warn').length || 0,
          infoLogs: installation.logs?.filter(l => l.level === 'info').length || 0
        }
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error getting installation logs');
    res.status(500).json({
      success: false,
      message: 'Failed to get installation logs'
    });
  }
}

/**
 * Cancel running installation
 */
export async function cancelInstallation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { installationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Check if installation exists and belongs to user
    const installation = await Installation.findOne({
      installToken: installationId,
      userId
    });

    if (!installation) {
      res.status(404).json({
        success: false,
        message: 'Installation not found'
      });
      return;
    }

    // Check if installation is running
    const executor = activeInstallations.get(installationId);
    if (executor) {
      await executor.disconnect();
      activeInstallations.delete(installationId);
    }

    // Update installation record
    installation.status = 'cancelled';
    installation.errorMessage = 'Installation cancelled by user';
    await installation.save();

    res.json({
      success: true,
      message: 'Installation cancelled'
    });

  } catch (error) {
    logger.error({ error }, 'Error cancelling installation');
    res.status(500).json({
      success: false,
      message: 'Failed to cancel installation'
    });
  }
}