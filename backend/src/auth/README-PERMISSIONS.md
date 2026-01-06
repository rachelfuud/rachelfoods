# Permission Enforcement Infrastructure

Production-grade permission system for RachelFoods backend.

## Overview

This permission system provides:

- ✅ **OR Logic**: User needs ANY of the specified permissions (not ALL)
- ✅ **Super-Admin Override**: `platform-admin` role bypasses all checks
- ✅ **Request-Scoped Caching**: Permissions loaded once per request (1-minute TTL)
- ✅ **Type Safety**: Type-safe permission constants prevent typos
- ✅ **Clear Error Messages**: "Missing permission: refund.approve"
- ✅ **Audit Logging**: All permission checks logged for security audit
- ✅ **Performance Optimized**: Minimal database queries

## Components

### 1. Decorator: `@RequirePermission()`

Specifies required permissions for a controller method.

**Signature:**

```typescript
@RequirePermission(...permissions: string[])
```

**Logic:**

- User needs **ANY** of the specified permissions (OR logic)
- Super-admin bypasses all checks
- Multiple permissions = "user needs this OR that"

**Examples:**

```typescript
import { RequirePermission } from './auth/permissions';

// Single permission
@RequirePermission('payment.create')
async createPayment() { ... }

// Multiple permissions (OR logic)
@RequirePermission('payment.read_self', 'payment.read_any')
async getPayment() { ... }

// Common pattern: self or admin
@RequirePermission('refund.read_self', 'refund.read_any')
async getRefund() { ... }
```

### 2. Guard: `PermissionsGuard`

NestJS guard that enforces permission requirements.

**Usage:**

```typescript
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentController {
  // Routes here are protected by both guards
}
```

**Important:**

- Must be used **AFTER** `JwtAuthGuard` (requires authenticated user)
- Guards are applied in the order specified in `@UseGuards()`

**Behavior:**

1. Reads required permissions from `@RequirePermission()` metadata
2. Extracts authenticated user from request
3. Loads user's permissions (with caching)
4. Checks super-admin status
5. Checks if user has ANY required permission
6. Grants or denies access with clear error message

### 3. Service: `PermissionService`

Core service for permission checking.

**Key Methods:**

```typescript
// Check if user has ANY required permissions
async checkUserPermissions(
  userId: string,
  requiredPermissions: string[]
): Promise<{
  allowed: boolean;
  userPermissions: string[];
  isSuperAdmin: boolean;
  missingPermissions: string[];
}>

// Clear cached permissions (call when roles change)
clearUserPermissionCache(userId: string): void

// Check if user is super-admin
async isSuperAdmin(userId: string): Promise<boolean>

// Get all user permissions
async getAllUserPermissions(userId: string): Promise<string[]>
```

**Caching:**

- Permissions cached in-memory for 1 minute
- Automatic cache cleanup
- Manual cache clearing when roles/permissions change

### 4. Constants: Type-Safe Permission Slugs

Use type-safe constants to prevent typos.

```typescript
import {
  PaymentPermissions,
  RefundPermissions,
  LedgerPermissions,
  WalletPermissions,
} from './auth/permissions';

// Instead of string literals
@RequirePermission('payment.create') // ❌ Typo-prone

// Use constants
@RequirePermission(PaymentPermissions.CREATE) // ✅ Type-safe
```

**Available Constants:**

```typescript
PaymentPermissions = {
  CREATE: 'payment.create',
  READ_SELF: 'payment.read_self',
  READ_ANY: 'payment.read_any',
  CAPTURE: 'payment.capture',
  CANCEL: 'payment.cancel',
};

RefundPermissions = {
  CREATE: 'refund.create',
  READ_SELF: 'refund.read_self',
  READ_ANY: 'refund.read_any',
  APPROVE: 'refund.approve',
  REJECT: 'refund.reject',
  PROCESS: 'refund.process',
};

LedgerPermissions = {
  READ_SELF: 'ledger.read_self',
  READ_ANY: 'ledger.read_any',
};

WalletPermissions = {
  READ_SELF: 'wallet.read_self',
  READ_ANY: 'wallet.read_any',
};
```

## Permission Logic

### OR Logic (Any Permission)

User needs **ANY** of the specified permissions:

```typescript
// User needs payment.read_self OR payment.read_any
@RequirePermission('payment.read_self', 'payment.read_any')
async getPayment(@Param('id') id: string) {
  // Buyer can access their own payment (payment.read_self)
  // Admin can access any payment (payment.read_any)
}
```

### Super-Admin Override

Users with `platform-admin` role **automatically pass all permission checks**:

```typescript
// platform-admin bypasses this check
@RequirePermission('refund.approve')
async approveRefund() {
  // Only admins should reach here, but platform-admin bypasses the check
}
```

This is the **ONLY** role-based check in the system. All other access control is strictly permission-based.

### No Permissions = Public (Auth Only)

If no `@RequirePermission()` decorator, route only requires authentication:

```typescript
@Get('health')
async healthCheck() {
  // No permission required, but JwtAuthGuard still enforces authentication
}
```

## Complete Example

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermission,
  PaymentPermissions,
  RefundPermissions,
  CurrentUser,
} from '../auth/permissions';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // Only buyers can create payments
  @Post()
  @RequirePermission(PaymentPermissions.CREATE)
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto);
  }

  // Users can view their own payments, admins can view any
  @Get(':id')
  @RequirePermission(PaymentPermissions.READ_SELF, PaymentPermissions.READ_ANY)
  async getPayment(@Param('id') id: string, @CurrentUser() user: any) {
    // Controller must implement authorization logic:
    // - If user has payment.read_self, verify payment belongs to user
    // - If user has payment.read_any, allow access to any payment
    return this.paymentService.getPayment(id, user);
  }

  // Only delivery agents can capture COD payments
  @Post(':id/capture')
  @RequirePermission(PaymentPermissions.CAPTURE)
  async capturePayment(@Param('id') id: string) {
    return this.paymentService.capturePayment(id);
  }

  // Only admins can approve refunds
  @Post('refunds/:id/approve')
  @RequirePermission(RefundPermissions.APPROVE)
  async approveRefund(@Param('id') id: string) {
    return this.refundService.approveRefund(id);
  }
}
```

## Error Messages

### Missing Permission

```
ForbiddenException: Missing permission: refund.approve
```

### Missing Multiple Permissions

```
ForbiddenException: Missing permissions. Required ANY of: [payment.read_self, payment.read_any]
```

### Not Authenticated

```
UnauthorizedException: Authentication required to access this resource
```

## Performance

### Caching Strategy

- **In-Memory Cache**: Permissions stored in-memory for 1 minute
- **Single Query**: One database query loads all roles + permissions
- **Request-Scoped**: Cache cleared automatically after TTL
- **Manual Clearing**: Clear cache when roles/permissions change

### Cache Usage

```typescript
// Clear cache when user roles change
this.permissionService.clearUserPermissionCache(userId);

// Clear all cache (e.g., when permissions are bulk-updated)
this.permissionService.clearAllPermissionCache();
```

### Database Queries

**Without Caching:**

- 1 query per request to load user + roles + permissions

**With Caching:**

- 0 queries for cached users (1-minute TTL)
- First request in window: 1 query
- Subsequent requests: 0 queries (cache hit)

## Audit Logging

All permission checks are logged for security audit:

```json
{
  "timestamp": "2026-01-01T18:45:00.000Z",
  "user": "buyer@example.com (uuid)",
  "endpoint": "POST /api/refunds",
  "requiredPermissions": "refund.create",
  "userHasPermissions": "refund.create, refund.read_self, ...",
  "result": "ALLOWED",
  "isSuperAdmin": false
}
```

## Testing

### Check User Permissions

```typescript
const perms = await permissionService.getAllUserPermissions(userId);
console.log('User permissions:', perms);
// ['payment.create', 'payment.read_self', 'refund.create', ...]
```

### Check Super-Admin Status

```typescript
const isSuperAdmin = await permissionService.isSuperAdmin(userId);
console.log('Is super-admin:', isSuperAdmin);
// true or false
```

## Common Patterns

### Self or Admin Access

```typescript
// Pattern: Users can access their own data OR admins can access any data
@RequirePermission('payment.read_self', 'payment.read_any')
async getPayment(@Param('id') id: string, @CurrentUser() user: any) {
  // In controller, implement authorization logic:
  const payment = await this.paymentService.findOne(id);

  // If user only has 'read_self', verify ownership
  if (!user.permissions.includes('payment.read_any')) {
    if (payment.userId !== user.id) {
      throw new ForbiddenException('Cannot access other users\' payments');
    }
  }

  return payment;
}
```

### Admin-Only Operations

```typescript
// Only admins (with specific permission or super-admin status)
@RequirePermission('refund.approve')
async approveRefund(@Param('id') id: string) {
  // Only users with refund.approve permission reach here
  return this.refundService.approveRefund(id);
}
```

### Multiple Permission Levels

```typescript
// Different actions require different permissions
@Post('refunds/:id/approve')
@RequirePermission('refund.approve')
async approveRefund() { ... }

@Post('refunds/:id/process')
@RequirePermission('refund.process')
async processRefund() { ... }

@Post('refunds/:id/reject')
@RequirePermission('refund.reject')
async rejectRefund() { ... }
```

## Architecture

```
Request Flow:
1. Client → Controller
2. JwtAuthGuard → Authenticate user (JWT validation)
3. PermissionsGuard → Check permissions
   a. Load user permissions (cached)
   b. Check super-admin status
   c. Check OR logic (any permission matches)
   d. Grant or deny access
4. Controller → Service → Database
```

## Best Practices

1. **Always use constants** instead of string literals
2. **Apply JwtAuthGuard first**, then PermissionsGuard
3. **Use OR logic** for "self or admin" patterns
4. **Clear cache** when roles/permissions change
5. **Implement authorization logic** in controllers for "read_self" permissions
6. **Don't hardcode role names** except for super-admin check

## Files

- `permissions.decorator.ts` - @RequirePermission decorator
- `permissions.guard.ts` - PermissionsGuard implementation
- `permission.service.ts` - Core permission checking logic
- `permissions.constants.ts` - Type-safe permission constants
- `permissions.index.ts` - Central export point
- `README-PERMISSIONS.md` - This documentation

## Future Enhancements

- Database-backed audit log table
- Redis caching for distributed systems
- Permission inheritance/hierarchies
- Dynamic permission loading
- WebSocket/real-time permission updates
