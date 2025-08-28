# 🚀 Tatame Production Deployment Checklist

## Day 1: Critical Configuration & Security ✅

### ✅ Generated Required Secrets
- [x] ENCRYPTION_KEY: `9d11ca3090e9aaf9046a650a496e7eb64a6afa42e3140f555be1a7215829fe62`
- [x] JWT_SECRET: `91de693e4b74ea2506a2bbf925936e5a865f198700f64b2f26f6be88fdffe0cdcd2a8ba663537f361d1be30e3826cf99dfb0bd2f61192678e6418ab22a6fbc21`
- [x] MAGIC_LINK_SECRET: `268fc291c204e995aac501ecf5f32490e2079e890369e04f3bbd86ef48525e881438890e79515fbf1811d08f89d3c86338d2cfc96b036a5b97c816a18fa30ea6`
- [x] SESSION_SECRET: `963c0c11ce8a27c0fc6373a386a71871f7109efa2ce2c87d029e061f64f512c20b38bcb19b7930a9237c023ecd3c0e965adf22949f863c2530ebaef5595d0e69`
- [x] KIWIFY_WEBHOOK_SECRET: `6b98772f23d778cf0a2ea0a2768b5451c59e2c3f6b186a7f1c3d2b04e9d696a7`

### ✅ Created Production Configuration Files
- [x] `.env.production` - Complete production environment template
- [x] `ecosystem.config.js` - PM2 production configuration
- [x] `deploy-production.sh` - Automated deployment script
- [x] `setup-database.cjs` - Database initialization script
- [x] `validate-production.cjs` - Environment validation script

### ✅ Security Hardening
- [x] Updated CORS configuration for production domains only
- [x] Enhanced security headers
- [x] Production-ready rate limiting configuration
- [x] Secure cookie settings

## Day 2: External Services Setup 🟡

### 📧 Email Service Configuration
- [ ] **Choose Email Provider**: ElasticEmail (recommended) or Brevo
- [ ] **Create Account**: Sign up and verify domain `tatame.afiliadofaixapreta.com.br`
- [ ] **Generate API Key**: Add to `ELASTIC_EMAIL_API_KEY` or `BREVO_API_KEY`
- [ ] **Test Email Delivery**: Send test email through API
- [ ] **Configure SPF/DKIM**: Set up DNS records for deliverability

### 💾 Storage Configuration  
- [ ] **Backblaze B2 Setup**: Create account and bucket `tatame-uploads`
- [ ] **Generate API Keys**: Add `B2_KEY_ID` and `B2_APPLICATION_KEY`
- [ ] **Test File Upload**: Verify bucket permissions
- [ ] **Cloudflare CDN**: Configure B2 integration with Cloudflare

### 🔐 OAuth Configuration
- [ ] **Google Console**: Create OAuth 2.0 credentials
- [ ] **Configure Redirect URLs**: Add production domain callbacks
- [ ] **Add Credentials**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] **Test OAuth Flow**: Verify social login works

## Day 3: Production Server Setup 🟡

### 🖥️ VPS Configuration
- [ ] **Deploy Server**: Ubuntu 22.04 LTS with 2GB+ RAM
- [ ] **Update System**: `sudo apt update && sudo apt upgrade`
- [ ] **Install Dependencies**: Node.js 18+, PM2, Nginx, Redis
- [ ] **Configure Firewall**: UFW with ports 22, 80, 443
- [ ] **Create Deploy User**: Non-root user with sudo privileges

### 🔧 Application Deployment
- [ ] **Clone Repository**: `git clone https://github.com/brunofarias-com/tatame.git /var/www/tatame`
- [ ] **Install Dependencies**: `cd /var/www/tatame && pnpm install`
- [ ] **Configure Environment**: Copy `.env.production` to `.env` and update all placeholders
- [ ] **Build Application**: `npm run build:all`
- [ ] **Setup Database**: `npm run setup:database`

### 🌐 Nginx Configuration
- [ ] **Create Virtual Host**: Configure reverse proxy for API and frontend
- [ ] **SSL Certificates**: Install Let's Encrypt certificates
- [ ] **Security Headers**: Configure CSP, HSTS, and other security headers
- [ ] **Enable Gzip**: Configure compression for static assets
- [ ] **Test Configuration**: `sudo nginx -t`

## Day 4: Security & Performance 🟡

### 🔒 Security Hardening
- [ ] **Update CORS Origins**: Restrict to production domains only
- [ ] **Configure Rate Limiting**: Set appropriate limits for production load
- [ ] **Secure Cookies**: Enable HttpOnly, Secure, SameSite
- [ ] **HTTPS Everywhere**: Force SSL redirects
- [ ] **Configure CSP**: Content Security Policy headers

### ⚡ Performance Optimization
- [ ] **Enable Production Mode**: Set NODE_ENV=production
- [ ] **Configure CDN**: Cloudflare for static assets
- [ ] **Database Indexes**: Verify all indexes are created
- [ ] **Caching Strategy**: Configure appropriate cache headers
- [ ] **PM2 Clustering**: Scale to multiple instances if needed

### 📊 Monitoring Setup
- [ ] **Sentry Integration**: Configure error tracking
- [ ] **Health Checks**: Set up /health endpoint monitoring
- [ ] **Log Aggregation**: Configure structured logging
- [ ] **Uptime Monitoring**: External service monitoring

## Day 5: Testing & Go-Live 🟡

### 🧪 Production Testing
- [ ] **Environment Validation**: `npm run validate:production` passes
- [ ] **API Health Check**: `curl https://tatame.afiliadofaixapreta.com.br/api/health`
- [ ] **Database Connection**: Verify MongoDB Atlas connectivity
- [ ] **Redis Connection**: Test with `redis-cli ping`
- [ ] **Email Delivery**: Send test emails

### 🔄 Critical User Flow Testing
- [ ] **Kiwify Webhook**: Test payment processing flow
  1. Webhook receives payment event
  2. User account created automatically
  3. Welcome email sent successfully
  4. Magic link login works
  5. User gains access to courses

- [ ] **Authentication Flow**: Test all login methods
  1. Email/password login
  2. Magic link authentication
  3. Google OAuth (if configured)
  4. Session persistence

- [ ] **Course Access**: Verify content delivery
  1. User can view available courses
  2. Progress tracking works
  3. Course completion updates
  4. Certificates generation (if applicable)

- [ ] **Community Chat**: Test real-time features
  1. WebSocket connections establish
  2. Messages send/receive in real-time
  3. File uploads work
  4. Channel navigation functions

### 🌐 DNS & Domain Setup
- [ ] **DNS Configuration**: Point domain to server IP
- [ ] **Cloudflare Setup**: Configure DNS and CDN
- [ ] **SSL Verification**: Ensure HTTPS works correctly
- [ ] **WWW Redirect**: Configure www to non-www redirect

## 🎯 Go-Live Final Checks

### Pre-Launch Verification
- [ ] All environment variables configured and tested
- [ ] Database indexes created and admin user exists
- [ ] SSL certificates valid and auto-renewal configured
- [ ] Monitoring and alerting active
- [ ] Backup processes scheduled and tested
- [ ] Error tracking (Sentry) receiving test errors

### Launch Execution
1. [ ] **Final Code Deploy**: Pull latest code from main branch
2. [ ] **Run Validation**: `npm run validate:production` shows all green
3. [ ] **Build Application**: `npm run build:all`
4. [ ] **Start Services**: `pm2 restart ecosystem.config.js --env production`
5. [ ] **Verify Health**: Check all endpoints respond correctly
6. [ ] **Monitor Logs**: Watch for any startup errors
7. [ ] **Test Critical Paths**: Run through main user journeys
8. [ ] **Update DNS**: Switch domain to production server (if needed)

### Post-Launch Monitoring (First 24 Hours)
- [ ] **Error Rates**: Monitor Sentry for any new errors
- [ ] **Performance**: Check API response times
- [ ] **Database**: Monitor connection pool and query performance
- [ ] **Memory Usage**: Ensure server resources are adequate
- [ ] **User Feedback**: Monitor support channels for issues

## 📞 Emergency Contacts & Recovery

### Quick Recovery Commands
```bash
# View application status
pm2 status
pm2 logs tatame-api --lines 50

# Restart application
pm2 restart tatame-api

# Check system resources
htop
df -h

# Validate configuration
npm run validate:production

# Check SSL certificate
sudo certbot certificates

# Test database connection
node -e "const {MongoClient} = require('mongodb'); new MongoClient(process.env.MONGODB_URI).connect().then(() => console.log('✅ Connected')).catch(err => console.error('❌', err.message))"
```

### Rollback Plan
1. Stop PM2 process: `pm2 stop tatame-api`
2. Switch to previous code version: `git checkout <previous-commit>`
3. Rebuild: `npm run build:all`
4. Restart: `pm2 start ecosystem.config.js --env production`

## ✅ Success Criteria

### Technical Metrics
- [ ] API response times < 200ms (p95)
- [ ] Frontend load times < 3 seconds
- [ ] Zero critical errors in first 24 hours
- [ ] 99.9% uptime achieved
- [ ] All automated backups running

### Business Metrics
- [ ] Kiwify webhook processing 100% success rate
- [ ] Email delivery rate > 98%
- [ ] User registration/login flow working seamlessly
- [ ] Course access permissions correct
- [ ] Community features fully functional

## 🎉 Production Deployment Complete!

**🌐 Live URLs:**
- Frontend: https://tatame.afiliadofaixapreta.com.br
- API: https://tatame.afiliadofaixapreta.com.br/api
- Health Check: https://tatame.afiliadofaixapreta.com.br/api/health

**👤 Default Admin Access:**
- Email: `admin@tatame.com` 
- Password: `TatameAdmin2024!`
- ⚠️ **Change password immediately after first login!**

**🔗 Kiwify Webhook URL:**
`https://tatame.afiliadofaixapreta.com.br/api/webhooks/kiwify`

---

## 📝 Notes
- Keep this checklist updated as you complete each item
- Document any issues or deviations from the plan
- Save all credentials securely (use password manager)
- Schedule regular maintenance and security updates