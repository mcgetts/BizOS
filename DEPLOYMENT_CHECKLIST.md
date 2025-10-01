# 🚀 Multi-Tenant SaaS Deployment Checklist

## Pre-Deployment Checklist

### Infrastructure ✅
- [ ] Server provisioned with Node.js 18+
- [ ] PostgreSQL database created
- [ ] Domain name registered
- [ ] SSL certificate provider selected
- [ ] Reverse proxy (Nginx/Caddy) installed
- [ ] Process manager (PM2) installed

### DNS Configuration ✅
- [ ] Wildcard DNS record configured (`*.yourdomain.com` → server IP)
- [ ] Root domain record configured (`yourdomain.com` → server IP)
- [ ] DNS propagation verified (using `dig` or online tools)
- [ ] TTL set appropriately (3600 recommended)

### SSL Certificate ✅
- [ ] Wildcard SSL certificate obtained
- [ ] Certificate installed and configured
- [ ] HTTPS redirect enabled
- [ ] SSL certificate auto-renewal configured
- [ ] SSL configuration tested (using SSL Labs)

---

## Application Setup Checklist

### Code Deployment ✅
- [ ] Repository cloned to server
- [ ] Dependencies installed (`npm ci --production`)
- [ ] Build completed successfully (`npm run build` if applicable)
- [ ] Environment file created (`.env`)
- [ ] Environment variables configured
- [ ] File permissions set correctly

### Environment Configuration ✅
- [ ] `DATABASE_URL` configured
- [ ] `NODE_ENV=production` set
- [ ] `SESSION_SECRET` generated (32+ characters)
- [ ] `DOMAIN` set to your domain
- [ ] `ALLOWED_ORIGINS` configured for wildcard subdomains
- [ ] `REPLIT_DOMAINS` configured (if using OAuth)
- [ ] Email SMTP settings configured (optional)
- [ ] Error tracking DSN configured (optional)

### Database Setup ✅
- [ ] Database connection tested
- [ ] Schema migration run (`npx tsx scripts/migrate-to-multi-tenant.ts migrate`)
- [ ] Migration completed successfully
- [ ] Database user permissions verified
- [ ] Connection pooling configured

---

## First Startup Checklist

### Application Start ✅
- [ ] Application started with PM2 (`pm2 start ecosystem.config.js`)
- [ ] PM2 saved configuration (`pm2 save`)
- [ ] PM2 startup script configured (`pm2 startup systemd`)
- [ ] Application logs checked (`pm2 logs bizos`)
- [ ] No errors in startup logs

### Seed Verification ✅
- [ ] Default organization created (check logs)
- [ ] Seed script completed successfully
- [ ] Database tables populated correctly
- [ ] Run query: `SELECT * FROM organizations WHERE subdomain='default';`

### Data Migration (If Needed) ✅
- [ ] Existing data migration script run (`npx tsx scripts/assign-data-to-default-org.ts`)
- [ ] All records have `organizationId`
- [ ] Users assigned to organizations
- [ ] Migration summary reviewed

---

## Multi-Tenant Verification Checklist

### Organization Setup ✅
- [ ] Default organization accessible at main domain
- [ ] Default organization accessible at `default.yourdomain.com`
- [ ] Organization indicator visible in header
- [ ] Development mode badge showing (if applicable)

### Tenant Isolation Testing ✅
- [ ] Test organizations created (`npx tsx scripts/test-multi-tenant.ts`)
- [ ] Cross-tenant read isolation verified
- [ ] Cross-tenant update blocked
- [ ] Cross-tenant delete blocked
- [ ] All test cases passed (10/10)

### API Endpoint Testing ✅
- [ ] Health check endpoint working (`/api/health`)
- [ ] Authentication flow working
- [ ] API endpoints returning tenant-scoped data
- [ ] WebSocket connections working
- [ ] Real-time updates working

---

## Security Checklist

### SSL/TLS ✅
- [ ] HTTPS working on main domain
- [ ] HTTPS working on wildcard subdomains
- [ ] HTTP redirects to HTTPS
- [ ] Valid SSL certificate (no browser warnings)
- [ ] SSL Labs grade A or higher

### Application Security ✅
- [ ] Session secret is random and secure
- [ ] Environment file permissions set to 600
- [ ] Database credentials secure
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] Security headers enabled (HSTS, X-Frame-Options, etc.)

### Access Control ✅
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key-based authentication enabled
- [ ] Database accessible only from application server
- [ ] Rate limiting configured
- [ ] Failed login attempts limited

---

## Monitoring & Logging Checklist

### Application Monitoring ✅
- [ ] PM2 monitoring active (`pm2 monit`)
- [ ] Application logs configured
- [ ] Log rotation enabled
- [ ] Health check endpoint configured
- [ ] Uptime monitoring configured (optional)

### Error Tracking ✅
- [ ] Sentry (or equivalent) configured
- [ ] Error tracking verified (test error)
- [ ] Email alerts configured
- [ ] Slack/Discord webhooks configured (optional)

### Performance Monitoring ✅
- [ ] Database query performance monitored
- [ ] API response times tracked
- [ ] Memory usage monitored
- [ ] CPU usage monitored
- [ ] Disk space monitored

---

## Backup & Recovery Checklist

### Database Backups ✅
- [ ] Automated backup script created
- [ ] Backup schedule configured (cron job)
- [ ] Backup retention policy set
- [ ] Backup storage location configured
- [ ] Test backup restoration

### Application Backups ✅
- [ ] Code repository backed up (Git)
- [ ] Environment file backed up securely
- [ ] SSL certificates backed up
- [ ] Nginx configuration backed up

---

## Post-Deployment Testing Checklist

### Functional Testing ✅
- [ ] User registration working
- [ ] User login working
- [ ] Password reset working
- [ ] Email notifications working (if configured)
- [ ] File uploads working
- [ ] WebSocket real-time updates working

### Multi-Tenant Testing ✅
- [ ] Create test organization via UI/API
- [ ] Add users to organization
- [ ] Verify data isolation
- [ ] Test organization switching (URL change)
- [ ] Verify WebSocket scoping

### Performance Testing ✅
- [ ] Page load times acceptable (< 2s)
- [ ] API response times acceptable (< 500ms)
- [ ] Database queries optimized
- [ ] No memory leaks over 24 hours
- [ ] Concurrent user load tested

---

## Documentation Checklist

### Internal Documentation ✅
- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Backup/restore procedures documented
- [ ] Incident response plan created
- [ ] Runbook created for common issues

### User Documentation ✅
- [ ] User onboarding guide created
- [ ] Admin documentation created
- [ ] API documentation updated
- [ ] Multi-tenant features documented
- [ ] FAQ updated

---

## Maintenance & Updates Checklist

### Regular Maintenance ✅
- [ ] Update schedule defined (weekly/monthly)
- [ ] Security patch process defined
- [ ] Database maintenance scheduled
- [ ] Log cleanup scheduled
- [ ] SSL certificate renewal automated

### Monitoring Schedule ✅
- [ ] Daily: Check application logs
- [ ] Daily: Review error tracking dashboard
- [ ] Weekly: Review performance metrics
- [ ] Weekly: Check disk space and backups
- [ ] Monthly: Review security audit logs
- [ ] Monthly: Test backup restoration

---

## Go-Live Checklist

### Final Verification ✅
- [ ] All above checklists completed
- [ ] Production data migration completed
- [ ] All test users removed
- [ ] Default credentials changed
- [ ] SSL certificate valid for at least 30 days
- [ ] Backup verified within last 24 hours

### Communication ✅
- [ ] Stakeholders notified of go-live date
- [ ] Users notified of new multi-tenant features
- [ ] Support team trained on new features
- [ ] Known issues documented
- [ ] Emergency contact list updated

### Post-Launch Monitoring ✅
- [ ] Monitor application for first 24 hours
- [ ] Review error rates and logs
- [ ] Check performance metrics
- [ ] Verify backups running
- [ ] Collect user feedback

---

## Emergency Contacts

### Technical Team
- DevOps Lead: __________________
- Backend Lead: __________________
- Database Admin: __________________

### External Services
- DNS Provider Support: __________________
- Hosting Provider Support: __________________
- SSL Certificate Support: __________________

### Escalation
- On-Call Engineer: __________________
- Engineering Manager: __________________
- CTO/VP Engineering: __________________

---

## Rollback Plan

### If Deployment Fails:

1. **Stop Application**:
   ```bash
   pm2 stop bizos
   ```

2. **Restore Database** (if schema changed):
   ```bash
   psql $DATABASE_URL < /var/backups/bizos/bizos_YYYYMMDD_HHMMSS.sql
   ```

3. **Revert Code**:
   ```bash
   cd /var/www/bizos
   git checkout <previous-stable-commit>
   npm ci --production
   ```

4. **Restart Application**:
   ```bash
   pm2 restart bizos
   ```

5. **Verify Service**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

---

## Success Criteria

### Deployment Successful If:
- ✅ Application accessible via HTTPS
- ✅ All SSL certificates valid
- ✅ Default organization created
- ✅ Users can register and login
- ✅ Data isolation tests pass
- ✅ No critical errors in logs
- ✅ Performance within acceptable range
- ✅ Backups running successfully

---

## Sign-Off

### Completed By:
- [ ] DevOps Engineer: __________________ Date: __________
- [ ] Backend Engineer: __________________ Date: __________
- [ ] QA Engineer: __________________ Date: __________
- [ ] Product Manager: __________________ Date: __________

### Production Approval:
- [ ] Engineering Manager: __________________ Date: __________
- [ ] CTO/VP Engineering: __________________ Date: __________

---

**Deployment Checklist Version**: 1.0
**Last Updated**: 2025-10-01
**Next Review**: After first production deployment
