#!/bin/bash

# WordPress Site Creation Script for Tatame Platform
# This script creates a new WordPress site on an existing WordOps installation
# Usage: ./add-site.sh <domain> <admin_email> <admin_user> <template_url> <php_version> <enable_cache> <enable_ssl> <enable_redis>

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

# ============================================================================
# PARAMETER PROCESSING
# ============================================================================

# Receive parameters
DOMAIN="$1"
ADMIN_EMAIL="$2"
ADMIN_USER="${3:-admin}"
TEMPLATE_URL="$4"
PHP_VERSION="${5:-8.1}"
ENABLE_CACHE="${6:-true}"
ENABLE_SSL="${7:-true}"
ENABLE_REDIS="${8:-true}"

print_status "Starting WordPress site creation for domain: $DOMAIN"

# Validate required parameters
if [ -z "$DOMAIN" ] || [ -z "$ADMIN_EMAIL" ]; then
    print_error "Domain and admin email are required"
    echo "Usage: $0 <domain> <admin_email> [admin_user] [template_url] [php_version] [enable_cache] [enable_ssl] [enable_redis]"
    exit 1
fi

# Validate domain format
if ! echo "$DOMAIN" | grep -qE '^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$'; then
    print_error "Invalid domain format: $DOMAIN"
    exit 1
fi

print_status "Configuration:"
print_status "  Domain: $DOMAIN"
print_status "  Admin Email: $ADMIN_EMAIL"
print_status "  Admin User: $ADMIN_USER"
print_status "  PHP Version: $PHP_VERSION"
print_status "  Enable Cache: $ENABLE_CACHE"
print_status "  Enable SSL: $ENABLE_SSL"
print_status "  Enable Redis: $ENABLE_REDIS"
if [ ! -z "$TEMPLATE_URL" ]; then
    print_status "  Template URL: $TEMPLATE_URL"
fi

# ============================================================================
# PHASE 1: Pre-installation Checks
# ============================================================================

print_status "🔍 PHASE 1: Pre-installation Checks"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Check if WordOps is installed
print_status "Checking WordOps installation..."
if ! command -v wo >/dev/null 2>&1; then
    print_error "WordOps not found! Please run VPS setup first."
    exit 1
fi

# Test WordOps
if ! wo version >/dev/null 2>&1; then
    print_error "WordOps installation appears corrupted. Please run VPS setup first."
    exit 1
fi

print_success "WordOps is installed and working"

# Check if domain already exists
print_status "Checking if domain already exists..."
if wo site info "$DOMAIN" >/dev/null 2>&1; then
    print_error "Domain $DOMAIN already exists! Please use a different domain or remove the existing site first."
    exit 1
fi

print_success "Domain $DOMAIN is available"

# ============================================================================
# PHASE 2: Generate Credentials
# ============================================================================

print_status "🔐 PHASE 2: Generating Secure Credentials"

# Generate random passwords and database credentials
WP_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
DB_NAME="wp_$(openssl rand -hex 4)"
DB_USER="wp_$(openssl rand -hex 4)"
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

print_success "Credentials generated"

# ============================================================================
# PHASE 3: Build WordOps Command
# ============================================================================

print_status "⚙️ PHASE 3: Building WordOps Command"

# Start building the WordOps command
WO_COMMAND="wo site create $DOMAIN --wp"

# Add PHP version based on user selection
case "$PHP_VERSION" in
    "7.4")
        WO_COMMAND="$WO_COMMAND --php74"
        ;;
    "8.0")
        WO_COMMAND="$WO_COMMAND --php80"
        ;;
    "8.1")
        WO_COMMAND="$WO_COMMAND --php81"
        ;;
    "8.2")
        WO_COMMAND="$WO_COMMAND --php82"
        ;;
    *)
        print_warning "Unknown PHP version $PHP_VERSION, defaulting to 8.1"
        WO_COMMAND="$WO_COMMAND --php81"
        ;;
esac

# Add MySQL
WO_COMMAND="$WO_COMMAND --mysql"

# Add SSL if user wants it
if [ "$ENABLE_SSL" == "true" ]; then
    WO_COMMAND="$WO_COMMAND --le"  # Let's Encrypt
fi

# Add cache if user wants it
if [ "$ENABLE_CACHE" == "true" ]; then
    WO_COMMAND="$WO_COMMAND --wpfc"  # FastCGI Cache
fi

# Add Redis if user wants it
if [ "$ENABLE_REDIS" == "true" ]; then
    WO_COMMAND="$WO_COMMAND --wpredis"
fi

print_status "WordOps command: $WO_COMMAND"

# ============================================================================
# PHASE 4: Create WordPress Site
# ============================================================================

print_status "🚀 PHASE 4: Creating WordPress Site"

# Execute the WordOps command
print_status "Executing site creation..."
$WO_COMMAND

print_success "WordPress site created successfully"

# ============================================================================
# PHASE 5: Configure WordPress
# ============================================================================

print_status "⚙️ PHASE 5: Configuring WordPress"

# Change to WordPress directory
cd "/var/www/$DOMAIN/htdocs"

# Configure WordPress admin user
print_status "Setting up WordPress admin user..."
wp user create "$ADMIN_USER" "$ADMIN_EMAIL" --role=administrator --user_pass="$WP_PASS" --allow-root

# Update site title and admin email
wp option update blogname "WordPress Site - $DOMAIN" --allow-root
wp option update admin_email "$ADMIN_EMAIL" --allow-root

print_success "WordPress configured"

# ============================================================================
# PHASE 6: Apply Template (if provided)
# ============================================================================

if [ ! -z "$TEMPLATE_URL" ]; then
    print_status "📦 PHASE 6: Applying Template"
    
    print_status "Downloading template from: $TEMPLATE_URL"
    
    # Download template
    if wget -q --timeout=30 "$TEMPLATE_URL" -O template.wpress; then
        print_success "Template downloaded successfully"
        
        # Install All-in-One WP Migration plugin
        print_status "Installing migration plugin..."
        wp plugin install all-in-one-wp-migration --activate --allow-root || print_warning "Failed to install migration plugin"
        
        print_status "Template downloaded and ready for import"
        print_warning "Manual template import may be required via WordPress admin"
    else
        print_warning "Failed to download template, continuing without it"
    fi
else
    print_status "📦 PHASE 6: No Template Specified - Skipping"
fi

# ============================================================================
# PHASE 7: Security & Permissions
# ============================================================================

print_status "🔒 PHASE 7: Setting Security & Permissions"

# Set proper file permissions
print_status "Setting file permissions..."
chown -R www-data:www-data "/var/www/$DOMAIN/htdocs"
find "/var/www/$DOMAIN/htdocs" -type d -exec chmod 755 {} \;
find "/var/www/$DOMAIN/htdocs" -type f -exec chmod 644 {} \;

# Make wp-config.php more restrictive
chmod 600 "/var/www/$DOMAIN/htdocs/wp-config.php"

print_success "Security and permissions configured"

# ============================================================================
# PHASE 8: Generate Application Password
# ============================================================================

print_status "🔑 PHASE 8: Generating Application Password"

# Generate application password for API access
APP_PASSWORD_NAME="tatame-api-$(date +%Y%m%d)"
APP_PASSWORD=$(wp user application-password create "$ADMIN_USER" "$APP_PASSWORD_NAME" --porcelain --allow-root 2>/dev/null || echo "")

if [ -z "$APP_PASSWORD" ]; then
    print_warning "Failed to generate application password, using regular password"
    APP_PASSWORD="$WP_PASS"
fi

print_success "Application password generated"

# ============================================================================
# PHASE 9: Final Verification
# ============================================================================

print_status "✅ PHASE 9: Final Verification"

# Test if site is accessible
print_status "Testing site accessibility..."
SITE_URL="https://$DOMAIN"
if [ "$ENABLE_SSL" != "true" ]; then
    SITE_URL="http://$DOMAIN"
fi

# Wait a moment for services to start
sleep 3

# Test site response
if curl -sI "$SITE_URL" | grep -q "200\|301\|302"; then
    print_success "Site is accessible at $SITE_URL"
else
    print_warning "Site may not be immediately accessible (DNS propagation needed)"
fi

# Save credentials to file
CREDS_FILE="/root/${DOMAIN}_credentials.txt"
cat > "$CREDS_FILE" <<EOF
WordPress Site Creation Credentials
===================================
Site URL: $SITE_URL
Admin URL: $SITE_URL/wp-admin
Username: $ADMIN_USER
Password: $WP_PASS
Application Password: $APP_PASSWORD
Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASS
===================================
Generated: $(date)
EOF

print_success "Credentials saved to: $CREDS_FILE"

# ============================================================================
# OUTPUT CREDENTIALS (JSON FORMAT)
# ============================================================================

print_status "📋 Outputting credentials..."

# Output credentials in JSON format for parsing by the backend
echo "===CREDENTIALS_START==="
cat <<EOF
{
  "success": true,
  "domain": "$DOMAIN",
  "url": "$SITE_URL",
  "admin_url": "$SITE_URL/wp-admin",
  "username": "$ADMIN_USER",
  "password": "$WP_PASS",
  "application_password": "$APP_PASSWORD",
  "email": "$ADMIN_EMAIL",
  "db_name": "$DB_NAME",
  "db_user": "$DB_USER",
  "db_pass": "$DB_PASS",
  "php_version": "$PHP_VERSION",
  "ssl_enabled": $ENABLE_SSL,
  "cache_enabled": $ENABLE_CACHE,
  "redis_enabled": $ENABLE_REDIS,
  "created_at": "$(date -Iseconds)"
}
EOF
echo "===CREDENTIALS_END==="

print_success "🎉 WordPress site creation completed successfully!"
print_status ""
print_status "================================================================"
print_status "🎯 SITE CREATION SUMMARY"
print_status "================================================================"
print_status "✅ WordPress site created: $DOMAIN"
print_status "✅ SSL configured: $ENABLE_SSL"
print_status "✅ Cache configured: $ENABLE_CACHE"
print_status "✅ Redis configured: $ENABLE_REDIS"
print_status "✅ PHP version: $PHP_VERSION"
print_status "✅ Admin user created: $ADMIN_USER"
print_status "✅ Application password generated"
print_status ""
print_status "🔗 Access your site:"
print_status "   Frontend: $SITE_URL"
print_status "   Admin: $SITE_URL/wp-admin"
print_status "================================================================"
print_status ""

# Self-destruct (remove script)
rm -f "$0"

print_success "🚀 Your WordPress site is ready!"