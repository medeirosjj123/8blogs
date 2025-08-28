import { Request, Response } from 'express';
import { Settings } from '../models/Settings';
import { emailService } from '../services/email.service';

// Get all settings (grouped by category)
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const settings = await Settings.find({});
    
    // Group by category
    const grouped: Record<string, any> = {};
    
    settings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      
      // Mask secret values
      if (setting.isSecret && setting.value) {
        grouped[setting.category][setting.key] = {
          value: setting.value.substring(0, 4) + '********',
          description: setting.description,
          isSecret: true,
          updatedAt: setting.updatedAt
        };
      } else {
        grouped[setting.category][setting.key] = {
          value: setting.value,
          description: setting.description,
          isSecret: false,
          updatedAt: setting.updatedAt
        };
      }
    });

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get settings by category
export const getCategorySettings = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    const settings = await Settings.find({ category });
    
    const result: Record<string, any> = {};
    
    settings.forEach(setting => {
      // Mask secret values
      if (setting.isSecret && setting.value) {
        result[setting.key] = {
          value: setting.value.substring(0, 4) + '********',
          description: setting.description,
          isSecret: true,
          updatedAt: setting.updatedAt
        };
      } else {
        result[setting.key] = {
          value: setting.value,
          description: setting.description,
          isSecret: false,
          updatedAt: setting.updatedAt
        };
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching category settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update email settings
export const updateEmailSettings = async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, fromEmail, fromName, replyToEmail } = req.body;

    if (!provider || !apiKey || !fromEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Provider, API key, and from email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid from email address' 
      });
    }

    if (replyToEmail && !emailRegex.test(replyToEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reply-to email address' 
      });
    }

    // Save settings
    await Settings.setSetting('email', 'provider', provider, req.user._id, 'Email service provider');
    await Settings.setSetting('email', 'apiKey', apiKey, req.user._id, 'API key for email service');
    await Settings.setSetting('email', 'fromEmail', fromEmail, req.user._id, 'Default sender email');
    await Settings.setSetting('email', 'fromName', fromName || 'Tatame', req.user._id, 'Default sender name');
    
    if (replyToEmail) {
      await Settings.setSetting('email', 'replyToEmail', replyToEmail, req.user._id, 'Reply-to email address');
    }

    // Mark API key as secret
    await Settings.findOneAndUpdate(
      { category: 'email', key: 'apiKey' },
      { isSecret: true }
    );

    // Reinitialize email service
    await emailService.initialize();

    console.info(`Admin ${req.user.email} updated email settings to use ${provider}`);

    res.json({ 
      success: true, 
      message: 'Email settings updated successfully' 
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Test email configuration
export const testEmailConfiguration = async (req: Request, res: Response) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test email address is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email address' 
      });
    }

    // Test connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest.success) {
      return res.status(400).json({ 
        success: false, 
        message: `Connection test failed: ${connectionTest.error}` 
      });
    }

    // Send test email
    const result = await emailService.sendTestEmail(testEmail);

    if (result.success) {
      console.info(`Admin ${req.user.email} sent test email to ${testEmail}`);
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.error || 'Failed to send test email' 
      });
    }
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update general settings
export const updateGeneralSettings = async (req: Request, res: Response) => {
  try {
    const { siteName, siteUrl, supportEmail, maintenanceMode } = req.body;

    if (siteName) {
      await Settings.setSetting('general', 'siteName', siteName, req.user._id, 'Site name');
    }
    
    if (siteUrl) {
      await Settings.setSetting('general', 'siteUrl', siteUrl, req.user._id, 'Site URL');
    }
    
    if (supportEmail) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supportEmail)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid support email address' 
        });
      }
      await Settings.setSetting('general', 'supportEmail', supportEmail, req.user._id, 'Support email address');
    }
    
    if (typeof maintenanceMode === 'boolean') {
      await Settings.setSetting('general', 'maintenanceMode', maintenanceMode, req.user._id, 'Maintenance mode status');
    }

    console.info(`Admin ${req.user.email} updated general settings`);

    res.json({ 
      success: true, 
      message: 'General settings updated successfully' 
    });
  } catch (error) {
    console.error('Error updating general settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update security settings
export const updateSecuritySettings = async (req: Request, res: Response) => {
  try {
    const { 
      twoFactorRequired, 
      sessionTimeout, 
      maxLoginAttempts,
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireNumbers,
      passwordRequireSymbols
    } = req.body;

    if (typeof twoFactorRequired === 'boolean') {
      await Settings.setSetting('security', 'twoFactorRequired', twoFactorRequired, req.user._id, 'Require 2FA for all users');
    }
    
    if (sessionTimeout && sessionTimeout > 0) {
      await Settings.setSetting('security', 'sessionTimeout', sessionTimeout, req.user._id, 'Session timeout in minutes');
    }
    
    if (maxLoginAttempts && maxLoginAttempts > 0) {
      await Settings.setSetting('security', 'maxLoginAttempts', maxLoginAttempts, req.user._id, 'Maximum login attempts before lockout');
    }
    
    if (passwordMinLength && passwordMinLength >= 6) {
      await Settings.setSetting('security', 'passwordMinLength', passwordMinLength, req.user._id, 'Minimum password length');
    }
    
    if (typeof passwordRequireUppercase === 'boolean') {
      await Settings.setSetting('security', 'passwordRequireUppercase', passwordRequireUppercase, req.user._id, 'Require uppercase letters in password');
    }
    
    if (typeof passwordRequireNumbers === 'boolean') {
      await Settings.setSetting('security', 'passwordRequireNumbers', passwordRequireNumbers, req.user._id, 'Require numbers in password');
    }
    
    if (typeof passwordRequireSymbols === 'boolean') {
      await Settings.setSetting('security', 'passwordRequireSymbols', passwordRequireSymbols, req.user._id, 'Require symbols in password');
    }

    console.info(`Admin ${req.user.email} updated security settings`);

    res.json({ 
      success: true, 
      message: 'Security settings updated successfully' 
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};