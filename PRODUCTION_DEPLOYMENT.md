# 🚀 Tatame Production Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration ✅
- [x] Generate secure secrets (JWT, encryption keys, etc.)
- [ ] Configure MongoDB Atlas with production credentials
- [ ] Set up Redis instance for session management
- [ ] Configure email service (ElasticEmail or Brevo)
- [ ] Set up Cloudflare CDN and DNS
- [ ] Configure Backblaze B2 storage
- [ ] Set up Google OAuth credentials
- [ ] Configure monitoring with Sentry

### 2. Security Hardening ✅
- [x] Update CORS to production domains only
- [x] Set secure environment variables
- [ ] Configure SSL/HTTPS certificates
- [ ] Set up proper firewall rules
- [ ] Enable rate limiting for production

### 3. Infrastructure Setup 
- [ ] Deploy VPS with Ubuntu 22.04
- [ ] Install Node.js 18+, PM2, Nginx
- [ ] Configure reverse proxy
- [ ] Set up log rotation
- [ ] Configure automated backups

## 🔧 Quick Deployment (5 Steps)

### Step 1: Server Setup
```bash
# On your production server
wget https://raw.githubusercontent.com/brunofarias-com/tatame/main/scripts/deploy-production.sh
chmod +x deploy-production.sh
./deploy-production.sh tatame.afiliadofaixapreta.com.br
```

### Step 2: Environment Configuration
```bash
# Copy production environment file
cp .env.production .env

# Edit and update all placeholder values
nano .env
```

### Step 3: Database Setup
```bash
# Initialize database with indexes and admin user
npm run setup:database
```

### Step 4: Validate Configuration
```bash
# Check all settings before deployment
npm run validate:production
```

### Step 5: Deploy and Start
```bash
# Build and start the application
npm run build:all
pm2 start ecosystem.config.js --env production
pm2 save
```

## 📝 Environment Variables Guide

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/tatame` |
| `REDIS_URL` | Redis instance URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing key (64+ chars) | Generated automatically |
| `ENCRYPTION_KEY` | Data encryption key (32 bytes hex) | Generated automatically |
| `KIWIFY_WEBHOOK_SECRET` | Kiwify webhook verification | Generated automatically |
| `ELASTIC_EMAIL_API_KEY` | ElasticEmail API key | From ElasticEmail dashboard |
| `FRONTEND_URL` | Production frontend URL | `https://tatame.afiliadofaixapreta.com.br` |
| `API_URL` | Production API URL | `https://tatame.afiliadofaixapreta.com.br` |

### Optional but Recommended

| Variable | Description | Purpose |
|----------|-------------|---------|
| `SENTRY_DSN` | Error tracking | Monitor production errors |
| `CLOUDFLARE_API_TOKEN` | CDN management | Asset optimization |
| `GOOGLE_CLIENT_ID` | OAuth authentication | Social login |
| `B2_KEY_ID` | File storage | User uploads |

## 🛠️ Service Configuration

### 1. MongoDB Atlas
1. Create production cluster
2. Configure IP whitelist (add server IP)
3. Create database user with read/write permissions
4. Copy connection string to `MONGODB_URI`

### 2. ElasticEmail Setup
1. Sign up at [ElasticEmail](https://elasticemail.com)
2. Verify your domain (`tatame.afiliadofaixapreta.com.br`)
3. Generate API key
4. Add to `ELASTIC_EMAIL_API_KEY`

### 3. Redis Setup
```bash
# Install Redis on server
sudo apt install redis-server

# Configure for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

### 4. Cloudflare Configuration
1. Add domain to Cloudflare
2. Generate API token with Zone:Edit permissions
3. Configure DNS records:
   - A record: `@` → Server IP
   - CNAME: `www` → `tatame.afiliadofaixapreta.com.br`

## 🔒 SSL Certificate Setup

### Automatic with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tatame.afiliadofaixapreta.com.br
```

### Manual Configuration
1. Generate certificates through Cloudflare
2. Download and place in `/etc/ssl/`
3. Update Nginx configuration

## 📊 Monitoring & Maintenance

### Health Checks
- API health endpoint: `https://tatame.afiliadofaixapreta.com.br/api/health`
- Database connection test
- Redis connectivity
- Email service status

### Log Management
```bash
# View application logs
pm2 logs tatame-api

# System logs
sudo journalctl -f -u nginx

# Error logs
tail -f /var/log/tatame/api-error.log
```

### Backup Strategy
```bash
# Database backup (daily cron job)
0 2 * * * /usr/local/bin/mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)

# Application backup
0 3 * * * tar -czf /backup/app-$(date +%Y%m%d).tar.gz /var/www/tatame
```

## 🚨 Troubleshooting

### Common Issues

**1. CORS Errors**
- Check `FRONTEND_URL` matches exact domain
- Verify HTTPS is enabled
- Check browser console for specific errors

**2. Database Connection Failed**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Test with: `npm run validate:production`

**3. Email Not Sending**
- Verify ElasticEmail API key
- Check domain verification
- Test with: `curl -X POST https://api.elasticemail.com/v2/email/send`

**4. File Uploads Failing**
- Check Backblaze B2 credentials
- Verify bucket permissions
- Test connection with B2 CLI

### Recovery Procedures

**Application Crash**
```bash
pm2 restart tatame-api
pm2 logs tatame-api --lines 100
```

**Database Issues**
```bash
# Test connection
node -e "const {MongoClient} = require('mongodb'); new MongoClient(process.env.MONGODB_URI).connect().then(() => console.log('Connected')).catch(console.error)"
```

**SSL Certificate Renewal**
```bash
sudo certbot renew --dry-run
sudo systemctl reload nginx
```

## 📈 Performance Optimization

### Production Settings
- Enable Node.js cluster mode: Set `instances: 'max'` in PM2
- Configure CDN caching through Cloudflare
- Enable Nginx gzip compression
- Set appropriate cache headers

### Database Optimization
- Create proper indexes (done by `setup-database.js`)
- Monitor slow queries
- Set up read replicas if needed

## 🎯 Go-Live Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] Database indexes created
- [ ] Admin user created
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Email templates loaded
- [ ] Monitoring configured

### Launch Day
- [ ] Deploy latest code
- [ ] Run production validation
- [ ] Test critical user flows:
  - [ ] User registration
  - [ ] Kiwify webhook processing
  - [ ] Email delivery
  - [ ] Course access
  - [ ] Community chat
- [ ] Monitor logs for errors
- [ ] Verify performance metrics

### Post-Launch
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify backup processes
- [ ] Update documentation
- [ ] Schedule regular maintenance

## 📞 Support

### Emergency Contacts
- **Technical Issues**: Check GitHub Issues
- **Infrastructure**: Server administrator
- **Kiwify Integration**: Kiwify support

### Useful Commands
```bash
# Application status
pm2 status
pm2 monit

# System resources
htop
df -h
free -m

# Network status
netstat -tulpn | grep :3001
nginx -t

# SSL certificate status
sudo certbot certificates
```

---

## ✅ Production Deployment Complete!

Your Tatame platform is now running in production at:
- **Frontend**: https://tatame.afiliadofaixapreta.com.br
- **API**: https://tatame.afiliadofaixapreta.com.br/api
- **Admin Panel**: https://tatame.afiliadofaixapreta.com.br/admin

Default admin credentials:
- **Email**: `admin@tatame.com`
- **Password**: `TatameAdmin2024!`

⚠️ **IMPORTANT**: Change the admin password immediately after first login!