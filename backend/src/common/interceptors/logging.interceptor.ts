import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Inject,
    LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body } = request;
        const requestId = uuidv4();

        // Attach requestId to request for downstream use
        request.requestId = requestId;

        const now = Date.now();

        // Sanitize sensitive data from body
        const sanitizedBody = this.sanitizeBody(body);

        this.logger.log(
            `Incoming request: ${method} ${url}`,
            {
                context: 'HTTP',
                requestId,
                method,
                url,
                body: sanitizedBody,
            },
        );

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const responseTime = Date.now() - now;
                    this.logger.log(
                        `Request completed: ${method} ${url} - ${responseTime}ms`,
                        {
                            context: 'HTTP',
                            requestId,
                            method,
                            url,
                            responseTime,
                            statusCode: context.switchToHttp().getResponse().statusCode,
                        },
                    );
                },
                error: (error) => {
                    const responseTime = Date.now() - now;
                    this.logger.error(
                        `Request failed: ${method} ${url} - ${responseTime}ms`,
                        error.stack,
                        {
                            context: 'HTTP',
                            requestId,
                            method,
                            url,
                            responseTime,
                            error: error.message,
                        },
                    );
                },
            }),
        );
    }

    private sanitizeBody(body: any): any {
        if (!body) return body;

        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
        const sanitized = { ...body };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        }

        return sanitized;
    }
}
