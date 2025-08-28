import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { WordPressTemplate, IWordPressTemplate } from '../models/WordPressTemplate';
import multer from 'multer';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
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

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max file size
  },
  fileFilter: (req, file, cb) => {
    console.log('Checking file:', file.originalname, 'fieldname:', file.fieldname, 'mimetype:', file.mimetype);
    
    // Check if it's a template file or thumbnail
    if (file.fieldname === 'template') {
      // For template files, only accept specific extensions
      const allowedExtensions = ['.wpress', '.wordpress', '.tar.gz', '.zip'];
      const hasValidExtension = allowedExtensions.some(ext => 
        file.originalname.toLowerCase().endsWith(ext)
      );
      
      if (hasValidExtension) {
        console.log('Template file accepted:', file.originalname);
        cb(null, true);
      } else {
        console.log('Template file rejected:', file.originalname);
        cb(new Error(`Invalid template file type. Only .wpress, .wordpress, .tar.gz, and .zip files are allowed. Got: ${file.originalname}`), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      // For thumbnail files, accept common image formats
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
      if (allowedImageTypes.includes(file.mimetype.toLowerCase())) {
        console.log('Thumbnail file accepted:', file.originalname);
        cb(null, true);
      } else {
        console.log('Thumbnail file rejected:', file.originalname);
        cb(new Error(`Invalid image file type. Only JPEG, PNG, GIF, and WebP images are allowed. Got: ${file.originalname}`), false);
      }
    } else {
      // Unknown field
      cb(new Error(`Unknown file field: ${file.fieldname}`), false);
    }
  }
});

export const uploadMiddleware = upload.fields([
  { name: 'template', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Get all templates (admin)
export async function getAllTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { 
      status, 
      category, 
      pricingTier,
      page = 1, 
      limit = 20 
    } = req.query;

    const query: any = {};
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (pricingTier) query.pricingTier = pricingTier;

    const skip = (Number(page) - 1) * Number(limit);

    const templates = await WordPressTemplate.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await WordPressTemplate.countDocuments(query);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching templates');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
}

// Get active templates for users
export async function getActiveTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, pricingTier } = req.query;

    const query: any = { status: 'active' };
    
    if (category) query.category = category;
    if (pricingTier) query.pricingTier = pricingTier;

    const templates = await WordPressTemplate.find(query)
      .select('-createdBy -updatedBy -__v')
      .sort({ downloads: -1, rating: -1 });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching active templates');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
}

// Get single template
export async function getTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const template = await WordPressTemplate.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found'
      });
      return;
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching template');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    });
  }
}

// Create new template
export async function createTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    logger.info('Creating template - request received');
    
    const userId = req.user?.userId;
    
    if (!userId) {
      logger.error('No userId in request');
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
    logger.info({ userId, body: req.body }, 'Template creation request');

    const {
      name,
      description,
      category,
      version,
      features,
      seoScore,
      performanceScore,
      difficulty,
      wordpressVersion,
      phpVersion,
      requiredPlugins,
      pricingTier,
      status,
      metadata
    } = req.body;

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    logger.info({ 
      hasFiles: !!files,
      templateFile: files?.template?.[0]?.originalname,
      thumbnailFile: files?.thumbnail?.[0]?.originalname 
    }, 'Files in request');
    
    if (!files?.template?.[0]) {
      logger.error('No template file in request');
      res.status(400).json({
        success: false,
        message: 'Template file is required'
      });
      return;
    }

    const templateFile = files.template[0];
    const thumbnailFile = files.thumbnail?.[0];

    // Save files locally
    let templateUpload;
    let thumbnailUrl;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const templatesDir = path.join(uploadsDir, 'templates');
    const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    
    // Generate unique filenames
    const templateHash = crypto.randomBytes(8).toString('hex');
    const templateExtension = path.extname(templateFile.originalname);
    const templateFileName = `${Date.now()}-${templateHash}${templateExtension}`;
    const templatePath = path.join(templatesDir, templateFileName);
    
    // Save template file
    fs.writeFileSync(templatePath, templateFile.buffer);
    
    templateUpload = {
      downloadUrl: `${process.env.NGROK_URL || process.env.API_URL || 'https://a000532863fc.ngrok-free.app'}/uploads/templates/${templateFileName}`,
      fileName: templateFileName,
      fileSize: templateFile.size
    };
    
    // Save thumbnail if provided
    if (thumbnailFile) {
      const thumbHash = crypto.randomBytes(8).toString('hex');
      const thumbExtension = path.extname(thumbnailFile.originalname);
      const thumbFileName = `${Date.now()}-${thumbHash}${thumbExtension}`;
      const thumbPath = path.join(thumbnailsDir, thumbFileName);
      
      fs.writeFileSync(thumbPath, thumbnailFile.buffer);
      thumbnailUrl = `${process.env.NGROK_URL || process.env.API_URL || 'https://a000532863fc.ngrok-free.app'}/uploads/thumbnails/${thumbFileName}`;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Create template document
    const template = new WordPressTemplate({
      name,
      slug, // Add the slug field
      description,
      category,
      version,
      thumbnailUrl,
      downloadUrl: templateUpload.downloadUrl,
      features: features ? (typeof features === 'string' ? JSON.parse(features) : features) : [],
      seoScore: seoScore || 85,
      performanceScore: performanceScore || 85,
      difficulty: difficulty || 'beginner',
      fileSize: templateUpload.fileSize,
      fileName: templateUpload.fileName,
      wordpressVersion,
      phpVersion: phpVersion || '8.1',
      requiredPlugins: requiredPlugins ? (typeof requiredPlugins === 'string' ? JSON.parse(requiredPlugins) : requiredPlugins) : [],
      pricingTier: pricingTier || 'free',
      status: status || 'draft',
      metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {},
      createdBy: userId
    });

    await template.save();

    logger.info({ 
      templateId: template._id, 
      name: template.name,
      userId 
    }, 'Template created successfully');

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    }, 'Error creating template');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create template'
    });
  }
}

// Update template
export async function updateTemplate(req: AuthRequest, res: Response): Promise<void> {
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

    const template = await WordPressTemplate.findById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found'
      });
      return;
    }

    const {
      name,
      description,
      category,
      version,
      features,
      seoScore,
      performanceScore,
      difficulty,
      wordpressVersion,
      phpVersion,
      requiredPlugins,
      pricingTier,
      status,
      metadata,
      demoUrl
    } = req.body;

    // Handle file uploads if new files are provided
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (files?.template?.[0]) {
      const templateFile = files.template[0];
      
      // Delete old file from local storage
      if (template.fileName) {
        const oldTemplatePath = path.join(process.cwd(), 'uploads', 'templates', template.fileName);
        if (fs.existsSync(oldTemplatePath)) {
          fs.unlinkSync(oldTemplatePath);
        }
      }
      
      // Save new template file
      const templatesDir = path.join(process.cwd(), 'uploads', 'templates');
      const templateHash = crypto.randomBytes(8).toString('hex');
      const templateExtension = path.extname(templateFile.originalname);
      const templateFileName = `${Date.now()}-${templateHash}${templateExtension}`;
      const templatePath = path.join(templatesDir, templateFileName);
      
      fs.writeFileSync(templatePath, templateFile.buffer);
      
      template.downloadUrl = `${process.env.NGROK_URL || process.env.API_URL || 'https://a000532863fc.ngrok-free.app'}/uploads/templates/${templateFileName}`;
      template.fileName = templateFileName;
      template.fileSize = templateFile.size;
    }

    if (files?.thumbnail?.[0]) {
      const thumbnailFile = files.thumbnail[0];
      
      // Save new thumbnail
      const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
      const thumbHash = crypto.randomBytes(8).toString('hex');
      const thumbExtension = path.extname(thumbnailFile.originalname);
      const thumbFileName = `${Date.now()}-${thumbHash}${thumbExtension}`;
      const thumbPath = path.join(thumbnailsDir, thumbFileName);
      
      fs.writeFileSync(thumbPath, thumbnailFile.buffer);
      
      template.thumbnailUrl = `${process.env.NGROK_URL || process.env.API_URL || 'https://a000532863fc.ngrok-free.app'}/uploads/thumbnails/${thumbFileName}`;
    }

    // Update fields
    if (name) template.name = name;
    if (description) template.description = description;
    if (category) template.category = category;
    if (version) template.version = version;
    if (demoUrl) template.demoUrl = demoUrl;
    if (features) template.features = JSON.parse(features);
    if (seoScore) template.seoScore = seoScore;
    if (performanceScore) template.performanceScore = performanceScore;
    if (difficulty) template.difficulty = difficulty;
    if (wordpressVersion) template.wordpressVersion = wordpressVersion;
    if (phpVersion) template.phpVersion = phpVersion;
    if (requiredPlugins) template.requiredPlugins = JSON.parse(requiredPlugins);
    if (pricingTier) template.pricingTier = pricingTier;
    if (status) template.status = status;
    if (metadata) template.metadata = JSON.parse(metadata);
    
    template.updatedBy = userId;

    await template.save();

    logger.info({ 
      templateId: template._id, 
      name: template.name,
      userId 
    }, 'Template updated successfully');

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error({ error }, 'Error updating template');
    res.status(500).json({
      success: false,
      message: 'Failed to update template'
    });
  }
}

// Delete template
export async function deleteTemplate(req: AuthRequest, res: Response): Promise<void> {
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

    const template = await WordPressTemplate.findById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found'
      });
      return;
    }

    // Delete files from local storage
    if (template.fileName) {
      const templatePath = path.join(process.cwd(), 'uploads', 'templates', template.fileName);
      if (fs.existsSync(templatePath)) {
        fs.unlinkSync(templatePath);
        logger.info({ fileName: template.fileName }, 'Template file deleted from local storage');
      }
    }
    
    // Delete thumbnail if exists
    if (template.thumbnailUrl) {
      const thumbnailFileName = template.thumbnailUrl.split('/').pop();
      if (thumbnailFileName) {
        const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbnailFileName);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
          logger.info({ fileName: thumbnailFileName }, 'Thumbnail deleted from local storage');
        }
      }
    }

    // Delete template document
    await template.deleteOne();

    logger.info({ 
      templateId: id, 
      name: template.name,
      userId 
    }, 'Template deleted successfully');

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting template');
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
}

// Toggle template status
export async function toggleTemplateStatus(req: AuthRequest, res: Response): Promise<void> {
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

    const template = await WordPressTemplate.findById(id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found'
      });
      return;
    }

    // Toggle status
    if (template.status === 'active') {
      template.status = 'draft';
    } else if (template.status === 'draft') {
      template.status = 'active';
    }

    template.updatedBy = userId;
    await template.save();

    logger.info({ 
      templateId: template._id, 
      name: template.name,
      newStatus: template.status,
      userId 
    }, 'Template status toggled');

    res.json({
      success: true,
      data: {
        id: template._id,
        status: template.status
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error toggling template status');
    res.status(500).json({
      success: false,
      message: 'Failed to toggle template status'
    });
  }
}