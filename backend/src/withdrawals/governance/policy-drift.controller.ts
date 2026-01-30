/**
 * SPRINT 18 – PHASE 2
 * Policy Drift Controller
 *
 * Purpose: Expose READ-ONLY API for policy drift detection and historical comparison
 *
 * Endpoint:
 * - GET /api/admin/governance/policies/drift: Compare current to historical governance posture
 *
 * RBAC: PLATFORM_ADMIN only (governance oversight)
 *
 * Design Principles:
 * - READ-ONLY (no enforcement, no automation)
 * - Advisory only (governance trend visibility)
 * - Deterministic drift detection
 * - Human-interpretable change rationale
 * - Mandatory disclaimer (no alerts, no triggers)
 */

import { Controller, Get, Query, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PolicyDriftReport } from './policy-snapshot.types';
import { PolicyDriftService } from './policy-drift.service';

@ApiTags('Policy Drift (Platform Admin Only)')
@Controller('api/admin/governance/policies')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class PolicyDriftController {
    private readonly logger = new Logger(PolicyDriftController.name);

    constructor(private readonly policyDriftService: PolicyDriftService) { }

    /**
     * GET /api/admin/governance/policies/drift
     *
     * Detect policy drift between current and historical governance posture
     *
     * Compares current policy evaluation to snapshot from N hours ago:
     * - 1 hour: Recent short-term changes
     * - 6 hours: Mid-term governance trends
     * - 24 hours: Daily governance evolution
     *
     * Returns:
     * - Current snapshot (full policy evaluation)
     * - Comparison snapshot metadata (historical reference)
     * - Drift summary (improvements, regressions, noChange counts)
     * - Individual drift results (sorted by priority: REGRESSION first)
     * - Mandatory advisory disclaimer
     *
     * Drift Classification:
     * - IMPROVEMENT: Status improved (FAIL → WARN, WARN → PASS, FAIL → PASS)
     * - REGRESSION: Status degraded (PASS → WARN, WARN → FAIL, PASS → FAIL)
     * - NO_CHANGE: Status unchanged (PASS → PASS, WARN → WARN, FAIL → FAIL)
     *
     * CRITICAL: This is advisory only - NO enforcement, NO alerts, NO automation
     *
     * RBAC: PLATFORM_ADMIN only
     * READ-ONLY: No state changes, no side effects
     */
    @Get('drift')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Detect policy drift over time',
        description: `
      Compares current governance posture to historical snapshot from N hours ago.
      
      Use Cases:
      - Governance Trend Analysis: Track policy compliance evolution
      - Change Management Evidence: Document governance posture changes
      - Quarterly Reviews: Compare current state to previous quarters
      - Regression Detection: Identify governance deterioration
      - Improvement Tracking: Validate governance enhancements
      
      Comparison Periods:
      - 1 hour: Recent short-term changes (e.g., post-deployment validation)
      - 6 hours: Mid-term governance trends (e.g., shift-over-shift analysis)
      - 24 hours: Daily governance evolution (e.g., day-over-day comparison)
      - 168 hours (7 days): Weekly governance trends
      - 720 hours (30 days): Monthly governance evolution
      
      Drift Detection Logic:
      - Match policies by ID between snapshots
      - Compare status (PASS/WARN/FAIL)
      - Classify drift type deterministically
      - Generate human-readable rationale
      
      Priority Sorting:
      - CRITICAL REGRESSION (highest priority)
      - WARNING REGRESSION
      - INFO REGRESSION
      - NO_CHANGE
      - IMPROVEMENT (lowest priority - positive changes)
      
      Snapshot Determinism:
      - Same governance state + same hour → same snapshot ID
      - Enables reproducibility and comparison
      
      Mandatory Disclaimer:
      - Policy regressions do NOT trigger automated responses
      - Policy regressions do NOT block operations
      - Policy regressions do NOT emit alerts
      - Intended for governance trend analysis and audit evidence only
      
      CRITICAL:
      - This is NOT an enforcement mechanism
      - This is NOT an alert system
      - This is NOT an automation trigger
      - Results are observational assessments for governance review
      
      NOTE: Phase 2 simulates historical snapshots using current state with
      past timestamps (no persistence layer). In production with storage, this
      would retrieve actual historical snapshots.
    `,
    })
    @ApiQuery({
        name: 'compareToHoursAgo',
        type: Number,
        required: false,
        description: 'Number of hours to compare against (default: 24)',
        example: 24,
    })
    @ApiResponse({
        status: 200,
        description: 'Policy drift report generated successfully',
        schema: {
            type: 'object',
            properties: {
                currentSnapshot: {
                    type: 'object',
                    properties: {
                        snapshotId: { type: 'string', example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6...' },
                        generatedAt: { type: 'string', example: '2026-01-05T20:00:00.000Z' },
                        evaluatedPolicies: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    policyId: { type: 'string' },
                                    policyName: { type: 'string' },
                                    status: { type: 'string', enum: ['PASS', 'WARN', 'FAIL'] },
                                    rationale: { type: 'string' },
                                },
                            },
                        },
                        summary: {
                            type: 'object',
                            properties: {
                                totalPolicies: { type: 'number', example: 8 },
                                pass: { type: 'number', example: 5 },
                                warn: { type: 'number', example: 2 },
                                fail: { type: 'number', example: 1 },
                            },
                        },
                    },
                },
                comparisonSnapshotMetadata: {
                    type: 'object',
                    properties: {
                        snapshotId: { type: 'string', example: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7...' },
                        generatedAt: { type: 'string', example: '2026-01-04T20:00:00.000Z' },
                        hoursAgo: { type: 'number', example: 24 },
                    },
                },
                driftSummary: {
                    type: 'object',
                    properties: {
                        totalPolicies: { type: 'number', example: 8 },
                        improvements: { type: 'number', example: 1 },
                        regressions: { type: 'number', example: 2 },
                        noChange: { type: 'number', example: 5 },
                        criticalRegressions: { type: 'number', example: 1 },
                    },
                },
                drifts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            policyId: { type: 'string' },
                            policyName: { type: 'string', example: 'NO_HIGH_CONTROL_GAPS' },
                            previousStatus: { type: 'string', enum: ['PASS', 'WARN', 'FAIL'], example: 'PASS' },
                            currentStatus: { type: 'string', enum: ['PASS', 'WARN', 'FAIL'], example: 'FAIL' },
                            severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'], example: 'CRITICAL' },
                            driftType: { type: 'string', enum: ['IMPROVEMENT', 'REGRESSION', 'NO_CHANGE'], example: 'REGRESSION' },
                            rationaleDelta: {
                                type: 'string',
                                example:
                                    'Status degraded from PASS to FAIL. 2 HIGH-severity control gap(s) detected. Executive attention required.',
                            },
                            evidenceRefs: { type: 'array', items: { type: 'string' } },
                            detectedAt: { type: 'string', example: '2026-01-05T20:00:00.000Z' },
                        },
                    },
                },
                disclaimer: {
                    type: 'string',
                    example:
                        'This policy drift report is advisory only and does NOT enforce, automate, or mandate any action. Policy regressions do NOT trigger automated responses, block operations, emit alerts, or delegate decision-making authority. This report is intended for governance trend analysis, change management evidence, and audit purposes only.',
                },
                sprint: { type: 'string', example: 'SPRINT_18_PHASE_2' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid compareToHoursAgo parameter',
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async detectPolicyDrift(@Query('compareToHoursAgo') compareToHoursAgo?: string): Promise<PolicyDriftReport> {
        // Default to 24 hours if not specified
        const hoursAgo = compareToHoursAgo ? parseInt(compareToHoursAgo, 10) : 24;

        // Validate compareToHoursAgo parameter
        if (isNaN(hoursAgo) || hoursAgo < 1) {
            throw new BadRequestException('compareToHoursAgo must be a positive integer (minimum: 1)');
        }

        if (hoursAgo > 8760) {
            // 8760 hours = 1 year
            throw new BadRequestException('compareToHoursAgo must be <= 8760 (1 year maximum)');
        }

        this.logger.log(`[SPRINT_18_PHASE_2] Policy drift detection requested (comparing to ${hoursAgo} hours ago)`);

        const report = await this.policyDriftService.generateDriftReport(hoursAgo);

        this.logger.log(
            `[SPRINT_18_PHASE_2] Drift report generated (improvements: ${report.driftSummary.improvements}, regressions: ${report.driftSummary.regressions}, noChange: ${report.driftSummary.noChange}, criticalRegressions: ${report.driftSummary.criticalRegressions})`,
        );

        return report;
    }
}
