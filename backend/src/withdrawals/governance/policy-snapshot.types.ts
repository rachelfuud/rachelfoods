/**
 * SPRINT 18 – PHASE 2
 * Policy Snapshot & Drift Type System
 *
 * Purpose: Track governance posture changes over time via immutable snapshots
 *
 * Design Principles:
 * - READ-ONLY (no persistence, no database writes)
 * - Deterministic (same governance state + hour → same snapshot ID)
 * - Advisory only (governance trend visibility, not enforcement)
 * - Evidence-backed (change rationale with Sprint references)
 * - Regulator-safe (change management evidence, not automation trigger)
 *
 * Critical Constraint:
 * This is NOT a persistence layer. Snapshots are generated on-demand for
 * comparison purposes only. No storage, no caching beyond request lifecycle.
 */

import { PolicyEvaluationResult, PolicyEvaluationSummary } from './policy.types';

/**
 * Drift Type Classification
 *
 * Categorizes governance posture changes:
 * - IMPROVEMENT: Status improved (FAIL → WARN, WARN → PASS, FAIL → PASS)
 * - REGRESSION: Status degraded (PASS → WARN, WARN → FAIL, PASS → FAIL)
 * - NO_CHANGE: Status unchanged (PASS → PASS, WARN → WARN, FAIL → FAIL)
 */
export type PolicyDriftType = 'IMPROVEMENT' | 'REGRESSION' | 'NO_CHANGE';

/**
 * Policy Snapshot
 *
 * Immutable governance posture snapshot at specific point in time
 *
 * Structure:
 * - snapshotId: Deterministic SHA-256 hash for reproducibility
 * - generatedAt: ISO 8601 timestamp (hour-truncated for determinism)
 * - evaluatedPolicies: Complete policy evaluation results from Phase 1
 * - summary: Aggregate counts (pass/warn/fail)
 * - sprint: Source Sprint reference
 *
 * Snapshot ID Formula:
 * SHA-256(governance_state_hash + hourTimestamp + sorted_policy_ids)
 *
 * Determinism Guarantee:
 * Same governance state + same hour → same snapshot ID
 */
export interface PolicySnapshot {
    readonly snapshotId: string; // SHA-256(governance_state + hour + policies)
    readonly generatedAt: string; // ISO 8601, hour-truncated
    readonly evaluatedPolicies: readonly PolicyEvaluationResult[];
    readonly summary: PolicyEvaluationSummary;
    readonly sprint: string; // "SPRINT_18_PHASE_2"
}

/**
 * Policy Drift Detection Result
 *
 * Captures change in single policy status between two snapshots
 *
 * Structure:
 * - policyId: References PolicyDefinition.id
 * - policyName: Human-readable policy identifier
 * - previousStatus: Status in previous snapshot (PASS | WARN | FAIL)
 * - currentStatus: Status in current snapshot (PASS | WARN | FAIL)
 * - severity: Policy severity from definition (INFO | WARNING | CRITICAL)
 * - driftType: Change classification (IMPROVEMENT | REGRESSION | NO_CHANGE)
 * - rationaleDelta: Human-readable explanation of change
 * - evidenceRefs: Sprint capability references
 * - detectedAt: ISO 8601 timestamp of drift detection
 */
export interface PolicyDrift {
    readonly policyId: string;
    readonly policyName: string;
    readonly previousStatus: 'PASS' | 'WARN' | 'FAIL';
    readonly currentStatus: 'PASS' | 'WARN' | 'FAIL';
    readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
    readonly driftType: PolicyDriftType;
    readonly rationaleDelta: string; // Human-readable change explanation
    readonly evidenceRefs: readonly string[];
    readonly detectedAt: string; // ISO 8601
}

/**
 * Policy Drift Summary
 *
 * Aggregate view of all detected policy changes
 *
 * Structure:
 * - totalPolicies: Total policies evaluated
 * - improvements: Count of IMPROVEMENT drifts
 * - regressions: Count of REGRESSION drifts
 * - noChange: Count of NO_CHANGE drifts
 * - criticalRegressions: Count of CRITICAL severity regressions
 */
export interface PolicyDriftSummary {
    readonly totalPolicies: number;
    readonly improvements: number;
    readonly regressions: number;
    readonly noChange: number;
    readonly criticalRegressions: number; // CRITICAL severity + REGRESSION
}

/**
 * Complete Policy Drift Report
 *
 * Full report comparing two policy snapshots
 *
 * Structure:
 * - currentSnapshot: Current governance posture snapshot
 * - comparisonSnapshotMetadata: Metadata about snapshot being compared to
 * - driftSummary: Aggregate change statistics
 * - drifts: Individual policy change details (sorted: REGRESSION first)
 * - disclaimer: Mandatory advisory-only language
 * - sprint: Source Sprint reference
 */
export interface PolicyDriftReport {
    readonly currentSnapshot: PolicySnapshot;
    readonly comparisonSnapshotMetadata: {
        readonly snapshotId: string;
        readonly generatedAt: string;
        readonly hoursAgo: number;
    };
    readonly driftSummary: PolicyDriftSummary;
    readonly drifts: readonly PolicyDrift[];
    readonly disclaimer: string;
    readonly sprint: string; // "SPRINT_18_PHASE_2"
}

/**
 * Mandatory Policy Drift Disclaimer
 *
 * Legal positioning for policy drift reports
 *
 * CRITICAL: This disclaimer MUST appear in every drift report to prevent
 * misinterpretation as enforcement, automation trigger, or alert mechanism.
 */
export const POLICY_DRIFT_DISCLAIMER = `
This policy drift report is advisory only and does NOT enforce, automate, or 
mandate any action. It represents an observational assessment of governance 
posture changes over time. Policy regressions do NOT trigger automated 
responses, block operations, emit alerts, or delegate decision-making authority. 
This report is intended for governance trend analysis, change management 
evidence, and audit purposes only.
`.trim();

/**
 * Helper: Determine drift type from status transition
 *
 * Classification Rules:
 * - IMPROVEMENT: FAIL → WARN, FAIL → PASS, WARN → PASS
 * - REGRESSION: PASS → WARN, PASS → FAIL, WARN → FAIL
 * - NO_CHANGE: PASS → PASS, WARN → WARN, FAIL → FAIL
 *
 * @param previousStatus Status in previous snapshot
 * @param currentStatus Status in current snapshot
 * @returns Drift type classification
 */
export function determineDriftType(
    previousStatus: 'PASS' | 'WARN' | 'FAIL',
    currentStatus: 'PASS' | 'WARN' | 'FAIL',
): PolicyDriftType {
    if (previousStatus === currentStatus) {
        return 'NO_CHANGE';
    }

    // Define status order for comparison (PASS > WARN > FAIL)
    const statusOrder = { PASS: 2, WARN: 1, FAIL: 0 };

    if (statusOrder[currentStatus] > statusOrder[previousStatus]) {
        return 'IMPROVEMENT';
    } else {
        return 'REGRESSION';
    }
}

/**
 * Helper: Format drift type as human-readable string
 */
export function formatDriftType(driftType: PolicyDriftType): string {
    const driftLabels: Record<PolicyDriftType, string> = {
        IMPROVEMENT: 'Improvement',
        REGRESSION: 'Regression',
        NO_CHANGE: 'No Change',
    };
    return driftLabels[driftType];
}

/**
 * Helper: Generate human-readable status transition
 */
export function formatStatusTransition(previousStatus: string, currentStatus: string): string {
    return `${previousStatus} → ${currentStatus}`;
}

/**
 * Type guard for PolicyDriftType
 */
export function isValidDriftType(value: unknown): value is PolicyDriftType {
    return typeof value === 'string' && ['IMPROVEMENT', 'REGRESSION', 'NO_CHANGE'].includes(value);
}

/**
 * Helper: Check if drift represents critical regression
 *
 * Critical regression = REGRESSION + CRITICAL severity
 */
export function isCriticalRegression(drift: PolicyDrift): boolean {
    return drift.driftType === 'REGRESSION' && drift.severity === 'CRITICAL';
}

/**
 * Helper: Sort drifts by priority (for reporting)
 *
 * Priority Order:
 * 1. CRITICAL REGRESSION (highest priority)
 * 2. WARNING REGRESSION
 * 3. INFO REGRESSION
 * 4. NO_CHANGE
 * 5. IMPROVEMENT (lowest priority - positive changes)
 */
export function sortDriftsByPriority(drifts: readonly PolicyDrift[]): PolicyDrift[] {
    return [...drifts].sort((a, b) => {
        // Priority: REGRESSION > NO_CHANGE > IMPROVEMENT
        const driftPriority: Record<PolicyDriftType, number> = {
            REGRESSION: 3,
            NO_CHANGE: 2,
            IMPROVEMENT: 1,
        };

        // Severity: CRITICAL > WARNING > INFO
        const severityPriority = { CRITICAL: 3, WARNING: 2, INFO: 1 };

        // First sort by drift type
        const driftDiff = driftPriority[b.driftType] - driftPriority[a.driftType];
        if (driftDiff !== 0) return driftDiff;

        // Then by severity
        const severityDiff = severityPriority[b.severity] - severityPriority[a.severity];
        if (severityDiff !== 0) return severityDiff;

        // Finally by policy name (alphabetical)
        return a.policyName.localeCompare(b.policyName);
    });
}
