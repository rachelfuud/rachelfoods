# Environment Configuration Guide

## Purpose

This document establishes the **single source of truth** for environment variable configuration across the RachelFoods platform, specifically addressing the `/api` path construction pattern that has historically caused production issues.

---

## The `/api` Path Construction Rule

### ⚠️ Critical Pattern

**NEXT_PUBLIC_API_URL must NEVER include the `/api` suffix.**

The `/api` path segment is **automatically appended** by `frontend/lib/api.ts` and related components.

### ✅ Correct Configuration

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app

# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env.example
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### ❌ Incorrect Configuration (Causes Double /api/api/ Paths)

```bash
# ❌ DO NOT DO THIS
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Why This Pattern Exists

### Architecture Decision

The backend NestJS server exposes all API endpoints under the `/api` prefix:

- `GET /api/products`
- `GET /api/categories`
- `POST /api/orders`
- etc.

### Path Construction Flow

```typescript
// frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api` // Appends /api here
  : "http://localhost:3001/api";

// Example result:
// If NEXT_PUBLIC_API_URL = "https://backend.example.com"
// Then API_BASE = "https://backend.example.com/api"
```

This centralized construction ensures:

1. **Single source of logic** - Only `lib/api.ts` handles path construction
2. **Consistency** - All API calls use the same pattern
3. **Maintainability** - Changes to path structure only require updating one file

---

## Historical Context: The Double `/api/api/` Bug

### What Happened (January 2026)

**Symptom**: Product pages returned 404 errors in production with backend logs showing:

```
Cannot GET /api/api/categories
Cannot GET /api/api/products/featured
Cannot GET /api/api/products/slug/fufu
```

**Root Cause**: `.env.production` contained:

```bash
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app/api
```

**Result**:

```typescript
// lib/api.ts constructed:
const API_BASE = "https://backend-production-3b87.up.railway.app/api" + "/api";
// = "https://backend-production-3b87.up.railway.app/api/api" ❌
```

**Fix**: Removed `/api` from `.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
```

This allowed `lib/api.ts` to correctly construct:

```typescript
const API_BASE = "https://backend-production-3b87.up.railway.app" + "/api";
// = "https://backend-production-3b87.up.railway.app/api" ✅
```

---

## Files That Must Follow This Pattern

### Environment Files (Priority: CRITICAL)

- ✅ `frontend/.env.production` - Used in Railway/Vercel production builds
- ✅ `frontend/.env.local` - Local development (created from example)
- ✅ `frontend/.env.example` - Template for developers
- ✅ `frontend/.env.local.example` - Alternative template

### Code Files (Priority: HIGH)

- ✅ `frontend/lib/api.ts` - Primary API client (contains path construction logic)
- ✅ `frontend/next.config.js` - Fallback env value must not include `/api`
- ✅ `frontend/components/admin/BusinessIntelligence.tsx` - Direct env usage
- ✅ `frontend/components/admin/AdminDashboard.tsx` - Direct env usage

### Deployment Configuration (Priority: MEDIUM)

- Railway environment variables (set via dashboard)
- Vercel environment variables (set via dashboard)
- CI/CD pipeline env files (GitHub Actions, etc.)

---

## Verification Checklist

Before any deployment, verify:

- [ ] **Environment Files**: Run `grep -r "NEXT_PUBLIC_API_URL" frontend/.env*` and ensure **no results** end with `/api`
- [ ] **Code Consistency**: All API_BASE constructions use the pattern `${NEXT_PUBLIC_API_URL}/api`
- [ ] **Backend Logs**: After deployment, check logs show single `/api/` paths (not `/api/api/`)
- [ ] **Smoke Test**: Access product pages and verify they load without 404 errors

---

## Common Pitfalls

### 1. Railway/Vercel Environment Variables vs `.env` Files

**Issue**: Developers update Railway dashboard env vars but forget `.env.production` in git  
**Solution**: `.env.production` in git **overrides** Railway/Vercel env vars during build

### 2. Copy-Paste from Backend `.env`

**Issue**: Backend `.env` may contain full URLs with `/api` for internal use  
**Solution**: Frontend and backend environment patterns are **different** - never copy between them

### 3. Inconsistent Fallback Values

**Issue**: Different components use different fallback patterns  
**Solution**: All fallbacks must match `lib/api.ts` pattern (append `/api` if env var doesn't include it)

### 4. Testing Locally Works, Production Fails

**Issue**: Local `.env.local` is correct, but `.env.production` is incorrect  
**Solution**: Always test with production-like env vars before deploying

---

## Debugging Guide

### Symptoms of Incorrect Configuration

1. **Backend logs show `/api/api/` paths**

   ```
   Cannot GET /api/api/products
   Cannot GET /api/api/categories
   ```

2. **Frontend console errors**

   ```
   Failed to fetch: 404 Not Found
   GET https://backend.example.com/api/api/products/featured
   ```

3. **Product pages return 404**
   - All product detail pages fail to load
   - Categories may load (if cached)

### Diagnosis Steps

1. **Check Environment Files**

   ```bash
   cd frontend
   grep "NEXT_PUBLIC_API_URL" .env.production .env.local .env.example
   ```

   **Expected**: No results should end with `/api`

2. **Check Browser Console**
   - Open DevTools → Console
   - Look for `API_BASE:` log from `lib/api.ts`
   - Verify it shows single `/api` (e.g., `https://backend.example.com/api`)

3. **Check Backend Logs**
   - Look for request paths in logs
   - Verify they show `/api/products` NOT `/api/api/products`

4. **Check next.config.js**
   ```bash
   grep "NEXT_PUBLIC_API_URL" frontend/next.config.js
   ```
   **Expected**: Fallback should be `http://localhost:3001` (no `/api`)

### Quick Fix Command

```bash
# Fix all environment files at once
cd frontend

# Update .env.production (if exists)
sed -i 's|NEXT_PUBLIC_API_URL=\(.*\)/api|NEXT_PUBLIC_API_URL=\1|' .env.production

# Update .env.local (if exists)
sed -i 's|NEXT_PUBLIC_API_URL=\(.*\)/api|NEXT_PUBLIC_API_URL=\1|' .env.local

# Verify changes
grep "NEXT_PUBLIC_API_URL" .env*
```

---

## Best Practices

### For Developers

1. **Always use `.env.example` as template** - Don't manually type env vars
2. **Never add `/api` to NEXT_PUBLIC_API_URL** - The system does this automatically
3. **Test production builds locally** - Use `.env.production` before deploying
4. **Check logs after deployment** - Verify no `/api/api/` paths appear

### For DevOps/Deployment

1. **Railway/Vercel Env Vars**: Set `NEXT_PUBLIC_API_URL` without `/api` suffix
2. **Commit `.env.production` to git**: This ensures consistent builds
3. **Monitor backend logs**: Watch for abnormal paths during deployment
4. **Automate verification**: Add path validation to CI/CD pipeline

### For Code Reviews

1. **Check all env var additions**: Ensure NEXT_PUBLIC_API_URL doesn't include `/api`
2. **Verify API_BASE constructions**: Must follow `${NEXT_PUBLIC_API_URL}/api` pattern
3. **Test environment files**: Reviewer should test `.env.production` locally

---

## Related Documentation

- [Tech Stack](./TECH_STACK.md) - Overall architecture
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment steps
- [Module: API Client](./MODULE_API_CLIENT.md) - Detailed API client documentation
- [Phase 7 Execution Report](./PHASE_7_EXECUTION_REPORT.md) - Production hardening details

---

## Change Log

| Date       | Change                                     | Author | Reason                             |
| ---------- | ------------------------------------------ | ------ | ---------------------------------- |
| 2026-01-26 | Initial creation                           | System | Document path construction pattern |
| 2026-01-26 | Added historical context of /api/api/ bug  | System | Prevent recurrence                 |
| 2026-01-26 | Added protective comments to lib/api.ts    | System | In-code warnings                   |
| 2026-01-26 | Fixed 4 files with incorrect /api suffixes | System | Comprehensive cleanup              |

---

## Summary

**The Golden Rule**: `NEXT_PUBLIC_API_URL` = Base URL only, no `/api` suffix.

**Why**: `lib/api.ts` automatically appends `/api` during construction.

**Impact**: Prevents double `/api/api/` paths that cause 404 errors in production.

**Verification**: Check logs for single `/api/` paths after every deployment.

---

**Last Updated**: January 26, 2026  
**Status**: ✅ Active Standard  
**Enforcement**: Required for all deployments
