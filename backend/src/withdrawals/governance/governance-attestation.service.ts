/**
 * SPRINT 17 – PHASE 4
 * Governance Attestation Service
 *
 * Purpose: Generate executive governance attestation snapshots
 *
 * Responsibilities:
 * - Aggregate outputs from Sprint 17 Phases 1-3
 * - Generate deterministic snapshot IDs (SHA-256)
 * - Create executive-consumable governance summaries
 * - Include mandatory disclaimer
 * - Provide evidence references
 *
 * Design Principles:
 * - READ-ONLY (no approvals, no state changes)
 * - Deterministic (same inputs → same snapshot ID)
 * - Evidence-backed (concrete Sprint references)
 * - Regulator-grade (board reporting, audit evidence)
 * - Non-approval (clear disclaimer)
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    AttestationRole,
    GovernanceAttestationSnapshot,
    AttestationReadinessLevel,
    GovernanceReadinessSummary,
    ControlGapsSummary,
    AutomationReadinessSummary,
    ATTESTATION_DISCLAIMER,
} from './governance-attestation.types';
import { GovernanceReadinessService } from './governance-readiness.service';
import { ControlGapService } from './control-gap.service';
import { AutomationReadinessService } from './automation-readiness.service';
import { AutomationGuardrailsService } from './automation-guardrails.service';

/**
 * Evidence references to Sprint capabilities
 * Concrete system features supporting attestation
 */
const EVIDENCE_REFERENCES = [
    'Sprint 11-13: Risk evaluation, policy enforcement, cooling periods',
    'Sprint 14: Risk playbooks, contextual resolution, admin decision capture, effectiveness metrics',
    'Sprint 15: Incident reconstruction, compliance narrative, incident exports, forensic bundles',
    'Sprint 16 Phase 1: Risk event normalization (unified event taxonomy)',
    'Sprint 16 Phase 2: Admin alerts with deterministic thresholds',
    'Sprint 16 Phase 3: Alert correlation and incident linking',
    'Sprint 16 Phase 4: Dashboard metrics and SIEM exports',
    'Sprint 17 Phase 1: Governance readiness assessment (6 dimensions)',
    'Sprint 17 Phase 2: Control gap detection and policy simulation',
    'Sprint 17 Phase 3: Automation readiness signals and guardrails',
] as const;

@Injectable()
export class GovernanceAttestationService {
    private readonly logger = new Logger(GovernanceAttestationService.name);

    constructor(
        private readonly governanceReadinessService: GovernanceReadinessService,
        private readonly controlGapService: ControlGapService,
        private readonly automationReadinessService: AutomationReadinessService,
        private readonly automationGuardrailsService: AutomationGuardrailsService,
    ) { }

    /**
     * Generate governance attestation snapshot
     *
     * Process:
     * 1. Aggregate Phase 1 governance readiness
     * 2. Aggregate Phase 2 control gaps
     * 3. Aggregate Phase 3 automation readiness
     * 4. Get hard guardrails
     * 5. Generate deterministic snapshot ID
     * 6. Include mandatory disclaimer
     * 7. Add evidence references
     *
     * @param role Executive role attesting to governance posture
     * @returns GovernanceAttestationSnapshot
     */
    async generateAttestationSnapshot(role: AttestationRole): Promise<GovernanceAttestationSnapshot> {
        this.logger.log(`[SPRINT_17_PHASE_4] Generating governance attestation snapshot for role: ${role}`);

        // Phase 1: Governance readiness
        const readinessSnapshot = await this.governanceReadinessService.generateReadinessSnapshot();
        const governanceReadiness = this.createGovernanceReadinessSummary(readinessSnapshot);

        // Phase 2: Control gaps
        const gapReport = await this.controlGapService.generateControlGapReport();
        const controlGapsSummary = this.createControlGapsSummary(gapReport);

        // Phase 3: Automation readiness
        const automationReport = await this.automationReadinessService.generateAutomationReadinessReport();
        const automationReadinessSummary = this.createAutomationReadinessSummary(automationReport);

        // Get hard guardrails
        const hardGuardrails = Array.from(this.automationGuardrailsService.getHardGuardrails());

        // Generate timestamp
        const generatedAt = new Date().toISOString();

        // Generate deterministic snapshot ID
        const snapshotId = this.generateSnapshotId(
            governanceReadiness,
            controlGapsSummary,
            automationReadinessSummary,
            hardGuardrails,
            role,
            generatedAt,
        );

        // Create snapshot
        const snapshot: GovernanceAttestationSnapshot = {
            snapshotId,
            generatedAt,
            attestedByRole: role,
            governanceReadiness,
            controlGapsSummary,
            automationReadinessSummary,
            hardGuardrails,
            evidenceReferences: Array.from(EVIDENCE_REFERENCES),
            disclaimer: ATTESTATION_DISCLAIMER,
            sprint: 'SPRINT_17_PHASE_4',
        };

        this.logger.log(
            `[SPRINT_17_PHASE_4] Governance attestation snapshot generated (snapshotId: ${snapshotId.substring(0, 16)}..., role: ${role}, readiness: ${governanceReadiness.readinessLevel})`,
        );

        return snapshot;
    }

    /**
     * Create governance readiness summary for attestation
     *
     * @param snapshot Governance readiness snapshot (Phase 1)
     * @returns GovernanceReadinessSummary
     */
    private createGovernanceReadinessSummary(snapshot: any): GovernanceReadinessSummary {
        const overallScore = Math.round(snapshot.overallScore);
        const readinessLevel = this.mapReadinessLevel(snapshot.readinessLevel);

        return {
            overallScore,
            readinessLevel,
        };
    }

    /**
     * Create control gaps summary for attestation
     *
     * @param report Control gap report (Phase 2)
     * @returns ControlGapsSummary
     */
    private createControlGapsSummary(report: any): ControlGapsSummary {
        return {
            total: report.gapSummary.total,
            high: report.gapSummary.high,
            medium: report.gapSummary.medium,
            low: report.gapSummary.low,
        };
    }

    /**
     * Create automation readiness summary for attestation
     *
     * @param report Automation readiness report (Phase 3)
     * @returns AutomationReadinessSummary
     */
    private createAutomationReadinessSummary(report: any): AutomationReadinessSummary {
        return {
            ready: report.summary.ready,
            conditional: report.summary.conditional,
            limited: report.summary.limited,
            notReady: report.summary.notReady,
        };
    }

    /**
     * Map governance readiness level to attestation readiness level
     *
     * @param level Governance readiness level
     * @returns AttestationReadinessLevel
     */
    private mapReadinessLevel(level: string): AttestationReadinessLevel {
        return level as AttestationReadinessLevel;
    }

    /**
     * Generate deterministic snapshot ID using SHA-256
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
     * Truncating timestamp to hour ensures snapshots generated
     * within same hour with same governance state have same ID
     *
     * @param governanceReadiness Governance readiness summary
     * @param controlGapsSummary Control gaps summary
     * @param automationReadinessSummary Automation readiness summary
     * @param hardGuardrails Hard guardrails
     * @param role Attestation role
     * @param generatedAt Generation timestamp
     * @returns SHA-256 hash as hex string
     */
    private generateSnapshotId(
        governanceReadiness: GovernanceReadinessSummary,
        controlGapsSummary: ControlGapsSummary,
        automationReadinessSummary: AutomationReadinessSummary,
        hardGuardrails: string[],
        role: AttestationRole,
        generatedAt: string,
    ): string {
        // Truncate timestamp to hour for determinism within same hour
        const hourTimestamp = new Date(generatedAt).toISOString().substring(0, 13); // YYYY-MM-DDTHH

        // Create deterministic input string
        const input = JSON.stringify({
            governanceReadiness,
            controlGapsSummary,
            automationReadinessSummary,
            hardGuardrails: hardGuardrails.sort(), // Sort for determinism
            attestedByRole: role,
            hourTimestamp,
        });

        // Generate SHA-256 hash
        return createHash('sha256').update(input).digest('hex');
    }
}
