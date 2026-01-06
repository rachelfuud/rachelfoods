/**
 * SPRINT 18 – PHASE 1
 * Policy Evaluation Service
 *
 * Purpose: Evaluate declarative governance policies against current state
 *
 * Design Principles:
 * - Advisory only (NO enforcement, NO automation)
 * - READ-ONLY (no persistence, no state changes, no event emission)
 * - Deterministic (same inputs → same outputs)
 * - Evidence-backed rationale
 * - Human-interpretable results
 * - Aligned with Sprint 17 guardrails
 *
 * Critical Constraint:
 * Policy evaluation does NOT trigger actions, block operations, or automate
 * responses. Results are observational assessments for governance review only.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    PolicyDefinition,
    PolicyEvaluationResult,
    PolicyEvaluationReport,
    PolicyEvaluationSummary,
    PolicyStatus,
    POLICY_EVALUATION_DISCLAIMER,
} from './policy.types';
import { GovernanceReadinessService } from './governance-readiness.service';
import { ControlGapService } from './control-gap.service';
import { AutomationReadinessService } from './automation-readiness.service';
import type { GovernanceReadinessSnapshot } from './governance-readiness.types';
import type { ControlGapReport } from './control-gap.types';
import type { AutomationReadinessReport } from './automation-readiness.types';

/**
 * Policy Evaluation Service
 *
 * Evaluates declarative governance policies against current system state
 *
 * Workflow:
 * 1. Retrieve current governance state (readiness, gaps, automation)
 * 2. Load static policy definitions
 * 3. Evaluate each policy using deterministic comparisons
 * 4. Generate human-readable rationale
 * 5. Return advisory report with mandatory disclaimer
 *
 * CRITICAL: No persistence, no side effects, no automation triggers
 */
@Injectable()
export class PolicyEvaluationService {
    private readonly logger = new Logger(PolicyEvaluationService.name);

    /**
     * Static Policy Definitions
     *
     * Declarative specifications of governance expectations
     * These policies are READ-ONLY and evaluated against current state
     *
     * Policy Count: 8 policies across 4 categories
     */
    private readonly POLICY_DEFINITIONS: readonly PolicyDefinition[] = [
        // GOVERNANCE POLICIES (2)
        {
            id: this.generatePolicyId('NO_HIGH_CONTROL_GAPS', 'GOVERNANCE', ['CONTROL_GAPS']),
            name: 'NO_HIGH_CONTROL_GAPS',
            description: 'System must have zero HIGH-severity control gaps for governance readiness',
            category: 'GOVERNANCE',
            inputs: ['CONTROL_GAPS'],
            severity: 'CRITICAL',
            sprint: 'SPRINT_18_PHASE_1',
        },
        {
            id: this.generatePolicyId('ADMIN_DECISION_TRACEABILITY_THRESHOLD', 'GOVERNANCE', [
                'ADMIN_DECISION_TRACEABILITY',
            ]),
            name: 'ADMIN_DECISION_TRACEABILITY_THRESHOLD',
            description: 'Admin decision traceability must be >= 80 for audit compliance',
            category: 'GOVERNANCE',
            inputs: ['ADMIN_DECISION_TRACEABILITY'],
            severity: 'WARNING',
            sprint: 'SPRINT_18_PHASE_1',
        },

        // RISK POLICIES (2)
        {
            id: this.generatePolicyId('RISK_COVERAGE_MINIMUM', 'RISK', ['RISK_COVERAGE']),
            name: 'RISK_COVERAGE_MINIMUM',
            description: 'Risk coverage must be >= 70 to ensure adequate risk evaluation',
            category: 'RISK',
            inputs: ['RISK_COVERAGE'],
            severity: 'WARNING',
            sprint: 'SPRINT_18_PHASE_1',
        },
        {
            id: this.generatePolicyId('ESCALATION_VISIBILITY_MINIMUM', 'RISK', ['ESCALATION_VISIBILITY']),
            name: 'ESCALATION_VISIBILITY_MINIMUM',
            description: 'Escalation visibility must be >= 75 for effective risk monitoring',
            category: 'RISK',
            inputs: ['ESCALATION_VISIBILITY'],
            severity: 'WARNING',
            sprint: 'SPRINT_18_PHASE_1',
        },

        // COMPLIANCE POLICIES (2)
        {
            id: this.generatePolicyId('INCIDENT_RECONSTRUCTABILITY_REQUIRED', 'COMPLIANCE', [
                'INCIDENT_RECONSTRUCTABILITY',
            ]),
            name: 'INCIDENT_RECONSTRUCTABILITY_REQUIRED',
            description: 'Incident reconstructability must be 100 for forensic and audit compliance',
            category: 'COMPLIANCE',
            inputs: ['INCIDENT_RECONSTRUCTABILITY'],
            severity: 'CRITICAL',
            sprint: 'SPRINT_18_PHASE_1',
        },
        {
            id: this.generatePolicyId('SIEM_EXPORT_READINESS_MINIMUM', 'COMPLIANCE', ['SIEM_EXPORT_READINESS']),
            name: 'SIEM_EXPORT_READINESS_MINIMUM',
            description: 'SIEM export readiness must be >= 80 for compliance monitoring',
            category: 'COMPLIANCE',
            inputs: ['SIEM_EXPORT_READINESS'],
            severity: 'WARNING',
            sprint: 'SPRINT_18_PHASE_1',
        },

        // AUTOMATION POLICIES (2)
        {
            id: this.generatePolicyId('ALERT_SATURATION_AUTOMATION_READINESS', 'AUTOMATION', ['ALERT_SATURATION']),
            name: 'ALERT_SATURATION_AUTOMATION_READINESS',
            description: 'Alert saturation must be >= 60 before automation readiness consideration',
            category: 'AUTOMATION',
            inputs: ['ALERT_SATURATION'],
            severity: 'INFO',
            sprint: 'SPRINT_18_PHASE_1',
        },
        {
            id: this.generatePolicyId('ESCALATION_ROUTING_MUST_REMAIN_LIMITED', 'AUTOMATION', [
                'ESCALATION_ROUTING',
            ]),
            name: 'ESCALATION_ROUTING_MUST_REMAIN_LIMITED',
            description:
                'Escalation routing automation must remain LIMITED or NOT_READY to preserve human control (Sprint 17 Guardrail)',
            category: 'AUTOMATION',
            inputs: ['ESCALATION_ROUTING'],
            severity: 'CRITICAL',
            sprint: 'SPRINT_18_PHASE_1',
        },
    ];

    constructor(
        private readonly governanceReadinessService: GovernanceReadinessService,
        private readonly controlGapService: ControlGapService,
        private readonly automationReadinessService: AutomationReadinessService,
    ) { }

    /**
     * Generate Policy Evaluation Report
     *
     * Evaluates all static policies against current governance state
     *
     * Workflow:
     * 1. Retrieve current governance state (readiness, gaps, automation)
     * 2. Evaluate each policy deterministically
     * 3. Generate summary counts
     * 4. Include mandatory advisory disclaimer
     *
     * Returns: Complete policy evaluation report
     *
     * CRITICAL: This is advisory only - NO enforcement, NO automation
     */
    async generatePolicyEvaluationReport(): Promise<PolicyEvaluationReport> {
        this.logger.log(`[SPRINT_18_PHASE_1] Generating policy evaluation report...`);

        // Step 1: Retrieve current governance state
        const readinessSnapshot = await this.governanceReadinessService.generateReadinessSnapshot();
        const gapReport = await this.controlGapService.generateControlGapReport();
        const automationReport = await this.automationReadinessService.generateAutomationReadinessReport();

        // Step 2: Evaluate each policy
        const results: PolicyEvaluationResult[] = [];

        for (const policy of this.POLICY_DEFINITIONS) {
            const result = this.evaluatePolicy(policy, readinessSnapshot, gapReport, automationReport);
            results.push(result);
        }

        // Step 3: Generate summary
        const summary = this.generateSummary(results);

        // Step 4: Assemble report with mandatory disclaimer
        const report: PolicyEvaluationReport = {
            summary,
            results,
            disclaimer: POLICY_EVALUATION_DISCLAIMER,
            sprint: 'SPRINT_18_PHASE_1',
        };

        this.logger.log(
            `[SPRINT_18_PHASE_1] Policy evaluation complete (total: ${summary.totalPolicies}, pass: ${summary.pass}, warn: ${summary.warn}, fail: ${summary.fail})`,
        );

        return report;
    }

    /**
     * Evaluate Single Policy
     *
     * Deterministic evaluation of policy against current state
     *
     * Logic:
     * - Extract relevant inputs from governance state
     * - Apply policy-specific evaluation rules
     * - Generate human-readable rationale
     * - Include evidence references
     *
     * Returns: Policy evaluation result
     */
    private evaluatePolicy(
        policy: PolicyDefinition,
        readinessSnapshot: GovernanceReadinessSnapshot,
        gapReport: ControlGapReport,
        automationReport: AutomationReadinessReport,
    ): PolicyEvaluationResult {
        let status: PolicyStatus;
        let rationale: string;
        const evidenceRefs: string[] = [];

        // Policy-specific evaluation logic
        switch (policy.name) {
            case 'NO_HIGH_CONTROL_GAPS': {
                const highGaps = gapReport.gaps.filter((gap) => gap.severity === 'HIGH').length;
                status = highGaps === 0 ? 'PASS' : 'FAIL';
                rationale =
                    highGaps === 0
                        ? `No HIGH-severity control gaps detected. System governance readiness is adequate.`
                        : `${highGaps} HIGH-severity control gap(s) detected. Executive attention required to address critical governance weaknesses.`;
                evidenceRefs.push('Sprint 17 Phase 2: Control gap detection');
                break;
            }

            case 'ADMIN_DECISION_TRACEABILITY_THRESHOLD': {
                const dimension = readinessSnapshot.dimensions.find((d) => d.dimension === 'ADMIN_DECISION_TRACEABILITY');
                const score = dimension?.score ?? 0;
                status = score >= 80 ? 'PASS' : score >= 60 ? 'WARN' : 'FAIL';
                rationale =
                    score >= 80
                        ? `Admin decision traceability score ${score} meets audit compliance threshold (>= 80).`
                        : score >= 60
                            ? `Admin decision traceability score ${score} is below recommended threshold (>= 80). Review recommended.`
                            : `Admin decision traceability score ${score} is critically low. Audit compliance at risk.`;
                evidenceRefs.push('Sprint 14 Phase 3: Admin decision capture', 'Sprint 17 Phase 1: Governance readiness');
                break;
            }

            case 'RISK_COVERAGE_MINIMUM': {
                const dimension = readinessSnapshot.dimensions.find((d) => d.dimension === 'RISK_COVERAGE');
                const score = dimension?.score ?? 0;
                status = score >= 70 ? 'PASS' : score >= 50 ? 'WARN' : 'FAIL';
                rationale =
                    score >= 70
                        ? `Risk coverage score ${score} meets minimum threshold (>= 70).`
                        : score >= 50
                            ? `Risk coverage score ${score} is below recommended threshold (>= 70). Review recommended.`
                            : `Risk coverage score ${score} is critically low. Risk evaluation may be insufficient.`;
                evidenceRefs.push('Sprint 11-13: Risk evaluation', 'Sprint 17 Phase 1: Governance readiness');
                break;
            }

            case 'ESCALATION_VISIBILITY_MINIMUM': {
                const dimension = readinessSnapshot.dimensions.find((d) => d.dimension === 'ESCALATION_VISIBILITY');
                const score = dimension?.score ?? 0;
                status = score >= 75 ? 'PASS' : score >= 55 ? 'WARN' : 'FAIL';
                rationale =
                    score >= 75
                        ? `Escalation visibility score ${score} meets minimum threshold (>= 75).`
                        : score >= 55
                            ? `Escalation visibility score ${score} is below recommended threshold (>= 75). Review recommended.`
                            : `Escalation visibility score ${score} is critically low. Risk monitoring may be inadequate.`;
                evidenceRefs.push('Sprint 12: Risk escalation', 'Sprint 17 Phase 1: Governance readiness');
                break;
            }

            case 'INCIDENT_RECONSTRUCTABILITY_REQUIRED': {
                const dimension = readinessSnapshot.dimensions.find((d) => d.dimension === 'INCIDENT_RECONSTRUCTABILITY');
                const score = dimension?.score ?? 0;
                status = score === 100 ? 'PASS' : score >= 80 ? 'WARN' : 'FAIL';
                rationale =
                    score === 100
                        ? `Incident reconstructability score ${score} meets forensic compliance requirement (100).`
                        : score >= 80
                            ? `Incident reconstructability score ${score} is below required threshold (100). Full forensic capability not guaranteed.`
                            : `Incident reconstructability score ${score} is critically low. Forensic and audit compliance at risk.`;
                evidenceRefs.push('Sprint 15: Incident reconstruction', 'Sprint 17 Phase 1: Governance readiness');
                break;
            }

            case 'SIEM_EXPORT_READINESS_MINIMUM': {
                const dimension = readinessSnapshot.dimensions.find((d) => d.dimension === 'SIEM_EXPORT_READINESS');
                const score = dimension?.score ?? 0;
                status = score >= 80 ? 'PASS' : score >= 60 ? 'WARN' : 'FAIL';
                rationale =
                    score >= 80
                        ? `SIEM export readiness score ${score} meets compliance monitoring threshold (>= 80).`
                        : score >= 60
                            ? `SIEM export readiness score ${score} is below recommended threshold (>= 80). Review recommended.`
                            : `SIEM export readiness score ${score} is critically low. Compliance monitoring may be inadequate.`;
                evidenceRefs.push('Sprint 16 Phase 4: SIEM exports', 'Sprint 17 Phase 1: Governance readiness');
                break;
            }

            case 'ALERT_SATURATION_AUTOMATION_READINESS': {
                const dimension = readinessSnapshot.dimensions.find((d) => d.dimension === 'ALERT_SATURATION');
                const score = dimension?.score ?? 0;
                status = score >= 60 ? 'PASS' : score >= 40 ? 'WARN' : 'FAIL';
                rationale =
                    score >= 60
                        ? `Alert saturation score ${score} indicates automation readiness consideration may be appropriate (>= 60).`
                        : score >= 40
                            ? `Alert saturation score ${score} suggests automation readiness is premature. Manual processes recommended.`
                            : `Alert saturation score ${score} is low. Automation readiness not advisable.`;
                evidenceRefs.push('Sprint 16 Phase 2: Admin alerts', 'Sprint 17 Phase 3: Automation readiness');
                break;
            }

            case 'ESCALATION_ROUTING_MUST_REMAIN_LIMITED': {
                const candidate = automationReport.signals.find((c) => c.candidate === 'ESCALATION_ROUTING');
                const readinessState = candidate?.readinessLevel ?? 'NOT_READY';
                status = readinessState === 'LIMITED' || readinessState === 'NOT_READY' ? 'PASS' : 'FAIL';
                rationale =
                    readinessState === 'LIMITED' || readinessState === 'NOT_READY'
                        ? `Escalation routing automation readiness level ${readinessState} preserves human control as required by Sprint 17 guardrails.`
                        : `Escalation routing automation readiness level ${readinessState} violates Sprint 17 guardrail requiring LIMITED or NOT_READY state. Human control at risk.`;
                break;
            }

            default: {
                status = 'WARN';
                rationale = `Policy evaluation not implemented: ${policy.name}`;
                evidenceRefs.push('Sprint 18 Phase 1: Policy evaluation');
            }
        }

        return {
            policyId: policy.id,
            policyName: policy.name,
            status,
            rationale,
            evidenceRefs,
            evaluatedAt: new Date().toISOString(),
            sprint: 'SPRINT_18_PHASE_1',
        };
    }

    /**
     * Generate Summary Counts
     *
     * Aggregate policy evaluation results into summary statistics
     */
    private generateSummary(results: readonly PolicyEvaluationResult[]): PolicyEvaluationSummary {
        return {
            totalPolicies: results.length,
            pass: results.filter((r) => r.status === 'PASS').length,
            warn: results.filter((r) => r.status === 'WARN').length,
            fail: results.filter((r) => r.status === 'FAIL').length,
            evaluatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate Policy ID
     *
     * Deterministic SHA-256 hash of policy definition components
     *
     * Formula: SHA-256(name + category + inputs)
     */
    private generatePolicyId(name: string, category: string, inputs: readonly string[]): string {
        const content = JSON.stringify({ name, category, inputs: [...inputs].sort() });
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Get Policy Definitions
     *
     * Returns all static policy definitions (for inspection/documentation)
     */
    getPolicyDefinitions(): readonly PolicyDefinition[] {
        return this.POLICY_DEFINITIONS;
    }
}
