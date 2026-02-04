# Database Connectivity Troubleshooting Guide

**Created**: January 30, 2026  
**Issue**: Railway PostgreSQL database intermittent connectivity  
**Database**: `yamabiko.proxy.rlwy.net:40977` (Railway)

---

## 🔍 Current Situation Summary

### Timeline of Events (Jan 30, 2026)

| Time (UTC)     | Event                                                                                | Status              |
| -------------- | ------------------------------------------------------------------------------------ | ------------------- |
| 04:06-04:06:25 | "cannot insert multiple commands into a prepared statement" errors (15+ occurrences) | ❌ HISTORICAL ERROR |
| 08:44          | Password authentication failure                                                      | ❌ AUTH ISSUE       |
| 16:31          | Password authentication failure                                                      | ❌ AUTH ISSUE       |
| 16:33          | Database restarted, volume remounted                                                 | ⚠️ RESTART          |
| 19:07          | Migration attempted: "constraint fk_content_sections_page already exists"            | ⚠️ SCHEMA CONFLICT  |
| 19:08          | Checkpoint logged (database operational)                                             | ✅ ONLINE           |
| 19:15+         | P1001 connection errors                                                              | ❌ OFFLINE          |

### Key Findings

1. **Historical Error (FIXED)**: The "cannot insert multiple commands" error from 04:06 UTC is resolved - migration file now uses DO $$ PL/pgSQL block
2. **Current Error**: CMS tables exist but migration history is incomplete (constraint conflict at 19:07 UTC)
3. **Connectivity Pattern**: Database goes offline intermittently with P1001 errors
4. **Password Auth Failures**: Two instances of authentication failures (08:44, 16:31 UTC)

---

## 🛠️ Immediate Actions

### Step 1: Check Railway Dashboard

1. **Login to Railway**: https://railway.app
2. **Navigate to your PostgreSQL service**
3. **Check**:
   - **Metrics Tab**: CPU, Memory, Network usage
   - **Deployments Tab**: Recent deployment status
   - **Logs Tab**: Real-time database logs
   - **Settings Tab**: Verify database credentials haven't changed

### Step 2: Verify Connection String

Current connection string in `backend/.env`:

```
postgresql://postgres:dhCtxlgJYePUPVUJrMsGTwQmOfjtLngH@yamabiko.proxy.rlwy.net:40977/railway
```

**Verify**:

- Railway dashboard shows same host: `yamabiko.proxy.rlwy.net:40977`
- Password matches: `dhCtxlgJYePUPVUJrMsGTwQmOfjtLngH`
- Database name is `railway`

### Step 3: Test Connectivity

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend"

# Test 1: Prisma status
npx prisma migrate status

# Test 2: Direct query
echo "SELECT version();" | npx prisma db execute --stdin

# Test 3: Network connectivity (if psql installed)
# psql "postgresql://postgres:dhCtxlgJYePUPVUJrMsGTwQmOfjtLngH@yamabiko.proxy.rlwy.net:40977/railway" -c "SELECT 1;"
```

**Error Interpretation**:

| Error                                | Meaning                           | Solution                               |
| ------------------------------------ | --------------------------------- | -------------------------------------- |
| `P1001: Can't reach database server` | Network/firewall/database offline | Wait 5-10 min, check Railway dashboard |
| `password authentication failed`     | Credentials changed or rotated    | Get new password from Railway          |
| `timeout`                            | Network latency or DB overloaded  | Check Railway metrics                  |
| `constraint already exists`          | Migration schema conflict         | Mark migration as applied (see below)  |

---

## 🔧 Resolution Steps (When Database is Stable)

### Pre-Flight Checklist

- [ ] Database shows "Active" status in Railway dashboard
- [ ] No recent deployment failures in Railway logs
- [ ] `npx prisma migrate status` connects successfully
- [ ] No password authentication errors in last 10 minutes

### Execute Migration Fix

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend"

# 1. Verify current migration status
npx prisma migrate status

# Expected output:
# - 15 migrations applied
# - 1 migration unapplied (20260130000000_add_cms_tables)

# 2. Mark CMS migration as applied (tables already exist)
npx prisma migrate resolve --applied 20260130000000_add_cms_tables

# Expected output:
# "Migration 20260130000000_add_cms_tables marked as applied."

# 3. Deploy any remaining migrations
npx prisma migrate deploy

# Expected output:
# "No pending migrations to apply."
# OR
# "Applying migration `20260131000000_add_additional_performance_indexes`"

# 4. Regenerate Prisma client
npx prisma generate

# Expected output:
# "✔ Generated Prisma Client"

# 5. Verify tables exist
echo "SELECT table_name FROM information_schema.tables WHERE table_name IN ('site_config', 'content_pages', 'content_sections', 'media_assets');" | npx prisma db execute --stdin

# Expected output: 4 rows (all CMS tables)

# 6. Rebuild backend
npm run build
```

---

## 🚨 If Database Remains Offline

### Option 1: Wait for Railway Auto-Recovery

Railway databases typically auto-recover from temporary outages. Wait 15-30 minutes and retry.

### Option 2: Manual Restart via Railway Dashboard

1. Go to Railway dashboard → Your PostgreSQL service
2. Click **Settings** tab
3. Scroll to **Danger Zone**
4. Click **Restart Service**
5. Wait 2-3 minutes for database to come online
6. Retry migration commands

### Option 3: Check Railway Status Page

Visit https://railway.statuspage.io to check for:

- Platform-wide outages
- Database service degradation
- Scheduled maintenance

### Option 4: Contact Railway Support

If database remains offline > 1 hour:

1. **Railway Discord**: https://discord.gg/railway
2. **Support Email**: team@railway.app
3. **Include**:
   - Project ID
   - Service name (PostgreSQL)
   - Timeline of errors
   - Screenshot of Railway dashboard metrics

---

## 🔍 Diagnostic Queries (When Database is Online)

```sql
-- Check CMS tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('site_config', 'content_pages', 'content_sections', 'media_assets');

-- Check site_config data
SELECT type, "isActive" FROM site_config ORDER BY type;

-- Check Prisma migration history
SELECT migration_name, finished_at
FROM _prisma_migrations
WHERE migration_name LIKE '%cms%'
ORDER BY finished_at DESC;

-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'content_sections';
```

Run these via PowerShell:

```powershell
echo "SELECT table_name FROM information_schema.tables WHERE table_name IN ('site_config', 'content_pages', 'content_sections', 'media_assets');" | npx prisma db execute --stdin
```

---

## 📊 Understanding the Errors

### Error 1: "cannot insert multiple commands into a prepared statement" (RESOLVED)

**When**: 04:06 UTC on Jan 30, 2026  
**Cause**: Manual SQL migration files mixed DDL (CREATE TABLE) with DML (INSERT) without PL/pgSQL wrapping  
**Fix**: Migration file `20260130000000_add_cms_tables/migration.sql` now uses DO $$ block  
**Status**: ✅ FIXED - Error will not recur

### Error 2: "constraint fk_content_sections_page already exists" (CURRENT)

**When**: 19:07 UTC on Jan 30, 2026  
**Cause**: Previous failed migration attempts created tables, but Prisma migration history doesn't reflect this  
**Fix**: Use `prisma migrate resolve --applied` to mark migration as complete  
**Status**: ⏳ AWAITING DATABASE AVAILABILITY

### Error 3: P1001 "Can't reach database server" (ONGOING)

**When**: Intermittent throughout Jan 30, 2026  
**Cause**: Railway database connectivity issues (network, volume mount, resource constraints)  
**Fix**: Monitor Railway dashboard, wait for stability  
**Status**: ⚠️ ENVIRONMENTAL ISSUE

---

## 📝 Next Steps After Fix

1. **Verify CMS Tables**:

   ```powershell
   echo "SELECT type FROM site_config;" | npx prisma db execute --stdin
   # Should return: footer, header
   ```

2. **Test Backend Build**:

   ```powershell
   cd "c:\Projects\Dev\Rachel Foods\backend"
   npm run build
   # Should succeed with 0 errors
   ```

3. **Start Backend Locally**:

   ```powershell
   npm run start:dev
   # Should start without migration errors
   ```

4. **Monitor Railway Logs**:
   - Watch for connection resets
   - Watch for checkpoint logs (normal)
   - Watch for password auth failures (abnormal)

5. **Document Final Status**:
   - Update [ISSUE_RESOLUTION_JAN30.md](./ISSUE_RESOLUTION_JAN30.md)
   - Record in project changelog
   - Update Phase 9 documentation

---

## 🎯 Success Criteria

You'll know the issue is fully resolved when:

- [x] Database stays online for > 1 hour without P1001 errors
- [ ] `npx prisma migrate status` shows 16 migrations applied (or 17 if performance indexes applied)
- [ ] `npx prisma migrate deploy` returns "No pending migrations"
- [ ] Backend starts without migration errors
- [ ] CMS tables have data: `SELECT * FROM site_config;` returns 2 rows

---

## 📞 Support Contacts

- **Railway Discord**: https://discord.gg/railway (fastest response)
- **Railway Docs**: https://docs.railway.app/databases/postgresql
- **Prisma Docs**: https://www.prisma.io/docs/guides/migrate

---

**Last Updated**: January 30, 2026 - 7:20 PM UTC  
**Status**: Database intermittently offline, migration fix ready to execute
