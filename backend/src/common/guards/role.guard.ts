import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * RoleGuard - Simple role-based access control
 * Checks if authenticated user has required role(s)
 * Uses OR logic: user needs ANY of the required roles
 */
@Injectable()
export class RoleGuard implements CanActivate {
    private readonly logger = new Logger(RoleGuard.name);

    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required roles from @Roles() decorator
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles required, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        // Get user from request (set by AuthGuard)
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.userId) {
            throw new ForbiddenException('User not authenticated');
        }

        // Fetch user roles from database
        const userRoles = await this.prisma.user_roles.findMany({
            where: { userId: user.userId },
            include: {
                roles: {
                    select: { name: true },
                },
            },
        });

        const userRoleNames = userRoles.map((ur) => ur.roles.name);

        // Check if user has any of the required roles (OR logic)
        const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));

        if (!hasRole) {
            this.logger.warn({
                event: 'role_guard_denied',
                userId: user.userId,
                requiredRoles,
                userRoles: userRoleNames,
            });

            throw new ForbiddenException(
                `Insufficient permissions. Required roles: ${requiredRoles.join(' or ')}`,
            );
        }

        this.logger.log({
            event: 'role_guard_allowed',
            userId: user.userId,
            matchedRole: userRoleNames.find((r) => requiredRoles.includes(r)),
        });

        return true;
    }
}
