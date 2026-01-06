# Deployment Checklist

**Rachel Foods Platform - Production Deployment**  
**Version:** 1.0.0  
**Target Environment:** Production

---

## Pre-Deployment Verification

### Code & Build

- [ ] All unit tests passing
- [ ] Backend build successful (`npm run build`)
- [ ] Frontend build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Dependency audit clean (0 vulnerabilities)

### Database

- [ ] Backup existing database (if applicable)
- [ ] All migrations tested in staging
- [ ] Migration rollback plan prepared
- [ ] Database connection pool configured
- [ ] Database backups scheduled

### Environment Configuration

- [ ] `.env` file created (do NOT commit)
- [ ] `DATABASE_URL` set to production database
- [ ] `JWT_SECRET` rotated (new secret for production)
- [ ] `CORS_ORIGINS` set to production frontend URL only
- [ ] `NODE_ENV=production`
- [ ] `ENABLE_SWAGGER=false` (disable API docs in production)
- [ ] `SENTRY_DSN` configured (error tracking)
- [ ] Stripe production keys configured (if applicable)
- [ ] Email service credentials configured

### Security

- [ ] Rate limiting enabled (ThrottlerGuard)
- [ ] Input validation enabled (ValidationPipe)
- [ ] HTTPS enforced (reverse proxy configured)
- [ ] Secrets not in version control
- [ ] CORS restricted to production domain
- [ ] Security headers configured (Helmet.js recommended)
- [ ] Database credentials rotated
- [ ] Admin account password changed from defaults

---

## Infrastructure Setup

### Server

- [ ] Production server provisioned (VM, container, or serverless)
- [ ] Firewall rules configured (allow 443, block direct DB access)
- [ ] Reverse proxy configured (Nginx, Cloudflare, AWS ALB)
- [ ] SSL certificate installed and valid
- [ ] Process manager configured (PM2, systemd, Docker)

### Database

- [ ] PostgreSQL 16 (or later) installed
- [ ] Database created: `rachelfoods_production`
- [ ] Database user with appropriate permissions
- [ ] Connection pooling configured
- [ ] Automatic backups scheduled (daily recommended)
- [ ] Point-in-time recovery enabled

### Domain & DNS

- [ ] Domain purchased and configured
- [ ] DNS A/AAAA record points to server IP
- [ ] SSL certificate installed (Let's Encrypt, Cloudflare)
- [ ] WWW redirect configured (if applicable)
- [ ] CDN configured (Cloudflare, AWS CloudFront) - optional

---

## Backend Deployment

### 1. Database Migration

```bash
cd backend

# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/rachelfoods_production"

# Apply migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate
```

**Verification:**

- [ ] All migrations applied successfully
- [ ] `_prisma_migrations` table populated
- [ ] No migration errors in logs

### 2. Build & Deploy Backend

```bash
cd backend

# Install production dependencies only
npm ci --production

# Build application
npm run build

# Verify dist/ folder created
ls dist/

# Start application (PM2 recommended)
NODE_ENV=production PORT=3001 npm run start:prod

# OR with PM2
pm2 start npm --name "rachelfoods-backend" -- run start:prod
pm2 save
pm2 startup
```

**Verification:**

- [ ] Backend server starts without errors
- [ ] Health check responds: `curl https://api.rachelfoods.com/health`
- [ ] Ready check responds: `curl https://api.rachelfoods.com/health/ready`
- [ ] Logs directory created (`logs/`)
- [ ] PM2 process running (if applicable)

---

## Frontend Deployment

### 1. Build Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Set production API URL
export NEXT_PUBLIC_API_URL="https://api.rachelfoods.com"

# Build application
npm run build

# Verify .next/ folder created
ls .next/
```

**Verification:**

- [ ] Build completes without errors
- [ ] `.next/` directory created
- [ ] Static assets optimized

### 2. Deploy Frontend

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://api.rachelfoods.com
```

#### Option B: Self-Hosted

```bash
cd frontend

# Start production server
npm run start

# OR with PM2
pm2 start npm --name "rachelfoods-frontend" -- run start
pm2 save
```

**Verification:**

- [ ] Frontend accessible at production URL
- [ ] Homepage loads without errors
- [ ] API connection works (check browser console)
- [ ] Static assets load (images, CSS)

---

## Post-Deployment Verification

### Smoke Tests

#### Backend Health

- [ ] `GET /health` returns 200
- [ ] `GET /health/ready` returns 200 with database: connected
- [ ] `GET /health/live` returns 200

#### Frontend

- [ ] Homepage loads
- [ ] Catalog page loads with products
- [ ] Product detail page works
- [ ] Theme loads dynamically from backend
- [ ] No console errors

#### Authentication

- [ ] Registration works
- [ ] Login works (customer)
- [ ] JWT token generated
- [ ] Protected routes require authentication

#### Admin Dashboard

- [ ] Admin login works (PLATFORM_ADMIN role)
- [ ] Admin dashboard loads
- [ ] All governance pages load (Timeline, Gaps, Attribution, Remediation, Roadmap, Evidence)
- [ ] Theme editor works and applies changes immediately

#### Governance (READ-ONLY)

- [ ] Governance Timeline loads
- [ ] Control Gaps table loads
- [ ] Attribution view loads
- [ ] Remediation forecast loads
- [ ] Governance Roadmap loads
- [ ] Evidence Ledger loads
- [ ] No mutation operations available (read-only verified)

### Critical User Flows

#### Customer Purchase Flow

1. [ ] Browse catalog
2. [ ] Add product to cart
3. [ ] View cart
4. [ ] Proceed to checkout
5. [ ] Complete order
6. [ ] Order confirmation received

#### Admin Governance Review Flow

1. [ ] Login as admin
2. [ ] Access governance dashboard
3. [ ] Review Timeline
4. [ ] Check Control Gaps
5. [ ] Review Attribution
6. [ ] Examine Remediation Forecast
7. [ ] View Governance Roadmap
8. [ ] Access Evidence Ledger
9. [ ] Export evidence (JSON/PDF)

---

## Monitoring & Logging

### Verify Logging

- [ ] Logs directory exists (`backend/logs/`)
- [ ] `error.log` file created
- [ ] `combined.log` file created
- [ ] Log rotation configured (logrotate or similar)
- [ ] Sensitive data NOT in logs (passwords, tokens)

### Error Tracking

- [ ] Sentry configured (if applicable)
- [ ] Test error: Trigger test exception and verify in Sentry dashboard
- [ ] Source maps uploaded (for stack trace clarity)

### Monitoring Setup

- [ ] Health check endpoint monitored (Pingdom, UptimeRobot, or similar)
- [ ] Alert configured: Down alert
- [ ] Alert configured: Slow response (>2s)
- [ ] Database connection monitoring
- [ ] Disk space monitoring

---

## Security Validation

### Production Security Checks

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] SSL certificate valid and not expiring soon
- [ ] CORS restricted to production domain only
- [ ] Rate limiting active (test: send 101 requests in 60s, verify 429 response)
- [ ] Input validation active (test: send invalid data, verify 400 response)
- [ ] Admin routes protected (test: access /admin without auth, verify redirect)
- [ ] SQL injection protection (Prisma parameterized queries)
- [ ] XSS protection (React escapes by default)

### Penetration Testing (Optional but Recommended)

- [ ] Run OWASP ZAP scan
- [ ] Check for exposed secrets (GitHub Secret Scanning)
- [ ] Verify no sensitive data in browser console
- [ ] Test authentication bypass attempts

---

## Rollback Plan

### If Deployment Fails

#### Backend Rollback

```bash
# Stop current process
pm2 stop rachelfoods-backend

# Restore previous version
cd backend
git checkout <previous-stable-commit>
npm ci --production
npm run build
pm2 restart rachelfoods-backend
```

#### Frontend Rollback

```bash
# Vercel: Revert to previous deployment in dashboard

# Self-hosted:
pm2 stop rachelfoods-frontend
cd frontend
git checkout <previous-stable-commit>
npm ci
npm run build
pm2 restart rachelfoods-frontend
```

#### Database Rollback

```bash
# Restore from backup
pg_restore -d rachelfoods_production backup.dump

# OR apply reverse migration SQL (manual)
psql rachelfoods_production < rollback.sql
```

---

## Performance Baseline

### Record Initial Metrics

- [ ] API response time (p50, p95, p99)
- [ ] Page load time (homepage, catalog, product detail)
- [ ] Database query latency
- [ ] Memory usage (backend process)
- [ ] CPU usage (backend process)

### Load Testing (Optional)

```bash
# Install k6 or Artillery
npm install -g artillery

# Run load test
artillery quick --count 50 --num 100 https://api.rachelfoods.com/health
```

- [ ] Load test completed
- [ ] No errors under load
- [ ] Response times acceptable (<500ms p95)

---

## Documentation & Handoff

### Documentation Complete

- [ ] Production environment variables documented
- [ ] Deployment process documented
- [ ] Rollback process documented
- [ ] Monitoring alerts configured
- [ ] Runbook created (incident response)

### Team Handoff

- [ ] Operations team notified
- [ ] Access credentials shared (secure vault)
- [ ] Monitoring dashboard access granted
- [ ] On-call schedule confirmed

---

## Final Sign-Off

### Deployment Approval

- [ ] **Tech Lead:** Approved
- [ ] **DevOps:** Approved
- [ ] **Security:** Approved
- [ ] **Product Owner:** Approved

### Deployment Executed

- **Date:** ******\_\_\_******
- **Time:** ******\_\_\_******
- **Deployed By:** ******\_\_\_******
- **Status:** [ ] Success [ ] Partial [ ] Failed

### Post-Deployment

- [ ] Deployment announcement sent
- [ ] Stakeholders notified
- [ ] Monitoring active for first 24 hours
- [ ] No critical issues in first hour

---

**Checklist Completed:** ******\_\_\_******  
**Signed Off By:** ******\_\_\_******  
**Production URL:** https://rachelfoods.com  
**API URL:** https://api.rachelfoods.com
