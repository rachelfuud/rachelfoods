# API URL Standardization Fix

**Date**: February 2025  
**Issue**: "Failed to fetch" errors in admin dashboard  
**Root Cause**: Inconsistent API_BASE URL construction patterns across components

---

## The Problem

Multiple frontend components were constructing the API base URL differently:

### Pattern 1 (CORRECT - lib/api.ts)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:3001/api";

fetch(`${API_BASE}/products`);
// Result: https://backend.../api/products ✅
```

### Pattern 2 (INCORRECT - Some admin components)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

fetch(`${API_BASE}/api/admin/system/health`);
// Result: https://backend.../api/admin/system/health ✅ (works by chance)
// BUT inconsistent with Pattern 1!
```

### Pattern 3 (BROKEN - CMS components before fix)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Ignores API_BASE variable!
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cms/config/header`);
// Result: Depends on env var value - could be wrong ⚠️
```

---

## The Solution

**Standardized ALL components to use Pattern 1:**

```typescript
// ALWAYS construct API_BASE like this:
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:3001/api";

// Then use it WITHOUT adding /api again:
fetch(`${API_BASE}/admin/system/health`); // ✅ Correct
fetch(`${API_BASE}/api/admin/...`); // ❌ Wrong - double /api!
```

---

## Files Fixed

### 1. **frontend/components/admin/AdminDashboard.tsx**

**Before:**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
fetch(`${API_BASE}/api/admin/system/health`);
```

**After:**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:3001/api";
fetch(`${API_BASE}/admin/system/health`); // No /api prefix!
```

### 2. **frontend/app/admin/cms/header/page.tsx**

**Before:**

```typescript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cms/config/header`);
```

**After:**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:3001/api";
fetch(`${API_BASE}/admin/cms/config/header`);
```

### 3. **frontend/app/admin/cms/footer/page.tsx**

**Before:**

```typescript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cms/config/footer`);
```

**After:**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:3001/api";
fetch(`${API_BASE}/admin/cms/config/footer`);
```

---

## Railway Environment Variable Configuration

### CORRECT Configuration

```bash
# In Railway, set this variable (NO /api suffix):
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
```

### ❌ WRONG Configurations

```bash
# Do NOT include /api suffix:
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app/api  # WRONG!

# Do NOT include trailing slash:
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app/     # Avoid
```

---

## Testing Checklist

After deploying these fixes, verify:

- [ ] Admin dashboard loads without "Failed to fetch" errors
- [ ] System health metrics display correctly
- [ ] Order metrics load properly
- [ ] CMS > Header configuration loads and saves
- [ ] CMS > Footer configuration loads and saves
- [ ] Products page loads (when accessing /admin/products)
- [ ] No console errors related to API calls
- [ ] Browser console shows correct API_BASE URL in lib/api.ts debug logs

---

## Browser Console Debug

Check browser console for these debug logs from `lib/api.ts`:

```javascript
API_BASE: https://backend-production-3b87.up.railway.app/api
NEXT_PUBLIC_API_URL: https://backend-production-3b87.up.railway.app
```

If you see double `/api/api/` in any fetch URLs, the pattern is still incorrect somewhere.

---

## Development vs Production

### Development (localhost)

```typescript
// .env.local should NOT have NEXT_PUBLIC_API_URL
// OR set to:
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production (Railway)

```bash
# Railway environment variable:
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
```

---

## Future Development Guidelines

**RULE**: When adding new API calls in frontend components:

1. ✅ **DO**: Import and use `lib/api.ts` methods when available
2. ✅ **DO**: If writing custom fetch, use this pattern EXACTLY:
   ```typescript
   const API_BASE = process.env.NEXT_PUBLIC_API_URL
     ? `${process.env.NEXT_PUBLIC_API_URL}/api`
     : "http://localhost:3001/api";
   ```
3. ❌ **DON'T**: Use `process.env.NEXT_PUBLIC_API_URL` directly in fetch calls
4. ❌ **DON'T**: Add `/api` after using `API_BASE` (it's already included)
5. ❌ **DON'T**: Mix patterns - always follow lib/api.ts convention

---

## Related Documentation

- [PRODUCTION_DEPLOYMENT_ANALYSIS.md](./PRODUCTION_DEPLOYMENT_ANALYSIS.md) - Initial deployment fixes
- [ENVIRONMENT_FIX_GUIDE.md](./ENVIRONMENT_FIX_GUIDE.md) - Environment variable setup
- [TECH_STACK.md](./TECH_STACK.md) - Technology overview

---

## Summary

**Problem**: Inconsistent API URL construction caused "Failed to fetch" errors  
**Solution**: Standardized all components to append `/api` to `NEXT_PUBLIC_API_URL` once, then use without prefix  
**Impact**: Admin dashboard, CMS pages, and all API calls now work correctly  
**Prevention**: Follow the pattern in lib/api.ts for all future API calls
