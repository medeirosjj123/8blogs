import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../utils/redis';
import { emailService } from './email.service';
import { KiwifyPurchaseEvent } from '../models/KiwifyPurchaseEvent';
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

interface EmailJobData {
  type: 'welcome' | 'magic_link' | 'credentials' | 'reactivation';
  orderId?: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  magicToken?: string;
  attempt?: number;
  maxAttempts?: number;
  fallbackProviders?: string[];
}

interface CredentialEmailData extends EmailJobData {
  type: 'credentials';
  orderId: string;
  plan: string;
  role: string;
  subscriptionDetails: {
    plan: string;
    blogsLimit: number;
    reviewsLimit: number;
    features: string[];
  };
}

class EmailQueueService {
  private queue: Queue;
  private worker: Worker;
  private redis: any;

  constructor() {
    this.redis = getRedisClient();
    
    // Create email queue with robust retry settings
    // Clone Redis options and set maxRetriesPerRequest to null for BullMQ
    const queueRedis = getRedisClient();
    queueRedis.options.maxRetriesPerRequest = null;
    
    this.queue = new Queue('credential-emails', {
      connection: queueRedis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: 100, // Keep last 100 successful jobs
        removeOnFail: false, // Keep failed jobs for debugging
        delay: 0, // No initial delay
      },
    });

    // Create worker to process email jobs with proper Redis connection for BullMQ
    const workerRedis = getRedisClient();
    // BullMQ requires maxRetriesPerRequest to be null for blocking operations
    workerRedis.options.maxRetriesPerRequest = null;
    
    this.worker = new Worker('credential-emails', this.processEmailJob.bind(this), {
      connection: workerRedis,
      concurrency: 5, // Process up to 5 emails simultaneously
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    this.setupEventHandlers();
    logger.info('✅ Email queue service initialized');
  }

  private setupEventHandlers() {
    // Job completed successfully
    this.worker.on('completed', async (job: Job) => {
      logger.info({ 
        jobId: job.id, 
        type: job.data.type, 
        email: job.data.customerEmail,
        attempts: job.attemptsMade 
      }, 'Email sent successfully');

      // Update tracking if this is a credential email
      if (job.data.orderId && job.data.type === 'credentials') {
        await this.updateCredentialDeliveryStatus(job.data.orderId, true);
      }
    });

    // Job failed permanently
    this.worker.on('failed', async (job: Job | undefined, err: Error) => {
      if (!job) return;

      logger.error({ 
        jobId: job.id, 
        type: job.data.type,
        email: job.data.customerEmail,
        error: err.message,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts 
      }, 'Email delivery failed permanently');

      // Try fallback mechanisms
      await this.handleFailedEmail(job.data, err);

      // Update tracking
      if (job.data.orderId) {
        await this.updateCredentialDeliveryStatus(job.data.orderId, false, err.message);
      }
    });

    // Job stalled (equivalent to retry)
    this.worker.on('stalled', (jobId: string) => {
      logger.warn({
        jobId,
        status: 'stalled'
      }, 'Email job stalled, will be retried');
    });
  }

  private async processEmailJob(job: Job<EmailJobData>) {
    const { type, customerEmail, customerName, magicToken, orderId } = job.data;
    
    logger.info({ 
      jobId: job.id, 
      type, 
      email: customerEmail, 
      attempt: job.attemptsMade + 1 
    }, 'Processing email job');

    try {
      let result;

      switch (type) {
        case 'welcome':
          result = await emailService.sendWelcomeEmail(customerEmail, customerName);
          break;
          
        case 'magic_link':
          if (!magicToken) throw new Error('Magic token required for magic link email');
          result = await emailService.sendMagicLinkEmail(customerEmail, magicToken, customerName);
          break;
          
        case 'credentials':
          const credData = job.data as CredentialEmailData;
          result = await this.sendCredentialEmail(credData);
          break;
          
        case 'reactivation':
          if (!magicToken) throw new Error('Magic token required for reactivation email');
          result = await emailService.sendMagicLinkEmail(customerEmail, magicToken, customerName);
          break;
          
        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      if (!result.success) {
        // Get provider status for debugging
        const providerStatus = emailService.getProviderStatus?.();
        throw new Error(`${result.error || 'Email sending failed'}${providerStatus ? ` (providers: ${providerStatus.providerNames.join(', ')})` : ''}`);
      }

      // Log successful send with provider info
      const providerStatus = emailService.getProviderStatus?.();
      logger.info({
        jobId: job.id,
        type,
        email: customerEmail,
        provider: providerStatus?.currentProvider,
        attempt: job.attemptsMade + 1
      }, 'Email sent successfully');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const providerStatus = emailService.getProviderStatus?.();
      
      // Log the error for debugging with provider context
      logger.error({
        jobId: job.id,
        type,
        email: customerEmail,
        error: errorMessage,
        attempt: job.attemptsMade + 1,
        providerStatus
      }, 'Email job failed');

      throw error; // Re-throw to trigger retry mechanism
    }
  }

  private async sendCredentialEmail(data: CredentialEmailData) {
    const { customerEmail, customerName, plan, subscriptionDetails, magicToken } = data;
    
    // Create comprehensive credential email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #E10600 0%, #FF6B47 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">BH</span>
          </div>
          <h1 style="color: #E10600; margin: 0;">🎉 Bem-vindo ao Blog House!</h1>
          <p style="color: #666; font-size: 18px; margin: 10px 0 0 0;">Sua conta está pronta!</p>
        </div>

        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 25px; border-radius: 16px; border-left: 4px solid #E10600; margin: 30px 0;">
          <h2 style="color: #E10600; margin: 0 0 15px 0;">📋 Detalhes da Sua Assinatura</h2>
          <p style="margin: 10px 0;"><strong>📦 Plano:</strong> ${plan.toUpperCase()}</p>
          <p style="margin: 10px 0;"><strong>🌐 Blogs:</strong> ${subscriptionDetails.blogsLimit === -1 ? 'Ilimitados' : subscriptionDetails.blogsLimit}</p>
          <p style="margin: 10px 0;"><strong>📝 Reviews:</strong> ${subscriptionDetails.reviewsLimit === -1 ? 'Ilimitados' : subscriptionDetails.reviewsLimit}</p>
          ${subscriptionDetails.features.length > 0 ? `
          <p style="margin: 15px 0 5px 0;"><strong>✨ Recursos Inclusos:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px; color: #666;">
            ${subscriptionDetails.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
          ` : ''}
        </div>

        ${magicToken ? `
        <div style="text-align: center; margin: 40px 0;">
          <h3 style="color: #333; margin-bottom: 20px;">🚀 Acesse Sua Conta Agora</h3>
          <a href="${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/magic-link?token=${magicToken}" 
             style="display: inline-block; background: linear-gradient(135deg, #E10600 0%, #FF6B47 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 32px rgba(225, 6, 0, 0.2);">
            🎯 Acessar Minha Conta
          </a>
          <p style="color: #666; font-size: 14px; margin-top: 15px;">Este link expira em 15 minutos</p>
        </div>
        ` : ''}

        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 30px 0;">
          <h3 style="color: #333; margin: 0 0 15px 0;">🎯 Próximos Passos</h3>
          <ol style="color: #666; line-height: 1.6;">
            <li>Clique no botão acima para fazer login</li>
            <li>Explore o painel de controle</li>
            <li>Configure seu primeiro blog</li>
            <li>Comece a gerar conteúdo com IA</li>
          </ol>
        </div>

        <div style="background: linear-gradient(135deg, #f0f0f0 0%, #f8fafc 100%); padding: 16px; border-radius: 12px; margin: 20px 0;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>🆘 Precisa de Ajuda?</strong><br>
            Responda este email ou acesse nossa central de suporte.<br>
            <strong>📞 Suporte:</strong> Segunda a Sexta, 9h às 18h
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <div style="text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © 2024 Blog House - Plataforma para Blogueiros Profissionais<br>
            <strong>Pedido:</strong> ${data.orderId}
          </p>
        </div>
      </div>
    `;

    return emailService.send({
      to: customerEmail,
      subject: `🎉 ${customerName}, sua conta Blog House está pronta! (${plan.toUpperCase()})`,
      html,
      text: `Bem-vindo ao Blog House! Sua conta ${plan} está ativa. ${magicToken ? `Acesse: ${process.env.CLIENT_URL}/auth/magic-link?token=${magicToken}` : 'Faça login em nossa plataforma.'}`
    });
  }

  // Public methods to queue emails
  async queueWelcomeEmail(customerEmail: string, customerName: string, orderId?: string) {
    return this.queue.add('welcome', {
      type: 'welcome',
      customerEmail,
      customerName,
      orderId
    });
  }

  async queueMagicLinkEmail(customerEmail: string, customerName: string, magicToken: string, orderId?: string) {
    return this.queue.add('magic-link', {
      type: 'magic_link',
      customerEmail,
      customerName,
      magicToken,
      orderId
    });
  }

  async queueCredentialEmail(data: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    magicToken: string;
    plan: string;
    role: string;
    subscriptionDetails: {
      plan: string;
      blogsLimit: number;
      reviewsLimit: number;
      features: string[];
    };
  }) {
    return this.queue.add('credentials', {
      type: 'credentials',
      ...data
    }, {
      // High priority for credential emails
      priority: 1,
      // Try immediately, then with delays
      delay: 0
    });
  }

  async queueReactivationEmail(customerEmail: string, customerName: string, magicToken: string, orderId?: string) {
    return this.queue.add('reactivation', {
      type: 'reactivation',
      customerEmail,
      customerName,
      magicToken,
      orderId
    });
  }

  // Fallback mechanisms
  private async handleFailedEmail(jobData: EmailJobData, error: Error) {
    logger.error({
      type: jobData.type,
      email: jobData.customerEmail,
      orderId: jobData.orderId,
      error: error.message
    }, 'Email delivery failed permanently, implementing fallbacks');

    try {
      // Fallback 1: Store credentials for manual access
      if (jobData.type === 'credentials' && jobData.orderId) {
        await this.storeCredentialsForManualAccess(jobData as CredentialEmailData);
      }

      // Fallback 2: Create support alert
      await this.createSupportAlert(jobData, error);

      // Fallback 3: Try SMS if available (future implementation)
      // await this.trySMSFallback(jobData);

    } catch (fallbackError) {
      logger.error({
        originalError: error.message,
        fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown',
        jobData
      }, 'Fallback mechanisms also failed');
    }
  }

  private async storeCredentialsForManualAccess(data: CredentialEmailData) {
    // Store in Redis for quick access
    const key = `manual-credentials:${data.orderId}`;
    const credentials = {
      orderId: data.orderId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      plan: data.plan,
      role: data.role,
      magicToken: data.magicToken,
      subscriptionDetails: data.subscriptionDetails,
      createdAt: new Date(),
      accessAttempts: 0
    };

    await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(credentials)); // 24 hour expiry
    
    logger.info({
      orderId: data.orderId,
      email: data.customerEmail
    }, 'Credentials stored for manual access');
  }

  private async createSupportAlert(jobData: EmailJobData, error: Error) {
    // Create alert in database or send to admin webhook
    const alert = {
      type: 'CREDENTIAL_DELIVERY_FAILED',
      priority: 'HIGH',
      orderId: jobData.orderId,
      customerEmail: jobData.customerEmail,
      customerName: jobData.customerName,
      error: error.message,
      emailType: jobData.type,
      createdAt: new Date(),
      resolved: false
    };

    // Store alert (you can create an Alert model)
    await this.redis.lpush('support-alerts', JSON.stringify(alert));
    
    logger.warn({
      orderId: jobData.orderId,
      email: jobData.customerEmail,
      type: jobData.type
    }, 'Support alert created for failed credential delivery');
  }

  private async updateCredentialDeliveryStatus(orderId: string, success: boolean, error?: string) {
    try {
      const update: any = {
        credentialsDelivered: success,
        emailSent: success
      };

      if (!success && error) {
        update.$push = { errors: { step: 'email_delivery', error, timestamp: new Date() } };
      }

      if (success) {
        update.status = 'success';
        update.completedAt = new Date();
      }

      await KiwifyPurchaseEvent.findOneAndUpdate(
        { orderId },
        update
      );

      logger.info({
        orderId,
        success,
        error
      }, 'Updated credential delivery status');
    } catch (updateError) {
      logger.error({
        orderId,
        error: updateError instanceof Error ? updateError.message : 'Unknown'
      }, 'Failed to update credential delivery status');
    }
  }

  // Health check and stats
  async getQueueStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      health: failed.length / (completed.length + failed.length || 1) < 0.05 ? 'healthy' : 'degraded'
    };
  }

  // Cleanup and shutdown
  async close() {
    await this.worker.close();
    await this.queue.close();
    logger.info('Email queue service closed');
  }
}

// Export singleton instance
export const emailQueueService = new EmailQueueService();