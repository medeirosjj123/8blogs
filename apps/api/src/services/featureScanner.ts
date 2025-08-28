import fs from 'fs';
import path from 'path';
import { Feature, IFeatureDocument } from '../models/Feature';
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

export interface IFeatureManifest {
  code: string;
  name: string;
  description: string;
  category: 'seo' | 'automation' | 'monitoring' | 'optimization' | 'security' | 'analytics' | 'content';
  icon?: string;
  route?: string;
  permissions?: string[];
  config?: any;
  dependencies?: string[];
  version?: string;
  deletable?: boolean;
}

// Default features that should always exist
const DEFAULT_FEATURES: IFeatureManifest[] = [
  {
    code: 'wp-installer',
    name: 'WordPress Installer',
    description: 'Instale WordPress otimizado para SEO com 1 clique',
    category: 'automation',
    icon: 'Globe',
    route: '/tools',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      maxInstallations: 10,
      templatesEnabled: true
    },
    version: '1.0.0',
    deletable: false
  },
  {
    code: 'site-monitor',
    name: 'Monitor de Sites',
    description: 'Acompanhe a performance e uptime dos seus sites',
    category: 'monitoring',
    icon: 'Server',
    route: '/tools',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      checkInterval: 300, // seconds
      maxSites: 20
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'keyword-research',
    name: 'Pesquisa de Keywords',
    description: 'Encontre as melhores palavras-chave para seu nicho',
    category: 'seo',
    icon: 'Search',
    route: '/tools',
    permissions: ['mentor', 'moderador', 'admin'],
    config: {
      apiProvider: 'semrush',
      maxQueries: 100
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'rank-tracker',
    name: 'Rank Tracker',
    description: 'Monitore suas posições no Google em tempo real',
    category: 'monitoring',
    icon: 'BarChart',
    route: '/tools',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      updateFrequency: 'daily',
      maxKeywords: 50
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'speed-optimizer',
    name: 'Speed Optimizer',
    description: 'Otimize a velocidade do seu WordPress',
    category: 'optimization',
    icon: 'Zap',
    route: '/tools',
    permissions: ['mentor', 'moderador', 'admin'],
    config: {
      cacheEnabled: true,
      cdnIntegration: false
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'security-scanner',
    name: 'Security Scanner',
    description: 'Verifique vulnerabilidades em seus sites',
    category: 'security',
    icon: 'Shield',
    route: '/tools',
    permissions: ['moderador', 'admin'],
    config: {
      scanDepth: 'medium',
      autoFix: false
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'silo-organizer',
    name: 'Silo Organizer',
    description: 'Organize a estrutura de conteúdo do seu site',
    category: 'seo',
    icon: 'Folder',
    route: '/tools/seo/silo-organizer',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      maxProjects: 10,
      exportFormats: ['csv', 'json', 'xml']
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'outline-generator',
    name: 'Gerador de Outlines',
    description: 'Crie estruturas de artigos otimizadas para SEO',
    category: 'content',
    icon: 'FileText',
    route: '/tools/seo/outline-generator',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      aiEnabled: true,
      templates: ['blog', 'pillar', 'guide']
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'article-writer',
    name: 'Escritor de Artigos',
    description: 'Escreva artigos otimizados com IA',
    category: 'content',
    icon: 'Edit',
    route: '/tools/seo/article-writer',
    permissions: ['mentor', 'moderador', 'admin'],
    config: {
      aiProvider: 'openai',
      maxLength: 5000,
      languages: ['pt-BR', 'en-US']
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'revenue-calculator',
    name: 'Calculadora de Rendimento',
    description: 'Calcule o potencial de receita do seu site',
    category: 'analytics',
    icon: 'DollarSign',
    route: '/tools/seo/revenue-calculator',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      currency: 'BRL',
      metrics: ['adsense', 'affiliate', 'products']
    },
    version: '1.0.0',
    deletable: true
  },
  {
    code: 'review-generator',
    name: 'Gerador de Reviews',
    description: 'Crie reviews profissionais de produtos com IA para aumentar suas conversões',
    category: 'content',
    icon: 'Sparkles',
    route: '/ferramentas/gerador-reviews',
    permissions: ['aluno', 'mentor', 'moderador', 'admin'],
    config: {
      aiEnabled: true,
      contentTypes: ['bbr', 'spr', 'informational'],
      maxProducts: 10,
      enabledTypes: {
        bbr: true,
        spr: false,
        informational: false
      }
    },
    version: '1.0.0',
    deletable: false
  }
];

export class FeatureScanner {
  private featuresPath: string;

  constructor() {
    // Path to the frontend tools directory
    this.featuresPath = path.join(__dirname, '../../../../web/src/components/seo-tools');
  }

  /**
   * Scan the filesystem for feature manifests
   */
  async scanFilesystem(): Promise<IFeatureManifest[]> {
    const features: IFeatureManifest[] = [];

    try {
      // Check if the directory exists
      if (!fs.existsSync(this.featuresPath)) {
        logger.warn(`Features directory not found: ${this.featuresPath}`);
        return features;
      }

      // Read all directories in the features path
      const directories = fs.readdirSync(this.featuresPath)
        .filter(item => {
          const fullPath = path.join(this.featuresPath, item);
          return fs.statSync(fullPath).isDirectory();
        });

      // Look for feature.json in each directory
      for (const dir of directories) {
        const manifestPath = path.join(this.featuresPath, dir, 'feature.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent) as IFeatureManifest;
            
            // Validate manifest has required fields
            if (manifest.code && manifest.name && manifest.description && manifest.category) {
              features.push(manifest);
              logger.info(`Found feature manifest: ${manifest.code}`);
            } else {
              logger.warn(`Invalid manifest in ${dir}: missing required fields`);
            }
          } catch (error) {
            logger.error({ error, dir }, `Failed to parse feature manifest`);
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error scanning filesystem for features');
    }

    return features;
  }

  /**
   * Sync features from filesystem and defaults to database
   */
  async syncFeatures(): Promise<{
    added: string[];
    updated: string[];
    deprecated: string[];
    errors: string[];
  }> {
    const result = {
      added: [] as string[],
      updated: [] as string[],
      deprecated: [] as string[],
      errors: [] as string[]
    };

    try {
      // Get features from filesystem
      const filesystemFeatures = await this.scanFilesystem();
      
      // Combine with default features
      const allFeatures = [...DEFAULT_FEATURES, ...filesystemFeatures];
      
      // Get existing features from database
      const existingFeatures = await Feature.find({ deleted: false });
      const existingCodes = existingFeatures.map(f => f.code);
      
      // Process each feature
      for (const manifest of allFeatures) {
        try {
          const existing = await Feature.findOne({ code: manifest.code });
          
          if (!existing) {
            // Create new feature
            const feature = new Feature({
              code: manifest.code,
              name: manifest.name,
              description: manifest.description,
              category: manifest.category,
              icon: manifest.icon || 'Settings',
              route: manifest.route,
              permissions: manifest.permissions || ['aluno'],
              config: manifest.config || {},
              dependencies: manifest.dependencies || [],
              version: manifest.version || '1.0.0',
              deletable: manifest.deletable !== false,
              status: 'disabled' // New features start disabled
            });
            
            await feature.save();
            result.added.push(manifest.code);
            logger.info(`Added new feature: ${manifest.code}`);
          } else if (existing.deleted) {
            // Restore deleted feature if found in manifests
            existing.deleted = false;
            existing.deletedAt = undefined;
            existing.version = manifest.version || existing.version;
            await existing.save();
            result.updated.push(manifest.code);
            logger.info(`Restored feature: ${manifest.code}`);
          } else {
            // Update version if changed
            if (manifest.version && manifest.version !== existing.version) {
              existing.version = manifest.version;
              existing.description = manifest.description || existing.description;
              existing.config = { ...existing.config, ...manifest.config };
              await existing.save();
              result.updated.push(manifest.code);
              logger.info(`Updated feature version: ${manifest.code}`);
            }
          }
        } catch (error) {
          logger.error({ error, code: manifest.code }, 'Error processing feature');
          result.errors.push(manifest.code);
        }
      }
      
      // Mark features as deprecated if they're no longer in manifests
      const manifestCodes = allFeatures.map(f => f.code);
      for (const existing of existingFeatures) {
        if (!manifestCodes.includes(existing.code) && existing.status !== 'deprecated') {
          existing.status = 'deprecated';
          await existing.save();
          result.deprecated.push(existing.code);
          logger.warn(`Marked feature as deprecated: ${existing.code}`);
        }
      }
      
    } catch (error) {
      logger.error({ error }, 'Error syncing features');
      throw error;
    }
    
    return result;
  }

  /**
   * Initialize default features in database
   */
  async initializeDefaults(): Promise<void> {
    try {
      for (const manifest of DEFAULT_FEATURES) {
        const existing = await Feature.findOne({ code: manifest.code });
        
        if (!existing) {
          const feature = new Feature({
            code: manifest.code,
            name: manifest.name,
            description: manifest.description,
            category: manifest.category,
            icon: manifest.icon || 'Settings',
            route: manifest.route,
            permissions: manifest.permissions || ['aluno'],
            config: manifest.config || {},
            dependencies: manifest.dependencies || [],
            version: manifest.version || '1.0.0',
            deletable: manifest.deletable !== false,
            status: manifest.code === 'wp-installer' ? 'active' : 'disabled' // WordPress installer starts active
          });
          
          await feature.save();
          logger.info(`Initialized default feature: ${manifest.code}`);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error initializing default features');
      throw error;
    }
  }
}

// Export singleton instance
export const featureScanner = new FeatureScanner();