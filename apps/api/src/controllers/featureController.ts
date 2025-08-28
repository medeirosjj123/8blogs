import { Request, Response } from 'express';
import { Feature, FeatureStatus, IFeatureDocument } from '../models/Feature';
import { FeatureAuditLog } from '../models/FeatureAuditLog';
import { User } from '../models/User';
import { featureScanner } from '../services/featureScanner';

// Get all features (admin)
export const getAllFeatures = async (req: Request, res: Response) => {
  try {
    const { status, category, includeDeleted } = req.query;
    
    const query: any = {};
    
    if (!includeDeleted || includeDeleted === 'false') {
      query.deleted = false;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    const features = await Feature.find(query)
      .sort({ category: 1, name: 1 })
      .lean();
    
    // Get usage stats summary
    const stats = {
      total: features.length,
      active: features.filter(f => f.status === 'active').length,
      disabled: features.filter(f => f.status === 'disabled').length,
      maintenance: features.filter(f => f.status === 'maintenance').length,
      deprecated: features.filter(f => f.status === 'deprecated').length
    };
    
    res.json({
      success: true,
      data: {
        features,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features'
    });
  }
};

// Get features for regular users (only active, non-deleted)
export const getPublicFeatures = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role || 'aluno';
    
    const features = await Feature.findActiveForUser(userRole);
    
    res.json({
      success: true,
      data: features.map(f => ({
        id: f._id,
        code: f.code,
        name: f.name,
        description: f.description,
        category: f.category,
        icon: f.icon,
        route: f.route,
        status: f.status,
        maintenanceMessage: f.maintenanceMessage,
        config: f.config
      }))
    });
  } catch (error) {
    console.error('Error fetching public features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features'
    });
  }
};

// Get single feature details
export const getFeature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    // Get recent audit logs
    const auditLogs = await FeatureAuditLog.find({ featureCode: feature.code })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      data: {
        feature,
        auditLogs
      }
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature details'
    });
  }
};

// Create new feature
export const createFeature = async (req: Request, res: Response) => {
  try {
    const featureData = req.body;
    const adminUser = req.user;
    
    // Check if feature code already exists
    const existing = await Feature.findOne({ code: featureData.code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Feature with this code already exists'
      });
    }
    
    // Create feature
    const feature = new Feature({
      ...featureData,
      modifiedBy: adminUser?.id,
      status: 'disabled' // Always start disabled
    });
    
    await feature.save();
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'created',
      newState: {
        status: feature.status,
        config: feature.config,
        permissions: feature.permissions
      },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.status(201).json({
      success: true,
      data: feature,
      message: 'Feature created successfully'
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create feature'
    });
  }
};

// Update feature
export const updateFeature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const adminUser = req.user;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    // Store previous state for audit
    const previousState = {
      status: feature.status,
      config: feature.config,
      permissions: feature.permissions
    };
    
    // Apply updates
    Object.assign(feature, updates);
    feature.modifiedBy = adminUser?.id;
    
    await feature.save();
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'updated',
      previousState,
      newState: {
        status: feature.status,
        config: feature.config,
        permissions: feature.permissions
      },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      reason: updates.reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: feature,
      message: 'Feature updated successfully'
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feature'
    });
  }
};

// Toggle feature status
export const toggleFeatureStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.user;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    const previousStatus = feature.status;
    
    // Toggle between active and disabled
    if (feature.status === 'active') {
      feature.status = 'disabled';
    } else if (feature.status === 'disabled') {
      feature.status = 'active';
    } else {
      return res.status(400).json({
        success: false,
        message: `Cannot toggle feature in ${feature.status} status`
      });
    }
    
    feature.modifiedBy = adminUser?.id;
    await feature.save();
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'status_changed',
      previousState: { status: previousStatus },
      newState: { status: feature.status },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: feature,
      message: `Feature ${feature.status === 'active' ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle feature status'
    });
  }
};

// Set feature to maintenance mode
export const setMaintenanceMode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { maintenanceMessage, estimatedTime } = req.body;
    const adminUser = req.user;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    const previousStatus = feature.status;
    
    feature.status = 'maintenance';
    feature.maintenanceMessage = maintenanceMessage || 'This feature is currently under maintenance';
    feature.modifiedBy = adminUser?.id;
    
    await feature.save();
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'status_changed',
      previousState: { status: previousStatus },
      newState: { status: 'maintenance' },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      reason: `Maintenance mode: ${maintenanceMessage}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: feature,
      message: 'Feature set to maintenance mode'
    });
  } catch (error) {
    console.error('Error setting maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set maintenance mode'
    });
  }
};

// Update feature status (active, maintenance, disabled)
export const updateFeatureStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, maintenanceMessage } = req.body;
    const adminUser = req.user;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    const previousStatus = feature.status;
    
    // Update status
    feature.status = status;
    
    // Update maintenance message if going to maintenance
    if (status === 'maintenance') {
      feature.maintenanceMessage = maintenanceMessage || 'Esta funcionalidade está em manutenção';
    } else {
      feature.maintenanceMessage = undefined;
    }
    
    feature.modifiedBy = adminUser?.id;
    
    await feature.save();
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'status_changed',
      previousState: { status: previousStatus },
      newState: { status },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      reason: `Status changed from ${previousStatus} to ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: feature,
      message: `Feature status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating feature status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feature status'
    });
  }
};

// Delete feature (soft delete with confirmation)
export const deleteFeature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirmationCode, reason } = req.body;
    const adminUser = req.user;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    // Check if feature is deletable
    if (!feature.deletable) {
      return res.status(403).json({
        success: false,
        message: 'This feature cannot be deleted as it is a core system feature'
      });
    }
    
    // Verify confirmation code (should match feature code)
    if (confirmationCode !== feature.code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation code. Please type the feature code to confirm deletion.'
      });
    }
    
    // Check for dependencies
    const dependentFeatures = await Feature.find({
      dependencies: feature.code,
      deleted: false
    });
    
    if (dependentFeatures.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this feature. ${dependentFeatures.length} other features depend on it.`,
        data: {
          dependentFeatures: dependentFeatures.map(f => f.name)
        }
      });
    }
    
    // Perform soft delete
    await feature.softDelete(adminUser?.id);
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'deleted',
      previousState: { status: feature.status },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'Feature deleted successfully. It can be restored within 30 days.'
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feature'
    });
  }
};

// Restore deleted feature
export const restoreFeature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    if (!feature.deleted) {
      return res.status(400).json({
        success: false,
        message: 'Feature is not deleted'
      });
    }
    
    // Restore feature
    await feature.restore(adminUser?.id);
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: feature.code,
      featureName: feature.name,
      action: 'restored',
      newState: { status: feature.status },
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: feature,
      message: 'Feature restored successfully'
    });
  } catch (error) {
    console.error('Error restoring feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore feature'
    });
  }
};

// Get feature audit logs
export const getFeatureAuditLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const feature = await Feature.findById(id);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    const auditLogs = await FeatureAuditLog.find({ featureCode: feature.code })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('performedBy', 'name email')
      .lean();
    
    res.json({
      success: true,
      data: auditLogs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

// Bulk update features
export const bulkUpdateFeatures = async (req: Request, res: Response) => {
  try {
    const { featureIds, action, reason } = req.body;
    const adminUser = req.user;
    
    if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide feature IDs'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const featureId of featureIds) {
      try {
        const feature = await Feature.findById(featureId);
        
        if (!feature) {
          results.failed.push({ id: featureId, reason: 'Not found' });
          continue;
        }
        
        const previousStatus = feature.status;
        
        switch (action) {
          case 'enable':
            if (feature.status !== 'disabled') {
              results.failed.push({ id: featureId, reason: 'Cannot enable from current status' });
              continue;
            }
            feature.status = 'active';
            break;
            
          case 'disable':
            if (feature.status !== 'active') {
              results.failed.push({ id: featureId, reason: 'Cannot disable from current status' });
              continue;
            }
            feature.status = 'disabled';
            break;
            
          case 'delete':
            if (!feature.deletable) {
              results.failed.push({ id: featureId, reason: 'Not deletable' });
              continue;
            }
            await feature.softDelete(adminUser?.id);
            break;
            
          default:
            results.failed.push({ id: featureId, reason: 'Invalid action' });
            continue;
        }
        
        if (action !== 'delete') {
          feature.modifiedBy = adminUser?.id;
          await feature.save();
        }
        
        // Create audit log
        await FeatureAuditLog.create({
          featureCode: feature.code,
          featureName: feature.name,
          action: action === 'delete' ? 'deleted' : 'status_changed',
          previousState: { status: previousStatus },
          newState: { status: feature.status },
          performedBy: adminUser?.id,
          performedByEmail: adminUser?.email,
          reason: `Bulk ${action}: ${reason}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
        
        results.success.push({ id: featureId, name: feature.name });
      } catch (error) {
        results.failed.push({ id: featureId, reason: 'Processing error' });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk operation completed. Success: ${results.success.length}, Failed: ${results.failed.length}`,
      data: results
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update'
    });
  }
};

// Scan for new features in codebase
export const scanForFeatures = async (req: Request, res: Response) => {
  try {
    const adminUser = req.user;
    
    // Run the feature scanner
    const result = await featureScanner.syncFeatures();
    
    // Create audit log for the scan
    if (result.added.length > 0 || result.updated.length > 0 || result.deprecated.length > 0) {
      await FeatureAuditLog.create({
        featureCode: 'system',
        featureName: 'Feature Scanner',
        action: 'updated',
        newState: {
          config: result
        },
        performedBy: adminUser?.id,
        performedByEmail: adminUser?.email,
        reason: 'Automatic feature scan',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    
    res.json({
      success: true,
      message: 'Feature scan completed',
      data: result
    });
  } catch (error) {
    console.error('Error scanning for features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan for features'
    });
  }
};

// Initialize default features
export const initializeFeatures = async (req: Request, res: Response) => {
  try {
    const adminUser = req.user;
    
    // Initialize default features
    await featureScanner.initializeDefaults();
    
    // Create audit log
    await FeatureAuditLog.create({
      featureCode: 'system',
      featureName: 'Feature Initializer',
      action: 'created',
      performedBy: adminUser?.id,
      performedByEmail: adminUser?.email,
      reason: 'Initialize default features',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'Default features initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize features'
    });
  }
};