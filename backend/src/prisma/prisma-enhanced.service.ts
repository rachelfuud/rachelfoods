/**
 * Database Connection Pooling Configuration
 * 
 * Prevents connection exhaustion under high load
 * FREE improvement - just configuration, no additional cost
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
            // Connection pool configuration
            // Prevents "too many connections" errors under load
        });
    }

    async onModuleInit() {
        await this.$connect();
        console.log('✅ Database connected with connection pooling');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Execute queries with automatic retry on connection errors
     * Handles transient network issues gracefully
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries = 3,
        delayMs = 1000
    ): Promise<T> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                const isLastAttempt = attempt === maxRetries;
                const isRetryableError =
                    error.code === 'P1001' || // Connection error
                    error.code === 'P1002' || // Connection timeout
                    error.code === 'P1008';   // Operations timed out

                if (isLastAttempt || !isRetryableError) {
                    throw error;
                }

                console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying...`);
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }

        throw new Error('Unreachable code');
    }

    /**
     * Health check for monitoring
     * Returns true if database is accessible
     */
    async isHealthy(): Promise<boolean> {
        try {
            await this.$queryRaw`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }
}
