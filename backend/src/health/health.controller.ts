import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaHealthIndicator } from './prisma.health';

/**
 * Health check endpoints for monitoring
 * 
 * Reference: SPRINT_8_TRACK_D_HARDENING.md - Connection Pooling
 * Enhanced with @nestjs/terminus for standardized health checks
 */
@Controller('api/health')
export class HealthController {
    constructor(
        private prisma: PrismaService,
        private health: HealthCheckService,
        private db: PrismaHealthIndicator,
    ) { }

    /**
     * Main health check endpoint (Terminus)
     * FREE: Railway/Render can use this for auto-restart
     */
    @Get()
    @HealthCheck()
    async check(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.db.pingCheck('database'),
        ]);
    }

    @Get('db')
    async checkDatabase() {
        const startTime = Date.now();

        try {
            await this.prisma.$queryRaw`SELECT 1`;
            const duration = Date.now() - startTime;

            return {
                status: 'healthy',
                latency: duration,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    @Get('pool')
    async checkPoolStats() {
        try {
            const pool = (this.prisma as any)._engine?.connectionPool;

            if (!pool) {
                return {
                    status: 'unknown',
                    message: 'Connection pool information not available',
                    timestamp: new Date().toISOString(),
                };
            }

            const totalCount = pool.totalCount || 0;
            const idleCount = pool.idleCount || 0;
            const waitingCount = pool.waitingCount || 0;
            const utilization = totalCount > 0
                ? ((totalCount - idleCount) / totalCount) * 100
                : 0;

            return {
                status: 'healthy',
                totalConnections: totalCount,
                idleConnections: idleCount,
                waitingRequests: waitingCount,
                utilization: Math.round(utilization * 100) / 100,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
}
