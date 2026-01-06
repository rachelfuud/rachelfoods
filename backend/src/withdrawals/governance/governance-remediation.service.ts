/**
 * SPRINT 19 – PHASE 3: Governance Remediation Readiness & Impact Forecast Service
 * 
 * PURPOSE:
 * Generate deterministic "what-if" remediation forecasts for governance gaps.
 * 
 * FORECAST APPROACH:
 * - Rule-based arithmetic only (no ML, no probabilities)
 * - Deterministic action IDs (SHA-256)
 * - Advisory-only positioning (no enforcement mandates)
 * 
 * QUALITY STANDARD:
 * Regulator-explainable remediation impact forecasting.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    GovernanceRemediationAction,
    GovernanceRemediationForecast,
    DimensionScoreDelta,
    ForecastAssumption,
    ForecastLimitation,
    RemediationActionCategory,
    REMEDIATION_FORECAST_DISCLAIMER,
    REMEDIATION_ACTION_DISCLAIMER,
    ACTION_CATEGORY_DESCRIPTIONS,
    GAP_SEVERITY_DELTA_MAP,
    MAX_DIMENSION_SCORE,
    MATURITY_STAGE_THRESHOLDS,
    ACTION_RISK_MAP,
    capDimensionScore,
    calculateOverallScore,
    sortActionsByImpact,
} from './governance-remediation.types';
import { ControlGap } from './control-gap.types';
import { GovernanceDimension } from './governance-readiness.types';
import {
    GovernanceGapAttribution,
    GapSeverity,
    GovernanceGapRootCause as RootCauseCategory,
} from './governance-attribution.types';
import { GovernanceMaturityStage, GovernanceTimelineEvent } from './governance-timeline.types';
import { GovernanceReadinessService } from './governance-readiness.service';
import { ControlGapService } from './control-gap.service';
import { GovernanceAttributionService } from './governance-attribution.service';
import { GovernanceTimelineService } from './governance-timeline.service';

/**
 * Remediation Forecast Service
 * 
 * Generates "what-if" remediation forecasts showing projected governance impact
 * if control gaps are addressed.
 */
@Injectable()
export class GovernanceRemediationService {
    private readonly logger = new Logger(GovernanceRemediationService.name);

    constructor(
        private readonly readinessService: GovernanceReadinessService,
        private readonly gapService: ControlGapService,
        private readonly attributionService: GovernanceAttributionService,
        private readonly timelineService: GovernanceTimelineService,
    ) { }

    /**
     * Generate Remediation Forecast
     * 
     * Creates hypothetical "what-if" forecast showing governance impact
     * if current control gaps are addressed.
     * 
     * INPUTS:
     * - Current readiness scores (Sprint 17 Phase 1)
     * - Current control gaps (Sprint 17 Phase 2)
     * - Gap attributions (Sprint 19 Phase 2)
     * - Timeline events (Sprint 19 Phase 1)
     * 
     * OUTPUTS:
     * - Remediation actions (one+ per gap)
     * - Projected dimension score deltas
     * - Projected maturity stage
     * - Explicit assumptions and limitations
     * 
     * DETERMINISM GUARANTEE:
     * Same inputs → same forecast (deterministic)
     */
    async generateRemediationForecast(): Promise<GovernanceRemediationForecast> {
        this.logger.log('Generating remediation forecast (deterministic, rule-based)');

        // Step 1: Get current baseline state
        const readiness = await this.readinessService.generateReadinessSnapshot();
        const gapReport = await this.gapService.generateControlGapReport();
        const attributionReport = await this.attributionService.generateAttributionReport();
        const timelineReport = await this.timelineService.generateGovernanceTimeline();

        const gaps = [...gapReport.gaps]; // Convert readonly to mutable array
        const attributions = [...attributionReport.attributions];
        const timeline = [...timelineReport.events];

        // Import assessGovernanceMaturity to get maturity stage
        const { assessGovernanceMaturity } = await import('./governance-maturity.util');
        const maturityAssessment = assessGovernanceMaturity(timelineReport);
        const baselineMaturityStage = maturityAssessment.currentStage;
        const baselineScore = readiness.overallScore;

        this.logger.debug(
            `Baseline: ${baselineMaturityStage} maturity, ${baselineScore} overall score, ${gaps.length} gaps`
        );

        // Step 2: Generate remediation actions for each gap
        const actions = await this.generateRemediationActions(gaps, attributions, timeline);

        this.logger.debug(`Generated ${actions.length} remediation actions`);

        // Step 3: Project dimension score deltas
        const deltasByDimension = this.projectDimensionDeltas([...readiness.dimensions], actions);

        // Step 4: Calculate projected overall score
        const projectedDimensionScores = deltasByDimension.map(d => d.projectedScore);
        const projectedScore = calculateOverallScore(projectedDimensionScores);

        // Step 5: Project maturity stage after remediation
        const projectedMaturityStage = this.projectMaturityStage(deltasByDimension, actions);

        // Step 6: Define explicit assumptions
        const assumptions = this.getForecastAssumptions();

        // Step 7: Define explicit limitations
        const limitations = this.getForecastLimitations();

        const forecast: GovernanceRemediationForecast = {
            generatedAt: new Date().toISOString(),
            baselineMaturityStage,
            projectedMaturityStage,
            baselineScore,
            projectedScore,
            overallDelta: projectedScore - baselineScore,
            deltasByDimension,
            actionsConsidered: sortActionsByImpact(actions),
            assumptions,
            limitations,
            disclaimer: REMEDIATION_FORECAST_DISCLAIMER,
        };

        this.logger.log(
            `Forecast complete: ${baselineMaturityStage} → ${projectedMaturityStage}, ` +
            `${baselineScore} → ${projectedScore} (+${forecast.overallDelta})`
        );

        return forecast;
    }

    /**
     * Generate Remediation Actions
     * 
     * Creates one+ remediation actions for each control gap.
     * 
     * ACTION GENERATION RULES:
     * - One action per gap (primary remediation)
     * - actionCategory mapped from gap dimension and root cause
     * - expectedDimensionDelta from gap severity (GAP_SEVERITY_DELTA_MAP)
     * - prerequisiteCapabilities identified from timeline
     * - riskLevel from ACTION_RISK_MAP
     * 
     * DETERMINISM:
     * actionId = SHA-256(targetGapId + actionCategory + description)
     */
    private async generateRemediationActions(
        gaps: ControlGap[],
        attributions: GovernanceGapAttribution[],
        timeline: GovernanceTimelineEvent[],
    ): Promise<GovernanceRemediationAction[]> {
        const actions: GovernanceRemediationAction[] = [];

        for (const gap of gaps) {
            // Find attribution for this gap
            const attribution = attributions.find(a => a.gapId === gap.id);

            // Determine action category from gap dimension and root cause
            const actionCategory = this.mapToActionCategory(gap.dimension, attribution?.rootCauseCategory);

            // Generate description (neutral, advisory language)
            const description = this.generateActionDescription(gap, actionCategory);

            // Calculate expected delta from gap severity
            const expectedDimensionDelta = GAP_SEVERITY_DELTA_MAP[gap.severity];

            // Identify prerequisite capabilities
            const prerequisiteCapabilities = this.identifyPrerequisiteCapabilities(
                gap,
                attribution,
                timeline
            );

            // Determine risk level from action category
            const riskLevel = ACTION_RISK_MAP[actionCategory];

            // Generate deterministic action ID
            const actionId = this.generateActionId(gap.id, actionCategory, description);

            const action: GovernanceRemediationAction = {
                actionId,
                targetGapId: gap.id,
                targetDimension: gap.dimension,
                targetGapSeverity: gap.severity,
                actionCategory,
                description,
                prerequisiteCapabilities,
                expectedDimensionDelta,
                riskLevel,
                disclaimer: REMEDIATION_ACTION_DISCLAIMER,
            };

            actions.push(action);
        }

        return actions;
    }

    /**
     * Map gap dimension and root cause to action category
     */
    private mapToActionCategory(
        dimension: GovernanceDimension,
        rootCause?: RootCauseCategory
    ): RemediationActionCategory {
        // Prioritize root cause if available
        if (rootCause) {
            const categoryMap: Record<RootCauseCategory, RemediationActionCategory> = {
                SIGNAL_COVERAGE: 'SIGNAL_EXPANSION',
                ESCALATION_VISIBILITY: 'ESCALATION_TUNING',
                DECISION_TRACEABILITY: 'DECISION_INSTRUMENTATION',
                POLICY_DEFINITION: 'POLICY_DEFINITION',
                POLICY_ENFORCEMENT_GUARDRAIL: 'POLICY_GUARDRAIL_STRENGTHENING',
                OBSERVABILITY_SATURATION: 'OBSERVABILITY_REBALANCING',
            };

            return categoryMap[rootCause];
        }

        // Fallback: map from dimension
        const dimensionMap: Record<GovernanceDimension, RemediationActionCategory> = {
            RISK_COVERAGE: 'SIGNAL_EXPANSION',
            ESCALATION_VISIBILITY: 'ESCALATION_TUNING',
            ADMIN_DECISION_TRACEABILITY: 'DECISION_INSTRUMENTATION',
            INCIDENT_RECONSTRUCTABILITY: 'OBSERVABILITY_REBALANCING',
            ALERT_SATURATION: 'OBSERVABILITY_REBALANCING',
            SIEM_EXPORT_READINESS: 'OBSERVABILITY_REBALANCING',
        };

        return dimensionMap[dimension];
    }

    /**
     * Generate neutral, advisory action description
     * 
     * LANGUAGE REQUIREMENTS:
     * - Use advisory verbs (consider, review, evaluate)
     * - Avoid enforcement verbs (must, enforce, require)
     * - Neutral, regulator-safe language
     */
    private generateActionDescription(
        gap: ControlGap,
        category: RemediationActionCategory
    ): string {
        const categoryDescription = ACTION_CATEGORY_DESCRIPTIONS[category];
        const dimensionContext = this.formatDimensionContext(gap.dimension);

        return `Consider ${categoryDescription.toLowerCase()} for ${dimensionContext}. ${gap.description}`;
    }

    /**
     * Format dimension context for description
     */
    private formatDimensionContext(dimension: GovernanceDimension): string {
        const contextMap: Record<GovernanceDimension, string> = {
            RISK_COVERAGE: 'risk monitoring coverage',
            ESCALATION_VISIBILITY: 'escalation monitoring completeness',
            ADMIN_DECISION_TRACEABILITY: 'decision documentation practices',
            INCIDENT_RECONSTRUCTABILITY: 'incident reconstruction capability',
            ALERT_SATURATION: 'alert volume management',
            SIEM_EXPORT_READINESS: 'SIEM export readiness',
        };

        return contextMap[dimension];
    }

    /**
     * Identify prerequisite capabilities
     * 
     * Capabilities (timeline events) that must exist before action is viable.
     */
    private identifyPrerequisiteCapabilities(
        gap: ControlGap,
        attribution: GovernanceGapAttribution | undefined,
        timeline: GovernanceTimelineEvent[],
    ): string[] {
        if (!attribution) return [];

        // Use attribution's linked timeline events as prerequisites
        return attribution.linkedTimelineEvents.map(e => e.eventId);
    }

    /**
     * Generate deterministic action ID
     * 
     * Formula: SHA-256(targetGapId + actionCategory + description)
     */
    private generateActionId(
        gapId: string,
        category: RemediationActionCategory,
        description: string
    ): string {
        const hash = createHash('sha256');
        hash.update(gapId);
        hash.update(category);
        hash.update(description);
        return hash.digest('hex');
    }

    /**
     * Project Dimension Deltas
     * 
     * Calculate projected score changes for each dimension after remediation.
     * 
     * PROJECTION RULES:
     * - Sum expectedDimensionDelta for all actions targeting dimension
     * - Cap projected score at MAX_DIMENSION_SCORE (100)
     * - Linear summation with hard cap (no diminishing returns math)
     */
    private projectDimensionDeltas(
        dimensions: Array<{ dimension: GovernanceDimension; score: number }>,
        actions: GovernanceRemediationAction[]
    ): DimensionScoreDelta[] {
        return dimensions.map(dimScore => {
            const dimension = dimScore.dimension;
            const baselineScore = dimScore.score;

            // Find all actions targeting this dimension
            const relevantActions = actions.filter(a => a.targetDimension === dimension);

            // Sum deltas (linear summation)
            const totalDelta = relevantActions.reduce((sum, action) => sum + action.expectedDimensionDelta, 0);

            // Cap projected score
            const projectedScore = capDimensionScore(baselineScore + totalDelta);

            // Calculate actual delta (may be less than totalDelta due to capping)
            const actualDelta = projectedScore - baselineScore;

            return {
                dimension,
                baselineScore,
                projectedScore,
                delta: actualDelta,
                contributingActions: relevantActions.map(a => a.actionId),
            };
        });
    }

    /**
     * Project Maturity Stage
     * 
     * Determine projected maturity stage after remediation using rule-based classification.
     * 
     * CLASSIFICATION RULES (from MATURITY_STAGE_THRESHOLDS):
     * - AUDIT_READY: No HIGH gaps + all dimensions ≥ 80
     * - GOVERNED: All dimensions ≥ 60
     * - STRUCTURED: At least 4 dimensions ≥ 40
     * - FOUNDATIONAL: Baseline (all others)
     */
    private projectMaturityStage(
        deltasByDimension: DimensionScoreDelta[],
        actions: GovernanceRemediationAction[]
    ): GovernanceMaturityStage {
        const projectedScores = deltasByDimension.map(d => d.projectedScore);

        // Check AUDIT_READY criteria
        const hasHighGaps = actions.some(a => a.targetGapSeverity === 'HIGH');
        const allDimensionsAbove80 = projectedScores.every(
            score => score >= MATURITY_STAGE_THRESHOLDS.AUDIT_READY.minDimensionScore
        );

        if (!hasHighGaps && allDimensionsAbove80) {
            return 'AUDIT_READY';
        }

        // Check GOVERNED criteria
        const allDimensionsAbove60 = projectedScores.every(
            score => score >= MATURITY_STAGE_THRESHOLDS.GOVERNED.minDimensionScore
        );

        if (allDimensionsAbove60) {
            return 'GOVERNED';
        }

        // Check STRUCTURED criteria
        const dimensionsAbove40 = projectedScores.filter(
            score => score >= MATURITY_STAGE_THRESHOLDS.STRUCTURED.minDimensionScore
        ).length;

        if (dimensionsAbove40 >= MATURITY_STAGE_THRESHOLDS.STRUCTURED.minDimensionsAboveThreshold) {
            return 'STRUCTURED';
        }

        // Fallback: FOUNDATIONAL
        return 'FOUNDATIONAL';
    }

    /**
     * Get Forecast Assumptions
     * 
     * Explicit assumptions underlying forecast.
     */
    private getForecastAssumptions(): ForecastAssumption[] {
        return [
            {
                description: 'Remediation actions succeed as described',
                impactIfViolated: 'Projected score improvements may not materialize',
            },
            {
                description: 'No new gaps emerge during remediation',
                impactIfViolated: 'Actual score may be lower than projected',
            },
            {
                description: 'Prerequisite capabilities remain operational',
                impactIfViolated: 'Some actions may not be viable',
            },
            {
                description: 'Score deltas are arithmetic estimates only (no ML, no probabilities)',
                impactIfViolated: 'Actual deltas may differ from projections',
            },
            {
                description: 'Maturity stage classification uses static thresholds',
                impactIfViolated: 'Stage transitions may not occur as projected',
            },
        ];
    }

    /**
     * Get Forecast Limitations
     * 
     * Explicit limitations of forecast.
     */
    private getForecastLimitations(): ForecastLimitation[] {
        return [
            {
                description: 'Forecast does NOT account for resource availability',
                mitigation: 'Assess feasibility and resource requirements separately',
            },
            {
                description: 'Forecast does NOT prioritize remediation actions',
                mitigation: 'Use risk level and expected delta for prioritization guidance',
            },
            {
                description: 'Forecast does NOT guarantee compliance certification',
                mitigation: 'Consult compliance experts for certification requirements',
            },
            {
                description: 'Forecast uses linear delta summation (no diminishing returns model)',
                mitigation: 'Actual improvements may be non-linear; monitor and adjust',
            },
            {
                description: 'Forecast is advisory only — NOT enforcement mandate',
                mitigation: 'Require explicit executive authorization before implementation',
            },
        ];
    }
}
