/**
 * SPRINT 17 – PHASE 3
 * Automation Readiness Service
 *
 * Purpose: Assess automation readiness for each candidate area
 *
 * Responsibilities:
 * - Compute readiness scores for automation candidates
 * - Identify blockers from control gaps
 * - Identify enabling factors from high scores
 * - Provide evidence from existing Sprint capabilities
 * - Generate comprehensive readiness reports
 *
 * Design Principles:
 * - READ-ONLY (no automation, no enforcement)
 * - Deterministic (rule-based scoring)
 * - No ML (pure arithmetic and threshold logic)
 * - Advisory only (provides insights, not actions)
 * - Regulator-safe (human-in-the-loop protection)
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    AutomationCandidate,
    AutomationReadinessSignal,
    AutomationReadinessReport,
    AutomationReadinessSummary,
    determineReadinessLevel,
    formatCandidateName,
    AUTOMATION_PREREQUISITES,
} from './automation-readiness.types';
import { GovernanceReadinessSnapshot } from './governance-readiness.types';
import { ControlGapReport } from './control-gap.types';
import { GovernanceReadinessService } from './governance-readiness.service';
import { ControlGapService } from './control-gap.service';
import { AutomationGuardrailsService } from './automation-guardrails.service';

/**
 * Automation candidates to assess
 */
const AUTOMATION_CANDIDATES: AutomationCandidate[] = [
    'RISK_SCORING',
    'ALERT_GENERATION',
    'ESCALATION_ROUTING',
    'PLAYBOOK_SUGGESTION',
    'COMPLIANCE_EXPORT',
    'INCIDENT_RECONSTRUCTION',
];

@Injectable()
export class AutomationReadinessService {
    private readonly logger = new Logger(AutomationReadinessService.name);

    constructor(
        private readonly governanceReadinessService: GovernanceReadinessService,
        private readonly controlGapService: ControlGapService,
        private readonly automationGuardrailsService: AutomationGuardrailsService,
    ) { }

    /**
     * Generate comprehensive automation readiness report
     *
     * Process:
     * 1. Get governance readiness snapshot (Phase 1)
     * 2. Get control gap report (Phase 2)
     * 3. Assess readiness for each automation candidate
     * 4. Sort by readiness score (descending)
     * 5. Generate summary statistics
     * 6. Include hard guardrails
     *
     * @returns AutomationReadinessReport with all assessments
     */
    async generateAutomationReadinessReport(): Promise<AutomationReadinessReport> {
        this.logger.log('[SPRINT_17_PHASE_3] Generating automation readiness report');

        // Get governance readiness snapshot (Phase 1)
        const snapshot = await this.governanceReadinessService.generateReadinessSnapshot();

        // Get control gap report (Phase 2)
        const gapReport = await this.controlGapService.generateControlGapReport();

        // Assess readiness for each candidate
        const signals = await Promise.all(
            AUTOMATION_CANDIDATES.map((candidate) => this.assessCandidate(candidate, snapshot, gapReport)),
        );

        // Sort by readiness score (descending)
        const sortedSignals = signals.sort((a, b) => b.readinessScore - a.readinessScore);

        // Generate summary statistics
        const summary = this.calculateSummary(sortedSignals);

        // Get hard guardrails
        const hardGuardrails = this.automationGuardrailsService.getHardGuardrails();

        const report: AutomationReadinessReport = {
            generatedAt: new Date().toISOString(),
            signals: sortedSignals,
            summary,
            hardGuardrails: Array.from(hardGuardrails),
            sprint: 'SPRINT_17_PHASE_3',
        };

        this.logger.log(
            `[SPRINT_17_PHASE_3] Automation readiness report generated (ready: ${summary.ready}, conditional: ${summary.conditional}, limited: ${summary.limited}, notReady: ${summary.notReady})`,
        );

        return report;
    }

    /**
     * Assess readiness for specific automation candidate
     *
     * @param candidate Automation candidate
     * @param snapshot Governance readiness snapshot
     * @param gapReport Control gap report
     * @returns Automation readiness signal
     */
    private async assessCandidate(
        candidate: AutomationCandidate,
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): Promise<AutomationReadinessSignal> {
        switch (candidate) {
            case 'RISK_SCORING':
                return this.assessRiskScoringReadiness(snapshot, gapReport);
            case 'ALERT_GENERATION':
                return this.assessAlertGenerationReadiness(snapshot, gapReport);
            case 'ESCALATION_ROUTING':
                return this.assessEscalationRoutingReadiness(snapshot, gapReport);
            case 'PLAYBOOK_SUGGESTION':
                return this.assessPlaybookSuggestionReadiness(snapshot, gapReport);
            case 'COMPLIANCE_EXPORT':
                return this.assessComplianceExportReadiness(snapshot, gapReport);
            case 'INCIDENT_RECONSTRUCTION':
                return this.assessIncidentReconstructionReadiness(snapshot, gapReport);
            default:
                throw new Error(`Unknown automation candidate: ${candidate}`);
        }
    }

    /**
     * Assess RISK_SCORING automation readiness
     *
     * Prerequisites:
     * - ADMIN_DECISION_TRACEABILITY >= 90
     * - INCIDENT_RECONSTRUCTABILITY = 100
     * - RISK_COVERAGE >= 80
     *
     * Readiness score = min(ADMIN_DECISION_TRACEABILITY, INCIDENT_RECONSTRUCTABILITY, RISK_COVERAGE)
     */
    private assessRiskScoringReadiness(
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): AutomationReadinessSignal {
        const adminDecision = this.getDimensionScore(snapshot, 'ADMIN_DECISION_TRACEABILITY');
        const incidentRecon = this.getDimensionScore(snapshot, 'INCIDENT_RECONSTRUCTABILITY');
        const riskCoverage = this.getDimensionScore(snapshot, 'RISK_COVERAGE');

        // Readiness score is minimum of key dimensions
        const readinessScore = Math.min(adminDecision, incidentRecon, riskCoverage);
        const readinessLevel = determineReadinessLevel(readinessScore);

        const blockers: string[] = [];
        const enablingFactors: string[] = [];
        const evidence: string[] = [];

        // Check prerequisites and blockers
        if (adminDecision < AUTOMATION_PREREQUISITES.MIN_ADMIN_DECISION_TRACEABILITY) {
            blockers.push(`ADMIN_DECISION_TRACEABILITY below 90 (current: ${Math.round(adminDecision)})`);
        } else {
            enablingFactors.push(`ADMIN_DECISION_TRACEABILITY at ${Math.round(adminDecision)} (exceeds 90 threshold)`);
        }

        if (incidentRecon < AUTOMATION_PREREQUISITES.MIN_INCIDENT_RECONSTRUCTABILITY) {
            blockers.push(`INCIDENT_RECONSTRUCTABILITY below 100 (current: ${Math.round(incidentRecon)})`);
        } else {
            enablingFactors.push('Sprint 15 incident reconstruction provides full audit capability');
        }

        if (riskCoverage < 80) {
            blockers.push(`RISK_COVERAGE below 80 (current: ${Math.round(riskCoverage)})`);
        } else {
            enablingFactors.push(`RISK_COVERAGE at ${Math.round(riskCoverage)} (production-ready)`);
        }

        // Evidence from existing capabilities
        evidence.push('Sprint 16 Phase 1: Risk Event Bus (normalized risk events)');
        evidence.push('Sprint 16 Phase 2: Admin Alert Engine (deterministic thresholds)');
        evidence.push('Sprint 14 Phase 3: Admin Decision Capture (audit trail)');

        const rationale =
            readinessLevel === 'READY'
                ? 'High readiness: All prerequisites met, deterministic risk scoring infrastructure operational'
                : readinessLevel === 'CONDITIONAL'
                    ? 'Conditional readiness: Core infrastructure present, human oversight recommended'
                    : readinessLevel === 'LIMITED'
                        ? 'Limited readiness: Partial infrastructure, significant human involvement required'
                        : 'Not ready: Critical prerequisites missing, automation unsafe';

        return {
            candidate: 'RISK_SCORING',
            readinessScore: Math.round(readinessScore),
            readinessLevel,
            blockers,
            enablingFactors,
            evidence,
            rationale,
        };
    }

    /**
     * Assess ALERT_GENERATION automation readiness
     *
     * Prerequisites:
     * - ALERT_SATURATION < 70 (system not overloaded)
     * - ADMIN_DECISION_TRACEABILITY >= 90
     *
     * Blocker: High alert saturation indicates system stress
     */
    private assessAlertGenerationReadiness(
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): AutomationReadinessSignal {
        const alertSaturation = this.getDimensionScore(snapshot, 'ALERT_SATURATION');
        const adminDecision = this.getDimensionScore(snapshot, 'ADMIN_DECISION_TRACEABILITY');

        const blockers: string[] = [];
        const enablingFactors: string[] = [];
        const evidence: string[] = [];

        // Alert saturation check (inverse: lower is better for automation)
        if (alertSaturation < AUTOMATION_PREREQUISITES.MAX_ALERT_SATURATION) {
            enablingFactors.push(`ALERT_SATURATION at ${Math.round(alertSaturation)} (sustainable, below 70 threshold)`);
        } else {
            blockers.push(`ALERT_SATURATION above 70 (current: ${Math.round(alertSaturation)}) - System stress detected`);
        }

        // Admin decision traceability check
        if (adminDecision >= AUTOMATION_PREREQUISITES.MIN_ADMIN_DECISION_TRACEABILITY) {
            enablingFactors.push(`ADMIN_DECISION_TRACEABILITY at ${Math.round(adminDecision)} (exceeds 90 threshold)`);
        } else {
            blockers.push(`ADMIN_DECISION_TRACEABILITY below 90 (current: ${Math.round(adminDecision)})`);
        }

        // Readiness score: penalize high saturation heavily
        let readinessScore = Math.min(adminDecision, 100 - alertSaturation);
        if (alertSaturation >= 70) {
            readinessScore = Math.min(readinessScore, 59); // Cap at LIMITED
        }

        const readinessLevel = determineReadinessLevel(readinessScore);

        // Evidence
        evidence.push('Sprint 16 Phase 2: Admin Alert Engine operational');
        evidence.push('Sprint 16 Phase 1: Risk Event Bus provides normalized inputs');
        evidence.push('Deterministic threshold-based alert generation exists');

        const rationale =
            blockers.length === 0
                ? 'Ready for automation: Alert engine deterministic, system capacity sustainable'
                : 'Blockers present: Alert volume sustainability concerns or audit trail gaps';

        return {
            candidate: 'ALERT_GENERATION',
            readinessScore: Math.round(readinessScore),
            readinessLevel,
            blockers,
            enablingFactors,
            evidence,
            rationale,
        };
    }

    /**
     * Assess ESCALATION_ROUTING automation readiness
     *
     * ALWAYS LIMITED or NOT_READY:
     * - Human judgment required for escalation decisions
     * - Regulatory sensitivity
     * - High-risk action requiring human confirmation
     *
     * Max score: 59 (LIMITED)
     */
    private assessEscalationRoutingReadiness(
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): AutomationReadinessSignal {
        const escalationVisibility = this.getDimensionScore(snapshot, 'ESCALATION_VISIBILITY');
        const adminDecision = this.getDimensionScore(snapshot, 'ADMIN_DECISION_TRACEABILITY');

        const blockers: string[] = [
            'Human judgment required for HIGH/CRITICAL escalation decisions',
            'Regulatory sensitivity requires human oversight',
            'Hard guardrail: All HIGH risk actions require explicit human confirmation',
        ];

        const enablingFactors: string[] = [];
        const evidence: string[] = [];

        // Even with high scores, cap at LIMITED
        const baseScore = Math.min(escalationVisibility, adminDecision);
        const readinessScore = Math.min(baseScore, 59); // Cap at LIMITED (59)
        const readinessLevel = determineReadinessLevel(readinessScore);

        if (escalationVisibility >= 80) {
            enablingFactors.push('Sprint 16 Phase 3: Alert correlation provides escalation insights');
        }

        evidence.push('Sprint 16 Phase 3: Alert Incident Correlation');
        evidence.push('Sprint 14: Risk Escalation Service');
        evidence.push('Human escalation workflow established');

        const rationale =
            'Limited readiness only: Escalation routing requires human judgment due to regulatory sensitivity and high-risk nature. Automation may assist but cannot replace human decision-making.';

        return {
            candidate: 'ESCALATION_ROUTING',
            readinessScore: Math.round(readinessScore),
            readinessLevel,
            blockers,
            enablingFactors,
            evidence,
            rationale,
        };
    }

    /**
     * Assess PLAYBOOK_SUGGESTION automation readiness
     *
     * HIGH readiness potential:
     * - Sprint 14 deterministic playbooks operational
     * - Advisory recommendations (not enforcement)
     * - Admin decision capture exists
     *
     * Readiness score based on playbook infrastructure and decision traceability
     */
    private assessPlaybookSuggestionReadiness(
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): AutomationReadinessSignal {
        const adminDecision = this.getDimensionScore(snapshot, 'ADMIN_DECISION_TRACEABILITY');
        const incidentRecon = this.getDimensionScore(snapshot, 'INCIDENT_RECONSTRUCTABILITY');

        const blockers: string[] = [];
        const enablingFactors: string[] = [
            'Sprint 14 Phase 1: Deterministic risk playbooks operational',
            'Sprint 14 Phase 2: Contextual playbook resolution with relevance scoring',
            'Advisory recommendations only (not enforcement)',
            'Human admin makes final decisions',
        ];

        const evidence: string[] = [
            'Sprint 14 Phase 1: Risk Playbooks',
            'Sprint 14 Phase 2: Contextual Resolution',
            'Sprint 14 Phase 4: Effectiveness Metrics',
            'Explainable relevance scoring',
        ];

        // Check prerequisites
        if (adminDecision < AUTOMATION_PREREQUISITES.MIN_ADMIN_DECISION_TRACEABILITY) {
            blockers.push(`ADMIN_DECISION_TRACEABILITY below 90 (current: ${Math.round(adminDecision)})`);
        }

        if (incidentRecon < AUTOMATION_PREREQUISITES.MIN_INCIDENT_RECONSTRUCTABILITY) {
            blockers.push(`INCIDENT_RECONSTRUCTABILITY below 100 (current: ${Math.round(incidentRecon)})`);
        }

        // High readiness: playbooks are deterministic and advisory
        const readinessScore = Math.min(adminDecision, incidentRecon);
        const readinessLevel = determineReadinessLevel(readinessScore);

        const rationale =
            readinessLevel === 'READY' || readinessLevel === 'CONDITIONAL'
                ? 'High readiness: Deterministic playbook suggestion with advisory-only output, full audit trail, human decision-making preserved'
                : 'Prerequisites not met: Audit trail or reconstruction capability insufficient';

        return {
            candidate: 'PLAYBOOK_SUGGESTION',
            readinessScore: Math.round(readinessScore),
            readinessLevel,
            blockers,
            enablingFactors,
            evidence,
            rationale,
        };
    }

    /**
     * Assess COMPLIANCE_EXPORT automation readiness
     *
     * HIGH readiness potential:
     * - Sprint 16 Phase 4 SIEM export operational
     * - Deterministic export formats
     * - Read-only operation (no side effects)
     *
     * Readiness score based on SIEM readiness and admin traceability
     */
    private assessComplianceExportReadiness(
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): AutomationReadinessSignal {
        const siemReadiness = this.getDimensionScore(snapshot, 'SIEM_EXPORT_READINESS');
        const adminDecision = this.getDimensionScore(snapshot, 'ADMIN_DECISION_TRACEABILITY');

        const blockers: string[] = [];
        const enablingFactors: string[] = [
            'Sprint 16 Phase 4: SIEM export service operational',
            'Deterministic export formats (JSON, NDJSON)',
            'Read-only operation (no side effects)',
            'Compatible with Splunk, Elastic, Azure Sentinel',
        ];

        const evidence: string[] = [
            'Sprint 16 Phase 4: SIEM Export Service',
            'Sprint 16 Phase 4: Dashboard Metrics',
            'Streaming export capability',
            'Compliance-ready formats',
        ];

        // Check prerequisites
        if (siemReadiness < AUTOMATION_PREREQUISITES.MIN_SIEM_EXPORT_READINESS) {
            blockers.push(`SIEM_EXPORT_READINESS below 100 (current: ${Math.round(siemReadiness)})`);
        }

        if (adminDecision < AUTOMATION_PREREQUISITES.MIN_ADMIN_DECISION_TRACEABILITY) {
            blockers.push(`ADMIN_DECISION_TRACEABILITY below 90 (current: ${Math.round(adminDecision)})`);
        }

        // High readiness: deterministic, read-only export
        const readinessScore = Math.min(siemReadiness, adminDecision);
        const readinessLevel = determineReadinessLevel(readinessScore);

        const rationale =
            readinessLevel === 'READY' || readinessLevel === 'CONDITIONAL'
                ? 'High readiness: Deterministic compliance export with read-only operation, full audit support, regulator-friendly'
                : 'Prerequisites not met: Export infrastructure or audit trail insufficient';

        return {
            candidate: 'COMPLIANCE_EXPORT',
            readinessScore: Math.round(readinessScore),
            readinessLevel,
            blockers,
            enablingFactors,
            evidence,
            rationale,
        };
    }

    /**
     * Assess INCIDENT_RECONSTRUCTION automation readiness
     *
     * HIGH readiness potential:
     * - Sprint 15 incident reconstruction operational
     * - Deterministic timeline aggregation
     * - Evidence-based (no inference)
     *
     * Readiness score based on reconstruction capability and admin traceability
     */
    private assessIncidentReconstructionReadiness(
        snapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
    ): AutomationReadinessSignal {
        const incidentRecon = this.getDimensionScore(snapshot, 'INCIDENT_RECONSTRUCTABILITY');
        const adminDecision = this.getDimensionScore(snapshot, 'ADMIN_DECISION_TRACEABILITY');

        const blockers: string[] = [];
        const enablingFactors: string[] = [
            'Sprint 15 Phase 1: Incident reconstruction service operational',
            'Deterministic timeline aggregation',
            'Evidence-based reconstruction (no inference)',
            'Full forensic capability',
        ];

        const evidence: string[] = [
            'Sprint 15 Phase 1: Incident Reconstruction',
            'Sprint 15 Phase 2: Compliance Narrative',
            'Sprint 15 Phase 3: Incident Exports',
            'Sprint 15 Phase 4: Forensic Bundles',
        ];

        // Check prerequisites
        if (incidentRecon < AUTOMATION_PREREQUISITES.MIN_INCIDENT_RECONSTRUCTABILITY) {
            blockers.push(`INCIDENT_RECONSTRUCTABILITY below 100 (current: ${Math.round(incidentRecon)})`);
        }

        if (adminDecision < AUTOMATION_PREREQUISITES.MIN_ADMIN_DECISION_TRACEABILITY) {
            blockers.push(`ADMIN_DECISION_TRACEABILITY below 90 (current: ${Math.round(adminDecision)})`);
        }

        // High readiness: deterministic reconstruction
        const readinessScore = Math.min(incidentRecon, adminDecision);
        const readinessLevel = determineReadinessLevel(readinessScore);

        const rationale =
            readinessLevel === 'READY' || readinessLevel === 'CONDITIONAL'
                ? 'High readiness: Deterministic incident reconstruction with evidence-based timeline, full audit capability, regulator-friendly'
                : 'Prerequisites not met: Reconstruction infrastructure or audit trail insufficient';

        return {
            candidate: 'INCIDENT_RECONSTRUCTION',
            readinessScore: Math.round(readinessScore),
            readinessLevel,
            blockers,
            enablingFactors,
            evidence,
            rationale,
        };
    }

    /**
     * Get dimension score from governance snapshot
     *
     * @param snapshot Governance readiness snapshot
     * @param dimension Dimension name
     * @returns Dimension score (0-100)
     */
    private getDimensionScore(snapshot: GovernanceReadinessSnapshot, dimension: string): number {
        const dim = snapshot.dimensions.find((d) => d.dimension === dimension);
        return dim?.score ?? 0;
    }

    /**
     * Calculate summary statistics
     *
     * @param signals Automation readiness signals
     * @returns Summary statistics
     */
    private calculateSummary(signals: AutomationReadinessSignal[]): AutomationReadinessSummary {
        return {
            ready: signals.filter((s) => s.readinessLevel === 'READY').length,
            conditional: signals.filter((s) => s.readinessLevel === 'CONDITIONAL').length,
            limited: signals.filter((s) => s.readinessLevel === 'LIMITED').length,
            notReady: signals.filter((s) => s.readinessLevel === 'NOT_READY').length,
        };
    }
}
