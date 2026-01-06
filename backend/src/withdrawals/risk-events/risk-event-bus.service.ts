import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RiskEvent, RiskEventHandler, UnsubscribeFn } from './risk-event.types';

/**
 * SPRINT 16 PHASE 1: Risk Event Bus
 * 
 * PURPOSE: In-memory pub/sub for risk events (observational only)
 * 
 * GOLDEN RULES:
 * - In-memory only (no persistence)
 * - Synchronous dispatch (no async workers)
 * - No buffering or queuing
 * - No retries or error recovery
 * - Observational only (no enforcement)
 * 
 * PATTERN:
 * - Simple pub/sub with handler registry
 * - Synchronous event dispatch to all subscribers
 * - Unsubscribe support for cleanup
 * 
 * NON-GOALS (Phase 1):
 * - External message queues (RabbitMQ, Kafka, etc.)
 * - Persistence (database, log files, etc.)
 * - Async workers or background jobs
 * - Event replay or time-travel debugging
 * - Circuit breakers or retry logic
 * 
 * FUTURE PHASES:
 * - Phase 2: Live dashboard integration
 * - Phase 3: Alerting engine integration
 * - Phase 4: SIEM integration
 * - Phase 5: Streaming analytics
 */

@Injectable()
export class WithdrawalRiskEventBusService implements OnModuleInit {
    private readonly logger = new Logger(WithdrawalRiskEventBusService.name);
    private readonly SPRINT_MARKER = 'SPRINT_16_PHASE_1';
    private readonly handlers: RiskEventHandler[] = [];

    /**
     * Initialize event bus
     * 
     * Registers internal logging subscriber
     */
    onModuleInit() {
        // Subscribe internal logging handler
        this.subscribe((event) => {
            this.logger.log({
                marker: this.SPRINT_MARKER,
                action: 'risk_event_published',
                eventId: event.eventId,
                eventType: event.eventType,
                withdrawalId: event.withdrawalId,
                userId: event.userId,
                riskLevel: event.riskLevel,
                source: event.source,
                severity: event.severity,
                summary: event.summary,
                occurredAt: event.occurredAt,
                sprint: event.sprint,
            });
        });

        this.logger.log({
            marker: this.SPRINT_MARKER,
            action: 'risk_event_bus_initialized',
            message: 'In-memory risk event bus ready for pub/sub',
        });
    }

    /**
     * Publish risk event to all subscribers
     * 
     * Synchronous dispatch:
     * - Calls each handler in registration order
     * - Handler errors logged but don't stop dispatch
     * - Returns immediately after all handlers called
     * 
     * NO:
     * - Async dispatch
     * - Buffering
     * - Retries
     * - Persistence
     * 
     * @param event - RiskEvent to publish
     */
    publish(event: RiskEvent): void {
        // Validate event has required fields
        if (!event.eventId || !event.eventType || !event.withdrawalId) {
            this.logger.warn({
                marker: this.SPRINT_MARKER,
                action: 'risk_event_publish_failed',
                reason: 'Invalid event (missing required fields)',
                event,
            });
            return;
        }

        // Synchronous dispatch to all handlers
        for (const handler of this.handlers) {
            try {
                handler(event);
            } catch (error) {
                // Log handler errors but continue dispatch
                this.logger.error({
                    marker: this.SPRINT_MARKER,
                    action: 'risk_event_handler_error',
                    eventId: event.eventId,
                    eventType: event.eventType,
                    error: error.message,
                });
            }
        }
    }

    /**
     * Subscribe to risk events
     * 
     * Handler will be called synchronously for each published event
     * 
     * Returns unsubscribe function for cleanup
     * 
     * @param handler - Function to call for each event
     * @returns Unsubscribe function
     */
    subscribe(handler: RiskEventHandler): UnsubscribeFn {
        // Add handler to registry
        this.handlers.push(handler);

        this.logger.log({
            marker: this.SPRINT_MARKER,
            action: 'risk_event_subscriber_registered',
            handlerCount: this.handlers.length,
        });

        // Return unsubscribe function
        return () => {
            const index = this.handlers.indexOf(handler);
            if (index !== -1) {
                this.handlers.splice(index, 1);
                this.logger.log({
                    marker: this.SPRINT_MARKER,
                    action: 'risk_event_subscriber_unregistered',
                    handlerCount: this.handlers.length,
                });
            }
        };
    }

    /**
     * Get current subscriber count
     * 
     * Useful for monitoring and diagnostics
     */
    getSubscriberCount(): number {
        return this.handlers.length;
    }
}
