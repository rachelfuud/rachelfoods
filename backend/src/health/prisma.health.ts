import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma Health Indicator
 * Checks database connectivity for health endpoint
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
    constructor(private prisma: PrismaService) {
        super();
    }

    async pingCheck(key: string): Promise<HealthIndicatorResult> {
        try {
            // Simple query to check DB connection
            await this.prisma.$queryRaw`SELECT 1`;

            return this.getStatus(key, true, { message: 'Database connection successful' });
        } catch (error) {
            throw new HealthCheckError(
                'Database check failed',
                this.getStatus(key, false, { error: error.message }),
            );
        }
    }
}
