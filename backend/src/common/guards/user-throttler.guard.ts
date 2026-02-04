/**
 * User-Based Rate Limiting Guard
 * 
 * Extends Throttler to limit by userId instead of just IP
 * Prevents API abuse from authenticated users
 * FREE improvement - uses existing @nestjs/throttler package
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
    /**
     * Override to track rate limits per user instead of per IP
     * Falls back to IP for unauthenticated requests
     */
    protected async getTracker(req: Record<string, any>): Promise<string> {
        // If user is authenticated, track by userId
        if (req.user?.id) {
            return `user:${req.user.id}`;
        }

        // Fall back to IP for unauthenticated requests
        return req.ip || req.ips?.[0] || 'unknown';
    }

    /**
     * Custom error message to help users understand the limit
     */
    protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
        const request = context.switchToHttp().getRequest();
        const tracker = await this.getTracker(request);

        throw new ThrottlerException(
            `Rate limit exceeded. Please try again later. (Tracker: ${tracker.substring(0, 20)}...)`
        );
    }
}
