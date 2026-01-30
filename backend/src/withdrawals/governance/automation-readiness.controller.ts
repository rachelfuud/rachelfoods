/**
 * SPRINT 17 – PHASE 3
 * Automation Readiness Controller
 *
 * Purpose: Expose READ-ONLY API for automation readiness assessment
 *
 * Endpoint:
 * - GET /api/admin/governance/automation-readiness: Assess automation safety for all candidates
 *
 * RBAC: PLATFORM_ADMIN only (strictest governance access)
 *
 * Design Principles:
 * - READ-ONLY (no automation, no enforcement, no mutations)
 * - Deterministic (rule-based assessment)
 * - Advisory only (provides insights, not actions)
 * - Regulator-safe (human-in-the-loop protection)
 * - Audit-ready (structured logging)
 */

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AutomationReadinessReport } from './automation-readiness.types';
import { AutomationReadinessService } from './automation-readiness.service';

@ApiTags('Governance Automation Readiness (Platform Admin Only)')
@Controller('api/admin/governance')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class AutomationReadinessController {
    private readonly logger = new Logger(AutomationReadinessController.name);

    constructor(private readonly automationReadinessService: AutomationReadinessService) { }

    /**
     * GET /api/admin/governance/automation-readiness
     *
     * Assess automation readiness for all candidates
     *
     * Answers:
     * - Which areas are SAFE to automate in the future?
     * - Which MUST remain human-controlled?
     * - What are the blockers and enabling factors?
     *
     * Returns:
     * - Per-candidate readiness signals (score, level, blockers, enablers)
     * - Summary statistics (ready, conditional, limited, not ready)
     * - Hard guardrails (non-negotiable prohibitions)
     *
     * CRITICAL: This is advisory only - NO automation is enabled
     *
     * RBAC: PLATFORM_ADMIN only
     * READ-ONLY: Assessment only, no enforcement
     */
    @Get('automation-readiness')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Assess automation readiness for all candidates',
        description: `
      Evaluates which system areas are safe for future automation and which must remain human-controlled.
      
      Automation Candidates:
      - RISK_SCORING: Automated risk evaluation and scoring
      - ALERT_GENERATION: Automated alert creation based on risk events
      - ESCALATION_ROUTING: Automated routing of HIGH/CRITICAL alerts
      - PLAYBOOK_SUGGESTION: Automated playbook recommendations
      - COMPLIANCE_EXPORT: Automated compliance data export
      - INCIDENT_RECONSTRUCTION: Automated incident timeline generation
      
      Readiness Levels:
      - READY (80-100): High readiness, minimal blockers
      - CONDITIONAL (60-79): Ready with guardrails, human oversight required
      - LIMITED (40-59): Partial readiness, many constraints
      - NOT_READY (0-39): Significant blockers, unsafe for automation
      
      Scoring Rules:
      - Based on Sprint 17 Phase 1 governance readiness dimensions
      - Based on Sprint 17 Phase 2 control gaps
      - Deterministic arithmetic (no ML)
      - Prerequisites checked (e.g., ADMIN_DECISION_TRACEABILITY >= 90)
      
      Hard Guardrails:
      - No automation may approve/reject withdrawals
      - All HIGH risk actions require human confirmation
      - All automation must be reversible and observable
      - Platform admins can override/disable any automation
      
      Use Cases:
      - Pre-automation planning (regulator-safe assessment)
      - Governance maturity roadmap
      - Human-in-the-loop protection design
      - Compliance readiness review
      
      CRITICAL:
      - This is advisory only - NO automation is enabled by this endpoint
      - Assessment provides insights for FUTURE automation decisions
      - Hard guardrails MUST be enforced for any future implementation
    `,
    })
    @ApiResponse({
        status: 200,
        description: 'Automation readiness report generated successfully',
        schema: {
            type: 'object',
            properties: {
                generatedAt: { type: 'string', example: '2026-01-05T18:00:00.000Z' },
                signals: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            candidate: {
                                type: 'string',
                                enum: [
                                    'RISK_SCORING',
                                    'ALERT_GENERATION',
                                    'ESCALATION_ROUTING',
                                    'PLAYBOOK_SUGGESTION',
                                    'COMPLIANCE_EXPORT',
                                    'INCIDENT_RECONSTRUCTION',
                                ],
                                example: 'PLAYBOOK_SUGGESTION',
                            },
                            readinessScore: { type: 'number', example: 85 },
                            readinessLevel: { type: 'string', enum: ['NOT_READY', 'LIMITED', 'CONDITIONAL', 'READY'], example: 'READY' },
                            blockers: {
                                type: 'array',
                                items: { type: 'string' },
                                example: [],
                            },
                            enablingFactors: {
                                type: 'array',
                                items: { type: 'string' },
                                example: [
                                    'Sprint 14 Phase 1: Deterministic risk playbooks operational',
                                    'Sprint 14 Phase 2: Contextual playbook resolution with relevance scoring',
                                    'Advisory recommendations only (not enforcement)',
                                ],
                            },
                            evidence: {
                                type: 'array',
                                items: { type: 'string' },
                                example: [
                                    'Sprint 14 Phase 1: Risk Playbooks',
                                    'Sprint 14 Phase 2: Contextual Resolution',
                                    'Sprint 14 Phase 4: Effectiveness Metrics',
                                ],
                            },
                            rationale: {
                                type: 'string',
                                example:
                                    'High readiness: Deterministic playbook suggestion with advisory-only output, full audit trail, human decision-making preserved',
                            },
                        },
                    },
                },
                summary: {
                    type: 'object',
                    properties: {
                        ready: { type: 'number', example: 3 },
                        conditional: { type: 'number', example: 2 },
                        limited: { type: 'number', example: 1 },
                        notReady: { type: 'number', example: 0 },
                    },
                },
                hardGuardrails: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'No automation may approve or reject withdrawals - Human decision required for all final approval actions',
                        'All HIGH or CRITICAL risk actions require explicit human confirmation - No automated escalation without oversight',
                        'All automated actions must be reversible by platform admins - No irreversible automation',
                        'Platform admins must be able to override or disable any automation at any time - Human control paramount',
                    ],
                },
                sprint: { type: 'string', example: 'SPRINT_17_PHASE_3' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async getAutomationReadiness(): Promise<AutomationReadinessReport> {
        this.logger.log('[SPRINT_17_PHASE_3] Automation readiness assessment requested');

        const report = await this.automationReadinessService.generateAutomationReadinessReport();

        this.logger.log(
            `[SPRINT_17_PHASE_3] Automation readiness report returned (ready: ${report.summary.ready}, conditional: ${report.summary.conditional}, limited: ${report.summary.limited}, notReady: ${report.summary.notReady}, guardrails: ${report.hardGuardrails.length})`,
        );

        return report;
    }
}
