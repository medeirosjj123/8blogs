import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { WordPressPlugin, IWordPressPlugin } from '../models/WordPressPlugin';
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

// Get all plugins with optional filtering
export async function getAllPlugins(req: Request, res: Response): Promise<void> {
  try {
    const { 
      category, 
      isActive, 
      isPremium,
      page = 1, 
      limit = 20 
    } = req.query;

    const query: any = {};
    
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const plugins = await WordPressPlugin.find(query)
      .populate('addedBy', 'name email')
      .sort({ isDefault: -1, rating: -1, downloadCount: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await WordPressPlugin.countDocuments(query);

    res.json({
      success: true,
      data: {
        plugins,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching plugins');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plugins'
    });
  }
}

// Get active plugins for installation wizard
export async function getActivePlugins(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;

    const query: any = { isActive: true };
    if (category) query.category = category;

    const plugins = await WordPressPlugin.find(query)
      .select('-addedBy -__v')
      .sort({ isDefault: -1, category: 1, rating: -1 });

    // Group by category for easier frontend consumption
    const pluginsByCategory = plugins.reduce((acc: any, plugin) => {
      if (!acc[plugin.category]) {
        acc[plugin.category] = [];
      }
      acc[plugin.category].push(plugin);
      return acc;
    }, {});

    // Also provide conflict information
    const conflicts = plugins.reduce((acc: any, plugin) => {
      if (plugin.conflicts && plugin.conflicts.length > 0) {
        acc[plugin.slug] = plugin.conflicts;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        plugins,
        pluginsByCategory,
        conflicts
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching active plugins');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active plugins'
    });
  }
}

// Get default plugins by category
export async function getDefaultPlugins(req: Request, res: Response): Promise<void> {
  try {
    const plugins = await WordPressPlugin.find({ 
      isDefault: true, 
      isActive: true 
    })
    .select('-addedBy -__v')
    .sort({ category: 1, rating: -1 });

    const defaultsByCategory = plugins.reduce((acc: any, plugin) => {
      if (!acc[plugin.category]) {
        acc[plugin.category] = [];
      }
      acc[plugin.category].push(plugin);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        plugins,
        defaultsByCategory
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching default plugins');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default plugins'
    });
  }
}

// Get recommended plugins for a specific theme/category combination
export async function getRecommendedPlugins(req: Request, res: Response): Promise<void> {
  try {
    const { themeSlug, siteCategory } = req.query;

    // Define plugin recommendations based on theme and site type
    const recommendations: any = {
      'blog': ['seo', 'social', 'performance', 'backup'],
      'business': ['seo', 'forms', 'security', 'backup', 'analytics'],
      'ecommerce': ['ecommerce', 'seo', 'security', 'performance', 'backup'],
      'portfolio': ['seo', 'social', 'performance', 'backup'],
      'agency': ['seo', 'forms', 'security', 'analytics', 'backup'],
      'magazine': ['seo', 'social', 'performance', 'content', 'backup'],
      'landing': ['seo', 'forms', 'analytics', 'performance']
    };

    const recommendedCategories = recommendations[siteCategory as string] || ['seo', 'security', 'backup'];
    
    const plugins = await WordPressPlugin.find({
      category: { $in: recommendedCategories },
      isActive: true,
      isDefault: true
    })
    .select('-addedBy -__v')
    .sort({ category: 1, rating: -1 });

    res.json({
      success: true,
      data: {
        recommendedPlugins: plugins,
        categories: recommendedCategories
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching recommended plugins');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended plugins'
    });
  }
}

// Check plugin conflicts
export async function checkPluginConflicts(req: Request, res: Response): Promise<void> {
  try {
    const { pluginSlugs } = req.body;

    if (!Array.isArray(pluginSlugs)) {
      res.status(400).json({
        success: false,
        message: 'pluginSlugs must be an array'
      });
      return;
    }

    const plugins = await WordPressPlugin.find({
      slug: { $in: pluginSlugs }
    }).select('slug conflicts');

    const conflicts: string[] = [];
    
    for (const plugin of plugins) {
      if (plugin.conflicts && plugin.conflicts.length > 0) {
        const conflictingPlugins = plugin.conflicts.filter(conflictSlug => 
          pluginSlugs.includes(conflictSlug)
        );
        
        if (conflictingPlugins.length > 0) {
          conflicts.push(`${plugin.slug} conflicts with: ${conflictingPlugins.join(', ')}`);
        }
      }
    }

    res.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error checking plugin conflicts');
    res.status(500).json({
      success: false,
      message: 'Failed to check plugin conflicts'
    });
  }
}

// Get single plugin
export async function getPlugin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const plugin = await WordPressPlugin.findById(id)
      .populate('addedBy', 'name email');

    if (!plugin) {
      res.status(404).json({
        success: false,
        message: 'Plugin not found'
      });
      return;
    }

    res.json({
      success: true,
      data: plugin
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching plugin');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plugin'
    });
  }
}

// Create new plugin (admin only)
export async function createPlugin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const pluginData = {
      ...req.body,
      addedBy: userId
    };

    const plugin = new WordPressPlugin(pluginData);
    await plugin.save();

    logger.info({ 
      pluginId: plugin._id, 
      name: plugin.name,
      userId 
    }, 'Plugin created successfully');

    res.status(201).json({
      success: true,
      data: plugin
    });
  } catch (error) {
    logger.error({ error }, 'Error creating plugin');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create plugin'
    });
  }
}

// Update plugin (admin only)
export async function updatePlugin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const plugin = await WordPressPlugin.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    
    if (!plugin) {
      res.status(404).json({
        success: false,
        message: 'Plugin not found'
      });
      return;
    }

    logger.info({ 
      pluginId: plugin._id, 
      name: plugin.name,
      userId 
    }, 'Plugin updated successfully');

    res.json({
      success: true,
      data: plugin
    });
  } catch (error) {
    logger.error({ error }, 'Error updating plugin');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update plugin'
    });
  }
}

// Delete plugin (admin only)
export async function deletePlugin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const plugin = await WordPressPlugin.findByIdAndDelete(id);
    
    if (!plugin) {
      res.status(404).json({
        success: false,
        message: 'Plugin not found'
      });
      return;
    }

    logger.info({ 
      pluginId: id, 
      name: plugin.name,
      userId 
    }, 'Plugin deleted successfully');

    res.json({
      success: true,
      message: 'Plugin deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting plugin');
    res.status(500).json({
      success: false,
      message: 'Failed to delete plugin'
    });
  }
}

// Toggle plugin default status
export async function toggleDefaultStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const plugin = await WordPressPlugin.findById(id);
    
    if (!plugin) {
      res.status(404).json({
        success: false,
        message: 'Plugin not found'
      });
      return;
    }

    // Toggle default status
    plugin.isDefault = !plugin.isDefault;
    await plugin.save(); // This will trigger the pre-save hook to check limits

    logger.info({ 
      pluginId: plugin._id, 
      name: plugin.name,
      isDefault: plugin.isDefault,
      userId 
    }, 'Plugin default status toggled');

    res.json({
      success: true,
      data: {
        id: plugin._id,
        isDefault: plugin.isDefault
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling plugin default status');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to toggle default status'
    });
  }
}

// Toggle plugin active status
export async function toggleActiveStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const plugin = await WordPressPlugin.findById(id);
    
    if (!plugin) {
      res.status(404).json({
        success: false,
        message: 'Plugin not found'
      });
      return;
    }

    // Toggle active status
    plugin.isActive = !plugin.isActive;
    await plugin.save();

    logger.info({ 
      pluginId: plugin._id, 
      name: plugin.name,
      isActive: plugin.isActive,
      userId 
    }, 'Plugin active status toggled');

    res.json({
      success: true,
      data: {
        id: plugin._id,
        isActive: plugin.isActive
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling plugin active status');
    res.status(500).json({
      success: false,
      message: 'Failed to toggle active status'
    });
  }
}