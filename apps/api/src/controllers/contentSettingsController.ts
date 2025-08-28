import { Request, Response } from 'express';
import { UserContentSettings } from '../models/UserContentSettings';
import { AuthRequest } from '../middlewares/authMiddleware';

// Get user's content settings
export const getUserContentSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    let settings = await UserContentSettings.findOne({ userId });
    
    // Create default settings if not exists
    if (!settings) {
      settings = await UserContentSettings.create({
        userId,
        pexels: {
          isActive: false,
          defaultImageCount: 3
        },
        contentDefaults: {
          language: 'pt-BR',
          tone: 'professional',
          includeImages: true,
          defaultWordCount: 1500
        },
        seo: {
          includeMetaDescription: true,
          includeFocusKeyword: true
        }
      });
    }

    // Don't send encrypted API key
    const settingsData = settings.toObject();
    if (settingsData.pexels?.apiKey) {
      settingsData.pexels.apiKey = '***' + settingsData.pexels.apiKey.slice(-4);
    }

    res.json({
      success: true,
      data: settingsData
    });
  } catch (error: any) {
    console.error('Error fetching content settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content settings'
    });
  }
};

// Update user's content settings
export const updateUserContentSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const updates = req.body;

    let settings = await UserContentSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserContentSettings({ userId });
    }

    // Handle Pexels API key update
    if (updates.pexels?.apiKey) {
      if (!updates.pexels.apiKey.startsWith('***')) {
        // Only update if it's a new key (not masked)
        settings.pexels.apiKey = updates.pexels.apiKey;
      } else {
        // Remove masked key from updates
        delete updates.pexels.apiKey;
      }
    }

    // Update other fields
    if (updates.pexels) {
      Object.assign(settings.pexels, updates.pexels);
    }
    if (updates.contentDefaults) {
      Object.assign(settings.contentDefaults, updates.contentDefaults);
    }
    if (updates.seo) {
      Object.assign(settings.seo, updates.seo);
    }

    await settings.save();

    // Don't send encrypted API key
    const settingsData = settings.toObject();
    if (settingsData.pexels?.apiKey) {
      settingsData.pexels.apiKey = '***' + settingsData.pexels.apiKey.slice(-4);
    }

    res.json({
      success: true,
      data: settingsData,
      message: 'Content settings updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating content settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update content settings'
    });
  }
};

// Test Pexels API connection
export const testPexelsConnection = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { apiKey } = req.body;

    // Test with provided key or existing key
    if (apiKey && !apiKey.startsWith('***')) {
      // Test with new key
      const response = await fetch('https://api.pexels.com/v1/search?query=test&per_page=1', {
        headers: {
          'Authorization': apiKey
        }
      });

      if (response.ok) {
        res.json({
          success: true,
          message: 'Pexels API connected successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid Pexels API key'
        });
      }
    } else {
      // Test with existing key
      const settings = await UserContentSettings.findOne({ userId }).select('+pexels.apiKey');
      
      if (!settings || !settings.pexels.apiKey) {
        return res.status(400).json({
          success: false,
          message: 'No Pexels API key configured'
        });
      }

      const isConnected = await settings.testPexelsConnection();

      res.json({
        success: isConnected,
        message: isConnected ? 'Pexels API connected successfully' : 'Pexels API connection failed'
      });
    }
  } catch (error: any) {
    console.error('Error testing Pexels connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Pexels connection'
    });
  }
};

// Search Pexels images
export const searchPexelsImages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { query, perPage = 10, page = 1 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const settings = await UserContentSettings.findOne({ userId }).select('+pexels.apiKey');
    
    if (!settings || !settings.pexels.apiKey || !settings.pexels.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Pexels API not configured or inactive'
      });
    }

    const apiKey = settings.getDecryptedPexelsKey();
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Failed to decrypt Pexels API key'
      });
    }

    const orientation = settings.pexels.preferredOrientation || 'landscape';
    const size = settings.pexels.preferredSize || 'large';

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query as string)}&per_page=${perPage}&page=${page}&orientation=${orientation}&size=${size}`,
      {
        headers: {
          'Authorization': apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Pexels');
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        photos: data.photos,
        totalResults: data.total_results,
        page: data.page,
        perPage: data.per_page
      }
    });
  } catch (error: any) {
    console.error('Error searching Pexels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search images'
    });
  }
};