# Production Environment Configuration

## Overview

This document provides comprehensive configuration guidelines for deploying the enterprise business management platform in production environments with full monitoring, backup, and alerting capabilities.

---

## 📋 Environment Variables Reference

### Core Application Settings

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-jwt-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Domain and URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
```

### 🔐 Security and Authentication

```bash
# Password Security
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
PASSWORD_EXPIRY_DAYS=90

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=900000

# Session Security
SESSION_TIMEOUT_MINUTES=480
MAX_CONCURRENT_SESSIONS=3
ENABLE_DEVICE_FINGERPRINTING=true
```

### 📊 Monitoring and Observability

#### Sentry Configuration
```bash
# Sentry Error Tracking
SENTRY_ENABLED=true
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

#### Prometheus Metrics
```bash
# Prometheus Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_DEFAULT_METRICS=true
PROMETHEUS_PREFIX=business_platform_
```

#### Health Check and Uptime Monitoring
```bash
# Uptime Monitoring
UPTIME_ALERTS_ENABLED=true
UPTIME_ALERT_EMAILS=admin@company.com,ops@company.com
UPTIME_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
UPTIME_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
UPTIME_ALERT_COOLDOWN_MINUTES=15
```

### 💾 Backup and Data Management

```bash
# Database Backup Configuration
BACKUP_ENABLED=true
BACKUP_PATH=/opt/backups/database
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM UTC

# S3 Backup Storage (Optional)
AWS_S3_BUCKET=your-backup-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Data Export Configuration
EXPORT_PATH=/tmp/exports
EXPORT_MAX_FILE_SIZE=104857600  # 100MB
EXPORT_CLEANUP_HOURS=24
```

### 📧 Email Configuration

```bash
# SMTP Settings
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@company.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@company.com
EMAIL_FROM_NAME=Business Platform

# Email Templates
EMAIL_TEMPLATE_PATH=/opt/app/templates/emails
NOTIFICATION_EMAIL_ENABLED=true
```

### 🔗 Third-Party Integrations

#### Slack Integration
```bash
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_APP_TOKEN=xapp-your-slack-app-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_DEFAULT_CHANNEL=#general
SLACK_ENABLED=true
```

#### Microsoft Teams Integration
```bash
TEAMS_WEBHOOK_URL=https://your-teams-webhook-url
TEAMS_BOT_ID=your-teams-bot-id
TEAMS_TENANT_ID=your-azure-tenant-id
TEAMS_ENABLED=true
```

#### GitHub Integration
```bash
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
GITHUB_DEFAULT_REPO=organization/repository
GITHUB_ENABLED=true
```

### 💳 Payment and Financial Services

```bash
# Stripe Configuration
STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_ENABLED=true

# Accounting Software Integration
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=https://api.your-domain.com/integrations/quickbooks/callback
QUICKBOOKS_ENABLED=false

XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
XERO_REDIRECT_URI=https://api.your-domain.com/integrations/xero/callback
XERO_ENABLED=false
```

### 📱 SMS and Communication

```bash
# Twilio Configuration (for MFA and notifications)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_ENABLED=true

# MFA Configuration
MFA_ENABLED=true
MFA_TOTP_ISSUER=Business Platform
MFA_SMS_ENABLED=true
MFA_BACKUP_CODES_COUNT=10
```

---

## 🚀 Deployment Configuration

### Docker Environment Variables

```dockerfile
# Production Dockerfile environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy environment file
COPY .env.production /app/.env

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
```

### Docker Compose Production Setup

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: business_platform
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}

volumes:
  postgres_data:
```

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  PORT: "3001"
  PROMETHEUS_ENABLED: "true"
  SENTRY_ENABLED: "true"
  BACKUP_ENABLED: "true"

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/db"
  JWT_SECRET: "your-jwt-secret"
  SENTRY_DSN: "https://your-sentry-dsn"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: business-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: business-platform
  template:
    metadata:
      labels:
        app: business-platform
    spec:
      containers:
      - name: app
        image: business-platform:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 📈 Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'business-platform'
    static_configs:
      - targets: ['localhost:3001']
    scrape_interval: 15s
    metrics_path: '/metrics'

  - job_name: 'health-checks'
    static_configs:
      - targets: ['localhost:3001']
    scrape_interval: 30s
    metrics_path: '/health/metrics'
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Business Platform Monitoring",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(business_platform_http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(business_platform_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "business_platform_active_users",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# alerts.yml
groups:
- name: business-platform
  rules:
  - alert: HighErrorRate
    expr: rate(business_platform_http_requests_total{status_code=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected

  - alert: DatabaseDown
    expr: business_platform_database_connections_active == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: Database connection lost

  - alert: BackupFailed
    expr: business_platform_backup_status == 0
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: Backup system unhealthy
```

---

## 🔒 Security Considerations

### SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /metrics {
        deny all;
        allow 10.0.0.0/8;
        proxy_pass http://localhost:3001;
    }
}
```

### Firewall Rules

```bash
# UFW Firewall Configuration
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 10.0.0.0/8 to any port 3001  # Internal monitoring
ufw enable
```

---

## 🔄 Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-db.sh

set -e

DB_NAME="business_platform"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3 (if configured)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 cp ${BACKUP_FILE}.gz s3://$AWS_S3_BUCKET/backups/
fi

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Recovery Procedure

```bash
#!/bin/bash
# restore-db.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop application
docker-compose stop app

# Restore database
gunzip -c $BACKUP_FILE | psql $DATABASE_URL

# Start application
docker-compose start app

echo "Database restored from $BACKUP_FILE"
```

---

## 📋 Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations completed
- [ ] Backup system tested
- [ ] Monitoring dashboards configured
- [ ] Alerting rules tested
- [ ] Load testing completed
- [ ] Security scan passed

### Post-Deployment

- [ ] Health checks passing
- [ ] Metrics collection working
- [ ] Backup automation verified
- [ ] Email notifications functional
- [ ] Third-party integrations tested
- [ ] User authentication working
- [ ] Data export functionality verified
- [ ] Support ticket system operational

### Ongoing Maintenance

- [ ] Daily backup verification
- [ ] Weekly security updates
- [ ] Monthly performance review
- [ ] Quarterly disaster recovery testing
- [ ] Annual security audit

---

This production environment configuration ensures enterprise-grade monitoring, security, and reliability for the business management platform.