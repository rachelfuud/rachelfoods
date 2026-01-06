/**
 * SPRINT 17 – PHASE 3
 * Automation Readiness Signals & Guardrails Types
 *
 * Purpose: Type definitions for automation readiness assessment
 *
 * Key Concepts:
 * - AutomationCandidate: System areas that could be automated in future
 * - AutomationReadinessSignal: Assessment of automation safety for each candidate
 * - AutomationReadinessReport: Comprehensive automation readiness assessment
 * - Hard Guardrails: Non-negotiable prohibitions on automation
 *
 * Design Principles:
 * - READ-ONLY (no automation, no enforcement)
 * - Deterministic (rule-based scoring)
 * - Advisory only (provides insights, not actions)
 * - Regulator-safe (human-in-the-loop protection)
 * - Future-proof (design without execution)
 */

/**
 * System areas that could be automated in future
 *
 * Each candidate represents a specific governance or operational function
 * that may benefit from automation if readiness criteria are met
 */
export type AutomationCandidate =
    | 'RISK_SCORING'              // Automated risk evaluation and scoring
    | 'ALERT_GENERATION'          // Automated alert creation based on risk events
    | 'ESCALATION_ROUTING'        // Automated routing of HIGH/CRITICAL alerts
    | 'PLAYBOOK_SUGGESTION'       // Automated playbook recommendations
    | 'COMPLIANCE_EXPORT'         // Automated compliance data export
    | 'INCIDENT_RECONSTRUCTION';  // Automated incident timeline generation

/**
 * Readiness level classification
 *
 * Levels based on readiness score:
 * - NOT_READY (0-39): Significant blockers, unsafe for automation
 * - LIMITED (40-59): Partial readiness, many constraints
 * - CONDITIONAL (60-79): Ready with guardrails, human oversight required
 * - READY (80-100): High readiness, minimal blockers
 */
export type AutomationReadinessLevel = 'NOT_READY' | 'LIMITED' | 'CONDITIONAL' | 'READY';

/**
 * Readiness signal for a specific automation candidate
 *
 * Provides comprehensive assessment including:
 * - Readiness score and level
 * - Blockers preventing automation
 * - Enabling factors supporting automation
 * - Evidence from existing system capabilities
 * - Rationale for assessment
 */
export interface AutomationReadinessSignal {
    /**
     * Automation candidate being assessed
     */
    readonly candidate: AutomationCandidate;

    /**
     * Readiness score (0-100)
     * Computed from governance dimensions, control gaps, and system capabilities
     */
    readonly readinessScore: number;

    /**
     * Readiness level classification
     */
    readonly readinessLevel: AutomationReadinessLevel;

    /**
     * Blockers preventing or limiting automation
     * Examples:
     * - "ADMIN_DECISION_TRACEABILITY below 90 (current: 60)"
     * - "ALERT_SATURATION above 70 (current: 85)"
     * - "Regulatory sensitivity requires human judgment"
     */
    readonly blockers: readonly string[];

    /**
     * Enabling factors supporting automation
     * Examples:
     * - "Sprint 14 deterministic playbooks operational"
     * - "INCIDENT_RECONSTRUCTABILITY at 100 (full audit capability)"
     * - "Sprint 16 Phase 2 alert engine deterministic"
     */
    readonly enablingFactors: readonly string[];

    /**
     * Evidence from existing system capabilities
     * Concrete Sprint features supporting assessment
     */
    readonly evidence: readonly string[];

    /**
     * Human-readable rationale for readiness assessment
     */
    readonly rationale: string;
}

/**
 * Summary statistics for automation readiness
 */
export interface AutomationReadinessSummary {
    readonly ready: number;         // Count of READY candidates
    readonly conditional: number;   // Count of CONDITIONAL candidates
    readonly limited: number;       // Count of LIMITED candidates
    readonly notReady: number;      // Count of NOT_READY candidates
}

/**
 * Comprehensive automation readiness assessment report
 *
 * Evaluates all automation candidates and provides:
 * - Per-candidate readiness signals
 * - Overall summary statistics
 * - Hard guardrails (non-negotiable prohibitions)
 */
export interface AutomationReadinessReport {
    /**
     * Report generation timestamp (ISO 8601)
     */
    readonly generatedAt: string;

    /**
     * Per-candidate readiness signals
     * Sorted by readiness score (descending)
     */
    readonly signals: readonly AutomationReadinessSignal[];

    /**
     * Summary statistics
     */
    readonly summary: AutomationReadinessSummary;

    /**
     * Hard guardrails (non-negotiable prohibitions)
     * Static system-wide rules that MUST be enforced for any future automation
     */
    readonly hardGuardrails: readonly string[];

    /**
     * Sprint marker for audit trail
     */
    readonly sprint: 'SPRINT_17_PHASE_3';
}

/**
 * Readiness level thresholds
 * Used for deterministic level classification
 */
export const READINESS_THRESHOLDS = {
    READY: 80,        // Score >= 80: High readiness
    CONDITIONAL: 60,  // Score >= 60: Ready with guardrails
    LIMITED: 40,      // Score >= 40: Partial readiness
    NOT_READY: 0,     // Score < 40: Not ready
} as const;

/**
 * Prerequisite scores for automation readiness
 * Minimum governance dimension scores required for automation consideration
 */
export const AUTOMATION_PREREQUISITES = {
    /**
     * ADMIN_DECISION_TRACEABILITY must be >= 90 for ANY automation
     * Rationale: Audit trail required for all automated decisions
     */
    MIN_ADMIN_DECISION_TRACEABILITY: 90,

    /**
     * INCIDENT_RECONSTRUCTABILITY must be 100 for post-automation audit
     * Rationale: Full forensic capability required to investigate automated actions
     */
    MIN_INCIDENT_RECONSTRUCTABILITY: 100,

    /**
     * ALERT_SATURATION must be < 70 for alert-related automation
     * Rationale: High saturation indicates system stress, unsafe for automation
     */
    MAX_ALERT_SATURATION: 70,

    /**
     * SIEM_EXPORT_READINESS must be 100 for compliance automation
     * Rationale: Compliance automation requires full export capability
     */
    MIN_SIEM_EXPORT_READINESS: 100,
} as const;

/**
 * Determine readiness level from score
 *
 * @param score Readiness score (0-100)
 * @returns Readiness level classification
 */
export function determineReadinessLevel(score: number): AutomationReadinessLevel {
    if (score >= READINESS_THRESHOLDS.READY) {
        return 'READY';
    } else if (score >= READINESS_THRESHOLDS.CONDITIONAL) {
        return 'CONDITIONAL';
    } else if (score >= READINESS_THRESHOLDS.LIMITED) {
        return 'LIMITED';
    } else {
        return 'NOT_READY';
    }
}

/**
 * Format automation candidate for human readability
 *
 * @param candidate Automation candidate
 * @returns Formatted name
 */
export function formatCandidateName(candidate: AutomationCandidate): string {
    return candidate
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}
