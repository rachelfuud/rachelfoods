import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PermissionCheckLog {
    userId: string;
    userEmail: string;
    resource: string;
    action: string;
    allowed: boolean;
    requestedPermissions: string[];
    userPermissions: string[];
    timestamp: Date;
    endpoint: string;
    method: string;
    isSuperAdmin?: boolean;
}

/**
 * User permissions cache entry
 */
interface UserPermissionsCache {
    permissions: string[];
    roles: string[];
    isSuperAdmin: boolean;
    timestamp: number;
}

/**
 * PermissionService
 * 
 * Core service for permission checking and enforcement.
 * 
 * FEATURES:
 * 1. OR Logic: User needs ANY of the required permissions (not ALL)
 * 2. Super-Admin Override: platform-admin role bypasses all checks
 * 3. Request-Scoped Caching: Permissions loaded once per request
 * 4. Performance Optimized: Minimal DB queries
 * 5. Clear Error Messages: Indicates which permissions are missing
 * 
 * SUPER-ADMIN ROLE:
 * Users with the 'platform-admin' role automatically pass all permission checks.
 * This is the only role-based check in the system; all other access control
 * is strictly permission-based.
 */
@Injectable()
export class PermissionService {
    private readonly logger = new Logger(PermissionService.name);

    // Request-scoped permission cache (cleared between requests via WeakMap or TTL)
    private readonly permissionCache = new Map<string, UserPermissionsCache>();
    private readonly CACHE_TTL_MS = 60000; // 1 minute cache (in-memory, request-scoped)

    // Super-admin role slug (the ONLY hardcoded role reference)
    private readonly SUPER_ADMIN_ROLE = 'platform-admin';

    constructor(private prisma: PrismaService) {
        // Clear cache periodically to prevent memory leaks
        setInterval(() => {
            const now = Date.now();
            for (const [userId, cache] of this.permissionCache.entries()) {
                if (now - cache.timestamp > this.CACHE_TTL_MS) {
                    this.permissionCache.delete(userId);
                }
            }
        }, this.CACHE_TTL_MS);
    }

    /**
     * Check if user has ANY of the required permissions (OR logic)
     * 
     * PERMISSION LOGIC:
     * - If user has ANY required permission → allowed = true
     * - If user is super-admin → allowed = true (bypass)
     * - Otherwise → allowed = false
     * 
     * @param userId User ID to check
     * @param requiredPermissions Array of permission slugs (resource.action format)
     * @returns Object with allowed flag and user's full permission list
     */
    async checkUserPermissions(
        userId: string,
        requiredPermissions: string[],
    ): Promise<{
        allowed: boolean;
        userPermissions: string[];
        isSuperAdmin: boolean;
        missingPermissions: string[];
    }> {
        // Load user permissions (with caching)
        const userPerms = await this.getUserPermissions(userId);

        // Super-admin override: platform-admin bypasses all checks
        if (userPerms.isSuperAdmin) {
            this.logger.debug(
                `Super-admin override: User ${userId} has platform-admin role`
            );
            return {
                allowed: true,
                userPermissions: userPerms.permissions,
                isSuperAdmin: true,
                missingPermissions: [],
            };
        }

        // OR Logic: Check if user has ANY of the required permissions
        const hasAnyPermission = requiredPermissions.some((required) =>
            userPerms.permissions.includes(required)
        );

        // Calculate missing permissions for error messages
        const missingPermissions = hasAnyPermission
            ? []
            : requiredPermissions.filter(
                (p) => !userPerms.permissions.includes(p)
            );

        return {
            allowed: hasAnyPermission,
            userPermissions: userPerms.permissions,
            isSuperAdmin: false,
            missingPermissions,
        };
    }

    /**
     * Load user permissions with caching
     * 
     * PERFORMANCE OPTIMIZATION:
     * - Checks in-memory cache first (1-minute TTL)
     * - Only queries database if cache miss
     * - Single query loads all roles + permissions
     * 
     * @param userId User ID
     * @returns User permissions, roles, and super-admin status
     */
    private async getUserPermissions(
        userId: string
    ): Promise<UserPermissionsCache> {
        // Check cache first
        const cached = this.permissionCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            this.logger.debug(`Cache hit for user ${userId}`);
            return cached;
        }

        this.logger.debug(`Cache miss for user ${userId}, loading from DB`);

        // Load user with roles and permissions in single query
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: {
                user_roles: {
                    include: {
                        roles: {
                            include: {
                                role_permissions: {
                                    include: {
                                        permissions: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            // User not found - return empty permissions
            const emptyCache: UserPermissionsCache = {
                permissions: [],
                roles: [],
                isSuperAdmin: false,
                timestamp: Date.now(),
            };
            this.permissionCache.set(userId, emptyCache);
            return emptyCache;
        }

        // Extract all permissions and roles from active user roles
        const permissions: string[] = [];
        const roles: string[] = [];
        let isSuperAdmin = false;

        for (const userRole of user.user_roles) {
            const role = userRole.roles;

            // Skip inactive roles
            if (!role.isActive) {
                continue;
            }

            // Track role slugs
            roles.push(role.slug);

            // Check if user is super-admin
            if (role.slug === this.SUPER_ADMIN_ROLE) {
                isSuperAdmin = true;
            }

            // Extract permissions from this role
            for (const rolePermission of role.role_permissions) {
                const permission = rolePermission.permissions;
                const permissionKey = `${permission.resource}.${permission.action}`;

                // Avoid duplicates
                if (!permissions.includes(permissionKey)) {
                    permissions.push(permissionKey);
                }
            }
        }

        // Cache result
        const cache: UserPermissionsCache = {
            permissions,
            roles,
            isSuperAdmin,
            timestamp: Date.now(),
        };

        this.permissionCache.set(userId, cache);

        this.logger.debug(
            `Loaded ${permissions.length} permissions for user ${userId} (roles: ${roles.join(', ')})`
        );

        return cache;
    }

    /**
     * Clear cached permissions for a user
     * 
     * Call this when user roles/permissions change to force reload.
     * 
     * @param userId User ID
     */
    clearUserPermissionCache(userId: string): void {
        this.permissionCache.delete(userId);
        this.logger.debug(`Cleared permission cache for user ${userId}`);
    }

    /**
     * Clear all cached permissions
     * 
     * Useful for testing or when permissions are bulk-updated.
     */
    clearAllPermissionCache(): void {
        this.permissionCache.clear();
        this.logger.debug('Cleared all permission cache');
    }

    /**
     * Log permission check for audit trail
     * 
     * In production, this should write to a dedicated audit log table.
     * For now, logs to console with structured format.
     * 
     * @param log Permission check log entry
     */
    async logPermissionCheck(log: PermissionCheckLog): Promise<void> {
        const logEntry = {
            timestamp: log.timestamp.toISOString(),
            user: `${log.userEmail} (${log.userId})`,
            endpoint: `${log.method} ${log.endpoint}`,
            requiredPermissions: log.requestedPermissions.join(', '),
            userHasPermissions: log.userPermissions.join(', '),
            result: log.allowed ? 'ALLOWED' : 'DENIED',
            isSuperAdmin: log.isSuperAdmin || false,
        };

        if (log.allowed) {
            this.logger.log(
                `[PERMISSION CHECK - ALLOWED] ${JSON.stringify(logEntry)}`
            );
        } else {
            this.logger.warn(
                `[PERMISSION CHECK - DENIED] ${JSON.stringify(logEntry)}`
            );
        }

        // TODO: In production, insert into audit_logs table:
        // await this.prisma.auditLog.create({
        //   data: {
        //     userId: log.userId,
        //     action: 'PERMISSION_CHECK',
        //     resource: log.resource,
        //     details: JSON.stringify(logEntry),
        //     allowed: log.allowed,
        //   },
        // });
    }

    /**
     * Parse permission string into resource and action
     * 
     * @param permission Permission string (e.g., "payment.create")
     * @returns Object with resource and action
     */
    parsePermission(permission: string): { resource: string; action: string } {
        const [resource, action] = permission.split('.');
        return { resource: resource || 'unknown', action: action || 'unknown' };
    }

    /**
     * Check if a user is a super-admin (for debugging/testing)
     * 
     * @param userId User ID
     * @returns True if user has platform-admin role
     */
    async isSuperAdmin(userId: string): Promise<boolean> {
        const perms = await this.getUserPermissions(userId);
        return perms.isSuperAdmin;
    }

    /**
     * Get all permissions for a user (for debugging/testing)
     * 
     * @param userId User ID
     * @returns Array of permission slugs
     */
    async getAllUserPermissions(userId: string): Promise<string[]> {
        const perms = await this.getUserPermissions(userId);
        return perms.permissions;
    }
}
