import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { WebhookEventPayload } from './dto/webhook.dto';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Listen for all events and enqueue webhooks for subscribers
     */
    @OnEvent('**', { async: true })
    async handleEvent(event: string): Promise<void> {
        const eventParts = event.split('.');
        if (eventParts.length < 2) {
            return; // Not a valid event type
        }

        const eventType = event;

        // Extract event data from the event emitter payload
        // Note: The actual event data will be passed as additional arguments
        // This is handled by the @OnEvent decorator
    }

    /**
     * Handle specific event types with explicit event data
     */
    async enqueueWebhook(eventType: string, eventData: any): Promise<void> {
        try {
            // Find active subscriptions for this event type
            const subscriptions = await this.prisma.webhook_subscriptions.findMany({
                where: {
                    isActive: true,
                    eventTypes: { has: eventType },
                },
            });

            if (subscriptions.length === 0) {
                this.logger.debug({
                    event: 'no_webhook_subscribers',
                    eventType,
                });
                return;
            }

            // Generate event ID and timestamp
            const eventId = `evt_${uuidv4()}`;
            const timestamp = new Date().toISOString();

            // Generate idempotency key
            const idempotencyKey = this.generateIdempotencyKey(eventType, eventData, timestamp);

            // Build webhook payload
            const payload: WebhookEventPayload = {
                eventId,
                eventType,
                timestamp,
                idempotencyKey,
                data: eventData,
            };

            // Enqueue deliveries for all subscribers (append-only)
            const deliveries = subscriptions.map((subscription) => ({
                id: `wh_del_${uuidv4()}`,
                webhookSubscriptionId: subscription.id,
                eventId,
                eventType,
                payload: payload as any, // Cast to any for Prisma JsonValue compatibility
                status: 'PENDING' as const,
                attemptCount: 0,
                maxRetries: 5,
                createdAt: new Date(),
            }));

            await this.prisma.webhook_deliveries.createMany({
                data: deliveries,
            });

            this.logger.log({
                event: 'webhooks_enqueued',
                eventType,
                eventId,
                subscriberCount: subscriptions.length,
            });
        } catch (error) {
            // Log error but don't throw - webhook failures should NOT affect business operations
            this.logger.error({
                event: 'webhook_enqueue_failed',
                eventType,
                error: error.message,
                stack: error.stack,
            });
        }
    }

    /**
     * Generate idempotency key for deduplication
     */
    private generateIdempotencyKey(eventType: string, eventData: any, timestamp: string): string {
        const resourceId = eventData.orderId || eventData.paymentId || eventData.refundId || eventData.assignmentId || 'unknown';
        const timestampMs = new Date(timestamp).getTime();
        return `${eventType}_${resourceId}_${timestampMs}`;
    }

    /**
     * Get deliveries for a subscription with pagination
     */
    async getDeliveriesForSubscription(
        subscriptionId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<{ deliveries: any[]; total: number }> {
        const [deliveries, total] = await Promise.all([
            this.prisma.webhook_deliveries.findMany({
                where: { webhookSubscriptionId: subscriptionId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.webhook_deliveries.count({
                where: { webhookSubscriptionId: subscriptionId },
            }),
        ]);

        return { deliveries, total };
    }
}
