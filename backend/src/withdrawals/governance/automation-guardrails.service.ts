/**
 * SPRINT 17 – PHASE 3
 * Automation Guardrails Service
 *
 * Purpose: Define non-negotiable guardrails for any future automation
 *
 * Responsibilities:
 * - Provide static, deterministic guardrail definitions
 * - Ensure human-in-the-loop protection
 * - Maintain regulator-safe constraints
 * - Document automation prohibitions
 *
 * Design Principles:
 * - Static (never changes without code update)
 * - Deterministic (always returns same guardrails)
 * - Human-centric (prioritizes human judgment)
 * - Compliance-safe (regulator-friendly constraints)
 * - Audit-ready (clear documentation)
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Hard guardrails for automation
 * These are NON-NEGOTIABLE constraints that MUST be enforced
 * for any future automation implementation
 */
const HARD_GUARDRAILS = [
    // Approval/Rejection Protection
    'No automation may approve or reject withdrawals - Human decision required for all final approval actions',
    'No automation may modify withdrawal amounts or destinations - Human verification required for financial changes',

    // High-Risk Action Protection
    'All HIGH or CRITICAL risk actions require explicit human confirmation - No automated escalation without oversight',
    'All regulatory-sensitive operations require human judgment - No automated compliance decisions',

    // Reversibility & Observability
    'All automated actions must be reversible by platform admins - No irreversible automation',
    'All automated actions must be fully logged with SPRINT_17_PHASE_3 marker - Complete audit trail required',
    'All automated actions must be observable in real-time dashboards - No hidden automation',

    // Human Override
    'Platform admins must be able to override or disable any automation at any time - Human control paramount',
    'All automation must have manual fallback mode - No single point of failure',

    // Audit & Accountability
    'All automation must provide clear rationale for every action - Explainability required',
    'All automation must link to governance readiness snapshots - Audit trail to readiness assessment',
    'All automation must be reviewed quarterly by compliance team - Regular governance review',

    // Risk Threshold Protection
    'No automation for withdrawal amounts exceeding platform-defined high-value thresholds - Human review for large withdrawals',
    'No automation for users with historical fraud indicators - Human review for high-risk users',

    // Data Protection
    'All automation must respect user privacy and data minimization principles - No excessive data collection',
    'All automation must comply with GDPR, CCPA, and regional data protection laws - Regulatory compliance required',

    // System Health Protection
    'No automation during system degradation or high alert saturation - Human judgment during stress',
    'No automation if ADMIN_DECISION_TRACEABILITY < 90 - Prerequisite for any automation',
    'No automation if INCIDENT_RECONSTRUCTABILITY < 100 - Full audit capability required',

    // Transparency & Disclosure
    'Users must be notified when automation affects their withdrawals - Transparency required',
    'Platform must maintain public documentation of automation scope and limitations - No hidden automation',
] as const;

@Injectable()
export class AutomationGuardrailsService {
    private readonly logger = new Logger(AutomationGuardrailsService.name);

    /**
     * Get all hard guardrails
     *
     * Returns static, deterministic list of non-negotiable constraints
     * that MUST be enforced for any future automation
     *
     * @returns Array of hard guardrail strings
     */
    getHardGuardrails(): readonly string[] {
        this.logger.log('[SPRINT_17_PHASE_3] Retrieving hard guardrails');
        return HARD_GUARDRAILS;
    }

    /**
     * Get guardrail count (for reporting)
     *
     * @returns Number of hard guardrails
     */
    getGuardrailCount(): number {
        return HARD_GUARDRAILS.length;
    }

    /**
     * Validate if automation prerequisites are met
     *
     * Checks if system meets minimum requirements for automation consideration
     * Based on governance dimension scores
     *
     * @param adminDecisionTraceability ADMIN_DECISION_TRACEABILITY score
     * @param incidentReconstructability INCIDENT_RECONSTRUCTABILITY score
     * @returns True if prerequisites met, false otherwise
     */
    validateAutomationPrerequisites(adminDecisionTraceability: number, incidentReconstructability: number): boolean {
        const prerequisitesMet = adminDecisionTraceability >= 90 && incidentReconstructability >= 100;

        if (!prerequisitesMet) {
            this.logger.warn(
                `[SPRINT_17_PHASE_3] Automation prerequisites NOT met (adminDecisionTraceability: ${adminDecisionTraceability}, incidentReconstructability: ${incidentReconstructability})`,
            );
        }

        return prerequisitesMet;
    }
}
