# Admin Routes 404 Troubleshooting Guide

## Issue

`https://frontend-production-1660.up.railway.app/admin/products/new` returns 404 error despite file existing and Next.js config being correct.

## Verification

### ✅ Confirmed Working Locally

- File exists: `frontend/app/admin/products/new/page.tsx`
- Next.js config correct (commit e5d238e)
- Local development works fine

### ⚠️ Deployment Issue

Latest commits:

- `58ef86e` - Stock updates (current HEAD)
- `af1005d` - Ayamase fix
- `fe0c962` - Stock fixes
- `b3385d7` - TypeScript fix
- `1da9115` - VS Code errors
- `e5d238e` - **Railway deployment fixes (Next.js config)** ← Should have fixed 404

## Root Cause Analysis

### Theory 1: Railway Build Cache (Most Likely)

Railway may be using a cached build that doesn't include the updated `next.config.js` from commit `e5d238e`.

**Why this happens:**

- Railway caches `node_modules` and build artifacts
- Configuration changes don't always trigger fresh builds
- `next.config.js` changes require full rebuild

**Solution:**

1. Go to Railway Dashboard
2. Navigate to frontend service
3. Click "Deployments" tab
4. Find latest deployment
5. Click "Redeploy" button (NOT "Redeploy from Scratch" yet)
6. Wait 2-3 minutes for build
7. Test: `https://frontend-production-1660.up.railway.app/admin/products/new`

If still 404:

1. Click "Settings" → "Redeploy from Scratch"
2. This clears all caches and rebuilds everything

### Theory 2: Standalone Output Issue

The `output: 'standalone'` configuration might not be compatible with admin dynamic routes.

**Test:**
Check if other admin routes work:

- `https://frontend-production-1660.up.railway.app/admin` - Dashboard
- `https://frontend-production-1660.up.railway.app/admin/products` - Product list
- `https://frontend-production-1660.up.railway.app/admin/orders` - Orders

If **all admin routes** 404 → Standalone output issue  
If **only `/admin/products/new`** 404 → Route-specific issue

**Solution if standalone is the issue:**

```javascript
// frontend/next.config.js
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
  // Try removing standalone temporarily
  // output: 'standalone',

  // Keep admin route tracing
  experimental: {
    outputFileTracingIncludes: {
      "/admin/**/*": ["./app/admin/**/*"],
    },
  },
};
```

Commit and let Railway rebuild.

### Theory 3: Missing Dependencies

The admin route might use components or libraries not included in the build.

**Check build logs:**

1. Railway Dashboard → Frontend Service
2. Click latest deployment
3. Check "Build Logs"
4. Look for errors related to `/admin/products/new`

**Common errors:**

```
Error: Cannot find module '@/components/...'
Warning: Route /admin/products/new not included in build
```

**Solution:**
Ensure all imports in `app/admin/products/new/page.tsx` are valid and installed.

### Theory 4: Middleware Blocking Route

Check if middleware is preventing access to admin routes.

**File to check: `frontend/middleware.ts` or `frontend/src/middleware.ts`**

Look for:

```typescript
export const config = {
  matcher: [
    "/admin/:path*", // This might be blocking
  ],
};
```

**Solution:**
Ensure middleware doesn't block `/admin/products/new` specifically.

## Immediate Workaround

While investigating, you can access admin product creation via:

**Option A: API Direct**

```bash
curl -X POST https://backend-url.railway.app/api/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "description": "Description",
    "price": 1000,
    "categoryId": "category-id",
    "stock": 100
  }'
```

**Option B: Duplicate Working Route**
If `/admin/products` works but `/admin/products/new` doesn't:

1. Copy `/admin/products/page.tsx`
2. Add "Create New" button to product list page
3. Use modal/inline form instead of separate route

## Step-by-Step Resolution

### Step 1: Force Railway Rebuild

```
1. Login to Railway Dashboard
2. Select RachelFoods project
3. Click "frontend-production-1660" service
4. Deployments tab
5. Latest deployment → "Redeploy"
6. Wait 2-3 minutes
7. Test URL: https://frontend-production-1660.up.railway.app/admin/products/new
```

### Step 2: Verify Build Output

In Railway build logs, look for:

```
Route (app)                              Size     First Load JS
├ ○ /                                    XXX kB        XXX kB
├ ○ /admin/products                      XXX kB        XXX kB
├ ○ /admin/products/new                  XXX kB        XXX kB  ← Should be here
```

If missing, check:

1. File definitely exists: `frontend/app/admin/products/new/page.tsx`
2. No TypeScript errors in the file
3. Imports are valid

### Step 3: Check Deployment Config

Railway Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NODE_ENV=production
```

Build Command should be:

```
npm run build
```

Start Command should be:

```
npm start
```

### Step 4: Test Locally with Production Build

```bash
cd frontend
npm run build
npm start
# Navigate to http://localhost:3000/admin/products/new
# Should work - confirms issue is Railway-specific
```

### Step 5: Nuclear Option (If all else fails)

```javascript
// frontend/next.config.js - Simplify to basics
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Remove all experimental features
};
```

Commit, push, wait for Railway rebuild.

## Expected Outcome

After forced rebuild:
✅ `/admin/products/new` loads successfully  
✅ Product creation form displays  
✅ Can create products via UI  
✅ All admin routes accessible

## If Issue Persists

Contact Railway Support with:

1. Build logs (screenshot)
2. Deployment configuration
3. `next.config.js` content
4. Route file path: `app/admin/products/new/page.tsx`
5. Error: "404 Not Found on admin routes despite correct configuration"

Or switch to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod
```

Vercel has better Next.js App Router support and won't have this issue.

## Prevention

For future deployments:

1. Always test admin routes after deployment
2. Keep Next.js config minimal (remove experimental features unless needed)
3. Use Vercel for frontend (better Next.js support)
4. Monitor Railway build logs for warnings

## Quick Reference

**Railway Dashboard:** https://railway.app/dashboard  
**Frontend Service:** frontend-production-1660  
**Backend Service:** [Your backend service name]  
**Frontend URL:** https://frontend-production-1660.up.railway.app

**Working Routes to Test:**

- `/` - Homepage ✅
- `/products` - Product catalog ✅
- `/admin` - Admin dashboard ❓
- `/admin/products` - Product management ❓
- `/admin/products/new` - Create product ❌ (404)

**Latest Commit with Next.js Fix:** `e5d238e` (3 commits behind HEAD)  
**Current HEAD:** `58ef86e` (seed data updates - doesn't affect build)
