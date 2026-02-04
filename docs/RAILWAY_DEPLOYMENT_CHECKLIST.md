# Railway Deployment Checklist - API Fix

**Deployment Date**: February 2025  
**Fix**: API URL Standardization  
**Files Changed**: 3 (AdminDashboard.tsx, header/page.tsx, footer/page.tsx)

---

## Pre-Deployment Verification

### 1. Environment Variables (Railway Dashboard)

**Frontend Service** - Verify these variables exist:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app

# Payment Gateways
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://frontend-production-1660.up.railway.app
```

⚠️ **CRITICAL**: Ensure `NEXT_PUBLIC_API_URL` does NOT have:

- Trailing `/api` suffix
- Trailing `/` slash

**Backend Service** - Verify these variables exist:

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (if configured)
EMAIL_PROVIDER=console  # or sendgrid, mailgun, ses
```

---

## Deployment Steps

### Step 1: Commit Changes

```bash
# In your local project:
git add .
git commit -m "fix: standardize API URL construction across admin components

- Fixed AdminDashboard to append /api to API_BASE
- Fixed CMS header/footer components to use consistent pattern
- All components now follow lib/api.ts convention
- Resolves 'Failed to fetch' errors in admin dashboard"

git push origin main
```

### Step 2: Monitor Railway Deployment

1. Go to Railway dashboard: https://railway.app/dashboard
2. Select your project
3. Watch **frontend service** for deployment progress:
   - Building (npm install, next build)
   - Deploying
   - Active ✅

### Step 3: Verify Deployment Success

**Check Deployment Logs**:

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

**No errors like**:

- ❌ "Module not found"
- ❌ "Build failed"
- ❌ "Type error"

---

## Post-Deployment Testing

### 1. Test Admin Login

- Go to: `https://frontend-production-1660.up.railway.app/admin/login`
- Login with admin credentials
- ✅ Should redirect to `/admin` dashboard

### 2. Test Dashboard Loading

**Admin Dashboard** (`/admin`):

- [ ] Page loads without "Failed to Load Dashboard" error
- [ ] System Health metrics display (cache, orders, payments)
- [ ] Order metrics show (pending, processing, shipped, delivered)
- [ ] No "Failed to fetch" errors in UI

### 3. Test CMS Pages

**Header Configuration** (`/admin/cms/header`):

- [ ] Page loads
- [ ] Shows existing header config or empty state
- [ ] Can edit and save changes
- [ ] No console errors

**Footer Configuration** (`/admin/cms/footer`):

- [ ] Page loads
- [ ] Shows existing footer config or empty state
- [ ] Can add/edit columns and links
- [ ] Save button works

### 4. Browser Console Check

Open DevTools Console (F12), check for:

**✅ Expected Logs**:

```javascript
API_BASE: https://backend-production-3b87.up.railway.app/api
NEXT_PUBLIC_API_URL: https://backend-production-3b87.up.railway.app
```

**❌ Should NOT see**:

- CORS errors: `Access-Control-Allow-Origin`
- 404 errors: `Failed to load resource: 404`
- Double path errors: `/api/api/...`
- "Failed to fetch" errors

### 5. Network Tab Verification

In DevTools Network tab, check API calls:

**Example Request**:

```
Request URL: https://backend-production-3b87.up.railway.app/api/admin/system/health
Status: 200 OK
```

**Verify**:

- [ ] URL has `/api/admin/...` path (not `/api/api/...`)
- [ ] Status codes are 200 or appropriate (401 if not logged in)
- [ ] Response contains expected JSON data

---

## Rollback Plan (If Needed)

If deployment causes new issues:

### Option 1: Revert Git Commit

```bash
# Find commit hash before the fix
git log --oneline

# Revert to previous commit
git revert <commit-hash>
git push origin main
```

### Option 2: Railway Manual Rollback

1. Go to Railway project
2. Click on frontend service
3. Go to "Deployments" tab
4. Find previous successful deployment
5. Click "..." → "Redeploy"

---

## Common Issues & Fixes

### Issue 1: Still seeing "Failed to fetch"

**Possible Causes**:

1. Environment variable not set in Railway
2. Backend service is down
3. CORS issue

**Debug Steps**:

```bash
# Check backend is running:
curl https://backend-production-3b87.up.railway.app/api/health

# Should return JSON with status
```

### Issue 2: CORS Error in Console

**Symptom**:

```
Access to fetch at 'https://backend...' from origin 'https://frontend...'
has been blocked by CORS policy
```

**Fix**: Check `backend/src/main.ts` includes frontend URL in allowed origins:

```typescript
const allowedOrigins = [
  "https://frontend-production-1660.up.railway.app",
  // ... other origins
];
```

### Issue 3: 401 Unauthorized

**Possible Causes**:

1. JWT token expired
2. Token not in localStorage
3. Backend JWT_SECRET mismatch

**Fix**:

- Logout and login again
- Check Railway backend has correct `JWT_SECRET` set

### Issue 4: Double /api/api/ in URLs

**Symptom**: Network tab shows `/api/api/admin/...`

**Cause**: Environment variable has `/api` suffix

**Fix**: In Railway, set:

```bash
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
# NOT: .../api
```

---

## Success Criteria

Deployment is successful when:

- ✅ Frontend builds and deploys without errors
- ✅ Admin login works
- ✅ Dashboard loads with metrics
- ✅ CMS header/footer pages load
- ✅ No "Failed to fetch" errors
- ✅ Browser console shows correct API_BASE URL
- ✅ Network requests go to `/api/...` (not `/api/api/...`)

---

## Next Steps After Successful Deployment

1. **Monitor for 24 hours**: Watch for errors in Railway logs
2. **Test all admin features**: Products, orders, CMS, etc.
3. **Update documentation**: Note any new findings
4. **Plan next enhancements**: See ADMIN_DASHBOARD_IMPROVEMENTS.md

---

## Contact & Support

If you encounter issues not covered here:

1. Check Railway deployment logs
2. Check browser console errors
3. Review [API_URL_STANDARDIZATION_FIX.md](./API_URL_STANDARDIZATION_FIX.md)
4. Review backend logs in Railway dashboard

---

**Last Updated**: February 2025  
**Status**: Ready for deployment ✅
