import { Request, Response } from 'express';
import { WordPressSite } from '../models/WordPressSite';
import { AuthRequest } from '../middlewares/authMiddleware';

// Get user's WordPress sites
export const getUserWordPressSites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const sites = await WordPressSite.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: sites
    });
  } catch (error: any) {
    console.error('Error fetching WordPress sites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WordPress sites'
    });
  }
};

// Add new WordPress site
export const addWordPressSite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, url, username, applicationPassword, isDefault } = req.body;

    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate required fields
    if (!name || !url || !username || !applicationPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already has this site
    const existingSite = await WordPressSite.findOne({ userId, url });
    if (existingSite) {
      return res.status(400).json({
        success: false,
        message: 'This site is already registered'
      });
    }

    // Create new site
    const site = new WordPressSite({
      userId,
      name,
      url: url.replace(/\/$/, ''), // Remove trailing slash
      username,
      applicationPassword,
      isDefault: isDefault || false
    });

    // Test connection before saving
    const isConnected = await site.testWordPressConnection();
    if (!isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Failed to connect to WordPress site. Please check your credentials.',
        error: site.testConnection?.error
      });
    }

    await site.save();

    // Return without password
    const siteData = site.toObject();
    delete siteData.applicationPassword;

    res.status(201).json({
      success: true,
      data: siteData,
      message: 'WordPress site added successfully'
    });
  } catch (error: any) {
    console.error('Error adding WordPress site:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add WordPress site'
    });
  }
};

// Update WordPress site
export const updateWordPressSite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updates = req.body;

    const site = await WordPressSite.findOne({ _id: id, userId }).select('+applicationPassword');
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'WordPress site not found'
      });
    }

    // Update fields
    Object.assign(site, updates);

    // If credentials changed, test connection
    if (updates.username || updates.applicationPassword) {
      // If updating password, mark it as modified so it gets re-encrypted
      if (updates.applicationPassword) {
        site.markModified('applicationPassword');
      }
      
      const isConnected = await site.testWordPressConnection();
      if (!isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Failed to connect with new credentials',
          error: site.testConnection?.error
        });
      }
    }

    await site.save();

    // Return without password
    const siteData = site.toObject();
    delete siteData.applicationPassword;

    res.json({
      success: true,
      data: siteData,
      message: 'WordPress site updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating WordPress site:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WordPress site'
    });
  }
};

// Delete WordPress site
export const deleteWordPressSite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const site = await WordPressSite.findOne({ _id: id, userId });
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'WordPress site not found'
      });
    }

    await site.deleteOne();

    res.json({
      success: true,
      message: 'WordPress site deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting WordPress site:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete WordPress site'
    });
  }
};

// Test WordPress connection
export const testWordPressConnection = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const site = await WordPressSite.findOne({ _id: id, userId }).select('+applicationPassword');
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'WordPress site not found'
      });
    }

    const isConnected = await site.testWordPressConnection();

    res.json({
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
      error: site.testConnection?.error
    });
  } catch (error: any) {
    console.error('Error testing WordPress connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection'
    });
  }
};

// Set default WordPress site
export const setDefaultWordPressSite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const site = await WordPressSite.findOne({ _id: id, userId });
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'WordPress site not found'
      });
    }

    site.isDefault = true;
    await site.save();

    res.json({
      success: true,
      message: 'Default WordPress site updated'
    });
  } catch (error: any) {
    console.error('Error setting default WordPress site:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default site'
    });
  }
};