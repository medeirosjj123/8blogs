import { Router } from 'express';
import {
  getTemplates,
  createSite,
  getUserSites,
  getSite,
  getJobStatus,
  generateInstallationCommand,
  getInstallationHistory,
  getInstallationDetails,
  removeWordPress,
  backupWordPress,
  addWordPressSite,
  detectWordPressSite,
  addExistingSite
} from '../controllers/siteInstallerController';
import {
  testVPSConnection,
  generateInstallationScript
} from '../controllers/generateInstallationScript';
import {
  executeInstallation,
  getInstallationStatus,
  getInstallationLogs,
  cancelInstallation
} from '../controllers/executeInstallation';
import { authenticate } from '../middlewares/authMiddleware';
import { checkUsageLimit, trackUsage } from '../middlewares/usageLimitsMiddleware';

const router = Router();

// Temporary unrestricted endpoints (before auth middleware)
router.get('/temp-admin-check/:email', async (req: any, res) => {
  try {
    const { email } = req.params;
    
    const { Installation } = require('../models/Installation');
    const { Site } = require('../models/Site');
    const User = require('../models/User').User;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ error: 'User not found', email });
    }
    
    // Get their sites and installations
    const [sites, installations] = await Promise.all([
      Site.find({ userId: user._id }),
      Installation.find({ userId: user._id })
    ]);
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      sites: {
        count: sites.length,
        data: sites.map(site => ({
          id: site._id,
          domain: site.domain,
          status: site.status,
          createdAt: site.createdAt
        }))
      },
      installations: {
        count: installations.length,
        data: installations.map(inst => ({
          id: inst._id,
          domain: inst.domain,
          status: inst.status,
          isExisting: inst.installationOptions?.isExisting,
          templateId: inst.templateId,
          createdAt: inst.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// All site routes require authentication (except temp ones above)
router.use(authenticate);

// Template routes
router.get('/templates', getTemplates);

// Site management
router.get('/', getUserSites);
router.post('/', 
  checkUsageLimit({ action: 'blog_creation' }),
  createSite,
  trackUsage('blog_created')
);
router.get('/:siteId', getSite);
router.put('/:siteId', async (req: any, res) => {
  try {
    const { siteId } = req.params;
    const { googleAnalyticsId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    // Try to find in Installation model first (most likely)
    const { Installation } = require('../models/Installation');
    let installation = await Installation.findOne({
      _id: siteId,
      userId: userId
    });

    if (installation) {
      // Update Installation
      installation.installationOptions = installation.installationOptions || {};
      installation.installationOptions.googleAnalyticsId = googleAnalyticsId;
      await installation.save();
      
      return res.json({
        success: true,
        message: 'Google Analytics ID updated successfully'
      });
    }

    // If not found in Installation, try Site model
    const { Site } = require('../models/Site');
    const site = await Site.findOne({
      _id: siteId,
      userId: userId
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found',
        message: 'Site not found or you do not have permission to update it'
      });
    }

    // Update Site (add googleAnalyticsId field if it doesn't exist)
    site.googleAnalyticsId = googleAnalyticsId;
    await site.save();

    res.json({
      success: true,
      message: 'Google Analytics ID updated successfully'
    });

  } catch (error) {
    console.error('Error updating site:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update site'
    });
  }
});

router.delete('/:siteId', async (req: any, res) => {
  try {
    const { siteId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    // Try to find and delete from Installation model first
    const { Installation } = require('../models/Installation');
    let installation = await Installation.findOne({
      _id: siteId,
      userId: userId
    });

    if (installation) {
      await Installation.deleteOne({ _id: siteId, userId: userId });
      return res.json({
        success: true,
        message: 'Site removed successfully',
        type: 'installation'
      });
    }

    // If not found in Installation, try Site model
    const { Site } = require('../models/Site');
    const site = await Site.findOne({
      _id: siteId,
      userId: userId
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found',
        message: 'Site not found or you do not have permission to delete it'
      });
    }

    await Site.deleteOne({ _id: siteId, userId: userId });

    res.json({
      success: true,
      message: 'Site removed successfully',
      type: 'site'
    });

  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete site'
    });
  }
});

// Job status
router.get('/jobs/:jobId', getJobStatus);

// Installation command generation (authenticated)
router.post('/generate-command', generateInstallationCommand);

// New unified installation endpoints
router.post('/test-vps', testVPSConnection);
router.post('/generate-installation', generateInstallationScript);

// Direct VPS execution endpoints
router.post('/execute-installation', (req, res) => {
  try {
    const io = global.socketIO;
    if (!io) {
      console.error('Socket.IO not initialized');
      return res.status(500).json({
        success: false,
        message: 'Socket.IO not available'
      });
    }
    return executeInstallation(req as any, res, io);
  } catch (error) {
    console.error('Execute installation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start installation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
router.get('/installation-status/:installationId', getInstallationStatus);
router.get('/installation-logs/:installationId', getInstallationLogs);
router.post('/cancel-installation/:installationId', cancelInstallation);

// Installation history
router.get('/installations', getInstallationHistory);
router.get('/installations/:installationId', getInstallationDetails);

// WordPress management endpoints
router.post('/add-wordpress', addWordPressSite);
router.post('/remove-wordpress', removeWordPress);
router.post('/backup-wordpress', backupWordPress);

// Existing blog integration
router.post('/detect', detectWordPressSite);
router.post('/existing', addExistingSite);

// Temporary unrestricted admin check (remove after debugging)
router.get('/temp-admin-check/:email', async (req: any, res) => {
  try {
    const { email } = req.params;
    
    const { Installation } = require('../models/Installation');
    const { Site } = require('../models/Site');
    const User = require('../models/User').User;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ error: 'User not found', email });
    }
    
    // Get their sites and installations
    const [sites, installations] = await Promise.all([
      Site.find({ userId: user._id }),
      Installation.find({ userId: user._id })
    ]);
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      sites: {
        count: sites.length,
        data: sites.map(site => ({
          id: site._id,
          domain: site.domain,
          status: site.status,
          createdAt: site.createdAt
        }))
      },
      installations: {
        count: installations.length,
        data: installations.map(inst => ({
          id: inst._id,
          domain: inst.domain,
          status: inst.status,
          isExisting: inst.installationOptions?.isExisting,
          templateId: inst.templateId,
          createdAt: inst.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoints for troubleshooting
router.get('/debug-installations', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { Installation } = require('../models/Installation');
    const installations = await Installation.find({ userId })
      .select('domain templateId status installationOptions siteInfo createdAt tokenUsed')
      .sort({ createdAt: -1 });
    
    res.json({ 
      userId,
      count: installations.length,
      installations: installations.map(inst => ({
        id: inst._id,
        domain: inst.domain,
        templateId: inst.templateId,
        status: inst.status,
        isExisting: inst.installationOptions?.isExisting,
        tokenUsed: inst.tokenUsed,
        siteInfo: inst.siteInfo,
        createdAt: inst.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup endpoint for orphaned installations
router.delete('/cleanup-installations', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { Installation } = require('../models/Installation');
    
    // Remove failed installations older than 1 hour
    const result1 = await Installation.deleteMany({ 
      userId,
      status: { $in: ['failed', 'cancelled'] },
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    
    // Remove incomplete installations older than 24 hours
    const result2 = await Installation.deleteMany({ 
      userId,
      status: { $in: ['started', 'in_progress'] },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({ 
      success: true,
      deletedFailed: result1.deletedCount,
      deletedIncomplete: result2.deletedCount,
      total: result1.deletedCount + result2.deletedCount
    });
  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;