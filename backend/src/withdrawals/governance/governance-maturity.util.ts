import {
    GovernanceMaturityStage,
    GovernanceMaturityAssessment,
    GovernanceTimeline,
    MATURITY_STAGE_DESCRIPTIONS,
} from './governance-timeline.types';

/**
 * SPRINT 19 – PHASE 1: Governance Maturity Classification Utility
 * 
 * PURPOSE:
 * Map timeline event density and capability coverage to maturity stages.
 * 
 * CRITICAL CONSTRAINTS:
 * - DETERMINISTIC (rule-based classification only)
 * - NO INFERENCE (no ML, no scoring replacement)
 * - EVIDENCE-BACKED (rationale tied to timeline events)
 * 
 * MATURITY STAGES:
 * - FOUNDATIONAL: Basic signals (reconstruction, observability)
 * - STRUCTURED: Policies + alerts established
 * - GOVERNED: Attestation + gap analysis present
 * - AUDIT_READY: Policy drift + evidence chains complete
 * 
 * QUALITY STANDARD:
 * Transparent, auditable maturity classification suitable for board reporting.
 */

/**
 * Assess governance maturity based on timeline
 * 
 * DETERMINISM GUARANTEE:
 * Same timeline events → same maturity stage
 * 
 * CLASSIFICATION RULES:
 * - FOUNDATIONAL: Has CAPABILITY_INTRODUCED or GOVERNANCE_SIGNAL events
 * - STRUCTURED: Has GOVERNANCE_SIGNAL events AND alerts/observability
 * - GOVERNED: Has ATTESTATION events
 * - AUDIT_READY: Has POLICY_DRIFT events AND ATTESTATION events
 * 
 * PRIORITY:
 * Highest achieved stage wins (AUDIT_READY > GOVERNED > STRUCTURED > FOUNDATIONAL)
 */
export function assessGovernanceMaturity(
    timeline: GovernanceTimeline
): GovernanceMaturityAssessment {
    const events = timeline.events;
    const summary = timeline.summary;

    // Count events by category for classification
    const hasCapabilityEvents = summary.byCategory.CAPABILITY_INTRODUCED > 0;
    const hasGovernanceSignals = summary.byCategory.GOVERNANCE_SIGNAL > 0;
    const hasPolicyEvaluation = summary.byCategory.POLICY_EVALUATION > 0;
    const hasPolicyDrift = summary.byCategory.POLICY_DRIFT > 0;
    const hasAttestation = summary.byCategory.ATTESTATION > 0;

    // Determine maturity stage (highest achieved)
    let currentStage: GovernanceMaturityStage;
    const rationale: string[] = [];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // AUDIT_READY: Policy drift detection + attestation present
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (hasPolicyDrift && hasAttestation) {
        currentStage = 'AUDIT_READY';
        rationale.push(
            'Policy drift detection system active (Sprint 18 Phase 2)',
            'Executive attestation snapshots established (Sprint 17 Phase 4)',
            'Policy-as-code evaluation engine operational (Sprint 18 Phase 1)',
            'Complete governance evolution tracking with historical comparison',
            'Full evidence chain from signals → policies → drift → attestation'
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GOVERNED: Attestation + gap analysis present
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (hasAttestation) {
        currentStage = 'GOVERNED';
        rationale.push(
            'Executive attestation system operational (Sprint 17 Phase 4)',
            'Control gap detection active (Sprint 17 Phase 2)',
            'Governance readiness assessment established (Sprint 17 Phase 1)',
            'Formal executive certification process in place'
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STRUCTURED: Policies or alerts established
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (hasPolicyEvaluation || hasGovernanceSignals) {
        currentStage = 'STRUCTURED';

        if (hasPolicyEvaluation) {
            rationale.push('Policy-as-code evaluation system operational (Sprint 18 Phase 1)');
        }

        if (hasGovernanceSignals) {
            rationale.push(
                'Observable governance signals established (Sprint 16)',
                'Alert system with SIEM integration active (Sprint 16)'
            );
        }

        rationale.push('Formal governance policies and monitoring in place');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FOUNDATIONAL: Basic capabilities present
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else if (hasCapabilityEvents) {
        currentStage = 'FOUNDATIONAL';
        rationale.push(
            'Transaction reconstruction capability delivered (Sprint 11)',
            'Basic governance signals present',
            'Foundation for forensic analysis established'
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FALLBACK: No governance events (should not occur in practice)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else {
        currentStage = 'FOUNDATIONAL';
        rationale.push('Minimal governance capabilities detected');
    }

    return {
        currentStage,
        rationale,
        totalEvents: summary.totalEvents,
        eventsByCategory: summary.byCategory,
    };
}

/**
 * Get maturity stage description
 * 
 * Returns human-readable definition of a maturity stage.
 */
export function getMaturityStageDescription(
    stage: GovernanceMaturityStage
): string {
    return MATURITY_STAGE_DESCRIPTIONS[stage];
}

/**
 * Check if maturity stage meets minimum threshold
 * 
 * USAGE:
 * Validate if governance maturity is sufficient for specific operations.
 * 
 * EXAMPLE:
 * if (meetsMinimumMaturity('GOVERNED', currentStage)) {
 *   // Proceed with governance-intensive operation
 * }
 * 
 * NON-GOAL:
 * This does NOT authorize automation or certify compliance.
 */
export function meetsMinimumMaturity(
    required: GovernanceMaturityStage,
    current: GovernanceMaturityStage
): boolean {
    const maturityOrder: GovernanceMaturityStage[] = [
        'FOUNDATIONAL',
        'STRUCTURED',
        'GOVERNED',
        'AUDIT_READY',
    ];

    const requiredIndex = maturityOrder.indexOf(required);
    const currentIndex = maturityOrder.indexOf(current);

    return currentIndex >= requiredIndex;
}

/**
 * Get next maturity stage
 * 
 * USAGE:
 * Identify what capabilities are needed to advance maturity.
 * 
 * EXAMPLE:
 * const next = getNextMaturityStage('STRUCTURED');
 * // Returns: 'GOVERNED'
 */
export function getNextMaturityStage(
    current: GovernanceMaturityStage
): GovernanceMaturityStage | null {
    const maturityProgression: Record<GovernanceMaturityStage, GovernanceMaturityStage | null> = {
        FOUNDATIONAL: 'STRUCTURED',
        STRUCTURED: 'GOVERNED',
        GOVERNED: 'AUDIT_READY',
        AUDIT_READY: null, // Already at highest stage
    };

    return maturityProgression[current];
}

/**
 * Get capabilities required for next maturity stage
 * 
 * USAGE:
 * Provide guidance on what capabilities are needed to advance maturity.
 * 
 * EXAMPLE:
 * const requirements = getMaturityRequirements('STRUCTURED');
 * // Returns: ['Executive attestation system', 'Control gap detection', ...]
 */
export function getMaturityRequirements(
    targetStage: GovernanceMaturityStage
): string[] {
    const requirements: Record<GovernanceMaturityStage, string[]> = {
        FOUNDATIONAL: [
            'Transaction reconstruction capability',
            'Basic observability signals',
        ],
        STRUCTURED: [
            'Observable governance signals (alerts, monitoring)',
            'Policy-as-code evaluation system',
            'SIEM integration for audit trails',
        ],
        GOVERNED: [
            'Executive attestation system (CISO, CTO, COMPLIANCE_OFFICER, RISK_OFFICER)',
            'Control gap detection and analysis',
            'Governance readiness assessment',
            'Automation readiness evaluation',
        ],
        AUDIT_READY: [
            'Policy drift detection system',
            'Historical governance comparison capability',
            'Complete evidence chain (signals → policies → drift → attestation)',
            'Regulator-grade audit trail',
        ],
    };

    return requirements[targetStage] || [];
}

/**
 * Calculate maturity progress percentage
 * 
 * USAGE:
 * Provide visual indicator of governance maturity progression.
 * 
 * CALCULATION:
 * FOUNDATIONAL: 25%
 * STRUCTURED: 50%
 * GOVERNED: 75%
 * AUDIT_READY: 100%
 * 
 * NON-GOAL:
 * This is NOT a compliance score or certification.
 */
export function calculateMaturityProgress(
    stage: GovernanceMaturityStage
): number {
    const progressMap: Record<GovernanceMaturityStage, number> = {
        FOUNDATIONAL: 25,
        STRUCTURED: 50,
        GOVERNED: 75,
        AUDIT_READY: 100,
    };

    return progressMap[stage];
}
