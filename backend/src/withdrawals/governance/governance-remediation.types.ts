/**
 * SPRINT 19 – PHASE 3: Governance Remediation Readiness & Impact Forecast
 * 
 * PURPOSE:
 * Deterministic "what-if" remediation impact forecasting for governance gaps.
 * Answers: "If we address gaps, what measurable governance impact should we expect?"
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no enforcement, no automation)
 * - RULE-BASED ARITHMETIC (no ML, no probabilities)
 * - ADVISORY-ONLY (no remediation mandates)
 * - DETERMINISTIC (SHA-256 action IDs)
 * 
 * QUALITY STANDARD:
 * Regulator-safe remediation planning suitable for executive "what-if" analysis.
 */

import { GapSeverity } from './governance-attribution.types';
import { GovernanceDimension } from './governance-readiness.types';
import { GovernanceMaturityStage } from './governance-timeline.types';

/**
 * Remediation Action Category
 * 
 * Classifies type of remediation action addressing a governance gap.
 * 
 * CATEGORIES (6 Total):
 * - SIGNAL_EXPANSION: Expand governance signal detection coverage
 * - ESCALATION_TUNING: Improve escalation routing and monitoring
 * - DECISION_INSTRUMENTATION: Enhance decision capture and audit trails
 * - POLICY_DEFINITION: Define or expand governance policies
 * - POLICY_GUARDRAIL_STRENGTHENING: Strengthen policy enforcement mechanisms
 * - OBSERVABILITY_REBALANCING: Rebalance observability and alert coverage
 */
export type RemediationActionCategory =
    | 'SIGNAL_EXPANSION'
    | 'ESCALATION_TUNING'
    | 'DECISION_INSTRUMENTATION'
    | 'POLICY_DEFINITION'
    | 'POLICY_GUARDRAIL_STRENGTHENING'
    | 'OBSERVABILITY_REBALANCING';

/**
 * Remediation Risk Level
 * 
 * Indicates operational risk of implementing remediation action.
 */
export type RemediationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Governance Remediation Action
 * 
 * Hypothetical remediation action for a specific control gap.
 * 
 * DETERMINISM GUARANTEE:
 * actionId = SHA-256(targetGapId + actionCategory + description)
 * Same inputs → same actionId
 * 
 * ADVISORY POSITIONING:
 * Actions are hypothetical recommendations only — NOT mandates or automation triggers.
 */
export interface GovernanceRemediationAction {
    /**
     * Deterministic action identifier
     * Formula: SHA-256(targetGapId + actionCategory + description)
     */
    readonly actionId: string;

    /**
     * Target gap ID (from Sprint 17 Phase 2)
     */
    readonly targetGapId: string;

    /**
     * Target governance dimension
     */
    readonly targetDimension: GovernanceDimension;

    /**
     * Target gap severity
     */
    readonly targetGapSeverity: GapSeverity;

    /**
     * Remediation action category
     */
    readonly actionCategory: RemediationActionCategory;

    /**
     * Neutral, advisory description of remediation action
     * MUST use advisory language (consider, review, evaluate)
     */
    readonly description: string;

    /**
     * Prerequisite capabilities (timeline event IDs)
     * Capabilities that must exist before this action is viable
     */
    readonly prerequisiteCapabilities: readonly string[];

    /**
     * Expected dimension score delta (0-100 range)
     * Arithmetic-only projection (no ML, no probabilities)
     * Capped to ensure total dimension score ≤ 100
     */
    readonly expectedDimensionDelta: number;

    /**
     * Operational risk level of implementing this action
     */
    readonly riskLevel: RemediationRiskLevel;

    /**
     * Mandatory advisory disclaimer for this action
     */
    readonly disclaimer: string;
}

/**
 * Dimension Score Delta
 * 
 * Projected score change for a governance dimension.
 */
export interface DimensionScoreDelta {
    /**
     * Governance dimension
     */
    readonly dimension: GovernanceDimension;

    /**
     * Current baseline score (0-100)
     */
    readonly baselineScore: number;

    /**
     * Projected score after remediation (0-100, capped)
     */
    readonly projectedScore: number;

    /**
     * Score delta (+/-)
     */
    readonly delta: number;

    /**
     * Contributing remediation actions
     */
    readonly contributingActions: readonly string[]; // actionIds
}

/**
 * Forecast Assumption
 * 
 * Explicit assumption underlying remediation forecast.
 */
export interface ForecastAssumption {
    /**
     * Assumption description
     */
    readonly description: string;

    /**
     * Impact if assumption violated
     */
    readonly impactIfViolated: string;
}

/**
 * Forecast Limitation
 * 
 * Explicit limitation of remediation forecast.
 */
export interface ForecastLimitation {
    /**
     * Limitation description
     */
    readonly description: string;

    /**
     * Recommended mitigation
     */
    readonly mitigation: string;
}

/**
 * Governance Remediation Forecast
 * 
 * Complete "what-if" forecast of governance impact if gaps remediated.
 * 
 * USAGE:
 * - Executive remediation planning
 * - Board "what-if" analysis
 * - Regulator remediation discussions
 * - Governance investment justification
 * 
 * ADVISORY POSITIONING:
 * Forecast is hypothetical and non-binding — NOT enforcement or automation mandate.
 */
export interface GovernanceRemediationForecast {
    /**
     * Forecast generation timestamp (ISO 8601)
     */
    readonly generatedAt: string;

    /**
     * Baseline (current) maturity stage
     */
    readonly baselineMaturityStage: GovernanceMaturityStage;

    /**
     * Projected maturity stage after remediation
     * Rule-based classification (no ML)
     */
    readonly projectedMaturityStage: GovernanceMaturityStage;

    /**
     * Baseline (current) overall governance score (0-100)
     */
    readonly baselineScore: number;

    /**
     * Projected overall governance score after remediation (0-100, capped)
     */
    readonly projectedScore: number;

    /**
     * Overall score delta
     */
    readonly overallDelta: number;

    /**
     * Projected score changes by dimension
     */
    readonly deltasByDimension: readonly DimensionScoreDelta[];

    /**
     * Remediation actions considered in forecast
     * Sorted by expected impact (highest delta first)
     */
    readonly actionsConsidered: readonly GovernanceRemediationAction[];

    /**
     * Explicit assumptions underlying forecast
     */
    readonly assumptions: readonly ForecastAssumption[];

    /**
     * Explicit limitations of forecast
     */
    readonly limitations: readonly ForecastLimitation[];

    /**
     * Mandatory advisory disclaimer
     */
    readonly disclaimer: string;
}

/**
 * Mandatory Remediation Forecast Disclaimer
 * 
 * LEGAL POSITIONING:
 * Forecast is advisory, hypothetical, and non-binding — NOT enforcement mandate.
 */
export const REMEDIATION_FORECAST_DISCLAIMER =
    'This forecast is advisory, hypothetical, and non-binding. ' +
    'It does NOT mandate remediation actions, authorize automation, or certify compliance. ' +
    'Projected scores are arithmetic estimates only (no ML, no probabilities). ' +
    'Actual outcomes may differ. Use for governance planning and regulator dialogue only.';

/**
 * Mandatory Remediation Action Disclaimer
 * 
 * LEGAL POSITIONING:
 * Actions are advisory recommendations only — NOT enforcement mandates.
 */
export const REMEDIATION_ACTION_DISCLAIMER =
    'This action is an advisory recommendation only. ' +
    'It does NOT mandate implementation, authorize automation, or replace human judgment. ' +
    'Implementation requires explicit executive authorization.';

/**
 * Action Category Descriptions
 * 
 * Human-readable definitions for each action category.
 */
export const ACTION_CATEGORY_DESCRIPTIONS: Record<RemediationActionCategory, string> = {
    SIGNAL_EXPANSION:
        'Expand governance signal detection coverage. ' +
        'Add new signals or broaden existing signal capture.',

    ESCALATION_TUNING:
        'Improve escalation routing and monitoring. ' +
        'Clarify escalation paths or enhance escalation visibility.',

    DECISION_INSTRUMENTATION:
        'Enhance decision capture and audit trails. ' +
        'Add decision documentation or improve traceability.',

    POLICY_DEFINITION:
        'Define or expand governance policies. ' +
        'Formalize policies or clarify policy specifications.',

    POLICY_GUARDRAIL_STRENGTHENING:
        'Strengthen policy enforcement mechanisms. ' +
        'Add enforcement guardrails or enhance policy compliance checks.',

    OBSERVABILITY_REBALANCING:
        'Rebalance observability and alert coverage. ' +
        'Adjust monitoring depth/breadth or tune alert thresholds.',
};

/**
 * STATIC FORECAST RULES (Mandatory, Regulator-Explainable)
 * 
 * These rules govern how gap closure translates to dimension score improvements.
 * All rules are arithmetic-only (no ML, no probabilities).
 * 
 * RULE 1: Gap Severity → Dimension Delta
 * - HIGH gap closure: +20 points to dimension (max once per gap)
 * - MEDIUM gap closure: +10 points to dimension
 * - LOW gap closure: +5 points to dimension
 * 
 * RULE 2: Dimension Score Capping
 * - All dimension scores capped at 100 (no overflow)
 * - Overall score = average of dimension scores (capped at 100)
 * 
 * RULE 3: Diminishing Returns
 * - Multiple actions on same dimension sum linearly until cap
 * - Cap prevents unrealistic score inflation
 * 
 * RULE 4: Maturity Stage Projection (Rule-Based)
 * - AUDIT_READY requires:
 *   * No HIGH severity gaps
 *   * All dimensions ≥ 80
 * - GOVERNED requires:
 *   * No CRITICAL policy failures
 *   * All dimensions ≥ 60
 * - STRUCTURED requires:
 *   * At least 4 dimensions ≥ 40
 * - FOUNDATIONAL: Baseline (all others)
 * 
 * RULE 5: Action Risk Classification
 * - SIGNAL_EXPANSION: LOW risk (additive capability)
 * - POLICY_DEFINITION: LOW risk (declarative rules)
 * - ESCALATION_TUNING: MEDIUM risk (routing changes)
 * - DECISION_INSTRUMENTATION: MEDIUM risk (process changes)
 * - OBSERVABILITY_REBALANCING: MEDIUM risk (monitoring adjustments)
 * - POLICY_GUARDRAIL_STRENGTHENING: HIGH risk (enforcement changes)
 */

/**
 * Gap severity to dimension delta mapping (Rule 1)
 */
export const GAP_SEVERITY_DELTA_MAP: Record<GapSeverity, number> = {
    HIGH: 20,
    MEDIUM: 10,
    LOW: 5,
};

/**
 * Dimension score maximum (Rule 2)
 */
export const MAX_DIMENSION_SCORE = 100;

/**
 * Maturity stage thresholds (Rule 4)
 */
export const MATURITY_STAGE_THRESHOLDS = {
    AUDIT_READY: {
        minDimensionScore: 80,
        maxHighGaps: 0,
        description: 'No HIGH gaps, all dimensions ≥ 80',
    },
    GOVERNED: {
        minDimensionScore: 60,
        minDimensionsAboveThreshold: 6,
        description: 'All dimensions ≥ 60',
    },
    STRUCTURED: {
        minDimensionScore: 40,
        minDimensionsAboveThreshold: 4,
        description: 'At least 4 dimensions ≥ 40',
    },
    FOUNDATIONAL: {
        description: 'Baseline maturity',
    },
};

/**
 * Action risk level mapping (Rule 5)
 */
export const ACTION_RISK_MAP: Record<RemediationActionCategory, RemediationRiskLevel> = {
    SIGNAL_EXPANSION: 'LOW',
    POLICY_DEFINITION: 'LOW',
    ESCALATION_TUNING: 'MEDIUM',
    DECISION_INSTRUMENTATION: 'MEDIUM',
    OBSERVABILITY_REBALANCING: 'MEDIUM',
    POLICY_GUARDRAIL_STRENGTHENING: 'HIGH',
};

/**
 * Helper: Format action category for display
 */
export function formatActionCategory(category: RemediationActionCategory): string {
    return category
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Helper: Calculate capped dimension score
 * Ensures score never exceeds MAX_DIMENSION_SCORE
 */
export function capDimensionScore(score: number): number {
    return Math.min(Math.max(0, score), MAX_DIMENSION_SCORE);
}

/**
 * Helper: Calculate overall governance score
 * Average of all dimension scores, capped at MAX_DIMENSION_SCORE
 */
export function calculateOverallScore(dimensionScores: number[]): number {
    if (dimensionScores.length === 0) return 0;
    const average = dimensionScores.reduce((sum, score) => sum + score, 0) / dimensionScores.length;
    return capDimensionScore(average);
}

/**
 * Helper: Check if high severity gap exists
 */
export function hasHighSeverityGap(actions: readonly GovernanceRemediationAction[]): boolean {
    return actions.some(action => action.targetGapSeverity === 'HIGH');
}

/**
 * Helper: Sort actions by expected impact (highest delta first)
 */
export function sortActionsByImpact(
    actions: readonly GovernanceRemediationAction[]
): GovernanceRemediationAction[] {
    return [...actions].sort((a, b) => b.expectedDimensionDelta - a.expectedDimensionDelta);
}
