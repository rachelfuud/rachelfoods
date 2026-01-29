import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global exception filter for standardized error responses
 * 
 * Reference: SPRINT_8_TRACK_D_HARDENING.md - Structured Error Handling
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('GlobalExceptionFilter');

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'InternalServerErrorException';
        let details: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                // Handle class-validator validation errors
                if (Array.isArray((exceptionResponse as any).message)) {
                    const validationErrors = (exceptionResponse as any).message;
                    // Take the first validation error message instead of showing all
                    message = validationErrors[0] || message;
                    details = { validationErrors };
                } else {
                    message = (exceptionResponse as any).message || message;
                    details = (exceptionResponse as any).details;
                }
            }

            error = exception.constructor.name;
        } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            status = HttpStatus.BAD_REQUEST;
            message = this.parsePrismaError(exception);
            error = 'DatabaseException';
            details = { code: exception.code };
        } else if (exception instanceof Error) {
            message = exception.message;
            error = exception.constructor.name;
        }

        this.logger.error({
            event: 'http_exception',
            statusCode: status,
            error,
            message,
            path: request.url,
            method: request.method,
            userId: (request as any).user?.id,
            stack: exception instanceof Error ? exception.stack : undefined,
        });

        response.status(status).json({
            statusCode: status,
            error,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            details,
        });
    }

    private parsePrismaError(
        error: Prisma.PrismaClientKnownRequestError,
    ): string {
        switch (error.code) {
            case 'P2002':
                return 'Unique constraint violation';
            case 'P2003':
                return 'Foreign key constraint violation';
            case 'P2025':
                return 'Record not found';
            default:
                return 'Database error';
        }
    }
}
