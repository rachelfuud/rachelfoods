/**
 * SPRINT 17 PHASE 1: Governance Readiness Type System
 * 
 * Purpose: Evaluate system readiness for stricter controls and regulatory scrutiny
 * 
 * Characteristics:
 * - READ-ONLY: No enforcement, no mutations
 * - Deterministic: No ML, no probabilistic inference
 * - Observational: Readiness signals only
 * - Audit-ready: Clear rationale and evidence trails
 * 
 * Governance Dimensions:
 * - RISK_COVERAGE: Are withdrawals adequately monitored?
 * - ESCALATION_VISIBILITY: Are high-risk alerts properly tracked?
 * - ADMIN_DECISION_TRACEABILITY: Are admin decisions logged?
 * - INCIDENT_RECONSTRUCTABILITY: Can incidents be fully reconstructed?
 * - ALERT_SATURATION: Is alert volume manageable?
 * - SIEM_EXPORT_READINESS: Can data be exported for compliance?
 * 
 * Non-Goals:
 * - No policy enforcement
 * - No automated remediation
 * - No predictive modeling
 * - No behavior changes
 */

/**
 * Governance dimension types
 */
export type GovernanceDimension =
    | 'RISK_COVERAGE'                    // % of withdrawals with risk monitoring
    | 'ESCALATION_VISIBILITY'            // % of HIGH alerts linked to incidents
    | 'ADMIN_DECISION_TRACEABILITY'      // % of incidents with admin decisions
    | 'INCIDENT_RECONSTRUCTABILITY'      // % of incidents with full timeline
    | 'ALERT_SATURATION'                 // Alert volume sustainability
    | 'SIEM_EXPORT_READINESS';           // Compliance export capability

/**
 * Overall readiness level
 */
export type ReadinessLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Governance dimension score with rationale and evidence
 */
export interface GovernanceDimensionScore {
    readonly dimension: GovernanceDimension;
    readonly score: number;              // 0-100
    readonly rationale: readonly string[]; // Explanation of score
    readonly evidence: readonly string[];  // References to Sprint features
}

/**
 * Overall governance readiness snapshot
 * 
 * Aggregates dimension scores into overall assessment
 */
export interface GovernanceReadinessSnapshot {
    readonly generatedAt: string;        // ISO 8601 timestamp
    readonly windowHours: 24;            // Fixed at 24h for Phase 1
    readonly overallScore: number;       // Average of dimension scores (0-100)
    readonly readinessLevel: ReadinessLevel; // HIGH (>=80) | MEDIUM (50-79) | LOW (<50)
    readonly dimensions: readonly GovernanceDimensionScore[];
    readonly warnings: readonly string[]; // Deterministic threshold warnings
    readonly sprint: 'SPRINT_17_PHASE_1';
}

/**
 * Query parameters for governance readiness endpoint
 */
export interface GovernanceReadinessQuery {
    // Future: windowHours parameter (fixed at 24 for Phase 1)
}
