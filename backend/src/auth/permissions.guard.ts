import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';
import { PermissionService } from './permission.service';

/**
 * PermissionsGuard
 * 
 * Production-grade permission enforcement guard.
 * 
 * FEATURES:
 * 1. OR Logic: User needs ANY of the required permissions (not ALL)
 * 2. Super-Admin Override: platform-admin bypasses all permission checks
 * 3. Request-Scoped Caching: Permissions loaded once per request
 * 4. Clear Error Messages: Shows which permissions are missing
 * 5. Audit Logging: Logs all permission checks for security audit
 * 
 * USAGE:
 * ```typescript
 * @Controller('payments')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * export class PaymentController {
 *   @Post()
 *   @RequirePermission('payment.create')
 *   async createPayment() { ... }
 * 
 *   @Get(':id')
 *   @RequirePermission('payment.read_self', 'payment.read_any')
 *   async getPayment() { ... }
 * }
 * ```
 * 
 * PERMISSION LOGIC:
 * - If no permissions specified on route → allow access
 * - If user is not authenticated → throw UnauthorizedException
 * - If user is super-admin (platform-admin) → allow access
 * - If user has ANY required permission → allow access
 * - Otherwise → throw ForbiddenException with missing permissions
 * 
 * NOTES:
 * - Must be used AFTER JwtAuthGuard (requires authenticated user)
 * - Guards are applied in the order specified in @UseGuards()
 * - The only role-based check is for 'platform-admin' (super-admin override)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);

    constructor(
        private reflector: Reflector,
        private permissionService: PermissionService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required permissions from route metadata
        // Checks both method-level and class-level decorators
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no permissions are required, allow access
        // This allows public routes or routes that only need authentication
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // User must be authenticated (JWT guard should run first)
        if (!user) {
            this.logger.warn(
                `Permission check failed: No authenticated user (endpoint: ${request.method} ${request.url})`
            );
            throw new UnauthorizedException(
                'Authentication required to access this resource',
            );
        }

        // Check if user has required permissions (with OR logic and super-admin override)
        const {
            allowed,
            userPermissions,
            isSuperAdmin,
            missingPermissions,
        } = await this.permissionService.checkUserPermissions(
            user.id,
            requiredPermissions,
        );

        // Extract resource and action from first permission for logging
        const firstPermission =
            this.permissionService.parsePermission(requiredPermissions[0]);

        // Log permission check for audit trail
        await this.permissionService.logPermissionCheck({
            userId: user.id,
            userEmail: user.email,
            resource: firstPermission.resource,
            action: firstPermission.action,
            allowed,
            requestedPermissions: requiredPermissions,
            userPermissions,
            timestamp: new Date(),
            endpoint: request.url,
            method: request.method,
            isSuperAdmin,
        });

        // Deny access if user lacks permission
        if (!allowed) {
            // Build clear error message
            let errorMessage: string;

            if (missingPermissions.length === 1) {
                errorMessage = `Missing permission: ${missingPermissions[0]}`;
            } else if (missingPermissions.length === requiredPermissions.length) {
                // User has NONE of the required permissions
                errorMessage = `Missing permissions. Required ANY of: [${requiredPermissions.join(', ')}]`;
            } else {
                // User has some but not all (shouldn't happen with OR logic)
                errorMessage = `Missing permissions: [${missingPermissions.join(', ')}]`;
            }

            this.logger.warn(
                `Permission denied for user ${user.email} (${user.id}): ${errorMessage}`
            );

            throw new ForbiddenException(errorMessage);
        }

        // Access granted
        if (isSuperAdmin) {
            this.logger.debug(
                `Access granted (super-admin override): ${user.email} → ${request.method} ${request.url}`
            );
        } else {
            this.logger.debug(
                `Access granted (permission matched): ${user.email} → ${request.method} ${request.url}`
            );
        }

        return true;
    }
}
