/**
 * SPRINT 16 – PHASE 3
 * Alert Incident Service
 *
 * PURPOSE
 * -------
 * In-memory storage and query interface for AlertIncidents created by
 * the correlation engine.
 *
 * RESPONSIBILITIES
 * ----------------
 * - Subscribe to AdminAlertService for new alerts
 * - Use correlation engine to group alerts into incidents
 * - Store incidents in-memory (map by correlation key)
 * - Update incidents when correlated alerts arrive
 * - Mark incidents STALE when no recent activity
 * - Query incidents with filters (severity, category, withdrawal, user, status)
 * - Provide pagination support
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - In-memory only (no persistence)
 * - Real-time correlation on alert arrival
 * - Deterministic incident grouping
 * - Thread-safe (single Node.js thread)
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY API for external consumers
 * - No database writes
 * - No mutations after incident creation (except updates)
 */

import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import type {
    AlertIncident,
    IncidentQueryFilters,
    IncidentQueryResult,
    IncidentWithAlerts,
    CorrelationStatistics,
} from './alert-incident.types';
import type { AdminAlert } from './admin-alert.types';
import { AlertCorrelationEngine } from './alert-correlation.engine';
import { AdminAlertService } from './admin-alert.service';

/**
 * AlertIncidentService
 * --------------------
 * In-memory incident registry with correlation capabilities.
 */
@Injectable()
export class AlertIncidentService implements OnModuleInit {
    private readonly logger = new Logger(AlertIncidentService.name);

    /**
     * In-memory incident storage
     * Key: correlation key (from correlation engine)
     * Value: AlertIncident
     */
    private incidents: Map<string, AlertIncident> = new Map();

    /**
     * Map of alert ID to incident ID for quick lookups
     */
    private alertToIncidentMap: Map<string, string> = new Map();

    /**
     * Maximum incidents stored in memory
     * Oldest incidents evicted when limit reached
     */
    private readonly MAX_INCIDENTS = 1000;

    /**
     * Default pagination limit
     */
    private readonly DEFAULT_LIMIT = 20;

    /**
     * Maximum pagination limit (prevent abuse)
     */
    private readonly MAX_LIMIT = 50;

    constructor(
        private readonly correlationEngine: AlertCorrelationEngine,
        private readonly alertService: AdminAlertService,
    ) { }

    /**
     * Module initialization
     * Start correlating alerts from alert service
     */
    onModuleInit() {
        this.logger.log({
            marker: 'SPRINT_16_PHASE_3',
            action: 'incident_service_initialized',
            message: 'AlertIncidentService started',
        });

        // Process existing alerts from alert service
        this.correlateExistingAlerts();

        // Note: In a production system, we'd subscribe to alert service
        // for real-time correlation. For Phase 3, we process existing alerts.
    }

    /**
     * Correlate existing alerts from alert service
     */
    private correlateExistingAlerts(): void {
        const allAlerts = this.alertService.getAllAlerts();

        this.logger.log({
            marker: 'SPRINT_16_PHASE_3',
            action: 'correlating_existing_alerts',
            alertCount: allAlerts.length,
        });

        for (const alert of allAlerts) {
            this.correlateAlert(alert);
        }

        this.logger.log({
            marker: 'SPRINT_16_PHASE_3',
            action: 'correlation_complete',
            incidentCount: this.incidents.size,
        });
    }

    /**
     * Correlate new alert into incidents
     * Called when new alert is generated
     *
     * @param alert - New alert to correlate
     */
    correlateAlert(alert: AdminAlert): void {
        try {
            // Get correlation key
            const correlationKey = this.correlationEngine.getCorrelationKey(alert);

            // Check if incident exists for this key
            const existingIncident = this.incidents.get(correlationKey);

            if (existingIncident) {
                // Check if alert should correlate with existing incident
                if (
                    this.correlationEngine.shouldCorrelate(
                        alert,
                        existingIncident,
                    )
                ) {
                    // Update existing incident
                    const allAlerts = this.getAlertsForIncident(existingIncident);
                    allAlerts.push(alert);

                    const updatedIncident =
                        this.correlationEngine.updateIncident(
                            existingIncident,
                            alert,
                            allAlerts,
                        );

                    this.incidents.set(correlationKey, updatedIncident);
                    this.alertToIncidentMap.set(
                        alert.alertId,
                        updatedIncident.incidentId,
                    );

                    this.logger.log({
                        marker: 'SPRINT_16_PHASE_3',
                        action: 'alert_incident_updated',
                        incidentId: updatedIncident.incidentId,
                        alertId: alert.alertId,
                        alertCount: updatedIncident.alertCount,
                    });
                } else {
                    // Create new incident for this alert
                    this.createNewIncident(alert, correlationKey);
                }
            } else {
                // Create new incident
                this.createNewIncident(alert, correlationKey);
            }

            // Check for stale incidents and update status
            this.updateStaleIncidents();

            // Enforce max incidents (FIFO eviction)
            this.enforceMaxIncidents();
        } catch (error) {
            this.logger.error({
                marker: 'SPRINT_16_PHASE_3',
                action: 'correlation_error',
                alertId: alert.alertId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Create new incident from alert
     */
    private createNewIncident(
        alert: AdminAlert,
        correlationKey: string,
    ): void {
        const newIncident = this.correlationEngine.createIncident([alert]);

        this.incidents.set(correlationKey, newIncident);
        this.alertToIncidentMap.set(alert.alertId, newIncident.incidentId);

        this.logger.log({
            marker: 'SPRINT_16_PHASE_3',
            action: 'alert_incident_created',
            incidentId: newIncident.incidentId,
            severity: newIncident.severity,
            category: newIncident.category,
            withdrawalId: newIncident.withdrawalId,
            userId: newIncident.userId,
        });
    }

    /**
     * Get alerts for incident from alert service
     */
    private getAlertsForIncident(incident: AlertIncident): AdminAlert[] {
        const allAlerts = this.alertService.getAllAlerts();
        return allAlerts.filter((alert) =>
            incident.alertIds.includes(alert.alertId),
        );
    }

    /**
     * Update stale incidents
     * Mark incidents as STALE if no recent alert activity
     */
    private updateStaleIncidents(): void {
        for (const [key, incident] of this.incidents.entries()) {
            if (
                incident.status === 'OPEN' &&
                this.correlationEngine.isIncidentStale(incident)
            ) {
                const updatedIncident = {
                    ...incident,
                    status: 'STALE' as const,
                };

                this.incidents.set(key, updatedIncident);

                this.logger.log({
                    marker: 'SPRINT_16_PHASE_3',
                    action: 'alert_incident_marked_stale',
                    incidentId: incident.incidentId,
                    timeSinceLastAlert: Date.now() - new Date(incident.lastSeenAt).getTime(),
                });
            }
        }
    }

    /**
     * Enforce max incidents (FIFO eviction)
     */
    private enforceMaxIncidents(): void {
        if (this.incidents.size <= this.MAX_INCIDENTS) {
            return;
        }

        // Sort by firstSeenAt (oldest first)
        const sortedIncidents = Array.from(this.incidents.entries()).sort(
            (a, b) => a[1].firstSeenAt.localeCompare(b[1].firstSeenAt),
        );

        // Evict oldest incidents
        const toEvict = sortedIncidents.slice(
            0,
            this.incidents.size - this.MAX_INCIDENTS,
        );

        for (const [key, incident] of toEvict) {
            this.incidents.delete(key);

            // Remove from alert mapping
            for (const alertId of incident.alertIds) {
                this.alertToIncidentMap.delete(alertId);
            }

            this.logger.debug({
                marker: 'SPRINT_16_PHASE_3',
                action: 'incident_evicted',
                incidentId: incident.incidentId,
                reason: 'max_incidents_reached',
            });
        }
    }

    /**
     * Query incidents with filters and pagination
     *
     * @param filters - Query filters
     * @returns Paginated incident results
     */
    queryIncidents(filters: IncidentQueryFilters): IncidentQueryResult {
        // Get all incidents as array
        let filtered = Array.from(this.incidents.values());

        // Apply filters
        if (filters.severity) {
            filtered = filtered.filter((i) => i.severity === filters.severity);
        }

        if (filters.status) {
            filtered = filtered.filter((i) => i.status === filters.status);
        }

        if (filters.category) {
            filtered = filtered.filter((i) => i.category === filters.category);
        }

        if (filters.withdrawalId) {
            filtered = filtered.filter(
                (i) => i.withdrawalId === filters.withdrawalId,
            );
        }

        if (filters.userId) {
            filtered = filtered.filter((i) => i.userId === filters.userId);
        }

        if (filters.startTime) {
            filtered = filtered.filter(
                (i) => i.firstSeenAt >= filters.startTime!,
            );
        }

        if (filters.endTime) {
            filtered = filtered.filter(
                (i) => i.lastSeenAt <= filters.endTime!,
            );
        }

        // Sort by lastSeenAt descending (most recent first)
        filtered.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

        // Pagination
        const limit = Math.min(
            filters.limit || this.DEFAULT_LIMIT,
            this.MAX_LIMIT,
        );
        const offset = filters.offset || 0;

        const paginatedIncidents = filtered.slice(offset, offset + limit);

        this.logger.debug({
            marker: 'SPRINT_16_PHASE_3',
            action: 'incidents_queried',
            filters,
            totalMatched: filtered.length,
            returned: paginatedIncidents.length,
        });

        return {
            incidents: paginatedIncidents,
            total: filtered.length,
            limit,
            offset,
        };
    }

    /**
     * Get single incident by ID with full alert details
     *
     * @param incidentId - Incident identifier
     * @returns Incident with alerts
     * @throws NotFoundException if incident not found
     */
    getIncidentById(incidentId: string): IncidentWithAlerts {
        const incident = Array.from(this.incidents.values()).find(
            (i) => i.incidentId === incidentId,
        );

        if (!incident) {
            throw new NotFoundException(
                `Incident with ID ${incidentId} not found`,
            );
        }

        // Get full alert details
        const alerts = this.getAlertsForIncident(incident);

        this.logger.debug({
            marker: 'SPRINT_16_PHASE_3',
            action: 'incident_retrieved',
            incidentId,
        });

        return {
            ...incident,
            alerts,
        };
    }

    /**
     * Get incident for specific alert
     *
     * @param alertId - Alert identifier
     * @returns Incident containing alert, or undefined
     */
    getIncidentForAlert(alertId: string): AlertIncident | undefined {
        const incidentId = this.alertToIncidentMap.get(alertId);
        if (!incidentId) {
            return undefined;
        }

        return Array.from(this.incidents.values()).find(
            (i) => i.incidentId === incidentId,
        );
    }

    /**
     * Get all incidents (no filters, no pagination)
     * Useful for monitoring/debugging
     *
     * @returns All incidents in memory
     */
    getAllIncidents(): AlertIncident[] {
        return Array.from(this.incidents.values());
    }

    /**
     * Get correlation statistics (for monitoring)
     */
    getStatistics(): CorrelationStatistics {
        const incidents = Array.from(this.incidents.values());

        const openIncidents = incidents.filter((i) => i.status === 'OPEN')
            .length;
        const staleIncidents = incidents.filter((i) => i.status === 'STALE')
            .length;

        const totalAlerts = incidents.reduce(
            (sum, i) => sum + i.alertCount,
            0,
        );
        const avgAlertsPerIncident =
            incidents.length > 0 ? totalAlerts / incidents.length : 0;

        return {
            totalIncidents: incidents.length,
            openIncidents,
            staleIncidents,
            avgAlertsPerIncident,
            correlationWindowMs: this.correlationEngine.getCorrelationWindowMs(),
            stalenessThresholdMs:
                this.correlationEngine.getStalenessThresholdMs(),
        };
    }

    /**
     * Clear all incidents (for testing/development only)
     * NOT exposed via controller
     */
    clearIncidents(): void {
        const count = this.incidents.size;
        this.incidents.clear();
        this.alertToIncidentMap.clear();

        this.logger.warn({
            marker: 'SPRINT_16_PHASE_3',
            action: 'incidents_cleared',
            clearedCount: count,
        });
    }
}
