# Automated CMS Migration Guide

## Overview

Three automated methods to run the CMS migration without manual database access.

---

## ✅ Method 1: Automatic on Deployment (RECOMMENDED)

The migration now runs **automatically** when Railway deploys your backend.

### How It Works

1. When you push code to GitHub, Railway triggers a deployment
2. Railway runs `npm install` which triggers the `postinstall` script
3. The `postinstall` script runs `npm run migrate:cms`
4. This executes `scripts/auto-migrate-cms.ts` which:
   - Checks if CMS tables already exist
   - If not, creates them from the SQL file
   - Seeds default header and footer configurations
   - If tables exist, skips migration

### What You Need to Do

**Nothing!** Just push your code and the migration runs automatically.

```bash
git add -A
git commit -m "feat: Add automated CMS migration"
git push origin main
```

### Check Deployment Logs

1. Go to Railway dashboard
2. Select your backend service
3. Click "Deployments" tab
4. View latest deployment logs
5. Look for:
   ```
   🔍 Checking if CMS tables exist...
   🚀 Running CMS tables migration...
   ✅ CMS tables migration completed successfully!
   ```

---

## ✅ Method 2: Trigger via API Endpoint

Run the migration by calling a protected admin API endpoint.

### Step 1: Get Your Backend URL

Find your Railway backend URL (e.g., `https://rachelfoods-backend.up.railway.app`)

### Step 2: Run PowerShell Script

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend\scripts"

.\run-migration-api.ps1 `
  -ApiUrl "https://your-backend-url.railway.app" `
  -AdminEmail "admin@rachelfoods.com" `
  -AdminPassword "YourAdminPassword"
```

### Step 3: Verify Success

You should see:

```
🔐 Logging in as admin...
✅ Login successful!

🚀 Running CMS migration...

Response:
{
  "success": true,
  "message": "CMS migration completed successfully"
}

✅ CMS migration completed successfully!
```

### Alternative: Use cURL (Windows PowerShell)

```powershell
# Step 1: Login
$loginBody = @{
    email = "admin@rachelfoods.com"
    password = "YourPassword"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "https://your-backend-url.railway.app/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.token

# Step 2: Run migration
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "https://your-backend-url.railway.app/api/admin/migrations/run-cms" `
    -Method Post `
    -Headers $headers
```

---

## ✅ Method 3: Manual Script Run (Fallback)

If Railway environment has database access, run directly:

```bash
# Via Railway CLI
railway run npm run migrate:cms

# Or
railway run npx ts-node scripts/auto-migrate-cms.ts
```

---

## Verification

After migration completes, verify tables were created:

### Option A: Check via Admin API

```powershell
# Login first (get token as shown above)
Invoke-RestMethod -Uri "https://your-backend-url.railway.app/api/cms/config/header" `
    -Method Get
```

Should return default header configuration.

### Option B: Check Railway Logs

Look for these messages in deployment logs:

```
✅ CMS tables migration completed successfully!
📦 Created tables:
  - site_config
  - content_pages
  - content_sections
  - media_assets
🌱 Default configurations seeded:
  - Header: Logo, navigation menu, announcement bar
  - Footer: Columns, social links, copyright
```

### Option C: Test Admin UI

1. Visit https://your-domain.com/admin
2. Login as admin
3. Click "CMS" → "Header"
4. If you see the header configuration form, migration succeeded!

---

## Troubleshooting

### Issue: "Table already exists"

**Status**: ✅ This is normal!
**Solution**: Migration is idempotent. It checks if tables exist and skips if already created.

### Issue: "Cannot find module 'auto-migrate-cms'"

**Cause**: TypeScript file not compiled during build
**Solution**: The postinstall script runs before build, so it uses ts-node to execute directly.

### Issue: API endpoint returns 401 Unauthorized

**Cause**: Invalid admin credentials or expired token
**Solution**:

1. Verify admin email/password are correct
2. Check if admin user exists in database
3. Try logging in via the web admin panel first

### Issue: API endpoint returns 404 Not Found

**Cause**: Backend not deployed yet or migration controller not registered
**Solution**:

1. Wait for Railway deployment to complete
2. Check deployment logs for errors
3. Verify AdminModule imports MigrationsController

### Issue: Migration runs but tables not created

**Cause**: SQL execution failed silently
**Solution**:

1. Check Railway logs for SQL errors
2. Verify DATABASE_URL is correct
3. Ensure database user has CREATE TABLE permissions

---

## Migration Script Details

### File: `scripts/auto-migrate-cms.ts`

**What it does**:

1. Connects to database via Prisma
2. Checks if `site_config` table exists
3. If exists: Skips migration (idempotent)
4. If not exists: Executes `manual_add_cms_tables.sql`
5. Creates 4 tables: site_config, content_pages, content_sections, media_assets
6. Seeds default header and footer configurations

**Safety features**:

- ✅ Idempotent (safe to run multiple times)
- ✅ Checks table existence before running
- ✅ Uses `CREATE TABLE IF NOT EXISTS`
- ✅ Rolls back on error (PostgreSQL transaction)
- ✅ Logs detailed progress

---

## Default Configurations

### Header (site_config type='header')

```json
{
  "logo": {
    "url": "/logo.png",
    "alt": "RachelFoods"
  },
  "navigation": [
    { "label": "Home", "href": "/", "order": 1 },
    { "label": "Products", "href": "/catalog", "order": 2 },
    { "label": "About", "href": "/about", "order": 3 },
    { "label": "Contact", "href": "/contact", "order": 4 }
  ],
  "announcement": {
    "enabled": false,
    "text": "Welcome to RachelFoods!",
    "link": "/catalog",
    "backgroundColor": "#10b981",
    "textColor": "#ffffff"
  }
}
```

### Footer (site_config type='footer')

```json
{
  "columns": [
    {
      "title": "Quick Links",
      "links": [
        { "label": "Home", "href": "/" },
        { "label": "Products", "href": "/catalog" },
        { "label": "About Us", "href": "/about" }
      ]
    },
    {
      "title": "Support",
      "links": [
        { "label": "FAQ", "href": "/faq" },
        { "label": "Contact", "href": "/contact" },
        { "label": "Shipping", "href": "/shipping" }
      ]
    },
    {
      "title": "Company",
      "links": [
        { "label": "Terms of Service", "href": "/terms" },
        { "label": "Privacy Policy", "href": "/privacy" }
      ]
    }
  ],
  "social": {
    "facebook": "https://facebook.com/rachelfoods",
    "twitter": "https://twitter.com/rachelfoods",
    "instagram": "https://instagram.com/rachelfoods",
    "linkedin": "https://linkedin.com/company/rachelfoods"
  },
  "copyright": "© 2026 RachelFoods. All rights reserved.",
  "paymentIcons": {
    "enabled": true,
    "icons": ["visa", "mastercard", "paypal", "stripe"]
  }
}
```

---

## Next Steps After Migration

Once migration completes:

1. ✅ **Access Admin CMS**
   - Visit https://your-domain.com/admin
   - Click "CMS" in sidebar
   - Select "Header" or "Footer"

2. ✅ **Customize Header**
   - Update logo URL
   - Add/remove navigation items
   - Enable announcement bar for promotions

3. ✅ **Customize Footer**
   - Edit footer columns
   - Update social media links
   - Modify copyright text

4. ✅ **Verify Changes**
   - Visit your public site
   - Changes should appear immediately (with 5-min cache)

---

## FAQ

**Q: Will this run on every deployment?**  
A: Yes, but it's safe! The script checks if tables exist and skips if already created.

**Q: What if I already ran the migration manually?**  
A: No problem! The script detects existing tables and exits gracefully.

**Q: Can I customize the default configurations?**  
A: Yes! Either:

- Edit the SQL file before deployment
- Or use the admin UI after migration completes

**Q: How do I know if migration succeeded?**  
A: Check Railway deployment logs or visit /admin/cms/header. If the page loads, it worked!

**Q: What if I want to reset CMS to defaults?**  
A: Drop the 4 CMS tables in Railway dashboard, then redeploy to recreate with defaults.

---

## Summary

**Recommended Approach**: Just push your code! 🚀

The migration runs automatically on Railway deployment. No manual steps needed.

If you prefer manual control, use the PowerShell script to trigger via API.

Either way, you'll have a fully functional CMS in under 2 minutes!
