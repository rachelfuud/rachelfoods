/**
 * SPRINT 16 – PHASE 3
 * Alert Correlation Engine
 *
 * PURPOSE
 * -------
 * Deterministic grouping of AdminAlerts into AlertIncidents using
 * correlation rules.
 *
 * RESPONSIBILITIES
 * ----------------
 * - Define correlation rules (same withdrawal, same user+category+time, shared events)
 * - Generate correlation keys for alert grouping
 * - Evaluate if alerts belong to same incident
 * - Calculate incident severity (max of alerts)
 * - Determine incident status (OPEN/STALE)
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Pure functions (no side effects)
 * - Deterministic grouping
 * - Never mutate alerts
 * - Evidence-backed correlation only
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY (no database access)
 * - No enforcement or automation
 * - Observational intelligence only
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { AdminAlert } from './admin-alert.types';
import type {
    AlertIncident,
    CorrelationRule,
    IncidentSeverity,
    IncidentStatus,
} from './alert-incident.types';

/**
 * AlertCorrelationEngine
 * ----------------------
 * Core correlation logic for grouping alerts into incidents.
 */
@Injectable()
export class AlertCorrelationEngine {
    private readonly logger = new Logger(AlertCorrelationEngine.name);

    /**
     * Correlation time window (24 hours in milliseconds)
     * Alerts within this window can be correlated by user+category
     */
    private readonly CORRELATION_WINDOW_MS = 24 * 60 * 60 * 1000;

    /**
     * Staleness threshold (6 hours in milliseconds)
     * Incidents with no new alerts for this duration are marked STALE
     */
    private readonly STALENESS_THRESHOLD_MS = 6 * 60 * 60 * 1000;

    /**
     * Correlation Rules
     * -----------------
     * Evaluated in order. First matching rule determines grouping.
     */
    private readonly correlationRules: CorrelationRule[] = [
        // Rule 1: Same withdrawal (highest priority)
        {
            id: 'same_withdrawal',
            description: 'Alerts for same withdrawal belong to same incident',
            shouldCorrelate: (alert: AdminAlert, incident: AlertIncident): boolean => {
                return !!(
                    alert.withdrawalId &&
                    incident.withdrawalId &&
                    alert.withdrawalId === incident.withdrawalId
                );
            },
            getCorrelationKey: (alert: AdminAlert): string => {
                return alert.withdrawalId
                    ? `withdrawal:${alert.withdrawalId}`
                    : `alert:${alert.alertId}`;
            },
        },

        // Rule 2: Same user + category + time window
        {
            id: 'same_user_category_timewindow',
            description:
                'Alerts for same user and category within time window belong to same incident',
            shouldCorrelate: (alert: AdminAlert, incident: AlertIncident): boolean => {
                if (!alert.userId || !incident.userId) {
                    return false;
                }

                if (alert.userId !== incident.userId) {
                    return false;
                }

                if (alert.category !== incident.category) {
                    return false;
                }

                // Check time window
                const alertTime = new Date(alert.createdAt).getTime();
                const incidentTime = new Date(incident.firstSeenAt).getTime();
                const timeDiff = Math.abs(alertTime - incidentTime);

                return timeDiff <= this.CORRELATION_WINDOW_MS;
            },
            getCorrelationKey: (alert: AdminAlert): string => {
                if (!alert.userId) {
                    return `alert:${alert.alertId}`;
                }

                // Bucket by hour for time-based grouping
                const alertTime = new Date(alert.createdAt).getTime();
                const hourBucket = Math.floor(
                    alertTime / (60 * 60 * 1000),
                );

                return `user_category:${alert.userId}:${alert.category}:${hourBucket}`;
            },
        },

        // Rule 3: Shared RiskEvent IDs
        {
            id: 'shared_risk_events',
            description:
                'Alerts sharing RiskEvent IDs belong to same incident',
            shouldCorrelate: (alert: AdminAlert, incident: AlertIncident): boolean => {
                if (
                    !alert.relatedEventIds ||
                    alert.relatedEventIds.length === 0
                ) {
                    return false;
                }

                if (
                    !incident.relatedEventIds ||
                    incident.relatedEventIds.length === 0
                ) {
                    return false;
                }

                // Check for any shared event IDs
                return alert.relatedEventIds.some((eventId) =>
                    incident.relatedEventIds.includes(eventId),
                );
            },
            getCorrelationKey: (alert: AdminAlert): string => {
                if (
                    !alert.relatedEventIds ||
                    alert.relatedEventIds.length === 0
                ) {
                    return `alert:${alert.alertId}`;
                }

                // Use first event ID as correlation key
                return `event:${alert.relatedEventIds[0]}`;
            },
        },
    ];

    /**
     * Get correlation key for alert
     * Determines which incident group the alert belongs to.
     *
     * @param alert - Alert to generate key for
     * @returns Correlation key
     */
    getCorrelationKey(alert: AdminAlert): string {
        // Try each rule in order
        for (const rule of this.correlationRules) {
            try {
                const key = rule.getCorrelationKey(alert);
                if (key && !key.startsWith('alert:')) {
                    // Valid correlation key found
                    this.logger.debug({
                        marker: 'SPRINT_16_PHASE_3',
                        action: 'correlation_key_generated',
                        ruleId: rule.id,
                        alertId: alert.alertId,
                        correlationKey: key,
                    });
                    return key;
                }
            } catch (error) {
                this.logger.error({
                    marker: 'SPRINT_16_PHASE_3',
                    action: 'correlation_key_error',
                    ruleId: rule.id,
                    alertId: alert.alertId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        // Fallback: each alert is its own incident
        return `alert:${alert.alertId}`;
    }

    /**
     * Check if alert should correlate with existing incident
     *
     * @param alert - Alert to check
     * @param incident - Existing incident
     * @returns true if alert belongs to incident
     */
    shouldCorrelate(alert: AdminAlert, incident: AlertIncident): boolean {
        // Try each rule in order
        for (const rule of this.correlationRules) {
            try {
                if (rule.shouldCorrelate(alert, incident)) {
                    this.logger.debug({
                        marker: 'SPRINT_16_PHASE_3',
                        action: 'correlation_matched',
                        ruleId: rule.id,
                        alertId: alert.alertId,
                        incidentId: incident.incidentId,
                    });
                    return true;
                }
            } catch (error) {
                this.logger.error({
                    marker: 'SPRINT_16_PHASE_3',
                    action: 'correlation_check_error',
                    ruleId: rule.id,
                    alertId: alert.alertId,
                    incidentId: incident.incidentId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return false;
    }

    /**
     * Create new incident from alert(s)
     *
     * @param alerts - Alert(s) to create incident from
     * @returns New AlertIncident
     */
    createIncident(alerts: AdminAlert[]): AlertIncident {
        if (alerts.length === 0) {
            throw new Error('Cannot create incident from empty alert array');
        }

        // Sort alerts by time
        const sortedAlerts = [...alerts].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
        );

        const firstAlert = sortedAlerts[0];
        const lastAlert = sortedAlerts[sortedAlerts.length - 1];

        // Calculate incident properties
        const severity = this.calculateIncidentSeverity(sortedAlerts);
        const alertIds = sortedAlerts.map((a) => a.alertId);
        const relatedEventIds = this.mergeRelatedEventIds(sortedAlerts);
        const sources = this.mergeSources(sortedAlerts);
        const riskLevel = this.calculateMaxRiskLevel(sortedAlerts);
        const status = this.determineIncidentStatus(lastAlert.createdAt);

        // Generate incident title and summary
        const title = this.generateIncidentTitle(sortedAlerts);
        const summary = this.generateIncidentSummary(sortedAlerts);

        // Generate deterministic incident ID
        const incidentId = this.generateIncidentId({
            alertIds,
            withdrawalId: firstAlert.withdrawalId,
            userId: firstAlert.userId,
            category: firstAlert.category,
            firstSeenAt: firstAlert.createdAt,
        });

        return {
            incidentId,
            createdAt: firstAlert.createdAt,
            severity,
            status,
            category: firstAlert.category,
            title,
            summary,
            alertIds,
            relatedEventIds,
            withdrawalId: firstAlert.withdrawalId,
            userId: firstAlert.userId,
            riskLevel,
            firstSeenAt: firstAlert.createdAt,
            lastSeenAt: lastAlert.createdAt,
            alertCount: alerts.length,
            sources,
            sprint: 'SPRINT_16_PHASE_3',
        };
    }

    /**
     * Update existing incident with new alert
     *
     * @param incident - Existing incident
     * @param alert - New alert to add
     * @param allAlerts - All alerts in incident (including new one)
     * @returns Updated incident
     */
    updateIncident(
        incident: AlertIncident,
        alert: AdminAlert,
        allAlerts: AdminAlert[],
    ): AlertIncident {
        const sortedAlerts = [...allAlerts].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
        );

        const severity = this.calculateIncidentSeverity(sortedAlerts);
        const alertIds = sortedAlerts.map((a) => a.alertId);
        const relatedEventIds = this.mergeRelatedEventIds(sortedAlerts);
        const sources = this.mergeSources(sortedAlerts);
        const riskLevel = this.calculateMaxRiskLevel(sortedAlerts);
        const status = this.determineIncidentStatus(alert.createdAt);

        const title = this.generateIncidentTitle(sortedAlerts);
        const summary = this.generateIncidentSummary(sortedAlerts);

        return {
            ...incident,
            severity,
            status,
            title,
            summary,
            alertIds,
            relatedEventIds,
            riskLevel,
            lastSeenAt: alert.createdAt,
            alertCount: sortedAlerts.length,
            sources,
        };
    }

    /**
     * Check if incident is stale (no recent alert activity)
     *
     * @param incident - Incident to check
     * @returns true if incident is stale
     */
    isIncidentStale(incident: AlertIncident): boolean {
        const now = Date.now();
        const lastSeenTime = new Date(incident.lastSeenAt).getTime();
        const timeSinceLastAlert = now - lastSeenTime;

        return timeSinceLastAlert > this.STALENESS_THRESHOLD_MS;
    }

    /**
     * Calculate incident severity (max of alert severities)
     */
    private calculateIncidentSeverity(
        alerts: AdminAlert[],
    ): IncidentSeverity {
        const severityOrder = { INFO: 1, WARNING: 2, CRITICAL: 3 };

        let maxSeverity: IncidentSeverity = 'INFO';

        for (const alert of alerts) {
            if (severityOrder[alert.severity] > severityOrder[maxSeverity]) {
                maxSeverity = alert.severity;
            }
        }

        return maxSeverity;
    }

    /**
     * Merge related event IDs from all alerts
     */
    private mergeRelatedEventIds(alerts: AdminAlert[]): string[] {
        const eventIds = new Set<string>();

        for (const alert of alerts) {
            if (alert.relatedEventIds) {
                alert.relatedEventIds.forEach((id) => eventIds.add(id));
            }
        }

        return Array.from(eventIds);
    }

    /**
     * Merge sources from all alerts
     */
    private mergeSources(alerts: AdminAlert[]): string[] {
        const sources = new Set<string>();

        for (const alert of alerts) {
            if (alert.sources) {
                alert.sources.forEach((source) => sources.add(source));
            }
        }

        return Array.from(sources);
    }

    /**
     * Calculate max risk level across alerts
     */
    private calculateMaxRiskLevel(
        alerts: AdminAlert[],
    ): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
        const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };

        let maxRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;

        for (const alert of alerts) {
            if (alert.riskLevel) {
                if (
                    !maxRiskLevel ||
                    riskOrder[alert.riskLevel] > riskOrder[maxRiskLevel]
                ) {
                    maxRiskLevel = alert.riskLevel;
                }
            }
        }

        return maxRiskLevel;
    }

    /**
     * Determine incident status based on last alert time
     */
    private determineIncidentStatus(lastAlertTime: string): IncidentStatus {
        const now = Date.now();
        const lastTime = new Date(lastAlertTime).getTime();
        const timeSinceLastAlert = now - lastTime;

        return timeSinceLastAlert > this.STALENESS_THRESHOLD_MS
            ? 'STALE'
            : 'OPEN';
    }

    /**
     * Generate incident title
     */
    private generateIncidentTitle(alerts: AdminAlert[]): string {
        const firstAlert = alerts[0];

        if (firstAlert.withdrawalId) {
            return `${firstAlert.severity} incident for withdrawal ${firstAlert.withdrawalId}`;
        }

        if (firstAlert.userId) {
            return `${firstAlert.severity} incident for user ${firstAlert.userId}`;
        }

        return `${firstAlert.severity} ${firstAlert.category} incident`;
    }

    /**
     * Generate incident summary
     */
    private generateIncidentSummary(alerts: AdminAlert[]): string {
        const severityCounts = {
            CRITICAL: 0,
            WARNING: 0,
            INFO: 0,
        };

        for (const alert of alerts) {
            severityCounts[alert.severity]++;
        }

        const parts: string[] = [];

        if (severityCounts.CRITICAL > 0) {
            parts.push(`${severityCounts.CRITICAL} CRITICAL`);
        }
        if (severityCounts.WARNING > 0) {
            parts.push(`${severityCounts.WARNING} WARNING`);
        }
        if (severityCounts.INFO > 0) {
            parts.push(`${severityCounts.INFO} INFO`);
        }

        const firstAlert = alerts[0];
        const entityRef = firstAlert.withdrawalId
            ? `withdrawal ${firstAlert.withdrawalId}`
            : firstAlert.userId
                ? `user ${firstAlert.userId}`
                : firstAlert.category;

        return `${parts.join(', ')} alerts for ${entityRef}`;
    }

    /**
     * Generate deterministic incident ID using SHA-256
     */
    private generateIncidentId(params: {
        alertIds: string[];
        withdrawalId?: string;
        userId?: string;
        category: string;
        firstSeenAt: string;
    }): string {
        const input = [
            params.alertIds.sort().join(','),
            params.withdrawalId || '',
            params.userId || '',
            params.category,
            params.firstSeenAt,
        ].join('|');

        return createHash('sha256').update(input).digest('hex');
    }

    /**
     * Get correlation window size (for monitoring)
     */
    getCorrelationWindowMs(): number {
        return this.CORRELATION_WINDOW_MS;
    }

    /**
     * Get staleness threshold (for monitoring)
     */
    getStalenessThresholdMs(): number {
        return this.STALENESS_THRESHOLD_MS;
    }
}
