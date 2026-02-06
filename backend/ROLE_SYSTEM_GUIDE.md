# Role System - Best Practices & Prevention Guide

## ✅ DO's

### 1. Always Use Constants

```typescript
// ✅ CORRECT - Import and use constants
import { ROLE_SLUGS } from '../common/constants/roles.constants';

@Roles(ROLE_SLUGS.PLATFORM_ADMIN)
export class MyController {}
```

### 2. Never Hardcode Role Strings

```typescript
// ❌ WRONG - Hardcoded strings
@Roles('ADMIN', 'STAFF')

// ❌ WRONG - Even if it's "correct" value
@Roles('PLATFORM_ADMIN')

// ✅ CORRECT - Use constant
@Roles(ROLE_SLUGS.PLATFORM_ADMIN)
```

### 3. Database Seeds Must Match Constants

```typescript
// ✅ CORRECT - Import constants in seed scripts
import { ROLE_SLUGS } from '../common/constants/roles.constants';

await prisma.roles.create({
  data: {
    slug: ROLE_SLUGS.PLATFORM_ADMIN, // Type-safe!
    name: 'Platform Administrator',
  },
});
```

### 4. Type Your Role Parameters

```typescript
// ✅ CORRECT - Use RoleSlug type
import { RoleSlug } from '../common/constants/roles.constants';

function checkUserRole(userRole: RoleSlug) {
  // TypeScript will catch errors
}
```

## ❌ DON'Ts

### 1. Never Use Old Role Slugs

```typescript
// ❌ NEVER USE THESE:
'ADMIN'; // Deprecated - use ROLE_SLUGS.PLATFORM_ADMIN
'STAFF'; // Deprecated - use ROLE_SLUGS.PLATFORM_ADMIN
'platform-admin'; // Deprecated - use ROLE_SLUGS.PLATFORM_ADMIN (uppercase)
'admin'; // Deprecated
'staff'; // Deprecated
```

### 2. Never Add Roles to @Roles() Manually

```typescript
// ❌ WRONG - Adding new role directly
@Roles('PLATFORM_ADMIN', 'NEW_ROLE')

// ✅ CORRECT - Add to constants first, then use
// 1. Add to roles.constants.ts:
export const ROLE_SLUGS = {
    // ... existing roles
    NEW_ROLE: 'NEW_ROLE',
} as const;

// 2. Then use in decorator:
@Roles(ROLE_SLUGS.PLATFORM_ADMIN, ROLE_SLUGS.NEW_ROLE)
```

### 3. Never Mix and Match Case

```typescript
// ❌ WRONG - Inconsistent casing
database: slug = 'platform-admin'
controller: @Roles('PLATFORM_ADMIN')

// ✅ CORRECT - Always UPPERCASE with underscores
database: slug = 'PLATFORM_ADMIN'
controller: @Roles(ROLE_SLUGS.PLATFORM_ADMIN)
```

## 🔍 Code Review Checklist

Before committing, check:

- [ ] No hardcoded role strings in `@Roles()` decorators
- [ ] All role references use `ROLE_SLUGS.XXX` constant
- [ ] Seed scripts import and use `ROLE_SLUGS`
- [ ] Database role slugs match constants exactly (UPPERCASE)
- [ ] No instances of 'ADMIN', 'STAFF', 'admin', 'staff' in decorators
- [ ] Function parameters expecting roles use `RoleSlug` type

## 🛠️ Migration Steps (If You Find Old Roles)

### Step 1: Update Controllers

```bash
# Search for problematic patterns
grep -r "@Roles.*'ADMIN'" src/**/*.controller.ts

# Replace with constants (do manually for safety)
```

### Step 2: Update Database

```sql
-- Check current role slugs
SELECT slug, name FROM roles;

-- Update if needed
UPDATE roles SET slug = 'PLATFORM_ADMIN' WHERE slug = 'platform-admin';
UPDATE roles SET slug = 'PLATFORM_ADMIN' WHERE slug = 'ADMIN';
UPDATE roles SET slug = 'PLATFORM_ADMIN' WHERE slug = 'STAFF';
```

### Step 3: Update Seed Scripts

```typescript
// OLD
await prisma.roles.create({
    data: { slug: 'platform-admin', ... }
});

// NEW
import { ROLE_SLUGS } from '../common/constants/roles.constants';
await prisma.roles.create({
    data: { slug: ROLE_SLUGS.PLATFORM_ADMIN, ... }
});
```

## 📋 Testing After Changes

```bash
# 1. Search for any remaining hardcoded roles
grep -r "@Roles\(['\"]ADMIN" backend/src
grep -r "@Roles\(['\"]STAFF" backend/src

# 2. Check database consistency
npm run prisma:studio
# Navigate to Roles table, verify slug = 'PLATFORM_ADMIN'

# 3. Test authentication
# - Login as admin
# - Access admin-only endpoints
# - Should return 200, not 403
```

## 🚨 Common Issues & Fixes

### Issue: Getting 403 "Forbidden" on admin endpoints

**Cause**: Mismatch between database role slug and @Roles() decorator  
**Fix**:

1. Check database: `SELECT slug FROM roles;`
2. Check controller: Look for @Roles decorator
3. Ensure both use `ROLE_SLUGS.PLATFORM_ADMIN`

### Issue: TypeScript error "Type 'string' is not assignable to 'RoleSlug'"

**Cause**: Trying to use hardcoded string instead of constant  
**Fix**:

```typescript
// ❌ WRONG
const role = 'PLATFORM_ADMIN';

// ✅ CORRECT
const role = ROLE_SLUGS.PLATFORM_ADMIN;
```

### Issue: Cannot import ROLE_SLUGS

**Cause**: File structure issue  
**Fix**:

```typescript
// Adjust import path based on file location
import { ROLE_SLUGS } from '../common/constants/roles.constants';
// OR
import { ROLE_SLUGS } from '../../common/constants/roles.constants';
// OR
import { ROLE_SLUGS } from '@/common/constants/roles.constants';
```

## 📚 References

- Role constants file: `backend/src/common/constants/roles.constants.ts`
- Seed script: `backend/scripts/seed-admin.ts`
- Example usage: `backend/src/cms/cms.controller.ts`

## 🎯 Quick Reference

**Current Standard**: `ROLE_SLUGS.PLATFORM_ADMIN`  
**Database Value**: `'PLATFORM_ADMIN'`  
**Display Name**: `'Platform Administrator'`

**Deprecated Values to NEVER Use**:

- `'ADMIN'` ❌
- `'STAFF'` ❌
- `'platform-admin'` ❌
- `'admin'` ❌
- `'staff'` ❌

## 🔒 Prevention Mechanisms

1. **Type Safety**: Use `RoleSlug` type for all role parameters
2. **Constants File**: Single source of truth for all roles
3. **Seed Auto-Migration**: Seed script auto-migrates old slugs
4. **Code Review**: Check for hardcoded strings before merging
5. **This Document**: Reference guide for team members

---

**Last Updated**: February 6, 2026  
**Maintained By**: Platform Team
