/**
 * SPRINT 17 – PHASE 4
 * Governance Attestation Controller
 *
 * Purpose: Expose READ-ONLY API for executive governance attestation
 *
 * Endpoint:
 * - GET /api/admin/governance/attestation: Generate governance attestation snapshot
 *
 * RBAC: PLATFORM_ADMIN only (executive governance access)
 *
 * Design Principles:
 * - READ-ONLY (no approvals, no sign-offs, no enforcement)
 * - Deterministic (same inputs → same snapshot ID)
 * - Evidence-backed (concrete Sprint references)
 * - Regulator-grade (board reporting, audit evidence)
 * - Non-approval (mandatory disclaimer)
 * - Audit-ready (structured logging)
 */

import { Controller, Get, Query, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
    GovernanceAttestationSnapshot,
    AttestationRole,
    isValidAttestationRole,
    formatAttestationRole,
} from './governance-attestation.types';
import { GovernanceAttestationService } from './governance-attestation.service';

@ApiTags('Governance Attestation (Platform Admin Only)')
@Controller('admin/governance')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class GovernanceAttestationController {
    private readonly logger = new Logger(GovernanceAttestationController.name);

    constructor(private readonly governanceAttestationService: GovernanceAttestationService) { }

    /**
     * GET /api/admin/governance/attestation
     *
     * Generate governance attestation snapshot for executive role
     *
     * Produces immutable, evidence-backed governance snapshot suitable for:
     * - Board reporting
     * - Regulator submission
     * - Audit evidence
     * - Executive governance review
     *
     * Returns:
     * - Deterministic snapshot ID (SHA-256)
     * - Governance readiness summary (Phase 1)
     * - Control gaps summary (Phase 2)
     * - Automation readiness summary (Phase 3)
     * - Hard guardrails (Phase 3)
     * - Evidence references (Sprint capabilities)
     * - Mandatory disclaimer (non-approval language)
     *
     * CRITICAL: This is observational only - NOT approval or authorization
     *
     * RBAC: PLATFORM_ADMIN only
     * READ-ONLY: Assessment only, no state changes
     */
    @Get('attestation')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Generate governance attestation snapshot',
        description: `
      Generates an executive governance attestation snapshot for specified role.
      
      Attestation Roles:
      - CISO: Chief Information Security Officer
      - CTO: Chief Technology Officer
      - COMPLIANCE_OFFICER: Compliance Officer
      - RISK_OFFICER: Risk Officer
      
      Snapshot Contents:
      - Deterministic Snapshot ID (SHA-256 hash)
      - Governance Readiness: Overall score and level (Phase 1)
      - Control Gaps: Summary by severity (Phase 2)
      - Automation Readiness: Summary by readiness level (Phase 3)
      - Hard Guardrails: 21 non-negotiable prohibitions (Phase 3)
      - Evidence References: Sprint capabilities supporting attestation
      - Mandatory Disclaimer: Non-approval language
      
      Use Cases:
      - Board Reporting: Executive summary of governance posture
      - Regulator Submission: Evidence-backed compliance documentation
      - Audit Evidence: Immutable governance snapshots
      - Executive Governance Review: Quarterly or annual assessments
      
      Snapshot ID Generation:
      - Deterministic: Same governance state → same snapshot ID (within same hour)
      - Formula: SHA-256(governanceReadiness + controlGaps + automationReadiness + guardrails + role + hour)
      - Enables tracking and comparison across time
      
      Disclaimer:
      - Snapshot is observational assessment only
      - Does NOT constitute approval or authorization
      - Does NOT delegate decision-making authority
      - Factual certification for governance review and audit purposes
      
      CRITICAL:
      - This is advisory only - NO approvals, NO sign-offs, NO enforcement
      - Snapshot represents governance posture at time generated
      - Not a substitute for human executive judgment
    `,
    })
    @ApiQuery({
        name: 'role',
        enum: ['CISO', 'CTO', 'COMPLIANCE_OFFICER', 'RISK_OFFICER'],
        required: true,
        description: 'Executive role attesting to governance posture',
        example: 'CISO',
    })
    @ApiResponse({
        status: 200,
        description: 'Governance attestation snapshot generated successfully',
        schema: {
            type: 'object',
            properties: {
                snapshotId: {
                    type: 'string',
                    example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
                    description: 'Deterministic snapshot identifier (SHA-256)',
                },
                generatedAt: { type: 'string', example: '2026-01-05T19:00:00.000Z' },
                attestedByRole: { type: 'string', enum: ['CISO', 'CTO', 'COMPLIANCE_OFFICER', 'RISK_OFFICER'], example: 'CISO' },
                governanceReadiness: {
                    type: 'object',
                    properties: {
                        overallScore: { type: 'number', example: 85 },
                        readinessLevel: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], example: 'HIGH' },
                    },
                },
                controlGapsSummary: {
                    type: 'object',
                    properties: {
                        total: { type: 'number', example: 2 },
                        high: { type: 'number', example: 0 },
                        medium: { type: 'number', example: 1 },
                        low: { type: 'number', example: 1 },
                    },
                },
                automationReadinessSummary: {
                    type: 'object',
                    properties: {
                        ready: { type: 'number', example: 4 },
                        conditional: { type: 'number', example: 1 },
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
                        'Platform admins must be able to override or disable any automation at any time - Human control paramount',
                    ],
                },
                evidenceReferences: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'Sprint 14: Risk playbooks, contextual resolution, admin decision capture, effectiveness metrics',
                        'Sprint 15: Incident reconstruction, compliance narrative, incident exports, forensic bundles',
                        'Sprint 16 Phase 1: Risk event normalization (unified event taxonomy)',
                        'Sprint 17 Phase 1: Governance readiness assessment (6 dimensions)',
                    ],
                },
                disclaimer: {
                    type: 'string',
                    example:
                        'This snapshot represents an observational assessment of governance posture at the time generated. It does not constitute approval, authorization, or delegation of decision-making authority. It is a factual certification snapshot for governance review and audit purposes only.',
                },
                sprint: { type: 'string', example: 'SPRINT_17_PHASE_4' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid attestation role',
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async getGovernanceAttestation(@Query('role') role: string): Promise<GovernanceAttestationSnapshot> {
        this.logger.log(`[SPRINT_17_PHASE_4] Governance attestation requested for role: ${role}`);

        // Validate attestation role
        if (!isValidAttestationRole(role)) {
            throw new BadRequestException(
                `Invalid attestation role: ${role}. Must be one of: CISO, CTO, COMPLIANCE_OFFICER, RISK_OFFICER`,
            );
        }

        const snapshot = await this.governanceAttestationService.generateAttestationSnapshot(role);

        this.logger.log(
            `[SPRINT_17_PHASE_4] Governance attestation snapshot returned (snapshotId: ${snapshot.snapshotId.substring(0, 16)}..., role: ${role}, readiness: ${snapshot.governanceReadiness.readinessLevel}, gaps: ${snapshot.controlGapsSummary.total})`,
        );

        return snapshot;
    }
}
