/**
 * Request Correlation ID Middleware
 * 
 * Adds unique request ID to every HTTP request for distributed tracing
 * Makes debugging production issues much easier
 * FREE improvement - no external dependencies
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Use existing correlation ID from header or generate new one
        const correlationId =
            req.headers['x-correlation-id'] as string ||
            req.headers['x-request-id'] as string ||
            randomUUID();

        // Attach to request object for use in logging
        (req as any).correlationId = correlationId;

        // Return in response header for client tracking
        res.setHeader('X-Correlation-ID', correlationId);

        next();
    }
}

/**
 * Usage in logger:
 * 
 * logger.log({
 *   message: 'Order created',
 *   correlationId: req.correlationId,
 *   orderId: order.id,
 * });
 * 
 * Then grep logs by correlation ID to trace entire request:
 * grep "abc-123-def" logs/*.log
 */
