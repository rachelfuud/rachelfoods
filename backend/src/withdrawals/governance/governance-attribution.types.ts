/**
 * SPRINT 19 – PHASE 2: Governance Gap-to-Timeline Attribution
 * 
 * PURPOSE:
 * Deterministic mapping between control gaps and governance timeline events.
 * Answers: "Where are remaining governance weaknesses, and exactly where do they originate?"
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no remediation automation)
 * - RULE-BASED (no inference, no ML)
 * - EVIDENCE-BACKED (links to concrete timeline events)
 * - ADVISORY-ONLY (no enforcement, no compliance certification)
 * 
 * QUALITY STANDARD:
 * Regulator-grade gap explainability suitable for audits and executive reporting.
 */

import { GovernanceTimelineEvent } from './governance-timeline.types';

/**
 * Root Cause Category
 * 
 * Classifies why a governance gap exists based on timeline analysis.
 * 
 * CATEGORIES:
 * - SIGNAL_COVERAGE: Missing or incomplete governance signal detection
 * - ESCALATION_VISIBILITY: Insufficient escalation routing or monitoring
 * - DECISION_TRACEABILITY: Inadequate decision capture or audit trail
 * - POLICY_DEFINITION: Missing or incomplete policy definitions
 * - POLICY_ENFORCEMENT_GUARDRAIL: Weak policy enforcement or guardrails
 * - OBSERVABILITY_SATURATION: Insufficient observability or alert coverage
 */
export type GovernanceGapRootCause =
    | 'SIGNAL_COVERAGE'
    | 'ESCALATION_VISIBILITY'
    | 'DECISION_TRACEABILITY'
    | 'POLICY_DEFINITION'
    | 'POLICY_ENFORCEMENT_GUARDRAIL'
    | 'OBSERVABILITY_SATURATION';

/**
 * Gap Severity Level
 * 
 * Indicates urgency of gap remediation.
 */
export type GapSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Governance Dimension
 * 
 * From Sprint 17 Phase 2 (Control Gaps)
 */
export type GovernanceDimension =
    | 'RISK_COVERAGE'
    | 'ESCALATION_VISIBILITY'
    | 'ADMIN_DECISION_TRACEABILITY'
    | 'INCIDENT_RESPONSE_CAPABILITY'
    | 'POLICY_SIMULATION'
    | 'AUTOMATION_SAFETY_GUARDRAILS';

/**
 * Linked Timeline Event Reference
 * 
 * Reference to a specific timeline event explaining gap origin.
 */
export interface LinkedTimelineEventRef {
    /**
     * Timeline event ID (from Sprint 19 Phase 1)
     */
    readonly eventId: string;

    /**
     * Source sprint number
     */
    readonly sourceSprint: number;

    /**
     * Event title
     */
    readonly title: string;

    /**
     * Relationship explanation
     * How this event relates to the gap
     */
    readonly relationshipExplanation: string;
}

/**
 * Governance Gap Attribution
 * 
 * Deterministic mapping from control gap to timeline events.
 * 
 * DETERMINISM GUARANTEE:
 * attributionId = SHA-256(gapId + rootCauseCategory + sorted_eventIds)
 * Same inputs → same attributionId
 */
export interface GovernanceGapAttribution {
    /**
     * Deterministic attribution identifier
     * Formula: SHA-256(gapId + rootCauseCategory + sorted_eventIds)
     */
    readonly attributionId: string;

    /**
     * Control gap ID (from Sprint 17 Phase 2)
     */
    readonly gapId: string;

    /**
     * Governance dimension affected
     */
    readonly dimension: GovernanceDimension;

    /**
     * Gap severity
     */
    readonly severity: GapSeverity;

    /**
     * Timeline events explaining gap origin
     * Chronologically ordered (oldest first)
     */
    readonly linkedTimelineEvents: readonly LinkedTimelineEventRef[];

    /**
     * Root cause category
     * Single category per gap (highest priority if multiple apply)
     */
    readonly rootCauseCategory: GovernanceGapRootCause;

    /**
     * Factual, evidence-backed explanation
     * MUST reference specific timeline events
     */
    readonly explanation: string;

    /**
     * Non-prescriptive remediation context
     * Advisory guidance only (not enforcement)
     */
    readonly remediationContext: string;
}

/**
 * Governance Attribution Summary
 * 
 * Aggregated statistics about gap attributions.
 */
export interface GovernanceAttributionSummary {
    /**
     * Total number of gaps with attributions
     */
    readonly totalGaps: number;

    /**
     * Gaps grouped by severity
     */
    readonly gapsBySeverity: {
        readonly HIGH: number;
        readonly MEDIUM: number;
        readonly LOW: number;
    };

    /**
     * Gaps grouped by root cause
     */
    readonly gapsByRootCause: {
        readonly SIGNAL_COVERAGE: number;
        readonly ESCALATION_VISIBILITY: number;
        readonly DECISION_TRACEABILITY: number;
        readonly POLICY_DEFINITION: number;
        readonly POLICY_ENFORCEMENT_GUARDRAIL: number;
        readonly OBSERVABILITY_SATURATION: number;
    };

    /**
     * Gaps grouped by dimension
     */
    readonly gapsByDimension: {
        readonly RISK_COVERAGE: number;
        readonly ESCALATION_VISIBILITY: number;
        readonly ADMIN_DECISION_TRACEABILITY: number;
        readonly INCIDENT_RESPONSE_CAPABILITY: number;
        readonly POLICY_SIMULATION: number;
        readonly AUTOMATION_SAFETY_GUARDRAILS: number;
    };
}

/**
 * Governance Attribution Report
 * 
 * Complete gap-to-timeline attribution analysis.
 * 
 * USAGE:
 * - Executive understanding of gap origins
 * - Regulator audit explainability
 * - Remediation planning context
 * - Board reporting on governance weaknesses
 */
export interface GovernanceAttributionReport {
    /**
     * Report generation timestamp (ISO 8601)
     */
    readonly generatedAt: string;

    /**
     * Current governance maturity stage (from Phase 1)
     */
    readonly maturityStage: string;

    /**
     * Gap attributions (sorted by severity: HIGH → MEDIUM → LOW)
     */
    readonly attributions: readonly GovernanceGapAttribution[];

    /**
     * Aggregated attribution statistics
     */
    readonly summary: GovernanceAttributionSummary;

    /**
     * Mandatory advisory disclaimer
     */
    readonly disclaimer: string;
}

/**
 * Mandatory Advisory Disclaimer
 * 
 * LEGAL POSITIONING:
 * Attributions are explanatory mappings only — not findings, enforcement, or compliance certification.
 */
export const GOVERNANCE_ATTRIBUTION_DISCLAIMER =
    'Attributions are explanatory mappings only and do NOT constitute findings, enforcement actions, or compliance determinations. ' +
    'This report provides context for gap remediation planning and does NOT authorize automation or certify compliance. ' +
    'Use for audit evidence, executive reporting, and governance planning only.';

/**
 * Root Cause Category Descriptions
 * 
 * Human-readable definitions for each root cause category.
 */
export const ROOT_CAUSE_DESCRIPTIONS: Record<GovernanceGapRootCause, string> = {
    SIGNAL_COVERAGE:
        'Missing or incomplete governance signal detection. ' +
        'Gap exists because certain risk signals are not captured or monitored.',

    ESCALATION_VISIBILITY:
        'Insufficient escalation routing or monitoring. ' +
        'Gap exists because escalation paths are unclear or unmonitored.',

    DECISION_TRACEABILITY:
        'Inadequate decision capture or audit trail. ' +
        'Gap exists because admin decisions lack documentation or traceability.',

    POLICY_DEFINITION:
        'Missing or incomplete policy definitions. ' +
        'Gap exists because governance policies are undefined or under-specified.',

    POLICY_ENFORCEMENT_GUARDRAIL:
        'Weak policy enforcement or guardrails. ' +
        'Gap exists because policies lack enforcement mechanisms or safety guardrails.',

    OBSERVABILITY_SATURATION:
        'Insufficient observability or alert coverage. ' +
        'Gap exists because monitoring lacks sufficient depth or breadth.',
};

/**
 * Helper: Format root cause category for display
 */
export function formatRootCause(rootCause: GovernanceGapRootCause): string {
    return rootCause
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Helper: Format governance dimension for display
 */
export function formatDimension(dimension: GovernanceDimension): string {
    return dimension
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Helper: Check if gap is high severity
 */
export function isHighSeverityGap(attribution: GovernanceGapAttribution): boolean {
    return attribution.severity === 'HIGH';
}

/**
 * Helper: Sort attributions by severity (HIGH → MEDIUM → LOW)
 */
export function sortAttributionsBySeverity(
    attributions: readonly GovernanceGapAttribution[]
): GovernanceGapAttribution[] {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    return [...attributions].sort((a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity]
    );
}

/**
 * Helper: Group attributions by root cause
 */
export function groupAttributionsByRootCause(
    attributions: readonly GovernanceGapAttribution[]
): Record<GovernanceGapRootCause, GovernanceGapAttribution[]> {
    const grouped: Record<string, GovernanceGapAttribution[]> = {
        SIGNAL_COVERAGE: [],
        ESCALATION_VISIBILITY: [],
        DECISION_TRACEABILITY: [],
        POLICY_DEFINITION: [],
        POLICY_ENFORCEMENT_GUARDRAIL: [],
        OBSERVABILITY_SATURATION: [],
    };

    for (const attribution of attributions) {
        grouped[attribution.rootCauseCategory].push(attribution);
    }

    return grouped as Record<GovernanceGapRootCause, GovernanceGapAttribution[]>;
}

/**
 * Helper: Calculate attribution summary statistics
 */
export function calculateAttributionSummary(
    attributions: readonly GovernanceGapAttribution[]
): GovernanceAttributionSummary {
    const summary = {
        totalGaps: attributions.length,
        gapsBySeverity: {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
        },
        gapsByRootCause: {
            SIGNAL_COVERAGE: 0,
            ESCALATION_VISIBILITY: 0,
            DECISION_TRACEABILITY: 0,
            POLICY_DEFINITION: 0,
            POLICY_ENFORCEMENT_GUARDRAIL: 0,
            OBSERVABILITY_SATURATION: 0,
        },
        gapsByDimension: {
            RISK_COVERAGE: 0,
            ESCALATION_VISIBILITY: 0,
            ADMIN_DECISION_TRACEABILITY: 0,
            INCIDENT_RESPONSE_CAPABILITY: 0,
            POLICY_SIMULATION: 0,
            AUTOMATION_SAFETY_GUARDRAILS: 0,
        },
    };

    for (const attribution of attributions) {
        summary.gapsBySeverity[attribution.severity]++;
        summary.gapsByRootCause[attribution.rootCauseCategory]++;
        summary.gapsByDimension[attribution.dimension]++;
    }

    return summary;
}
