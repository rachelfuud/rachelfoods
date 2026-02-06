# Railway Deployment Fixes

**Date**: February 6, 2026  
**Issues Fixed**:

1. Frontend 404 errors on `/admin/products/new` and other admin routes
2. Backend Prisma migration timeout (P1002 - Advisory Lock)

---

## Issue 1: Frontend 404 on Admin Routes

### Root Cause

Railway's Next.js deployment wasn't properly including client-side admin routes in the standalone build output.

### Fix Applied

**File**: `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
  // Fix Railway deployment - ensure standalone output includes all routes
  output: "standalone",
  // Ensure admin routes are generated at build time
  experimental: {
    outputFileTracingIncludes: {
      "/admin/**/*": ["./app/admin/**/*"],
    },
  },
};
```

### What This Does

- **`output: 'standalone'`**: Creates a self-contained deployment (required for Railway)
- **`outputFileTracingIncludes`**: Ensures all admin route files are included in the build

---

## Issue 2: Backend Prisma Migration Timeout

### Root Cause

Neon PostgreSQL uses connection pooling (`-pooler` suffix in connection string). During deployment:

1. Prisma tries to acquire an exclusive advisory lock for migrations
2. Lock already held by pooler connection from previous deployment
3. Timeout after 10 seconds
4. Retry succeeds but deployment logs show scary error

### Fix Applied

**File**: `backend/prisma/schema.prisma`

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")           // Pooler connection (runtime)
  directUrl = env("DIRECT_DATABASE_URL")     // Direct connection (migrations)
}
```

**File**: `backend/.env.example`

```env
# Prisma
DATABASE_URL="postgresql://user:pass@ep-abc-pooler.c-3.us-east-2.aws.neon.tech/neondb"
DIRECT_DATABASE_URL="postgresql://user:pass@ep-abc.c-3.us-east-2.aws.neon.tech/neondb"
```

### Railway Environment Configuration Required

**Navigate to**: Railway Backend Service → Variables

Add new variable:

```
DIRECT_DATABASE_URL = <your_direct_neon_connection_string>
```

**How to Get Direct Connection String**:

1. Go to Neon dashboard: https://console.neon.tech
2. Select your project → **Connection Details**
3. Copy connection string
4. **Remove** `-pooler` from the hostname

**Example**:

- **Pooler (DATABASE_URL)**: `postgresql://user:pass@ep-mute-pine-ajloc9zr-pooler.c-3.us-east-2.aws.neon.tech/neondb`
- **Direct (DIRECT_DATABASE_URL)**: `postgresql://user:pass@ep-mute-pine-ajloc9zr.c-3.us-east-2.aws.neon.tech/neondb`

---

## Deployment Steps

### Step 1: Update Railway Backend Environment

1. Go to Railway dashboard
2. Open backend service → **Variables** tab
3. Click **+ New Variable**
4. Add:
   - **Name**: `DIRECT_DATABASE_URL`
   - **Value**: Your direct Neon connection string (without `-pooler`)
5. Click **Add**

### Step 2: Commit and Push Changes

```bash
cd "C:\Projects\Dev\Rachel Foods"

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: Railway deployment issues

- Add Next.js standalone output for admin routes
- Configure direct database URL for Prisma migrations
- Prevent P1002 advisory lock timeout errors
- Fix 404 errors on /admin/products/new

Fixes #railway-404-errors #railway-migration-timeout"

# Push to trigger Railway deployment
git push origin main
```

### Step 3: Verify Deployment

**Frontend Checks**:

```bash
# Test admin route
curl https://frontend-production-1660.up.railway.app/admin/products/new

# Should return HTML (not 404)
```

**Backend Checks**:
Watch Railway deployment logs for:

```
✅ EXPECTED:
[inf] No pending migrations to apply.
[inf] Application started on port 3001

❌ SHOULD NOT SEE:
[err] Error: P1002
[err] Timed out trying to acquire a postgres advisory lock
```

---

## Verification Checklist

### Frontend (Should Work)

- [ ] https://frontend-production-1660.up.railway.app/admin/products/new loads
- [ ] No "error 404" message
- [ ] Product creation form displays
- [ ] Can navigate to other admin routes
- [ ] No console errors related to routing

### Backend (Should Not Show Errors)

- [ ] Deployment logs show NO P1002 error
- [ ] Migrations run cleanly
- [ ] Application starts in < 10 seconds
- [ ] All API endpoints respond correctly
- [ ] No slow query warnings during startup

---

## Troubleshooting

### If Frontend 404 Persists

**Check Build Logs**:

```bash
railway logs --service frontend | grep "Generating static pages"
```

**Verify Railway Config**:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/"
  }
}
```

**Force Rebuild**:

1. Railway dashboard → Frontend service
2. Settings → **Redeploy from Scratch**

### If Migration Timeout Persists

**Verify Direct URL**:

```bash
# Railway backend service logs
# Look for database connection logs during startup

# Should show TWO different connections:
# - Pooler for runtime queries
# - Direct for migrations
```

**Test Direct Connection**:

```bash
# On your local machine
DIRECT_DATABASE_URL="..." npx prisma migrate status

# Should NOT timeout
```

---

## Additional Notes

### Why Standalone Output?

Railway uses Nixpacks to build Next.js apps. The `standalone` output mode:

- Includes only necessary files (smaller deployment)
- Works with serverless and container environments
- Ensures all dynamic routes are traced and included

### Why Direct Database URL?

Neon's pooler:

- Maintains persistent connections for performance
- Can hold advisory locks across deployments
- Not suitable for exclusive migration operations

Direct connections:

- Bypass the pooler
- Allow exclusive locks for migrations
- Close immediately after migration completes

### Performance Impact

**None**. The application still uses the pooler connection (`DATABASE_URL`) for all runtime queries. Only migrations use the direct connection.

---

## Success Indicators

After deployment, you should see:

**Frontend Logs**:

```
✓ Generating static pages
✓ Finalizing page optimization
✓ Route (app) Size
  ✓ /admin/products/new
```

**Backend Logs**:

```
[inf] Prisma schema loaded
[inf] 14 migrations found
[inf] No pending migrations to apply.
[inf] Application started on port 3001
```

**No Errors**:

- ❌ NO "Error: P1002"
- ❌ NO "Timed out acquiring advisory lock"
- ❌ NO "error 404" on admin routes

---

## Rollback Plan

If issues occur:

1. **Revert Prisma schema**:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Revert Next.js config**:

   ```javascript
   const nextConfig = {
     reactStrictMode: true,
     env: { ... },
   };
   ```

3. **Remove Railway variable**:
   - Delete `DIRECT_DATABASE_URL` from backend service

4. **Push and redeploy**:
   ```bash
   git add .
   git commit -m "revert: Railway deployment fixes"
   git push origin main
   ```

---

## Related Documentation

- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Prisma Direct URL](https://www.prisma.io/docs/orm/reference/connection-urls#direct-url)
- [Neon Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Railway Environment Variables](https://docs.railway.app/guides/variables)

---

**Status**: ✅ Ready to deploy  
**Expected Result**: Clean deployment without errors or 404s
