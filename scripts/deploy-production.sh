#!/bin/bash

# Tatame Production Deployment Script
# This script sets up the production environment on Ubuntu 22.04

set -e

echo "🚀 Starting Tatame Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    sudo apt install -y curl wget git build-essential software-properties-common
}

# Install Node.js 18+
install_nodejs() {
    log "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install pnpm
    log "Installing pnpm..."
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    export PATH="$HOME/.local/share/pnpm:$PATH"
    
    log "Node.js version: $(node --version)"
    log "npm version: $(npm --version)"
    log "pnpm version: $(pnpm --version)"
}

# Install PM2 globally
install_pm2() {
    log "Installing PM2..."
    npm install -g pm2
    
    # Setup PM2 startup script
    pm2 startup
    warn "Please run the PM2 startup command shown above to enable auto-restart on boot"
}

# Install and configure Nginx
install_nginx() {
    log "Installing and configuring Nginx..."
    sudo apt install -y nginx
    
    # Enable and start Nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    # Configure firewall
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw --force enable
    
    log "Nginx installed and configured"
}

# Install Redis
install_redis() {
    log "Installing Redis..."
    sudo apt install -y redis-server
    
    # Configure Redis for production
    sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
    sudo sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
    sudo sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    
    # Enable and restart Redis
    sudo systemctl enable redis-server
    sudo systemctl restart redis-server
    
    log "Redis installed and configured"
}

# Install SSL certificates with Certbot
install_ssl() {
    local domain=${1:-"tatame.afiliadofaixapreta.com.br"}
    
    log "Installing SSL certificate for $domain..."
    sudo apt install -y certbot python3-certbot-nginx
    
    # Get SSL certificate
    sudo certbot --nginx -d $domain --non-interactive --agree-tos --email admin@afiliadofaixapreta.com.br
    
    # Set up auto-renewal
    sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -
    
    log "SSL certificate installed for $domain"
}

# Clone and setup application
setup_application() {
    local app_dir="/var/www/tatame"
    
    log "Setting up Tatame application..."
    
    # Create application directory
    sudo mkdir -p $app_dir
    sudo chown $USER:$USER $app_dir
    
    # Clone repository (if not already cloned)
    if [ ! -d "$app_dir/.git" ]; then
        git clone https://github.com/brunofarias-com/tatame.git $app_dir
    fi
    
    cd $app_dir
    
    # Install dependencies
    log "Installing dependencies..."
    pnpm install
    
    # Copy production environment file
    if [ -f ".env.production" ]; then
        cp .env.production .env
        log "Copied production environment file"
        warn "Please edit .env file and update all placeholder values (your_*_here)"
    else
        warn "No .env.production file found. Please create .env file manually"
    fi
    
    # Build the application
    log "Building application..."
    npm run build:all
    
    log "Application setup complete in $app_dir"
}

# Create Nginx configuration
create_nginx_config() {
    local domain=${1:-"tatame.afiliadofaixapreta.com.br"}
    local app_dir="/var/www/tatame"
    
    log "Creating Nginx configuration for $domain..."
    
    sudo tee /etc/nginx/sites-available/tatame > /dev/null <<EOF
server {
    listen 80;
    server_name $domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend (React)
    root $app_dir/apps/web/dist;
    index index.html;
    
    # Handle frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API Routes
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files cache
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security: Block access to sensitive files
    location ~ /\.(ht|git|env) {
        deny all;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/tatame /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    log "Nginx configuration created and activated"
}

# Start application with PM2
start_application() {
    local app_dir="/var/www/tatame"
    
    log "Starting application with PM2..."
    cd $app_dir
    
    # Stop existing PM2 processes
    pm2 delete tatame-api 2>/dev/null || true
    
    # Start the application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    log "Application started with PM2"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Install htop for system monitoring
    sudo apt install -y htop
    
    # Setup log rotation for PM2
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
    
    log "Basic monitoring setup complete"
}

# Main deployment function
main() {
    local domain=${1:-"tatame.afiliadofaixapreta.com.br"}
    
    log "🚀 Starting Tatame Production Deployment for domain: $domain"
    
    check_root
    update_system
    install_nodejs
    install_pm2
    install_nginx
    install_redis
    setup_application
    create_nginx_config $domain
    install_ssl $domain
    start_application
    setup_monitoring
    
    log "✅ Deployment complete!"
    echo ""
    echo -e "${GREEN}🎉 Tatame is now deployed and running!${NC}"
    echo -e "${BLUE}Domain: https://$domain${NC}"
    echo -e "${BLUE}API: https://$domain/api${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Edit /var/www/tatame/.env and update all placeholder values"
    echo "2. Configure your Kiwify webhook URL: https://$domain/api/webhooks/kiwify"
    echo "3. Set up your email service (ElasticEmail or Brevo) API keys"
    echo "4. Configure Cloudflare DNS and CDN"
    echo "5. Test the application: https://$domain"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "- View logs: pm2 logs tatame-api"
    echo "- Restart app: pm2 restart tatame-api"
    echo "- Check status: pm2 status"
    echo "- View system resources: htop"
}

# Run main function with domain argument
main "$@"