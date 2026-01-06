/**
 * SPRINT 17 – PHASE 2
 * Policy Simulation Service
 *
 * Purpose: Simulate "what-if" governance policy changes
 *
 * Responsibilities:
 * - Accept hypothetical policy change inputs
 * - Apply deterministic arithmetic rules to dimension scores
 * - Calculate overall readiness impact
 * - Provide assumptions and warnings
 * - Return hypothetical outcomes (NO actual changes)
 *
 * Design Principles:
 * - READ-ONLY (no mutations, no enforcement)
 * - Deterministic (arithmetic only, no ML)
 * - Simulation only (no real policy changes)
 * - No persistence (on-demand computation)
 * - Clear assumptions documentation
 *
 * Simulation Rules:
 * - increaseAdminDecisionCapture: +20 to ADMIN_DECISION_TRACEABILITY (cap at 100)
 * - tightenAlertThresholds: +10 to ESCALATION_VISIBILITY, -5 to ALERT_SATURATION
 * - forceEscalationLinking: +15 to ESCALATION_VISIBILITY (cap at 100)
 * - reduceAlertNoise: +20 to ALERT_SATURATION (cap at 100)
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    GovernanceReadinessSnapshot,
    GovernanceDimensionScore,
    GovernanceDimension,
} from './governance-readiness.types';
import { PolicySimulationInput, PolicySimulationResult, DimensionImpact } from './control-gap.types';
import { GovernanceReadinessService } from './governance-readiness.service';

/**
 * Simulation constants
 * All score changes are deterministic arithmetic
 */
const SIMULATION_RULES = {
    INCREASE_ADMIN_DECISION_CAPTURE: {
        dimension: 'ADMIN_DECISION_TRACEABILITY' as GovernanceDimension,
        delta: 20,
        description: 'Increased admin decision capture coverage',
    },
    TIGHTEN_ALERT_THRESHOLDS: {
        escalationVisibilityDelta: 10,
        alertSaturationDelta: -5,
        description: 'Tighter alert thresholds improve escalation tracking but reduce saturation margin',
    },
    FORCE_ESCALATION_LINKING: {
        dimension: 'ESCALATION_VISIBILITY' as GovernanceDimension,
        delta: 15,
        description: 'Mandatory escalation linking for HIGH/CRITICAL alerts',
    },
    REDUCE_ALERT_NOISE: {
        dimension: 'ALERT_SATURATION' as GovernanceDimension,
        delta: 20,
        description: 'Alert noise reduction initiatives',
    },
};

@Injectable()
export class PolicySimulationService {
    private readonly logger = new Logger(PolicySimulationService.name);

    constructor(private readonly governanceReadinessService: GovernanceReadinessService) { }

    /**
     * Simulate policy changes and predict governance impact
     *
     * Process:
     * 1. Get current readiness snapshot (baseline)
     * 2. Apply hypothetical policy changes (arithmetic deltas)
     * 3. Recalculate overall score
     * 4. Generate impact breakdown
     * 5. Document assumptions and warnings
     *
     * CRITICAL: NO actual policy changes are applied
     *
     * @param input Policy simulation input
     * @returns Hypothetical simulation result
     */
    async simulatePolicyChanges(input: PolicySimulationInput): Promise<PolicySimulationResult> {
        this.logger.log('[SPRINT_17_PHASE_2] Starting policy simulation');

        // Get baseline readiness snapshot
        const baseline = await this.governanceReadinessService.generateReadinessSnapshot();

        // Create dimension map for simulation
        const dimensionMap = this.createDimensionMap(baseline);

        // Apply policy change simulations
        const assumptions: string[] = [];
        const impactedDimensions: DimensionImpact[] = [];

        if (input.assumedChanges.increaseAdminDecisionCapture) {
            this.applyAdminDecisionCaptureSimulation(dimensionMap, assumptions, impactedDimensions);
        }

        if (input.assumedChanges.tightenAlertThresholds) {
            this.applyTightenAlertThresholdsSimulation(dimensionMap, assumptions, impactedDimensions);
        }

        if (input.assumedChanges.forceEscalationLinking) {
            this.applyForceEscalationLinkingSimulation(dimensionMap, assumptions, impactedDimensions);
        }

        if (input.assumedChanges.reduceAlertNoise) {
            this.applyReduceAlertNoiseSimulation(dimensionMap, assumptions, impactedDimensions);
        }

        // Calculate simulated overall score
        const simulatedScore = this.calculateSimulatedOverallScore(dimensionMap);

        // Calculate delta
        const delta = simulatedScore - baseline.overallScore;

        // Generate warnings
        const warnings = this.generateSimulationWarnings(delta, impactedDimensions);

        const result: PolicySimulationResult = {
            simulatedAt: new Date().toISOString(),
            baselineScore: Math.round(baseline.overallScore),
            simulatedScore: Math.round(simulatedScore),
            delta: Math.round(delta),
            impactedDimensions,
            assumptions,
            warnings,
            sprint: 'SPRINT_17_PHASE_2',
        };

        this.logger.log(
            `[SPRINT_17_PHASE_2] Policy simulation complete (baseline: ${result.baselineScore}, simulated: ${result.simulatedScore}, delta: ${result.delta})`,
        );

        return result;
    }

    /**
     * Create mutable dimension map for simulation
     *
     * @param snapshot Baseline readiness snapshot
     * @returns Map of dimension → current score
     */
    private createDimensionMap(snapshot: GovernanceReadinessSnapshot): Map<GovernanceDimension, number> {
        const map = new Map<GovernanceDimension, number>();

        for (const dimension of snapshot.dimensions) {
            map.set(dimension.dimension, dimension.score);
        }

        return map;
    }

    /**
     * Apply admin decision capture simulation
     *
     * Rule: +20 to ADMIN_DECISION_TRACEABILITY (cap at 100)
     *
     * @param dimensionMap Dimension scores (mutated)
     * @param assumptions Assumptions array (mutated)
     * @param impactedDimensions Impact array (mutated)
     */
    private applyAdminDecisionCaptureSimulation(
        dimensionMap: Map<GovernanceDimension, number>,
        assumptions: string[],
        impactedDimensions: DimensionImpact[],
    ): void {
        const dimension = SIMULATION_RULES.INCREASE_ADMIN_DECISION_CAPTURE.dimension;
        const delta = SIMULATION_RULES.INCREASE_ADMIN_DECISION_CAPTURE.delta;

        const before = dimensionMap.get(dimension) ?? 0;
        const after = this.capScore(before + delta);

        dimensionMap.set(dimension, after);

        assumptions.push(
            `${SIMULATION_RULES.INCREASE_ADMIN_DECISION_CAPTURE.description}: +${delta} to ${dimension} (capped at 100)`,
        );

        impactedDimensions.push({
            dimension,
            before: Math.round(before),
            after: Math.round(after),
            improvement: Math.round(after - before),
        });

        this.logger.log(`[SPRINT_17_PHASE_2] Simulated admin decision capture: ${before} → ${after}`);
    }

    /**
     * Apply tighter alert thresholds simulation
     *
     * Rule: +10 to ESCALATION_VISIBILITY, -5 to ALERT_SATURATION
     *
     * Rationale: Tighter thresholds improve tracking but reduce saturation margin
     *
     * @param dimensionMap Dimension scores (mutated)
     * @param assumptions Assumptions array (mutated)
     * @param impactedDimensions Impact array (mutated)
     */
    private applyTightenAlertThresholdsSimulation(
        dimensionMap: Map<GovernanceDimension, number>,
        assumptions: string[],
        impactedDimensions: DimensionImpact[],
    ): void {
        // Impact on ESCALATION_VISIBILITY (+10)
        const escalationDimension: GovernanceDimension = 'ESCALATION_VISIBILITY';
        const escalationBefore = dimensionMap.get(escalationDimension) ?? 0;
        const escalationAfter = this.capScore(escalationBefore + SIMULATION_RULES.TIGHTEN_ALERT_THRESHOLDS.escalationVisibilityDelta);

        dimensionMap.set(escalationDimension, escalationAfter);

        impactedDimensions.push({
            dimension: escalationDimension,
            before: Math.round(escalationBefore),
            after: Math.round(escalationAfter),
            improvement: Math.round(escalationAfter - escalationBefore),
        });

        // Impact on ALERT_SATURATION (-5)
        const saturationDimension: GovernanceDimension = 'ALERT_SATURATION';
        const saturationBefore = dimensionMap.get(saturationDimension) ?? 0;
        const saturationAfter = this.capScore(saturationBefore + SIMULATION_RULES.TIGHTEN_ALERT_THRESHOLDS.alertSaturationDelta);

        dimensionMap.set(saturationDimension, saturationAfter);

        impactedDimensions.push({
            dimension: saturationDimension,
            before: Math.round(saturationBefore),
            after: Math.round(saturationAfter),
            improvement: Math.round(saturationAfter - saturationBefore),
        });

        assumptions.push(
            `${SIMULATION_RULES.TIGHTEN_ALERT_THRESHOLDS.description}: +${SIMULATION_RULES.TIGHTEN_ALERT_THRESHOLDS.escalationVisibilityDelta} to ESCALATION_VISIBILITY, ${SIMULATION_RULES.TIGHTEN_ALERT_THRESHOLDS.alertSaturationDelta} to ALERT_SATURATION`,
        );

        this.logger.log(
            `[SPRINT_17_PHASE_2] Simulated tighter thresholds: ESCALATION_VISIBILITY ${escalationBefore} → ${escalationAfter}, ALERT_SATURATION ${saturationBefore} → ${saturationAfter}`,
        );
    }

    /**
     * Apply forced escalation linking simulation
     *
     * Rule: +15 to ESCALATION_VISIBILITY (cap at 100)
     *
     * @param dimensionMap Dimension scores (mutated)
     * @param assumptions Assumptions array (mutated)
     * @param impactedDimensions Impact array (mutated)
     */
    private applyForceEscalationLinkingSimulation(
        dimensionMap: Map<GovernanceDimension, number>,
        assumptions: string[],
        impactedDimensions: DimensionImpact[],
    ): void {
        const dimension = SIMULATION_RULES.FORCE_ESCALATION_LINKING.dimension;
        const delta = SIMULATION_RULES.FORCE_ESCALATION_LINKING.delta;

        const before = dimensionMap.get(dimension) ?? 0;
        const after = this.capScore(before + delta);

        dimensionMap.set(dimension, after);

        assumptions.push(`${SIMULATION_RULES.FORCE_ESCALATION_LINKING.description}: +${delta} to ${dimension} (capped at 100)`);

        impactedDimensions.push({
            dimension,
            before: Math.round(before),
            after: Math.round(after),
            improvement: Math.round(after - before),
        });

        this.logger.log(`[SPRINT_17_PHASE_2] Simulated forced escalation linking: ${before} → ${after}`);
    }

    /**
     * Apply alert noise reduction simulation
     *
     * Rule: +20 to ALERT_SATURATION (cap at 100)
     *
     * @param dimensionMap Dimension scores (mutated)
     * @param assumptions Assumptions array (mutated)
     * @param impactedDimensions Impact array (mutated)
     */
    private applyReduceAlertNoiseSimulation(
        dimensionMap: Map<GovernanceDimension, number>,
        assumptions: string[],
        impactedDimensions: DimensionImpact[],
    ): void {
        const dimension = SIMULATION_RULES.REDUCE_ALERT_NOISE.dimension;
        const delta = SIMULATION_RULES.REDUCE_ALERT_NOISE.delta;

        const before = dimensionMap.get(dimension) ?? 0;
        const after = this.capScore(before + delta);

        dimensionMap.set(dimension, after);

        assumptions.push(`${SIMULATION_RULES.REDUCE_ALERT_NOISE.description}: +${delta} to ${dimension} (capped at 100)`);

        impactedDimensions.push({
            dimension,
            before: Math.round(before),
            after: Math.round(after),
            improvement: Math.round(after - before),
        });

        this.logger.log(`[SPRINT_17_PHASE_2] Simulated alert noise reduction: ${before} → ${after}`);
    }

    /**
     * Calculate simulated overall governance score
     *
     * Formula: Average of all dimension scores (same as Phase 1)
     *
     * @param dimensionMap Simulated dimension scores
     * @returns Overall governance score (0-100)
     */
    private calculateSimulatedOverallScore(dimensionMap: Map<GovernanceDimension, number>): number {
        const scores = Array.from(dimensionMap.values());
        const sum = scores.reduce((acc, score) => acc + score, 0);
        return sum / scores.length;
    }

    /**
     * Cap score to 0-100 range
     *
     * @param score Uncapped score
     * @returns Score capped to [0, 100]
     */
    private capScore(score: number): number {
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Generate simulation warnings
     *
     * Warnings for:
     * - Negative overall delta (policies worsen readiness)
     * - Individual dimension degradation
     * - Minimal overall improvement (<5 points)
     *
     * @param delta Overall score delta
     * @param impactedDimensions Dimension impacts
     * @returns Array of warning messages
     */
    private generateSimulationWarnings(delta: number, impactedDimensions: DimensionImpact[]): string[] {
        const warnings: string[] = [];

        // Warning: Overall degradation
        if (delta < 0) {
            warnings.push(`Overall readiness would DECREASE by ${Math.abs(Math.round(delta))} points - Policy changes may be counterproductive`);
        }

        // Warning: Minimal improvement
        if (delta >= 0 && delta < 5) {
            warnings.push(`Minimal overall improvement (${Math.round(delta)} points) - Consider additional policy changes`);
        }

        // Warning: Individual dimension degradation
        for (const impact of impactedDimensions) {
            if (impact.improvement < 0) {
                warnings.push(
                    `${impact.dimension} would DECREASE by ${Math.abs(impact.improvement)} points (${impact.before} → ${impact.after})`,
                );
            }
        }

        // General warning about simulation limitations
        warnings.push('Simulation uses simplified arithmetic rules - Real-world impact may vary');
        warnings.push('NO actual policy changes have been applied - This is hypothetical only');

        return warnings;
    }
}
