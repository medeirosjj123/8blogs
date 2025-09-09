import express from 'express';
import { Request, Response } from 'express';
import { AuthRequest, authenticate } from '../middlewares/authMiddleware';
import { Installation } from '../models/Installation';
import { WordPressSite } from '../models/WordPressSite';
import { debugLogger } from '../middlewares/debugMiddleware';

const router = express.Router();

// Only enable debug routes in development or when explicitly enabled
const isDebugEnabled = () => {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG === 'true';
};

// Middleware to check if debug is enabled
const requireDebugMode = (req: Request, res: Response, next: Function) => {
  if (!isDebugEnabled()) {
    return res.status(404).json({ message: 'Not found' });
  }
  next();
};

// Get all WordPress-related data for a user
router.get('/wordpress-data/:userId?', requireDebugMode, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId || req.user?.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required'
      });
    }

    debugLogger.info({
      requestId: (req as any).debugId,
      targetUserId,
      requestedBy: req.user?.userId
    }, 'Debug: Fetching WordPress data for user');

    // Get all WordPress sites
    const wordPressSites = await WordPressSite.find({ userId: targetUserId })
      .select('-applicationPassword') // Don't return encrypted passwords
      .sort({ createdAt: -1 });

    // Get all Installation records
    const installations = await Installation.find({ userId: targetUserId })
      .sort({ createdAt: -1 });

    // Filter installations by WordPress-related templates
    const wordpressInstallations = installations.filter(installation => 
      ['wordpress-hosting', 'raw-wordpress', 'existing-wordpress'].includes(installation.templateId)
    );

    // Get duplicate analysis
    const duplicateAnalysis = await analyzeWordPressDuplicates(targetUserId);

    debugLogger.info({
      requestId: (req as any).debugId,
      targetUserId,
      wordPressSitesCount: wordPressSites.length,
      installationsCount: installations.length,
      wordpressInstallationsCount: wordpressInstallations.length
    }, 'Debug: WordPress data fetched');

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        wordPressSites: wordPressSites.map(site => ({
          _id: site._id,
          name: site.name,
          url: site.url,
          domain: site.domain,
          username: site.username,
          siteType: site.siteType,
          isActive: site.isActive,
          testConnection: site.testConnection,
          createdAt: site.createdAt,
          updatedAt: site.updatedAt
        })),
        installations: installations.map(installation => ({
          _id: installation._id,
          domain: installation.domain,
          templateId: installation.templateId,
          status: installation.status,
          siteInfo: installation.siteInfo,
          installationOptions: installation.installationOptions,
          createdAt: installation.createdAt,
          completedAt: installation.completedAt
        })),
        wordpressInstallations: wordpressInstallations.map(installation => ({
          _id: installation._id,
          domain: installation.domain,
          templateId: installation.templateId,
          status: installation.status,
          siteInfo: installation.siteInfo,
          createdAt: installation.createdAt,
          completedAt: installation.completedAt
        })),
        duplicateAnalysis,
        summary: {
          totalWordPressSites: wordPressSites.length,
          totalInstallations: installations.length,
          wordpressInstallations: wordpressInstallations.length,
          potentialDuplicates: duplicateAnalysis.duplicateGroups.length
        }
      }
    });
  } catch (error: any) {
    debugLogger.error({
      requestId: (req as any).debugId,
      error: error.message,
      targetUserId: req.params.userId
    }, 'Debug: Error fetching WordPress data');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch WordPress data',
      error: error.message
    });
  }
});

// Analyze potential duplicates
async function analyzeWordPressDuplicates(userId: string) {
  const wordPressSites = await WordPressSite.find({ userId });
  const installations = await Installation.find({ 
    userId, 
    templateId: { $in: ['wordpress-hosting', 'raw-wordpress', 'existing-wordpress'] } 
  });

  const duplicateGroups = [];
  const allSites = [];

  // Normalize WordPress sites
  for (const site of wordPressSites) {
    allSites.push({
      id: site._id,
      type: 'WordPressSite',
      url: site.url,
      domain: site.domain,
      name: site.name,
      createdAt: site.createdAt,
      data: site
    });
  }

  // Normalize installations
  for (const installation of installations) {
    const url = installation.siteInfo?.accessUrl || `https://${installation.domain}`;
    allSites.push({
      id: installation._id,
      type: 'Installation',
      url: url,
      domain: installation.domain,
      name: installation.installationOptions?.siteName || installation.domain,
      createdAt: installation.createdAt,
      data: installation
    });
  }

  // Group by domain/URL
  const siteGroups = new Map();
  
  for (const site of allSites) {
    const normalizedUrl = site.url?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const domain = site.domain?.toLowerCase();
    
    const key = normalizedUrl || domain;
    if (!key) continue;

    if (!siteGroups.has(key)) {
      siteGroups.set(key, []);
    }
    siteGroups.get(key).push(site);
  }

  // Find groups with multiple entries (potential duplicates)
  for (const [key, sites] of siteGroups.entries()) {
    if (sites.length > 1) {
      duplicateGroups.push({
        key,
        sites: sites.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        count: sites.length
      });
    }
  }

  return {
    duplicateGroups,
    totalSites: allSites.length,
    uniqueDomains: siteGroups.size
  };
}

// Test duplicate detection for a specific URL
router.post('/test-duplicate-check', requireDebugMode, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    const userId = req.user?.userId;

    if (!url || !userId) {
      return res.status(400).json({
        success: false,
        message: 'URL and user ID required'
      });
    }

    debugLogger.info({
      requestId: (req as any).debugId,
      url,
      userId
    }, 'Debug: Testing duplicate check');

    const normalizedUrl = url.trim().toLowerCase().replace(/\/+$/, '');
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname;

    // Check WordPressSite duplicates
    const existingWordPressSite = await WordPressSite.findOne({
      userId,
      $or: [
        { url: { $regex: new RegExp(`^${normalizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`, 'i') } },
        { domain: hostname },
        { url: { $regex: new RegExp(`^https?://${hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`, 'i') } }
      ]
    });

    // Check Installation duplicates
    const existingInstallation = await Installation.find({
      userId,
      $or: [
        { domain: hostname },
        { 'siteInfo.accessUrl': normalizedUrl }
      ]
    });

    const result = {
      success: true,
      data: {
        url,
        normalizedUrl,
        hostname,
        userId,
        duplicates: {
          wordPressSite: existingWordPressSite ? {
            _id: existingWordPressSite._id,
            url: existingWordPressSite.url,
            domain: existingWordPressSite.domain,
            createdAt: existingWordPressSite.createdAt
          } : null,
          installations: existingInstallation.map(inst => ({
            _id: inst._id,
            domain: inst.domain,
            templateId: inst.templateId,
            status: inst.status,
            accessUrl: inst.siteInfo?.accessUrl,
            createdAt: inst.createdAt
          }))
        },
        hasDuplicates: !!existingWordPressSite || existingInstallation.length > 0
      }
    };

    debugLogger.info({
      requestId: (req as any).debugId,
      result: result.data
    }, 'Debug: Duplicate check completed');

    res.json(result);
  } catch (error: any) {
    debugLogger.error({
      requestId: (req as any).debugId,
      error: error.message,
      url: req.body.url
    }, 'Debug: Error testing duplicate check');

    res.status(500).json({
      success: false,
      message: 'Failed to test duplicate check',
      error: error.message
    });
  }
});

// Get database collection stats
router.get('/database-stats', requireDebugMode, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    debugLogger.info({
      requestId: (req as any).debugId
    }, 'Debug: Fetching database stats');

    const [
      totalWordPressSites,
      totalInstallations,
      wordpressInstallations,
      recentWordPressSites,
      recentInstallations
    ] = await Promise.all([
      WordPressSite.countDocuments(),
      Installation.countDocuments(),
      Installation.countDocuments({ 
        templateId: { $in: ['wordpress-hosting', 'raw-wordpress', 'existing-wordpress'] } 
      }),
      WordPressSite.find().sort({ createdAt: -1 }).limit(10).select('url domain createdAt'),
      Installation.find().sort({ createdAt: -1 }).limit(10).select('domain templateId status createdAt')
    ]);

    res.json({
      success: true,
      data: {
        collections: {
          wordPressSites: {
            total: totalWordPressSites,
            recent: recentWordPressSites
          },
          installations: {
            total: totalInstallations,
            wordpressRelated: wordpressInstallations,
            recent: recentInstallations
          }
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    debugLogger.error({
      requestId: (req as any).debugId,
      error: error.message
    }, 'Debug: Error fetching database stats');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch database stats',
      error: error.message
    });
  }
});

// Clean up test/duplicate records
router.delete('/cleanup-test-sites', requireDebugMode, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    debugLogger.info({
      requestId: (req as any).debugId,
      userId
    }, 'Debug: Cleaning up test sites');

    // Remove test WordPress sites (containing 'teste' in URL)
    const deletedWordPressSites = await WordPressSite.deleteMany({
      userId,
      $or: [
        { url: /teste/i },
        { domain: /teste/i },
        { name: /teste/i }
      ]
    });

    // Remove test installations
    const deletedInstallations = await Installation.deleteMany({
      userId,
      domain: /teste/i
    });

    debugLogger.info({
      requestId: (req as any).debugId,
      deletedWordPressSites: deletedWordPressSites.deletedCount,
      deletedInstallations: deletedInstallations.deletedCount
    }, 'Debug: Test sites cleanup completed');

    res.json({
      success: true,
      data: {
        deletedWordPressSites: deletedWordPressSites.deletedCount,
        deletedInstallations: deletedInstallations.deletedCount,
        total: deletedWordPressSites.deletedCount + deletedInstallations.deletedCount
      }
    });
  } catch (error: any) {
    debugLogger.error({
      requestId: (req as any).debugId,
      error: error.message
    }, 'Debug: Error cleaning up test sites');

    res.status(500).json({
      success: false,
      message: 'Failed to clean up test sites',
      error: error.message
    });
  }
});

export default router;