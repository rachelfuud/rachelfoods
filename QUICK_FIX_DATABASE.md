# Quick Fix - Database Migration Issue

## IMMEDIATE ACTION WHEN DATABASE IS ONLINE

Run this command in PowerShell (from Rachel Foods directory):

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend"
npx prisma migrate resolve --applied 20260130000000_add_cms_tables
npx prisma migrate deploy
npx prisma generate
npm run build
```

## Why This Works

The CMS tables (`site_config`, `content_pages`, `content_sections`, `media_assets`) already exist in the database from previous failed migration attempts. By marking the migration as "applied," Prisma will skip trying to create them again.

## Current Status (Updated: Jan 30, 2026 - 7:15 PM UTC)

❌ **Database**: INTERMITTENT CONNECTIVITY (P1001 errors)  
✅ **Migration File**: Correctly formatted with DO $$ block  
✅ **Code**: Both frontend and backend build successfully  
⚠️ **Pattern**: Database has gone offline multiple times today (08:44, 16:31, 19:15 UTC)

## Important: Database Stability Issues Detected

Your Railway PostgreSQL database is experiencing intermittent connectivity:

- **04:06 UTC** - Historical prepared statement errors (FIXED in code)
- **08:44 UTC** - Password authentication failure
- **16:31 UTC** - Password authentication failure
- **16:33 UTC** - Database restarted (volume remounted)
- **19:07 UTC** - Migration attempted, constraint conflict (tables exist)
- **19:15 UTC** - Database offline (P1001 connection error)

**Recommendation**: Check Railway dashboard for:

1. Database health metrics
2. Volume mount status
3. Memory/CPU usage
4. Recent deployment logs

## What the Error Logs Mean

The repeated "cannot insert multiple commands into a prepared statement" errors you saw in the logs happened at **04:06 UTC on Jan 30**. This was BEFORE the fix was implemented. The proper migration file was created AFTER these errors, so they won't occur again.

## Verify Database is Online FIRST

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend"

# PowerShell syntax (use pipe instead of <<<)
echo "SELECT 1 AS test;" | npx prisma db execute --stdin
```

**Response Guide**:

- ✅ **Success** = Database online, proceed with commands below
- ❌ **P1001 error** = Database offline, wait 5-10 minutes and retry
- ❌ **Password auth failed** = Check Railway for password reset

---

**See full details**: [ISSUE_RESOLUTION_JAN30.md](./ISSUE_RESOLUTION_JAN30.md)
