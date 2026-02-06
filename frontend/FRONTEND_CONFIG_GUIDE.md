# Frontend Configuration - Best Practices & Prevention Guide

## ✅ DO's

### 1. Keep Dependencies Minimal

```json
// ✅ CORRECT - Only include what you use
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0"
    // Only production dependencies
  }
}
```

### 2. Clean Metadata Configuration

```typescript
// ✅ CORRECT - Minimal, essential metadata
export const metadata: Metadata = {
  title: 'Your App Name',
  description: 'Your app description',
  // NO manifest references
  // NO icon references unless files actually exist
};
```

### 3. Verify Files Exist Before Referencing

```typescript
// ❌ WRONG - Referencing non-existent files
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-192.png" />

// ✅ CORRECT - Only reference files that exist in public/
// If you don't have these files, don't reference them!
```

## ❌ DON'Ts

### 1. Never Add Platform-Specific Libraries When Deploying Elsewhere

```typescript
// ❌ WRONG - Using Vercel Analytics on Railway
import { Analytics } from '@vercel/analytics/react';

// ✅ CORRECT - Only use platform-agnostic libraries
// OR check deployment platform before importing
const isVercel = process.env.VERCEL === '1';
```

### 2. Never Add PWA Config Without Complete Setup

```json
// ❌ WRONG - Partial PWA configuration
{
  "manifest": "/manifest.json", // File doesn't exist
  "icons": {
    "icon": "/icon-192.png" // File doesn't exist
  }
}

// ✅ CORRECT - Either implement PWA fully OR don't reference it at all
```

### 3. Never Mix Development and Production URLs

```typescript
// ❌ WRONG - Hardcoded URLs
fetch('http://localhost:3001/api/products');

// ✅ CORRECT - Use environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
fetch(`${API_URL}/api/products`);
```

## 🔍 Pre-Deployment Checklist

Before deploying frontend:

### Dependencies

- [ ] Remove all unused dependencies from package.json
- [ ] No Vercel-specific packages (if deploying to Railway/other)
- [ ] No platform-specific analytics unless actually configured

### Public Folder

- [ ] All referenced files actually exist in `/public` folder
- [ ] No references to non-existent icons or manifests
- [ ] Favicon.ico exists if referenced

### Configuration Files

- [ ] next.config.js is clean (no experimental flags unless needed)
- [ ] No hardcoded URLs in code
- [ ] Environment variables properly set

### Layout/Metadata

- [ ] app/layout.tsx has no `<head>` section with platform-specific links
- [ ] Metadata object only references existing files
- [ ] No Analytics components unless platform matches

## 🚨 Common Issues & Fixes

### Issue: 404 errors for /icon-192.png, /manifest.json, etc.

**Cause**: Metadata or HTML references files that don't exist  
**Fix**:

1. Check `app/layout.tsx` for `<link>` tags in `<head>`
2. Check metadata object for icon/manifest references
3. Either create the files OR remove the references

### Issue: Vercel Analytics 404 on non-Vercel deployment

**Cause**: `@vercel/analytics` imported but app not on Vercel  
**Fix**:

```typescript
// Remove this:
import { Analytics } from '@vercel/analytics/react';
<Analytics />

// Keep layout clean without platform-specific code
```

### Issue: Routes showing 404 in production

**Cause**: Build configuration mismatch  
**Fix**:

1. Check `next.config.js` - avoid `output: 'standalone'` on Railway
2. Use standard Next.js configuration for Railway deployments
3. Let platform's auto-detection handle build process

## 📋 File Reference Audit Script

Run before deployment:

```bash
# Check for non-existent file references
cd frontend

# Check metadata references
grep -r "manifest.json" app/
grep -r "icon-192" app/
grep -r "apple-touch-icon" app/

# Check Analytics imports
grep -r "@vercel/analytics" app/
grep -r "Analytics" app/

# Expected output: No matches (clean codebase)
```

## 🛠️ Emergency Fix Process

If you deployed and see 404 errors:

### Step 1: Identify the problematic file

```
Browser Console → Network Tab → Filter by 404
Note the filenames causing errors
```

### Step 2: Fix in codebase

```typescript
// Remove references in app/layout.tsx:
// Delete any <link> tags in <head> section
// Remove manifest/icon references from metadata
```

### Step 3: Redeploy

```bash
git add .
git commit -m "fix: Remove references to non-existent files"
git push  # Auto-deploys to Railway/Vercel
```

## 📚 Reference Files

### Clean Layout Example

```typescript
// app/layout.tsx - MINIMAL CLEAN VERSION
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your App",
  description: "Description",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Environment Variables Template

```env
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Railway/Vercel (production)
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## 🎯 Quick Checklist

**Before Every Deployment**:

- [ ] No hardcoded localhost URLs
- [ ] No platform-specific imports (unless on that platform)
- [ ] All referenced files exist in /public
- [ ] Clean metadata (no manifest/icon references if files missing)
- [ ] Environment variables configured on platform

**After Deployment**:

- [ ] Check browser console for 404 errors
- [ ] Verify all routes load correctly
- [ ] Test API connections work
- [ ] No Vercel/Analytics errors (if not on Vercel)

## 🔒 Prevention Mechanisms

1. **File Existence Check**: Before adding to metadata, ensure file in public/
2. **Platform Detection**: Only import platform libs if on that platform
3. **Environment Variables**: Never hardcode URLs or API endpoints
4. **Clean Template**: Start from minimal layout, add only what you need
5. **This Document**: Reference before every deployment

---

**Last Updated**: February 6, 2026  
**Maintained By**: Platform Team
