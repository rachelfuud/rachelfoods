-- Clear Prisma migration advisory lock
-- Run this in Neon SQL Editor if migrations are stuck

-- Check for active locks
SELECT locktype, database, pid, mode, granted 
FROM pg_locks 
WHERE locktype = 'advisory';

-- Release the specific Prisma migration lock
-- Lock ID 72707369 is used by Prisma for migrations
SELECT pg_advisory_unlock_all();

-- Alternative: Release specific lock
-- SELECT pg_advisory_unlock(72707369);

-- Verify locks are cleared
SELECT locktype, database, pid, mode, granted 
FROM pg_locks 
WHERE locktype = 'advisory';
