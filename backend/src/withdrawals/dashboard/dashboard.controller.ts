/**
 * SPRINT 16 PHASE 4: Dashboard Controller
 * 
 * Purpose: Expose READ-ONLY dashboard metrics for admin UI
 * 
 * Endpoint:
 * - GET /api/admin/dashboard/metrics
 * 
 * RBAC:
 * - Requires: PLATFORM_ADMIN or ADMIN
 * 
 * Characteristics:
 * - READ-ONLY: No mutations
 * - On-demand: Metrics computed per request
 * - Time-windowed: 1h, 6h, 24h aggregation
 * - Deterministic: Same data → same metrics
 * 
 * Non-Goals:
 * - No caching
 * - No persistence
 * - No push notifications
 * - No webhooks
 */

import { Controller, Get, Query, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardMetricsService } from './dashboard-metrics.service';
import { DashboardMetrics, AggregationWindow } from './dashboard-metrics.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';

@ApiTags('Admin - Dashboard')
@Controller('api/admin/dashboard')
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN', 'ADMIN')
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(private readonly dashboardService: DashboardMetricsService) { }

    /**
     * GET /api/admin/dashboard/metrics
     * 
     * Generate operational dashboard metrics aggregated over specified time window.
     * 
     * Query Parameters:
     * - windowHours: 1 | 6 | 24 (default: 24)
     * 
     * Returns:
     * - DashboardMetrics snapshot with events, alerts, incidents, and top risk users
     * 
     * RBAC: Requires PLATFORM_ADMIN or ADMIN role
     * 
     * Example:
     * GET /api/admin/dashboard/metrics?windowHours=6
     */
    @Get('metrics')
    @ApiOperation({
        summary: 'Get dashboard metrics',
        description:
            'Generate operational dashboard metrics aggregated over specified time window. ' +
            'Includes event counts, alert statistics, incident summaries, and top risk users. ' +
            'Metrics are computed on-demand (not cached).',
    })
    @ApiQuery({
        name: 'windowHours',
        required: false,
        type: Number,
        enum: [1, 6, 24],
        description: 'Aggregation time window in hours (default: 24)',
        example: 24,
    })
    @ApiResponse({
        status: 200,
        description: 'Dashboard metrics successfully generated',
        schema: {
            example: {
                generatedAt: '2026-01-05T10:00:00.000Z',
                windowHours: 24,
                events: {
                    total: 42,
                    byType: {
                        WITHDRAWAL_STATE_CHANGED: 15,
                        LIMIT_VIOLATION_DETECTED: 10,
                        CRITICAL_AMOUNT_DETECTED: 8,
                        FRAUDULENT_PATTERN_DETECTED: 5,
                        RAPID_SUCCESSION_DETECTED: 4,
                    },
                    bySeverity: {
                        INFO: 20,
                        WARNING: 15,
                        CRITICAL: 7,
                    },
                },
                alerts: {
                    total: 18,
                    bySeverity: {
                        INFO: 5,
                        WARNING: 8,
                        CRITICAL: 5,
                    },
                    byCategory: {
                        FRAUD_RISK: 10,
                        COMPLIANCE: 5,
                        PROCESS_ANOMALY: 3,
                    },
                    activeLastHour: 3,
                },
                incidents: {
                    total: 6,
                    open: 4,
                    stale: 2,
                    byCategory: {
                        FRAUD_RISK: 3,
                        COMPLIANCE: 2,
                        PROCESS_ANOMALY: 1,
                    },
                    bySeverity: {
                        CRITICAL: 3,
                        WARNING: 2,
                        INFO: 1,
                    },
                },
                topRiskUsers: [
                    {
                        userId: 'user_123',
                        alertCount: 8,
                        incidentCount: 2,
                        highestSeverity: 'CRITICAL',
                    },
                    {
                        userId: 'user_456',
                        alertCount: 5,
                        incidentCount: 1,
                        highestSeverity: 'WARNING',
                    },
                ],
                sprint: 'SPRINT_16_PHASE_4',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid query parameters (e.g., windowHours not in [1, 6, 24])',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have PLATFORM_ADMIN or ADMIN role',
    })
    async getMetrics(
        @Query('windowHours') windowHours?: string,
    ): Promise<DashboardMetrics> {
        // Parse and validate windowHours
        const parsedWindowHours = this.parseWindowHours(windowHours);

        this.logger.log(
            `[SPRINT_16_PHASE_4] Dashboard metrics requested (windowHours: ${parsedWindowHours})`,
        );

        const metrics = await this.dashboardService.generateMetrics(parsedWindowHours);

        this.logger.log(
            `[SPRINT_16_PHASE_4] Dashboard metrics returned (events: ${metrics.events.total}, alerts: ${metrics.alerts.total}, incidents: ${metrics.incidents.total})`,
        );

        return metrics;
    }

    /**
     * Parse and validate windowHours query parameter
     * 
     * @param windowHours - Query parameter value
     * @returns Validated AggregationWindow (1, 6, or 24)
     * @throws BadRequestException if invalid
     */
    private parseWindowHours(windowHours?: string): AggregationWindow {
        if (!windowHours) {
            return 24; // Default
        }

        const parsed = parseInt(windowHours, 10);

        if (isNaN(parsed) || ![1, 6, 24].includes(parsed)) {
            throw new BadRequestException(
                'Invalid windowHours parameter. Must be 1, 6, or 24.',
            );
        }

        return parsed as AggregationWindow;
    }
}
