import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Site } from '../models/Site';
import { Job as JobModel } from '../models/Job';
import pino from 'pino';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

// Check if Redis is available
let redisConnection: Redis | null = null;
let siteInstallationQueue: Queue | null = null;
let siteInstallationWorker: Worker | null = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Try to initialize Redis connection only if not explicitly disabled
if (process.env.USE_REDIS !== 'false') {
  try {
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 1) {
          // Stop retrying after 1 attempt
          if (process.env.NODE_ENV === 'development') {
            logger.info('Redis not available, BullMQ queues disabled (this is normal in development)');
          } else {
            logger.warn('Redis not available, BullMQ queues disabled');
          }
          return null;
        }
        return 100;
      },
      enableOfflineQueue: false,
      lazyConnect: true
    });

    redisConnection.on('error', (err) => {
      // Suppress connection refused errors in development
      if (err.code === 'ECONNREFUSED' && process.env.NODE_ENV !== 'development') {
        logger.warn('Redis connection refused. BullMQ features disabled.');
      }
    });

  // Create queue only if Redis is available
  siteInstallationQueue = new Queue('site-installation', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 100 // Keep last 100 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600 // Keep failed jobs for 7 days
      }
    }
  });
  } catch (error) {
    if (process.env.NODE_ENV !== 'development') {
      logger.warn('Failed to initialize Redis connection. BullMQ features disabled.');
    }
  }
} else {
  logger.info('BullMQ queues disabled by configuration (USE_REDIS=false)');
}

export { siteInstallationQueue };

// Job data interface
interface SiteInstallationJobData {
  jobId: string;
  siteId: string;
  userId: string;
  domain: string;
  ipAddress: string;
  templateId: string;
  templateUrl: string;
}

// Process job
async function processSiteInstallation(job: Job<SiteInstallationJobData>) {
  const { jobId, siteId, domain, ipAddress, templateId, templateUrl } = job.data;
  
  logger.info({ jobId, siteId, domain }, 'Starting site installation');
  
  const jobModel = await JobModel.findById(jobId);
  const site = await Site.findById(siteId);
  
  if (!jobModel || !site) {
    throw new Error('Job or Site not found');
  }
  
  try {
    // Mark job as running
    await jobModel.markAsRunning();
    await jobModel.addLog('info', 'Starting site installation process');
    
    // Update site status
    site.status = 'provisioning';
    await site.save();
    
    // Step 1: Pre-flight checks
    await job.updateProgress(10);
    await jobModel.updateProgress(10, 'Running pre-flight checks');
    await jobModel.addLog('info', 'Performing pre-flight checks on VPS');
    
    // Simulate SSH connection and checks
    // In production, you would SSH to the VPS and run actual checks
    await simulatePreflightChecks(ipAddress);
    
    // Step 2: Install dependencies
    await job.updateProgress(25);
    await jobModel.updateProgress(25, 'Installing dependencies');
    await jobModel.addLog('info', 'Installing WordOps and dependencies');
    
    // Simulate WordOps installation
    await simulateWordOpsInstall(ipAddress);
    
    // Step 3: Download template
    await job.updateProgress(40);
    await jobModel.updateProgress(40, 'Downloading template');
    await jobModel.addLog('info', `Downloading template from ${templateUrl}`);
    
    // Simulate template download
    await simulateTemplateDownload(templateUrl);
    
    // Step 4: Restore WordPress site
    await job.updateProgress(60);
    await jobModel.updateProgress(60, 'Restoring WordPress site');
    await jobModel.addLog('info', 'Restoring WordPress from template');
    
    // Simulate WordPress restoration
    await simulateWordPressRestore(domain, templateId);
    
    // Step 5: Configure DNS
    await job.updateProgress(75);
    await jobModel.updateProgress(75, 'Configuring DNS');
    await jobModel.addLog('info', 'Configuring Cloudflare DNS');
    
    // Simulate DNS configuration
    await simulateDnsConfiguration(domain, ipAddress);
    
    // Step 6: Setup SSL
    await job.updateProgress(90);
    await jobModel.updateProgress(90, 'Setting up SSL certificate');
    await jobModel.addLog('info', 'Requesting Let\'s Encrypt certificate');
    
    // Simulate SSL setup
    await simulateSslSetup(domain);
    
    // Step 7: Final verification
    await job.updateProgress(95);
    await jobModel.updateProgress(95, 'Running final verification');
    await jobModel.addLog('info', 'Verifying site installation');
    
    // Mark as complete
    await job.updateProgress(100);
    await jobModel.markAsCompleted({
      domain,
      ipAddress,
      sslEnabled: true,
      wordpressUrl: `https://${domain}/wp-admin`
    });
    await jobModel.addLog('success', 'Site installation completed successfully');
    
    // Update site status
    await site.markAsActive();
    
    logger.info({ jobId, siteId, domain }, 'Site installation completed');
    
  } catch (error: any) {
    logger.error({ error, jobId, siteId }, 'Site installation failed');
    
    await jobModel.markAsFailed(error);
    await jobModel.addLog('error', `Installation failed: ${error.message}`);
    
    await site.markAsFailed(error.message);
    
    throw error;
  }
}

// Simulation functions (replace with actual implementation)
async function simulatePreflightChecks(ipAddress: string): Promise<void> {
  logger.info({ ipAddress }, 'Simulating pre-flight checks');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function simulateWordOpsInstall(ipAddress: string): Promise<void> {
  logger.info({ ipAddress }, 'Simulating WordOps installation');
  await new Promise(resolve => setTimeout(resolve, 3000));
}

async function simulateTemplateDownload(templateUrl: string): Promise<void> {
  logger.info({ templateUrl }, 'Simulating template download');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function simulateWordPressRestore(domain: string, templateId: string): Promise<void> {
  logger.info({ domain, templateId }, 'Simulating WordPress restore');
  await new Promise(resolve => setTimeout(resolve, 4000));
}

async function simulateDnsConfiguration(domain: string, ipAddress: string): Promise<void> {
  logger.info({ domain, ipAddress }, 'Simulating DNS configuration');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function simulateSslSetup(domain: string): Promise<void> {
  logger.info({ domain }, 'Simulating SSL setup');
  await new Promise(resolve => setTimeout(resolve, 3000));
}

// Create worker only if Redis is available
if (redisConnection) {
  try {
    siteInstallationWorker = new Worker(
      'site-installation',
      processSiteInstallation,
      {
        connection: redisConnection,
        concurrency: 3, // Process up to 3 jobs concurrently
        limiter: {
          max: 10,
          duration: 60000 // Max 10 jobs per minute
        }
      }
    );

    // Worker event handlers
    siteInstallationWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Job completed successfully');
    });

    siteInstallationWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err }, 'Job failed');
    });

    siteInstallationWorker.on('error', (err) => {
      if (err.message?.includes('ECONNREFUSED')) {
        // Suppress Redis connection errors as we already warned about it
        return;
      }
      logger.error({ error: err }, 'Worker error');
    });
  } catch (error) {
    logger.warn('Failed to create worker. BullMQ worker features disabled.');
  }
}

export { siteInstallationWorker };

// Graceful shutdown
export async function shutdownQueues(): Promise<void> {
  if (siteInstallationQueue) {
    await siteInstallationQueue.close();
  }
  if (siteInstallationWorker) {
    await siteInstallationWorker.close();
  }
  if (redisConnection) {
    redisConnection.disconnect();
  }
}