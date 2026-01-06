/**
 * SPRINT 18 – PHASE 2
 * Policy Drift Detection Service
 *
 * Purpose: Detect governance posture changes between policy snapshots
 *
 * Responsibilities:
 * - Compare two PolicySnapshots (previous vs current)
 * - Detect status changes (PASS → WARN, WARN → FAIL, etc.)
 * - Classify drift type (IMPROVEMENT, REGRESSION, NO_CHANGE)
 * - Generate human-readable change rationale
 * - Sort drift results by priority (REGRESSION first)
 *
 * Design Principles:
 * - READ-ONLY (no enforcement, no automation)
 * - Deterministic (same snapshots → same drift report)
 * - Advisory only (governance trend visibility, not alerts)
 * - Evidence-backed (change explanations with Sprint references)
 * - Regulator-safe (change management evidence, not enforcement)
 *
 * Critical Constraint:
 * Drift detection does NOT trigger actions, emit alerts, or block operations.
 * Results are observational assessments for governance trend analysis only.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  PolicySnapshot,
  PolicyDrift,
  PolicyDriftReport,
  PolicyDriftSummary,
  PolicyDriftType,
  determineDriftType,
  sortDriftsByPriority,
  isCriticalRegression,
  POLICY_DRIFT_DISCLAIMER,
} from './policy-snapshot.types';
import { PolicyStatus, PolicySeverity } from './policy.types';
import { PolicySnapshotService } from './policy-snapshot.service';

/**
 * Policy Drift Detection Service
 *
 * Compares policy snapshots to detect governance posture changes
 *
 * Workflow:
 * 1. Retrieve current snapshot
 * 2. Retrieve comparison snapshot (historical or simulated)
 * 3. Match policies by ID
 * 4. Detect status changes
 * 5. Classify drift type (IMPROVEMENT, REGRESSION, NO_CHANGE)
 * 6. Generate human-readable rationale
 * 7. Sort by priority (REGRESSION first)
 * 8. Return drift report with mandatory disclaimer
 *
 * Drift Classification Rules:
 * - IMPROVEMENT: FAIL → WARN, FAIL → PASS, WARN → PASS
 * - REGRESSION: PASS → WARN, PASS → FAIL, WARN → FAIL
 * - NO_CHANGE: PASS → PASS, WARN → WARN, FAIL → FAIL
 */
@Injectable()
export class PolicyDriftService {
  private readonly logger = new Logger(PolicyDriftService.name);

  constructor(private readonly policySnapshotService: PolicySnapshotService) {}

  /**
   * Generate Policy Drift Report
   *
   * Compares current snapshot to historical snapshot from N hours ago
   *
   * Process:
   * 1. Generate current snapshot
   * 2. Generate historical snapshot (N hours ago)
   * 3. Detect drift for each policy
   * 4. Generate summary statistics
   * 5. Sort drifts by priority (REGRESSION first)
   * 6. Return report with mandatory disclaimer
   *
   * @param hoursAgo Number of hours to compare against (e.g., 1, 6, 24)
   * @returns PolicyDriftReport with drift analysis
   *
   * CRITICAL: No persistence, no alerts, no automation triggers
   */
  async generateDriftReport(hoursAgo: number): Promise<PolicyDriftReport> {
    this.logger.log(`[SPRINT_18_PHASE_2] Generating policy drift report (comparing to ${hoursAgo} hours ago)...`);

    // Step 1: Generate current snapshot
    const currentSnapshot = await this.policySnapshotService.generateCurrentSnapshot();

    // Step 2: Generate historical snapshot
    // NOTE: In Phase 2, this simulates historical snapshot using current state
    // with past timestamp. In production with persistence, this would retrieve
    // actual stored snapshot.
    const comparisonSnapshot = await this.policySnapshotService.generateHistoricalSnapshot(hoursAgo);

    // Step 3: Detect drift for each policy
    const drifts = this.detectDrifts(comparisonSnapshot, currentSnapshot);

    // Step 4: Generate summary statistics
    const driftSummary = this.calculateDriftSummary(drifts);

    // Step 5: Sort drifts by priority (REGRESSION first)
    const sortedDrifts = sortDriftsByPriority(drifts);

    // Step 6: Assemble report with mandatory disclaimer
    const report: PolicyDriftReport = {
      currentSnapshot,
      comparisonSnapshotMetadata: {
        snapshotId: comparisonSnapshot.snapshotId,
        generatedAt: comparisonSnapshot.generatedAt,
        hoursAgo,
      },
      driftSummary,
      drifts: sortedDrifts,
      disclaimer: POLICY_DRIFT_DISCLAIMER,
      sprint: 'SPRINT_18_PHASE_2',
    };

    this.logger.log(
      `[SPRINT_18_PHASE_2] Drift report generated (improvements: ${driftSummary.improvements}, regressions: ${driftSummary.regressions}, noChange: ${driftSummary.noChange}, criticalRegressions: ${driftSummary.criticalRegressions})`,
    );

    return report;
  }

  /**
   * Detect Drift Between Snapshots
   *
   * Compares policy status between two snapshots
   *
   * Process:
   * 1. Match policies by ID
   * 2. Compare status (previous vs current)
   * 3. Classify drift type
   * 4. Generate rationale delta
   * 5. Include evidence references
   *
   * @param previousSnapshot Earlier snapshot
   * @param currentSnapshot Later snapshot
   * @returns Array of PolicyDrift results
   */
  private detectDrifts(previousSnapshot: PolicySnapshot, currentSnapshot: PolicySnapshot): PolicyDrift[] {
    const drifts: PolicyDrift[] = [];
    const now = new Date().toISOString();

    // Create map of previous policy statuses
    const previousPolicyMap = new Map(
      previousSnapshot.evaluatedPolicies.map((p) => [p.policyId, p]),
    );

    // Compare each current policy to previous
    for (const currentPolicy of currentSnapshot.evaluatedPolicies) {
      const previousPolicy = previousPolicyMap.get(currentPolicy.policyId);

      if (!previousPolicy) {
        // Policy not found in previous snapshot (new policy added)
        // For Phase 2, we assume policies are static, so this shouldn't happen
        continue;
      }

      // Detect status change
      const previousStatus = previousPolicy.status as PolicyStatus;
      const currentStatus = currentPolicy.status as PolicyStatus;
      const driftType = determineDriftType(previousStatus, currentStatus);

      // Generate rationale delta
      const rationaleDelta = this.generateRationaleDelta(
        currentPolicy.policyName,
        previousStatus,
        currentStatus,
        driftType,
        previousPolicy.rationale,
        currentPolicy.rationale,
      );

      // Create drift result
      const drift: PolicyDrift = {
        policyId: currentPolicy.policyId,
        policyName: currentPolicy.policyName,
        previousStatus,
        currentStatus,
        severity: this.inferPolicySeverity(currentPolicy.policyName),
        driftType,
        rationaleDelta,
        evidenceRefs: currentPolicy.evidenceRefs,
        detectedAt: now,
      };

      drifts.push(drift);
    }

    return drifts;
  }

  /**
   * Generate Rationale Delta
   *
   * Creates human-readable explanation of policy status change
   *
   * Format:
   * - IMPROVEMENT: "Status improved from {previous} to {current}. {current_rationale}"
   * - REGRESSION: "Status degraded from {previous} to {current}. {current_rationale}"
   * - NO_CHANGE: "Status unchanged ({status}). {current_rationale}"
   *
   * @param policyName Policy identifier
   * @param previousStatus Previous status
   * @param currentStatus Current status
   * @param driftType Drift classification
   * @param previousRationale Previous evaluation rationale
   * @param currentRationale Current evaluation rationale
   * @returns Human-readable change explanation
   */
  private generateRationaleDelta(
    policyName: string,
    previousStatus: PolicyStatus,
    currentStatus: PolicyStatus,
    driftType: PolicyDriftType,
    previousRationale: string,
    currentRationale: string,
  ): string {
    switch (driftType) {
      case 'IMPROVEMENT':
        return `Status improved from ${previousStatus} to ${currentStatus}. ${currentRationale}`;

      case 'REGRESSION':
        return `Status degraded from ${previousStatus} to ${currentStatus}. ${currentRationale}`;

      case 'NO_CHANGE':
        return `Status unchanged (${currentStatus}). ${currentRationale}`;

      default:
        return `Status transition: ${previousStatus} → ${currentStatus}. ${currentRationale}`;
    }
  }

  /**
   * Calculate Drift Summary
   *
   * Generates aggregate statistics from drift results
   *
   * @param drifts Array of detected policy drifts
   * @returns Drift summary with counts
   */
  private calculateDriftSummary(drifts: readonly PolicyDrift[]): PolicyDriftSummary {
    return {
      totalPolicies: drifts.length,
      improvements: drifts.filter((d) => d.driftType === 'IMPROVEMENT').length,
      regressions: drifts.filter((d) => d.driftType === 'REGRESSION').length,
      noChange: drifts.filter((d) => d.driftType === 'NO_CHANGE').length,
      criticalRegressions: drifts.filter((d) => isCriticalRegression(d)).length,
    };
  }

  /**
   * Infer Policy Severity
   *
   * Maps policy name to severity level
   *
   * NOTE: In Phase 1, policy severity is part of PolicyDefinition.
   * In Phase 2, we infer it from policy name for drift reporting.
   * In production, this would be retrieved from policy definition store.
   *
   * @param policyName Policy identifier
   * @returns Policy severity
   */
  private inferPolicySeverity(policyName: string): PolicySeverity {
    // Map policy names to known severities from Phase 1
    const severityMap: Record<string, PolicySeverity> = {
      NO_HIGH_CONTROL_GAPS: 'CRITICAL',
      ADMIN_DECISION_TRACEABILITY_THRESHOLD: 'WARNING',
      RISK_COVERAGE_MINIMUM: 'WARNING',
      ESCALATION_VISIBILITY_MINIMUM: 'WARNING',
      INCIDENT_RECONSTRUCTABILITY_REQUIRED: 'CRITICAL',
      SIEM_EXPORT_READINESS_MINIMUM: 'WARNING',
      ALERT_SATURATION_AUTOMATION_READINESS: 'INFO',
      ESCALATION_ROUTING_MUST_REMAIN_LIMITED: 'CRITICAL',
    };

    return severityMap[policyName] || 'WARNING';
  }
}
