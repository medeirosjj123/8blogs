import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getUsageStatus } from '../middlewares/usageLimitsMiddleware';

export const getUserUsage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const usageStatus = await getUsageStatus(userId);

    res.json({
      success: true,
      data: usageStatus
    });
  } catch (error: any) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage data'
    });
  }
};