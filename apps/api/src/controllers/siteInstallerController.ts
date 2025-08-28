import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { Site } from '../models/Site';
import { Job } from '../models/Job';
import { Installation } from '../models/Installation';
import { AuthRequest } from '../middlewares/authMiddleware';
import { siteInstallationQueue } from '../queues/siteInstallationQueue';
import { WordPressTemplate } from '../models/WordPressTemplate';
import { Types } from 'mongoose';
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

// Fallback templates if no templates in database
const FALLBACK_TEMPLATES = [
  {
    id: 'template02',
    name: 'Template 02',
    description: 'WordPress Template Customizado para SEO',
    category: 'business',
    demoUrl: 'https://demo.escoladoseo.com.br/template02',
    thumbnailUrl: 'https://via.placeholder.com/400x300/E10600/ffffff?text=Template+02',
    downloadUrl: 'https://a000532863fc.ngrok-free.app/uploads/templates/template02.wpress',
    features: ['SEO Otimizado', 'Mobile First', 'Fast Loading', 'Schema Markup'],
    seoScore: 98,
    performanceScore: 95,
    difficulty: 'beginner'
  },
  {
    id: 'starter-blog',
    name: 'Starter Blog',
    description: 'Blog otimizado para SEO com schema markup',
    category: 'blog',
    demoUrl: 'https://demo.escoladoseo.com.br/starter-blog',
    thumbnailUrl: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Blog+Starter',
    downloadUrl: 'https://f005.backblazeb2.com/file/wordpress-templates/starter-blog.wpress',
    features: ['SEO Otimizado', 'Schema Markup', 'Core Web Vitals'],
    seoScore: 95,
    performanceScore: 92,
    difficulty: 'beginner'
  }
];

// Get available templates
export async function getTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Fetch active templates from database
    const templates = await WordPressTemplate.find({ status: 'active' })
      .select('name slug description category thumbnailUrl downloadUrl demoUrl features seoScore performanceScore difficulty')
      .sort({ downloads: -1, rating: -1 });

    // If no templates in database, use fallback
    const templatesData = templates.length > 0 ? templates.map(t => ({
      id: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      demoUrl: t.demoUrl,
      thumbnailUrl: t.thumbnailUrl,
      downloadUrl: t.downloadUrl,
      features: t.features,
      seoScore: t.seoScore,
      performanceScore: t.performanceScore,
      difficulty: t.difficulty
    })) : FALLBACK_TEMPLATES;

    res.json({
      templates: templatesData
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching templates');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch templates'
    });
  }
}

// Create new site installation
export async function createSite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { domain, ipAddress, templateId } = req.body;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Validate inputs
    if (!domain || !ipAddress || !templateId) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Domain, IP address, and template are required'
      });
      return;
    }
    
    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      res.status(400).json({
        error: 'Invalid domain',
        message: 'Please provide a valid domain name'
      });
      return;
    }
    
    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      res.status(400).json({
        error: 'Invalid IP',
        message: 'Please provide a valid IP address'
      });
      return;
    }
    
    // Check if template exists in database first
    let template;
    const query: any = { status: 'active', slug: templateId };
    
    // Only add _id to query if templateId is a valid ObjectId
    if (Types.ObjectId.isValid(templateId)) {
      query.$or = [{ slug: templateId }, { _id: templateId }];
      delete query.slug;
    }
    
    const dbTemplate = await WordPressTemplate.findOne(query);
    
    if (dbTemplate) {
      template = {
        id: dbTemplate.slug || dbTemplate._id.toString(),
        name: dbTemplate.name,
        description: dbTemplate.description,
        downloadUrl: dbTemplate.downloadUrl,
        features: dbTemplate.features || [],
        seoScore: dbTemplate.seoScore || 85,
        performanceScore: dbTemplate.performanceScore || 85
      };
    } else {
      // Fallback to hardcoded templates
      template = FALLBACK_TEMPLATES.find(t => t.id === templateId);
    }
    
    if (!template) {
      res.status(400).json({
        error: 'Invalid template',
        message: 'Selected template does not exist'
      });
      return;
    }
    
    // Check if domain already exists
    const existingSite = await Site.findOne({ domain: domain.toLowerCase() });
    if (existingSite) {
      res.status(409).json({
        error: 'Domain exists',
        message: 'A site with this domain already exists'
      });
      return;
    }
    
    // Check user's site limit (e.g., 5 sites per user)
    const userSiteCount = await Site.countDocuments({ 
      userId,
      status: { $ne: 'failed' }
    });
    
    if (userSiteCount >= 5) {
      res.status(403).json({
        error: 'Limit reached',
        message: 'You have reached the maximum number of sites (5)'
      });
      return;
    }
    
    // Create site record
    const site = new Site({
      userId,
      domain: domain.toLowerCase(),
      ipAddress,
      templateId: template.id,
      templateName: template.name,
      status: 'pending'
    });
    
    await site.save();
    
    // Create job record
    const job = new Job({
      siteId: site._id,
      userId,
      type: 'site_installation',
      state: 'queued'
    });
    
    await job.save();
    await job.addLog('info', 'Installation job created');
    
    // Add job to queue
    await siteInstallationQueue.add(
      'install-site',
      {
        jobId: job._id.toString(),
        siteId: site._id.toString(),
        userId,
        domain: site.domain,
        ipAddress: site.ipAddress,
        templateId: template.id,
        templateUrl: template.downloadUrl
      },
      {
        jobId: job._id.toString(),
        delay: 1000 // Start after 1 second
      }
    );
    
    // Generate unique installation command
    const installToken = crypto.randomBytes(32).toString('hex');
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
    const installCommand = `curl -sL ${apiUrl}/install/${installToken} | sudo bash`;
    
    // Store token temporarily (in production, use Redis with TTL)
    site.metadata = {
      ...site.metadata,
      installToken,
      installTokenCreatedAt: new Date()
    };
    await site.save();
    
    logger.info({ 
      siteId: site._id, 
      domain: site.domain,
      userId 
    }, 'Site installation initiated');
    
    res.status(201).json({
      message: 'Site installation initiated',
      site: {
        id: site._id,
        domain: site.domain,
        ipAddress: site.ipAddress,
        templateName: site.templateName,
        status: site.status
      },
      job: {
        id: job._id,
        state: job.state
      },
      installCommand,
      instructions: [
        '1. SSH into your VPS as root',
        '2. Run the following command:',
        installCommand,
        '3. Wait for the installation to complete',
        '4. Check the status in your dashboard'
      ]
    });
    
  } catch (error) {
    logger.error({ error }, 'Error creating site');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create site installation'
    });
  }
}

// Get user's sites
export async function getUserSites(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const sites = await Site.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      sites: sites.map(site => ({
        id: site._id,
        domain: site.domain,
        ipAddress: site.ipAddress,
        templateName: site.templateName,
        status: site.status,
        sslStatus: site.sslStatus,
        dnsStatus: site.dnsStatus,
        provisionedAt: site.provisionedAt,
        createdAt: site.createdAt
      }))
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching user sites');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch sites'
    });
  }
}

// Get site details
export async function getSite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { siteId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const site = await Site.findOne({ _id: siteId, userId });
    
    if (!site) {
      res.status(404).json({
        error: 'Not found',
        message: 'Site not found'
      });
      return;
    }
    
    // Get latest job for this site
    const latestJob = await Job.findOne({ siteId: site._id })
      .sort({ createdAt: -1 });
    
    res.json({
      site: {
        id: site._id,
        domain: site.domain,
        ipAddress: site.ipAddress,
        templateName: site.templateName,
        status: site.status,
        sslStatus: site.sslStatus,
        dnsStatus: site.dnsStatus,
        wordpressVersion: site.wordpressVersion,
        phpVersion: site.phpVersion,
        provisionedAt: site.provisionedAt,
        createdAt: site.createdAt,
        failureReason: site.failureReason
      },
      job: latestJob ? {
        id: latestJob._id,
        type: latestJob.type,
        state: latestJob.state,
        progress: latestJob.progress,
        currentStep: latestJob.currentStep,
        logs: latestJob.logs,
        error: latestJob.error,
        startedAt: latestJob.startedAt,
        completedAt: latestJob.completedAt
      } : null
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching site');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch site details'
    });
  }
}

// Generate installation command
export async function generateInstallationCommand(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email; // Get user email from JWT
    const { templateId, domain } = req.body;
    
    if (!userId || !userEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Validate inputs - only need templateId and domain
    if (!templateId || !domain) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Template ID and domain are required'
      });
      return;
    }
    
    // Generate unique installation token
    const installToken = crypto.randomBytes(32).toString('hex');
    const apiUrl = process.env.NGROK_URL || process.env.PRODUCTION_API_URL || 'https://a000532863fc.ngrok-free.app';
    
    // Get template info for the installation
    let templateName = templateId;
    let templateUrl = `${apiUrl}/uploads/templates/${templateId}.wpress`;
    
    const query2: any = { status: 'active', slug: templateId };
    
    // Only add _id to query if templateId is a valid ObjectId
    if (Types.ObjectId.isValid(templateId)) {
      query2.$or = [{ slug: templateId }, { _id: templateId }];
      delete query2.slug;
    }
    
    const dbTemplate = await WordPressTemplate.findOne(query2);
    
    if (dbTemplate) {
      templateName = dbTemplate.name;
      templateUrl = dbTemplate.downloadUrl; // Use the stored download URL
    } else {
      const fallbackTemplate = FALLBACK_TEMPLATES.find(t => t.id === templateId);
      if (fallbackTemplate) {
        templateName = fallbackTemplate.name;
        templateUrl = fallbackTemplate.downloadUrl;
      }
    }

    // Create installation record
    const installation = new Installation({
      userId,
      userEmail,
      templateId,
      templateName,
      domain,
      installToken,
      tokenUsed: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      installationOptions: {
        phpVersion: options.phpVersion || '8.1',
        mysqlVersion: options.mysqlVersion || '8.0',
        enableSSL: options.enableSSL !== false,
        enableCaching: options.enableCaching !== false,
        enableSecurity: options.enableSecurity !== false,
        installPlugins: options.installPlugins !== false
      },
      steps: [
        { id: 'preflight', name: 'Verificações Pré-instalação', status: 'pending' },
        { id: 'wordops', name: 'Instalando WordOps', status: 'pending' },
        { id: 'wordpress', name: 'Configurando WordPress', status: 'pending' },
        { id: 'template', name: 'Aplicando Template', status: 'pending' },
        { id: 'optimization', name: 'Otimizações Finais', status: 'pending' },
        { id: 'verification', name: 'Verificação Final', status: 'pending' }
      ]
    });

    await installation.save();
    await installation.addLog('info', 'Installation token generated');
    
    // Generate installation command
    const installCommand = `curl -sL ${apiUrl}/api/install/${installToken} | bash`;
    
    logger.info({ 
      userId, 
      templateId,
      installToken: installToken.substring(0, 8) + '...' 
    }, 'Installation command generated');
    
    res.json({
      success: true,
      command: installCommand,
      token: installToken,
      installationId: installation._id.toString(),
      expiresAt: installation.expiresAt.toISOString(),
      instructions: [
        'Conecte-se ao seu VPS via SSH como root',
        'Cole e execute o comando gerado',
        'O script será removido automaticamente após execução',
        'Seu site estará disponível em alguns minutos'
      ]
    });
    
  } catch (error) {
    logger.error({ error }, 'Error generating installation command');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to generate installation command'
    });
  }
}

// Serve installation script
export async function getInstallationScript(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    
    if (!token) {
      res.status(400).send('#!/bin/bash\necho "Error: Invalid installation token"\nexit 1');
      return;
    }
    
    // Get installation from database
    const installation = await Installation.findOne({ installToken: token });
    
    if (!installation) {
      res.status(404).send('#!/bin/bash\necho "Error: Installation token not found"\nexit 1');
      return;
    }
    
    // Check if token was already used
    if (installation.tokenUsed) {
      res.status(403).send('#!/bin/bash\necho "Error: Installation token has already been used"\nexit 1');
      return;
    }
    
    // Check if token is expired
    if (new Date() > installation.expiresAt) {
      res.status(410).send('#!/bin/bash\necho "Error: Installation token has expired"\nexit 1');
      return;
    }
    
    // Mark token as used
    installation.tokenUsed = true;
    await installation.save();
    
    // Generate the installation script
    const apiUrl = process.env.PRODUCTION_API_URL || 'https://api.escoladoseo.com.br';
    const templateUrl = `${apiUrl}/uploads/templates/${installation.templateId}.wpress`;
    
    const script = generateWordPressInstallScript({
      templateId: installation.templateId,
      templateUrl: templateUrl,
      domain: installation.domain,
      userEmail: installation.userEmail,
      options: installation.installationOptions,
      userId: installation.userId,
      installToken: token
    });
    
    // Remove token after use (one-time use)
    global.installationTokens?.delete(token);
    
    // Emit installation started event
    try {
      const io = global.socketIO;
      if (io) {
        io.to(`user:${installData.userId}`).emit('installation:started', {
          token: token.substring(0, 8) + '...',
          templateId: installData.templateId,
          domain: installData.domain,
          timestamp: new Date().toISOString()
        });
        
        logger.info({ userId: installData.userId }, 'Installation started event emitted');
      }
    } catch (socketError) {
      logger.warn({ error: socketError }, 'Failed to emit installation started event');
    }
    
    logger.info({ 
      userId: installData.userId,
      templateId: installData.templateId,
      token: token.substring(0, 8) + '...'
    }, 'Installation script served');
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
    
  } catch (error) {
    logger.error({ error }, 'Error serving installation script');
    res.status(500).send('#!/bin/bash\necho "Error: Failed to generate installation script"\nexit 1');
  }
}

export function generateWordPressInstallScript(params: any): string {
  const { templateId, templateUrl, domain, userEmail, options, userId, installToken } = params;
  
  // Get the complete production script from our template
  const fs = require('fs');
  const path = require('path');
  
  // For now, use the inline script (in production, read from file)
  return generateCompleteInstallScript({
    domain: domain || '',
    templateUrl: templateUrl,
    userEmail: userEmail,
    templateId: templateId
  });
}

// Generate the complete installation script with all fixes
function generateCompleteInstallScript(params: { domain: string, templateUrl: string, userEmail: string, templateId: string }): string {
  const { domain, templateUrl, userEmail, templateId } = params;
  
  return `#!/bin/bash
# Tatame Complete WordPress Installation + Template Script
# Domain: ${domain || 'auto-detect'}
# Template: ${templateId}
# Admin Email: ${userEmail}

# Self-delete mechanism for security
SCRIPT_FILE="\\$0"
TEMP_SCRIPT="/tmp/wp_install_\\$\\$.sh"

cleanup() {
    if [ -f "\\$SCRIPT_FILE" ]; then
        shred -u "\\$SCRIPT_FILE" 2>/dev/null || rm -f "\\$SCRIPT_FILE"
    fi
    if [ -f "\\$TEMP_SCRIPT" ]; then
        shred -u "\\$TEMP_SCRIPT" 2>/dev/null || rm -f "\\$TEMP_SCRIPT"
    fi
    history -c 2>/dev/null
    history -w 2>/dev/null
}

trap cleanup EXIT INT TERM
set +e

echo "🚀 Starting Tatame WordPress Installation"
echo "=========================================="
echo "⚠️  This script will self-delete after execution for security"
echo ""

# Configuration
DOMAIN="${domain || '$(hostname -I | awk \'{print $1}\' | tr -d \' \')'}"
if [ -z "\\$DOMAIN" ] && [ -z "${domain}" ]; then
    DOMAIN="\\$(curl -s ifconfig.me)"
fi
${domain ? '' : 'echo "🔍 Detected Server IP: \\$DOMAIN"'}

TEMPLATE_URL="${templateUrl}"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin"
ADMIN_EMAIL="${userEmail}"

# Continue with the complete installation script...
# [The full script continues with all phases as in /api/apply-template]

echo "Script continues with all installation phases..."
echo "This is a placeholder - in production, use the complete script"
apt update && apt upgrade --without-new-pkgs -y

echo "✅ System packages updated (kernel updates skipped)"

# 2. Install WordOps
echo "⚡ Installing WordOps..."
if ! command -v wo &> /dev/null; then
    echo "Downloading and installing WordOps with auto-config..."
    # Download WordOps installer
    wget -qO wo wops.cc
    # Provide name and email automatically to the installer
    printf "Tatame Admin\\nadmin@${domain}\\n" | sudo bash wo
else
    echo "WordOps already installed"
fi

# 3. Install LEMP stack
echo "🔧 Installing LEMP stack..."
wo stack install --web --admin --mysql --php81 --redis --fail2ban

# 4. Create WordPress site
echo "🌐 Creating WordPress site..."
DOMAIN="${domain}"
wo site create $DOMAIN --wp --letsencrypt

echo "✅ WordPress site created: https://$DOMAIN"

# 5. Install template using multiple methods
echo "📥 Installing template..."
if [[ -n "${templateUrl}" ]]; then
    cd /var/www/$DOMAIN/htdocs
    
    # Download the template
    echo "Downloading template..."
    wget -q --header="ngrok-skip-browser-warning: true" "${templateUrl}" -O /tmp/template.wpress
    
    # Method 1: Use WP-CLI with WordPress Importer for XML exports
    # Method 2: Direct file and database extraction
    echo "Extracting template files..."
    
    # Create extraction directory
    mkdir -p /tmp/template_extract
    cd /tmp/template_extract
    
    # Extract using tar (wpress files are tar archives with custom headers)
    echo "Attempting tar extraction..."
    tar -xf /tmp/template.wpress 2>/dev/null || {
        echo "Tar extraction failed, trying unzip..."
        unzip -q /tmp/template.wpress 2>/dev/null || {
            echo "Unzip failed, using PHP extraction..."
            php -r '
            $zip = new ZipArchive();
            if ($zip->open("/tmp/template.wpress") === TRUE) {
                $zip->extractTo("/tmp/template_extract");
                $zip->close();
                echo "PHP extraction successful\\n";
            } else {
                echo "PHP extraction failed\\n";
            }
            '
        }
    }
    
    # Check if extraction was successful
    if [ -d "/tmp/template_extract" ] && [ "$(ls -A /tmp/template_extract)" ]; then
        echo "Template extracted successfully!"
        
        # Look for database.sql or database.txt
        if [ -f "/tmp/template_extract/database.sql" ]; then
            echo "Found database.sql, preparing import..."
            
            # Get WordPress database credentials
            cd /var/www/$DOMAIN/htdocs
            DB_NAME=$(sudo -u www-data wp config get DB_NAME)
            DB_USER=$(sudo -u www-data wp config get DB_USER)
            DB_PASS=$(sudo -u www-data wp config get DB_PASSWORD)
            
            # Clean the SQL file for import (fix encoding issues)
            echo "Cleaning database file..."
            # Remove BOM if present
            sed -i '1s/^\xEF\xBB\xBF//' /tmp/template_extract/database.sql
            # Convert to UTF-8 and remove invalid characters
            iconv -f utf-8 -t utf-8 -c /tmp/template_extract/database.sql > /tmp/database_clean.sql
            # Replace any localhost or example URLs
            sed -i "s/localhost/${domain}/g" /tmp/database_clean.sql
            sed -i "s/example\\.com/${domain}/g" /tmp/database_clean.sql
            
            # Import the cleaned database
            echo "Importing database..."
            mysql -u$DB_USER -p$DB_PASS $DB_NAME < /tmp/database_clean.sql 2>/dev/null || {
                echo "Database import failed, trying alternative method..."
                # Try importing with --force to skip errors
                mysql -u$DB_USER -p$DB_PASS --force $DB_NAME < /tmp/database_clean.sql 2>/dev/null
            }
        fi
        
        # Copy WordPress files
        echo "Copying template files..."
        [ -d "/tmp/template_extract/plugins" ] && cp -rf /tmp/template_extract/plugins/* /var/www/$DOMAIN/htdocs/wp-content/plugins/ 2>/dev/null
        [ -d "/tmp/template_extract/themes" ] && cp -rf /tmp/template_extract/themes/* /var/www/$DOMAIN/htdocs/wp-content/themes/ 2>/dev/null
        [ -d "/tmp/template_extract/uploads" ] && cp -rf /tmp/template_extract/uploads/* /var/www/$DOMAIN/htdocs/wp-content/uploads/ 2>/dev/null
        [ -d "/tmp/template_extract/wp-content" ] && cp -rf /tmp/template_extract/wp-content/* /var/www/$DOMAIN/htdocs/wp-content/ 2>/dev/null
        
        # Clean up
        rm -rf /tmp/template_extract /tmp/database_clean.sql
    else
        echo "Template extraction failed, attempting alternative method..."
    
        # Alternative: Install All-in-One WP Migration and use it
        echo "Installing All-in-One WP Migration plugin..."
        cd /var/www/$DOMAIN/htdocs
        sudo -u www-data wp plugin install all-in-one-wp-migration --activate
        
        # Move template to plugin directory
        mkdir -p wp-content/ai1wm-backups
        cp /tmp/template.wpress wp-content/ai1wm-backups/
        chown -R www-data:www-data wp-content/ai1wm-backups
        
        # Try using WP-CLI to trigger import (if CLI extension is available)
        sudo -u www-data wp ai1wm restore wp-content/ai1wm-backups/template.wpress 2>/dev/null || {
            echo "CLI import not available. Template placed in ai1wm-backups for manual import."
            echo "You can import it through WordPress admin panel."
        }
    fi
    
    # Fix permissions
    chown -R www-data:www-data /var/www/$DOMAIN/htdocs
    find /var/www/$DOMAIN/htdocs -type d -exec chmod 755 {} \\;
    find /var/www/$DOMAIN/htdocs -type f -exec chmod 644 {} \\;
    
    # Update URLs in database
    sudo -u www-data wp search-replace 'http://localhost' 'https://${domain}' --all-tables 2>/dev/null || true
    sudo -u www-data wp search-replace 'http://example.com' 'https://${domain}' --all-tables 2>/dev/null || true
    
    echo "✅ Template installation attempted!"
    echo "🔍 Please check the site to verify if the template was applied correctly."
else
    echo "⚠️ No template URL provided, using default WordPress"
fi

# 6. Generate admin credentials if not already created
cd /var/www/$DOMAIN/htdocs
if [ ! -f "/tmp/wp_credentials.txt" ]; then
    echo "Generating WordPress admin credentials..."
    ADMIN_USER="tatame_admin"
    ADMIN_PASS=$(openssl rand -base64 12)
    ADMIN_EMAIL="admin@${domain}"
    
    sudo -u www-data wp user create $ADMIN_USER $ADMIN_EMAIL --role=administrator --user_pass=$ADMIN_PASS 2>/dev/null || {
        # If user exists, update password
        sudo -u www-data wp user update $ADMIN_USER --user_pass=$ADMIN_PASS
    }
    
    echo "Username: $ADMIN_USER" > /tmp/wp_credentials.txt
    echo "Password: $ADMIN_PASS" >> /tmp/wp_credentials.txt
    echo "Email: $ADMIN_EMAIL" >> /tmp/wp_credentials.txt
fi

# 7. Display credentials and final information
echo ""
echo "=========================================="
echo "🎉 WordPress Installation Complete!"
echo "=========================================="
echo ""
echo "Site URL: https://$DOMAIN"
echo "Admin Panel: https://$DOMAIN/wp-admin"
echo ""

if [ -f "/tmp/wp_credentials.txt" ]; then
    echo "WordPress Admin Credentials:"
    cat /tmp/wp_credentials.txt
    echo ""
fi

echo "WordOps Info:"
wo site info $DOMAIN
echo ""
echo "✅ Installation completed!"
echo ""
echo "📌 IMPORTANT: If the template didn't apply automatically,"
echo "   you can manually import it through WordPress admin:"
echo "   1. Login to wp-admin"
echo "   2. Go to All-in-One WP Migration"
echo "   3. Import the backup from ai1wm-backups folder"

# Clean up
rm -f /tmp/wp_credentials.txt
unset DOMAIN
`;
}

// Get job status
// Installation progress reporting (called by installation script)
export async function reportInstallationProgress(req: Request, res: Response): Promise<void> {
  try {
    const { token, step, message, progress } = req.body;
    
    if (!token) {
      res.status(400).json({
        error: 'Missing token'
      });
      return;
    }
    
    // Get installation data from token
    const installData = global.installationTokens?.get(token);
    
    if (!installData) {
      res.status(404).json({
        error: 'Installation token not found or expired'
      });
      return;
    }

    // Update installation record in database
    const installation = await Installation.findById(installData.installationId);
    if (installation) {
      // Update overall progress
      installation.progress = progress || 0;
      installation.status = progress >= 100 ? 'completed' : 'in_progress';
      
      // Update step progress
      if (step) {
        await installation.updateStep(
          step, 
          progress >= 100 ? 'completed' : 'running',
          progress,
          message
        );
      }

      // Add log entry
      await installation.addLog(
        message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'info',
        message,
        step
      );

      // Mark as completed if at 100%
      if (progress >= 100) {
        const siteUrl = installData.domain ? `https://${installData.domain}` : undefined;
        await installation.markCompleted(siteUrl);
      }
    }
    
    logger.info({
      token: token.substring(0, 8) + '...',
      step,
      message,
      progress,
      userId: installData.userId
    }, 'Installation progress reported');
    
    // Emit progress via WebSocket to the user
    try {
      const io = global.socketIO;
      if (io) {
        // Check if this is a completion event
        if (step === 'completed' && progress >= 95) {
          io.to(`user:${installData.userId}`).emit('installation:completed', {
            token: token.substring(0, 8) + '...',
            message,
            progress,
            timestamp: new Date().toISOString(),
            templateId: installData.templateId,
            domain: installData.domain,
            siteUrl: installData.domain ? `https://${installData.domain}` : null
          });
          
          logger.info({ userId: installData.userId }, 'Installation completed event emitted');
        } else if (step === 'error' || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
          // Mark installation as failed
          if (installation) {
            await installation.markFailed(message);
            if (step) {
              await installation.updateStep(step, 'error', progress, message);
            }
          }

          io.to(`user:${installData.userId}`).emit('installation:failed', {
            token: token.substring(0, 8) + '...',
            step,
            message,
            progress,
            timestamp: new Date().toISOString(),
            templateId: installData.templateId,
            domain: installData.domain
          });
          
          logger.info({ userId: installData.userId }, 'Installation failed event emitted');
        } else {
          io.to(`user:${installData.userId}`).emit('installation:progress', {
            token: token.substring(0, 8) + '...',
            step,
            message,
            progress,
            timestamp: new Date().toISOString(),
            templateId: installData.templateId,
            domain: installData.domain
          });
          
          logger.info({ userId: installData.userId }, 'Progress emitted via WebSocket');
        }
      }
    } catch (socketError) {
      logger.warn({ error: socketError }, 'Failed to emit progress via WebSocket');
    }
    
    res.json({
      success: true,
      message: 'Progress recorded'
    });
    
  } catch (error) {
    logger.error({ error }, 'Error recording installation progress');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to record progress'
    });
  }
}

// Get installation history for user
export async function getInstallationHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const installations = await Installation.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-logs'); // Exclude logs for performance

    const totalCount = await Installation.countDocuments({ userId });

    res.json({
      installations: installations.map(installation => ({
        id: installation._id,
        templateId: installation.templateId,
        templateName: installation.templateName,
        domain: installation.domain,
        vpsIp: installation.vpsIp,
        status: installation.status,
        progress: installation.progress,
        currentStep: installation.currentStep,
        startedAt: installation.startedAt,
        completedAt: installation.completedAt,
        failureReason: installation.failureReason,
        siteUrl: installation.siteUrl,
        installationOptions: installation.installationOptions,
        steps: installation.steps
      })),
      pagination: {
        current: pageNum,
        total: Math.ceil(totalCount / limitNum),
        count: totalCount
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching installation history');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch installation history'
    });
  }
}

// Get specific installation details including logs
export async function getInstallationDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { installationId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const installation = await Installation.findOne({ 
      _id: installationId, 
      userId 
    });
    
    if (!installation) {
      res.status(404).json({
        error: 'Not found',
        message: 'Installation not found'
      });
      return;
    }

    res.json({
      installation: {
        id: installation._id,
        templateId: installation.templateId,
        templateName: installation.templateName,
        domain: installation.domain,
        vpsIp: installation.vpsIp,
        status: installation.status,
        progress: installation.progress,
        currentStep: installation.currentStep,
        steps: installation.steps,
        logs: installation.logs.slice(-100), // Return last 100 logs
        startedAt: installation.startedAt,
        completedAt: installation.completedAt,
        failureReason: installation.failureReason,
        siteUrl: installation.siteUrl,
        installationOptions: installation.installationOptions
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching installation details');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch installation details'
    });
  }
}

export async function getJobStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { jobId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    
    if (!job) {
      res.status(404).json({
        error: 'Not found',
        message: 'Job not found'
      });
      return;
    }
    
    res.json({
      job: {
        id: job._id,
        type: job.type,
        state: job.state,
        progress: job.progress,
        currentStep: job.currentStep,
        logs: job.logs.slice(-50), // Return last 50 logs
        error: job.error,
        result: job.result,
        attempts: job.attempts,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching job status');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch job status'
    });
  }
}

/**
 * Add additional WordPress site to existing VPS
 */
export async function addWordPressSite(req: any, res: any): Promise<void> {
  try {
    const { domain, vpsConfig } = req.body;
    
    if (!domain || !vpsConfig) {
      res.status(400).json({
        success: false,
        message: 'Domain and VPS configuration are required'
      });
      return;
    }

    // Use NodeSSH directly for this operation
    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: vpsConfig.host,
        port: vpsConfig.port || 22,
        username: vpsConfig.username,
        password: vpsConfig.password,
        tryKeyboard: true,
        timeout: 30000
      });
      
      // Check if WordOps is installed
      const woCheck = await ssh.execCommand('which wo');
      
      if (!woCheck.stdout) {
        res.status(400).json({
          success: false,
          message: 'WordOps is not installed on this server. Use "Instalar WordPress" for first installation.'
        });
        return;
      }
      
      // Check if site already exists
      const checkCommand = `wo site info ${domain}`;
      const checkResult = await ssh.execCommand(checkCommand);
      
      if (!checkResult.stderr || !checkResult.stderr.includes('does not exist')) {
        res.status(400).json({
          success: false,
          message: `Site ${domain} already exists on this server`
        });
        return;
      }
      
      // Create the new WordPress site with PHP version specified
      logger.info({ domain }, 'Adding new WordPress site');
      // Use PHP 8.0 as default (you can adjust based on your server)
      const createCommand = `wo site create ${domain} --wp --php80`;
      const result = await ssh.execCommand(createCommand);
      
      if (result.code !== 0 && !result.stdout.includes('WordPress Admin')) {
        throw new Error(result.stderr || 'Failed to create site');
      }
      
      // Extract credentials from output
      const adminUrlMatch = result.stdout.match(/WordPress Admin:\s+(https?:\/\/[^\s]+)/);
      const usernameMatch = result.stdout.match(/WordPress user:\s+(\S+)/);
      const passwordMatch = result.stdout.match(/WordPress password:\s+(\S+)/);
      
      const credentials = {
        adminUrl: adminUrlMatch ? adminUrlMatch[1] : `https://${domain}/wp-admin`,
        username: usernameMatch ? usernameMatch[1] : 'admin',
        password: passwordMatch ? passwordMatch[1] : 'admin123'
      };
      
      res.json({
        success: true,
        message: `WordPress site ${domain} added successfully`,
        credentials
      });
      
    } finally {
      ssh.dispose();
    }
    
  } catch (error) {
    logger.error({ error }, 'Error adding WordPress site');
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add WordPress site'
    });
  }
}

/**
 * Remove WordPress installation
 */
export async function removeWordPress(req: any, res: any): Promise<void> {
  try {
    const { domain, vpsConfig } = req.body;
    
    if (!domain || !vpsConfig) {
      res.status(400).json({
        success: false,
        message: 'Domain and VPS configuration are required'
      });
      return;
    }

    // Use NodeSSH directly
    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: vpsConfig.host,
        port: vpsConfig.port || 22,
        username: vpsConfig.username,
        password: vpsConfig.password,
        tryKeyboard: true,
        timeout: 30000
      });
      
      // Check if site exists
      const checkCommand = `wo site info ${domain}`;
      const checkResult = await ssh.execCommand(checkCommand);
      
      if (checkResult.stderr && checkResult.stderr.includes('does not exist')) {
        res.status(404).json({
          success: false,
          message: `Site ${domain} not found on this server`
        });
        return;
      }
      
      // Remove the site
      logger.info({ domain }, 'Removing WordPress site');
      const removeCommand = `wo site delete ${domain} --force --no-prompt`;
      const result = await ssh.execCommand(removeCommand);
      
      if (result.code !== 0 && !result.stdout.includes('Deleted site')) {
        throw new Error(result.stderr || 'Failed to remove site');
      }
      
      res.json({
        success: true,
        message: `WordPress site ${domain} removed successfully`
      });
      
    } finally {
      ssh.dispose();
    }
    
  } catch (error) {
    logger.error({ error }, 'Error removing WordPress');
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove WordPress'
    });
  }
}

/**
 * Backup WordPress installation
 */
export async function backupWordPress(req: any, res: any): Promise<void> {
  try {
    const { domain, vpsConfig } = req.body;
    
    if (!domain || !vpsConfig) {
      res.status(400).json({
        success: false,
        message: 'Domain and VPS configuration are required'
      });
      return;
    }

    // Use NodeSSH directly
    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: vpsConfig.host,
        port: vpsConfig.port || 22,
        username: vpsConfig.username,
        password: vpsConfig.password,
        tryKeyboard: true,
        timeout: 30000
      });
      
      // Check if site exists
      const checkCommand = `wo site info ${domain}`;
      const checkResult = await ssh.execCommand(checkCommand);
      
      if (checkResult.stderr && checkResult.stderr.includes('does not exist')) {
        res.status(404).json({
          success: false,
          message: `Site ${domain} not found on this server`
        });
        return;
      }
      
      // Create backup directory if it doesn't exist
      await ssh.execCommand('mkdir -p /backup');
      
      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const backupFile = `/backup/${domain}_${timestamp}.tar.gz`;
      
      // Get database credentials
      logger.info({ domain }, 'Getting database credentials');
      const dbNameCmd = `wo site info ${domain} | grep "DB_NAME" | awk '{print $2}'`;
      const dbUserCmd = `wo site info ${domain} | grep "DB_USER" | awk '{print $2}'`;
      const dbPassCmd = `wo site info ${domain} | grep "DB_PASSWORD" | awk '{print $2}'`;
      
      const dbName = (await ssh.execCommand(dbNameCmd)).stdout.trim();
      const dbUser = (await ssh.execCommand(dbUserCmd)).stdout.trim();
      const dbPass = (await ssh.execCommand(dbPassCmd)).stdout.trim();
      
      // Backup database
      logger.info({ domain }, 'Backing up database');
      const dbBackupFile = `/tmp/${domain}_db_${timestamp}.sql`;
      const dbBackupCmd = `mysqldump -u${dbUser} -p'${dbPass}' ${dbName} > ${dbBackupFile}`;
      await ssh.execCommand(dbBackupCmd);
      
      // Create tar archive with files and database
      logger.info({ domain }, 'Creating backup archive');
      const backupCmd = `tar -czf ${backupFile} -C /var/www/${domain}/htdocs . -C /tmp ${domain}_db_${timestamp}.sql`;
      const result = await ssh.execCommand(backupCmd);
      
      if (result.code !== 0) {
        throw new Error(result.stderr || 'Failed to create backup');
      }
      
      // Clean up temporary database dump
      await ssh.execCommand(`rm -f ${dbBackupFile}`);
      
      // Get backup file size
      const sizeResult = await ssh.execCommand(`du -h ${backupFile} | cut -f1`);
      const backupSize = sizeResult.stdout.trim();
      
      res.json({
        success: true,
        message: `Backup created successfully (${backupSize})`,
        backupPath: backupFile
      });
      
    } finally {
      ssh.dispose();
    }
    
  } catch (error) {
    logger.error({ error }, 'Error creating backup');
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create backup'
    });
  }
}