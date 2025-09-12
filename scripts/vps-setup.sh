#!/bin/bash

# ============================================================================
# Simple VPS Setup Script for WordPress
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
USER_EMAIL="admin@bloghouse.com"
USER_NAME="admin"
DEFAULT_PASSWORD="bloghouse123"

print_status "🔄 Starting VPS cleanup and WordOps installation..."

# ============================================================================
# PHASE 1: Complete VPS Cleanup
# ============================================================================

print_status "🧹 Cleaning VPS completely..."

# Update package lists
apt-get update -y

# Remove all web server components
apt-get purge -y nginx* mysql* mariadb* php* wordpress* apache2* 2>/dev/null || true
apt-get autoremove -y
apt-get autoclean

# Remove directories
rm -rf /var/www/* 2>/dev/null || true
rm -rf /etc/nginx 2>/dev/null || true
rm -rf /etc/mysql 2>/dev/null || true
rm -rf /etc/php 2>/dev/null || true
rm -rf /opt/wo 2>/dev/null || true
rm -rf /etc/wo 2>/dev/null || true

print_success "✅ VPS cleaned successfully!"

# ============================================================================
# PHASE 2: Install WordOps
# ============================================================================

print_status "📥 Installing WordOps..."

# Install WordOps (let it handle its own configuration)
wget -qO wo wops.cc && bash wo

print_success "✅ WordOps installed!"

# ============================================================================
# PHASE 3: Install WordPress Stack
# ============================================================================

print_status "📦 Installing WordPress stack..."

# Install all components needed for WordPress
wo stack install --all

print_success "✅ WordPress stack installed!"

# ============================================================================
# PHASE 4: Final Setup
# ============================================================================

# Set up basic security (fail2ban and UFW)
print_status "🛡️  Setting up basic security..."

apt-get install -y fail2ban ufw 2>/dev/null || true
systemctl enable fail2ban
systemctl start fail2ban

# Configure firewall
ufw --force enable
ufw allow 22
ufw allow 80
ufw allow 443

print_success "✅ Security configured!"

# Create status script
cat > /root/vps-status.sh << 'EOF'
#!/bin/bash
echo "=== VPS Status ==="
echo "WordOps: $(wo --version 2>/dev/null || echo 'Not installed')"
echo "Nginx: $(nginx -v 2>&1 | head -1 || echo 'Not installed')"
echo "MySQL: $(mysql --version | head -1 || echo 'Not installed')"
echo "PHP: $(php --version | head -1 || echo 'Not installed')"
echo ""
echo "Sites:"
wo site list 2>/dev/null || echo "No sites found"
EOF

chmod +x /root/vps-status.sh

print_success "🎉 VPS setup completed!"
print_status ""
print_status "================================================================"
print_status "🎯 SETUP COMPLETE"
print_status "================================================================"
print_status "✅ VPS cleaned and reset"
print_status "✅ WordOps installed"
print_status "✅ WordPress stack ready"
print_status "✅ Security configured"
print_status ""
print_status "💡 Quick commands:"
print_status "   • Check status: /root/vps-status.sh"
print_status "   • Create site: wo site create example.com --wp"
print_status "   • List sites: wo site list"
print_status "================================================================"
print_status ""
print_success "🚀 Ready to create WordPress sites!"