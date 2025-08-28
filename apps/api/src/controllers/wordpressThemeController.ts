import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { WordPressTheme, IWordPressTheme } from '../models/WordPressTheme';
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

// Get all themes with optional filtering
export async function getAllThemes(req: Request, res: Response): Promise<void> {
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

    const themes = await WordPressTheme.find(query)
      .populate('addedBy', 'name email')
      .sort({ isDefault: -1, rating: -1, downloadCount: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await WordPressTheme.countDocuments(query);

    res.json({
      success: true,
      data: {
        themes,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching themes');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch themes'
    });
  }
}

// Get active themes for installation wizard
export async function getActiveThemes(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;

    const query: any = { isActive: true };
    if (category) query.category = category;

    const themes = await WordPressTheme.find(query)
      .select('-addedBy -__v')
      .sort({ isDefault: -1, rating: -1 });

    // Group by category for easier frontend consumption
    const themesByCategory = themes.reduce((acc: any, theme) => {
      if (!acc[theme.category]) {
        acc[theme.category] = [];
      }
      acc[theme.category].push(theme);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        themes,
        themesByCategory
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching active themes');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active themes'
    });
  }
}

// Get default themes by category
export async function getDefaultThemes(req: Request, res: Response): Promise<void> {
  try {
    const themes = await WordPressTheme.find({ 
      isDefault: true, 
      isActive: true 
    })
    .select('-addedBy -__v')
    .sort({ category: 1, rating: -1 });

    const defaultsByCategory = themes.reduce((acc: any, theme) => {
      acc[theme.category] = theme;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        themes,
        defaultsByCategory
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching default themes');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default themes'
    });
  }
}

// Get single theme
export async function getTheme(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const theme = await WordPressTheme.findById(id)
      .populate('addedBy', 'name email');

    if (!theme) {
      res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
      return;
    }

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching theme');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch theme'
    });
  }
}

// Create new theme (admin only)
export async function createTheme(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const themeData = {
      ...req.body,
      addedBy: userId
    };

    const theme = new WordPressTheme(themeData);
    await theme.save();

    logger.info({ 
      themeId: theme._id, 
      name: theme.name,
      userId 
    }, 'Theme created successfully');

    res.status(201).json({
      success: true,
      data: theme
    });
  } catch (error) {
    logger.error({ error }, 'Error creating theme');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create theme'
    });
  }
}

// Update theme (admin only)
export async function updateTheme(req: AuthRequest, res: Response): Promise<void> {
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

    const theme = await WordPressTheme.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    
    if (!theme) {
      res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
      return;
    }

    logger.info({ 
      themeId: theme._id, 
      name: theme.name,
      userId 
    }, 'Theme updated successfully');

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    logger.error({ error }, 'Error updating theme');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update theme'
    });
  }
}

// Delete theme (admin only)
export async function deleteTheme(req: AuthRequest, res: Response): Promise<void> {
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

    const theme = await WordPressTheme.findByIdAndDelete(id);
    
    if (!theme) {
      res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
      return;
    }

    logger.info({ 
      themeId: id, 
      name: theme.name,
      userId 
    }, 'Theme deleted successfully');

    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting theme');
    res.status(500).json({
      success: false,
      message: 'Failed to delete theme'
    });
  }
}

// Toggle theme default status
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

    const theme = await WordPressTheme.findById(id);
    
    if (!theme) {
      res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
      return;
    }

    // Toggle default status
    theme.isDefault = !theme.isDefault;
    await theme.save(); // This will trigger the pre-save hook

    logger.info({ 
      themeId: theme._id, 
      name: theme.name,
      isDefault: theme.isDefault,
      userId 
    }, 'Theme default status toggled');

    res.json({
      success: true,
      data: {
        id: theme._id,
        isDefault: theme.isDefault
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling theme default status');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to toggle default status'
    });
  }
}

// Toggle theme active status
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

    const theme = await WordPressTheme.findById(id);
    
    if (!theme) {
      res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
      return;
    }

    // Toggle active status
    theme.isActive = !theme.isActive;
    await theme.save();

    logger.info({ 
      themeId: theme._id, 
      name: theme.name,
      isActive: theme.isActive,
      userId 
    }, 'Theme active status toggled');

    res.json({
      success: true,
      data: {
        id: theme._id,
        isActive: theme.isActive
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling theme active status');
    res.status(500).json({
      success: false,
      message: 'Failed to toggle active status'
    });
  }
}