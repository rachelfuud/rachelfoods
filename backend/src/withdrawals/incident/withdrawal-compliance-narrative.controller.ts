import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { WithdrawalIncidentReconstructionService } from '../risk/withdrawal-incident-reconstruction.service';
import {
    WithdrawalComplianceNarrativeService,
    ComplianceNarrative,
} from './withdrawal-compliance-narrative.service';

/**
 * SPRINT 15 PHASE 2: Compliance Narrative Generator - Admin Controller
 * 
 * PURPOSE: Admin-only REST endpoints for generating regulator-grade narratives
 * 
 * GOLDEN RULES:
 * - READ-ONLY narrative generation (no mutations)
 * - NO inference, speculation, or opinions
 * - NO new signals or judgments
 * - RBAC enforcement (ADMIN, PLATFORM_ADMIN only)
 * - Deterministic output (same input = same narrative)
 * - Evidence-backed facts only
 * 
 * PATTERN:
 * 1. Call Phase 1 reconstruction service
 * 2. Pass incident to narrative generator
 * 3. Return regulator-grade narrative
 */

@ApiTags('Admin - Withdrawal Compliance Narrative')
@Controller('api/admin/withdrawals/risk')
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN', 'ADMIN')
@ApiBearerAuth()
export class WithdrawalComplianceNarrativeController {
    constructor(
        private readonly reconstructionService: WithdrawalIncidentReconstructionService,
        private readonly narrativeService: WithdrawalComplianceNarrativeService,
    ) { }

    /**
     * GET /api/admin/withdrawals/risk/:id/compliance-narrative
     * 
     * Generate regulator-grade compliance narrative for a withdrawal
     * 
     * SPRINT 15 – PHASE 2: READ-ONLY compliance narrative generator
     * 
     * PATTERN:
     * 1. Reconstruct incident timeline (Phase 1)
     * 2. Convert timeline to human-readable narrative
     * 3. Generate executive summary, detailed sections, explanations
     * 4. Return deterministic, evidence-backed narrative
     * 
     * GOLDEN RULES:
     * ✅ READ-ONLY (no mutations)
     * ✅ NO inference or speculation
     * ✅ NO new signals or judgments
     * ✅ Deterministic output
     * ✅ Evidence-backed facts only
     * ✅ Neutral, factual language
     * 
     * USE CASES:
     * - Regulator inquiries: "Explain how this HIGH risk withdrawal was handled"
     * - Audit trails: "Provide factual account of withdrawal lifecycle"
     * - Dispute resolution: "Document decision-making process"
     * - Training: "Show systematic risk management approach"
     * - Compliance reporting: "Demonstrate controls and safeguards"
     * 
     * RESPONSE STRUCTURE:
     * {
     *   withdrawalId: "wdl_abc123",
     *   generatedAt: "2026-01-05T10:30:00Z",
     *   generatedBy: "admin_456",
     *   
     *   executiveSummary: "2-3 sentence overview...",
     *   
     *   detailedNarrative: [
     *     {
     *       title: "Withdrawal Initiation",
     *       timeframe: "January 5, 2026 at 09:00:00 AM UTC",
     *       content: "Chronological, evidence-backed narrative...",
     *       referencedEventTypes: ["WITHDRAWAL_STATE"]
     *     },
     *     ...
     *   ],
     *   
     *   riskManagementExplanation: "How risk systems were applied...",
     *   adminInvolvementSummary: "Admin oversight and decisions...",
     *   controlsAndSafeguardsSummary: "Active controls during processing...",
     *   
     *   dataSourceDisclosure: {
     *     withdrawalEntity: true,
     *     riskProfiles: true,
     *     riskEscalations: true,
     *     playbookRecommendations: true,
     *     adminDecisions: true,
     *     missingSources: []
     *   },
     *   
     *   disclaimer: "Legal disclaimer about narrative generation..."
     * }
     * 
     * NARRATIVE SECTIONS:
     * 1. Withdrawal Initiation: Request details, amounts, bank account
     * 2. Automated Risk Assessment: Risk level, signals, scores
     * 3. Risk Escalation: Escalation events (if triggered)
     * 4. Risk Management Playbooks: Recommended actions (if any)
     * 5. Administrative Review: Admin decision and justification
     * 6. Processing & Outcome: Final status, completion, resolution time
     * 
     * NARRATIVE PHILOSOPHY:
     * - Evidence-backed facts only (must map to timeline events)
     * - Chronological order (preserves temporal relationships)
     * - Neutral, factual language (no opinions or inferences)
     * - Deterministic output (same input = same narrative)
     * - Complete transparency (data source disclosure)
     * - Regulator-grade quality (suitable for audit/compliance)
     * 
     * DETERMINISM GUARANTEE:
     * Regenerating the narrative for the same withdrawal will produce
     * identical output, provided the underlying incident timeline is unchanged.
     * This ensures consistency for audit trails and regulatory reporting.
     * 
     * DATA SOURCE TRANSPARENCY:
     * If any data sources are unavailable (e.g., risk profiles, escalations),
     * this is explicitly disclosed in the dataSourceDisclosure object.
     * Narratives gracefully degrade with partial data availability.
     */
    @Get(':id/compliance-narrative')
    @ApiOperation({
        summary: 'Generate compliance narrative for withdrawal',
        description: 'SPRINT 15 PHASE 2: READ-ONLY generation of regulator-grade compliance narrative. Converts incident timeline into human-readable, evidence-backed narrative suitable for audit and regulatory reporting. Deterministic output with complete data source transparency.',
    })
    @ApiResponse({
        status: 200,
        description: 'Compliance narrative generated successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Withdrawal not found',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async generateComplianceNarrative(
        @Param('id') withdrawalId: string,
        @Req() req: any,
    ): Promise<ComplianceNarrative> {
        const adminId = req.user?.userId;

        if (!adminId) {
            throw new Error('Admin ID not found in request context');
        }

        // Step 1: Reconstruct incident timeline (Phase 1)
        const incident = await this.reconstructionService.reconstructIncident(withdrawalId, adminId);

        // Step 2: Generate compliance narrative (Phase 2)
        const narrative = await this.narrativeService.generateNarrative(incident, adminId);

        return narrative;
    }
}
