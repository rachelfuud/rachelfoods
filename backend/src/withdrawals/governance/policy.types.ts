/**
 * SPRINT 18 – PHASE 1
 * Policy-as-Code Type System
 *
 * Purpose: Formalize governance reasoning via declarative policies
 *
 * Design Principles:
 * - Advisory only (NO enforcement, NO automation)
 * - READ-ONLY (no persistence, no state changes)
 * - Deterministic (same inputs → same outputs)
 * - Evidence-backed (concrete Sprint references)
 * - Human-interpretable rationale
 * - Aligned with Sprint 17 guardrails
 *
 * Critical Constraint:
 * This is NOT an enforcement mechanism. Policies express expected
 * governance posture but do NOT trigger actions, block operations,
 * or automate responses.
 */

/**
 * Policy Category
 *
 * Organizes policies by domain concern
 */
export type PolicyCategory = 'GOVERNANCE' | 'RISK' | 'COMPLIANCE' | 'AUTOMATION';

/**
 * Policy Severity
 *
 * Indicates importance level for policy violations
 * - INFO: Informational observation, no immediate concern
 * - WARNING: Potential governance weakness, review recommended
 * - CRITICAL: Significant governance gap, executive attention required
 */
export type PolicySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Policy Evaluation Status
 *
 * Result of policy evaluation against current state
 * - PASS: Policy requirements met
 * - WARN: Policy requirements partially met (warning threshold)
 * - FAIL: Policy requirements not met
 */
export type PolicyStatus = 'PASS' | 'WARN' | 'FAIL';

/**
 * Policy Definition
 *
 * Declarative specification of governance expectation
 *
 * Structure:
 * - id: Deterministic SHA-256 hash of (name + category + inputs)
 * - name: Human-readable policy identifier
 * - description: Governance intent and rationale
 * - category: Domain classification
 * - inputs: Sprint 15-17 governance signals required
 * - severity: Importance level for violations
 * - sprint: Source Sprint reference
 */
export interface PolicyDefinition {
    readonly id: string; // SHA-256(name + category + inputs)
    readonly name: string;
    readonly description: string;
    readonly category: PolicyCategory;
    readonly inputs: readonly string[]; // e.g., ["RISK_COVERAGE", "ESCALATION_VISIBILITY"]
    readonly severity: PolicySeverity;
    readonly sprint: string; // e.g., "SPRINT_18_PHASE_1"
}

/**
 * Policy Evaluation Result
 *
 * Outcome of evaluating single policy against current governance state
 *
 * Structure:
 * - policyId: References PolicyDefinition.id
 * - policyName: Human-readable policy identifier
 * - status: PASS | WARN | FAIL
 * - rationale: Evidence-backed explanation of evaluation outcome
 * - evidenceRefs: Sprint capability references supporting evaluation
 * - evaluatedAt: ISO 8601 timestamp
 * - sprint: Source Sprint reference
 */
export interface PolicyEvaluationResult {
    readonly policyId: string;
    readonly policyName: string;
    readonly status: PolicyStatus;
    readonly rationale: string; // Human-readable, evidence-backed
    readonly evidenceRefs: readonly string[]; // Sprint capability references
    readonly evaluatedAt: string; // ISO 8601
    readonly sprint: string;
}

/**
 * Policy Evaluation Summary
 *
 * Aggregate view of all policy evaluations
 *
 * Structure:
 * - totalPolicies: Total number of policies evaluated
 * - pass: Count of policies with PASS status
 * - warn: Count of policies with WARN status
 * - fail: Count of policies with FAIL status
 * - evaluatedAt: ISO 8601 timestamp
 */
export interface PolicyEvaluationSummary {
    readonly totalPolicies: number;
    readonly pass: number;
    readonly warn: number;
    readonly fail: number;
    readonly evaluatedAt: string;
}

/**
 * Complete Policy Evaluation Report
 *
 * Full report including all policy results and summary
 *
 * Structure:
 * - summary: Aggregate counts
 * - results: Individual policy evaluation outcomes
 * - disclaimer: Mandatory advisory-only language
 * - sprint: Source Sprint reference
 */
export interface PolicyEvaluationReport {
    readonly summary: PolicyEvaluationSummary;
    readonly results: readonly PolicyEvaluationResult[];
    readonly disclaimer: string;
    readonly sprint: string;
}

/**
 * Mandatory Advisory Disclaimer
 *
 * Legal positioning for policy evaluation reports
 *
 * CRITICAL: This disclaimer MUST appear in every policy evaluation report
 * to prevent misinterpretation as enforcement or automation.
 */
export const POLICY_EVALUATION_DISCLAIMER = `
This policy evaluation report is advisory only and does NOT enforce, automate, 
or mandate any action. It represents an observational assessment of current 
governance posture against declarative policy expectations. Policy violations 
do NOT trigger automated responses, block operations, or delegate decision-making 
authority. This report is intended for governance review, executive oversight, 
and audit purposes only.
`.trim();

/**
 * Helper: Format policy category as human-readable string
 */
export function formatPolicyCategory(category: PolicyCategory): string {
    const categoryLabels: Record<PolicyCategory, string> = {
        GOVERNANCE: 'Governance',
        RISK: 'Risk Management',
        COMPLIANCE: 'Compliance & Audit',
        AUTOMATION: 'Automation Readiness',
    };
    return categoryLabels[category];
}

/**
 * Helper: Format policy severity as human-readable string
 */
export function formatPolicySeverity(severity: PolicySeverity): string {
    const severityLabels: Record<PolicySeverity, string> = {
        INFO: 'Informational',
        WARNING: 'Warning',
        CRITICAL: 'Critical',
    };
    return severityLabels[severity];
}

/**
 * Helper: Format policy status as human-readable string
 */
export function formatPolicyStatus(status: PolicyStatus): string {
    const statusLabels: Record<PolicyStatus, string> = {
        PASS: 'Pass',
        WARN: 'Warning',
        FAIL: 'Fail',
    };
    return statusLabels[status];
}

/**
 * Type guard for PolicyCategory
 */
export function isValidPolicyCategory(value: unknown): value is PolicyCategory {
    return typeof value === 'string' && ['GOVERNANCE', 'RISK', 'COMPLIANCE', 'AUTOMATION'].includes(value);
}

/**
 * Type guard for PolicySeverity
 */
export function isValidPolicySeverity(value: unknown): value is PolicySeverity {
    return typeof value === 'string' && ['INFO', 'WARNING', 'CRITICAL'].includes(value);
}

/**
 * Type guard for PolicyStatus
 */
export function isValidPolicyStatus(value: unknown): value is PolicyStatus {
    return typeof value === 'string' && ['PASS', 'WARN', 'FAIL'].includes(value);
}
