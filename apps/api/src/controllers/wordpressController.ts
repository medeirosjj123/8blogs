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

// Add new WordPress site (external)
export const addWordPressSite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, url, username, applicationPassword, isDefault, siteType, vpsConfig } = req.body;

    console.log('🔄 Adding WordPress site:', {
      userId,
      name,
      url,
      username: username ? '***' : undefined,
      hasPassword: !!applicationPassword,
      siteType,
      hasVpsConfig: !!vpsConfig
    });

    // Check if user is authenticated
    if (!userId) {
      console.log('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate required fields
    if (!name || !url || !username || !applicationPassword) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!url) missingFields.push('url');
      if (!username) missingFields.push('username');
      if (!applicationPassword) missingFields.push('applicationPassword');
      
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        missingFields
      });
    }

    // Normalize URL
    const normalizedUrl = url.replace(/\/$/, ''); // Remove trailing slash
    console.log('🔍 Normalized URL:', normalizedUrl);

    // Check if user already has this site
    const existingSite = await WordPressSite.findOne({ userId, url: normalizedUrl });
    if (existingSite) {
      console.log('❌ Site already exists:', existingSite._id);
      return res.status(400).json({
        success: false,
        message: 'This site is already registered'
      });
    }

    // Create new site (detect type from parameters)
    const site = new WordPressSite({
      userId,
      name,
      url: normalizedUrl,
      username,
      applicationPassword,
      isDefault: isDefault || false,
      siteType: siteType || 'external' // Use provided siteType or default to external
    });

    // For auto-registration after installation, skip connection test temporarily
    // and allow manual verification later
    const skipConnectionTest = siteType === 'managed' && vpsConfig;
    
    if (skipConnectionTest) {
      console.log('⚠️ Skipping connection test for managed site (auto-registration)');
      // Set pending test status
      site.testConnection = {
        status: 'pending',
        lastTest: new Date(),
        error: null
      };
    } else {
      console.log('🔄 Testing WordPress connection...');
      // Test connection before saving
      const isConnected = await site.testWordPressConnection();
      console.log('🔍 Connection test result:', { isConnected, error: site.testConnection?.error });
      
      if (!isConnected) {
        console.log('❌ WordPress connection failed');
        return res.status(400).json({
          success: false,
          message: 'Failed to connect to WordPress site. Please check your credentials.',
          error: site.testConnection?.error
        });
      }
    }

    await site.save();
    console.log('✅ WordPress site saved:', site._id);

    // Return without password
    const siteData = site.toObject();
    delete siteData.applicationPassword;

    res.status(201).json({
      success: true,
      data: siteData,
      message: 'WordPress site added successfully'
    });
  } catch (error: any) {
    console.error('❌ Error adding WordPress site:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add WordPress site'
    });
  }
};

// Add new managed WordPress site (VPS)
export const addManagedWordPressSite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { 
      name, 
      domain, 
      username, 
      applicationPassword, 
      vpsConfig,
      ipAddress,
      wordpressVersion,
      phpVersion,
      isDefault 
    } = req.body;

    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Validate required fields
    if (!name || !domain || !username || !applicationPassword) {
      return res.status(400).json({
        success: false,
        message: 'Name, domain, username, and password are required'
      });
    }

    const url = `https://${domain}`;

    // Check if user already has this site
    const existingSite = await WordPressSite.findOne({ 
      userId, 
      $or: [{ url }, { domain }]
    });
    
    if (existingSite) {
      return res.status(400).json({
        success: false,
        message: 'This site is already registered'
      });
    }

    // Create new managed site
    const site = new WordPressSite({
      userId,
      name,
      url,
      domain,
      username,
      applicationPassword,
      isDefault: isDefault || false,
      siteType: 'managed',
      ipAddress,
      vpsConfig: {
        ...vpsConfig,
        hasAccess: true
      },
      wordpressVersion,
      phpVersion
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
      message: 'Managed WordPress site added successfully'
    });
  } catch (error: any) {
    console.error('Error adding managed WordPress site:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add managed WordPress site'
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