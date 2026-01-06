/**
 * SPRINT 17 – PHASE 2
 * Governance Simulation Controller
 *
 * Purpose: Expose READ-ONLY APIs for control gap detection and policy simulation
 *
 * Endpoints:
 * - GET /api/admin/governance/control-gaps: Identify governance weaknesses
 * - POST /api/admin/governance/policy-simulation: Simulate hypothetical policy changes
 *
 * RBAC: PLATFORM_ADMIN only (stricter than basic admin)
 *
 * Design Principles:
 * - READ-ONLY (no enforcement, no mutations)
 * - Deterministic (same input → same output)
 * - Advisory only (provides insights, not actions)
 * - Audit-ready (structured logging)
 */

import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ControlGapReport, PolicySimulationInput, PolicySimulationResult } from './control-gap.types';
import { ControlGapService } from './control-gap.service';
import { PolicySimulationService } from './policy-simulation.service';

@ApiTags('Governance Simulation (Platform Admin Only)')
@Controller('admin/governance')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class GovernanceSimulationController {
    private readonly logger = new Logger(GovernanceSimulationController.name);

    constructor(
        private readonly controlGapService: ControlGapService,
        private readonly policySimulationService: PolicySimulationService,
    ) { }

    /**
     * GET /api/admin/governance/control-gaps
     *
     * Detect governance control gaps from current readiness snapshot
     *
     * Returns:
     * - Identified gaps (dimensions scoring < 80)
     * - Gap severity classification (HIGH/MEDIUM/LOW)
     * - Advisory remediation hints
     * - Summary statistics
     *
     * RBAC: PLATFORM_ADMIN only
     * READ-ONLY: No enforcement, advisory only
     */
    @Get('control-gaps')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Detect governance control gaps',
        description: `
      Identifies weaknesses in governance dimensions based on Sprint 17 Phase 1 readiness snapshot.
      
      Gap Criteria:
      - Dimension score < 80 (production readiness threshold)
      
      Severity Classification:
      - HIGH: score < 50 (critical governance weakness)
      - MEDIUM: score 50-69 (moderate governance gap)
      - LOW: score 70-79 (minor governance improvement area)
      
      Returns:
      - Deterministic gap IDs (SHA-256)
      - Severity classification
      - Evidence and rationale
      - Advisory remediation hints (NO enforcement)
      
      Use Cases:
      - Pre-audit readiness checks
      - Governance maturity planning
      - Regulator preparedness reviews
      - Control improvement prioritization
      
      CRITICAL: This is advisory only - NO automated enforcement
    `,
    })
    @ApiResponse({
        status: 200,
        description: 'Control gap report generated successfully',
        schema: {
            type: 'object',
            properties: {
                generatedAt: { type: 'string', example: '2026-01-05T16:30:00.000Z' },
                windowHours: { type: 'number', example: 24 },
                gaps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', example: 'a1b2c3d4e5f6...' },
                            dimension: { type: 'string', example: 'ALERT_SATURATION' },
                            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'MEDIUM' },
                            scoreObserved: { type: 'number', example: 65 },
                            scoreExpected: { type: 'number', example: 80 },
                            description: { type: 'string', example: 'Moderate gap in Alert Saturation (score: 65/100, expected: 80/100)' },
                            evidence: {
                                type: 'array',
                                items: { type: 'string' },
                                example: ['Sprint 16 Phase 2: Admin Alert System', 'Current rate: 65 alerts/hour', 'Current score: 65/100'],
                            },
                            remediationHints: {
                                type: 'array',
                                items: { type: 'string' },
                                example: [
                                    'Review and adjust alert thresholds to reduce noise',
                                    'Consolidate low-priority alerts',
                                    'Implement alert aggregation strategies',
                                ],
                            },
                        },
                    },
                },
                gapSummary: {
                    type: 'object',
                    properties: {
                        total: { type: 'number', example: 3 },
                        high: { type: 'number', example: 1 },
                        medium: { type: 'number', example: 1 },
                        low: { type: 'number', example: 1 },
                    },
                },
                sprint: { type: 'string', example: 'SPRINT_17_PHASE_2' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async getControlGaps(): Promise<ControlGapReport> {
        this.logger.log('[SPRINT_17_PHASE_2] Control gap detection requested');

        const report = await this.controlGapService.generateControlGapReport();

        this.logger.log(
            `[SPRINT_17_PHASE_2] Control gap report returned (total: ${report.gapSummary.total}, high: ${report.gapSummary.high}, medium: ${report.gapSummary.medium}, low: ${report.gapSummary.low})`,
        );

        return report;
    }

    /**
     * POST /api/admin/governance/policy-simulation
     *
     * Simulate "what-if" policy changes and predict governance impact
     *
     * Input:
     * - Hypothetical policy changes (boolean flags)
     *
     * Returns:
     * - Baseline vs simulated readiness scores
     * - Per-dimension impact breakdown
     * - Assumptions and warnings
     *
     * CRITICAL: NO actual policy changes are applied
     *
     * RBAC: PLATFORM_ADMIN only
     * READ-ONLY: Simulation only, no enforcement
     */
    @Post('policy-simulation')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Simulate policy changes and predict governance impact',
        description: `
      Simulates hypothetical policy changes and predicts impact on governance readiness.
      
      Simulation Rules (Deterministic Arithmetic):
      - increaseAdminDecisionCapture: +20 to ADMIN_DECISION_TRACEABILITY (cap at 100)
      - tightenAlertThresholds: +10 to ESCALATION_VISIBILITY, -5 to ALERT_SATURATION
      - forceEscalationLinking: +15 to ESCALATION_VISIBILITY (cap at 100)
      - reduceAlertNoise: +20 to ALERT_SATURATION (cap at 100)
      
      Returns:
      - Baseline score (current)
      - Simulated score (hypothetical)
      - Overall delta (improvement or degradation)
      - Per-dimension impact breakdown
      - Assumptions explaining changes
      - Warnings about simulation limitations
      
      Use Cases:
      - Governance maturity planning
      - Policy impact analysis
      - Control improvement prioritization
      - Regulator readiness scenarios
      
      CRITICAL:
      - This is simulation only - NO actual policy changes are applied
      - Results are hypothetical - Real-world impact may vary
      - Simplified arithmetic rules - Not predictive ML
    `,
    })
    @ApiBody({
        description: 'Hypothetical policy changes to simulate',
        schema: {
            type: 'object',
            properties: {
                assumedChanges: {
                    type: 'object',
                    properties: {
                        increaseAdminDecisionCapture: {
                            type: 'boolean',
                            example: true,
                            description: 'Simulate increased admin decision capture coverage (+20 to ADMIN_DECISION_TRACEABILITY)',
                        },
                        tightenAlertThresholds: {
                            type: 'boolean',
                            example: false,
                            description: 'Simulate tighter alert thresholds (+10 to ESCALATION_VISIBILITY, -5 to ALERT_SATURATION)',
                        },
                        forceEscalationLinking: {
                            type: 'boolean',
                            example: true,
                            description: 'Simulate mandatory escalation linking (+15 to ESCALATION_VISIBILITY)',
                        },
                        reduceAlertNoise: {
                            type: 'boolean',
                            example: true,
                            description: 'Simulate alert noise reduction initiatives (+20 to ALERT_SATURATION)',
                        },
                    },
                },
            },
            example: {
                assumedChanges: {
                    increaseAdminDecisionCapture: true,
                    tightenAlertThresholds: false,
                    forceEscalationLinking: true,
                    reduceAlertNoise: true,
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Policy simulation completed successfully',
        schema: {
            type: 'object',
            properties: {
                simulatedAt: { type: 'string', example: '2026-01-05T16:35:00.000Z' },
                baselineScore: { type: 'number', example: 78 },
                simulatedScore: { type: 'number', example: 88 },
                delta: { type: 'number', example: 10 },
                impactedDimensions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            dimension: { type: 'string', example: 'ADMIN_DECISION_TRACEABILITY' },
                            before: { type: 'number', example: 60 },
                            after: { type: 'number', example: 80 },
                            improvement: { type: 'number', example: 20 },
                        },
                    },
                },
                assumptions: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'Increased admin decision capture coverage: +20 to ADMIN_DECISION_TRACEABILITY (capped at 100)',
                        'Mandatory escalation linking for HIGH/CRITICAL alerts: +15 to ESCALATION_VISIBILITY (capped at 100)',
                        'Alert noise reduction initiatives: +20 to ALERT_SATURATION (capped at 100)',
                    ],
                },
                warnings: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'Simulation uses simplified arithmetic rules - Real-world impact may vary',
                        'NO actual policy changes have been applied - This is hypothetical only',
                    ],
                },
                sprint: { type: 'string', example: 'SPRINT_17_PHASE_2' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async simulatePolicyChanges(@Body() input: PolicySimulationInput): Promise<PolicySimulationResult> {
        this.logger.log('[SPRINT_17_PHASE_2] Policy simulation requested', {
            assumedChanges: input.assumedChanges,
        });

        const result = await this.policySimulationService.simulatePolicyChanges(input);

        this.logger.log(
            `[SPRINT_17_PHASE_2] Policy simulation completed (baseline: ${result.baselineScore}, simulated: ${result.simulatedScore}, delta: ${result.delta})`,
        );

        return result;
    }
}
