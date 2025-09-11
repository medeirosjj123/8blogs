#!/bin/bash

# VPS Setup Script for Tatame Platform
# This script completely resets and prepares a VPS for WordPress installations
# It installs WordOps, configures security, and prepares the environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to handle errors
handle_error() {
    print_error "Error on line $1: $2"
    exit 1
}

# Set trap for error handling
trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# Get user email from parameter or prompt
USER_EMAIL="${1:-}"
if [ -z "$USER_EMAIL" ]; then
    echo -n "Enter your email address: "
    read USER_EMAIL
fi

if [ -z "$USER_EMAIL" ]; then
    print_error "Email address is required for WordOps configuration"
    exit 1
fi

print_status "Starting VPS setup for user: $USER_EMAIL"
print_warning "⚠️  This will completely reset your VPS and remove all existing data!"
sleep 3

# ============================================================================
# PHASE 1: Complete VPS Reset
# ============================================================================

print_status "🔴 PHASE 1: Complete VPS Reset"

# Stop all web services
print_status "🛑 Stopping all web services..."
systemctl stop nginx apache2 mysql mariadb php* 2>/dev/null || true
killall -9 nginx apache2 mysql mariadb php-fpm 2>/dev/null || true

# Remove WordOps if exists
print_status "🗑️  Removing existing WordOps installation..."
if command -v wo >/dev/null 2>&1; then
    print_status "Found existing WordOps, removing all sites..."
    
    # Get list of sites and remove them
    if wo site list --format=text 2>/dev/null | grep -v "^$" | head -20; then
        wo site list --format=text 2>/dev/null | grep -v "^$" | head -20 | while read -r site; do
            if [ -n "$site" ]; then
                print_status "Removing site: $site"
                wo site delete "$site" --no-prompt --force 2>/dev/null || true
            fi
        done
    fi
    
    # Remove WordOps completely
    rm -rf /etc/wo /opt/wo /usr/local/bin/wo ~/.wo 2>/dev/null || true
fi

# Remove all web packages
print_status "📦 Removing web packages..."
apt-get remove --purge -y nginx* apache2* mysql* mariadb* php* 2>/dev/null || true

# Clean all web directories
print_status "🧹 Cleaning web directories..."
rm -rf /var/www/* 2>/dev/null || true
rm -rf /etc/nginx /etc/apache2 /etc/mysql /etc/php 2>/dev/null || true
rm -rf /var/lib/mysql /var/lib/mariadb 2>/dev/null || true
rm -rf /var/log/nginx /var/log/apache2 /var/log/mysql 2>/dev/null || true

# Remove Docker if exists
print_status "🐳 Removing Docker if exists..."
apt-get remove --purge -y docker* containerd* 2>/dev/null || true
rm -rf /var/lib/docker 2>/dev/null || true

# Clean package system
print_status "🧼 Cleaning package system..."
apt-get autoremove -y 2>/dev/null || true
apt-get autoclean 2>/dev/null || true
apt-get clean 2>/dev/null || true

print_success "✅ VPS reset completed!"

# ============================================================================
# PHASE 2: System Update & Dependencies
# ============================================================================

print_status "🔄 PHASE 2: System Update & Dependencies"

# Update package lists
print_status "📋 Updating package lists..."
apt-get update

# Upgrade system
print_status "⬆️  Upgrading system packages (this may take a few minutes)..."
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install essential dependencies
print_status "🔧 Installing essential dependencies..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    wget \
    git \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    zip

print_success "✅ System updated and dependencies installed!"

# ============================================================================
# PHASE 3: Security Setup (fail2ban + UFW)
# ============================================================================

print_status "🛡️  PHASE 3: Security Setup"

# Install fail2ban
print_status "🔒 Installing fail2ban..."
DEBIAN_FRONTEND=noninteractive apt-get install -y fail2ban

# Configure fail2ban
print_status "⚙️  Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban time: 1 hour
bantime = 3600
# Find time window: 10 minutes
findtime = 600
# Max retries before ban
maxretry = 3
# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/access.log
EOF

# Start and enable fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Configure UFW firewall
print_status "🔥 Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow essential ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Enable firewall
ufw --force enable

print_success "✅ Security setup completed!"
print_status "📊 fail2ban status:"
fail2ban-client status

# ============================================================================
# PHASE 4: WordOps Installation
# ============================================================================

print_status "⚡ PHASE 4: WordOps Installation"

# Configure Git for WordOps
print_status "🔧 Configuring Git..."
git config --global user.name "Tatame Installer"
git config --global user.email "$USER_EMAIL"

# Download and install WordOps
print_status "📥 Downloading and installing WordOps..."
wget -qO wo wops.cc && bash wo --force

# Wait for installation to complete
sleep 5

# Configure WordOps
print_status "⚙️  Configuring WordOps..."
mkdir -p /etc/wo

cat > /etc/wo/wo.conf << EOF
[user]
name = Tatame Installer
email = $USER_EMAIL

[mysql]
host = localhost
port = 3306
user = root

[wordpress]
user = admin
email = $USER_EMAIL
EOF

print_success "✅ WordOps installation completed!"

# ============================================================================
# PHASE 5: Verification & Finalization
# ============================================================================

print_status "🔍 PHASE 5: Verification & Finalization"

# Check WordOps installation
print_status "Verifying WordOps installation..."
if command -v wo >/dev/null 2>&1; then
    WO_VERSION=$(wo --version 2>/dev/null || echo "installed")
    print_success "✅ WordOps: $WO_VERSION"
else
    print_error "❌ WordOps installation failed"
    exit 1
fi

# Check Nginx
if command -v nginx >/dev/null 2>&1; then
    NGINX_VERSION=$(nginx -v 2>&1 | head -1)
    print_success "✅ $NGINX_VERSION"
else
    print_error "❌ Nginx not found"
fi

# Check MySQL
if command -v mysql >/dev/null 2>&1; then
    MYSQL_VERSION=$(mysql --version | head -1)
    print_success "✅ $MYSQL_VERSION"
else
    print_error "❌ MySQL not found"
fi

# Check PHP
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php --version | head -1)
    print_success "✅ $PHP_VERSION"
else
    print_error "❌ PHP not found"
fi

# Check fail2ban
if systemctl is-active --quiet fail2ban; then
    print_success "✅ fail2ban is running"
else
    print_warning "⚠️  fail2ban is not running"
fi

# Check UFW
if ufw status | grep -q "Status: active"; then
    print_success "✅ UFW firewall is active"
else
    print_warning "⚠️  UFW firewall is not active"
fi

# Create configuration marker
print_status "📝 Creating configuration marker..."
cat > /root/.vps_configured << EOF
VPS_CONFIGURED=true
CONFIGURED_AT=$(date)
CONFIGURED_BY=tatame-installer
USER_EMAIL=$USER_EMAIL
WORDOPS_VERSION=$WO_VERSION
SCRIPT_VERSION=1.0.0
EOF

# Create quick status check script
cat > /root/vps-status.sh << 'EOF'
#!/bin/bash
echo "=== VPS Status Check ==="
echo "WordOps: $(wo --version 2>/dev/null || echo 'Not installed')"
echo "Nginx: $(nginx -v 2>&1 | head -1 || echo 'Not installed')"
echo "MySQL: $(mysql --version | head -1 || echo 'Not installed')"
echo "PHP: $(php --version | head -1 || echo 'Not installed')"
echo "fail2ban: $(systemctl is-active fail2ban || echo 'Not running')"
echo "UFW: $(ufw status | head -1 || echo 'Not configured')"
echo ""
echo "WordPress Sites:"
wo site list 2>/dev/null || echo "No sites found"
EOF

chmod +x /root/vps-status.sh

print_success "🎉 VPS setup completed successfully!"
print_status ""
print_status "================================================================"
print_status "🎯 SETUP SUMMARY"
print_status "================================================================"
print_status "✅ VPS completely reset and cleaned"
print_status "✅ System updated to latest packages"
print_status "✅ WordOps installed and configured"
print_status "✅ fail2ban installed for security"
print_status "✅ UFW firewall configured (ports 22, 80, 443)"
print_status "✅ Ready to create WordPress sites"
print_status ""
print_status "💡 Quick commands:"
print_status "   • Check status: /root/vps-status.sh"
print_status "   • Create site: wo site create example.com --wp"
print_status "   • List sites: wo site list"
print_status "   • Check fail2ban: fail2ban-client status"
print_status "================================================================"
print_status ""
print_success "🚀 Your VPS is now ready for WordPress installations!"