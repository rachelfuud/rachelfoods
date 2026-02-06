# Fix for Stale Prisma Advisory Lock (P1002 Error)

## Problem
Railway deployments are failing with repeated P1002 errors:
```
Error: P1002
Context: Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369))
```

This happens even when using `DIRECT_DATABASE_URL` because a previous migration process is holding the lock.

---

## Root Cause
1. **Prisma uses advisory locks** during migrations for safety
2. **Previous deployment crashed** or was interrupted during migration
3. **Lock was never released** on the database
4. **All subsequent deployments timeout** trying to acquire the same lock

---

## Immediate Fix (Run in Neon SQL Editor)

### Step 1: Access Neon SQL Editor
1. Go to https://console.neon.tech
2. Select your project: **ep-mute-pine-ajloc9zr**
3. Click **SQL Editor** tab

### Step 2: Clear All Advisory Locks
Copy and paste this SQL:

```sql
-- Release all advisory locks
SELECT pg_advisory_unlock_all();

-- Verify locks are cleared (should return 0 rows)
SELECT locktype, database, pid, mode, granted 
FROM pg_locks 
WHERE locktype = 'advisory';
```

**Expected Output**:
```
pg_advisory_unlock_all
----------------------
(1 row)

locktype | database | pid | mode | granted
-----------------------------------------
(0 rows)  ← Should be empty
```

### Step 3: Redeploy on Railway
1. Go to Railway dashboard
2. Backend service → **Deploy** → **Restart Deployment**
3. Watch logs - should now complete without P1002 errors

---

## Why This Happened

### Normal Migration Flow:
```
1. Prisma acquires lock: pg_advisory_lock(72707369)
2. Runs migrations
3. Releases lock: pg_advisory_unlock(72707369)
```

### What Went Wrong:
```
1. Prisma acquires lock ✅
2. Deployment crashes/times out ❌
3. Lock never released 🔒
4. All future deployments stuck waiting for lock ⏳
```

---

## Alternative: Temporary Skip Migration (Emergency Only)

If you need to deploy IMMEDIATELY and can't access Neon SQL Editor:

### Backend Environment Variable (Railway)
Add temporarily:
```
PRISMA_MIGRATE_SKIP_GENERATE=true
```

### Update Dockerfile CMD (Temporary)
```dockerfile
# Skip migration temporarily
CMD node dist/scripts/auto-migrate-cms.js && node dist/scripts/seed-admin.js && node dist/src/main.js
```

⚠️ **WARNING**: This skips database migrations! Only use if:
- Database schema is already up to date
- No pending migrations exist
- Emergency deployment needed NOW

---

## Long-Term Prevention

### Option 1: Retry Logic (Implemented)
File: `backend/scripts/migrate-deploy.js`

```javascript
// Automatically retries on advisory lock timeout
// Falls back to checking migration status
// Continues if no pending migrations
```

### Option 2: Lock Timeout Configuration
Add to Railway backend environment:
```
PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT=30000
```
(Increases timeout from 10s to 30s)

### Option 3: Pre-Migration Lock Check
Add to deployment script:
```sql
-- Before running migrations
SELECT pg_advisory_unlock_all();
```

---

## Verify Fix Worked

### Successful Deployment Logs:
```
[inf] Prisma schema loaded from prisma/schema.prisma
[inf] 14 migrations found in prisma/migrations
[inf] No pending migrations to apply. ✅
[inf] CMS tables already exist.
[inf] Application started on port 3001 ✅
```

### Should NOT See:
```
[err] Error: P1002 ❌
[err] Timed out trying to acquire a postgres advisory lock ❌
```

---

## Testing After Fix

### Test 1: Check Database Connection
```bash
# In backend directory
DATABASE_URL="your_pooler_url" npx prisma db execute --stdin < scripts/clear-migration-lock.sql
```

### Test 2: Run Migration Locally
```bash
DIRECT_DATABASE_URL="your_direct_url" npx prisma migrate deploy
```

### Test 3: Check Migration Status
```bash
npx prisma migrate status
```

**Expected**: "Database schema is up to date!"

---

## Related Files Created

1. **`backend/scripts/clear-migration-lock.sql`**
   - SQL script to manually clear locks
   - Run in Neon SQL Editor when stuck

2. **`backend/scripts/migrate-deploy.js`**
   - Retry logic for migrations
   - Handles advisory lock timeouts gracefully

---

## Summary

**Problem**: Stale Prisma advisory lock blocking all deployments  
**Immediate Fix**: Run `SELECT pg_advisory_unlock_all();` in Neon SQL Editor  
**Long-Term**: Use retry logic in deployment script  
**Verification**: Deployment succeeds without P1002 errors

---

## When to Use Each Solution

| Scenario | Solution |
|----------|----------|
| **Stuck deployment right now** | Run SQL in Neon to clear lock |
| **Recurring lock timeouts** | Use retry script (migrate-deploy.js) |
| **Emergency bypass** | Temporarily skip migrations (dangerous!) |
| **Prevention** | Increase advisory lock timeout |

---

**Status**: SQL script ready to execute  
**Next Step**: Run SQL in Neon, then redeploy
