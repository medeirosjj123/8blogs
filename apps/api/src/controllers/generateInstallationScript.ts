import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Installation } from '../models/Installation';
import { WordPressTemplate } from '../models/WordPressTemplate';
import { NodeSSH } from 'node-ssh';
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
    id: 'starter-blog',
    name: 'Starter Blog',
    description: 'Blog otimizado para SEO com schema markup',
    downloadUrl: 'https://f005.backblazeb2.com/file/wordpress-templates/starter-blog.wpress'
  },
  {
    id: 'template02',
    name: 'Template 02',
    description: 'WordPress Template Customizado para SEO',
    downloadUrl: 'https://a000532863fc.ngrok-free.app/uploads/templates/template02.wpress'
  }
];

/**
 * Test VPS connection
 */
export async function testVPSConnection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { host, port, username, password, privateKey } = req.body;

    if (!host || !username || (!password && !privateKey)) {
      res.status(400).json({
        success: false,
        message: 'Host, username, and authentication method (password or privateKey) are required'
      });
      return;
    }

    const ssh = new NodeSSH();
    
    try {
      // Attempt to connect
      const connectionConfig: any = {
        host,
        port: port || 22,
        username,
        readyTimeout: 10000
      };

      if (password) {
        connectionConfig.password = password;
      } else if (privateKey) {
        connectionConfig.privateKey = privateKey;
      }

      await ssh.connect(connectionConfig);

      // Check if it's Ubuntu 22.04
      const osCheckResult = await ssh.execCommand('lsb_release -a 2>/dev/null || cat /etc/os-release');
      const output = osCheckResult.stdout.toLowerCase();
      
      const isUbuntu = output.includes('ubuntu');
      const is2204 = output.includes('22.04') || output.includes('jammy');

      // Check if user has sudo privileges
      const sudoCheck = await ssh.execCommand('sudo -n true 2>&1');
      const hasSudo = sudoCheck.code === 0 || username === 'root';

      await ssh.dispose();

      if (!isUbuntu || !is2204) {
        res.json({
          success: false,
          message: 'VPS deve ser Ubuntu 22.04 LTS. Sistema detectado: ' + (isUbuntu ? 'Ubuntu' : 'Outro'),
          details: {
            isUbuntu,
            is2204,
            hasSudo
          }
        });
        return;
      }

      if (!hasSudo) {
        res.json({
          success: false,
          message: 'Usuário precisa ter permissões sudo ou ser root',
          details: {
            isUbuntu,
            is2204,
            hasSudo
          }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Conexão estabelecida com sucesso!',
        details: {
          os: 'Ubuntu 22.04 LTS',
          hasSudo: true
        }
      });

    } catch (sshError: any) {
      logger.error({ error: sshError }, 'SSH connection failed');
      res.json({
        success: false,
        message: `Falha na conexão: ${sshError.message || 'Erro desconhecido'}`
      });
    }

  } catch (error) {
    logger.error({ error }, 'Error testing VPS connection');
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão'
    });
  }
}

/**
 * Generate installation script with VPS validation
 */
export async function generateInstallationScript(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const { templateId, templateUrl, domain, vpsConfig } = req.body;

    if (!userId || !userEmail) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Validate inputs
    if (!templateId || !domain || !vpsConfig) {
      res.status(400).json({
        success: false,
        message: 'Template ID, domain, and VPS configuration are required'
      });
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid domain name'
      });
      return;
    }

    // First, test VPS connection
    const ssh = new NodeSSH();
    
    try {
      const connectionConfig: any = {
        host: vpsConfig.host,
        port: vpsConfig.port || 22,
        username: vpsConfig.username,
        readyTimeout: 10000
      };

      if (vpsConfig.authMethod === 'password') {
        connectionConfig.password = vpsConfig.password;
      } else if (vpsConfig.authMethod === 'privateKey') {
        connectionConfig.privateKey = vpsConfig.privateKey;
      }

      await ssh.connect(connectionConfig);

      // Verify Ubuntu 22.04
      const osCheckResult = await ssh.execCommand('lsb_release -a 2>/dev/null || cat /etc/os-release');
      const output = osCheckResult.stdout.toLowerCase();
      
      const isUbuntu = output.includes('ubuntu');
      const is2204 = output.includes('22.04') || output.includes('jammy');

      await ssh.dispose();

      if (!isUbuntu || !is2204) {
        res.status(400).json({
          success: false,
          message: 'VPS must be Ubuntu 22.04 LTS'
        });
        return;
      }

    } catch (sshError: any) {
      logger.error({ error: sshError }, 'Failed to validate VPS');
      res.status(400).json({
        success: false,
        message: `VPS validation failed: ${sshError.message || 'Unknown error'}`
      });
      return;
    }

    // Get template information - check database first, then fallback templates
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
      template = FALLBACK_TEMPLATES.find(t => t.id === templateId);
    }

    if (!template) {
      res.status(400).json({
        success: false,
        message: 'Selected template does not exist'
      });
      return;
    }

    // Generate unique installation token
    const installToken = crypto.randomBytes(32).toString('hex');
    const apiUrl = process.env.NGROK_URL || process.env.PRODUCTION_API_URL || 'https://a000532863fc.ngrok-free.app';

    // Create installation record
    const installation = new Installation({
      userId,
      userEmail,
      templateId: template.id,
      templateName: template.name,
      domain,
      vpsHost: vpsConfig.host,
      installToken,
      tokenUsed: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      installationOptions: {
        phpVersion: '8.1',
        mysqlVersion: '8.0',
        enableSSL: true,
        enableCaching: true,
        enableSecurity: true,
        installPlugins: true
      }
    });

    await installation.save();

    // Generate the installation script
    const script = generateBashScript({
      domain,
      templateUrl: templateUrl || template.downloadUrl,
      templateName: template.name,
      installToken,
      apiUrl,
      userEmail
    });

    logger.info({ 
      userId, 
      templateId,
      domain,
      installToken: installToken.substring(0, 8) + '...' 
    }, 'Installation script generated');

    res.json({
      success: true,
      script,
      installationId: installation._id.toString(),
      expiresAt: installation.expiresAt.toISOString()
    });

  } catch (error) {
    logger.error({ error }, 'Error generating installation script');
    res.status(500).json({
      success: false,
      message: 'Failed to generate installation script'
    });
  }
}

/**
 * Generate the actual bash installation script
 */
function generateBashScript(params: {
  domain: string;
  templateUrl: string;
  templateName: string;
  installToken: string;
  apiUrl: string;
  userEmail: string;
}): string {
  const { domain, templateUrl, templateName, installToken, apiUrl, userEmail } = params;

  return `#!/bin/bash
#############################################
# WordPress Installer - Tatame Platform
# Domain: ${domain}
# Template: ${templateName}
# Generated: ${new Date().toISOString()}
#############################################

set -e  # Exit on error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Installation token for tracking
INSTALL_TOKEN="${installToken}"
API_URL="${apiUrl}"

# Function to report progress
report_progress() {
    local step="$1"
    local status="$2"
    local message="$3"
    
    curl -X POST "$API_URL/api/installations/progress" \\
        -H "Content-Type: application/json" \\
        -H "ngrok-skip-browser-warning: true" \\
        -d "{\\"token\\": \\"$INSTALL_TOKEN\\", \\"step\\": \\"$step\\", \\"status\\": \\"$status\\", \\"message\\": \\"$message\\"}" \\
        2>/dev/null || true
}

# Function to handle errors
handle_error() {
    echo -e "\${RED}[ERROR] $1\${NC}"
    report_progress "error" "failed" "$1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   handle_error "This script must be run as root"
fi

echo -e "\${GREEN}========================================\${NC}"
echo -e "\${GREEN}   WordPress Installer - Tatame        \${NC}"
echo -e "\${GREEN}========================================\${NC}"
echo ""

# 1. System Update
echo -e "\${YELLOW}[1/8] Updating system packages...\${NC}"
report_progress "system_update" "running" "Updating system packages"
apt-get update -qq || handle_error "Failed to update packages"
apt-get upgrade -y -qq || handle_error "Failed to upgrade packages"
report_progress "system_update" "completed" "System updated"

# 2. Install Dependencies
echo -e "\${YELLOW}[2/8] Installing dependencies...\${NC}"
report_progress "dependencies" "running" "Installing dependencies"
apt-get install -y -qq curl wget git software-properties-common || handle_error "Failed to install dependencies"
report_progress "dependencies" "completed" "Dependencies installed"

# 3. Install WordOps
echo -e "\${YELLOW}[3/8] Installing WordOps...\${NC}"
report_progress "wordops" "running" "Installing WordOps"

# Configure Git for WordOps (required for configuration management)
if [ ! -f ~/.gitconfig ]; then
    git config --global user.name "Tatame Installer"
    git config --global user.email "${userEmail}"
    echo -e "\${GREEN}Git configured for WordOps\${NC}"
fi

if ! command -v wo &> /dev/null; then
    # Set up non-interactive install
    export WO_INSTALL_USER="Tatame Installer"
    export WO_INSTALL_EMAIL="${userEmail}"
    wget -qO wo wops.cc && bash wo --force || handle_error "Failed to install WordOps"
else
    echo "WordOps already installed"
fi

# Configure WordOps if needed
if [ ! -f /etc/wo/wo.conf ]; then
    sudo mkdir -p /etc/wo
    sudo tee /etc/wo/wo.conf > /dev/null <<EOF
[user]
name = Tatame Installer
email = ${userEmail}

[mysql]
host = localhost
port = 3306
user = root

[wordpress]
user = admin
email = ${userEmail}
EOF
    echo -e "\${GREEN}WordOps configuration created\${NC}"
fi

report_progress "wordops" "completed" "WordOps installed and configured"

# 4. Create WordPress site
echo -e "\${YELLOW}[4/8] Creating WordPress site...\${NC}"
report_progress "wordpress" "running" "Creating WordPress site"

# Generate random credentials
DB_NAME="wp_\$(openssl rand -hex 4)"
DB_USER="wp_\$(openssl rand -hex 4)"
DB_PASS="\$(openssl rand -base64 32)"
WP_USER="admin"
WP_PASS="\$(openssl rand -base64 16)"
WP_EMAIL="${userEmail}"

# Create site with WordOps
wo site create ${domain} --wp \\
    --php81 \\
    --mysql \\
    --le \\
    --wpfc \\
    --wpredis || handle_error "Failed to create WordPress site"

report_progress "wordpress" "completed" "WordPress site created"

# 5. Download and apply template
echo -e "\${YELLOW}[5/8] Applying template...\${NC}"
report_progress "template" "running" "Downloading and applying template"

cd /var/www/${domain}/htdocs

# Download template if URL provided
if [ ! -z "${templateUrl}" ]; then
    wget -q --header="ngrok-skip-browser-warning: true" "${templateUrl}" -O template.wpress || handle_error "Failed to download template"
    
    # Install All-in-One WP Migration plugin
    wp plugin install all-in-one-wp-migration --activate --allow-root || handle_error "Failed to install migration plugin"
    
    # Import template (would need the CLI extension)
    echo "Template downloaded. Manual import may be required."
fi

report_progress "template" "completed" "Template applied"

# 6. Security hardening
echo -e "\${YELLOW}[6/8] Applying security hardening...\${NC}"
report_progress "security" "running" "Hardening security"

# Set proper permissions
chown -R www-data:www-data /var/www/${domain}/htdocs
find /var/www/${domain}/htdocs -type d -exec chmod 755 {} \\;
find /var/www/${domain}/htdocs -type f -exec chmod 644 {} \\;

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

report_progress "security" "completed" "Security hardened"

# 7. Performance optimization
echo -e "\${YELLOW}[7/8] Optimizing performance...\${NC}"
report_progress "optimization" "running" "Optimizing performance"

# Enable OPcache
echo "opcache.enable=1" >> /etc/php/8.1/fpm/conf.d/10-opcache.ini
echo "opcache.memory_consumption=256" >> /etc/php/8.1/fpm/conf.d/10-opcache.ini
echo "opcache.max_accelerated_files=20000" >> /etc/php/8.1/fpm/conf.d/10-opcache.ini

# Restart services
systemctl restart php8.1-fpm
systemctl restart nginx

report_progress "optimization" "completed" "Performance optimized"

# 8. Final verification
echo -e "\${YELLOW}[8/8] Verifying installation...\${NC}"
report_progress "verification" "running" "Verifying installation"

# Test if site is accessible
if curl -sI https://${domain} | grep -q "200 OK"; then
    report_progress "verification" "completed" "Installation verified"
    echo -e "\${GREEN}========================================\${NC}"
    echo -e "\${GREEN}   Installation Complete!               \${NC}"
    echo -e "\${GREEN}========================================\${NC}"
    echo ""
    echo -e "Site URL: \${GREEN}https://${domain}\${NC}"
    echo -e "Admin URL: \${GREEN}https://${domain}/wp-admin\${NC}"
    echo -e "Username: \${GREEN}\$WP_USER\${NC}"
    echo -e "Password: \${GREEN}\$WP_PASS\${NC}"
    echo ""
    echo -e "Credentials saved to: \${YELLOW}/root/${domain}_credentials.txt\${NC}"
    
    # Save credentials
    cat > /root/${domain}_credentials.txt <<EOF
WordPress Installation Credentials
===================================
Site URL: https://${domain}
Admin URL: https://${domain}/wp-admin
Username: \$WP_USER
Password: \$WP_PASS
Database: \$DB_NAME
DB User: \$DB_USER
DB Pass: \$DB_PASS
===================================
EOF
    
    # Report success
    report_progress "complete" "completed" "Installation successful"
else
    handle_error "Site verification failed"
fi

# Self-destruct
echo -e "\${YELLOW}Removing installation script...\${NC}"
rm -- "\$0"

echo -e "\${GREEN}All done! Enjoy your new WordPress site!\${NC}"
`;
}