import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookDispatcher {
    private readonly logger = new Logger(WebhookDispatcher.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
    ) { }

    /**
     * Process webhook outbox every 30 seconds
     */
    @Cron('*/30 * * * * *') // Every 30 seconds
    async processOutbox(): Promise<void> {
        try {
            // Fetch pending/retry-ready webhooks (batch of 50)
            const pendingDeliveries = await this.prisma.webhook_deliveries.findMany({
                where: {
                    status: { in: ['PENDING', 'SENDING'] },
                    OR: [
                        { nextRetryAt: null }, // Never attempted
                        { nextRetryAt: { lte: new Date() } }, // Retry time reached
                    ],
                },
                include: { subscription: true },
                take: 50,
                orderBy: { createdAt: 'asc' }, // FIFO
            });

            if (pendingDeliveries.length === 0) {
                // No pending webhooks - skip verbose logging
                return;
            }

            this.logger.log({
                event: 'webhook_batch_fetched',
                count: pendingDeliveries.length,
            });

            // Process each delivery
            for (const delivery of pendingDeliveries) {
                await this.deliverWebhook(delivery);
            }
        } catch (error) {
            this.logger.error({
                event: 'webhook_dispatch_error',
                error: error.message,
                stack: error.stack,
            });
        }
    }

    /**
     * Deliver a single webhook
     */
    private async deliverWebhook(delivery: any): Promise<void> {
        const { id, subscription, payload, eventType, attemptCount, maxRetries } = delivery;

        // Skip if subscription is inactive
        if (!subscription.isActive) {
            await this.prisma.webhook_deliveries.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    errorMessage: 'Subscription inactive',
                },
            });
            this.logger.warn({
                event: 'webhook_cancelled',
                deliveryId: id,
                reason: 'subscription_inactive',
            });
            return;
        }

        // Check max retries
        if (attemptCount >= maxRetries) {
            await this.prisma.webhook_deliveries.update({
                where: { id },
                data: {
                    status: 'FAILED',
                    errorMessage: `Max retries (${maxRetries}) exceeded`,
                },
            });
            this.logger.error({
                event: 'webhook_delivery_failed_permanently',
                deliveryId: id,
                eventType,
                attemptCount,
            });
            return;
        }

        // Mark as SENDING
        await this.prisma.webhook_deliveries.update({
            where: { id },
            data: {
                status: 'SENDING',
                lastAttemptAt: new Date(),
            },
        });

        try {
            // Generate HMAC signature
            const signature = this.generateSignature(payload, subscription.secret);

            // Send HTTP POST
            const response = await firstValueFrom(
                this.httpService.post(subscription.url, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event-Type': eventType,
                        'X-Webhook-Delivery-ID': id,
                    },
                    timeout: 10000, // 10 second timeout
                }),
            );

            // Success (2xx response)
            await this.prisma.webhook_deliveries.update({
                where: { id },
                data: {
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                    attemptCount: { increment: 1 },
                    responseStatus: (response as any).status,
                    responseBody: JSON.stringify((response as any).data).substring(0, 1000),
                },
            });

            this.logger.log({
                event: 'webhook_delivered',
                deliveryId: id,
                eventType,
                attempt: attemptCount + 1,
                responseStatus: (response as any).status,
            });
        } catch (error) {
            // Determine if we should retry
            const shouldRetry = this.shouldRetry(error);
            const nextRetryAt = shouldRetry ? this.calculateNextRetry(attemptCount) : null;

            await this.prisma.webhook_deliveries.update({
                where: { id },
                data: {
                    status: shouldRetry ? 'PENDING' : 'FAILED',
                    attemptCount: { increment: 1 },
                    nextRetryAt,
                    errorMessage: error.message?.substring(0, 500) || 'Unknown error',
                    responseStatus: (error as any).response?.status,
                },
            });

            if (shouldRetry) {
                this.logger.warn({
                    event: 'webhook_delivery_failed_retrying',
                    deliveryId: id,
                    eventType,
                    attempt: attemptCount + 1,
                    error: error.message,
                    nextRetryAt,
                });
            } else {
                this.logger.error({
                    event: 'webhook_delivery_failed_permanent',
                    deliveryId: id,
                    eventType,
                    attempt: attemptCount + 1,
                    error: error.message,
                    responseStatus: error.response?.status,
                });
            }
        }
    }

    /**
     * Determine if error is retryable
     */
    private shouldRetry(error: any): boolean {
        const status = error.response?.status;

        // Network errors or timeouts are retryable
        if (!status) {
            return true;
        }

        // 408, 429, and 5xx are retryable
        if (status === 408 || status === 429 || status >= 500) {
            return true;
        }

        // 4xx (except 408 and 429) are permanent failures
        return false;
    }

    /**
     * Calculate next retry time with exponential backoff
     */
    private calculateNextRetry(attemptCount: number): Date {
        // Exponential backoff: 30s, 60s, 2min, 5min, 15min
        const delaySeconds = [30, 60, 120, 300, 900][attemptCount] || 900;
        return new Date(Date.now() + delaySeconds * 1000);
    }

    /**
     * Generate HMAC SHA256 signature
     */
    private generateSignature(payload: any, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return `sha256=${hmac.digest('hex')}`;
    }
}
