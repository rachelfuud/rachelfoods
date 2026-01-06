import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

/**
 * AuthGuard - JWT authentication guard
 * Wraps NestJS Passport JWT strategy
 * Verifies JWT token and attaches user to request
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') implements CanActivate {
    canActivate(context: ExecutionContext) {
        // Call parent JWT strategy validation
        return super.canActivate(context) as Promise<boolean>;
    }
}
