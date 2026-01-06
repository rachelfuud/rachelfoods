/**
 * SPRINT 17 – PHASE 2
 * Control Gap Detection Service
 *
 * Purpose: Detect governance control gaps from readiness snapshots
 *
 * Responsibilities:
 * - Analyze Sprint 17 Phase 1 readiness snapshots
 * - Identify dimensions scoring < 80 (production readiness threshold)
 * - Generate deterministic gap IDs (SHA-256)
 * - Classify gap severity (HIGH/MEDIUM/LOW)
 * - Provide advisory remediation hints
 * - Create comprehensive gap reports
 *
 * Design Principles:
 * - READ-ONLY (no mutations, no enforcement)
 * - Deterministic (same input → same output)
 * - No ML (pure arithmetic and threshold logic)
 * - No persistence (on-demand computation)
 * - Audit-ready (clear evidence trails)
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    GovernanceReadinessSnapshot,
    GovernanceDimensionScore,
    GovernanceDimension,
} from './governance-readiness.types';
import {
    ControlGap,
    ControlGapReport,
    ControlGapSeverity,
    determineGapSeverity,
} from './control-gap.types';
import { GovernanceReadinessService } from './governance-readiness.service';

/**
 * Production readiness threshold
 * Dimensions scoring < 80 are considered gaps
 */
const PRODUCTION_READINESS_THRESHOLD = 80;

/**
 * Remediation hints by dimension
 * Advisory guidance only - NO enforcement
 */
const REMEDIATION_HINTS: Record<GovernanceDimension, string[]> = {
    RISK_COVERAGE: [
        'Review risk event generation in Sprint 16 Phase 1',
        'Verify alert threshold configuration in Sprint 16 Phase 2',
        'Investigate potential monitoring blind spots',
        'Consider expanding risk event taxonomy',
    ],
    ESCALATION_VISIBILITY: [
        'Increase linking of HIGH/CRITICAL alerts to incidents',
        'Review Sprint 16 Phase 3 alert correlation rules',
        'Train admins on incident creation workflow',
        'Audit unlinked high-severity alerts',
    ],
    ADMIN_DECISION_TRACEABILITY: [
        'Enable Sprint 14 Phase 3 admin decision capture for all incidents',
        'Review incident creation patterns',
        'Train admins on decision logging best practices',
        'Audit incident decision coverage',
    ],
    INCIDENT_RECONSTRUCTABILITY: [
        'Sprint 15 incident reconstruction service is operational',
        'No action required - this dimension is infrastructure-based',
    ],
    ALERT_SATURATION: [
        'Review and adjust alert thresholds to reduce noise',
        'Consolidate low-priority alerts',
        'Implement alert aggregation strategies',
        'Increase admin review capacity',
        'Consider alert routing optimization',
    ],
    SIEM_EXPORT_READINESS: [
        'Sprint 16 Phase 4 SIEM export service is operational',
        'No action required - this dimension is infrastructure-based',
    ],
};

@Injectable()
export class ControlGapService {
    private readonly logger = new Logger(ControlGapService.name);

    constructor(private readonly governanceReadinessService: GovernanceReadinessService) { }

    /**
     * Generate comprehensive control gap report
     *
     * Process:
     * 1. Get current readiness snapshot (Sprint 17 Phase 1)
     * 2. Identify dimensions scoring < 80
     * 3. Generate deterministic gap IDs
     * 4. Classify severity and provide remediation hints
     * 5. Create sorted gap report
     *
     * @returns ControlGapReport with all identified gaps
     */
    async generateControlGapReport(): Promise<ControlGapReport> {
        this.logger.log('[SPRINT_17_PHASE_2] Generating control gap report');

        // Get current governance readiness snapshot
        const snapshot = await this.governanceReadinessService.generateReadinessSnapshot();

        // Identify gaps (dimensions scoring < 80)
        const gaps = this.detectControlGaps(snapshot);

        // Sort by severity (HIGH → MEDIUM → LOW)
        const sortedGaps = this.sortGapsBySeverity(gaps);

        // Generate summary statistics
        const gapSummary = this.calculateGapSummary(sortedGaps);

        const report: ControlGapReport = {
            generatedAt: new Date().toISOString(),
            windowHours: 24,
            gaps: sortedGaps,
            gapSummary,
            sprint: 'SPRINT_17_PHASE_2',
        };

        this.logger.log(
            `[SPRINT_17_PHASE_2] Control gap report generated (total: ${gapSummary.total}, high: ${gapSummary.high}, medium: ${gapSummary.medium}, low: ${gapSummary.low})`,
        );

        return report;
    }

    /**
     * Detect control gaps from readiness snapshot
     *
     * Gap criteria:
     * - Dimension score < 80 (production readiness threshold)
     *
     * @param snapshot Governance readiness snapshot
     * @returns Array of detected control gaps
     */
    private detectControlGaps(snapshot: GovernanceReadinessSnapshot): ControlGap[] {
        const gaps: ControlGap[] = [];

        for (const dimension of snapshot.dimensions) {
            if (dimension.score < PRODUCTION_READINESS_THRESHOLD) {
                const gap = this.createControlGap(dimension);
                gaps.push(gap);
            }
        }

        this.logger.log(`[SPRINT_17_PHASE_2] Detected ${gaps.length} control gaps`);

        return gaps;
    }

    /**
     * Create control gap from dimension score
     *
     * @param dimension Governance dimension with score < 80
     * @returns ControlGap with deterministic ID, severity, and remediation hints
     */
    private createControlGap(dimension: GovernanceDimensionScore): ControlGap {
        const scoreObserved = Math.round(dimension.score);
        const scoreExpected = PRODUCTION_READINESS_THRESHOLD;

        // Generate deterministic gap ID
        const id = this.generateGapId(dimension.dimension, scoreObserved, scoreExpected);

        // Classify severity
        const severity = determineGapSeverity(scoreObserved);

        // Generate description
        const description = this.generateGapDescription(dimension.dimension, scoreObserved, severity);

        // Get remediation hints
        const remediationHints = this.getRemediationHints(dimension.dimension, severity);

        // Build evidence from dimension
        const evidence = [...dimension.evidence, `Current score: ${scoreObserved}/100`, `Expected score: ${scoreExpected}/100`];

        return {
            id,
            dimension: dimension.dimension,
            severity,
            scoreObserved,
            scoreExpected,
            description,
            evidence,
            remediationHints,
        };
    }

    /**
     * Generate deterministic gap ID using SHA-256
     *
     * Formula: sha256(dimension + scoreObserved + scoreExpected)
     *
     * This ensures:
     * - Same gap always has same ID
     * - Different gaps have different IDs
     * - Gap IDs are trackable across reports
     *
     * @param dimension Governance dimension
     * @param scoreObserved Current score
     * @param scoreExpected Target score
     * @returns SHA-256 hash as hex string
     */
    private generateGapId(dimension: GovernanceDimension, scoreObserved: number, scoreExpected: number): string {
        const input = `${dimension}:${scoreObserved}:${scoreExpected}`;
        return createHash('sha256').update(input).digest('hex');
    }

    /**
     * Generate human-readable gap description
     *
     * @param dimension Governance dimension
     * @param scoreObserved Current score
     * @param severity Gap severity
     * @returns Description string
     */
    private generateGapDescription(dimension: GovernanceDimension, scoreObserved: number, severity: ControlGapSeverity): string {
        const dimensionName = this.formatDimensionName(dimension);
        const severityLabel = severity === 'HIGH' ? 'Critical' : severity === 'MEDIUM' ? 'Moderate' : 'Minor';

        return `${severityLabel} gap in ${dimensionName} (score: ${scoreObserved}/100, expected: ${PRODUCTION_READINESS_THRESHOLD}/100)`;
    }

    /**
     * Format dimension name for human readability
     *
     * @param dimension Governance dimension
     * @returns Formatted name
     */
    private formatDimensionName(dimension: GovernanceDimension): string {
        return dimension
            .split('_')
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Get remediation hints for dimension and severity
     *
     * Returns top hints based on severity:
     * - HIGH: All hints
     * - MEDIUM: Top 3 hints
     * - LOW: Top 2 hints
     *
     * @param dimension Governance dimension
     * @param severity Gap severity
     * @returns Array of remediation hints
     */
    private getRemediationHints(dimension: GovernanceDimension, severity: ControlGapSeverity): string[] {
        const allHints = REMEDIATION_HINTS[dimension];

        switch (severity) {
            case 'HIGH':
                return allHints; // All hints for critical gaps
            case 'MEDIUM':
                return allHints.slice(0, 3); // Top 3 hints
            case 'LOW':
                return allHints.slice(0, 2); // Top 2 hints
            default:
                return allHints;
        }
    }

    /**
     * Sort gaps by severity
     *
     * Order: HIGH → MEDIUM → LOW
     * Within same severity, sort by dimension name
     *
     * @param gaps Unsorted control gaps
     * @returns Sorted control gaps
     */
    private sortGapsBySeverity(gaps: ControlGap[]): ControlGap[] {
        const severityOrder: Record<ControlGapSeverity, number> = {
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
        };

        return [...gaps].sort((a, b) => {
            // First sort by severity
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) {
                return severityDiff;
            }

            // Then sort by dimension name
            return a.dimension.localeCompare(b.dimension);
        });
    }

    /**
     * Calculate gap summary statistics
     *
     * @param gaps Control gaps
     * @returns Summary statistics
     */
    private calculateGapSummary(gaps: ControlGap[]): {
        total: number;
        high: number;
        medium: number;
        low: number;
    } {
        return {
            total: gaps.length,
            high: gaps.filter((g) => g.severity === 'HIGH').length,
            medium: gaps.filter((g) => g.severity === 'MEDIUM').length,
            low: gaps.filter((g) => g.severity === 'LOW').length,
        };
    }
}
