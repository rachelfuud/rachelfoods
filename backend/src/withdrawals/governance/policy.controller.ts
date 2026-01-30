/**
 * SPRINT 18 – PHASE 1
 * Policy Evaluation Controller
 *
 * Purpose: Expose READ-ONLY API for policy-as-code evaluation
 *
 * Endpoint:
 * - GET /api/admin/governance/policies/evaluate: Generate policy evaluation report
 *
 * RBAC: PLATFORM_ADMIN only (governance oversight)
 *
 * Design Principles:
 * - READ-ONLY (no enforcement, no automation)
 * - Advisory only (governance review purposes)
 * - Deterministic evaluation
 * - Human-interpretable results
 * - Mandatory disclaimer
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PolicyEvaluationReport } from './policy.types';
import { PolicyEvaluationService } from './policy-evaluation.service';

@ApiTags('Policy Evaluation (Platform Admin Only)')
@Controller('api/admin/governance/policies')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class PolicyController {
    private readonly logger = new Logger(PolicyController.name);

    constructor(private readonly policyEvaluationService: PolicyEvaluationService) { }

    /**
     * GET /api/admin/governance/policies/evaluate
     *
     * Generate policy evaluation report against current governance state
     *
     * Evaluates 8 declarative policies across 4 categories:
     * - GOVERNANCE: Control gaps, decision traceability
     * - RISK: Risk coverage, escalation visibility
     * - COMPLIANCE: Incident reconstructability, SIEM export readiness
     * - AUTOMATION: Alert saturation, escalation routing constraints
     *
     * Returns:
     * - Summary counts (pass / warn / fail)
     * - Individual policy evaluation results
     * - Human-readable rationale for each policy
     * - Evidence references (Sprint capabilities)
     * - Mandatory advisory disclaimer
     *
     * CRITICAL: This is advisory only - NO enforcement, NO automation
     *
     * RBAC: PLATFORM_ADMIN only
     * READ-ONLY: No state changes, no side effects
     */
    @Get('evaluate')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Evaluate governance policies',
        description: `
      Evaluates declarative governance policies against current system state.
      
      Policy Categories:
      - GOVERNANCE: Organizational governance expectations (control gaps, traceability)
      - RISK: Risk management requirements (coverage, escalation visibility)
      - COMPLIANCE: Compliance and audit requirements (forensics, SIEM exports)
      - AUTOMATION: Automation readiness constraints (alert saturation, guardrails)
      
      Policy Count: 8 policies evaluated
      
      Evaluation Logic:
      - Deterministic comparisons against governance state
      - Retrieves current readiness snapshot (Sprint 17 Phase 1)
      - Retrieves current control gaps (Sprint 17 Phase 2)
      - Retrieves current automation readiness (Sprint 17 Phase 3)
      - Applies static policy rules (no ML, no inference)
      
      Policy Status:
      - PASS: Policy requirements met
      - WARN: Policy requirements partially met (warning threshold)
      - FAIL: Policy requirements not met
      
      Rationale:
      - Human-readable explanation for each policy evaluation
      - Evidence-backed with concrete Sprint references
      - Deterministic (same state → same rationale)
      
      Mandatory Disclaimer:
      - This is advisory only
      - Does NOT enforce or automate any action
      - Does NOT block operations
      - Intended for governance review and audit purposes
      
      CRITICAL:
      - This is NOT an enforcement mechanism
      - Policy violations do NOT trigger automated responses
      - Results are observational assessments for executive oversight
      - No persistence (evaluation performed on-demand)
      
      Use Cases:
      - Quarterly governance reviews
      - Pre-automation safety checks
      - Board reporting (policy compliance summary)
      - Regulator submission (policy adherence evidence)
      - Audit evidence (policy evaluation history)
    `,
    })
    @ApiResponse({
        status: 200,
        description: 'Policy evaluation report generated successfully',
        schema: {
            type: 'object',
            properties: {
                summary: {
                    type: 'object',
                    properties: {
                        totalPolicies: { type: 'number', example: 8 },
                        pass: { type: 'number', example: 6 },
                        warn: { type: 'number', example: 1 },
                        fail: { type: 'number', example: 1 },
                        evaluatedAt: { type: 'string', example: '2026-01-05T20:00:00.000Z' },
                    },
                },
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            policyId: {
                                type: 'string',
                                example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
                            },
                            policyName: { type: 'string', example: 'NO_HIGH_CONTROL_GAPS' },
                            status: { type: 'string', enum: ['PASS', 'WARN', 'FAIL'], example: 'PASS' },
                            rationale: {
                                type: 'string',
                                example: 'No HIGH-severity control gaps detected. System governance readiness is adequate.',
                            },
                            evidenceRefs: {
                                type: 'array',
                                items: { type: 'string' },
                                example: ['Sprint 17 Phase 2: Control gap detection'],
                            },
                            evaluatedAt: { type: 'string', example: '2026-01-05T20:00:00.000Z' },
                            sprint: { type: 'string', example: 'SPRINT_18_PHASE_1' },
                        },
                    },
                },
                disclaimer: {
                    type: 'string',
                    example:
                        'This policy evaluation report is advisory only and does NOT enforce, automate, or mandate any action. It represents an observational assessment of current governance posture against declarative policy expectations. Policy violations do NOT trigger automated responses, block operations, or delegate decision-making authority. This report is intended for governance review, executive oversight, and audit purposes only.',
                },
                sprint: { type: 'string', example: 'SPRINT_18_PHASE_1' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async evaluatePolicies(): Promise<PolicyEvaluationReport> {
        this.logger.log(`[SPRINT_18_PHASE_1] Policy evaluation requested`);

        const report = await this.policyEvaluationService.generatePolicyEvaluationReport();

        this.logger.log(
            `[SPRINT_18_PHASE_1] Policy evaluation complete (total: ${report.summary.totalPolicies}, pass: ${report.summary.pass}, warn: ${report.summary.warn}, fail: ${report.summary.fail})`,
        );

        return report;
    }
}
