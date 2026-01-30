import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    DefaultValuePipe,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalRiskVisibilityService } from './withdrawal-risk-visibility.service';
import { WithdrawalStatus } from '@prisma/client';

/**
 * SPRINT_13_PHASE_3: Admin Visibility - Risk Escalation Insights
 * 
 * Exposes withdrawal risk escalation data to admins via READ-ONLY endpoints.
 * 
 * CRITICAL: All endpoints are admin-only and READ-ONLY.
 * No mutations, no state changes, no approvals.
 */

@ApiTags('Admin - Risk Escalation Visibility')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN', 'ADMIN')
@Controller('api/admin/withdrawals/risk')
export class WithdrawalRiskVisibilityController {
    constructor(
        private readonly visibilityService: WithdrawalRiskVisibilityService,
    ) { }

    /**
     * Get escalation summaries for withdrawals with filters
     * 
     * READ-ONLY: Admin endpoint to view risk escalations
     * 
     * Query Parameters:
     * - startDate: ISO date string (optional)
     * - endDate: ISO date string (optional)
     * - severity: MEDIUM | HIGH (optional)
     * - userId: Filter by specific user (optional)
     * - status: APPROVED | PROCESSING | COMPLETED (optional)
     * - limit: Results per page (default: 50, max: 100)
     * - offset: Pagination offset (default: 0)
     */
    @Get('escalations')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get withdrawal escalations (Admin only)',
        description: 'Returns paginated list of withdrawals with risk escalation data. READ-ONLY.',
    })
    @ApiResponse({
        status: 200,
        description: 'Escalation summaries retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                withdrawals: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            withdrawalId: { type: 'string' },
                            userId: { type: 'string' },
                            status: { type: 'string' },
                            requestedAt: { type: 'string' },
                            approvedAt: { type: 'string', nullable: true },
                            escalations: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        timestamp: { type: 'string' },
                                        fromRiskLevel: { type: 'string' },
                                        toRiskLevel: { type: 'string' },
                                        deltaScore: { type: 'number' },
                                        escalationType: { type: 'string' },
                                        newSignals: { type: 'array', items: { type: 'string' } },
                                        severity: { type: 'string', enum: ['MEDIUM', 'HIGH'] },
                                    },
                                },
                            },
                            latestRiskLevel: { type: 'string' },
                            latestRiskScore: { type: 'number' },
                            escalationCount: { type: 'number' },
                            highestSeverity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                        },
                    },
                },
                total: { type: 'number' },
                hasMore: { type: 'boolean' },
            },
        },
    })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string' })
    @ApiQuery({ name: 'severity', required: false, enum: ['MEDIUM', 'HIGH'] })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ['APPROVED', 'PROCESSING', 'COMPLETED'] })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Default: 50, Max: 100' })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Default: 0' })
    async getEscalations(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('severity') severity?: 'MEDIUM' | 'HIGH',
        @Query('userId') userId?: string,
        @Query('status') status?: string,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
        @Request() req?: any,
    ) {
        const adminId = req.user.id;

        // Validate date filters
        const filters: any = { limit, offset };

        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw new BadRequestException('Invalid startDate format. Use ISO date string.');
            }
            filters.startDate = parsedStartDate;
        }

        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw new BadRequestException('Invalid endDate format. Use ISO date string.');
            }
            filters.endDate = parsedEndDate;
        }

        if (severity) {
            if (!['MEDIUM', 'HIGH'].includes(severity)) {
                throw new BadRequestException('severity must be MEDIUM or HIGH');
            }
            filters.severity = severity;
        }

        if (userId) {
            filters.userId = userId;
        }

        if (status) {
            if (!['APPROVED', 'PROCESSING', 'COMPLETED'].includes(status)) {
                throw new BadRequestException('status must be APPROVED, PROCESSING, or COMPLETED');
            }
            filters.status = status as WithdrawalStatus;
        }

        return this.visibilityService.getEscalations(filters, adminId);
    }

    /**
     * Get full risk timeline for a specific withdrawal
     * 
     * READ-ONLY: Admin endpoint to view complete escalation timeline
     */
    @Get(':id/risk-timeline')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get withdrawal risk timeline (Admin only)',
        description: 'Returns complete risk escalation timeline for a specific withdrawal. READ-ONLY.',
    })
    @ApiResponse({
        status: 200,
        description: 'Risk timeline retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                withdrawalId: { type: 'string' },
                userId: { type: 'string' },
                status: { type: 'string' },
                requestedAt: { type: 'string' },
                approvedAt: { type: 'string', nullable: true },
                escalations: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            timestamp: { type: 'string' },
                            fromRiskLevel: { type: 'string' },
                            toRiskLevel: { type: 'string' },
                            deltaScore: { type: 'number' },
                            escalationType: { type: 'string' },
                            newSignals: { type: 'array', items: { type: 'string' } },
                            severity: { type: 'string', enum: ['MEDIUM', 'HIGH'] },
                        },
                    },
                },
                latestRiskLevel: { type: 'string' },
                latestRiskScore: { type: 'number' },
                escalationCount: { type: 'number' },
                highestSeverity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Withdrawal not found' })
    async getWithdrawalRiskTimeline(
        @Param('id') withdrawalId: string,
        @Request() req: any,
    ) {
        const adminId = req.user.id;

        const timeline = await this.visibilityService.getWithdrawalRiskTimeline(
            withdrawalId,
            adminId,
        );

        if (!timeline) {
            throw new BadRequestException('Withdrawal not found');
        }

        return timeline;
    }

    /**
     * Get escalation statistics
     * 
     * READ-ONLY: Admin endpoint to view aggregated escalation metrics
     */
    @Get('statistics')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get escalation statistics (Admin only)',
        description: 'Returns aggregated escalation metrics for admin dashboard. READ-ONLY.',
    })
    @ApiResponse({
        status: 200,
        description: 'Statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                totalWithdrawals: { type: 'number' },
                escalatedWithdrawals: { type: 'number' },
                escalationRate: { type: 'number', description: 'Percentage' },
                severityBreakdown: {
                    type: 'object',
                    properties: {
                        high: { type: 'number' },
                        medium: { type: 'number' },
                        low: { type: 'number' },
                    },
                },
            },
        },
    })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string' })
    async getEscalationStatistics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Request() req?: any,
    ) {
        const adminId = req.user.id;

        const filters: any = {};

        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw new BadRequestException('Invalid startDate format. Use ISO date string.');
            }
            filters.startDate = parsedStartDate;
        }

        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw new BadRequestException('Invalid endDate format. Use ISO date string.');
            }
            filters.endDate = parsedEndDate;
        }

        return this.visibilityService.getEscalationStatistics(filters, adminId);
    }
}
