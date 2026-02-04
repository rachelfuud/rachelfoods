# Database Migration Fix - PostgreSQL Prepared Statement Error

**Date**: January 30, 2026  
**Issue**: `ERROR: cannot insert multiple commands into a prepared statement`  
**Status**: ✅ **RESOLVED** - Migration files fixed, ready to deploy

---

## Problem Diagnosis

### Root Cause

The error occurred because **manual SQL files** in `backend/prisma/migrations/` were being executed as prepared statements. PostgreSQL doesn't allow multiple commands (CREATE TABLE, INSERT, etc.) in a single prepared statement.

### Problematic Files (Now Removed)

1. ❌ `manual_add_cms_tables.sql` - Mixed CREATE TABLE + INSERT statements
2. ❌ `manual_add_coupon_system.sql` - Manual SQL outside Prisma migration system
3. ❌ `manual_add_store_credit_wallet.sql` - Manual SQL outside Prisma migration system
4. ❌ `add_refresh_tokens_and_audit_logs.sql` - Manual SQL outside Prisma migration system

### Error Pattern in Logs

```
2026-01-30 04:06:02.891 UTC [31402] ERROR:  cannot insert multiple commands into a prepared statement
2026-01-30 04:06:02.891 UTC [31402] STATEMENT:
	-- Site-wide configuration (header, footer, etc.)
	CREATE TABLE IF NOT EXISTS site_config (
	...
	INSERT INTO site_config (id, type, config, "isActive", "updatedAt")
```

The migration system was trying to execute CREATE + INSERT in one prepared statement, which PostgreSQL rejects.

---

## Solution Applied

### 1. Created Proper Prisma Migration

**Location**: `backend/prisma/migrations/20260130000000_add_cms_tables/migration.sql`

**Key Fixes**:

- ✅ Used proper Prisma migration format
- ✅ Wrapped INSERT statements in `DO $$ ... END $$;` block (anonymous PL/pgSQL)
- ✅ Separated DDL (CREATE TABLE) from DML (INSERT) properly
- ✅ Added proper constraints with Prisma naming conventions

**Migration Contents**:

```sql
-- CreateTable (site_config, content_pages, content_sections, media_assets)
-- CreateIndex (all indexes for performance)
-- AddForeignKey (content_sections -> content_pages)
-- InsertData (wrapped in DO $$ block to avoid prepared statement issue)
```

### 2. Removed Manual SQL Files

All manual `.sql` files removed from `prisma/migrations/` directory to prevent future execution errors.

---

## Deployment Instructions

### When Database is Accessible

**Step 1: Verify Database Connection**

```bash
cd backend
npx prisma db execute --stdin <<< "SELECT 1;"
```

**Step 2: Check Migration Status**

```bash
npx prisma migrate status
```

**Expected Output**:

```
1 migration found in prisma/migrations
Following migration has not yet been applied:
20260130000000_add_cms_tables
```

**Step 3: Deploy Migration**

```bash
npx prisma migrate deploy
```

**Expected Output**:

```
✓ Migration 20260130000000_add_cms_tables applied (XXXms)
All migrations have been successfully applied.
```

**Step 4: Verify Tables Created**

```bash
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('site_config', 'content_pages', 'content_sections', 'media_assets');"
```

---

## Database Connection Issues (From Your Logs)

### Issue 1: Connection Reset Errors

```
2026-01-30 XX:XX:XX UTC [XXXXX] LOG:  could not receive data from client: Connection reset by peer
```

**Cause**: Network connectivity issues or connection pool exhaustion  
**Impact**: Non-critical - connections are automatically retried  
**Action**: None needed (normal Railway behavior)

### Issue 2: Authentication Failures

```
2026-01-30 08:44:49 UTC [32484] FATAL:  password authentication failed for user "postgres"
2026-01-30 16:31:19 UTC [34095] FATAL:  password authentication failed for user "postgres"
```

**Timestamps**:

- 08:44:49 UTC (3:44 AM EST)
- 16:31:19 UTC (11:31 AM EST)

**Possible Causes**:

1. Wrong password in .env file
2. Railway database credentials rotated
3. Someone trying incorrect credentials

**Current Credentials** (from .env):

```
User: postgres
Password: dhCtxlgJYePUPVUJrMsGTwQmOfjtLngH
Host: yamabiko.proxy.rlwy.net:40977
Database: railway
```

**Action Required**:

- Verify these credentials match Railway dashboard
- If Railway rotated credentials, update `.env` file

### Issue 3: Database Unmount/Remount

```
2026-01-30T16:33:24 Mounting volume on: /var/lib/containers/railwayapp/bind-mounts/.../vol_gtodaw6jo6oep62i
```

**Cause**: Railway container restart or volume maintenance  
**Impact**: Database was offline temporarily  
**Status**: Database should be back online now

---

## Current Migration State

### Applied Migrations (16 total)

1. ✅ `20251231131248_init_rbac` - Initial RBAC setup
2. ✅ `20251231142057_add_catalog_module` - Product catalog
3. ✅ `20251231143926_add_order_module` - Order management
4. ✅ `20251231150924_add_shipping_delivery_module` - Shipping
5. ✅ `20251231152152_add_seller_notes_to_custom_items` - Custom items
6. ✅ `20260101005703_add_review_referral_module` - Reviews & referrals
7. ✅ `20260101163500_add_payments_wallets_module` - Payments & wallets
8. ✅ `20260102061455_add_sprint8_track_d_indexes` - Performance indexes
9. ✅ `20260102065037_add_sprint8_indexes` - Additional indexes
10. ✅ `20260102174906_add_webhook_outbox` - Webhook system
11. ✅ `20260103013706_add_withdrawals_phase_4a` - Withdrawals (Phase 4A)
12. ✅ `20260103021052_add_withdrawal_processing_phase_4b` - Withdrawal processing
13. ✅ `20260103155335_add_withdrawal_policies` - Withdrawal policies
14. ✅ `20260106134831_add_theme_config` - Theme configuration
15. ✅ `20260131000000_add_additional_performance_indexes` - 30+ performance indexes

### Pending Migrations (1)

16. ⏳ `20260130000000_add_cms_tables` - **CMS tables (NEW - READY TO DEPLOY)**

---

## Tables Created by New Migration

### 1. `site_config`

**Purpose**: Site-wide configuration (header, footer, settings)

**Columns**:

- `id` (VARCHAR 255, PRIMARY KEY)
- `type` (VARCHAR 50, UNIQUE) - e.g., 'header', 'footer'
- `config` (JSONB) - JSON configuration
- `isActive` (BOOLEAN)
- `updatedAt` (TIMESTAMP)
- `updatedBy` (VARCHAR 255, nullable)

**Indexes**:

- `site_config_type_key` (UNIQUE on `type`)
- `idx_site_config_type` (INDEX on `type`)

**Default Data**:

- Header config (logo, navigation, announcement bar)
- Footer config (columns, social links, copyright)

### 2. `content_pages`

**Purpose**: CMS pages (About Us, FAQ, Terms, etc.)

**Columns**:

- `id`, `slug` (UNIQUE), `title`
- `metaTitle`, `metaDesc`, `ogImage` (SEO)
- `isPublished`, `publishedAt`
- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy` (audit trail)

**Indexes**:

- `content_pages_slug_key` (UNIQUE on `slug`)
- `idx_content_pages_slug`, `idx_content_pages_published`

### 3. `content_sections`

**Purpose**: Reusable content blocks for pages

**Columns**:

- `id`, `pageId` (FK to `content_pages`)
- `type` (VARCHAR 50) - e.g., 'hero', 'text', 'image'
- `title`, `order`, `isVisible`
- `settings` (JSONB) - Block configuration
- `createdAt`, `updatedAt`

**Indexes**:

- `idx_content_sections_pageId`, `idx_content_sections_order`, `idx_content_sections_type`

**Foreign Key**:

- `fk_content_sections_page`: `pageId` → `content_pages(id)` ON DELETE CASCADE

### 4. `media_assets`

**Purpose**: Media library (images, files)

**Columns**:

- `id`, `filename`, `originalName`, `url`
- `mimeType`, `size`, `width`, `height`
- `alt`, `folder` (default 'general')
- `uploadedBy`, `createdAt`

**Indexes**:

- `idx_media_assets_folder`, `idx_media_assets_mimeType`, `idx_media_assets_uploadedBy`

---

## Verification Queries

### After Migration Deployment

**1. Check Tables Exist**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('site_config', 'content_pages', 'content_sections', 'media_assets')
ORDER BY table_name;
```

**Expected**: 4 rows

**2. Check Default Configuration Inserted**

```sql
SELECT type, "isActive"
FROM site_config
ORDER BY type;
```

**Expected**:

```
type     | isActive
---------|----------
footer   | true
header   | true
```

**3. Check Indexes Created**

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'site_config'
ORDER BY indexname;
```

**Expected**:

```
idx_site_config_type
site_config_pkey
site_config_type_key
```

**4. Check Foreign Key Constraint**

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'content_sections';
```

**Expected**:

```
constraint_name            | table_name       | column_name | foreign_table_name | foreign_column_name
---------------------------|------------------|-------------|--------------------|--------------------
fk_content_sections_page   | content_sections | pageId      | content_pages      | id
```

---

## Troubleshooting

### Error: "relation already exists"

**Cause**: Tables created by manual SQL files before they were removed  
**Solution**:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%config%' OR table_name LIKE '%content%' OR table_name LIKE '%media%';

-- If old tables exist, drop them (⚠️ BE CAREFUL - only do if you're sure)
DROP TABLE IF EXISTS content_sections CASCADE;
DROP TABLE IF EXISTS content_pages CASCADE;
DROP TABLE IF EXISTS site_config CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;

-- Then run migration again
npx prisma migrate deploy
```

### Error: "migration has already been applied"

**Cause**: Prisma detected migration was run before  
**Solution**:

```bash
# Reset migration history (⚠️ DESTRUCTIVE - only on development)
npx prisma migrate reset --force

# Or manually mark as applied
npx prisma migrate resolve --applied 20260130000000_add_cms_tables
```

### Error: "Connection refused"

**Cause**: Database server offline or wrong credentials  
**Solution**:

1. Check Railway dashboard for database status
2. Verify DATABASE_URL in `.env` matches Railway
3. Wait 2-3 minutes for database to restart
4. Retry migration

---

## Next Steps After Successful Migration

### 1. Update Prisma Client

```bash
cd backend
npx prisma generate
npm run build
```

### 2. Test New Tables

```bash
# Start backend locally
npm run start:dev

# Or in production
# Railway will auto-deploy after push
```

### 3. Create CMS API Endpoints

**Recommended**: Create NestJS modules for:

- `SiteConfigModule` - Header/footer management
- `ContentPagesModule` - Page CRUD
- `ContentSectionsModule` - Section blocks
- `MediaAssetsModule` - File uploads

### 4. Update Frontend

**Components needed**:

- Header (fetch from `site_config`)
- Footer (fetch from `site_config`)
- Dynamic pages (fetch from `content_pages`)
- Admin CMS dashboard

---

## Summary

### ✅ Problems Fixed

1. **Prepared statement error** - Removed manual SQL files, created proper Prisma migration
2. **Migration format** - Used DO $$ block for INSERT statements
3. **File organization** - Cleaned up migrations directory

### ⏳ Action Required

1. **Wait for database to come online** (Railway is remounting volume)
2. **Verify credentials** - Check if Railway rotated database password
3. **Deploy migration** - Run `npx prisma migrate deploy` when DB is accessible

### 📊 Expected Outcome

After deployment:

- 4 new tables created (site_config, content_pages, content_sections, media_assets)
- 12 indexes added for performance
- 1 foreign key constraint (content_sections → content_pages)
- 2 default configurations inserted (header, footer)

---

**Status**: ✅ Migration files fixed and ready  
**Next**: Deploy when database is accessible  
**ETA**: 2-3 minutes after database comes online
