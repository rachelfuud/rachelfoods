# Environment Configuration Fix

## Critical Issue Identified

Your production frontend was trying to connect to `localhost:3001` instead of the production backend API!

## Problem

Railway deployment uses build-time environment variables, but `.env.local` had:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

This caused ALL API calls to fail with "Failed to fetch" errors.

## Solution

Railway automatically injects environment variables during build. The backend URL should be:

```
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
```

## How to Fix in Railway

### Frontend Service:

1. Go to Railway dashboard → Frontend service
2. Click "Variables" tab
3. Add/Update: `NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app`
4. Redeploy the service

### Backend Service:

Ensure these are set:

- `DATABASE_URL` - Your Neon.tech PostgreSQL connection string
- `JWT_SECRET` - Your secret key
- `STRIPE_SECRET_KEY` - Your Stripe secret
- `FRONTEND_URL` - `https://frontend-production-1660.up.railway.app`

## Code Changes Made

### 1. Fixed AdminNav - Added Products Link

```diff
const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/orders', label: 'Orders', icon: '📦' },
+   { path: '/admin/products', label: 'Products', icon: '🛍️' },
+   { path: '/admin/hero-slides', label: 'Hero Slides', icon: '🎯' },
    ...
];
```

### 2. Fixed API URL in AdminDashboard

```diff
- const API_BASE = process.env.NEXT_PUBLIC_API_URL
-     ? `${process.env.NEXT_PUBLIC_API_URL}/api`
-     : 'http://localhost:3001/api';
+ const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### 3. Created Missing CMS Pages

- `/admin/cms/pages` - Content pages management
- `/admin/cms/media` - Media library

## Quick Fix Steps

1. **In Railway Frontend Service**:

   ```
   NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
   ```

2. **Redeploy** (or wait for auto-deploy from this commit)

3. **Test**:
   - Login at `/admin/login`
   - Dashboard should load without errors
   - Products link visible in sidebar
   - CMS pages no longer blank

## Verification

After deployment, check:

- [ ] Admin dashboard loads (no "Failed to fetch")
- [ ] Products link appears in navigation
- [ ] Products page works
- [ ] CMS → Pages shows content
- [ ] CMS → Media shows library
- [ ] Hero Slides management works

## Why This Happened

Next.js requires environment variables prefixed with `NEXT_PUBLIC_` to be available in the browser. Railway builds the app once and uses that build for all requests. If the variable isn't set during build, it defaults to the local value from `.env.local`.

## Prevention

Always set production environment variables in Railway's Variables tab BEFORE deploying!
