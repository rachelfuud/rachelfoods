/**
 * SPRINT 17 – PHASE 2
 * Control Gap Detection & Policy Simulation Types
 *
 * Purpose: Type definitions for governance control gap analysis and policy simulation
 *
 * Key Concepts:
 * - ControlGap: Identified weakness in governance dimension
 * - ControlGapReport: Comprehensive gap assessment
 * - PolicySimulationInput: Hypothetical policy changes
 * - PolicySimulationResult: Predicted impact of policy changes
 *
 * Design Principles:
 * - READ-ONLY types (no mutations)
 * - Deterministic gap identification (SHA-256 IDs)
 * - Severity-based classification
 * - Advisory remediation hints only
 * - Simulation outputs are hypothetical only
 */

import { GovernanceDimension } from './governance-readiness.types';

/**
 * Severity levels for control gaps
 *
 * Rules:
 * - HIGH: score < 50 (critical governance weakness)
 * - MEDIUM: score 50-69 (moderate governance gap)
 * - LOW: score 70-79 (minor governance improvement area)
 */
export type ControlGapSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Individual control gap in a governance dimension
 *
 * Properties:
 * - id: Deterministic SHA-256 hash for gap tracking
 * - dimension: Governance dimension with gap
 * - severity: Gap severity based on score ranges
 * - scoreObserved: Current dimension score (from readiness snapshot)
 * - scoreExpected: Target score (typically 80 for production readiness)
 * - description: Human-readable gap explanation
 * - evidence: Supporting data for gap identification
 * - remediationHints: Advisory suggestions (NO enforcement)
 */
export interface ControlGap {
    /**
     * Deterministic gap identifier
     * Formula: sha256(dimension + scoreObserved + scoreExpected)
     */
    readonly id: string;

    /**
     * Governance dimension with identified gap
     */
    readonly dimension: GovernanceDimension;

    /**
     * Gap severity classification
     */
    readonly severity: ControlGapSeverity;

    /**
     * Current observed score (0-100)
     */
    readonly scoreObserved: number;

    /**
     * Expected target score (typically 80)
     */
    readonly scoreExpected: number;

    /**
     * Human-readable description of the gap
     */
    readonly description: string;

    /**
     * Supporting evidence for gap identification
     */
    readonly evidence: readonly string[];

    /**
     * Advisory remediation suggestions (NO enforcement)
     */
    readonly remediationHints: readonly string[];
}

/**
 * Summary statistics for control gaps
 */
export interface ControlGapSummary {
    readonly total: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
}

/**
 * Comprehensive control gap assessment report
 *
 * Generated from Sprint 17 Phase 1 readiness snapshot
 * Identifies all dimensions scoring < 80
 */
export interface ControlGapReport {
    /**
     * Report generation timestamp (ISO 8601)
     */
    readonly generatedAt: string;

    /**
     * Analysis window in hours (fixed at 24 for Phase 2)
     */
    readonly windowHours: 24;

    /**
     * Identified control gaps (sorted by severity: HIGH → MEDIUM → LOW)
     */
    readonly gaps: readonly ControlGap[];

    /**
     * Summary statistics
     */
    readonly gapSummary: ControlGapSummary;

    /**
     * Sprint marker for audit trail
     */
    readonly sprint: 'SPRINT_17_PHASE_2';
}

/**
 * Policy change assumptions for simulation
 *
 * Each property represents a hypothetical policy modification
 * that would affect governance dimension scores
 *
 * Simulation Rules:
 * - increaseAdminDecisionCapture: +20 to ADMIN_DECISION_TRACEABILITY
 * - tightenAlertThresholds: +10 to ESCALATION_VISIBILITY, -5 to ALERT_SATURATION
 * - forceEscalationLinking: +15 to ESCALATION_VISIBILITY
 * - reduceAlertNoise: +20 to ALERT_SATURATION
 *
 * All score changes capped at 0-100 range
 */
export interface PolicySimulationInput {
    /**
     * Hypothetical policy changes to simulate
     */
    readonly assumedChanges: {
        /**
         * Simulate increased admin decision capture coverage
         * Impact: +20 to ADMIN_DECISION_TRACEABILITY (cap at 100)
         */
        readonly increaseAdminDecisionCapture?: boolean;

        /**
         * Simulate tighter alert thresholds
         * Impact: +10 to ESCALATION_VISIBILITY, -5 to ALERT_SATURATION
         */
        readonly tightenAlertThresholds?: boolean;

        /**
         * Simulate mandatory escalation linking
         * Impact: +15 to ESCALATION_VISIBILITY (cap at 100)
         */
        readonly forceEscalationLinking?: boolean;

        /**
         * Simulate alert noise reduction initiatives
         * Impact: +20 to ALERT_SATURATION (cap at 100)
         */
        readonly reduceAlertNoise?: boolean;
    };
}

/**
 * Dimension-level impact of policy simulation
 */
export interface DimensionImpact {
    readonly dimension: GovernanceDimension;
    readonly before: number;
    readonly after: number;
    readonly improvement: number; // Can be negative if policy worsens score
}

/**
 * Result of policy simulation
 *
 * Shows hypothetical impact of policy changes on governance readiness
 * NO actual policy changes are applied
 */
export interface PolicySimulationResult {
    /**
     * Simulation execution timestamp (ISO 8601)
     */
    readonly simulatedAt: string;

    /**
     * Current overall governance readiness score (before simulation)
     */
    readonly baselineScore: number;

    /**
     * Hypothetical overall score after policy changes
     */
    readonly simulatedScore: number;

    /**
     * Overall score change (simulatedScore - baselineScore)
     */
    readonly delta: number;

    /**
     * Per-dimension impact breakdown
     * Only includes dimensions affected by simulation
     */
    readonly impactedDimensions: readonly DimensionImpact[];

    /**
     * Assumptions made in simulation
     * Explains arithmetic rules applied
     */
    readonly assumptions: readonly string[];

    /**
     * Warnings about simulation limitations
     */
    readonly warnings: readonly string[];

    /**
     * Sprint marker for audit trail
     */
    readonly sprint: 'SPRINT_17_PHASE_2';
}

/**
 * Type guard for valid control gap severity
 */
export function isValidSeverity(severity: string): severity is ControlGapSeverity {
    return severity === 'LOW' || severity === 'MEDIUM' || severity === 'HIGH';
}

/**
 * Determine gap severity from observed score
 *
 * Rules:
 * - score < 50: HIGH
 * - score 50-69: MEDIUM
 * - score 70-79: LOW
 * - score >= 80: No gap (should not be called)
 */
export function determineGapSeverity(scoreObserved: number): ControlGapSeverity {
    if (scoreObserved < 50) {
        return 'HIGH';
    } else if (scoreObserved < 70) {
        return 'MEDIUM';
    } else {
        return 'LOW'; // 70-79
    }
}
