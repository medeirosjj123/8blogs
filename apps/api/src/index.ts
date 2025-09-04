import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { connectDatabase, isDatabaseConnected } from './database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import webhookRoutes from './routes/webhookRoutes';
import courseRoutes from './routes/courseRoutes';
import progressRoutes from './routes/progressRoutes';
import chatRoutes from './routes/chatRoutes';
import uploadRoutes from './routes/uploadRoutes';
import uploadRouter from './routes/upload.routes';
import siteRoutes from './routes/siteRoutes';
import statsRoutes from './routes/statsRoutes';
import twoFactorRoutes from './routes/twoFactorRoutes';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings.routes';
import emailTemplateRoutes from './routes/emailTemplate.routes';
import adminTemplateRoutes from './routes/admin/templateRoutes';
import userStatsRoutes from './routes/userStatsRoutes';
import discoveryRoutes from './routes/discoveryRoutes';
import connectionRoutes from './routes/connectionRoutes';
import profileSuggestionRoutes from './routes/profileSuggestionRoutes';
import notificationRoutes from './routes/notificationRoutes';
import terminalRoutes from './routes/terminalRoutes';
import featureRoutes from './routes/featureRoutes';
import categoryRoutes from './routes/categoryRoutes';
import reviewRoutes from './routes/review.routes';
import promptRoutes from './routes/prompt.routes';
import { usageRoutes } from './routes/usage.routes';
import analyticsRoutes from './routes/admin/analytics.routes';
import wordpressRoutes from './routes/wordpress.routes';
import contentSettingsRoutes from './routes/contentSettings.routes';
import aiSettingsRoutes from './routes/aiSettings.routes';
import aiModelRoutes from './routes/aiModel.routes';
import wordpressThemeRoutes from './routes/wordpressThemeRoutes';
import wordpressPluginRoutes from './routes/wordpressPluginRoutes';
import wordpressSiteRoutes from './routes/wordpressSiteRoutes';
import callRoutes from './routes/call.routes';
import { initializeSocketIO } from './socket';
import { siteInstallationWorker } from './queues/siteInstallationQueue';
import { getInstallationScript, reportInstallationProgress } from './controllers/siteInstallerController';
import { ProfileSuggestion } from './models/ProfileSuggestion';
import { webhookService } from './services/webhookService';
import { authenticate, AuthRequest } from './middlewares/authMiddleware';

// Load environment variables from project root
dotenv.config({ path: '.env' });

// Create logger instance
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

// Create Express app
const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - production-ready with environment-based origins
const corsOptions = {
  origin: function (origin: any, callback: any) {
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const allowedOrigins = isProduction ? [
      // Production origins
      frontendUrl,
      'https://bloghouse.com.br',
      'https://app.bloghouse.com.br',
      'http://app.bloghouse.com.br', // Temporary until SSL is configured
      'https://tatame.afiliadofaixapreta.com.br', // Legacy support
      'https://www.tatame.afiliadofaixapreta.com.br' // Legacy support
    ] : [
      // Development origins
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    // Allow requests with no origin only in development or for webhooks
    if (!origin) {
      return callback(null, !isProduction);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin} (production: ${isProduction})`);
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  optionsSuccessStatus: 200,
  // Cache preflight requests for 24 hours in production
  maxAge: process.env.NODE_ENV === 'production' ? 86400 : 0
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  }
}));

// Compression middleware for better performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

app.use(cors(corsOptions));
app.use(cookieParser());

// Enhanced request body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Add request validation here if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// HTTP logging middleware
app.use(pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  }
}));

// Health check route
app.get('/health', async (_req: Request, res: Response) => {
  const { getRedisInfo } = await import('./utils/redis');
  const redisInfo = await getRedisInfo();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    redis: redisInfo
  });
});

// Test WordPress themes directly
app.get('/api/test-themes', async (_req: Request, res: Response) => {
  try {
    const mongoose = await import('mongoose');
    const WordPressTheme = mongoose.default.models.WordPressTheme;
    if (!WordPressTheme) {
      return res.status(500).json({ success: false, error: 'WordPressTheme model not found' });
    }
    const themes = await WordPressTheme.find({ isActive: true }).limit(5);
    res.json({
      success: true,
      count: themes.length,
      themes: themes.map((t: any) => ({ name: t.name, category: t.category }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test route
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Tatame API is running!',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        requestMagicLink: 'POST /api/auth/request-magic-link',
        magicLinkLogin: 'GET /api/auth/magic-link-login'
      }
    }
  });
});

// Installation script endpoint (no auth required)
app.get('/api/install/:token', getInstallationScript);

// Installation progress endpoint (no auth required - called by installation script)
app.post('/api/installation-progress', reportInstallationProgress);

// Complete WordPress + Template Installation Script
// NOTE: In production, this should use authenticate middleware
// For testing: app.get('/api/apply-template', authenticate, (req: AuthRequest, res: Response) => {
app.get('/api/apply-template', (req: Request, res: Response) => {
  // Get parameters from query string
  const { template, domain } = req.query;
  
  // Validate required parameters
  if (!template || !domain) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Both template and domain parameters are required',
      example: '/api/apply-template?template=template01&domain=example.com.br'
    });
  }
  
  // Get API URL from environment (for template download)
  const apiUrl = process.env.API_URL || process.env.NGROK_URL || 'https://50a37c44b63f.ngrok-free.app';
  
  // Get user email from query parameter or use fallback (when auth is disabled for testing)
  // In production with auth: const userEmail = req.user?.email || 'admin@localhost.com';
  const userEmail = (req.query.email as string) || 'admin@localhost.com';
  
  const script = `#!/bin/bash
# Tatame Complete WordPress Installation + Template Script
# Installs WordPress from scratch and applies template
# Template: ${template}
# Domain: ${domain}
# Generated: $(date -Iseconds)

# ============================================
# DEBUG CONFIGURATION
# ============================================
set -x  # Print each command before execution
set -e  # Exit on first error
set -o pipefail  # Capture pipe failures

# Create log file on VPS
LOG_FILE="/var/log/wp-install-${domain}-\$(date +%Y%m%d-%H%M%S).log"
echo "📝 Creating log file: \$LOG_FILE"

# Redirect all output to log file and console
exec 1> >(tee -a "\$LOG_FILE")
exec 2>&1

# Error handler with line number
error_handler() {
    local line_no=\$1
    local exit_code=\$2
    echo "❌ [ERROR] Script failed at line \$line_no with exit code \$exit_code"
    echo "❌ [ERROR] Last command: \$BASH_COMMAND"
    echo "❌ [ERROR] Check log file: \$LOG_FILE"
    exit \$exit_code
}
trap 'error_handler \$LINENO \$?' ERR

# Checkpoint function for tracking progress
checkpoint() {
    echo ""
    echo "==================================================="
    echo "✅ CHECKPOINT: \$1"
    echo "⏰ TIME: \$(date '+%Y-%m-%d %H:%M:%S')"
    echo "==================================================="
    echo ""
}

# ============================================
# MAIN SCRIPT START
# ============================================

checkpoint "SCRIPT START"

echo "🚀 Starting Tatame WordPress Installation"
echo "========================================="
echo "📝 Log file: \$LOG_FILE"
echo ""

# Configuration (DYNAMIC VALUES FROM PARAMETERS)
DOMAIN="${domain}"
echo "🌐 Target Domain: \$DOMAIN"

# Template configuration (DYNAMIC BASED ON SELECTION)
TEMPLATE_URL="${apiUrl}/uploads/templates/${template}.wpress"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin"
ADMIN_EMAIL="${userEmail}"

echo "📦 Template: ${template}"
echo "📧 Admin Email: \$ADMIN_EMAIL"
echo "🔗 Template URL: \$TEMPLATE_URL"

checkpoint "CONFIGURATION COMPLETE"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Check if running as root
if [[ \$EUID -ne 0 ]]; then
   echo -e "\${RED}Error: This script must be run as root\${NC}"
   exit 1
fi

# ============================================
# PART 1: WORDPRESS INSTALLATION
# ============================================

checkpoint "PHASE 1: SYSTEM PREPARATION"

echo -e "\${GREEN}Phase 1: System Preparation\${NC}"
echo "================================"

# Update system (skip kernel updates to avoid prompts)
echo "📦 Updating system packages (skipping kernel)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update > /dev/null 2>&1
apt-get upgrade --without-new-pkgs -y > /dev/null 2>&1
echo "✅ System updated"

checkpoint "SYSTEM UPDATE COMPLETE"

# Configure firewall
echo "🔥 Configuring firewall..."
# Install ufw if not present
which ufw > /dev/null 2>&1 || apt-get install -y ufw > /dev/null 2>&1

# Configure UFW rules
echo "Opening required ports..."
ufw --force disable > /dev/null 2>&1
ufw --force reset > /dev/null 2>&1
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1

# Open necessary ports
ufw allow 22/tcp comment 'SSH' > /dev/null 2>&1 && echo "  ✓ SSH port 22"
ufw allow 80/tcp comment 'HTTP' > /dev/null 2>&1 && echo "  ✓ HTTP port 80"
ufw allow 443/tcp comment 'HTTPS' > /dev/null 2>&1 && echo "  ✓ HTTPS port 443"
ufw allow 22222/tcp comment 'WordOps Admin' > /dev/null 2>&1 && echo "  ✓ WordOps Admin port 22222"

# Enable firewall
echo "y" | ufw enable > /dev/null 2>&1
echo "✅ Firewall configured and enabled"

checkpoint "FIREWALL CONFIGURED"

# Check if WordOps is installed
if ! command -v wo &> /dev/null; then
    checkpoint "PHASE 2: INSTALLING WORDOPS"
    echo -e "\${GREEN}Phase 2: Installing WordOps\${NC}"
    echo "================================"
    
    # Download and install WordOps with automatic inputs
    echo "⚙️ Downloading WordOps..."
    wget -qO wo wops.cc
    
    echo "⚙️ Installing WordOps (this may take a few minutes)..."
    # Automatically provide name and email to WordOps installer
    printf "Tatame Admin\\nadmin@localhost.com\\n" | sudo bash wo
    
    echo "✅ WordOps installed"
    checkpoint "WORDOPS INSTALLED"
else
    echo "✅ WordOps already installed"
    checkpoint "WORDOPS ALREADY PRESENT"
fi

# Configure Git for WordOps (required for all wo commands)
echo "🔧 Configuring Git for WordOps..."
git config --global user.name "Tatame Admin" 2>/dev/null || true
git config --global user.email "admin@localhost.com" 2>/dev/null || true
echo "✅ Git configured"

# Install LEMP stack if not already installed
echo -e "\${GREEN}Phase 3: Installing Web Stack\${NC}"
echo "================================"

# Skip checking status to avoid prompts
echo "📦 Installing required stack components..."
echo "This may take 5-10 minutes. Progress will be shown below:"
echo "---------------------------------------------------------"

# Install components one by one to show progress
echo "1/6 - Installing Nginx..."
wo stack install --nginx --force

echo "2/6 - Installing PHP 8.1..."
wo stack install --php81 --force

echo "3/6 - Installing MySQL..."
wo stack install --mysql --force

echo "4/6 - Installing Redis..."
wo stack install --redis --force

echo "5/6 - Installing WP-CLI..."
wo stack install --wpcli --force

echo "6/6 - Installing Admin tools..."
wo stack install --admin --force

echo "---------------------------------------------------------"
echo "✅ Web stack ready"

checkpoint "WEB STACK INSTALLATION COMPLETE"

# Check if WordPress site exists
if [ ! -d "/var/www/\$DOMAIN" ]; then
    checkpoint "PHASE 4: CREATING WORDPRESS SITE"
    echo -e "\${GREEN}Phase 4: Creating WordPress Site\${NC}"
    echo "================================"
    echo "🌐 Creating WordPress site for \$DOMAIN..."
    echo "This will install WordPress and configure the database..."
    
    # Create WordPress without SSL for IP-based access
    if [[ "\$DOMAIN" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$ ]]; then
        # It's an IP address, don't use Let's Encrypt
        echo "📝 Setting up WordPress (IP-based access, no SSL)..."
        wo site create \$DOMAIN --wp
    else
        # It's a domain, use Let's Encrypt
        echo "📝 Setting up WordPress with SSL certificate..."
        wo site create \$DOMAIN --wp --letsencrypt
    fi
    
    echo "✅ WordPress site created"
    checkpoint "WORDPRESS SITE CREATED"
    
    # FIX 1: Ensure wp-config.php is in the right place
    if [ -f "/var/www/\$DOMAIN/wp-config.php" ] && [ ! -f "/var/www/\$DOMAIN/htdocs/wp-config.php" ]; then
        echo "📋 Moving wp-config.php to correct location..."
        cp /var/www/\$DOMAIN/wp-config.php /var/www/\$DOMAIN/htdocs/wp-config.php
        chown www-data:www-data /var/www/\$DOMAIN/htdocs/wp-config.php
    fi
    
    # FIX 2: Ensure WordPress core is installed
    cd /var/www/\$DOMAIN/htdocs
    if ! sudo -u www-data wp core is-installed 2>/dev/null; then
        echo "📦 Installing WordPress core..."
        sudo -u www-data wp core install --url="http://\$DOMAIN" --title="WordPress Site" --admin_user="admin" --admin_password="admin" --admin_email="admin@localhost.com" --skip-email 2>/dev/null || true
    fi
    
    # FIX 3: Fix nginx configuration paths
    if [ -f "/etc/nginx/sites-available/\$DOMAIN" ]; then
        echo "🔧 Fixing nginx configuration..."
        # Ensure nginx points to correct directory
        sed -i "s|root /var/www/.*/htdocs|root /var/www/\$DOMAIN/htdocs|g" /etc/nginx/sites-available/\$DOMAIN
        
        # Remove default site if it exists
        rm -f /etc/nginx/sites-enabled/default
        
        # Reload nginx
        nginx -t && nginx -s reload
    fi
    
    echo ""
    echo "======================================"
    echo "WordPress installation complete!"
    echo "Now proceeding to template application..."
    echo "======================================"
    echo ""
    checkpoint "WORDPRESS INSTALLATION COMPLETE"
else
    echo "✅ WordPress site already exists"
    checkpoint "WORDPRESS SITE ALREADY EXISTS"
fi

# Install Node.js if not present (needed for template extraction)
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js (required for template extraction)..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    echo "✅ Node.js installed"
else
    echo "✅ Node.js already installed"
fi

# ============================================
# PART 2: TEMPLATE APPLICATION
# ============================================

checkpoint "PHASE 5: TEMPLATE APPLICATION START"

echo ""
echo -e "\${GREEN}Phase 5: Applying Template\${NC}"
echo "================================"
echo "Starting template application process..."

# Navigate to WordPress directory
echo "📂 Navigating to WordPress directory..."
cd /var/www/\$DOMAIN/htdocs
if [ \$? -ne 0 ]; then
    echo -e "\${RED}Error: WordPress directory not found\${NC}"
    echo "Attempting to create directory..."
    mkdir -p /var/www/\$DOMAIN/htdocs
    cd /var/www/\$DOMAIN/htdocs
fi
echo "✅ In WordPress directory: \$(pwd)"

# Download template (with resume support for large files)
echo "📥 Downloading template..."
echo "URL: \$TEMPLATE_URL"
# Use wget with continue flag for resume support
wget -c --header="ngrok-skip-browser-warning: true" -O template.wpress "\$TEMPLATE_URL"
if [ \$? -eq 0 ]; then
    echo "✅ Template downloaded successfully"
else
    echo -e "\${YELLOW}Warning: Download may have issues, attempting with curl...\${NC}"
    curl -H "ngrok-skip-browser-warning: true" -L -C - -o template.wpress "\$TEMPLATE_URL"
fi

# Verify template file
if [ -f "template.wpress" ]; then
    TEMPLATE_SIZE=\$(du -h template.wpress | cut -f1)
    echo "📊 Template size: \$TEMPLATE_SIZE"
    checkpoint "TEMPLATE DOWNLOADED SUCCESSFULLY"
else
    echo -e "\${RED}Error: Template file not found\${NC}"
    exit 1
fi

# Install Node.js if not present (needed for wpress-extract)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# Extract template using wpress-extract
echo "📦 Extracting template with wpress-extract..."
echo "This may take a minute..."
npx wpress-extract template.wpress
if [ \$? -eq 0 ]; then
    echo "✅ Template extracted successfully"
    checkpoint "TEMPLATE EXTRACTED"
else
    echo -e "\${YELLOW}Warning: Template extraction had issues but continuing...\${NC}"
    checkpoint "TEMPLATE EXTRACTION WARNING"
fi

# Auto-detect theme name (exclude default twenty* themes)
echo "🎨 Detecting theme..."
THEME_NAME=\$(ls -d template/themes/*/ 2>/dev/null | grep -v twenty | head -1 | xargs basename)
if [ ! -z "\$THEME_NAME" ]; then
    echo "Found theme: \$THEME_NAME"
else
    echo "Warning: No custom theme found"
fi

# Copy WordPress files
echo "📁 Copying template files..."
[ -d "template/plugins" ] && cp -rf template/plugins/* wp-content/plugins/ 2>/dev/null
[ -d "template/themes" ] && cp -rf template/themes/* wp-content/themes/ 2>/dev/null
[ -d "template/uploads" ] && cp -rf template/uploads/* wp-content/uploads/ 2>/dev/null
chown -R www-data:www-data wp-content/
echo "✅ Files copied"

# Auto-detect database prefix
echo "🔍 Detecting database configuration..."
DB_PREFIX=\$(sudo -u www-data wp config get table_prefix 2>/dev/null || echo "wp_")
echo "Database prefix: \$DB_PREFIX"

# Fix database (replace prefix and remove emojis)
echo "🔧 Preparing database for import..."
if [ -f "template/database.sql" ]; then
    # Replace prefix and remove problematic characters
    # Using multiple sed commands to avoid regex issues
    sed "s/SERVMASK_PREFIX_/\${DB_PREFIX}/g" template/database.sql | \\
    sed 's/💰//g' | sed 's/🔋//g' | sed 's/🤩//g' | \\
    sed 's/🖤//g' | sed 's/🎯//g' | sed 's/🚀//g' > database_fixed.sql
    echo "✅ Database prepared"
else
    echo -e "\${RED}Error: database.sql not found in template\${NC}"
    echo "Template may not contain a database export"
fi

# Get database credentials
DB_NAME=\$(sudo -u www-data wp config get DB_NAME)
DB_USER=\$(sudo -u www-data wp config get DB_USER)
DB_PASS=\$(sudo -u www-data wp config get DB_PASSWORD)
echo "Database: \$DB_NAME"

# Reset and import database
echo "💾 Importing database..."
sudo -u www-data wp db reset --yes > /dev/null 2>&1
mysql -u\$DB_USER -p\$DB_PASS --force --default-character-set=utf8mb4 \$DB_NAME < database_fixed.sql 2>/dev/null || {
    echo "Warning: Some database errors occurred, but continuing..."
}
echo "✅ Database imported"
checkpoint "DATABASE IMPORTED"

# Update site URLs
echo "🔗 Updating site URLs..."
sudo -u www-data wp option update siteurl "http://\$DOMAIN" 2>/dev/null
sudo -u www-data wp option update home "http://\$DOMAIN" 2>/dev/null

# Replace ALL domain references with new domain
echo "🔄 Replacing all domain references..."

# Common domains to replace (based on template)
COMMON_DOMAINS="euniverso.com.br www.euniverso.com.br localhost 127.0.0.1"

for OLD_DOMAIN in \$COMMON_DOMAINS; do
    echo "  Checking for \$OLD_DOMAIN..."
    sudo -u www-data wp search-replace "\$OLD_DOMAIN" "\$DOMAIN" --all-tables --skip-columns=guid --quiet
done

# Find and replace any remaining domains
OLD_DOMAINS=\$(sudo -u www-data wp db query "SELECT DISTINCT SUBSTRING_INDEX(SUBSTRING_INDEX(option_value, '://', -1), '/', 1) as domain FROM \${DB_PREFIX}options WHERE option_value LIKE 'http%'" --skip-column-names 2>/dev/null | grep -v "\$DOMAIN" | head -5)

if [ ! -z "\$OLD_DOMAINS" ]; then
    for OLD_DOMAIN in \$OLD_DOMAINS; do
        if [ ! -z "\$OLD_DOMAIN" ] && [ "\$OLD_DOMAIN" != "\$DOMAIN" ]; then
            echo "  Replacing \$OLD_DOMAIN with \$DOMAIN..."
            sudo -u www-data wp search-replace "\$OLD_DOMAIN" "\$DOMAIN" --all-tables --skip-columns=guid --quiet
        fi
    done
fi

# Ensure site uses http (not https) for IP addresses
if [[ "\$DOMAIN" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$ ]]; then
    sudo -u www-data wp search-replace "https://\$DOMAIN" "http://\$DOMAIN" --all-tables --skip-columns=guid --quiet
fi

echo "✅ URLs updated"
checkpoint "URLS UPDATED"

# Activate theme if found
if [ ! -z "\$THEME_NAME" ]; then
    echo "🎨 Activating theme: \$THEME_NAME..."
    sudo -u www-data wp theme activate "\$THEME_NAME" 2>/dev/null
    echo "✅ Theme activated"
fi

# Fix permalinks
echo "🔗 Setting permalinks..."
sudo -u www-data wp rewrite structure '/%postname%/' 2>/dev/null
sudo -u www-data wp rewrite flush 2>/dev/null
echo "✅ Permalinks configured"

# Update admin credentials to admin/admin
echo "👤 Setting admin credentials..."

# First update password for existing admin
ADMIN_ID=\$(sudo -u www-data wp user list --role=administrator --field=ID 2>/dev/null | head -1)
if [ ! -z "\$ADMIN_ID" ]; then
    echo "  Found existing admin (ID: \$ADMIN_ID)"
    sudo -u www-data wp user update \$ADMIN_ID --user_pass="\$ADMIN_PASSWORD" 2>/dev/null || true
fi

# Ensure we have an 'admin' user
if ! sudo -u www-data wp user get admin 2>/dev/null > /dev/null; then
    echo "  Creating 'admin' user..."
    sudo -u www-data wp user create admin "\$ADMIN_EMAIL" --role=administrator --user_pass="\$ADMIN_PASSWORD" 2>/dev/null || true
else
    echo "  Updating 'admin' user password..."
    sudo -u www-data wp user update admin --user_pass="\$ADMIN_PASSWORD" 2>/dev/null || true
fi

echo "✅ Admin credentials set to: admin / admin"

# Clear cache
sudo -u www-data wp cache flush 2>/dev/null

# Auto-detect PHP version and restart
PHP_VERSION=\$(ls /etc/php/ 2>/dev/null | grep -E '^[0-9]' | sort -V | tail -1)
if [ ! -z "\$PHP_VERSION" ]; then
    echo "🔄 Restarting PHP \$PHP_VERSION..."
    systemctl restart php\${PHP_VERSION}-fpm 2>/dev/null || echo "Warning: Could not restart PHP"
fi

# Clean up
echo "🧹 Cleaning up..."
rm -rf template/ template.wpress database_fixed.sql 2>/dev/null
checkpoint "CLEANUP COMPLETE"

# ============================================
# VERIFICATION PHASE
# ============================================

echo ""
echo -e "\${GREEN}Phase 6: Verification\${NC}"
echo "================================"

# Test if site is accessible
echo "🔍 Testing site accessibility..."
HTTP_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://\$DOMAIN)
if [ "\$HTTP_STATUS" = "200" ] || [ "\$HTTP_STATUS" = "301" ] || [ "\$HTTP_STATUS" = "302" ]; then
    echo "✅ Site is accessible (HTTP \$HTTP_STATUS)"
else
    echo -e "\${YELLOW}⚠️ Site returned HTTP \$HTTP_STATUS\${NC}"
fi

# Test admin login page
ADMIN_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://\$DOMAIN/wp-admin/)
if [ "\$ADMIN_STATUS" = "200" ] || [ "\$ADMIN_STATUS" = "302" ]; then
    echo "✅ Admin panel is accessible"
else
    echo -e "\${YELLOW}⚠️ Admin panel returned HTTP \$ADMIN_STATUS\${NC}"
fi

# Verify admin user exists
if sudo -u www-data wp user get admin 2>/dev/null > /dev/null; then
    echo "✅ Admin user 'admin' exists"
else
    echo -e "\${YELLOW}⚠️ Admin user not found\${NC}"
fi

checkpoint "INSTALLATION VERIFICATION COMPLETE"

echo ""
echo "=================================="
echo "✅ INSTALLATION COMPLETE!"
echo "=================================="
echo ""
echo "📌 Site URL: http://\$DOMAIN"
echo "📌 Admin Panel: http://\$DOMAIN/wp-admin"
echo "📌 Username: admin"
echo "📌 Password: admin"
echo ""
echo "🔥 Firewall Status:"
ufw status numbered 2>/dev/null | grep -E "(80|443|22|22222)" | head -4 || echo "Firewall configured"
echo ""
echo "💡 Additional Tools:"
echo "   WordOps Admin: https://\$DOMAIN:22222"
echo "   WP-CLI: Available as 'wp' command"
echo ""
echo "🎉 Your WordPress site with custom template is ready!"
echo ""
echo "⏱️ Installation completed at: \$(date)"
echo ""
echo "📝 Full log saved at: \$LOG_FILE"
echo ""

checkpoint "SCRIPT COMPLETE - SUCCESS"

# Note: Script self-deletion disabled for debugging
# To enable: uncomment the cleanup line below
# cleanup

exit 0
`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(script);
});

// Dynamic installation script endpoint (token required)
app.get('/api/install/:token', async (req: Request, res: Response) => {
  const siteController = await import('./controllers/siteInstallerController');
  return siteController.getInstallationScript(req, res);
});

// Debug endpoint to get installation logs from VPS
app.get('/api/debug/logs/:domain', async (req: Request, res: Response) => {
  const { domain } = req.params;
  const { vpsHost, vpsPassword } = req.query;
  
  if (!vpsHost || !vpsPassword) {
    return res.status(400).json({
      error: 'Missing VPS credentials',
      message: 'vpsHost and vpsPassword query parameters are required'
    });
  }
  
  try {
    const { NodeSSH } = await import('node-ssh');
    const ssh = new NodeSSH();
    
    // Connect to VPS
    await ssh.connect({
      host: vpsHost as string,
      username: 'root',
      password: vpsPassword as string,
      readyTimeout: 10000
    });
    
    // Find the latest log file for this domain
    const findLogCmd = `ls -t /var/log/wp-install-${domain}-*.log 2>/dev/null | head -1`;
    const logFileResult = await ssh.execCommand(findLogCmd);
    
    if (!logFileResult.stdout || logFileResult.stderr) {
      await ssh.dispose();
      return res.status(404).json({
        error: 'No logs found',
        message: `No installation logs found for domain: ${domain}`
      });
    }
    
    const logFile = logFileResult.stdout.trim();
    
    // Get the log content
    const catCmd = `cat ${logFile}`;
    const logContent = await ssh.execCommand(catCmd);
    
    await ssh.dispose();
    
    // Parse log for checkpoints and errors
    const lines = logContent.stdout.split('\n');
    const checkpoints = lines.filter(line => line.includes('CHECKPOINT:'));
    const errors = lines.filter(line => line.includes('[ERROR]'));
    
    res.json({
      success: true,
      domain,
      logFile,
      checkpoints: checkpoints.length,
      errors: errors.length,
      summary: {
        checkpoints,
        errors
      },
      fullLog: logContent.stdout
    });
    
  } catch (error: any) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

// Temporary test endpoint for VPS testing (no auth required) - MOVED UP
app.get('/api/test-install/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const testToken = crypto.randomBytes(16).toString('hex');
    
    // Mock installation data
    const installData = {
      userId: 'test-user',
      userEmail: 'test@escoladoseo.com.br',
      templateId: 'template01',
      templateUrl: 'https://api.escoladoseo.com.br/uploads/templates/template01.wpress',
      templateName: 'Template 01',
      domain: domain || 'test.local',
      vpsIp: '0.0.0.0',
      options: {
        userEmail: 'admin@' + (domain || 'test.local'),
        phpVersion: '8.2',
        enableSSL: true,
        enableCaching: true
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    // Store in memory for testing
    if (!global.installationTokens) {
      global.installationTokens = new Map();
    }
    global.installationTokens.set(testToken, installData);

    // Import function directly
    const siteController = await import('./controllers/siteInstallerController');
    const script = siteController.generateWordPressInstallScript({
      templateId: installData.templateId,
      templateUrl: installData.templateUrl,
      domain: installData.domain,
      vpsIp: installData.vpsIp,
      options: installData.options,
      userId: installData.userId,
      installToken: testToken
    });

    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
  } catch (error) {
    console.error('Test install error:', error);
    res.status(500).send('#!/bin/bash\necho "Error generating test script"\nexit 1');
  }
});

// Public suggestions endpoint (no auth required)
app.get('/api/suggestions/public', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const query: any = { isActive: true };
    if (category) {
      query.category = category;
    }
    
    const suggestions = await ProfileSuggestion
      .find(query)
      .sort({ category: 1, order: 1, value: 1 })
      .select('category value');
    
    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching public suggestions');
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sugestões',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/2fa', twoFactorRoutes);
app.use('/api/user', userRoutes);
app.use('/api/usage', usageRoutes); // Usage tracking routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/uploads', uploadRouter); // New upload routes for thumbnails
app.use('/api/sites', siteRoutes); // Site management (main)
app.use('/api/wordpress-sites', wordpressSiteRoutes); // WordPress site management via WordOps
app.use('/api', statsRoutes); // Stats routes are under /api directly
app.use('/api/user', userStatsRoutes); // User stats routes
app.use('/api/users', discoveryRoutes); // User discovery routes
app.use('/api/connections', connectionRoutes); // Connection management routes
app.use('/api/suggestions', profileSuggestionRoutes); // Profile suggestions routes
app.use('/api/notifications', notificationRoutes); // Notification routes
app.use('/api/terminal', terminalRoutes); // VPS Terminal routes
app.use('/api/features', featureRoutes); // Public feature routes
app.use('/api/categories', categoryRoutes); // Public category routes
app.use('/api/reviews', reviewRoutes); // Review generation routes
app.use('/api/admin', adminRoutes); // Admin routes
app.use('/api/admin/prompts', promptRoutes); // Prompt management routes
app.use('/api/admin/analytics', analyticsRoutes); // Analytics routes
app.use('/api/admin/ai-settings', aiSettingsRoutes); // AI model settings routes
app.use('/api/admin/ai-models', aiModelRoutes); // AI model management routes
app.use('/api/wordpress', wordpressRoutes); // WordPress sites management
app.use('/api/wordpress-themes', wordpressThemeRoutes); // WordPress theme management
app.use('/api/wordpress-plugins', wordpressPluginRoutes); // WordPress plugin management
app.use('/api/content-settings', contentSettingsRoutes); // Content generation settings
app.use('/api/admin/settings', settingsRoutes); // Settings routes
app.use('/api/admin/email-templates', emailTemplateRoutes); // Email template routes
app.use('/api/admin/templates', adminTemplateRoutes); // WordPress template routes
app.use('/api/calls', callRoutes); // Weekly calls management routes

// Static files for uploads (in production, use CDN)
app.use('/uploads', express.static('uploads'));


// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handler with security considerations
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Determine status code
  const statusCode = (err as any).statusCode || (err as any).status || 500;
  
  // Log error with context (but filter sensitive data)
  const sanitizedReq = {
    method: req.method,
    url: req.url,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  };

  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    req: sanitizedReq,
    statusCode
  }, 'Request error');

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    requestId: (req as any).id || 'unknown'
  });
});

// Initialize server (but don't start listening yet)
let server: any;
let io: any;

// Start server function
const startServer = async () => {
  try {
    logger.info(`Starting server on port ${PORT}...`);
    
    // Connect to MongoDB first
    await connectDatabase();
    
    // Only start Express server after successful DB connection
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Tatame API server running on http://localhost:${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🗄️  MongoDB: Connected`);
    });
    
    // Initialize Socket.IO
    io = initializeSocketIO(server);
    
    // Make socketIO globally available for other modules
    global.socketIO = io;
    
    // Initialize webhook service
    webhookService.initialize(app);
    logger.info('🪝 Webhook service initialized');
    
    logger.info(`💬 Socket.IO initialized`);
    
    // Start BullMQ worker
    logger.info(`🔧 Site installation worker started`);
    
  } catch (error) {
    console.error('Failed to start server - Full error:', error);
    logger.error({ 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error 
    }, 'Failed to start server');
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  if (server) {
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
  }

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
startServer();

export default app;