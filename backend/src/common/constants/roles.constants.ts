/**
 * Role Constants - Single Source of Truth for Role Slugs
 * 
 * ⚠️ IMPORTANT: Always use these constants instead of hardcoding role strings
 * 
 * Database role slugs MUST match these exact values.
 * If database has different slugs, they must be migrated.
 */

export const ROLE_SLUGS = {
    /**
     * Platform Administrator - Full system access
     * Used in @Roles() decorators for admin-only endpoints
     */
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',

    /**
     * Buyer Role - Customer access
     * Used for customer-facing functionality
     */
    BUYER: 'BUYER',

    /**
     * Store Owner - Vendor access
     * Used for vendor dashboard and product management
     */
    STORE_OWNER: 'STORE_OWNER',

    /**
     * Delivery Agent - Courier access
     * Used for delivery management
     */
    DELIVERY_AGENT: 'DELIVERY_AGENT',
} as const;

/**
 * Type-safe role slug type
 * Use this for function parameters and return types
 */
export type RoleSlug = typeof ROLE_SLUGS[keyof typeof ROLE_SLUGS];

/**
 * Validate if a string is a valid role slug
 * 
 * @param slug - The slug to validate
 * @returns true if valid role slug
 */
export function isValidRoleSlug(slug: string): slug is RoleSlug {
    return Object.values(ROLE_SLUGS).includes(slug as RoleSlug);
}

/**
 * Get all valid role slugs as array
 * Useful for database queries and validation
 */
export function getAllRoleSlugs(): RoleSlug[] {
    return Object.values(ROLE_SLUGS);
}

/**
 * DEPRECATED ROLE SLUGS
 * These were used in older versions and should NOT be used anymore
 * 
 * If you find these in code, replace with ROLE_SLUGS.PLATFORM_ADMIN
 */
export const DEPRECATED_ROLE_SLUGS = {
    ADMIN: 'ADMIN', // ❌ Use ROLE_SLUGS.PLATFORM_ADMIN instead
    STAFF: 'STAFF', // ❌ Use ROLE_SLUGS.PLATFORM_ADMIN instead
    'platform-admin': 'platform-admin', // ❌ Use ROLE_SLUGS.PLATFORM_ADMIN (uppercase)
} as const;

/**
 * Human-readable role names for UI display
 */
export const ROLE_DISPLAY_NAMES: Record<RoleSlug, string> = {
    [ROLE_SLUGS.PLATFORM_ADMIN]: 'Platform Administrator',
    [ROLE_SLUGS.BUYER]: 'Customer',
    [ROLE_SLUGS.STORE_OWNER]: 'Store Owner',
    [ROLE_SLUGS.DELIVERY_AGENT]: 'Delivery Agent',
};

/**
 * Role descriptions for documentation
 */
export const ROLE_DESCRIPTIONS: Record<RoleSlug, string> = {
    [ROLE_SLUGS.PLATFORM_ADMIN]: 'Full system access including admin dashboard, user management, and system configuration',
    [ROLE_SLUGS.BUYER]: 'Customer access to browse products, place orders, and manage account',
    [ROLE_SLUGS.STORE_OWNER]: 'Vendor access to manage products, inventory, and orders',
    [ROLE_SLUGS.DELIVERY_AGENT]: 'Courier access to view assigned deliveries and update delivery status',
};
