import { Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import pino from 'pino';
import crypto from 'crypto';

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

export async function setup2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('+twoFactorSecret +twoFactorEnabled');
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(400).json({
        error: 'Already enabled',
        message: '2FA is already enabled for this account'
      });
      return;
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Tatame (${user.email})`,
      issuer: 'Tatame Platform'
    });

    // Save temp secret (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        backupCodes,
        manualEntryKey: secret.base32
      }
    });
  } catch (error) {
    logger.error({ error }, '2FA setup error');
    res.status(500).json({
      error: 'Setup failed',
      message: 'Failed to setup 2FA'
    });
  }
}

export async function verify2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { code } = req.body;

    if (!code) {
      res.status(400).json({
        error: 'Missing code',
        message: 'Verification code is required'
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('+twoFactorSecret +twoFactorEnabled');
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }

    if (!user.twoFactorSecret) {
      res.status(400).json({
        error: 'Not setup',
        message: '2FA has not been setup yet'
      });
      return;
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      res.status(400).json({
        error: 'Invalid code',
        message: 'The verification code is invalid'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        verified: true
      }
    });
  } catch (error) {
    logger.error({ error }, '2FA verification error');
    res.status(500).json({
      error: 'Verification failed',
      message: 'Failed to verify 2FA code'
    });
  }
}

export async function enable2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { code, backupCodes } = req.body;

    if (!code) {
      res.status(400).json({
        error: 'Missing code',
        message: 'Verification code is required'
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('+twoFactorSecret +twoFactorEnabled +twoFactorBackupCodes');
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(400).json({
        error: 'Already enabled',
        message: '2FA is already enabled'
      });
      return;
    }

    if (!user.twoFactorSecret) {
      res.status(400).json({
        error: 'Not setup',
        message: '2FA has not been setup yet'
      });
      return;
    }

    // Verify the code one more time
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      res.status(400).json({
        error: 'Invalid code',
        message: 'The verification code is invalid'
      });
      return;
    }

    // Enable 2FA and save backup codes
    user.twoFactorEnabled = true;
    if (backupCodes && Array.isArray(backupCodes)) {
      // Hash backup codes before storing
      user.twoFactorBackupCodes = backupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );
    }
    await user.save();

    logger.info({ userId: user._id }, '2FA enabled');

    res.json({
      success: true,
      data: {
        enabled: true,
        message: '2FA has been successfully enabled'
      }
    });
  } catch (error) {
    logger.error({ error }, '2FA enable error');
    res.status(500).json({
      error: 'Enable failed',
      message: 'Failed to enable 2FA'
    });
  }
}

export async function disable2FA(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        error: 'Missing password',
        message: 'Password is required to disable 2FA'
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('+passwordHash +twoFactorSecret +twoFactorEnabled +twoFactorBackupCodes');
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }

    if (!user.twoFactorEnabled) {
      res.status(400).json({
        error: 'Not enabled',
        message: '2FA is not enabled'
      });
      return;
    }

    // Verify password
    const { comparePassword } = await import('../utils/auth');
    const isValidPassword = await comparePassword(password, user.passwordHash!);

    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid password',
        message: 'Password is incorrect'
      });
      return;
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await user.save();

    logger.info({ userId: user._id }, '2FA disabled');

    res.json({
      success: true,
      data: {
        enabled: false,
        message: '2FA has been disabled'
      }
    });
  } catch (error) {
    logger.error({ error }, '2FA disable error');
    res.status(500).json({
      error: 'Disable failed',
      message: 'Failed to disable 2FA'
    });
  }
}