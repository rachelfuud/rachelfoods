/**
 * SPRINT 16 PHASE 4: Dashboard Metrics Service
 * 
 * Purpose: Aggregate operational intelligence from:
 * - RiskEventBus (Phase 1 - canonical events)
 * - AdminAlertService (Phase 2 - threshold-based alerts)
 * - AlertIncidentService (Phase 3 - correlated incidents)
 * 
 * Characteristics:
 * - READ-ONLY: No mutations
 * - Deterministic: Same data → same metrics
 * - On-demand: No caching, recomputed per request
 * - Time-windowed: 1h, 6h, 24h aggregation windows
 * 
 * Pattern:
 * - Pure aggregation functions
 * - No persistence
 * - No side effects
 * - Structured logging with SPRINT_16_PHASE_4 marker
 */

import { Injectable, Logger } from '@nestjs/common';
import { WithdrawalRiskEventBusService } from '../risk-events/risk-event-bus.service';
import { AdminAlertService } from '../alerts/admin-alert.service';
import { AlertIncidentService } from '../alerts/alert-incident.service';
import {
    DashboardMetrics,
    EventMetrics,
    AlertMetrics,
    IncidentMetrics,
    TopRiskUser,
    AggregationWindow,
} from './dashboard-metrics.types';
import { RiskEvent } from '../risk-events/risk-event.types';
import { AdminAlert } from '../alerts/admin-alert.types';
import { AlertIncident } from '../alerts/alert-incident.types';

@Injectable()
export class DashboardMetricsService {
    private readonly logger = new Logger(DashboardMetricsService.name);

    constructor(
        private readonly riskEventBus: WithdrawalRiskEventBusService,
        private readonly adminAlertService: AdminAlertService,
        private readonly alertIncidentService: AlertIncidentService,
    ) { }

    /**
     * Generate dashboard metrics for specified time window
     * 
     * @param windowHours - Aggregation window (1, 6, or 24 hours)
     * @returns DashboardMetrics snapshot
     */
    async generateMetrics(windowHours: AggregationWindow = 24): Promise<DashboardMetrics> {
        const generatedAt = new Date().toISOString();
        const windowStartTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);

        this.logger.log(
            `[SPRINT_16_PHASE_4] Generating dashboard metrics (window: ${windowHours}h, start: ${windowStartTime.toISOString()})`,
        );

        // Fetch data from alert and incident services
        const allAlerts = this.adminAlertService.getAllAlerts();
        const allIncidents = this.alertIncidentService.getAllIncidents();

        // Filter by time window
        const windowedAlerts = this.filterAlertsByWindow(allAlerts, windowStartTime);
        const windowedIncidents = this.filterIncidentsByWindow(allIncidents, windowStartTime);

        // Aggregate metrics
        const alertMetrics = this.aggregateAlertMetrics(windowedAlerts, windowHours);
        const incidentMetrics = this.aggregateIncidentMetrics(windowedIncidents);
        const topRiskUsers = this.calculateTopRiskUsers(windowedAlerts, windowedIncidents);

        const metrics: DashboardMetrics = {
            generatedAt,
            windowHours,
            events: {
                total: 0,
                byType: {},
                bySeverity: {},
            },
            alerts: alertMetrics,
            incidents: incidentMetrics,
            topRiskUsers,
            sprint: 'SPRINT_16_PHASE_4',
        };

        this.logger.log(
            `[SPRINT_16_PHASE_4] Dashboard metrics generated (alerts: ${alertMetrics.total}, incidents: ${incidentMetrics.total}, topUsers: ${topRiskUsers.length})`,
        );

        return metrics;
    }

    /**
     * Filter alerts by time window
     */
    private filterAlertsByWindow(alerts: AdminAlert[], windowStart: Date): AdminAlert[] {
        return alerts.filter((alert) => {
            const alertTime = new Date(alert.createdAt);
            return alertTime >= windowStart;
        });
    }

    /**
     * Filter incidents by time window
     */
    private filterIncidentsByWindow(incidents: AlertIncident[], windowStart: Date): AlertIncident[] {
        return incidents.filter((incident) => {
            const incidentTime = new Date(incident.createdAt);
            return incidentTime >= windowStart;
        });
    }

    /**
     * Aggregate alert metrics
     */
    private aggregateAlertMetrics(alerts: AdminAlert[], windowHours: number): AlertMetrics {
        const bySeverity: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        let activeLastHour = 0;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        for (const alert of alerts) {
            // Count by severity
            bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

            // Count by category
            byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;

            // Count active last hour
            const alertTime = new Date(alert.createdAt);
            if (alertTime >= oneHourAgo) {
                activeLastHour++;
            }
        }

        return {
            total: alerts.length,
            bySeverity,
            byCategory,
            activeLastHour,
        };
    }

    /**
     * Aggregate incident metrics
     */
    private aggregateIncidentMetrics(incidents: AlertIncident[]): IncidentMetrics {
        const byCategory: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        let open = 0;
        let stale = 0;

        for (const incident of incidents) {
            // Count by status
            if (incident.status === 'OPEN') {
                open++;
            } else if (incident.status === 'STALE') {
                stale++;
            }

            // Count by category
            byCategory[incident.category] = (byCategory[incident.category] || 0) + 1;

            // Count by severity
            bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
        }

        return {
            total: incidents.length,
            open,
            stale,
            byCategory,
            bySeverity,
        };
    }

    /**
     * Calculate top risk users (by alert and incident count)
     * 
     * Returns top 10 users sorted by:
     * 1. Highest severity
     * 2. Alert count (descending)
     * 3. Incident count (descending)
     */
    private calculateTopRiskUsers(alerts: AdminAlert[], incidents: AlertIncident[]): TopRiskUser[] {
        // Map: userId → user data
        const userMap = new Map<
            string,
            {
                alertCount: number;
                incidentCount: number;
                severities: Set<'INFO' | 'WARNING' | 'CRITICAL'>;
            }
        >();

        // Count alerts per user
        for (const alert of alerts) {
            if (!alert.userId) continue;

            const existing = userMap.get(alert.userId) || {
                alertCount: 0,
                incidentCount: 0,
                severities: new Set<'INFO' | 'WARNING' | 'CRITICAL'>(),
            };

            existing.alertCount++;
            existing.severities.add(alert.severity);
            userMap.set(alert.userId, existing);
        }

        // Count incidents per user
        for (const incident of incidents) {
            if (!incident.userId) continue;

            const existing = userMap.get(incident.userId);
            if (existing) {
                existing.incidentCount++;
                existing.severities.add(incident.severity);
            } else {
                userMap.set(incident.userId, {
                    alertCount: 0,
                    incidentCount: 1,
                    severities: new Set([incident.severity]),
                });
            }
        }

        // Convert to TopRiskUser array
        const topRiskUsers: TopRiskUser[] = Array.from(userMap.entries()).map(
            ([userId, data]) => ({
                userId,
                alertCount: data.alertCount,
                incidentCount: data.incidentCount,
                highestSeverity: this.getHighestSeverity(data.severities),
            }),
        );

        // Sort by severity (CRITICAL > WARNING > INFO), then alert count, then incident count
        topRiskUsers.sort((a, b) => {
            const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
            const severityDiff =
                severityOrder[b.highestSeverity] - severityOrder[a.highestSeverity];
            if (severityDiff !== 0) return severityDiff;

            const alertDiff = b.alertCount - a.alertCount;
            if (alertDiff !== 0) return alertDiff;

            return b.incidentCount - a.incidentCount;
        });

        // Return top 10
        return topRiskUsers.slice(0, 10);
    }

    /**
     * Get highest severity from set
     */
    private getHighestSeverity(
        severities: Set<'INFO' | 'WARNING' | 'CRITICAL'>,
    ): 'INFO' | 'WARNING' | 'CRITICAL' {
        if (severities.has('CRITICAL')) return 'CRITICAL';
        if (severities.has('WARNING')) return 'WARNING';
        return 'INFO';
    }
}
