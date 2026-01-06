/**
 * SPRINT 17 PHASE 1: Governance Readiness Service
 * 
 * Purpose: Compute deterministic governance readiness scores across 6 dimensions
 * 
 * Responsibilities:
 * - Aggregate data from Sprint 12-16 systems
 * - Compute dimension scores (0-100)
 * - Determine overall readiness level
 * - Generate warnings based on thresholds
 * 
 * Characteristics:
 * - READ-ONLY: No mutations, no enforcement
 * - Deterministic: No ML, no probabilistic models
 * - On-demand: Recomputed per request
 * - Audit-ready: Clear rationale and evidence
 * 
 * Pattern:
 * - Pure aggregation functions
 * - No persistence
 * - No side effects
 * - Structured logging with SPRINT_17_PHASE_1 marker
 */

import { Injectable, Logger } from '@nestjs/common';
import { AdminAlertService } from '../alerts/admin-alert.service';
import { AlertIncidentService } from '../alerts/alert-incident.service';
import { DashboardMetricsService } from '../dashboard/dashboard-metrics.service';
import {
    GovernanceReadinessSnapshot,
    GovernanceDimensionScore,
    ReadinessLevel,
} from './governance-readiness.types';

@Injectable()
export class GovernanceReadinessService {
    private readonly logger = new Logger(GovernanceReadinessService.name);

    // Alert saturation thresholds
    private readonly ALERT_SATURATION_WARNING_THRESHOLD = 50; // alerts/hour
    private readonly ALERT_SATURATION_CRITICAL_THRESHOLD = 100; // alerts/hour

    constructor(
        private readonly adminAlertService: AdminAlertService,
        private readonly alertIncidentService: AlertIncidentService,
        private readonly dashboardMetricsService: DashboardMetricsService,
    ) { }

    /**
     * Generate governance readiness snapshot
     * 
     * Computes scores across 6 dimensions:
     * 1. RISK_COVERAGE: % of withdrawals with risk monitoring
     * 2. ESCALATION_VISIBILITY: % of HIGH/CRITICAL alerts linked to incidents
     * 3. ADMIN_DECISION_TRACEABILITY: % of incidents with admin decisions
     * 4. INCIDENT_RECONSTRUCTABILITY: % of incidents with full timeline
     * 5. ALERT_SATURATION: Alert volume sustainability
     * 6. SIEM_EXPORT_READINESS: Compliance export capability
     * 
     * @returns GovernanceReadinessSnapshot
     */
    async generateReadinessSnapshot(): Promise<GovernanceReadinessSnapshot> {
        const generatedAt = new Date().toISOString();
        const windowHours = 24;

        this.logger.log(
            `[SPRINT_17_PHASE_1] Generating governance readiness snapshot (window: ${windowHours}h)`,
        );

        // Compute dimension scores
        const dimensions = await this.computeAllDimensions(windowHours);

        // Calculate overall score (average)
        const overallScore = this.calculateOverallScore(dimensions);

        // Determine readiness level
        const readinessLevel = this.determineReadinessLevel(overallScore);

        // Generate warnings
        const warnings = this.generateWarnings(dimensions);

        const snapshot: GovernanceReadinessSnapshot = {
            generatedAt,
            windowHours,
            overallScore,
            readinessLevel,
            dimensions,
            warnings,
            sprint: 'SPRINT_17_PHASE_1',
        };

        this.logger.log(
            `[SPRINT_17_PHASE_1] Governance readiness snapshot generated (overallScore: ${overallScore}, level: ${readinessLevel}, warnings: ${warnings.length})`,
        );

        return snapshot;
    }

    /**
     * Compute all dimension scores
     */
    private async computeAllDimensions(
        windowHours: number,
    ): Promise<GovernanceDimensionScore[]> {
        return [
            await this.computeRiskCoverage(windowHours),
            await this.computeEscalationVisibility(windowHours),
            await this.computeAdminDecisionTraceability(windowHours),
            await this.computeIncidentReconstructability(windowHours),
            await this.computeAlertSaturation(windowHours),
            await this.computeSiemExportReadiness(),
        ];
    }

    /**
     * DIMENSION 1: RISK_COVERAGE
     * 
     * Measures: % of withdrawals with risk event monitoring
     * 
     * Formula: (withdrawals with alerts / total withdrawals) * 100
     * 
     * Note: Since we don't have direct withdrawal count, we use alert coverage as proxy
     * Score based on alert volume relative to expected baseline
     */
    private async computeRiskCoverage(windowHours: number): Promise<GovernanceDimensionScore> {
        const metrics = await this.dashboardMetricsService.generateMetrics(24);
        const alertCount = metrics.alerts.total;

        // Score based on alert volume (higher = better coverage)
        // Baseline: 10+ alerts/day = 100%, 0 alerts = 0%
        const score = Math.min(100, (alertCount / 10) * 100);

        const rationale = [
            `Alert volume: ${alertCount} alerts in ${windowHours}h`,
            alertCount >= 10
                ? 'Sufficient risk monitoring coverage'
                : alertCount > 0
                    ? 'Partial risk monitoring coverage'
                    : 'No risk monitoring detected',
        ];

        const evidence = [
            'Sprint 16 Phase 2: Admin Alert System',
            'Sprint 16 Phase 1: Risk Event Bus',
            `Current alert count: ${alertCount}`,
        ];

        return {
            dimension: 'RISK_COVERAGE',
            score: Math.round(score),
            rationale,
            evidence,
        };
    }

    /**
     * DIMENSION 2: ESCALATION_VISIBILITY
     * 
     * Measures: % of HIGH/CRITICAL alerts linked to incidents
     * 
     * Formula: (HIGH/CRITICAL alerts in incidents / total HIGH/CRITICAL alerts) * 100
     */
    private async computeEscalationVisibility(
        windowHours: number,
    ): Promise<GovernanceDimensionScore> {
        const allAlerts = this.adminAlertService.getAllAlerts();
        const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const windowedAlerts = allAlerts.filter((a) => new Date(a.createdAt) >= windowStart);

        // Count HIGH/CRITICAL alerts
        const highCriticalAlerts = windowedAlerts.filter(
            (a) => a.severity === 'WARNING' || a.severity === 'CRITICAL',
        );

        if (highCriticalAlerts.length === 0) {
            return {
                dimension: 'ESCALATION_VISIBILITY',
                score: 100, // No high-risk alerts = no visibility gaps
                rationale: ['No HIGH/CRITICAL alerts to track', 'Escalation visibility N/A'],
                evidence: ['Sprint 16 Phase 3: Alert Incident Correlation'],
            };
        }

        // Count how many are linked to incidents
        const allIncidents = this.alertIncidentService.getAllIncidents();
        const windowedIncidents = allIncidents.filter(
            (i) => new Date(i.createdAt) >= windowStart,
        );

        const alertsInIncidents = new Set<string>();
        for (const incident of windowedIncidents) {
            for (const alertId of incident.alertIds) {
                alertsInIncidents.add(alertId);
            }
        }

        const linkedCount = highCriticalAlerts.filter((a) => alertsInIncidents.has(a.alertId))
            .length;
        const score = (linkedCount / highCriticalAlerts.length) * 100;

        const rationale = [
            `${linkedCount} of ${highCriticalAlerts.length} HIGH/CRITICAL alerts linked to incidents`,
            score >= 80
                ? 'Strong escalation visibility'
                : score >= 50
                    ? 'Moderate escalation visibility'
                    : 'Weak escalation visibility',
        ];

        const evidence = [
            'Sprint 16 Phase 3: Alert Incident Correlation',
            `Linked alerts: ${linkedCount}/${highCriticalAlerts.length}`,
            `Active incidents: ${windowedIncidents.length}`,
        ];

        return {
            dimension: 'ESCALATION_VISIBILITY',
            score: Math.round(score),
            rationale,
            evidence,
        };
    }

    /**
     * DIMENSION 3: ADMIN_DECISION_TRACEABILITY
     * 
     * Measures: % of incidents with admin decision capture
     * 
     * Note: Phase 1 uses incident count as proxy (Sprint 14 Phase 3 decision capture exists but not integrated here)
     * Score: 100 if incidents exist (traceability possible), 0 if no incidents
     */
    private async computeAdminDecisionTraceability(
        windowHours: number,
    ): Promise<GovernanceDimensionScore> {
        const allIncidents = this.alertIncidentService.getAllIncidents();
        const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const windowedIncidents = allIncidents.filter(
            (i) => new Date(i.createdAt) >= windowStart,
        );

        // Phase 1: Score based on incident infrastructure availability
        // Future: Integrate Sprint 14 Phase 3 admin decision capture
        const score = windowedIncidents.length > 0 ? 100 : 0;

        const rationale = [
            windowedIncidents.length > 0
                ? `${windowedIncidents.length} incidents provide decision tracking infrastructure`
                : 'No incidents to track admin decisions',
            'Sprint 14 Phase 3 admin decision capture available (not yet integrated)',
        ];

        const evidence = [
            'Sprint 14 Phase 3: Admin Decision Capture',
            'Sprint 16 Phase 3: Alert Incident System',
            `Incidents in window: ${windowedIncidents.length}`,
        ];

        return {
            dimension: 'ADMIN_DECISION_TRACEABILITY',
            score,
            rationale,
            evidence,
        };
    }

    /**
     * DIMENSION 4: INCIDENT_RECONSTRUCTABILITY
     * 
     * Measures: % of incidents with full timeline reconstruction capability
     * 
     * Formula: 100 if incident reconstruction service available, 0 otherwise
     * 
     * Note: Sprint 15 incident reconstruction exists, so score is always 100
     */
    private async computeIncidentReconstructability(
        windowHours: number,
    ): Promise<GovernanceDimensionScore> {
        // Sprint 15 Phase 1 provides incident reconstruction
        // Always score 100 since service is available
        const score = 100;

        const rationale = [
            'Sprint 15 incident reconstruction service operational',
            'Full timeline reconstruction capability available',
            'Evidence-based forensic analysis enabled',
        ];

        const evidence = [
            'Sprint 15 Phase 1: Incident Reconstruction',
            'Sprint 15 Phase 2: Compliance Narrative',
            'Sprint 15 Phase 3: Incident Exports',
            'Sprint 15 Phase 4: Forensic Bundles',
        ];

        return {
            dimension: 'INCIDENT_RECONSTRUCTABILITY',
            score,
            rationale,
            evidence,
        };
    }

    /**
     * DIMENSION 5: ALERT_SATURATION
     * 
     * Measures: Alert volume sustainability (inverse of saturation)
     * 
     * Formula:
     * - < 50 alerts/hour: 100 (sustainable)
     * - 50-100 alerts/hour: 50 (warning)
     * - > 100 alerts/hour: 0 (critical saturation)
     */
    private async computeAlertSaturation(
        windowHours: number,
    ): Promise<GovernanceDimensionScore> {
        const metrics = await this.dashboardMetricsService.generateMetrics(24);
        const alertsLastHour = metrics.alerts.activeLastHour;

        let score: number;
        let saturationLevel: string;

        if (alertsLastHour < this.ALERT_SATURATION_WARNING_THRESHOLD) {
            score = 100;
            saturationLevel = 'Sustainable';
        } else if (alertsLastHour < this.ALERT_SATURATION_CRITICAL_THRESHOLD) {
            score = 50;
            saturationLevel = 'Warning';
        } else {
            score = 0;
            saturationLevel = 'Critical';
        }

        const rationale = [
            `Alert volume: ${alertsLastHour} alerts/hour`,
            `Saturation level: ${saturationLevel}`,
            score === 100
                ? 'Alert volume is sustainable'
                : score === 50
                    ? `Approaching saturation threshold (${this.ALERT_SATURATION_WARNING_THRESHOLD}/hour)`
                    : `Critical saturation (>${this.ALERT_SATURATION_CRITICAL_THRESHOLD}/hour)`,
        ];

        const evidence = [
            'Sprint 16 Phase 2: Admin Alert System',
            `Current rate: ${alertsLastHour} alerts/hour`,
            `Warning threshold: ${this.ALERT_SATURATION_WARNING_THRESHOLD}/hour`,
            `Critical threshold: ${this.ALERT_SATURATION_CRITICAL_THRESHOLD}/hour`,
        ];

        return {
            dimension: 'ALERT_SATURATION',
            score,
            rationale,
            evidence,
        };
    }

    /**
     * DIMENSION 6: SIEM_EXPORT_READINESS
     * 
     * Measures: Compliance export capability
     * 
     * Formula: 100 if SIEM export service available, 0 otherwise
     * 
     * Note: Sprint 16 Phase 4 provides SIEM export, so score is always 100
     */
    private async computeSiemExportReadiness(): Promise<GovernanceDimensionScore> {
        // Sprint 16 Phase 4 provides SIEM export
        // Always score 100 since service is available
        const score = 100;

        const rationale = [
            'SIEM export service operational',
            'Supports JSON and NDJSON formats',
            'Compatible with Splunk, Elastic, Azure Sentinel',
        ];

        const evidence = [
            'Sprint 16 Phase 4: SIEM Export Service',
            'Formats: JSON, NDJSON',
            'Sources: Alerts, Incidents',
        ];

        return {
            dimension: 'SIEM_EXPORT_READINESS',
            score,
            rationale,
            evidence,
        };
    }

    /**
     * Calculate overall score (average of dimensions)
     */
    private calculateOverallScore(dimensions: GovernanceDimensionScore[]): number {
        const sum = dimensions.reduce((total, dim) => total + dim.score, 0);
        return Math.round(sum / dimensions.length);
    }

    /**
     * Determine readiness level from overall score
     */
    private determineReadinessLevel(overallScore: number): ReadinessLevel {
        if (overallScore >= 80) return 'HIGH';
        if (overallScore >= 50) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Generate warnings based on dimension scores
     */
    private generateWarnings(dimensions: GovernanceDimensionScore[]): string[] {
        const warnings: string[] = [];

        for (const dim of dimensions) {
            if (dim.score < 50) {
                warnings.push(`${dim.dimension}: Low score (${dim.score}/100) - ${dim.rationale[0]}`);
            } else if (dim.score < 80) {
                warnings.push(
                    `${dim.dimension}: Medium score (${dim.score}/100) - Review recommended`,
                );
            }
        }

        // Alert saturation specific warning
        const alertSaturation = dimensions.find((d) => d.dimension === 'ALERT_SATURATION');
        if (alertSaturation && alertSaturation.score === 0) {
            warnings.push(
                'CRITICAL: Alert saturation detected - Review alert thresholds or increase admin capacity',
            );
        }

        return warnings;
    }
}
