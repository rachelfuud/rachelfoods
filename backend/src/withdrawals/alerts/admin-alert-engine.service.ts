/**
 * SPRINT 16 – PHASE 2
 * Admin Alert Engine Service
 *
 * PURPOSE
 * -------
 * Subscribes to RiskEvents from the event bus and evaluates them against
 * static alert thresholds to generate AdminAlert objects.
 *
 * RESPONSIBILITIES
 * ----------------
 * - Subscribe to WithdrawalRiskEventBusService
 * - Maintain in-memory sliding window of recent RiskEvents (24h)
 * - Evaluate alert thresholds on each new RiskEvent
 * - Generate AdminAlert objects for matched thresholds
 * - Publish alerts to AdminAlertService for storage
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Synchronous evaluation (no async workers)
 * - Deterministic alert generation
 * - Never throw (log errors, continue processing)
 * - Never block event publishing
 * - In-memory only (no persistence)
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY (no database writes)
 * - No blocking logic
 * - No retries or queues
 * - Observational only
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import type { RiskEvent } from '../risk-events/risk-event.types';
import type { AdminAlert, AlertThreshold } from './admin-alert.types';
import { ALERT_THRESHOLDS } from './admin-alert-thresholds';
import { WithdrawalRiskEventBusService } from '../risk-events/risk-event-bus.service';
import { AdminAlertService } from './admin-alert.service';

/**
 * AdminAlertEngineService
 * -----------------------
 * Core alert evaluation engine that transforms RiskEvents into AdminAlerts.
 */
@Injectable()
export class AdminAlertEngineService implements OnModuleInit {
    private readonly logger = new Logger(AdminAlertEngineService.name);

    /**
     * In-memory sliding window of recent RiskEvents (last 24 hours)
     * Used for pattern-based threshold evaluation.
     */
    private recentEvents: RiskEvent[] = [];

    /**
     * Maximum size of recent events window (prevent unbounded growth)
     */
    private readonly MAX_RECENT_EVENTS = 1000;

    /**
     * Time window for recent events (24 hours in milliseconds)
     */
    private readonly RECENT_EVENTS_WINDOW_MS = 24 * 60 * 60 * 1000;

    constructor(
        private readonly eventBusService: WithdrawalRiskEventBusService,
        private readonly alertService: AdminAlertService,
    ) { }

    /**
     * Module initialization
     * Subscribe to RiskEvent bus to begin alert evaluation.
     */
    onModuleInit() {
        this.logger.log({
            marker: 'SPRINT_16_PHASE_2',
            action: 'alert_engine_initialized',
            message: 'AdminAlertEngineService subscribed to RiskEvent bus',
            thresholdCount: ALERT_THRESHOLDS.length,
        });

        // Subscribe to all RiskEvents
        this.eventBusService.subscribe((event: RiskEvent) => {
            this.handleRiskEvent(event);
        });
    }

    /**
     * Handle incoming RiskEvent
     * Evaluates thresholds and generates alerts if matched.
     *
     * @param event - RiskEvent to evaluate
     */
    private handleRiskEvent(event: RiskEvent): void {
        try {
            // Add event to sliding window
            this.addToRecentEvents(event);

            // Prune old events from sliding window
            this.pruneRecentEvents();

            // Evaluate thresholds (first match wins)
            for (const threshold of ALERT_THRESHOLDS) {
                try {
                    const matched = threshold.match(event, this.recentEvents);

                    if (matched) {
                        this.logger.log({
                            marker: 'SPRINT_16_PHASE_2',
                            action: 'alert_threshold_matched',
                            thresholdId: threshold.id,
                            eventId: event.eventId,
                            eventType: event.eventType,
                            withdrawalId: event.withdrawalId,
                            severity: threshold.severity,
                        });

                        // Generate alert
                        const alert = this.generateAlert(event, threshold);

                        // Store alert in registry
                        this.alertService.addAlert(alert);

                        this.logger.log({
                            marker: 'SPRINT_16_PHASE_2',
                            action: 'admin_alert_triggered',
                            alertId: alert.alertId,
                            severity: alert.severity,
                            category: alert.category,
                            withdrawalId: alert.withdrawalId,
                            userId: alert.userId,
                            title: alert.title,
                        });

                        // Stop after first match (avoid duplicate alerts)
                        break;
                    }
                } catch (error) {
                    // Log threshold evaluation error but continue
                    this.logger.error({
                        marker: 'SPRINT_16_PHASE_2',
                        action: 'alert_threshold_evaluation_error',
                        thresholdId: threshold.id,
                        eventId: event.eventId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        } catch (error) {
            // Log error but never throw (don't block event bus)
            this.logger.error({
                marker: 'SPRINT_16_PHASE_2',
                action: 'alert_engine_error',
                eventId: event.eventId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Generate AdminAlert from matched threshold
     *
     * @param event - RiskEvent that matched threshold
     * @param threshold - Matched AlertThreshold
     * @returns Generated AdminAlert
     */
    private generateAlert(
        event: RiskEvent,
        threshold: AlertThreshold,
    ): AdminAlert {
        const createdAt = new Date().toISOString();

        // Generate description using threshold logic
        const description = threshold.description(event, this.recentEvents);

        // Collect related event IDs (current event + recent related events)
        const relatedEventIds = this.collectRelatedEventIds(event);

        // Collect unique sources from related events
        const sources = this.collectSources(event, relatedEventIds);

        // Generate deterministic alert ID
        const alertId = this.generateAlertId({
            createdAt,
            severity: threshold.severity,
            category: threshold.category,
            relatedEventIds,
            withdrawalId: event.withdrawalId,
            userId: event.userId,
        });

        return {
            alertId,
            createdAt,
            severity: threshold.severity,
            category: threshold.category,
            title: threshold.title,
            description,
            relatedEventIds,
            withdrawalId: event.withdrawalId,
            userId: event.userId,
            riskLevel: event.riskLevel,
            sources,
            sprint: 'SPRINT_16_PHASE_2',
        };
    }

    /**
     * Generate deterministic alert ID using SHA-256
     *
     * @param params - Alert identification parameters
     * @returns SHA-256 hash
     */
    private generateAlertId(params: {
        createdAt: string;
        severity: string;
        category: string;
        relatedEventIds: string[];
        withdrawalId?: string;
        userId?: string;
    }): string {
        const input = [
            params.createdAt,
            params.severity,
            params.category,
            params.relatedEventIds.sort().join(','),
            params.withdrawalId || '',
            params.userId || '',
        ].join('|');

        return createHash('sha256').update(input).digest('hex');
    }

    /**
     * Collect related event IDs for alert
     * Includes current event + recent events for same withdrawal/user.
     *
     * @param event - Current RiskEvent
     * @returns Array of related event IDs
     */
    private collectRelatedEventIds(event: RiskEvent): string[] {
        const ids = new Set<string>([event.eventId]);

        // Add recent events for same withdrawal
        if (event.withdrawalId) {
            this.recentEvents
                .filter((e) => e.withdrawalId === event.withdrawalId)
                .forEach((e) => ids.add(e.eventId));
        }

        // Add recent events for same user (limit to prevent bloat)
        if (event.userId) {
            this.recentEvents
                .filter((e) => e.userId === event.userId)
                .slice(0, 10) // Max 10 related user events
                .forEach((e) => ids.add(e.eventId));
        }

        return Array.from(ids);
    }

    /**
     * Collect unique sources from related events
     *
     * @param event - Current RiskEvent
     * @param relatedEventIds - Related event IDs
     * @returns Array of unique source identifiers
     */
    private collectSources(event: RiskEvent, relatedEventIds: string[]): string[] {
        const sources = new Set<string>([event.source]);

        this.recentEvents
            .filter((e) => relatedEventIds.includes(e.eventId))
            .forEach((e) => sources.add(e.source));

        return Array.from(sources);
    }

    /**
     * Add RiskEvent to recent events sliding window
     *
     * @param event - RiskEvent to add
     */
    private addToRecentEvents(event: RiskEvent): void {
        this.recentEvents.push(event);

        // Enforce max size (FIFO)
        if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
            this.recentEvents.shift();
        }
    }

    /**
     * Prune events older than 24 hours from sliding window
     */
    private pruneRecentEvents(): void {
        const cutoffTime = new Date(Date.now() - this.RECENT_EVENTS_WINDOW_MS).toISOString();

        this.recentEvents = this.recentEvents.filter(
            (event) => event.occurredAt >= cutoffTime,
        );
    }

    /**
     * Get current sliding window statistics (for monitoring)
     */
    getStatistics(): {
        recentEventCount: number;
        thresholdCount: number;
        windowSizeMs: number;
    } {
        return {
            recentEventCount: this.recentEvents.length,
            thresholdCount: ALERT_THRESHOLDS.length,
            windowSizeMs: this.RECENT_EVENTS_WINDOW_MS,
        };
    }
}
