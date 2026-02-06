import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import {
    WithdrawalIncidentReconstructionService,
    WithdrawalIncident,
} from './withdrawal-incident-reconstruction.service';

/**
 * SPRINT 15 PHASE 1: Incident Reconstruction Engine - Admin Controller
 * 
 * PURPOSE: Admin-only REST endpoints for withdrawal incident reconstruction
 * 
 * GOLDEN RULES:
 * - READ-ONLY incident reconstruction (no mutations)
 * - NO new signals or risk computations
 * - NO actions, blocks, or delays
 * - NO probabilistic inference (facts only)
 * - RBAC enforcement (ADMIN, PLATFORM_ADMIN only)
 * - Audit logging for all reconstruction queries
 * 
 * PATTERN:
 * - Aggregate data from Sprints 12-14
 * - Build ordered timeline from multiple sources
 * - Present complete incident context for audit/analysis
 */

@ApiTags('Admin - Withdrawal Incident Reconstruction')
@Controller('api/admin/withdrawals/risk')
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN')
@ApiBearerAuth()
export class WithdrawalIncidentReconstructionController {
    constructor(
        private readonly reconstructionService: WithdrawalIncidentReconstructionService,
    ) { }

    /**
     * GET /api/admin/withdrawals/risk/:id/incident-reconstruction
     * 
     * Reconstruct complete incident timeline for a withdrawal
     * 
     * SPRINT 15 – PHASE 1: READ-ONLY incident reconstruction engine
     * 
     * PATTERN:
     * - Aggregate withdrawal entity, risk profiles, escalations, playbooks, decisions
     * - Build chronologically ordered timeline
     * - Present evidence-backed events only (no speculation)
     * - Graceful degradation if data sources unavailable
     * 
     * GOLDEN RULES:
     * ✅ READ-ONLY (no mutations)
     * ✅ NO new signals or risk computations
     * ✅ NO actions or blocks
     * ✅ NO probabilistic inference (facts only)
     * ✅ Deterministic timeline assembly
     * 
     * USE CASES:
     * - Incident investigation: Complete context for disputed withdrawals
     * - Audit trails: Regulatory compliance documentation
     * - Training: Real-world examples for analyst onboarding
     * - Process improvement: Identify bottlenecks in approval flow
     * - Compliance reporting: Demonstrate systematic risk management
     * 
     * RESPONSE STRUCTURE:
     * {
     *   incidentId: "incident_wdl_123_1735987200000",
     *   reconstructedAt: "2026-01-05T10:30:00Z",
     *   reconstructedBy: "admin_456",
     *   context: {
     *     withdrawalId, userId, currentStatus, amounts, risk data, escalation status
     *   },
     *   timeline: [
     *     { timestamp, eventType, category, source, description, severity, metadata }
     *   ],
     *   summary: {
     *     totalEvents, timelineSpanMs, riskLevelChanges, escalationTriggered, ...
     *   },
     *   dataSources: {
     *     withdrawalEntity: true/false, // Availability of each data source
     *     riskProfiles: true/false,
     *     escalationData: true/false,
     *     playbookRecommendations: true/false,
     *     adminDecisions: true/false,
     *     effectivenessMetrics: true/false
     *   }
     * }
     * 
     * TIMELINE EVENT TYPES:
     * - WITHDRAWAL_STATE: Status changes (requested, approved, rejected, etc.)
     * - RISK_PROFILE: Risk assessments from Sprint 12-13
     * - RISK_ESCALATION: Escalation triggers from Sprint 13
     * - PLAYBOOK_RECOMMENDATION: Playbook matches from Sprint 14 Phase 1-2
     * - ADMIN_DECISION: Decision captures from Sprint 14 Phase 3
     * - SYSTEM_ACTION: Automated system actions (if any)
     * 
     * TIMELINE CATEGORIES:
     * - STATE_CHANGE: Withdrawal lifecycle transitions
     * - RISK_ASSESSMENT: Risk profile computations
     * - ESCALATION: Risk escalation triggers
     * - RECOMMENDATION: Playbook recommendations
     * - DECISION: Admin decision captures
     * - OUTCOME: Final withdrawal outcome
     * 
     * SEVERITY LEVELS:
     * - INFO: Routine events (requested, approved, completed)
     * - WARNING: Concerning events (rejected, medium risk, escalation)
     * - CRITICAL: High-severity events (high risk, critical playbooks, failures)
     * 
     * DATA SOURCE TRANSPARENCY:
     * The dataSources object indicates which Sprint 12-14 integrations succeeded:
     * - withdrawalEntity: Always true (required)
     * - riskProfiles: Sprint 12-13 risk service
     * - escalationData: Sprint 13 visibility service
     * - playbookRecommendations: Sprint 14 Phase 1-2
     * - adminDecisions: Sprint 14 Phase 3 (simulated)
     * - effectivenessMetrics: Sprint 14 Phase 4 (future)
     * 
     * If any source is false, that component gracefully degraded (non-blocking)
     */
    @Get(':id/incident-reconstruction')
    @ApiOperation({
        summary: 'Reconstruct complete incident timeline',
        description: 'SPRINT 15 PHASE 1: READ-ONLY reconstruction of complete withdrawal incident timeline aggregating data from Sprints 12-14. Returns chronologically ordered events with evidence-backed facts only (no speculation). Graceful degradation if data sources unavailable.',
    })
    @ApiResponse({
        status: 200,
        description: 'Incident reconstruction completed successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Withdrawal not found',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async reconstructIncident(
        @Param('id') withdrawalId: string,
        @Req() req: any,
    ): Promise<WithdrawalIncident> {
        const adminId = req.user?.userId;

        if (!adminId) {
            throw new Error('Admin ID not found in request context');
        }

        return await this.reconstructionService.reconstructIncident(withdrawalId, adminId);
    }
}
