import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../utils/redis';
import { ReviewGenerationJob } from '../models/ReviewGenerationJob';
import pino from 'pino';
import mongoose from 'mongoose';

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

export interface ReviewGenerationJobData {
  jobId: string;
  userId: string;
  type: 'single' | 'bulk';
  config: {
    publishToWordPress: boolean;
    selectedSiteId?: string;
    reviewsData: Array<{
      title: string;
      contentType?: 'bbr' | 'spr' | 'informational';
      products: Array<{
        name: string;
        imageUrl?: string;
        affiliateLink: string;
        pros: string[];
        cons: string[];
        description?: string;
      }>;
      outline?: string[];
    }>;
  };
}

class ReviewQueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redis: any;
  private isInitialized: boolean = false;

  constructor() {
    try {
      this.redis = getRedisClient();
      this.initialize();
    } catch (error) {
      logger.error({ error }, 'Failed to initialize ReviewQueueService');
      this.isInitialized = false;
    }
  }

  private async initialize() {
    try {
      // Check Redis connection before creating queue
      const redisStatus = this.redis.status;
      if (redisStatus !== 'ready' && redisStatus !== 'connecting') {
        throw new Error(`Redis not available. Status: ${redisStatus}`);
      }

      // Use the singleton Redis client for both queue and worker
      this.queue = new Queue('review-generation', {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 second delay
          },
          removeOnComplete: 50, // Keep last 50 successful jobs
          removeOnFail: 20, // Keep last 20 failed jobs for debugging
          delay: 0,
        },
      });

      // Create worker to process review generation jobs
      this.worker = new Worker('review-generation', this.processReviewJob.bind(this), {
        connection: this.redis,
        concurrency: 2, // Process up to 2 review jobs simultaneously
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      });

      this.setupEventHandlers();
      this.isInitialized = true;
      logger.info('✅ Review generation queue service initialized');
    } catch (error) {
      logger.error({ error }, '❌ Failed to initialize queue service');
      this.isInitialized = false;
      // Don't throw - allow the app to start without queue functionality
    }
  }

  private setupEventHandlers() {
    if (!this.worker) return;
    
    // Job started
    this.worker.on('active', async (job: Job) => {
      logger.info({ 
        bullJobId: job.id, 
        jobId: job.data.jobId,
        userId: job.data.userId,
        type: job.data.type 
      }, 'Review generation job started');

      // Update job status in database
      try {
        await ReviewGenerationJob.findOneAndUpdate(
          { bullJobId: job.id },
          { 
            status: 'processing',
            startedAt: new Date(),
            currentStep: 'Starting review generation...'
          }
        );
      } catch (error) {
        logger.error({ error }, 'Failed to update job status to processing');
      }
    });

    // Job completed successfully
    this.worker.on('completed', async (job: Job, result: any) => {
      logger.info({ 
        bullJobId: job.id, 
        jobId: job.data.jobId,
        result: result.summary 
      }, 'Review generation completed successfully');

      // Final update in database is handled by the processor
    });

    // Job failed permanently
    this.worker.on('failed', async (job: Job | undefined, err: Error) => {
      if (!job) return;

      logger.error({ 
        bullJobId: job.id, 
        jobId: job.data.jobId,
        error: err.message,
        attempts: job.attemptsMade 
      }, 'Review generation failed permanently');

      // Update job status in database
      try {
        await ReviewGenerationJob.findOneAndUpdate(
          { bullJobId: job.id },
          { 
            status: 'failed',
            completedAt: new Date(),
            error: {
              message: err.message,
              stack: err.stack
            }
          }
        );
      } catch (error) {
        logger.error({ error }, 'Failed to update job status to failed');
      }
    });

    // Job stalled
    this.worker.on('stalled', (jobId: string) => {
      logger.warn({ bullJobId: jobId }, 'Review generation job stalled');
    });
  }

  private async processReviewJob(job: Job<ReviewGenerationJobData>) {
    const { jobId, userId, type, config } = job.data;
    
    logger.info({ 
      bullJobId: job.id, 
      jobId, 
      userId, 
      type,
      reviewCount: config.reviewsData.length 
    }, 'Processing review generation job');

    try {
      // Add type logging to understand the issue
      logger.info({ 
        bullJobId: job.id,
        bullJobIdType: typeof job.id,
        bullJobIdString: job.id?.toString()
      }, 'Searching for job in database');

      // Get the job from database with retry logic - FIX: Convert job.id to string for consistency
      let dbJob = await ReviewGenerationJob.findOne({ bullJobId: job.id?.toString() });
      
      // If not found, try a few more times with delays (database might still be committing)
      let attempts = 0;
      while (!dbJob && attempts < 3) {
        logger.warn({ 
          bullJobId: job.id, 
          bullJobIdString: job.id?.toString(),
          jobId, 
          attempt: attempts + 1 
        }, 'Job not found in database, retrying...');
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
        dbJob = await ReviewGenerationJob.findOne({ bullJobId: job.id?.toString() });
        attempts++;
      }
      
      if (!dbJob) {
        throw new Error('Job not found in database after multiple attempts');
      }

      await dbJob.markAsStarted();

      // Import the review generation logic from reviewController
      const { generateSingleReviewWithData } = await import('../controllers/reviewController');
      
      const results = {
        completed: [],
        failed: [],
        stats: {
          totalTokens: 0,
          totalCost: 0,
          totalTime: 0
        }
      };

      // Process each review
      for (let i = 0; i < config.reviewsData.length; i++) {
        const reviewData = config.reviewsData[i];
        const stepMessage = `Generating review ${i + 1}/${config.reviewsData.length}: ${reviewData.title}`;
        
        await dbJob.updateProgress(i, stepMessage);
        await job.updateProgress((i / config.reviewsData.length) * 100);

        try {
          const startTime = Date.now();
          
          // Generate the review
          const review = await generateSingleReviewWithData({
            userId: new mongoose.Types.ObjectId(userId),
            title: reviewData.title,
            contentType: reviewData.contentType || 'bbr',
            products: reviewData.products || [],
            outline: reviewData.outline || []
          });

          const generationTime = Date.now() - startTime;

          // Handle WordPress publishing if enabled
          let wordpressUrl = undefined;
          if (config.publishToWordPress && config.selectedSiteId && review) {
            try {
              const { publishReviewToWordPress } = await import('../controllers/reviewController');
              const publishResult = await publishReviewToWordPress(
                review._id.toString(),
                config.selectedSiteId,
                userId
              );
              
              if (publishResult.success) {
                wordpressUrl = publishResult.url;
              }
            } catch (publishError: any) {
              logger.warn({ 
                error: publishError.message,
                reviewId: review._id,
                title: reviewData.title 
              }, 'WordPress publishing failed, but review generation succeeded');
            }
          }

          // Add successful result
          await dbJob.addResult({
            reviewId: review._id,
            title: reviewData.title,
            status: 'success',
            wordpressUrl
          });

          // Add stats
          await dbJob.addStats({
            tokensUsed: review.metadata?.tokensUsed?.total || 0,
            cost: review.metadata?.cost || 0,
            generationTime
          });

          results.completed.push({
            title: reviewData.title,
            reviewId: review._id,
            status: 'success',
            wordpressUrl,
            generationTime
          });

          results.stats.totalTokens += review.metadata?.tokensUsed?.total || 0;
          results.stats.totalCost += review.metadata?.cost || 0;
          results.stats.totalTime += generationTime;

          logger.info({ 
            bullJobId: job.id,
            reviewIndex: i + 1,
            title: reviewData.title,
            reviewId: review._id,
            tokensUsed: review.metadata?.tokensUsed?.total || 0,
            cost: review.metadata?.cost || 0,
            generationTime,
            wordpressUrl 
          }, 'Review generated successfully');

        } catch (reviewError: any) {
          logger.error({ 
            bullJobId: job.id,
            reviewIndex: i + 1,
            title: reviewData.title,
            error: reviewError.message 
          }, 'Failed to generate review');

          // Add failed result
          await dbJob.addResult({
            title: reviewData.title,
            status: 'failed',
            error: reviewError.message
          });

          results.failed.push({
            title: reviewData.title,
            error: reviewError.message
          });
        }
      }

      // Mark job as completed
      await dbJob.markAsCompleted();
      await job.updateProgress(100);

      const summary = {
        total: config.reviewsData.length,
        completed: results.completed.length,
        failed: results.failed.length,
        stats: results.stats
      };

      logger.info({ 
        bullJobId: job.id,
        jobId,
        summary 
      }, 'Review generation job completed');

      return {
        success: true,
        results,
        summary
      };

    } catch (error: any) {
      logger.error({ 
        bullJobId: job.id,
        jobId,
        error: error.message,
        stack: error.stack 
      }, 'Review generation job failed');

      // Update database
      try {
        const dbJob = await ReviewGenerationJob.findOne({ bullJobId: job.id?.toString() });
        if (dbJob) {
          await dbJob.markAsFailed(error);
        }
      } catch (updateError) {
        logger.error({ updateError }, 'Failed to update job status after failure');
      }

      throw error;
    }
  }

  // Public methods to queue reviews
  async queueBulkReviewGeneration(data: {
    userId: string;
    reviewsData: Array<{
      title: string;
      contentType?: 'bbr' | 'spr' | 'informational';
      products: Array<{
        name: string;
        imageUrl?: string;
        affiliateLink: string;
        pros: string[];
        cons: string[];
        description?: string;
      }>;
      outline?: string[];
    }>;
    publishToWordPress?: boolean;
    selectedSiteId?: string;
  }) {
    if (!this.isInitialized || !this.queue) {
      throw new Error('Queue service is not initialized. Redis may be unavailable.');
    }
    try {
      // Create job in database first
      const reviewJob = new ReviewGenerationJob({
        userId: new mongoose.Types.ObjectId(data.userId),
        type: 'bulk',
        progress: {
          current: 0,
          total: data.reviewsData.length,
          percentage: 0
        },
        config: {
          publishToWordPress: data.publishToWordPress || false,
          selectedSiteId: data.selectedSiteId ? new mongoose.Types.ObjectId(data.selectedSiteId) : undefined,
          reviewsData: data.reviewsData
        },
        results: {
          completed: [],
          stats: {
            totalReviews: 0,
            successfulReviews: 0,
            failedReviews: 0,
            totalTokensUsed: 0,
            totalCost: 0,
            totalGenerationTime: 0
          }
        },
        queuedAt: new Date()
      });

      // Generate a unique job ID for BullMQ that we can use consistently
      const bullJobId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Set the bullJobId before saving to avoid race condition
      reviewJob.bullJobId = bullJobId;
      
      // Save database record first
      await reviewJob.save();
      
      // Create BullMQ job with the same ID - no delay needed since DB record already exists
      const bullJob = await this.queue.add('bulk-review-generation', {
        jobId: reviewJob._id.toString(),
        userId: data.userId,
        type: 'bulk',
        config: {
          publishToWordPress: data.publishToWordPress || false,
          selectedSiteId: data.selectedSiteId,
          reviewsData: data.reviewsData
        }
      }, {
        jobId: bullJobId, // Use our pre-generated ID
        delay: 0 // No delay needed since DB record exists
      });

      // Verify the BullMQ job ID matches what we expected
      if (bullJob.id!.toString() !== bullJobId) {
        logger.warn({
          expectedId: bullJobId,
          actualId: bullJob.id!.toString(),
          jobId: reviewJob._id
        }, 'BullMQ job ID mismatch - this should not happen');
      }

      // Database record is already saved with the correct bullJobId

      logger.info({
        jobId: reviewJob._id,
        bullJobId: bullJob.id,
        userId: data.userId,
        reviewCount: data.reviewsData.length
      }, 'Bulk review generation job queued');

      return {
        success: true,
        jobId: reviewJob._id.toString(),
        bullJobId: bullJob.id!.toString(),
        estimatedTime: data.reviewsData.length * 15 // 15 seconds per review estimate
      };

    } catch (error: any) {
      logger.error({ 
        error: error.message,
        userId: data.userId 
      }, 'Failed to queue bulk review generation');

      throw error;
    }
  }

  async queueSingleReviewGeneration(data: {
    userId: string;
    reviewData: {
      title: string;
      contentType?: 'bbr' | 'spr' | 'informational';
      products: Array<{
        name: string;
        imageUrl?: string;
        affiliateLink: string;
        pros: string[];
        cons: string[];
        description?: string;
      }>;
      outline?: string[];
    };
    publishToWordPress?: boolean;
    selectedSiteId?: string;
  }) {
    try {
      // Create job in database first
      const reviewJob = new ReviewGenerationJob({
        userId: new mongoose.Types.ObjectId(data.userId),
        type: 'single',
        progress: {
          current: 0,
          total: 1,
          percentage: 0
        },
        config: {
          publishToWordPress: data.publishToWordPress || false,
          selectedSiteId: data.selectedSiteId ? new mongoose.Types.ObjectId(data.selectedSiteId) : undefined,
          reviewsData: [data.reviewData]
        },
        results: {
          completed: [],
          stats: {
            totalReviews: 0,
            successfulReviews: 0,
            failedReviews: 0,
            totalTokensUsed: 0,
            totalCost: 0,
            totalGenerationTime: 0
          }
        },
        bullJobId: '', // Will be updated after BullMQ job is created
        queuedAt: new Date()
      });

      // Create BullMQ job
      const bullJob = await this.queue.add('single-review-generation', {
        jobId: reviewJob._id.toString(),
        userId: data.userId,
        type: 'single',
        config: {
          publishToWordPress: data.publishToWordPress || false,
          selectedSiteId: data.selectedSiteId,
          reviewsData: [data.reviewData]
        }
      });

      // Update database job with BullMQ job ID
      reviewJob.bullJobId = bullJob.id!.toString();
      await reviewJob.save();

      logger.info({
        jobId: reviewJob._id,
        bullJobId: bullJob.id,
        userId: data.userId,
        title: data.reviewData.title
      }, 'Single review generation job queued');

      return {
        success: true,
        jobId: reviewJob._id.toString(),
        bullJobId: bullJob.id!.toString(),
        estimatedTime: 15 // 15 seconds estimate
      };

    } catch (error: any) {
      logger.error({ 
        error: error.message,
        userId: data.userId 
      }, 'Failed to queue single review generation');

      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId: string) {
    try {
      console.log('🔍 [GET-JOB-STATUS] Looking for job:', { jobId, jobIdType: typeof jobId });
      
      const job = await ReviewGenerationJob.findById(jobId);
      
      console.log('🔍 [GET-JOB-STATUS] Database result:', { 
        jobFound: !!job,
        jobId: job?._id?.toString(),
        bullJobId: job?.bullJobId,
        status: job?.status 
      });
      
      if (!job) {
        console.warn('❌ [GET-JOB-STATUS] Job not found in database:', { jobId });
        return { success: false, error: 'Job not found' };
      }

      // Also get BullMQ job status
      const bullJob = await this.queue.getJob(job.bullJobId);
      
      const jobResponse = {
        id: job._id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        results: job.results,
        error: job.error,
        queuedAt: job.queuedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        bullJob: bullJob ? {
          id: bullJob.id,
          progress: bullJob.progress,
          processedOn: bullJob.processedOn,
          finishedOn: bullJob.finishedOn,
          failedReason: bullJob.failedReason
        } : null
      };

      console.log('📤 [GET-JOB-STATUS] Returning job data:', {
        jobId,
        status: jobResponse.status,
        progress: jobResponse.progress,
        currentStep: jobResponse.currentStep,
        resultsCompletedCount: jobResponse.results?.completed?.length || 0,
        bullJobFound: !!bullJob,
        fullResponse: JSON.stringify(jobResponse, null, 2)
      });
      
      return {
        success: true,
        job: jobResponse
      };
    } catch (error: any) {
      logger.error({ error, jobId }, 'Failed to get job status');
      return { success: false, error: error.message };
    }
  }

  // Get user jobs
  async getUserJobs(userId: string, limit: number = 10) {
    try {
      const jobs = await ReviewGenerationJob.findRecentJobsForUser(
        new mongoose.Types.ObjectId(userId),
        limit
      );

      return {
        success: true,
        jobs: jobs.map(job => ({
          id: job._id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          config: {
            publishToWordPress: job.config.publishToWordPress,
            reviewCount: job.config.reviewsData.length
          },
          results: job.results,
          error: job.error,
          queuedAt: job.queuedAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt
        }))
      };
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to get user jobs');
      return { success: false, error: error.message };
    }
  }

  // Health check and stats
  async getQueueStats() {
    if (!this.isInitialized || !this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        error: 'Queue service not initialized'
      };
    }
    
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        health: failed.length / (completed.length + failed.length || 1) < 0.1 ? 'healthy' : 'degraded'
      };
    } catch (error) {
      logger.error({ error }, 'Error getting queue stats');
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        error: 'Failed to get queue stats',
        health: 'error'
      };
    }
  }

  // Cleanup and shutdown
  async close() {
    try {
      if (this.worker) {
        await this.worker.close();
      }
      if (this.queue) {
        await this.queue.close();
      }
      logger.info('Review queue service closed');
    } catch (error) {
      logger.error({ error }, 'Error closing review queue service');
    }
  }
}

// Export singleton instance
export const reviewQueueService = new ReviewQueueService();