import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
    AgentPerformanceMetricsDto,
    AgentLeaderboardDto,
    AgentLeaderboardEntryDto,
    GeographicCoverageReportDto,
    ZipCodeCoverageDto,
    SLAComplianceSummaryDto,
    AgentSLADto,
    CriticalDelayDto,
    AgentActivityTimelineDto,
    AgentActivityEntryDto,
    AgentActivityEvent,
} from './dto';
import { Prisma, ShippingStatus } from '@prisma/client';
import {
    startOfDay,
    startOfWeek,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    endOfDay,
} from 'date-fns';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';
type SortByType = 'successRate' | 'totalDeliveries' | 'onTimeRate' | 'avgDeliveryTime';

@Injectable()
export class AgentMetricsService {
    private readonly logger = new Logger(AgentMetricsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    /**
     * Get comprehensive performance metrics for a specific agent
     * READ-ONLY: Aggregates data from delivery_agents, shipping_assignments, users
     * Cache TTL: 10 minutes
     */
    async getAgentPerformanceMetrics(
        agentId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<AgentPerformanceMetricsDto> {
        const cacheKey = `agent_metrics:${agentId}:${periodStart.getTime()}:${periodEnd.getTime()}`;
        const cached = await this.cacheManager.get<AgentPerformanceMetricsDto>(cacheKey);

        if (cached) {
            this.logger.log({
                event: 'agent_metrics_cache_hit',
                agentId,
                cacheKey,
            });
            return cached;
        }

        const startTime = Date.now();

        // Execute raw SQL for complex aggregations (Prisma ORM overhead avoided)
        const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        da.id as agent_id,
        da.agent_code,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Agent') as agent_name,
        da.is_available,
        da.status,

        -- Delivery stats
        COUNT(sa.id) as total_assignments,
        COUNT(sa.id) FILTER (WHERE sa.status IN ('DELIVERED', 'FAILED')) as total_deliveries,
        COUNT(sa.id) FILTER (WHERE sa.status = 'DELIVERED') as successful_deliveries,
        COUNT(sa.id) FILTER (WHERE sa.status = 'FAILED') as failed_deliveries,
        COUNT(sa.id) FILTER (WHERE sa.status = 'CANCELLED') as cancelled_assignments,

        -- Time-based metrics (in minutes)
        AVG(EXTRACT(EPOCH FROM (sa.picked_up_at - sa.assigned_at)) / 60)
          FILTER (WHERE sa.picked_up_at IS NOT NULL AND sa.assigned_at IS NOT NULL) as avg_pickup_time,
        AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.picked_up_at)) / 60)
          FILTER (WHERE sa.delivered_at IS NOT NULL AND sa.picked_up_at IS NOT NULL) as avg_transit_time,
        AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.assigned_at)) / 60)
          FILTER (WHERE sa.delivered_at IS NOT NULL AND sa.assigned_at IS NOT NULL) as avg_total_delivery_time,

        -- SLA compliance
        COUNT(sa.id) FILTER (
          WHERE sa.status = 'DELIVERED' 
          AND sa.delivered_at IS NOT NULL 
          AND sa.estimated_delivery_time IS NOT NULL
          AND sa.delivered_at <= sa.estimated_delivery_time
        ) as on_time_deliveries,
        COUNT(sa.id) FILTER (
          WHERE sa.status = 'DELIVERED' 
          AND sa.delivered_at IS NOT NULL 
          AND sa.estimated_delivery_time IS NOT NULL
          AND sa.delivered_at > sa.estimated_delivery_time
        ) as late_deliveries,
        AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.estimated_delivery_time)) / 60)
          FILTER (
            WHERE sa.delivered_at IS NOT NULL 
            AND sa.estimated_delivery_time IS NOT NULL
            AND sa.delivered_at > sa.estimated_delivery_time
          ) as avg_delay_minutes,

        -- Current workload
        COUNT(sa_current.id) as current_assignments

      FROM delivery_agents da
      LEFT JOIN users u ON da.user_id = u.id
      LEFT JOIN shipping_assignments sa ON da.id = sa.agent_id
        AND sa.assigned_at >= ${periodStart}::timestamptz
        AND sa.assigned_at < ${periodEnd}::timestamptz
      LEFT JOIN shipping_assignments sa_current ON da.id = sa_current.agent_id
        AND sa_current.status IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      WHERE da.id = ${agentId}::uuid
      GROUP BY da.id, da.agent_code, u.first_name, u.last_name, da.is_available, da.status
    `;

        if (!result || result.length === 0) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        const metrics = this.transformToAgentMetrics(result[0], periodStart, periodEnd);

        const duration = Date.now() - startTime;
        this.logger.log({
            event: 'agent_metrics_calculated',
            agentId,
            durationMs: duration,
        });

        if (duration > 500) {
            this.logger.warn({
                event: 'slow_query',
                method: 'getAgentPerformanceMetrics',
                agentId,
                durationMs: duration,
            });
        }

        // Cache for 10 minutes (600000ms)
        await this.cacheManager.set(cacheKey, metrics, 600000);

        return metrics;
    }

    /**
     * Get agent leaderboard with sorting and filtering
     * READ-ONLY: Aggregates all agents' performance
     * Cache TTL: 15 minutes
     */
    async getAgentLeaderboard(
        period: PeriodType,
        sortBy: SortByType,
        order: 'asc' | 'desc',
        limit: number,
    ): Promise<AgentLeaderboardDto> {
        const cacheKey = `leaderboard:${period}:${sortBy}:${order}:${limit}`;
        const cached = await this.cacheManager.get<AgentLeaderboardDto>(cacheKey);

        if (cached) {
            this.logger.log({
                event: 'leaderboard_cache_hit',
                cacheKey,
            });
            return cached;
        }

        const startTime = Date.now();
        const { start, end, label } = this.getPeriodDates(period);

        // Build ORDER BY clause based on sortBy parameter
        const orderByClause = this.getOrderByClause(sortBy, order);

        const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        da.id as agent_id,
        da.agent_code,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Agent') as agent_name,
        COUNT(sa.id) FILTER (WHERE sa.status IN ('DELIVERED', 'FAILED')) as total_deliveries,
        COUNT(sa.id) FILTER (WHERE sa.status = 'DELIVERED')::decimal / 
          NULLIF(COUNT(sa.id) FILTER (WHERE sa.status IN ('DELIVERED', 'FAILED')), 0) * 100 as success_rate,
        COUNT(sa.id) FILTER (
          WHERE sa.status = 'DELIVERED' 
          AND sa.delivered_at <= sa.estimated_delivery_time
        )::decimal / 
          NULLIF(COUNT(sa.id) FILTER (WHERE sa.status = 'DELIVERED'), 0) * 100 as on_time_rate,
        AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.assigned_at)) / 60)
          FILTER (WHERE sa.delivered_at IS NOT NULL) as avg_delivery_time_minutes
      FROM delivery_agents da
      LEFT JOIN users u ON da.user_id = u.id
      LEFT JOIN shipping_assignments sa ON da.id = sa.agent_id
        AND sa.assigned_at >= ${start}::timestamptz
        AND sa.assigned_at < ${end}::timestamptz
      WHERE da.status = 'ACTIVE'
      GROUP BY da.id, da.agent_code, u.first_name, u.last_name
      HAVING COUNT(sa.id) > 0
      ORDER BY ${Prisma.raw(orderByClause)}
      LIMIT ${limit}
    `;

        const entries: AgentLeaderboardEntryDto[] = results.map((row, index) => ({
            rank: index + 1,
            agentId: row.agent_id,
            agentCode: row.agent_code,
            agentName: row.agent_name,
            totalDeliveries: parseInt(row.total_deliveries) || 0,
            successRate: parseFloat(row.success_rate) || 0,
            onTimeRate: parseFloat(row.on_time_rate) || 0,
            avgDeliveryTimeMinutes: parseFloat(row.avg_delivery_time_minutes) || 0,
        }));

        const leaderboard: AgentLeaderboardDto = {
            entries,
            period: { start, end, label },
            sortedBy: sortBy,
            total: entries.length,
        };

        const duration = Date.now() - startTime;
        this.logger.log({
            event: 'leaderboard_calculated',
            period,
            sortBy,
            count: entries.length,
            durationMs: duration,
        });

        if (duration > 500) {
            this.logger.warn({
                event: 'slow_query',
                method: 'getAgentLeaderboard',
                period,
                durationMs: duration,
            });
        }

        // Cache for 15 minutes (900000ms)
        await this.cacheManager.set(cacheKey, leaderboard, 900000);

        return leaderboard;
    }

    /**
     * Get geographic coverage report by zip code
     * READ-ONLY: Analyzes agent distribution across service areas
     * Cache TTL: 30 minutes
     */
    async getGeographicCoverage(): Promise<GeographicCoverageReportDto> {
        const cacheKey = 'geo_coverage:all';
        const cached = await this.cacheManager.get<GeographicCoverageReportDto>(cacheKey);

        if (cached) {
            this.logger.log({
                event: 'geo_coverage_cache_hit',
                cacheKey,
            });
            return cached;
        }

        const startTime = Date.now();
        const monthStart = startOfMonth(new Date());

        // Query using GIN index on service_zip_codes
        const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        zip.zip_code,
        COUNT(DISTINCT da.id) as active_agents,
        COUNT(DISTINCT da.id) FILTER (WHERE da.is_available = true) as available_agents,
        COUNT(sa.id) FILTER (
          WHERE sa.delivered_at >= ${monthStart}::timestamptz
        ) as total_deliveries_this_month,
        AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.assigned_at)) / 60)
          FILTER (WHERE sa.delivered_at IS NOT NULL) as avg_delivery_time_minutes
      FROM (
        SELECT DISTINCT unnest(service_zip_codes) as zip_code
        FROM delivery_agents
        WHERE status = 'ACTIVE'
      ) zip
      LEFT JOIN delivery_agents da ON zip.zip_code = ANY(da.service_zip_codes)
        AND da.status = 'ACTIVE'
      LEFT JOIN shipping_assignments sa ON da.id = sa.agent_id
        AND sa.status = 'DELIVERED'
      GROUP BY zip.zip_code
      ORDER BY active_agents ASC, total_deliveries_this_month ASC
    `;

        const zipCodes: ZipCodeCoverageDto[] = results.map((row) => ({
            zipCode: row.zip_code,
            activeAgents: parseInt(row.active_agents) || 0,
            availableAgents: parseInt(row.available_agents) || 0,
            totalDeliveriesThisMonth: parseInt(row.total_deliveries_this_month) || 0,
            avgDeliveryTimeMinutes: parseFloat(row.avg_delivery_time_minutes) || 0,
        }));

        // Identify underserved zip codes (< 2 active agents)
        const underservedZipCodes = zipCodes
            .filter((z) => z.activeAgents < 2)
            .map((z) => z.zipCode);

        const report: GeographicCoverageReportDto = {
            zipCodes,
            underservedZipCodes,
            calculatedAt: new Date(),
        };

        const duration = Date.now() - startTime;
        this.logger.log({
            event: 'geo_coverage_calculated',
            totalZipCodes: zipCodes.length,
            underservedCount: underservedZipCodes.length,
            durationMs: duration,
        });

        if (duration > 500) {
            this.logger.warn({
                event: 'slow_query',
                method: 'getGeographicCoverage',
                durationMs: duration,
            });
        }

        // Cache for 30 minutes (1800000ms)
        await this.cacheManager.set(cacheKey, report, 1800000);

        return report;
    }

    /**
     * Get SLA compliance summary
     * READ-ONLY: Analyzes on-time delivery performance
     * Cache TTL: 10 minutes
     */
    async getSLAComplianceSummary(
        period: Exclude<PeriodType, 'year'>,
        agentId?: string,
    ): Promise<SLAComplianceSummaryDto> {
        const cacheKey = `sla_summary:${period}:${agentId || 'all'}`;
        const cached = await this.cacheManager.get<SLAComplianceSummaryDto>(cacheKey);

        if (cached) {
            this.logger.log({
                event: 'sla_summary_cache_hit',
                cacheKey,
            });
            return cached;
        }

        const startTime = Date.now();
        const { start, end, label } = this.getPeriodDates(period);

        // Overall SLA metrics
        const overallResult = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'DELIVERED') as total_deliveries,
        COUNT(*) FILTER (
          WHERE status = 'DELIVERED' 
          AND delivered_at <= estimated_delivery_time
        ) as on_time_deliveries,
        COUNT(*) FILTER (
          WHERE status = 'DELIVERED' 
          AND delivered_at > estimated_delivery_time
        ) as late_deliveries,
        AVG(EXTRACT(EPOCH FROM (delivered_at - estimated_delivery_time)) / 60)
          FILTER (WHERE delivered_at > estimated_delivery_time) as avg_delay_minutes
      FROM shipping_assignments
      WHERE assigned_at >= ${start}::timestamptz
        AND assigned_at < ${end}::timestamptz
        ${agentId ? Prisma.sql`AND agent_id = ${agentId}::uuid` : Prisma.empty}
    `;

        const overall = overallResult[0];
        const totalDeliveries = parseInt(overall.total_deliveries) || 0;
        const onTimeDeliveries = parseInt(overall.on_time_deliveries) || 0;
        const lateDeliveries = parseInt(overall.late_deliveries) || 0;

        // Per-agent SLA metrics
        const agentResults = await this.prisma.$queryRaw<any[]>`
      SELECT
        da.id as agent_id,
        da.agent_code,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Agent') as agent_name,
        COUNT(sa.id) FILTER (WHERE sa.status = 'DELIVERED') as total_deliveries,
        COUNT(sa.id) FILTER (
          WHERE sa.status = 'DELIVERED' 
          AND sa.delivered_at <= sa.estimated_delivery_time
        ) as on_time_deliveries,
        AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.estimated_delivery_time)) / 60)
          FILTER (WHERE sa.delivered_at > sa.estimated_delivery_time) as avg_delay_minutes
      FROM delivery_agents da
      LEFT JOIN users u ON da.user_id = u.id
      LEFT JOIN shipping_assignments sa ON da.id = sa.agent_id
        AND sa.assigned_at >= ${start}::timestamptz
        AND sa.assigned_at < ${end}::timestamptz
      WHERE da.status = 'ACTIVE'
        ${agentId ? Prisma.sql`AND da.id = ${agentId}::uuid` : Prisma.empty}
      GROUP BY da.id, da.agent_code, u.first_name, u.last_name
      HAVING COUNT(sa.id) FILTER (WHERE sa.status = 'DELIVERED') > 0
      ORDER BY on_time_deliveries DESC
    `;

        const byAgent: AgentSLADto[] = agentResults.map((row) => {
            const agentTotal = parseInt(row.total_deliveries) || 0;
            const agentOnTime = parseInt(row.on_time_deliveries) || 0;
            return {
                agentId: row.agent_id,
                agentCode: row.agent_code,
                agentName: row.agent_name,
                totalDeliveries: agentTotal,
                onTimeDeliveries: agentOnTime,
                onTimeRate: agentTotal > 0 ? (agentOnTime / agentTotal) * 100 : 0,
                avgDelayMinutes: parseFloat(row.avg_delay_minutes) || 0,
            };
        });

        // Critical delays (> 120 minutes)
        const criticalResults = await this.prisma.$queryRaw<any[]>`
      SELECT
        sa.id as assignment_id,
        o.order_number,
        da.agent_code,
        sa.estimated_delivery_time,
        sa.delivered_at as actual_delivery_time,
        EXTRACT(EPOCH FROM (sa.delivered_at - sa.estimated_delivery_time)) / 60 as delay_minutes
      FROM shipping_assignments sa
      INNER JOIN orders o ON sa.order_id = o.id
      INNER JOIN delivery_agents da ON sa.agent_id = da.id
      WHERE sa.status = 'DELIVERED'
        AND sa.assigned_at >= ${start}::timestamptz
        AND sa.assigned_at < ${end}::timestamptz
        AND sa.delivered_at > sa.estimated_delivery_time
        AND EXTRACT(EPOCH FROM (sa.delivered_at - sa.estimated_delivery_time)) / 60 > 120
        ${agentId ? Prisma.sql`AND sa.agent_id = ${agentId}::uuid` : Prisma.empty}
      ORDER BY delay_minutes DESC
      LIMIT 50
    `;

        const criticalDelays: CriticalDelayDto[] = criticalResults.map((row) => ({
            assignmentId: row.assignment_id,
            orderNumber: row.order_number,
            agentCode: row.agent_code,
            estimatedDeliveryTime: row.estimated_delivery_time,
            actualDeliveryTime: row.actual_delivery_time,
            delayMinutes: parseFloat(row.delay_minutes) || 0,
        }));

        const summary: SLAComplianceSummaryDto = {
            period: { start, end, label },
            overall: {
                totalDeliveries,
                onTimeDeliveries,
                lateDeliveries,
                onTimeRate: totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0,
                avgDelayMinutes: parseFloat(overall.avg_delay_minutes) || 0,
            },
            byAgent,
            criticalDelays,
            calculatedAt: new Date(),
        };

        const duration = Date.now() - startTime;
        this.logger.log({
            event: 'sla_summary_calculated',
            period,
            agentId: agentId || 'all',
            totalDeliveries,
            onTimeRate: summary.overall.onTimeRate,
            durationMs: duration,
        });

        if (duration > 500) {
            this.logger.warn({
                event: 'slow_query',
                method: 'getSLAComplianceSummary',
                period,
                durationMs: duration,
            });
        }

        // Cache for 10 minutes (600000ms)
        await this.cacheManager.set(cacheKey, summary, 600000);

        return summary;
    }

    /**
     * Get agent activity timeline from shipping logs
     * READ-ONLY: Fetches log entries with pagination
     * NO CACHING: Real-time log data
     */
    async getAgentActivityTimeline(
        agentId: string,
        startDate: Date,
        endDate: Date,
        limit: number,
        offset: number,
    ): Promise<AgentActivityTimelineDto> {
        const startTime = Date.now();

        // Verify agent exists
        const agent = await this.prisma.delivery_agents.findUnique({
            where: { id: agentId },
            select: { id: true, agentCode: true },
        });

        if (!agent) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        // Fetch assignment IDs for this agent
        const assignmentIds = (await this.prisma.shipping_assignments.findMany({
            where: { agentId: agentId },
            select: { id: true },
        })).map(a => a.id);

        // Fetch activity logs with pagination
        const logs = await this.prisma.shipping_logs.findMany({
            where: {
                assignmentId: { in: assignmentIds },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                createdAt: true,
                fromStatus: true,
                toStatus: true,
                notes: true,
                assignmentId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1, // Fetch one extra to check hasMore
            skip: offset,
        });

        const hasMore = logs.length > limit;
        const activities = logs.slice(0, limit);

        // Count total activities for this period
        const total = await this.prisma.shipping_logs.count({
            where: {
                assignmentId: { in: assignmentIds },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // Fetch assignment details separately
        const uniqueAssignmentIds = [...new Set(activities.map(log => log.assignmentId))];
        const assignments = await this.prisma.shipping_assignments.findMany({
            where: { id: { in: uniqueAssignmentIds } },
            select: {
                id: true,
                orders: {
                    select: { orderNumber: true },
                },
            },
        });

        const assignmentMap = new Map(assignments.map(a => [a.id, a.orders.orderNumber]));

        const activityEntries: AgentActivityEntryDto[] = activities.map((log) => ({
            timestamp: log.createdAt,
            event: this.mapStatusToEvent(log.toStatus),
            assignmentId: log.assignmentId,
            orderNumber: assignmentMap.get(log.assignmentId) || 'UNKNOWN',
            fromStatus: log.fromStatus as ShippingStatus | null,
            toStatus: log.toStatus as ShippingStatus,
            notes: log.notes || undefined,
        }));

        const timeline: AgentActivityTimelineDto = {
            agentId: agent.id,
            agentCode: agent.agentCode,
            activities: activityEntries,
            total,
            hasMore,
        };

        const duration = Date.now() - startTime;
        this.logger.log({
            event: 'activity_timeline_fetched',
            agentId,
            count: activityEntries.length,
            total,
            durationMs: duration,
        });

        return timeline;
    }

    /**
     * Transform raw query result to typed DTO
     * HELPER METHOD: No database access
     */
    private transformToAgentMetrics(
        raw: any,
        periodStart: Date,
        periodEnd: Date,
    ): AgentPerformanceMetricsDto {
        const totalAssignments = parseInt(raw.total_assignments) || 0;
        const totalDeliveries = parseInt(raw.total_deliveries) || 0;
        const successfulDeliveries = parseInt(raw.successful_deliveries) || 0;
        const onTimeDeliveries = parseInt(raw.on_time_deliveries) || 0;

        return {
            agentId: raw.agent_id,
            agentCode: raw.agent_code,
            agentName: raw.agent_name,
            totalAssignments,
            totalDeliveries,
            successfulDeliveries,
            failedDeliveries: parseInt(raw.failed_deliveries) || 0,
            cancelledAssignments: parseInt(raw.cancelled_assignments) || 0,
            successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
            avgPickupTime: parseFloat(raw.avg_pickup_time) || 0,
            avgTransitTime: parseFloat(raw.avg_transit_time) || 0,
            avgTotalDeliveryTime: parseFloat(raw.avg_total_delivery_time) || 0,
            onTimeDeliveries,
            lateDeliveries: parseInt(raw.late_deliveries) || 0,
            onTimeRate: totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0,
            avgDelayMinutes: parseFloat(raw.avg_delay_minutes) || 0,
            currentAssignments: parseInt(raw.current_assignments) || 0,
            isAvailable: raw.is_available,
            status: raw.status,
            periodStart,
            periodEnd,
            calculatedAt: new Date(),
        };
    }

    /**
     * Calculate period start/end dates based on period type
     * HELPER METHOD: No database access
     */
    private getPeriodDates(period: PeriodType): { start: Date; end: Date; label: string } {
        const now = new Date();
        let start: Date;
        let end: Date;
        let label: string;

        switch (period) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                label = 'Today';
                break;
            case 'week':
                start = startOfWeek(now);
                end = now;
                label = 'This Week';
                break;
            case 'month':
                start = startOfMonth(now);
                end = now;
                label = 'This Month';
                break;
            case 'quarter':
                start = startOfQuarter(now);
                end = now;
                label = 'This Quarter';
                break;
            case 'year':
                start = startOfYear(now);
                end = now;
                label = 'This Year';
                break;
            default:
                start = startOfMonth(now);
                end = now;
                label = 'This Month';
        }

        return { start, end, label };
    }

    /**
     * Generate ORDER BY SQL clause for leaderboard sorting
     * HELPER METHOD: No database access
     */
    private getOrderByClause(sortBy: SortByType, order: 'asc' | 'desc'): string {
        const direction = order.toUpperCase();
        switch (sortBy) {
            case 'successRate':
                return `success_rate ${direction} NULLS LAST`;
            case 'totalDeliveries':
                return `total_deliveries ${direction} NULLS LAST`;
            case 'onTimeRate':
                return `on_time_rate ${direction} NULLS LAST`;
            case 'avgDeliveryTime':
                return `avg_delivery_time_minutes ${direction} NULLS LAST`;
            default:
                return `success_rate ${direction} NULLS LAST`;
        }
    }

    /**
     * Map shipping status to activity event name
     * HELPER METHOD: No database access
     */
    private mapStatusToEvent(status: ShippingStatus): AgentActivityEvent {
        switch (status) {
            case 'ACCEPTED':
                return 'assignment_accepted';
            case 'PICKED_UP':
                return 'pickup_confirmed';
            case 'IN_TRANSIT':
                return 'transit_started';
            case 'DELIVERED':
                return 'delivery_confirmed';
            case 'FAILED':
                return 'delivery_failed';
            case 'CANCELLED':
                return 'assignment_cancelled';
            default:
                return 'assignment_accepted';
        }
    }
}
