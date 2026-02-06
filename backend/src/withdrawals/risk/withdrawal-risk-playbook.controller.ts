import { Controller, Get, Post, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import {
    WithdrawalRiskPlaybookService,
    PlaybookRecommendationResponse,
    RankedPlaybookRecommendationResponse,
    RiskPlaybook,
    CaptureDecisionRequest,
    CaptureDecisionResponse,
    PlaybookEffectivenessMetrics,
    PlaybookUsageStats,
    EffectivenessFilters,
} from './withdrawal-risk-playbook.service';

/**
 * SPRINT 14 PHASE 1 & 2: Risk Response Playbooks - Admin Controller
 * 
 * PURPOSE: Admin-only REST endpoints for risk playbook recommendations
 * 
 * GOLDEN RULES:
 * - READ-ONLY advisory system (no enforcement)
 * - NO auto-execution of recommendations
 * - RBAC enforcement (ADMIN, PLATFORM_ADMIN only)
 * - Audit logging for all queries
 * - Recommendations are guidance, not decisions
 * 
 * PHASE 2 ENHANCEMENTS:
 * - Contextual resolution with relevance scoring
 * - Sprint 13 escalation integration
 * - Ranked playbook matching
 */

@ApiTags('Admin - Withdrawal Risk Playbooks')
@Controller('api/admin/withdrawals/risk')
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN')
@ApiBearerAuth()
export class WithdrawalRiskPlaybookController {
    constructor(
        private readonly playbookService: WithdrawalRiskPlaybookService,
    ) { }

    /**
     * GET /api/admin/withdrawals/risk/:id/playbook-recommendations
     * 
     * Get recommended admin actions for a specific withdrawal based on risk profile
     * 
     * PATTERN:
     * - Deterministic playbook matching
     * - Human-readable recommendations
     * - Severity and priority ranking
     * - Clear rationale for each action
     * 
     * USAGE:
     * Admin reviews withdrawal with HIGH risk, endpoint returns:
     * - Matched playbooks
     * - Recommended actions (e.g., "Verify user identity via secondary auth")
     * - Rationale (e.g., "Rapid withdrawals may indicate compromised account")
     * - Severity (CRITICAL, WARNING, INFO)
     * - Priority (1-10, higher = more urgent)
     * 
     * IMPORTANT:
     * - These are RECOMMENDATIONS, not automated actions
     * - Admin remains in full control of decisions
     * - No enforcement or blocking occurs
     */
    @Get(':id/playbook-recommendations')
    @ApiOperation({
        summary: 'Get risk playbook recommendations for withdrawal',
        description: 'Returns matched playbooks with recommended admin actions based on withdrawal risk profile. READ-ONLY advisory, no automated enforcement.',
    })
    @ApiResponse({
        status: 200,
        description: 'Playbook recommendations retrieved successfully',
        schema: {
            example: {
                withdrawalId: 'wit_abc123',
                userId: 'user_xyz',
                currentRiskLevel: 'HIGH',
                currentRiskScore: 85,
                currentStage: 'PROCESSING',
                activeSignals: ['VELOCITY_SPIKE', 'NEW_DESTINATION'],
                matchedPlaybooks: [
                    {
                        playbook: {
                            id: 'PB_MULTI_HIGH_VELOCITY_NEW_DEST',
                            name: 'Velocity Spike + New Destination Response',
                            description: 'Rapid withdrawals to new destination account (compound risk)',
                        },
                        matchedConditions: [
                            'minRiskLevel=MEDIUM',
                            'requiredSignals=[VELOCITY_SPIKE,NEW_DESTINATION]',
                        ],
                        recommendations: [
                            {
                                action: 'IMMEDIATE REVIEW REQUIRED - high confidence fraud indicator',
                                rationale: 'Combination of velocity spike and new destination is classic account takeover pattern',
                                severity: 'CRITICAL',
                                priority: 10,
                            },
                            {
                                action: 'Freeze all pending withdrawals for this user',
                                rationale: 'Prevent further potential fraud while investigating',
                                severity: 'CRITICAL',
                                priority: 10,
                            },
                        ],
                    },
                ],
                totalRecommendations: 2,
                highestSeverity: 'CRITICAL',
                generatedAt: '2026-01-04T19:30:00.000Z',
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    @ApiResponse({
        status: 404,
        description: 'Withdrawal not found',
    })
    async getPlaybookRecommendations(
        @Param('id') withdrawalId: string,
        @Req() req: any,
    ): Promise<PlaybookRecommendationResponse> {
        const adminId = req.user?.id || 'unknown';

        return this.playbookService.getRecommendations(withdrawalId, adminId);
    }

    /**
     * GET /api/admin/withdrawals/risk/:id/ranked-playbook-recommendations
     * 
     * SPRINT 14 PHASE 2: Get ranked playbook recommendations with contextual resolution
     * 
     * ENHANCEMENTS OVER PHASE 1:
     * - Integrates Sprint 13 escalation data
     * - Computes relevance scores (0-100)
     * - Ranks by relevance + priority
     * - Provides explainable match reasons
     * 
     * USAGE:
     * Admin reviews withdrawal, gets ranked recommendations with:
     * - Relevance score (0-100) indicating how well playbook matches context
     * - Match reasons explaining why playbook triggered
     * - Match quality (EXACT, PARTIAL, WEAK)
     * - Escalation context from Sprint 13
     * - Sorted by relevance + priority
     */
    @Get(':id/ranked-playbook-recommendations')
    @ApiOperation({
        summary: 'Get ranked risk playbook recommendations with contextual resolution',
        description: 'SPRINT 14 PHASE 2: Returns ranked playbooks with relevance scoring, escalation integration, and explainable match reasons. READ-ONLY advisory.',
    })
    @ApiResponse({
        status: 200,
        description: 'Ranked playbook recommendations retrieved successfully',
        schema: {
            example: {
                withdrawalId: 'wit_abc123',
                userId: 'user_xyz',
                currentRiskLevel: 'HIGH',
                currentRiskScore: 85,
                currentStage: 'PROCESSING',
                activeSignals: ['VELOCITY_SPIKE', 'NEW_DESTINATION'],
                escalationSeverity: 'HIGH',
                rankedPlaybooks: [
                    {
                        playbook: {
                            id: 'PB_MULTI_HIGH_VELOCITY_NEW_DEST',
                            name: 'Velocity Spike + New Destination Response',
                        },
                        matchedConditions: ['minRiskLevel=MEDIUM', 'requiredSignals=[VELOCITY_SPIKE,NEW_DESTINATION]'],
                        recommendations: [
                            {
                                action: 'IMMEDIATE REVIEW REQUIRED',
                                rationale: 'Classic account takeover pattern',
                                severity: 'CRITICAL',
                                priority: 10,
                            },
                        ],
                        relevanceScore: {
                            score: 95,
                            reasons: [
                                'Exact risk level match: HIGH',
                                'Compound risk detected: 2 signals required',
                                'Multiple conditions matched: 3',
                            ],
                            matchQuality: 'EXACT',
                        },
                        timestamp: '2026-01-04T20:00:00.000Z',
                    },
                ],
                totalRecommendations: 1,
                highestSeverity: 'CRITICAL',
                generatedAt: '2026-01-04T20:00:00.000Z',
                contextSummary: {
                    totalPlaybooksEvaluated: 15,
                    matchedPlaybooksCount: 3,
                    avgRelevanceScore: 82,
                    escalationDetected: true,
                },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    @ApiResponse({
        status: 404,
        description: 'Withdrawal not found',
    })
    async getRankedPlaybookRecommendations(
        @Param('id') withdrawalId: string,
        @Req() req: any,
    ): Promise<RankedPlaybookRecommendationResponse> {
        const adminId = req.user?.id || 'unknown';

        return this.playbookService.getRankedRecommendations(withdrawalId, adminId);
    }

    /**
     * GET /api/admin/withdrawals/risk/playbooks
     * 
     * Get all available playbooks (for admin reference)
     * 
     * USAGE:
     * Admin wants to see all playbook definitions, understand matching criteria,
     * and review available recommendations.
     * 
     * PATTERN:
     * - Returns static playbook registry
     * - No withdrawal-specific data
     * - Reference documentation for admins
     */
    @Get('playbooks')
    @ApiOperation({
        summary: 'Get all available risk playbooks',
        description: 'Returns complete list of playbook definitions with conditions and recommendations. For admin reference only.',
    })
    @ApiResponse({
        status: 200,
        description: 'Playbooks retrieved successfully',
        schema: {
            example: [
                {
                    id: 'PB_HIGH_VELOCITY_SPIKE',
                    name: 'High Velocity Spike Response',
                    description: 'Multiple rapid withdrawals detected with velocity spike signal',
                    conditions: {
                        riskLevel: 'HIGH',
                        requiredSignals: ['VELOCITY_SPIKE'],
                        stage: 'ANY',
                    },
                    recommendations: [
                        {
                            action: 'Review withdrawal history for last 7 days',
                            rationale: 'Velocity spike indicates abnormal withdrawal frequency - verify legitimate user behavior',
                            severity: 'CRITICAL',
                            priority: 10,
                        },
                    ],
                    enabled: true,
                },
            ],
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async getAllPlaybooks(): Promise<RiskPlaybook[]> {
        return this.playbookService.getAllPlaybooks();
    }

    /**
     * GET /api/admin/withdrawals/risk/playbooks/:id
     * 
     * Get specific playbook by ID
     * 
     * USAGE:
     * Admin wants detailed view of specific playbook definition
     */
    @Get('playbooks/:id')
    @ApiOperation({
        summary: 'Get specific playbook by ID',
        description: 'Returns detailed playbook definition with conditions and recommendations.',
    })
    @ApiResponse({
        status: 200,
        description: 'Playbook retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Playbook not found',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async getPlaybookById(@Param('id') playbookId: string): Promise<RiskPlaybook> {
        const playbook = this.playbookService.getPlaybookById(playbookId);

        if (!playbook) {
            throw new Error(`Playbook ${playbookId} not found`);
        }

        return playbook;
    }

    /**
     * POST /api/admin/withdrawals/risk/:id/capture-decision
     * 
     * SPRINT 14 PHASE 3: Capture admin decision after viewing playbook recommendations
     * 
     * PURPOSE: Observational intelligence – log admin actions for audit and analysis
     * 
     * GOLDEN RULE COMPLIANCE:
     * ✅ Does NOT alter withdrawal state
     * ✅ Does NOT block admin actions
     * ✅ Does NOT enforce recommendations
     * ✅ Does NOT modify approval logic
     * ✅ Purely observational (log-based)
     * 
     * USE CASES:
     * - Audit trail: Document decision-making process
     * - Compliance: Record justification for regulatory review
     * - Analysis: Track which playbooks influence admin decisions
     * - Learning: Identify effective vs. ignored playbooks
     * 
     * WORKFLOW:
     * 1. Admin views ranked playbook recommendations
     * 2. Admin takes action (approve, reject, escalate, etc.)
     * 3. Admin calls this endpoint to log their decision
     * 4. System captures: playbooks shown, action taken, justification
     * 5. Structured logging (no database writes)
     * 
     * IMPORTANT: This endpoint does NOT affect withdrawal state.
     * It's purely for capturing what the admin decided to do.
     */
    @Post(':id/capture-decision')
    @ApiOperation({
        summary: 'Capture admin decision after viewing playbook recommendations',
        description: 'Log admin action taken after reviewing risk playbooks (observational only, does not affect withdrawal state)',
    })
    @ApiResponse({
        status: 200,
        description: 'Decision captured successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request data',
    })
    @ApiResponse({
        status: 404,
        description: 'Withdrawal not found',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async captureDecision(
        @Param('id') withdrawalId: string,
        @Body() request: CaptureDecisionRequest,
        @Req() req: any,
    ): Promise<CaptureDecisionResponse> {
        const adminId = req.user?.userId;

        if (!adminId) {
            throw new Error('Admin ID not found in request context');
        }

        // Validation: Ensure required fields are present
        if (!request.adminAction) {
            throw new Error('adminAction is required');
        }

        if (!request.justification || request.justification.trim() === '') {
            throw new Error('justification is required and cannot be empty');
        }

        // Get ranked recommendations to capture what was shown to admin
        const rankedRecommendations = await this.playbookService.getRankedRecommendations(
            withdrawalId,
            adminId,
        );

        // Build context for decision capture
        const context = {
            riskLevel: rankedRecommendations.currentRiskLevel,
            riskScore: rankedRecommendations.currentRiskScore,
            stage: rankedRecommendations.currentStage,
            activeSignals: rankedRecommendations.activeSignals,
            escalationSeverity: rankedRecommendations.escalationSeverity,
            playbooksShown: rankedRecommendations.rankedPlaybooks.map(match => ({
                playbookId: match.playbook.id,
                playbookName: match.playbook.name,
                relevanceScore: match.relevanceScore.score,
                matchQuality: match.relevanceScore.matchQuality,
            })),
        };

        // Log the decision (log-based, no database writes)
        return await this.playbookService.logAdminDecision(
            withdrawalId,
            request,
            adminId,
            context,
        );
    }

    // ========================================================================
    // SPRINT 14 – PHASE 4: PLAYBOOK EFFECTIVENESS & OUTCOME METRICS
    // ========================================================================

    /**
     * GET /api/admin/withdrawals/risk/playbook-effectiveness
     * 
     * Get effectiveness metrics for all playbooks with optional filters
     * 
     * SPRINT 14 – PHASE 4: READ-ONLY aggregation correlating playbooks → decisions → outcomes
     * 
     * PATTERN:
     * - Parse logged decision data (SPRINT_14_PHASE_3 logs)
     * - Correlate with withdrawal outcomes from database
     * - Compute deterministic effectiveness scores (0-100)
     * - Support date range and risk level filters
     * - Graceful degradation if logs are incomplete
     * 
     * GOLDEN RULES:
     * ✅ READ-ONLY aggregation only
     * ✅ NO schema changes
     * ✅ NO ML or probabilistic logic (deterministic scoring)
     * ✅ NO enforcement or blocking
     * ✅ NO admin scoring at individual level
     * ✅ Explainable effectiveness scoring (0-100)
     * 
     * QUERY PARAMETERS:
     * - startDate: Filter decisions after this date (ISO 8601)
     * - endDate: Filter decisions before this date (ISO 8601)
     * - riskLevels: Comma-separated risk levels (HIGH,MEDIUM,LOW)
     * - minDataPoints: Minimum decisions required for inclusion (default: 3)
     * - playbookIds: Comma-separated playbook IDs to analyze
     * 
     * RESPONSE: Array of PlaybookEffectivenessMetrics sorted by effectiveness score
     */
    @Get('playbook-effectiveness')
    @ApiOperation({
        summary: 'Get playbook effectiveness metrics',
        description: 'SPRINT 14 PHASE 4: READ-ONLY aggregation of playbook usage and outcome correlation. Returns effectiveness metrics for all playbooks with optional date range and risk level filters. Deterministic scoring algorithm (0-100) with explainable factors.',
    })
    @ApiResponse({
        status: 200,
        description: 'Effectiveness metrics retrieved successfully',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async getPlaybookEffectiveness(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('riskLevels') riskLevels?: string,
        @Query('minDataPoints') minDataPoints?: string,
        @Query('playbookIds') playbookIds?: string,
    ): Promise<PlaybookEffectivenessMetrics[]> {
        // Parse query parameters
        const filters: EffectivenessFilters = {};

        if (startDate) {
            filters.startDate = new Date(startDate);
        }

        if (endDate) {
            filters.endDate = new Date(endDate);
        }

        if (riskLevels) {
            filters.riskLevels = riskLevels.split(',').map(r => r.trim());
        }

        if (minDataPoints) {
            filters.minDataPoints = parseInt(minDataPoints, 10);
        }

        if (playbookIds) {
            filters.playbookIds = playbookIds.split(',').map(id => id.trim());
        }

        return await this.playbookService.getPlaybookEffectiveness(filters);
    }

    /**
     * GET /api/admin/withdrawals/risk/playbook-usage-stats
     * 
     * Get aggregated playbook usage statistics
     * 
     * SPRINT 14 – PHASE 4: High-level overview of playbook system effectiveness
     * 
     * PATTERN:
     * - Aggregate metrics across all playbooks
     * - Top playbooks by usage and effectiveness
     * - Period-based statistics
     * 
     * QUERY PARAMETERS:
     * - startDate: Filter decisions after this date (ISO 8601)
     * - endDate: Filter decisions before this date (ISO 8601)
     * - riskLevels: Comma-separated risk levels (HIGH,MEDIUM,LOW)
     * 
     * RESPONSE: PlaybookUsageStats with aggregated metrics
     */
    @Get('playbook-usage-stats')
    @ApiOperation({
        summary: 'Get aggregated playbook usage statistics',
        description: 'SPRINT 14 PHASE 4: High-level overview of playbook system effectiveness including top playbooks by usage and effectiveness, total recommendations, and decision capture rates.',
    })
    @ApiResponse({
        status: 200,
        description: 'Usage statistics retrieved successfully',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async getPlaybookUsageStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('riskLevels') riskLevels?: string,
    ): Promise<PlaybookUsageStats> {
        // Parse query parameters
        const filters: EffectivenessFilters = {};

        if (startDate) {
            filters.startDate = new Date(startDate);
        }

        if (endDate) {
            filters.endDate = new Date(endDate);
        }

        if (riskLevels) {
            filters.riskLevels = riskLevels.split(',').map(r => r.trim());
        }

        return await this.playbookService.aggregatePlaybookUsage(filters);
    }

    /**
     * GET /api/admin/withdrawals/risk/playbooks/:id/effectiveness
     * 
     * Get effectiveness metrics for a specific playbook
     * 
     * SPRINT 14 – PHASE 4: Detailed effectiveness analysis for single playbook
     * 
     * PATTERN:
     * - Same as /playbook-effectiveness but filtered to single playbook
     * - Useful for drill-down analysis
     * 
     * QUERY PARAMETERS:
     * - startDate: Filter decisions after this date (ISO 8601)
     * - endDate: Filter decisions before this date (ISO 8601)
     * - riskLevels: Comma-separated risk levels (HIGH,MEDIUM,LOW)
     * 
     * RESPONSE: PlaybookEffectivenessMetrics for specified playbook or 404
     */
    @Get('playbooks/:id/effectiveness')
    @ApiOperation({
        summary: 'Get effectiveness metrics for specific playbook',
        description: 'SPRINT 14 PHASE 4: Detailed effectiveness analysis for single playbook including usage stats, outcome correlation, risk resolution metrics, and deterministic effectiveness score with explainable factors.',
    })
    @ApiResponse({
        status: 200,
        description: 'Playbook effectiveness retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Playbook not found or insufficient data points',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - requires ADMIN or PLATFORM_ADMIN role',
    })
    async getPlaybookEffectivenessById(
        @Param('id') playbookId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('riskLevels') riskLevels?: string,
    ): Promise<PlaybookEffectivenessMetrics> {
        // Parse query parameters
        const filters: EffectivenessFilters = {};

        if (startDate) {
            filters.startDate = new Date(startDate);
        }

        if (endDate) {
            filters.endDate = new Date(endDate);
        }

        if (riskLevels) {
            filters.riskLevels = riskLevels.split(',').map(r => r.trim());
        }

        const metrics = await this.playbookService.getPlaybookEffectivenessById(
            playbookId,
            filters,
        );

        if (!metrics) {
            throw new Error(`Playbook ${playbookId} not found or insufficient data points`);
        }

        return metrics;
    }
}
