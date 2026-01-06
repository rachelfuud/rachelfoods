/**
 * SPRINT 19 – PHASE 4: Governance Roadmap Synthesis & Executive Action Framing
 * 
 * PURPOSE:
 * Transform advisory remediation forecasts into executive-grade governance roadmap.
 * Answers: "What is the logical sequence of governance improvements and what do they unlock?"
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no execution planning)
 * - DETERMINISTIC (SHA-256 IDs)
 * - RULE-BASED SEQUENCING (static logic, no prioritization mandates)
 * - ADVISORY-ONLY (no automation authorization)
 * 
 * QUALITY STANDARD:
 * Regulator- and board-consumable roadmap narrative for governance planning.
 */

import { GovernanceDimension } from './governance-readiness.types';
import { GapSeverity } from './governance-attribution.types';
import { GovernanceMaturityStage } from './governance-timeline.types';
import { RemediationRiskLevel } from './governance-remediation.types';

/**
 * Roadmap Phase Risk Level
 * 
 * Aggregate risk assessment for implementing a roadmap phase.
 */
export type RoadmapPhaseRisk = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Roadmap Phase Objective
 * 
 * Plain English description of what a roadmap phase accomplishes.
 */
export interface RoadmapPhaseObjective {
    /**
     * Short objective title (3-7 words)
     */
    readonly title: string;

    /**
     * Detailed objective description (2-3 sentences)
     * MUST use advisory language (consider, evaluate, review)
     */
    readonly description: string;

    /**
     * Key outcomes if phase succeeds
     */
    readonly expectedOutcomes: readonly string[];
}

/**
 * Addressed Gap Reference
 * 
 * Reference to a control gap addressed in this roadmap phase.
 */
export interface AddressedGapRef {
    /**
     * Control gap ID (from Sprint 17 Phase 2)
     */
    readonly gapId: string;

    /**
     * Governance dimension
     */
    readonly dimension: GovernanceDimension;

    /**
     * Gap severity
     */
    readonly severity: GapSeverity;

    /**
     * Short gap description
     */
    readonly description: string;
}

/**
 * Remediation Action Reference
 * 
 * Reference to a remediation action included in this roadmap phase.
 */
export interface RemediationActionRef {
    /**
     * Remediation action ID (from Sprint 19 Phase 3)
     */
    readonly actionId: string;

    /**
     * Action category
     */
    readonly category: string;

    /**
     * Expected dimension score delta
     */
    readonly expectedDelta: number;

    /**
     * Action risk level
     */
    readonly riskLevel: RemediationRiskLevel;
}

/**
 * Maturity Stage Transition
 * 
 * Expected maturity stage change after completing a roadmap phase.
 */
export interface MaturityStageTransition {
    /**
     * Maturity stage before this phase
     */
    readonly stageBefore: GovernanceMaturityStage;

    /**
     * Maturity stage after this phase (if successful)
     */
    readonly stageAfter: GovernanceMaturityStage;

    /**
     * Transition occurred (true if stageBefore !== stageAfter)
     */
    readonly transitionOccurred: boolean;

    /**
     * Transition rationale
     */
    readonly rationale: string;
}

/**
 * Cumulative Score Impact
 * 
 * Cumulative governance score changes up to and including this phase.
 */
export interface CumulativeScoreImpact {
    /**
     * Baseline overall score (start of roadmap)
     */
    readonly baselineScore: number;

    /**
     * Cumulative score after this phase
     */
    readonly cumulativeScore: number;

    /**
     * Cumulative delta from baseline
     */
    readonly cumulativeDelta: number;

    /**
     * Score delta from this phase alone
     */
    readonly phaseDelta: number;
}

/**
 * Evidence Reference
 * 
 * Reference to Sprint capability or documentation supporting this phase.
 */
export interface EvidenceReference {
    /**
     * Sprint number
     */
    readonly sprint: number;

    /**
     * Capability or feature name
     */
    readonly capability: string;

    /**
     * Documentation reference (file path)
     */
    readonly documentationRef: string;
}

/**
 * Governance Roadmap Phase
 * 
 * Single phase in the governance roadmap representing a logical grouping
 * of remediation actions with shared objectives.
 * 
 * DETERMINISM GUARANTEE:
 * phaseId = SHA-256(sequenceOrder + objective.title + sorted_gapIds)
 * Same inputs → same phaseId
 */
export interface GovernanceRoadmapPhase {
    /**
     * Deterministic phase identifier
     * Formula: SHA-256(sequenceOrder + objective.title + sorted_gapIds)
     */
    readonly phaseId: string;

    /**
     * Sequence order (1..N)
     * Phases are ordered by static sequencing rules
     */
    readonly sequenceOrder: number;

    /**
     * Phase objective (plain English)
     */
    readonly objective: RoadmapPhaseObjective;

    /**
     * Control gaps addressed in this phase
     * Sorted by severity (HIGH → MEDIUM → LOW)
     */
    readonly addressedGaps: readonly AddressedGapRef[];

    /**
     * Remediation actions included in this phase
     * From Sprint 19 Phase 3
     */
    readonly remediationActions: readonly RemediationActionRef[];

    /**
     * Cumulative score impact up to and including this phase
     */
    readonly scoreImpact: CumulativeScoreImpact;

    /**
     * Expected maturity stage transition
     */
    readonly maturityTransition: MaturityStageTransition;

    /**
     * Aggregate risk level for this phase
     * Derived from constituent action risk levels
     */
    readonly phaseRisk: RoadmapPhaseRisk;

    /**
     * Risk notes explaining phase risk assessment
     */
    readonly riskNotes: readonly string[];

    /**
     * Evidence references supporting this phase
     * Links to Sprint capabilities
     */
    readonly evidenceReferences: readonly EvidenceReference[];

    /**
     * Prerequisite phase IDs
     * Phases that must be completed before this one
     */
    readonly prerequisitePhases: readonly string[];
}

/**
 * Roadmap Assumption
 * 
 * Explicit assumption underlying roadmap synthesis.
 */
export interface RoadmapAssumption {
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
 * Roadmap Constraint
 * 
 * Explicit constraint limiting roadmap scope or applicability.
 */
export interface RoadmapConstraint {
    /**
     * Constraint description
     */
    readonly description: string;

    /**
     * Recommended mitigation
     */
    readonly mitigation: string;
}

/**
 * Roadmap Summary Statistics
 * 
 * Aggregate statistics about the governance roadmap.
 */
export interface RoadmapSummary {
    /**
     * Total number of phases
     */
    readonly totalPhases: number;

    /**
     * Total gaps addressed
     */
    readonly totalGapsAddressed: number;

    /**
     * Total remediation actions
     */
    readonly totalActions: number;

    /**
     * Expected overall score improvement
     */
    readonly expectedScoreImprovement: number;

    /**
     * Expected maturity stage progression
     */
    readonly expectedMaturityProgression: {
        readonly from: GovernanceMaturityStage;
        readonly to: GovernanceMaturityStage;
    };

    /**
     * Phase risk distribution
     */
    readonly phaseRiskDistribution: {
        readonly low: number;
        readonly medium: number;
        readonly high: number;
    };
}

/**
 * Governance Roadmap
 * 
 * Complete governance improvement roadmap synthesizing:
 * - Sprint 17 Phase 2 control gaps
 * - Sprint 19 Phase 2 gap attributions
 * - Sprint 19 Phase 3 remediation forecasts
 * 
 * USAGE:
 * - Executive governance planning
 * - Board governance reviews
 * - Regulator governance discussions
 * - Governance investment justification
 * 
 * ADVISORY POSITIONING:
 * Roadmap is illustrative and non-binding — NOT execution plan or automation mandate.
 * 
 * DETERMINISM GUARANTEE:
 * roadmapId = SHA-256(baselineMaturityStage + targetMaturityStage + phase_count + hour_truncated_timestamp)
 * Same governance state → same roadmap structure
 */
export interface GovernanceRoadmap {
    /**
     * Deterministic roadmap identifier
     * Formula: SHA-256(baselineMaturityStage + targetMaturityStage + phase_count + hour_truncated_timestamp)
     */
    readonly roadmapId: string;

    /**
     * Roadmap generation timestamp (ISO 8601, hour-truncated)
     * Hour truncation ensures roadmap stability within 1-hour window
     */
    readonly generatedAt: string;

    /**
     * Baseline (current) maturity stage
     */
    readonly baselineMaturityStage: GovernanceMaturityStage;

    /**
     * Target maturity stage (projected if all phases complete)
     */
    readonly targetMaturityStage: GovernanceMaturityStage;

    /**
     * Ordered roadmap phases (1..N)
     * Sequenced by static rules (see ROADMAP_SEQUENCING_RULES)
     */
    readonly roadmapPhases: readonly GovernanceRoadmapPhase[];

    /**
     * Roadmap summary statistics
     */
    readonly summary: RoadmapSummary;

    /**
     * Explicit assumptions underlying roadmap
     */
    readonly assumptions: readonly RoadmapAssumption[];

    /**
     * Explicit constraints limiting roadmap
     */
    readonly constraints: readonly RoadmapConstraint[];

    /**
     * Mandatory advisory disclaimer
     */
    readonly mandatoryDisclaimer: string;
}

/**
 * MANDATORY ROADMAP SEQUENCING RULES (Static, Regulator-Explainable)
 * 
 * These rules govern how remediation actions are grouped into phases
 * and ordered into a logical roadmap sequence.
 * 
 * RULE 1: Severity-Based Sequencing
 * - HIGH severity gaps MUST be addressed before MEDIUM
 * - MEDIUM severity gaps MUST be addressed before LOW
 * - Rationale: Critical weaknesses first, incremental improvements second
 * 
 * RULE 2: Foundational Capabilities First
 * - Signal coverage & observability gaps addressed before policy/automation
 * - Rationale: Cannot enforce policies without adequate signal detection
 * 
 * RULE 3: Policy Definition Before Enforcement
 * - POLICY_DEFINITION actions before POLICY_GUARDRAIL_STRENGTHENING
 * - Rationale: Must define policies before strengthening enforcement
 * 
 * RULE 4: Escalation Before Automation
 * - ESCALATION_TUNING before automation-readiness improvements
 * - Rationale: Must have clear escalation paths before automation
 * 
 * RULE 5: Decision Capture Foundation
 * - DECISION_INSTRUMENTATION early in roadmap
 * - Rationale: Need audit trails for subsequent governance activities
 * 
 * RULE 6: AUDIT_READY as Final Stage
 * - AUDIT_READY maturity can only appear in final phase
 * - Rationale: Comprehensive governance posture requires all prior phases
 * 
 * RULE 7: Risk-Aware Grouping
 * - HIGH risk actions grouped separately from LOW risk
 * - Rationale: Allow executive risk tolerance evaluation per phase
 */
export const ROADMAP_SEQUENCING_RULES = {
    SEVERITY_PRIORITY: {
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
    },
    ACTION_CATEGORY_PRIORITY: {
        SIGNAL_EXPANSION: 1,              // Foundational
        OBSERVABILITY_REBALANCING: 2,     // Foundational
        DECISION_INSTRUMENTATION: 3,      // Early governance
        ESCALATION_TUNING: 4,             // Mid governance
        POLICY_DEFINITION: 5,             // Policy foundation
        POLICY_GUARDRAIL_STRENGTHENING: 6, // Policy enforcement
    },
    MATURITY_STAGE_SEQUENCE: [
        'FOUNDATIONAL',
        'STRUCTURED',
        'GOVERNED',
        'AUDIT_READY',
    ] as const,
};

/**
 * Mandatory Governance Roadmap Disclaimer
 * 
 * LEGAL POSITIONING:
 * Roadmap is advisory, illustrative, and non-binding — NOT execution plan.
 */
export const GOVERNANCE_ROADMAP_DISCLAIMER =
    'This governance roadmap is advisory and illustrative. ' +
    'It does NOT mandate execution, prescribe timelines, allocate resources, or authorize automation. ' +
    'Roadmap phases are logically sequenced based on static rules, not prioritization mandates. ' +
    'Actual implementation requires explicit executive authorization and feasibility assessment. ' +
    'Use for governance planning, board discussions, and regulator dialogue only.';

/**
 * Helper: Calculate aggregate phase risk from action risks
 */
export function calculatePhaseRisk(actionRisks: readonly RemediationRiskLevel[]): RoadmapPhaseRisk {
    if (actionRisks.length === 0) return 'LOW';

    const highCount = actionRisks.filter(r => r === 'HIGH').length;
    const mediumCount = actionRisks.filter(r => r === 'MEDIUM').length;

    // If any HIGH risk actions, phase is HIGH risk
    if (highCount > 0) return 'HIGH';

    // If majority are MEDIUM, phase is MEDIUM risk
    if (mediumCount > actionRisks.length / 2) return 'MEDIUM';

    // Otherwise LOW risk
    return 'LOW';
}

/**
 * Helper: Truncate timestamp to hour boundary
 * Ensures roadmap stability within 1-hour window
 */
export function truncateToHour(timestamp: string): string {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.toISOString();
}

/**
 * Helper: Sort gaps by severity (HIGH → MEDIUM → LOW)
 */
export function sortGapsBySeverity<T extends { severity: GapSeverity }>(gaps: readonly T[]): T[] {
    const severityOrder: Record<GapSeverity, number> = {
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
    };

    return [...gaps].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Helper: Format maturity stage for display
 */
export function formatMaturityStage(stage: GovernanceMaturityStage): string {
    return stage
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}
