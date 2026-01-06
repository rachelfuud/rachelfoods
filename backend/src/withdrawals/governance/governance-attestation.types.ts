/**
 * SPRINT 17 – PHASE 4
 * Governance Attestation & Executive Certification Types
 *
 * Purpose: Type definitions for executive governance attestation snapshots
 *
 * Key Concepts:
 * - AttestationRole: Executive roles attesting to governance posture
 * - GovernanceAttestationSnapshot: Immutable, evidence-backed governance snapshot
 * - Deterministic snapshot IDs: SHA-256 hashing for reproducibility
 *
 * Design Principles:
 * - READ-ONLY (no approvals, no sign-offs, no enforcement)
 * - Deterministic (same inputs → same snapshot ID)
 * - Evidence-backed (references to Sprint capabilities)
 * - Regulator-grade (board reporting, audit evidence)
 * - Non-approval (mandatory disclaimer)
 */

/**
 * Executive roles authorized to attest to governance posture
 *
 * Each role has specific governance oversight responsibilities
 */
export type AttestationRole = 'CISO' | 'CTO' | 'COMPLIANCE_OFFICER' | 'RISK_OFFICER';

/**
 * Readiness level for attestation snapshot
 * Simplified from governance readiness for executive consumption
 */
export type AttestationReadinessLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Governance readiness summary for attestation
 */
export interface GovernanceReadinessSummary {
    readonly overallScore: number;
    readonly readinessLevel: AttestationReadinessLevel;
}

/**
 * Control gaps summary for attestation
 */
export interface ControlGapsSummary {
    readonly total: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
}

/**
 * Automation readiness summary for attestation
 */
export interface AutomationReadinessSummary {
    readonly ready: number;
    readonly conditional: number;
    readonly limited: number;
    readonly notReady: number;
}

/**
 * Comprehensive governance attestation snapshot
 *
 * Executive-consumable, regulator-grade governance posture snapshot
 * Aggregates outputs from Sprint 17 Phases 1-3
 *
 * Use Cases:
 * - Board reporting
 * - Regulator submission
 * - Audit evidence
 * - Executive governance review
 */
export interface GovernanceAttestationSnapshot {
    /**
     * Deterministic snapshot identifier
     *
     * Formula: SHA-256(
     *   governanceReadiness +
     *   controlGapsSummary +
     *   automationReadinessSummary +
     *   hardGuardrails +
     *   attestedByRole +
     *   generatedAt (truncated to hour)
     * )
     *
     * Ensures:
     * - Same governance state → same snapshot ID (within same hour)
     * - Immutable identity
     * - Trackable across attestations
     */
    readonly snapshotId: string;

    /**
     * Snapshot generation timestamp (ISO 8601)
     */
    readonly generatedAt: string;

    /**
     * Executive role attesting to governance posture
     */
    readonly attestedByRole: AttestationRole;

    /**
     * Governance readiness summary (Phase 1)
     */
    readonly governanceReadiness: GovernanceReadinessSummary;

    /**
     * Control gaps summary (Phase 2)
     */
    readonly controlGapsSummary: ControlGapsSummary;

    /**
     * Automation readiness summary (Phase 3)
     */
    readonly automationReadinessSummary: AutomationReadinessSummary;

    /**
     * Hard guardrails (Phase 3)
     * Non-negotiable prohibitions on automation
     */
    readonly hardGuardrails: readonly string[];

    /**
     * Evidence references (Sprint capabilities)
     * Concrete system features supporting attestation
     */
    readonly evidenceReferences: readonly string[];

    /**
     * Mandatory disclaimer
     *
     * States that snapshot is observational only,
     * not approval or authorization
     */
    readonly disclaimer: string;

    /**
     * Sprint marker for audit trail
     */
    readonly sprint: 'SPRINT_17_PHASE_4';
}

/**
 * Mandatory disclaimer text for attestation snapshots
 *
 * This disclaimer MUST be included in every attestation snapshot
 * to clarify non-approval nature
 */
export const ATTESTATION_DISCLAIMER =
    'This snapshot represents an observational assessment of governance posture at the time generated. ' +
    'It does not constitute approval, authorization, or delegation of decision-making authority. ' +
    'It is a factual certification snapshot for governance review and audit purposes only.';

/**
 * Map attestation role to human-readable title
 *
 * @param role Attestation role
 * @returns Human-readable title
 */
export function formatAttestationRole(role: AttestationRole): string {
    const roleMap: Record<AttestationRole, string> = {
        CISO: 'Chief Information Security Officer',
        CTO: 'Chief Technology Officer',
        COMPLIANCE_OFFICER: 'Compliance Officer',
        RISK_OFFICER: 'Risk Officer',
    };

    return roleMap[role];
}

/**
 * Validate attestation role
 *
 * @param role Role string to validate
 * @returns True if valid attestation role
 */
export function isValidAttestationRole(role: string): role is AttestationRole {
    return role === 'CISO' || role === 'CTO' || role === 'COMPLIANCE_OFFICER' || role === 'RISK_OFFICER';
}
