import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AgentMetricsService } from './agent-metrics.service';
import {
    AgentPerformanceMetricsDto,
    AgentLeaderboardDto,
    GeographicCoverageReportDto,
    SLAComplianceSummaryDto,
    AgentActivityTimelineDto,
} from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { startOfMonth, isValid } from 'date-fns';

@ApiTags('Admin - Agent Metrics')
@Controller('api/admin/agents')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN')
export class AdminAgentMetricsController {
    constructor(private readonly agentMetricsService: AgentMetricsService) { }

    @Get('metrics/:agentId')
    @ApiOperation({
        summary: 'Get agent performance metrics',
        description:
            'Retrieve comprehensive performance metrics for a specific agent including delivery stats, SLA compliance, and time-based metrics. Admin/Platform Admin only.',
    })
    @ApiResponse({
        status: 200,
        description: 'Agent performance metrics retrieved successfully',
        type: AgentPerformanceMetricsDto,
    })
    @ApiResponse({ status: 404, description: 'Agent not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiQuery({
        name: 'periodStart',
        required: false,
        description: 'ISO 8601 date for period start (defaults to start of current month)',
        example: '2026-01-01T00:00:00.000Z',
    })
    @ApiQuery({
        name: 'periodEnd',
        required: false,
        description: 'ISO 8601 date for period end (defaults to now)',
        example: '2026-01-31T23:59:59.999Z',
    })
    async getAgentMetrics(
        @Param('agentId') agentId: string,
        @Query('periodStart') periodStart?: string,
        @Query('periodEnd') periodEnd?: string,
    ): Promise<AgentPerformanceMetricsDto> {
        // Parse and validate dates
        const start = periodStart ? new Date(periodStart) : startOfMonth(new Date());
        const end = periodEnd ? new Date(periodEnd) : new Date();

        if (!isValid(start) || !isValid(end)) {
            throw new BadRequestException('Invalid date format. Use ISO 8601 format.');
        }

        if (start >= end) {
            throw new BadRequestException('periodStart must be before periodEnd');
        }

        return this.agentMetricsService.getAgentPerformanceMetrics(agentId, start, end);
    }

    @Get('leaderboard')
    @ApiOperation({
        summary: 'Get agent leaderboard',
        description:
            'Retrieve ranked list of agents based on performance metrics. Supports filtering by time period and sorting by various metrics. Admin/Platform Admin only.',
    })
    @ApiResponse({
        status: 200,
        description: 'Leaderboard retrieved successfully',
        type: AgentLeaderboardDto,
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['today', 'week', 'month', 'quarter', 'year'],
        description: 'Time period for leaderboard calculation',
        example: 'month',
    })
    @ApiQuery({
        name: 'sortBy',
        required: false,
        enum: ['successRate', 'totalDeliveries', 'onTimeRate', 'avgDeliveryTime'],
        description: 'Metric to sort by',
        example: 'successRate',
    })
    @ApiQuery({
        name: 'order',
        required: false,
        enum: ['asc', 'desc'],
        description: 'Sort order',
        example: 'desc',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Maximum number of results (max 500)',
        example: 50,
    })
    async getLeaderboard(
        @Query('period', new DefaultValuePipe('month')) period: string,
        @Query('sortBy', new DefaultValuePipe('successRate')) sortBy: string,
        @Query('order', new DefaultValuePipe('desc')) order: string,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ): Promise<AgentLeaderboardDto> {
        // Validate period
        const validPeriods = ['today', 'week', 'month', 'quarter', 'year'];
        if (!validPeriods.includes(period)) {
            throw new BadRequestException(
                `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
            );
        }

        // Validate sortBy
        const validSortFields = ['successRate', 'totalDeliveries', 'onTimeRate', 'avgDeliveryTime'];
        if (!validSortFields.includes(sortBy)) {
            throw new BadRequestException(
                `Invalid sortBy. Must be one of: ${validSortFields.join(', ')}`,
            );
        }

        // Validate order
        if (order !== 'asc' && order !== 'desc') {
            throw new BadRequestException('Invalid order. Must be "asc" or "desc"');
        }

        // Cap limit at 500
        const cappedLimit = Math.min(Math.max(1, limit), 500);

        return this.agentMetricsService.getAgentLeaderboard(
            period as any,
            sortBy as any,
            order as any,
            cappedLimit,
        );
    }

    @Get('geographic-coverage')
    @ApiOperation({
        summary: 'Get geographic coverage report',
        description:
            'Analyze agent distribution and performance across service zip codes. Identifies underserved areas. Admin/Platform Admin only.',
    })
    @ApiResponse({
        status: 200,
        description: 'Geographic coverage report retrieved successfully',
        type: GeographicCoverageReportDto,
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async getGeographicCoverage(): Promise<GeographicCoverageReportDto> {
        return this.agentMetricsService.getGeographicCoverage();
    }

    @Get('sla-summary')
    @ApiOperation({
        summary: 'Get SLA compliance summary',
        description:
            'Analyze SLA compliance including on-time delivery rates, average delays, and critical delays. Can filter by agent and time period. Admin/Platform Admin only.',
    })
    @ApiResponse({
        status: 200,
        description: 'SLA compliance summary retrieved successfully',
        type: SLAComplianceSummaryDto,
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['today', 'week', 'month', 'quarter'],
        description: 'Time period for SLA analysis',
        example: 'month',
    })
    @ApiQuery({
        name: 'agentId',
        required: false,
        description: 'Optional agent ID to filter by specific agent',
    })
    async getSLASummary(
        @Query('period', new DefaultValuePipe('month')) period: string,
        @Query('agentId') agentId?: string,
    ): Promise<SLAComplianceSummaryDto> {
        // Validate period (year not allowed for SLA)
        const validPeriods = ['today', 'week', 'month', 'quarter'];
        if (!validPeriods.includes(period)) {
            throw new BadRequestException(
                `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
            );
        }

        return this.agentMetricsService.getSLAComplianceSummary(period as any, agentId);
    }

    @Get(':agentId/activity')
    @ApiOperation({
        summary: 'Get agent activity timeline',
        description:
            'Retrieve chronological activity log for a specific agent with pagination. Shows status transitions and events. Admin/Platform Admin only.',
    })
    @ApiResponse({
        status: 200,
        description: 'Activity timeline retrieved successfully',
        type: AgentActivityTimelineDto,
    })
    @ApiResponse({ status: 404, description: 'Agent not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiQuery({
        name: 'startDate',
        required: true,
        description: 'ISO 8601 date for activity period start',
        example: '2026-01-01T00:00:00.000Z',
    })
    @ApiQuery({
        name: 'endDate',
        required: true,
        description: 'ISO 8601 date for activity period end',
        example: '2026-01-31T23:59:59.999Z',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Maximum number of activities to return (max 1000)',
        example: 100,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        description: 'Pagination offset',
        example: 0,
    })
    async getAgentActivity(
        @Param('agentId') agentId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ): Promise<AgentActivityTimelineDto> {
        // Validate required dates
        if (!startDate || !endDate) {
            throw new BadRequestException('startDate and endDate are required');
        }

        // Parse and validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isValid(start) || !isValid(end)) {
            throw new BadRequestException('Invalid date format. Use ISO 8601 format.');
        }

        if (start >= end) {
            throw new BadRequestException('startDate must be before endDate');
        }

        // Cap limit at 1000
        const cappedLimit = Math.min(Math.max(1, limit), 1000);

        // Validate offset
        if (offset < 0) {
            throw new BadRequestException('offset must be non-negative');
        }

        return this.agentMetricsService.getAgentActivityTimeline(
            agentId,
            start,
            end,
            cappedLimit,
            offset,
        );
    }
}
