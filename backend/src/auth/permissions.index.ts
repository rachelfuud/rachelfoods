/**
 * Permission Enforcement Infrastructure
 * 
 * Central export point for all permission-related utilities.
 * 
 * USAGE:
 * ```typescript
 * import {
 *   RequirePermission,
 *   PermissionsGuard,
 *   PaymentPermissions,
 *   RefundPermissions,
 * } from './auth/permissions';
 * ```
 */

// Decorators
export { RequirePermission, Permissions, PERMISSIONS_KEY } from './decorators/permissions.decorator';
export { CurrentUser } from './decorators/current-user.decorator';

// Guards
export { PermissionsGuard } from './permissions.guard';

// Services
export { PermissionService } from './permission.service';

// Constants
export {
    PaymentPermissions,
    RefundPermissions,
    LedgerPermissions,
    WalletPermissions,
    PaymentsPermissions,
    SUPER_ADMIN_ROLE,
    PermissionPatterns,
    isValidPermissionFormat,
    parsePermission,
    buildPermissionSlug,
} from './permissions.constants';

// Types
export type {
    PaymentPermission,
    RefundPermission,
    LedgerPermission,
    WalletPermission,
    PaymentsPermission,
} from './permissions.constants';
