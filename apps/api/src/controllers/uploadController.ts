import { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { AuthRequest } from '../middlewares/authMiddleware';
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

// Configure multer for temporary storage
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 files per request
  }
});

// Process and upload image
export async function uploadImage(req: AuthRequest, res: Response): Promise<void> {
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
        error: 'No file',
        message: 'No file was uploaded'
      });
      return;
    }
    
    const file = req.file;
    
    // Generate unique filename
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${timestamp}_${uniqueId}${extension}`;
    
    // Paths for processed images
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    const originalPath = path.join(uploadsDir, 'original', filename);
    const thumbnailPath = path.join(uploadsDir, 'thumbnails', filename);
    const optimizedPath = path.join(uploadsDir, 'optimized', filename);
    
    // Ensure directories exist
    await fs.mkdir(path.dirname(originalPath), { recursive: true });
    await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
    await fs.mkdir(path.dirname(optimizedPath), { recursive: true });
    
    // Process image with sharp
    const image = sharp(file.buffer);
    const metadata = await image.metadata();
    
    // Remove EXIF data and save original (with size limit)
    await image
      .rotate() // Auto-rotate based on EXIF
      .resize(2048, 2048, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(originalPath);
    
    // Create thumbnail
    await sharp(file.buffer)
      .rotate()
      .resize(200, 200, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Create optimized version for chat display
    await sharp(file.buffer)
      .rotate()
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(optimizedPath);
    
    // Get file sizes
    const [originalStat, thumbnailStat, optimizedStat] = await Promise.all([
      fs.stat(originalPath),
      fs.stat(thumbnailPath),
      fs.stat(optimizedPath)
    ]);
    
    // In production, you would upload to S3/Cloudflare/B2
    // For now, we'll return local URLs
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    const uploadResult = {
      url: `${baseUrl}/uploads/images/optimized/${filename}`,
      thumbnailUrl: `${baseUrl}/uploads/images/thumbnails/${filename}`,
      originalUrl: `${baseUrl}/uploads/images/original/${filename}`,
      name: file.originalname,
      type: file.mimetype,
      size: optimizedStat.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      }
    };
    
    logger.info({ 
      userId, 
      filename,
      originalSize: file.size,
      optimizedSize: optimizedStat.size
    }, 'Image uploaded and processed');
    
    res.json({
      message: 'Image uploaded successfully',
      image: uploadResult
    });
    
  } catch (error) {
    logger.error({ error }, 'Error uploading image');
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload and process image'
    });
  }
}

// Upload multiple images
export async function uploadImages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        error: 'No files',
        message: 'No files were uploaded'
      });
      return;
    }
    
    const uploadPromises = req.files.map(async (file) => {
      // Generate unique filename
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${timestamp}_${uniqueId}${extension}`;
      
      // Paths for processed images
      const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
      const optimizedPath = path.join(uploadsDir, 'optimized', filename);
      const thumbnailPath = path.join(uploadsDir, 'thumbnails', filename);
      
      // Ensure directories exist
      await fs.mkdir(path.dirname(optimizedPath), { recursive: true });
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      
      // Process image
      const image = sharp(file.buffer);
      const metadata = await image.metadata();
      
      // Create optimized version
      await image
        .rotate()
        .resize(800, 800, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80, progressive: true })
        .toFile(optimizedPath);
      
      // Create thumbnail
      await sharp(file.buffer)
        .rotate()
        .resize(200, 200, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      const optimizedStat = await fs.stat(optimizedPath);
      const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      
      return {
        url: `${baseUrl}/uploads/images/optimized/${filename}`,
        thumbnailUrl: `${baseUrl}/uploads/images/thumbnails/${filename}`,
        name: file.originalname,
        type: file.mimetype,
        size: optimizedStat.size,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        }
      };
    });
    
    const uploadedImages = await Promise.all(uploadPromises);
    
    logger.info({ 
      userId, 
      count: uploadedImages.length 
    }, 'Multiple images uploaded');
    
    res.json({
      message: 'Images uploaded successfully',
      images: uploadedImages
    });
    
  } catch (error) {
    logger.error({ error }, 'Error uploading images');
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload and process images'
    });
  }
}