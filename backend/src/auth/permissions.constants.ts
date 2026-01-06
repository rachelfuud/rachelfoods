/**
 * Permission Constants and Type-Safe Utilities
 * 
 * This file provides type-safe permission slug constants to prevent typos
 * and make permission usage more maintainable.
 * 
 * USAGE:
 * ```typescript
 * import { PaymentPermissions } from './auth/permissions.constants';
 * 
 * @RequirePermission(PaymentPermissions.CREATE)
 * async createPayment() { ... }
 * 
 * @RequirePermission(PaymentPermissions.READ_SELF, PaymentPermissions.READ_ANY)
 * async getPayment() { ... }
 * ```
 */

/**
 * Payment Permissions
 */
export const PaymentPermissions = {
    CREATE: 'payment.create',
    READ_SELF: 'payment.read_self',
    READ_ANY: 'payment.read_any',
    CAPTURE: 'payment.capture',
    CANCEL: 'payment.cancel',
} as const;

/**
 * Refund Permissions
 */
export const RefundPermissions = {
    CREATE: 'refund.create',
    READ_SELF: 'refund.read_self',
    READ_ANY: 'refund.read_any',
    APPROVE: 'refund.approve',
    REJECT: 'refund.reject',
    PROCESS: 'refund.process',
} as const;

/**
 * Ledger Permissions (read-only)
 */
export const LedgerPermissions = {
    READ_SELF: 'ledger.read_self',
    READ_ANY: 'ledger.read_any',
} as const;

/**
 * Wallet Permissions (read-only)
 */
export const WalletPermissions = {
    READ_SELF: 'wallet.read_self',
    READ_ANY: 'wallet.read_any',
} as const;

/**
 * All Payments & Refunds permissions combined
 */
export const PaymentsPermissions = {
    ...PaymentPermissions,
    ...RefundPermissions,
    ...LedgerPermissions,
    ...WalletPermissions,
} as const;

/**
 * Type for all payment permission values
 */
export type PaymentPermission = typeof PaymentPermissions[keyof typeof PaymentPermissions];

/**
 * Type for all refund permission values
 */
export type RefundPermission = typeof RefundPermissions[keyof typeof RefundPermissions];

/**
 * Type for all ledger permission values
 */
export type LedgerPermission = typeof LedgerPermissions[keyof typeof LedgerPermissions];

/**
 * Type for all wallet permission values
 */
export type WalletPermission = typeof WalletPermissions[keyof typeof WalletPermissions];

/**
 * Type for all payments & refunds permission values
 */
export type PaymentsPermission =
    | PaymentPermission
    | RefundPermission
    | LedgerPermission
    | WalletPermission;

/**
 * Helper to validate permission format
 * 
 * @param permission Permission string to validate
 * @returns True if format is valid (resource.action)
 */
export function isValidPermissionFormat(permission: string): boolean {
    return /^[a-z_]+\.[a-z_]+$/.test(permission);
}

/**
 * Helper to parse permission into resource and action
 * 
 * @param permission Permission string (e.g., "payment.create")
 * @returns Object with resource and action
 */
export function parsePermission(permission: string): {
    resource: string;
    action: string;
} {
    const [resource, action] = permission.split('.');
    return { resource: resource || 'unknown', action: action || 'unknown' };
}

/**
 * Helper to build permission slug from resource and action
 * 
 * @param resource Resource name (e.g., "payment")
 * @param action Action name (e.g., "create")
 * @returns Permission slug (e.g., "payment.create")
 */
export function buildPermissionSlug(resource: string, action: string): string {
    return `${resource}.${action}`;
}

/**
 * Super-Admin Role Slug
 * 
 * This is the ONLY role-based check in the permission system.
 * Users with this role bypass all permission checks.
 */
export const SUPER_ADMIN_ROLE = 'platform-admin';

/**
 * Common permission patterns for reuse
 */
export const PermissionPatterns = {
    /**
     * Pattern for "self or admin" access
     * User can access their own data OR admin can access any data
     */
    SELF_OR_ADMIN: (resource: string) => [
        `${resource}.read_self`,
        `${resource}.read_any`,
    ],

    /**
     * Pattern for admin-only access
     */
    ADMIN_ONLY: (resource: string) => [`${resource}.read_any`],

    /**
     * Pattern for create permission
     */
    CREATE: (resource: string) => [`${resource}.create`],

    /**
     * Pattern for read-write permissions
     */
    READ_WRITE: (resource: string) => [
        `${resource}.read_self`,
        `${resource}.create`,
        `${resource}.update`,
    ],
};
