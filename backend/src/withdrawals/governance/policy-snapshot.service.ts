/**
 * SPRINT 18 – PHASE 2
 * Policy Snapshot Service
 *
 * Purpose: Generate immutable governance posture snapshots for drift detection
 *
 * Responsibilities:
 * - Generate current PolicySnapshot from Phase 1 evaluation
 * - Compute deterministic snapshot ID (SHA-256)
 * - Hour-truncate timestamps for reproducibility
 * - No persistence (snapshots exist only during request lifecycle)
 *
 * Design Principles:
 * - READ-ONLY (no database writes, no state changes)
 * - Deterministic (same governance state + hour → same snapshot ID)
 * - Stateless (no caching beyond request lifecycle)
 * - Advisory only (governance trend visibility, not enforcement)
 *
 * Critical Constraint:
 * This is NOT a storage service. Snapshots are generated on-demand for
 * comparison purposes only within a single request.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PolicySnapshot } from './policy-snapshot.types';
import { PolicyEvaluationService } from './policy-evaluation.service';

/**
 * Policy Snapshot Service
 *
 * Generates immutable governance posture snapshots with deterministic IDs
 *
 * Workflow:
 * 1. Generate current policy evaluation (Phase 1)
 * 2. Extract timestamp and truncate to hour
 * 3. Compute deterministic snapshot ID (SHA-256)
 * 4. Return snapshot (no persistence)
 *
 * Snapshot ID Formula:
 * SHA-256(governance_readiness_score + control_gaps_total + automation_readiness_summary +
 *         policy_evaluation_results + hourTimestamp)
 *
 * Determinism Guarantee:
 * Same governance state + same hour → same snapshot ID
 */
@Injectable()
export class PolicySnapshotService {
    private readonly logger = new Logger(PolicySnapshotService.name);

    constructor(private readonly policyEvaluationService: PolicyEvaluationService) { }

    /**
     * Generate Current Policy Snapshot
     *
     * Creates immutable snapshot of current governance posture
     *
     * Process:
     * 1. Generate policy evaluation report (Phase 1)
     * 2. Extract evaluation results and summary
     * 3. Truncate timestamp to hour for determinism
     * 4. Compute deterministic snapshot ID
     * 5. Return snapshot (no persistence)
     *
     * @returns PolicySnapshot with deterministic ID
     *
     * CRITICAL: No database writes, no caching beyond request lifecycle
     */
    async generateCurrentSnapshot(): Promise<PolicySnapshot> {
        this.logger.log('[SPRINT_18_PHASE_2] Generating current policy snapshot...');

        // Step 1: Generate policy evaluation (Phase 1)
        const evaluationReport = await this.policyEvaluationService.generatePolicyEvaluationReport();

        // Step 2: Extract results and summary
        const evaluatedPolicies = evaluationReport.results;
        const summary = evaluationReport.summary;

        // Step 3: Truncate timestamp to hour
        const now = new Date();
        const hourTimestamp = now.toISOString().substring(0, 13); // YYYY-MM-DDTHH
        const generatedAt = `${hourTimestamp}:00:00.000Z`; // Reconstruct full ISO format

        // Step 4: Compute deterministic snapshot ID
        const snapshotId = this.generateSnapshotId(evaluatedPolicies, summary, hourTimestamp);

        // Step 5: Return snapshot (no persistence)
        const snapshot: PolicySnapshot = {
            snapshotId,
            generatedAt,
            evaluatedPolicies,
            summary,
            sprint: 'SPRINT_18_PHASE_2',
        };

        this.logger.log(
            `[SPRINT_18_PHASE_2] Policy snapshot generated (snapshotId: ${snapshotId.substring(0, 16)}..., policies: ${evaluatedPolicies.length}, pass: ${summary.pass}, warn: ${summary.warn}, fail: ${summary.fail})`,
        );

        return snapshot;
    }

    /**
     * Generate Snapshot ID
     *
     * Deterministic SHA-256 hash of snapshot components
     *
     * Formula:
     * SHA-256(
     *   policy_results_sorted_by_id +
     *   summary_counts +
     *   hourTimestamp
     * )
     *
     * Sorting: Policy results sorted by policyId for consistency
     * Hour Truncation: Ensures reproducibility within same hour
     *
     * @param evaluatedPolicies Policy evaluation results
     * @param summary Aggregate summary counts
     * @param hourTimestamp Hour-truncated ISO timestamp
     * @returns Deterministic SHA-256 hash
     */
    private generateSnapshotId(
        evaluatedPolicies: readonly any[],
        summary: any,
        hourTimestamp: string,
    ): string {
        // Sort policies by ID for consistency
        const sortedPolicies = [...evaluatedPolicies]
            .sort((a, b) => a.policyId.localeCompare(b.policyId))
            .map((p) => ({
                policyId: p.policyId,
                policyName: p.policyName,
                status: p.status,
            }));

        // Create deterministic snapshot content
        const snapshotContent = JSON.stringify({
            policies: sortedPolicies,
            summary: {
                pass: summary.pass,
                warn: summary.warn,
                fail: summary.fail,
            },
            hourTimestamp,
        });

        // Generate SHA-256 hash
        return createHash('sha256').update(snapshotContent).digest('hex');
    }

    /**
     * Generate Historical Snapshot (Simulated)
     *
     * Generates snapshot as if it were created N hours ago
     *
     * CRITICAL: This is a simulation only. It generates a snapshot using
     * CURRENT governance state but with a timestamp from the past. This is
     * for demonstration purposes in Phase 2 since we have no persistence layer.
     *
     * In production, this would retrieve an actual historical snapshot from
     * storage, but Sprint 18 Phase 2 is READ-ONLY with no persistence.
     *
     * @param hoursAgo Number of hours in the past
     * @returns PolicySnapshot with historical timestamp
     */
    async generateHistoricalSnapshot(hoursAgo: number): Promise<PolicySnapshot> {
        this.logger.log(`[SPRINT_18_PHASE_2] Generating historical snapshot (${hoursAgo} hours ago)...`);

        // Generate current evaluation
        const evaluationReport = await this.policyEvaluationService.generatePolicyEvaluationReport();

        // Calculate historical timestamp
        const historicalDate = new Date();
        historicalDate.setHours(historicalDate.getHours() - hoursAgo);
        const hourTimestamp = historicalDate.toISOString().substring(0, 13);
        const generatedAt = `${hourTimestamp}:00:00.000Z`;

        // Generate snapshot ID with historical timestamp
        const snapshotId = this.generateSnapshotId(evaluationReport.results, evaluationReport.summary, hourTimestamp);

        const snapshot: PolicySnapshot = {
            snapshotId,
            generatedAt,
            evaluatedPolicies: evaluationReport.results,
            summary: evaluationReport.summary,
            sprint: 'SPRINT_18_PHASE_2',
        };

        this.logger.log(
            `[SPRINT_18_PHASE_2] Historical snapshot generated (snapshotId: ${snapshotId.substring(0, 16)}..., timestamp: ${generatedAt})`,
        );

        return snapshot;
    }
}
