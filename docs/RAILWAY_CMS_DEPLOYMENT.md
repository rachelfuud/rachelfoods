# Railway Deployment Guide - CMS Migration

## Overview

This guide helps you apply the CMS migration on Railway's production database.

## Migration Files Created

- `backend/prisma/migrations/manual_add_cms_tables.sql` - SQL migration script
- `backend/scripts/run-cms-migration.ts` - TypeScript migration runner

## Option 1: Run via Railway CLI (Recommended)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Link to Your Project

```bash
cd "c:\Projects\Dev\Rachel Foods\backend"
railway link
```

### Step 4: Run Migration via Railway

```bash
railway run npx ts-node scripts/run-cms-migration.ts
```

## Option 2: Execute SQL Directly in Railway Dashboard

### Step 1: Access Railway Dashboard

1. Go to https://railway.app
2. Login to your account
3. Select your RachelFoods project
4. Click on the PostgreSQL database service

### Step 2: Open Database Query Tool

1. Click "Query" tab in the database dashboard
2. Copy the contents of `backend/prisma/migrations/manual_add_cms_tables.sql`
3. Paste into the query editor
4. Click "Run Query"

### Step 3: Verify Tables Created

Run this query to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('site_config', 'content_pages', 'content_sections', 'media_assets');
```

You should see all 4 tables listed.

## Option 3: Use psql from Railway

### Step 1: Get Database Connection Command

1. In Railway dashboard, go to your PostgreSQL service
2. Click "Connect" tab
3. Copy the "psql" command

### Step 2: Connect and Run Migration

```bash
# The command will look like this:
psql postgresql://postgres:PASSWORD@yamabiko.proxy.rlwy.net:40977/railway

# Once connected, paste the migration SQL
# Or use psql file import:
psql postgresql://postgres:PASSWORD@yamabiko.proxy.rlwy.net:40977/railway -f backend/prisma/migrations/manual_add_cms_tables.sql
```

## Verification Steps

After running the migration, verify it worked:

### 1. Check Tables Exist

```sql
\dt
```

Look for: site_config, content_pages, content_sections, media_assets

### 2. Check Default Data Loaded

```sql
SELECT type, "isActive" FROM site_config;
```

Should return:

- header | true
- footer | true

### 3. Check Header Config

```sql
SELECT config FROM site_config WHERE type = 'header';
```

Should return JSON with logo, navigation, announcement

### 4. Check Footer Config

```sql
SELECT config FROM site_config WHERE type = 'footer';
```

Should return JSON with columns, social, copyright

## Common Issues

### Issue: "Can't reach database server"

**Solution**: Database might be in VPC. Use Railway CLI or Railway dashboard Query tool instead.

### Issue: "Table already exists"

**Solution**: Migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: "Permission denied"

**Solution**: Ensure you're using the correct DATABASE_URL with admin credentials.

## After Migration Success

Once the migration is applied:

1. **Restart your backend service** on Railway (it auto-redeploys on git push)
2. **Access admin panel**: https://your-domain.com/admin
3. **Go to CMS → Header** to configure your site header
4. **Go to CMS → Footer** to configure your site footer
5. **Save changes** and verify they appear on your public site

## Default Configuration

The migration seeds these defaults:

### Header

- Logo: /logo.png
- Navigation: Home, Products, About, Contact
- Announcement: Disabled

### Footer

- Columns: Quick Links, Support, Company
- Social: Facebook, Twitter, Instagram, LinkedIn
- Copyright: © 2026 RachelFoods. All rights reserved.
- Payment Icons: Enabled

You can customize all of these in the admin panel after migration.

## Next Steps

After successful migration:

1. ✅ CMS tables created
2. ✅ Default configurations seeded
3. ⏳ Update Header.tsx to fetch from API (coming soon)
4. ⏳ Update Footer.tsx to fetch from API (coming soon)
5. ⏳ Test complete CMS flow

## Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Verify DATABASE_URL is correct
3. Ensure backend service is running
4. Check browser console for frontend errors
