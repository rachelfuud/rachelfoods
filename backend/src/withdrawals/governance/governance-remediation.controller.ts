/**
 * SPRINT 19 – PHASE 3: Governance Remediation Readiness & Impact Forecast Controller
 * 
 * PURPOSE:
 * READ-ONLY API endpoint for governance remediation impact forecasts.
 * 
 * POSITIONING:
 * Advisory-only "what-if" analysis — NOT enforcement or automation mandate.
 * 
 * QUALITY STANDARD:
 * Regulator-safe remediation planning API.
 */

import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GovernanceRemediationService } from './governance-remediation.service';
import { GovernanceRemediationForecast } from './governance-remediation.types';

/**
 * Governance Remediation Controller
 * 
 * READ-ONLY endpoint for remediation impact forecasts.
 * 
 * RBAC: PLATFORM_ADMIN only (highly sensitive governance planning data)
 */
@ApiTags('Admin - Governance')
@Controller('api/admin/governance')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class GovernanceRemediationController {
    private readonly logger = new Logger(GovernanceRemediationController.name);

    constructor(private readonly remediationService: GovernanceRemediationService) { }

    /**
     * GET /api/admin/governance/remediation-forecast
     * 
     * Get governance remediation impact forecast.
     * 
     * FORECAST STRUCTURE:
     * - Baseline (current) maturity stage and score
     * - Projected maturity stage and score after remediation
     * - Per-dimension score deltas
     * - Remediation actions considered (sorted by impact)
     * - Explicit assumptions and limitations
     * - Mandatory advisory disclaimer
     * 
     * FORECAST APPROACH:
     * - Rule-based arithmetic only (no ML, no probabilities)
     * - Deterministic action IDs (SHA-256)
     * - Advisory-only positioning (no enforcement mandates)
     * 
     * USE CASES:
     * 1. Executive "what-if" planning: "If we address gaps, what's the governance impact?"
     * 2. Board governance reviews: Transparent remediation impact projections
     * 3. Regulator remediation discussions: Explainable score improvement forecasts
     * 4. Governance investment justification: Quantify governance ROI
     * 5. Maturity progression planning: Path from current to AUDIT_READY stage
     * 
     * FORECAST RULES (Static, Arithmetic-Only):
     * - HIGH gap closure: +20 points to dimension
     * - MEDIUM gap closure: +10 points to dimension
     * - LOW gap closure: +5 points to dimension
     * - Dimension scores capped at 100 (no overflow)
     * - Overall score = average of dimension scores
     * - Maturity stage projected via rule-based thresholds:
     *   * AUDIT_READY: No HIGH gaps + all dimensions ≥ 80
     *   * GOVERNED: All dimensions ≥ 60
     *   * STRUCTURED: At least 4 dimensions ≥ 40
     *   * FOUNDATIONAL: Baseline
     * 
     * ACTION CATEGORIES (6 Types):
     * - SIGNAL_EXPANSION: Expand signal detection coverage
     * - ESCALATION_TUNING: Improve escalation routing/monitoring
     * - DECISION_INSTRUMENTATION: Enhance decision capture/audit trails
     * - POLICY_DEFINITION: Define/expand governance policies
     * - POLICY_GUARDRAIL_STRENGTHENING: Strengthen policy enforcement
     * - OBSERVABILITY_REBALANCING: Rebalance observability/alert coverage
     * 
     * MANDATORY DISCLAIMER:
     * "This forecast is advisory, hypothetical, and non-binding. 
     *  It does NOT mandate remediation actions, authorize automation, or certify compliance. 
     *  Projected scores are arithmetic estimates only (no ML, no probabilities). 
     *  Actual outcomes may differ. Use for governance planning and regulator dialogue only."
     * 
     * NON-GOALS (Critical Positioning):
     * - Does NOT enforce remediation (advisory only)
     * - Does NOT automate remediation (human authorization required)
     * - Does NOT prioritize actions (guidance only, not mandate)
     * - Does NOT replace compliance certification (estimates only)
     * - Does NOT guarantee projected scores (arithmetic projections, not predictions)
     * 
     * INPUTS (Automatically Sourced):
     * - Current readiness scores (Sprint 17 Phase 1)
     * - Current control gaps (Sprint 17 Phase 2)
     * - Gap attributions (Sprint 19 Phase 2)
     * - Timeline events (Sprint 19 Phase 1)
     * 
     * OUTPUTS:
     * - Remediation actions with deterministic IDs
     * - Projected dimension score deltas
     * - Projected maturity stage
     * - Explicit assumptions and limitations
     * 
     * DETERMINISM GUARANTEE:
     * Same governance state → same forecast (reproducible)
     * 
     * RBAC: PLATFORM_ADMIN only (sensitive governance planning data)
     * 
     * @returns {GovernanceRemediationForecast} Complete remediation impact forecast
     * 
     * @example
     * Response:
     * {
     *   "generatedAt": "2025-06-15T14:30:00Z",
     *   "baselineMaturityStage": "AUDIT_READY",
     *   "projectedMaturityStage": "AUDIT_READY",
     *   "baselineScore": 84,
     *   "projectedScore": 94,
     *   "overallDelta": 10,
     *   "deltasByDimension": [
     *     {
     *       "dimension": "SIGNAL_FIDELITY",
     *       "baselineScore": 80,
     *       "projectedScore": 90,
     *       "delta": 10,
     *       "contributingActions": ["action-id-1", "action-id-2"]
     *     }
     *   ],
     *   "actionsConsidered": [
     *     {
     *       "actionId": "abc123...",
     *       "targetGapId": "gap-123",
     *       "targetDimension": "SIGNAL_FIDELITY",
     *       "targetGapSeverity": "MEDIUM",
     *       "actionCategory": "SIGNAL_EXPANSION",
     *       "description": "Consider expanding signal detection coverage for signal detection accuracy. Expand high-value transaction signals.",
     *       "prerequisiteCapabilities": ["event-1", "event-2"],
     *       "expectedDimensionDelta": 10,
     *       "riskLevel": "LOW",
     *       "disclaimer": "This action is an advisory recommendation only. It does NOT mandate implementation..."
     *     }
     *   ],
     *   "assumptions": [
     *     {
     *       "description": "Remediation actions succeed as described",
     *       "impactIfViolated": "Projected score improvements may not materialize"
     *     }
     *   ],
     *   "limitations": [
     *     {
     *       "description": "Forecast does NOT account for resource availability",
     *       "mitigation": "Assess feasibility and resource requirements separately"
     *     }
     *   ],
     *   "disclaimer": "This forecast is advisory, hypothetical, and non-binding..."
     * }
     */
    @Get('remediation-forecast')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Get governance remediation impact forecast',
        description:
            'READ-ONLY endpoint returning hypothetical "what-if" forecast of governance impact ' +
            'if current control gaps are addressed. Forecast uses rule-based arithmetic only (no ML, no probabilities). ' +
            'Provides baseline/projected maturity stages, dimension score deltas, remediation actions, assumptions, and limitations. ' +
            'Advisory-only positioning — does NOT mandate remediation or authorize automation. ' +
            'Use for executive planning, board reviews, regulator dialogue, and investment justification.',
    })
    @ApiResponse({
        status: 200,
        description: 'Remediation forecast retrieved successfully',
        type: Object, // GovernanceRemediationForecast (detailed schema in types)
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Requires PLATFORM_ADMIN role',
    })
    async getRemediationForecast(): Promise<GovernanceRemediationForecast> {
        this.logger.log('GET /api/admin/governance/remediation-forecast (PLATFORM_ADMIN)');

        const forecast = await this.remediationService.generateRemediationForecast();

        this.logger.log(
            `Remediation forecast: ${forecast.baselineMaturityStage} → ${forecast.projectedMaturityStage}, ` +
            `${forecast.baselineScore} → ${forecast.projectedScore} (+${forecast.overallDelta}), ` +
            `${forecast.actionsConsidered.length} actions`
        );

        return forecast;
    }
}
