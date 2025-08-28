import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
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

// Configure multer for avatar upload
const storage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('avatar');

// Upload and process avatar
export async function handleAvatarUpload(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: 'Bad request',
        message: 'No file uploaded'
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
      return;
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const filename = `avatar-${userId}-${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Process and save image
    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Delete old avatar if exists
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), user.avatar.substring(1));
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        // File might not exist, ignore error
        logger.warn({ err, path: oldPath }, 'Failed to delete old avatar');
      }
    }

    // Update user avatar URL
    user.avatar = `/uploads/avatars/${filename}`;
    await user.save();

    logger.info({ userId, filename }, 'Avatar uploaded successfully');

    res.json({
      success: true,
      data: {
        avatar: user.avatar,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar,
          location: user.location,
          socialLinks: user.socialLinks,
          role: user.role,
          emailVerified: user.emailVerified,
          membership: user.membership,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Avatar upload error');
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload avatar'
    });
  }
}

// Delete avatar
export async function deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
      return;
    }

    // Delete avatar file if exists
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const filepath = path.join(process.cwd(), user.avatar.substring(1));
      try {
        await fs.unlink(filepath);
      } catch (err) {
        logger.warn({ err, path: filepath }, 'Failed to delete avatar file');
      }
    }

    // Remove avatar from user
    user.avatar = null;
    await user.save();

    logger.info({ userId }, 'Avatar deleted');

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Delete avatar error');
    res.status(500).json({
      error: 'Delete failed',
      message: 'Failed to delete avatar'
    });
  }
}