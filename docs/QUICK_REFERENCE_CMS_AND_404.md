# Quick Reference: Homepage Control & Admin 404 Fix

## 🎯 Homepage Content Control - You Already Have It!

### Current CMS Admin Pages (Already Built)

Your system has a **complete CMS**. Access these admin pages:

1. **Hero Carousel Manager**
   - URL: `https://frontend-production-1660.up.railway.app/admin/hero-slides`
   - Edit: Homepage carousel images, titles, CTAs, links
   - Features: Upload images, reorder slides, enable/disable

2. **Header Manager**
   - URL: `https://frontend-production-1660.up.railway.app/admin/cms/header`
   - Edit: Navigation menu, logo, announcement bar
   - Features: Add/remove menu items, customize announcement

3. **Footer Manager**
   - URL: `https://frontend-production-1660.up.railway.app/admin/cms/footer`
   - Edit: Footer columns, links, social media, copyright
   - Features: Multi-column layout, social links

4. **Pages Manager**
   - URL: `https://frontend-production-1660.up.railway.app/admin/cms/pages`
   - Create: Custom pages with rich content
   - Features: WYSIWYG editing, publish/unpublish

5. **Media Library**
   - URL: `https://frontend-production-1660.up.railway.app/admin/cms/media`
   - Manage: Upload and organize images
   - Features: Folder organization, delete media

### What You Can Already Edit

✅ **Hero Section** - via Hero Slides Manager  
✅ **Header/Navigation** - via Header Manager  
✅ **Footer** - via Footer Manager  
✅ **Product Displays** - Automatic from database  
✅ **Custom Pages** - via Pages Manager

### What's Still Hardcoded (Needs Implementation)

❌ **Section Headings** - "Shop Our Products", "Why Choose RachelFoods"  
❌ **Feature Descriptions** - Homepage feature list  
❌ **SEO Metadata** - Page title, meta description, keywords

### How to Get Complete Homepage Control

**Option 1: Quick Implementation (30 minutes)**
Follow the guide: `docs/HOMEPAGE_CMS_IMPLEMENTATION.md`

This adds a **Homepage Manager** page where you can edit:

- All section headings
- All subheadings
- SEO metadata (title, description, keywords)
- Section visibility toggles
- Product display counts

**Option 2: Use Existing Pages System (Immediate)**

1. Go to `/admin/cms/pages`
2. Create a page with slug `homepage`
3. Add sections for each content block
4. Update homepage to fetch from CMS

**Option 3: Edit Code Directly (Current Method)**

- Edit: `frontend/app/page.tsx`
- Change hardcoded text directly
- Deploy to see changes

**Recommendation:** Implement Option 1 for full control without code changes.

---

## 🔧 Admin Routes 404 Fix

### Problem

`/admin/products/new` returns 404 error

### Root Cause

Railway build cache not picking up Next.js config changes from commit `e5d238e`

### Solution: Force Railway Rebuild

**Step-by-Step:**

1. **Login to Railway**
   - Go to: https://railway.app/dashboard
   - Select: RachelFoods project

2. **Navigate to Frontend Service**
   - Click: `frontend-production-1660` service
   - Click: "Deployments" tab

3. **Force Rebuild**
   - Find: Latest deployment in list
   - Click: "Redeploy" button
   - Wait: 2-3 minutes for build to complete

4. **Test**
   - Open: `https://frontend-production-1660.up.railway.app/admin/products/new`
   - Should load product creation form

### If Still 404 After Redeploy

**Nuclear Option - Clear All Caches:**

1. Railway Dashboard → Frontend Service
2. Click "Settings" tab
3. Scroll down → "Redeploy from Scratch"
4. Confirm and wait 3-5 minutes
5. Test URL again

### Alternative: Check What's Actually Deployed

**Test these URLs to narrow down the issue:**

```
✅ https://frontend-production-1660.up.railway.app/
   → Should load (homepage)

❓ https://frontend-production-1660.up.railway.app/admin
   → Should load (admin dashboard)

❓ https://frontend-production-1660.up.railway.app/admin/products
   → Should load (product list)

❌ https://frontend-production-1660.up.railway.app/admin/products/new
   → Currently 404 (what we're fixing)
```

**If ALL admin routes 404:**

- Problem: Next.js standalone output issue
- Solution: See `docs/ADMIN_404_TROUBLESHOOTING.md` Theory 2

**If ONLY `/admin/products/new` 404:**

- Problem: Route-specific build issue
- Solution: Forced rebuild should fix it

### Detailed Troubleshooting

For comprehensive debugging steps, see:
📖 **`docs/ADMIN_404_TROUBLESHOOTING.md`**

Covers:

- Build cache issues
- Standalone output problems
- Middleware conflicts
- Build log analysis
- Workarounds while fixing

---

## 📊 Current System Status

### ✅ Working

- Backend deployed successfully (commit b3385d7)
- Seed script updated with correct stock (commit 58ef86e)
- Hero Slides CMS operational
- Header/Footer CMS operational
- Pages CMS operational
- Media Library operational

### ⚠️ Needs Action

1. **Run seed script** on Railway backend:

   ```bash
   npx ts-node seed-railway.ts
   ```

   This updates products to 900+ stock levels

2. **Force frontend rebuild** on Railway:
   - Dashboard → Frontend → Deployments → Redeploy
   - Fixes admin 404 issue

3. **Implement Homepage Manager** (optional but recommended):
   - Follow: `docs/HOMEPAGE_CMS_IMPLEMENTATION.md`
   - Gives complete homepage content control

### ❌ Blocked

- Admin products/new route (404) - waiting on Railway redeploy

---

## 🚀 Next Steps

### Immediate (5 minutes)

1. Login to Railway Dashboard
2. Redeploy frontend service
3. Test `/admin/products/new` URL
4. Verify 404 is fixed

### Short-term (10 minutes)

1. SSH into Railway backend (or use web terminal)
2. Run: `npx ts-node seed-railway.ts`
3. Verify products show correct stock on frontend
4. Check product API: `/api/products/fresh-ogi` shows stock: 980

### Long-term (30 minutes)

1. Read: `docs/HOMEPAGE_CMS_IMPLEMENTATION.md`
2. Implement homepage config backend endpoint
3. Create homepage manager admin page
4. Update homepage to use CMS config
5. Test full homepage editing capabilities

---

## 📞 Support

**If you need help:**

1. **Railway 404 Issue:**
   - Check: Railway build logs for errors
   - Try: "Redeploy from Scratch" option
   - Contact: Railway support with build logs

2. **CMS Implementation:**
   - Guide: `docs/HOMEPAGE_CMS_IMPLEMENTATION.md`
   - Reference: Existing CMS files in `backend/src/cms/`
   - Example: `frontend/app/admin/cms/header/page.tsx`

3. **General Issues:**
   - Check: `docs/` folder for comprehensive guides
   - Review: Module documentation in docs
   - Reference: Role permission matrix, tech stack docs

---

## 🎓 Summary

**For Homepage Control:**

- You **already have** CMS for hero, header, footer, pages
- You **need to implement** homepage section manager (30 min work)
- **Guide available:** `docs/HOMEPAGE_CMS_IMPLEMENTATION.md`

**For Admin 404:**

- **Root cause:** Railway build cache
- **Solution:** Force redeploy in Railway dashboard
- **Time:** 2-3 minutes + rebuild time
- **Fallback:** Redeploy from scratch (clears all caches)

**Current Blockers:**

1. Seed script committed but not executed → Run manually on Railway
2. Admin routes 404 → Force Railway rebuild
3. Homepage hardcoded content → Implement CMS (optional)

All blockers have clear solutions and can be resolved in under 30 minutes total.
