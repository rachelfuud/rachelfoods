/**
 * SPRINT 16 – PHASE 2
 * Admin Alert Registry Service
 *
 * PURPOSE
 * -------
 * In-memory storage and query interface for AdminAlerts.
 *
 * RESPONSIBILITIES
 * ----------------
 * - Store alerts in-memory using ring buffer (max 500 alerts)
 * - Query alerts with filters (severity, category, withdrawal, user, time)
 * - Provide pagination support
 * - Retrieve single alert by ID
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - In-memory only (no persistence)
 * - Ring buffer (FIFO) to prevent unbounded growth
 * - Fast queries with array filtering
 * - Thread-safe (single Node.js thread)
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY API for external consumers
 * - No database writes
 * - No mutations after creation
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
    AdminAlert,
    AlertQueryFilters,
    AlertQueryResult,
} from './admin-alert.types';

/**
 * AdminAlertService
 * -----------------
 * In-memory alert registry with query capabilities.
 */
@Injectable()
export class AdminAlertService {
    private readonly logger = new Logger(AdminAlertService.name);

    /**
     * In-memory alert storage (ring buffer)
     * Newest alerts at end of array.
     */
    private alerts: AdminAlert[] = [];

    /**
     * Maximum alerts stored in memory (ring buffer size)
     * Older alerts automatically evicted when limit reached.
     */
    private readonly MAX_ALERTS = 500;

    /**
     * Default pagination limit
     */
    private readonly DEFAULT_LIMIT = 50;

    /**
     * Maximum pagination limit (prevent abuse)
     */
    private readonly MAX_LIMIT = 100;

    /**
     * Add alert to in-memory registry
     * Called by AdminAlertEngineService when alert generated.
     *
     * @param alert - AdminAlert to store
     */
    addAlert(alert: AdminAlert): void {
        this.alerts.push(alert);

        // Enforce ring buffer size (FIFO eviction)
        if (this.alerts.length > this.MAX_ALERTS) {
            const evicted = this.alerts.shift();
            this.logger.debug({
                marker: 'SPRINT_16_PHASE_2',
                action: 'alert_evicted',
                alertId: evicted?.alertId,
                reason: 'ring_buffer_full',
            });
        }

        this.logger.debug({
            marker: 'SPRINT_16_PHASE_2',
            action: 'alert_stored',
            alertId: alert.alertId,
            severity: alert.severity,
            category: alert.category,
            totalAlerts: this.alerts.length,
        });
    }

    /**
     * Query alerts with filters and pagination
     *
     * @param filters - Query filters
     * @returns Paginated alert results
     */
    queryAlerts(filters: AlertQueryFilters): AlertQueryResult {
        // Apply filters
        let filtered = this.alerts;

        if (filters.severity) {
            filtered = filtered.filter((a) => a.severity === filters.severity);
        }

        if (filters.category) {
            filtered = filtered.filter((a) => a.category === filters.category);
        }

        if (filters.withdrawalId) {
            filtered = filtered.filter(
                (a) => a.withdrawalId === filters.withdrawalId,
            );
        }

        if (filters.userId) {
            filtered = filtered.filter((a) => a.userId === filters.userId);
        }

        if (filters.startTime) {
            filtered = filtered.filter(
                (a) => a.createdAt >= filters.startTime!,
            );
        }

        if (filters.endTime) {
            filtered = filtered.filter((a) => a.createdAt <= filters.endTime!);
        }

        // Sort by createdAt descending (newest first)
        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        // Pagination
        const limit = Math.min(
            filters.limit || this.DEFAULT_LIMIT,
            this.MAX_LIMIT,
        );
        const offset = filters.offset || 0;

        const paginatedAlerts = filtered.slice(offset, offset + limit);

        this.logger.debug({
            marker: 'SPRINT_16_PHASE_2',
            action: 'alerts_queried',
            filters,
            totalMatched: filtered.length,
            returned: paginatedAlerts.length,
        });

        return {
            alerts: paginatedAlerts,
            total: filtered.length,
            limit,
            offset,
        };
    }

    /**
     * Get single alert by ID
     *
     * @param alertId - Alert identifier
     * @returns AdminAlert
     * @throws NotFoundException if alert not found
     */
    getAlertById(alertId: string): AdminAlert {
        const alert = this.alerts.find((a) => a.alertId === alertId);

        if (!alert) {
            throw new NotFoundException(`Alert with ID ${alertId} not found`);
        }

        this.logger.debug({
            marker: 'SPRINT_16_PHASE_2',
            action: 'alert_retrieved',
            alertId,
        });

        return alert;
    }

    /**
     * Get all alerts (no filters, no pagination)
     * Useful for monitoring/debugging.
     *
     * @returns All alerts in memory
     */
    getAllAlerts(): AdminAlert[] {
        return [...this.alerts]; // Return copy to prevent mutations
    }

    /**
     * Get registry statistics (for monitoring)
     */
    getStatistics(): {
        totalAlerts: number;
        maxAlerts: number;
        utilizationPercent: number;
        severityCounts: Record<string, number>;
        categoryCounts: Record<string, number>;
    } {
        const severityCounts = this.alerts.reduce(
            (acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        const categoryCounts = this.alerts.reduce(
            (acc, alert) => {
                acc[alert.category] = (acc[alert.category] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        return {
            totalAlerts: this.alerts.length,
            maxAlerts: this.MAX_ALERTS,
            utilizationPercent: (this.alerts.length / this.MAX_ALERTS) * 100,
            severityCounts,
            categoryCounts,
        };
    }

    /**
     * Clear all alerts (for testing/development only)
     * NOT exposed via controller.
     */
    clearAlerts(): void {
        const count = this.alerts.length;
        this.alerts = [];

        this.logger.warn({
            marker: 'SPRINT_16_PHASE_2',
            action: 'alerts_cleared',
            clearedCount: count,
        });
    }
}
