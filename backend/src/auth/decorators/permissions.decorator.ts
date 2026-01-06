import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * 
 * PERMISSION LOGIC: OR (any permission grants access)
 * - If user has ANY of the specified permissions, access is granted
 * - If user is a platform-admin, access is automatically granted
 * 
 * @param permissions - Array of permission strings in format "resource.action"
 * 
 * @example
 * // Single permission required
 * @RequirePermission('product.create')
 * 
 * @example
 * // Multiple permissions (OR logic - user needs ANY one)
 * @RequirePermission('payment.read_self', 'payment.read_any')
 * 
 * @example
 * // Common pattern: self or admin
 * @RequirePermission('refund.read_self', 'refund.read_any')
 */
export const RequirePermission = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Legacy alias for backward compatibility
 * @deprecated Use RequirePermission instead
 */
export const Permissions = RequirePermission;
