import { Request, Response } from 'express';
import { SeoConfig } from '../models/SeoConfig';
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

// Default SEO configurations for common pages
const DEFAULT_SEO_CONFIGS = [
  {
    page: 'home',
    title: 'Tatame - Área de Membros',
    description: 'Plataforma completa de ensino de SEO com automação de sites WordPress e comunidade ativa.',
    keywords: 'SEO, WordPress, automação, curso online, marketing digital',
    ogType: 'website'
  },
  {
    page: 'dashboard',
    title: 'Dashboard - Tatame',
    description: 'Seu painel de controle com acesso a todos os cursos e ferramentas.',
    robots: 'noindex, nofollow'
  },
  {
    page: 'courses',
    title: 'Cursos - Tatame',
    description: 'Acesse todos os cursos de SEO e marketing digital disponíveis na plataforma.',
    keywords: 'cursos SEO, marketing digital, WordPress',
    ogType: 'article'
  },
  {
    page: 'community',
    title: 'Comunidade - Tatame',
    description: 'Conecte-se com outros membros, tire dúvidas e compartilhe experiências.',
    keywords: 'comunidade, networking, SEO',
    robots: 'noindex, follow'
  },
  {
    page: 'tools',
    title: 'Ferramentas - Tatame',
    description: 'Acesse ferramentas exclusivas para SEO e automação de sites WordPress.',
    keywords: 'ferramentas SEO, automação WordPress, instalador'
  }
];

// Get all SEO configurations
export const getSeoConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await SeoConfig.find({ isActive: true }).sort({ page: 1 });
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching SEO configs');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SEO configurations'
    });
  }
};

// Get SEO config for specific page
export const getSeoConfig = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    
    const config = await SeoConfig.findOne({ page, isActive: true });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'SEO configuration not found for this page'
      });
    }

    res.json({
      success: true,
      data: config.getFullSeoData()
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching SEO config');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SEO configuration'
    });
  }
};

// Create or update SEO configuration
export const upsertSeoConfig = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    const updateData = req.body;

    // Validate required fields
    if (!updateData.title || !updateData.description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    const config = await SeoConfig.findOneAndUpdate(
      { page },
      { 
        ...updateData,
        page,
        isActive: true
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: config,
      message: 'SEO configuration saved successfully'
    });

    logger.info({ page }, 'SEO configuration updated');
  } catch (error) {
    logger.error({ error }, 'Error updating SEO config');
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map((err: any) => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update SEO configuration'
    });
  }
};

// Delete SEO configuration
export const deleteSeoConfig = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;

    const config = await SeoConfig.findOneAndUpdate(
      { page },
      { isActive: false },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'SEO configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'SEO configuration deleted successfully'
    });

    logger.info({ page }, 'SEO configuration deleted');
  } catch (error) {
    logger.error({ error }, 'Error deleting SEO config');
    res.status(500).json({
      success: false,
      message: 'Failed to delete SEO configuration'
    });
  }
};

// Initialize default SEO configurations
export const initializeSeoConfigs = async (req: Request, res: Response) => {
  try {
    const existingConfigs = await SeoConfig.find({});
    const existingPages = existingConfigs.map(config => config.page);
    
    const newConfigs = DEFAULT_SEO_CONFIGS.filter(
      config => !existingPages.includes(config.page)
    );

    if (newConfigs.length > 0) {
      await SeoConfig.insertMany(newConfigs);
      
      res.json({
        success: true,
        message: `Initialized ${newConfigs.length} default SEO configurations`,
        data: { created: newConfigs.length, existing: existingConfigs.length }
      });

      logger.info({ count: newConfigs.length }, 'Default SEO configurations initialized');
    } else {
      res.json({
        success: true,
        message: 'All default SEO configurations already exist',
        data: { created: 0, existing: existingConfigs.length }
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error initializing SEO configs');
    res.status(500).json({
      success: false,
      message: 'Failed to initialize SEO configurations'
    });
  }
};

// Generate sitemap data
export const generateSitemap = async (req: Request, res: Response) => {
  try {
    const configs = await SeoConfig.find({ 
      isActive: true,
      robots: { $not: /noindex/ }
    }).sort({ page: 1 });

    const baseUrl = process.env.SITE_URL || 'https://tatame.afiliadofaixapreta.com.br';
    
    const sitemapData = configs.map(config => ({
      page: config.page,
      url: config.canonicalUrl || `${baseUrl}/${config.page === 'home' ? '' : config.page}`,
      lastmod: config.updatedAt,
      changefreq: config.page === 'home' ? 'daily' : 'weekly',
      priority: config.page === 'home' ? '1.0' : '0.8'
    }));

    res.json({
      success: true,
      data: sitemapData
    });
  } catch (error) {
    logger.error({ error }, 'Error generating sitemap');
    res.status(500).json({
      success: false,
      message: 'Failed to generate sitemap data'
    });
  }
};

// Preview SEO data (how it would look in search results and social media)
export const previewSeoConfig = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    const testData = req.body;

    // Merge with existing config if available
    const existingConfig = await SeoConfig.findOne({ page });
    const previewData = { ...existingConfig?.toObject(), ...testData };

    const preview = {
      google: {
        title: previewData.title?.substring(0, 60) + (previewData.title?.length > 60 ? '...' : ''),
        description: previewData.description?.substring(0, 160) + (previewData.description?.length > 160 ? '...' : ''),
        url: previewData.canonicalUrl || `https://tatame.afiliadofaixapreta.com.br/${page}`
      },
      facebook: {
        title: (previewData.ogTitle || previewData.title)?.substring(0, 60),
        description: (previewData.ogDescription || previewData.description)?.substring(0, 160),
        image: previewData.ogImage,
        siteName: 'Tatame'
      },
      twitter: {
        card: previewData.twitterCard || 'summary_large_image',
        title: (previewData.twitterTitle || previewData.ogTitle || previewData.title)?.substring(0, 60),
        description: (previewData.twitterDescription || previewData.ogDescription || previewData.description)?.substring(0, 160),
        image: previewData.twitterImage || previewData.ogImage
      }
    };

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error({ error }, 'Error generating SEO preview');
    res.status(500).json({
      success: false,
      message: 'Failed to generate SEO preview'
    });
  }
};