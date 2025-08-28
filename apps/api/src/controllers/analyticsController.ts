import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { AuthRequest } from '../middlewares/authMiddleware';
import { startOfDay, subDays } from 'date-fns';

// Get content generation analytics
export const getContentAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = startOfDay(subDays(new Date(), daysNum));

    // Get all reviews in date range
    const reviews = await Review.find({
      createdAt: { $gte: startDate }
    })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

    // Calculate totals
    let totalTokens = 0;
    let totalCost = 0;
    let totalTime = 0;
    const byType = {
      bbr: { count: 0, tokens: 0, cost: 0 },
      spr: { count: 0, tokens: 0, cost: 0 },
      informational: { count: 0, tokens: 0, cost: 0 }
    };

    // Daily stats aggregation
    const dailyStatsMap = new Map<string, { count: number; tokens: number; cost: number }>();

    reviews.forEach(review => {
      const tokens = review.metadata?.tokensUsed?.total || 0;
      const cost = review.metadata?.cost || 0;
      const time = review.metadata?.generationTime || 0;
      const type = review.contentType || 'bbr';

      totalTokens += tokens;
      totalCost += cost;
      totalTime += time;

      // By type stats
      if (byType[type as keyof typeof byType]) {
        byType[type as keyof typeof byType].count++;
        byType[type as keyof typeof byType].tokens += tokens;
        byType[type as keyof typeof byType].cost += cost;
      }

      // Daily stats
      const dateKey = review.createdAt.toISOString().split('T')[0];
      const existing = dailyStatsMap.get(dateKey) || { count: 0, tokens: 0, cost: 0 };
      existing.count++;
      existing.tokens += tokens;
      existing.cost += cost;
      dailyStatsMap.set(dateKey, existing);
    });

    // Convert daily stats to array
    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get recent content (last 20)
    const recentContent = reviews.slice(0, 20).map(review => ({
      _id: review._id,
      title: review.title,
      contentType: review.contentType || 'bbr',
      metadata: {
        tokensUsed: review.metadata?.tokensUsed || { total: 0 },
        cost: review.metadata?.cost || 0,
        generationTime: review.metadata?.generationTime || 0,
        provider: review.metadata?.provider || 'unknown',
        model: review.metadata?.model || 'unknown'
      },
      createdAt: review.createdAt,
      userId: review.userId
    }));

    const averageTime = reviews.length > 0 ? totalTime / reviews.length : 0;

    res.json({
      success: true,
      data: {
        totalGenerated: reviews.length,
        totalTokens,
        totalCost,
        averageTime,
        byType,
        recentContent,
        dailyStats
      }
    });
  } catch (error: any) {
    console.error('Error fetching content analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

// Get user-specific content stats
export const getUserContentStats = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = startOfDay(subDays(new Date(), daysNum));

    const reviews = await Review.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    let totalTokens = 0;
    let totalCost = 0;
    const contentByType: Record<string, number> = {};

    reviews.forEach(review => {
      totalTokens += review.metadata?.tokensUsed?.total || 0;
      totalCost += review.metadata?.cost || 0;
      
      const type = review.contentType || 'bbr';
      contentByType[type] = (contentByType[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalContent: reviews.length,
        totalTokens,
        totalCost,
        contentByType,
        recentContent: reviews.slice(0, 10).map(r => ({
          _id: r._id,
          title: r.title,
          contentType: r.contentType,
          createdAt: r.createdAt
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching user content stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stats'
    });
  }
};