import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { WordPressSite } from '../models/WordPressSite';
import { AuthRequest } from './authMiddleware';
import { applyPlanDefaults } from '../utils/planConfig';

interface UsageLimitOptions {
  action: 'review_generation' | 'blog_creation' | 'bulk_review_generation';
  skipCheck?: boolean;
  bulkCount?: number;
}

export const checkUsageLimit = (options: UsageLimitOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Skip check if specified (useful for testing)
      if (options.skipCheck) {
        next();
        return;
      }

      // Get user with subscription data
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Get subscription data with defaults
      let subscription = user.subscription || applyPlanDefaults('starter');
      
      // MIGRATION: Update users with old reviewsLimit values to new plan defaults  
      if (subscription.reviewsLimit === 30 && subscription.plan === 'starter') {
        console.log('[MIGRATION] Updating starter plan reviewsLimit from 30 to 40 during usage check');
        subscription.reviewsLimit = 40;
        user.subscription = subscription;
        await user.save();
      }

      switch (options.action) {
        case 'review_generation':
          await checkReviewLimit(subscription, res, next);
          break;
        
        case 'bulk_review_generation':
          await checkBulkReviewLimit(subscription, options.bulkCount || 1, res, next);
          break;
        
        case 'blog_creation':
          await checkBlogLimit(subscription, userId, res, next);
          break;
          
        default:
          next();
      }
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

async function checkReviewLimit(
  subscription: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { reviewsLimit, reviewsUsed } = subscription;

  // Unlimited for premium users
  if (reviewsLimit === -1) {
    next();
    return;
  }

  // Check if limit exceeded
  if (reviewsUsed >= reviewsLimit) {
    res.status(429).json({
      success: false,
      error: 'Review generation limit exceeded',
      message: `Você atingiu o limite de ${reviewsLimit} reviews para este mês.`,
      limitInfo: {
        used: reviewsUsed,
        limit: reviewsLimit,
        plan: subscription.plan,
        upgradeRequired: true
      }
    });
    return;
  }

  // Warning at 80% usage
  const usagePercentage = (reviewsUsed / reviewsLimit) * 100;
  if (usagePercentage >= 80) {
    // Add warning header but continue
    res.setHeader('X-Usage-Warning', 'true');
    res.setHeader('X-Usage-Percentage', usagePercentage.toString());
  }

  next();
}

async function checkBulkReviewLimit(
  subscription: any,
  bulkCount: number,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { reviewsLimit, reviewsUsed } = subscription;

  // Unlimited for premium users
  if (reviewsLimit === -1) {
    next();
    return;
  }

  // Check if bulk operation would exceed limit
  const remainingReviews = reviewsLimit - reviewsUsed;
  if (bulkCount > remainingReviews) {
    res.status(429).json({
      success: false,
      error: 'Bulk review generation would exceed limit',
      message: `Você tem ${remainingReviews} reviews restantes, mas está tentando gerar ${bulkCount} reviews.`,
      limitInfo: {
        used: reviewsUsed,
        limit: reviewsLimit,
        remaining: remainingReviews,
        requested: bulkCount,
        plan: subscription.plan,
        upgradeRequired: true
      }
    });
    return;
  }

  // Warning at 80% usage after bulk operation
  const newUsage = reviewsUsed + bulkCount;
  const usagePercentage = (newUsage / reviewsLimit) * 100;
  if (usagePercentage >= 80) {
    // Add warning header but continue
    res.setHeader('X-Usage-Warning', 'true');
    res.setHeader('X-Usage-Percentage', usagePercentage.toString());
  }

  next();
}

async function checkBlogLimit(
  subscription: any,
  userId: string,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { blogsLimit } = subscription;

  // Unlimited for premium users
  if (blogsLimit === -1) {
    next();
    return;
  }

  // Count current active blogs
  const activeBlogs = await WordPressSite.countDocuments({ 
    userId, 
    isActive: true 
  });

  // Check if limit exceeded
  if (activeBlogs >= blogsLimit) {
    res.status(429).json({
      success: false,
      error: 'Blog creation limit exceeded',
      message: `Você atingiu o limite de ${blogsLimit} ${blogsLimit === 1 ? 'blog' : 'blogs'} para seu plano.`,
      limitInfo: {
        used: activeBlogs,
        limit: blogsLimit,
        plan: subscription.plan,
        upgradeRequired: true
      }
    });
    return;
  }

  next();
}

export const trackUsage = (action: 'review_generated' | 'blog_created' | 'bulk_reviews_generated') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        next();
        return;
      }

      switch (action) {
        case 'review_generated':
          await incrementReviewUsage(userId);
          break;
        
        case 'bulk_reviews_generated':
          // For bulk reviews, increment by the number of successful reviews
          const reviewCount = res.locals.reviewCount || 1;
          await incrementReviewUsage(userId, reviewCount);
          break;
        
        case 'blog_created':
          // Blog creation is tracked by the active count in WordPressSite model
          // No need to increment anything here
          break;
      }

      next();
    } catch (error) {
      console.error('Usage tracking error:', error);
      // Continue even if tracking fails
      next();
    }
  };
};

async function incrementReviewUsage(userId: string, count: number = 1): Promise<void> {
  try {
    const user = await User.findById(userId);
    if (!user || !user.subscription) {
      return;
    }

    // Don't increment for unlimited users
    if (user.subscription.reviewsLimit === -1) {
      return;
    }

    // Check if we need to reset monthly usage
    const now = new Date();
    const resetDate = user.subscription.nextResetDate;
    
    if (resetDate && now >= resetDate) {
      // Reset usage and set next reset date
      const nextReset = new Date(now);
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);

      user.subscription.reviewsUsed = count; // Start fresh with this count
      user.subscription.nextResetDate = nextReset;
    } else {
      // Increment usage
      user.subscription.reviewsUsed += count;
    }

    await user.save();
  } catch (error) {
    console.error('Failed to increment review usage:', error);
    // Don't throw - usage tracking should be non-blocking
  }
}

export const getUsageStatus = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let subscription = user.subscription || applyPlanDefaults('starter');
    
    // MIGRATION: Update users with old reviewsLimit values to new plan defaults
    if (subscription.reviewsLimit === 30 && subscription.plan === 'starter') {
      console.log('[MIGRATION] Updating starter plan reviewsLimit from 30 to 40');
      subscription.reviewsLimit = 40;
      user.subscription = subscription;
      await user.save();
    }
    
    // Debug logging
    console.log('[DEBUG] User plan:', subscription.plan);
    console.log('[DEBUG] Features:', subscription.features);

    // Get active blogs count
    const activeBlogs = await WordPressSite.countDocuments({ 
      userId, 
      isActive: true 
    });

    const result = {
      plan: subscription.plan,
      usage: {
        blogs: {
          used: activeBlogs,
          limit: subscription.blogsLimit,
          percentage: subscription.blogsLimit === -1 ? 0 : (activeBlogs / subscription.blogsLimit) * 100
        },
        reviews: {
          used: subscription.reviewsUsed,
          limit: subscription.reviewsLimit,
          percentage: subscription.reviewsLimit === -1 ? 0 : (subscription.reviewsUsed / subscription.reviewsLimit) * 100
        }
      },
      features: subscription.features,
      nextResetDate: subscription.nextResetDate,
      timestamp: Date.now() // Force cache bust
    };
    
    console.log('[DEBUG] Final result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Failed to get usage status:', error);
    throw error;
  }
};