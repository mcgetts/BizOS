# 🚀 Multi-Tenant SaaS Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the multi-tenant business management platform to production with subdomain-based architecture.

**Architecture**: Subdomain-based multi-tenancy
**Examples**: `acme.yourdomain.com`, `contoso.yourdomain.com`
**Requirements**: Wildcard DNS, Wildcard SSL, PostgreSQL database

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [DNS Configuration](#dns-configuration)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Application Deployment](#application-deployment)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services:
- ✅ Domain name (e.g., `yourdomain.com`)
- ✅ Server with Node.js 18+ installed
- ✅ PostgreSQL 14+ database
- ✅ DNS provider supporting wildcard records
- ✅ SSL certificate provider (Let's Encrypt recommended)

### Required Access:
- ✅ DNS management access
- ✅ Server SSH access
- ✅ Database admin credentials
- ✅ Domain verification for SSL

### Recommended:
- ✅ Reverse proxy (Nginx/Caddy)
- ✅ Process manager (PM2/systemd)
- ✅ Error tracking service (Sentry)
- ✅ Monitoring service (Datadog/New Relic)

---

## Infrastructure Setup

### 1. Server Requirements

**Minimum Specifications**:
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 100 Mbps

**Recommended Specifications**:
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 1 Gbps

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (if not using managed service)
sudo apt install postgresql postgresql-contrib -y

# Install Nginx (reverse proxy)
sudo apt install nginx -y

# Install Certbot (for Let's Encrypt SSL)
sudo apt install certbot python3-certbot-nginx -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

---

## DNS Configuration

### Wildcard DNS Setup

You need to configure wildcard DNS to point all subdomains to your server.

**Example DNS Records** (replace with your values):

```
Type: A
Name: @
Value: <your-server-ip>
TTL: 3600

Type: A
Name: *
Value: <your-server-ip>
TTL: 3600
```

**Verification**:
```bash
# Test default domain
dig yourdomain.com

# Test wildcard subdomain
dig acme.yourdomain.com
dig test.yourdomain.com

# Both should resolve to your server IP
```

### DNS Provider Examples

#### Cloudflare:
1. Go to DNS settings
2. Add A record: `@` → `<server-ip>`
3. Add A record: `*` → `<server-ip>`
4. Set proxy status to "DNS only" (orange cloud OFF)

#### AWS Route 53:
1. Create hosted zone for your domain
2. Add A record: `yourdomain.com` → `<server-ip>`
3. Add A record: `*.yourdomain.com` → `<server-ip>`

#### Google Cloud DNS:
1. Create DNS zone
2. Add A record: `@` → `<server-ip>`
3. Add A record: `*` → `<server-ip>`

---

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended for most deployments)

**Wildcard Certificate with Certbot**:

```bash
# Install Certbot DNS plugin for your provider
# Example for Cloudflare:
sudo apt install python3-certbot-dns-cloudflare -y

# Create Cloudflare credentials file
sudo mkdir -p /etc/letsencrypt/cloudflare
sudo nano /etc/letsencrypt/cloudflare/credentials.ini

# Add your Cloudflare API token:
dns_cloudflare_api_token = your_cloudflare_api_token_here

# Secure the file
sudo chmod 600 /etc/letsencrypt/cloudflare/credentials.ini

# Obtain wildcard certificate
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare/credentials.ini \
  -d yourdomain.com \
  -d '*.yourdomain.com' \
  --email your-email@example.com \
  --agree-tos

# Set up auto-renewal
sudo certbot renew --dry-run
```

**Alternative DNS Providers**:

```bash
# For AWS Route53
sudo apt install python3-certbot-dns-route53 -y
sudo certbot certonly --dns-route53 -d yourdomain.com -d '*.yourdomain.com'

# For Google Cloud DNS
sudo apt install python3-certbot-dns-google -y
sudo certbot certonly --dns-google -d yourdomain.com -d '*.yourdomain.com'

# For manual DNS verification
sudo certbot certonly --manual --preferred-challenges dns \
  -d yourdomain.com -d '*.yourdomain.com'
```

### Option 2: Custom SSL Certificate

If using a custom certificate provider:

```bash
# Place your certificate files in:
# /etc/ssl/certs/yourdomain.com.crt
# /etc/ssl/private/yourdomain.com.key
# /etc/ssl/certs/yourdomain.com-chain.crt
```

---

## Database Setup

### 1. Create Production Database

**If using managed PostgreSQL** (AWS RDS, Google Cloud SQL, etc.):
- Create PostgreSQL instance
- Note connection details
- Configure security groups for server access

**If using local PostgreSQL**:

```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE bizos_production;
CREATE USER bizos_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE bizos_production TO bizos_user;
\q
```

### 2. Configure Database Connection

```bash
# Test connection
psql -h localhost -U bizos_user -d bizos_production

# For remote database
psql -h your-db-host.rds.amazonaws.com -U bizos_user -d bizos_production
```

### 3. Run Migrations

```bash
# Clone your repository
cd /var/www/bizos
git clone <your-repo-url> .

# Install dependencies
npm install

# Set database URL
export DATABASE_URL="postgresql://bizos_user:password@localhost:5432/bizos_production"

# Run schema migration
npx tsx scripts/migrate-to-multi-tenant.ts migrate

# Application will run seed on startup (creates default organization)
```

---

## Environment Configuration

### 1. Create Production Environment File

```bash
# Create .env file
nano .env
```

**Environment Variables**:

```bash
# Database
DATABASE_URL=postgresql://bizos_user:password@localhost:5432/bizos_production

# Node Environment
NODE_ENV=production
PORT=3000

# Session
SESSION_SECRET=your-random-secure-session-secret-min-32-chars

# Domain Configuration
DOMAIN=yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com

# Replit Auth (if using OAuth)
REPLIT_DOMAINS=yourdomain.com,*.yourdomain.com
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id

# Email Configuration (optional but recommended)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com

# Error Tracking (optional)
SENTRY_DSN=your-sentry-dsn-here

# Monitoring (optional)
DATADOG_API_KEY=your-datadog-api-key
```

**Generate Secure Session Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Secure Environment File

```bash
# Set proper permissions
chmod 600 .env

# Never commit to git
echo ".env" >> .gitignore
```

---

## Application Deployment

### 1. Build Application

```bash
cd /var/www/bizos

# Install dependencies
npm ci --production

# Build frontend (if applicable)
npm run build
```

### 2. Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bizos
```

**Nginx Configuration**:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com *.yourdomain.com;

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com *.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/bizos-access.log;
    error_log /var/log/nginx/bizos-error.log;

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # API and application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

**Enable and test**:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/bizos /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Start Application with PM2

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**PM2 Configuration** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'bizos',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/bizos',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/bizos-error.log',
    out_file: '/var/log/pm2/bizos-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    watch: false,
  }]
};
```

**Start application**:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# View logs
pm2 logs bizos

# Monitor
pm2 monit
```

---

## Post-Deployment Verification

### 1. Verify Default Organization

```bash
# Check logs for seed script
pm2 logs bizos --lines 100

# Look for:
# ✅ Created default organization: Default Organization (default)
```

### 2. Access Application

```bash
# Test main domain
curl https://yourdomain.com

# Test subdomain
curl https://default.yourdomain.com

# Test API
curl https://yourdomain.com/api/health
```

### 3. Run Data Migration (if needed)

```bash
# If you have existing data
cd /var/www/bizos
npx tsx scripts/assign-data-to-default-org.ts
```

### 4. Test Multi-Tenancy

```bash
# Run test suite
npx tsx scripts/test-multi-tenant.ts

# Expected: All tests pass
```

### 5. Verify SSL

```bash
# Check SSL certificate
curl -vI https://yourdomain.com 2>&1 | grep -A 5 "SSL certificate"

# Test subdomain SSL
curl -vI https://test.yourdomain.com 2>&1 | grep -A 5 "SSL certificate"
```

---

## Monitoring & Logging

### 1. Application Logs

```bash
# View PM2 logs
pm2 logs bizos

# View Nginx logs
sudo tail -f /var/log/nginx/bizos-access.log
sudo tail -f /var/log/nginx/bizos-error.log

# View system logs
journalctl -u nginx -f
```

### 2. Set Up Error Tracking (Sentry)

```bash
# Install Sentry SDK
npm install @sentry/node @sentry/tracing

# Add to server/index.ts:
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 3. Health Checks

Create health check endpoint in `server/routes.ts`:

```typescript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});
```

### 4. Monitoring Setup

```bash
# PM2 monitoring
pm2 install pm2-logrotate

# Database monitoring
# Set up pg_stat_statements extension
```

---

## Troubleshooting

### Common Issues

**1. Wildcard DNS not resolving**:
```bash
# Check DNS propagation
dig @8.8.8.8 test.yourdomain.com

# Clear local DNS cache
sudo systemd-resolve --flush-caches
```

**2. SSL certificate errors**:
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal
```

**3. Application not starting**:
```bash
# Check logs
pm2 logs bizos --err

# Check port availability
sudo netstat -tulpn | grep 3000

# Check environment variables
pm2 env 0
```

**4. Database connection issues**:
```bash
# Test database connection
psql $DATABASE_URL

# Check PostgreSQL status
sudo systemctl status postgresql
```

**5. 404 for organization not found**:
```bash
# Check if default organization exists
psql $DATABASE_URL -c "SELECT * FROM organizations WHERE subdomain='default';"

# If missing, restart app to run seed
pm2 restart bizos
```

---

## Security Checklist

- [ ] Wildcard SSL certificate installed and valid
- [ ] Firewall configured (UFW/iptables)
- [ ] Database credentials secure
- [ ] Session secret is random and secure
- [ ] Environment file permissions set (chmod 600)
- [ ] Nginx security headers configured
- [ ] HTTPS redirect enabled
- [ ] Rate limiting configured
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented

---

## Backup Strategy

### Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-bizos-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bizos"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/bizos_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "bizos_*.sql.gz" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-bizos-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-bizos-db.sh
```

---

## Maintenance

### Regular Updates

```bash
# Update application
cd /var/www/bizos
git pull
npm ci --production
pm2 restart bizos

# Update system packages
sudo apt update && sudo apt upgrade -y

# Renew SSL certificate (automated by certbot)
sudo certbot renew
```

---

**Deployment Guide Complete**
**Support**: Check TROUBLESHOOTING.md for common issues
**Next Steps**: Monitor application and verify multi-tenant isolation
