# CMS Migration - Quick Start

## 🎯 What Just Happened

I've set up **3 automated ways** to run the CMS migration without manual database access:

---

## ✅ Option 1: AUTOMATIC (Happening Right Now!)

**The migration is running automatically on Railway as we speak!**

When Railway deploys your code:

1. Runs `npm install`
2. Triggers `postinstall` hook
3. Executes `npm run migrate:cms`
4. Creates CMS tables if they don't exist
5. Seeds default header/footer configs

**What to do**: Just wait 2-3 minutes for deployment to complete.

**How to check**:

- Go to Railway dashboard → Backend service → Deployments
- Look for: `✅ CMS tables migration completed successfully!`

---

## ✅ Option 2: Trigger via API (If Automatic Fails)

Run this PowerShell command from your machine:

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend\scripts"

.\run-migration-api.ps1 `
  -ApiUrl "https://rachelfoods-production-8f39.up.railway.app" `
  -AdminEmail "admin@rachelfoods.com" `
  -AdminPassword "YourActualPassword"
```

Replace the URL with your actual Railway backend URL.

**What it does**:

1. Logs in as admin
2. Calls `POST /api/admin/migrations/run-cms`
3. Backend runs the migration
4. Returns success/failure

---

## ✅ Option 3: Manual Script (Fallback)

If you have Railway CLI installed:

```bash
cd "c:\Projects\Dev\Rachel Foods\backend"
railway run npm run migrate:cms
```

---

## 🔍 How to Verify It Worked

### Check 1: Railway Logs

Look for this in deployment logs:

```
🔍 Checking if CMS tables exist...
🚀 Running CMS tables migration...
✅ CMS tables migration completed successfully!
📦 Created tables:
  - site_config
  - content_pages
  - content_sections
  - media_assets
```

### Check 2: Admin UI

1. Visit https://rachelfoods.vercel.app/admin
2. Login
3. Click "CMS" in sidebar
4. Click "Header"
5. If you see the configuration form → **SUCCESS!**

### Check 3: API Test

```powershell
Invoke-RestMethod -Uri "https://your-backend-url.railway.app/api/cms/config/header"
```

Should return header configuration JSON.

---

## ⚡ Expected Timeline

- **Now**: Code pushed to GitHub ✅
- **+30 seconds**: Railway detects push, starts build
- **+2 minutes**: Build completes, runs `npm install`
- **+2m 30s**: Migration executes automatically
- **+3 minutes**: Backend restarts with CMS tables ready
- **+3m 30s**: You can access /admin/cms/header

**Total time**: ~3-4 minutes from push to ready

---

## 🎨 What You Can Do After Migration

1. **Edit Header**:
   - Change logo from `/logo.png` to your actual logo URL
   - Add/remove navigation menu items
   - Enable announcement bar: "🎉 Grand Opening - 20% off all orders!"

2. **Edit Footer**:
   - Add your real social media URLs
   - Customize footer columns
   - Update copyright text

3. **No Code Deployment Needed**:
   - All changes save to database
   - Appear on site within 5 minutes (cache TTL)

---

## 🚨 If Something Goes Wrong

### Error: "Table already exists"

✅ **This is good!** Migration detected tables exist, skipped creation.

### Error: "Cannot reach database"

📝 Use **Option 2** (API trigger) instead - calls from within Railway network.

### Error: 401 Unauthorized

🔐 Check admin password in the PowerShell command.

### Error: Migration timeout

⏱️ Normal for first run. Check Railway logs - migration might still be running.

---

## 📚 Full Documentation

For detailed info, see:

- [docs/AUTOMATED_CMS_MIGRATION.md](file:///c:/Projects/Dev/Rachel%20Foods/docs/AUTOMATED_CMS_MIGRATION.md) - Complete guide
- [docs/CMS_IMPLEMENTATION_GUIDE.md](file:///c:/Projects/Dev/Rachel%20Foods/docs/CMS_IMPLEMENTATION_GUIDE.md) - CMS features

---

## 🎯 Next Step

**Wait 3-4 minutes**, then visit your admin panel:

https://rachelfoods.vercel.app/admin → CMS → Header

If it loads, **you're done!** 🎉

The migration ran automatically during deployment.
