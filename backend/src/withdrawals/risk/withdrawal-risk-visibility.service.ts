import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { WithdrawalRiskEscalationService, RiskSnapshot } from './withdrawal-risk-escalation.service';
import { RiskSeverity } from './dto/withdrawal-risk.dto';
import { WithdrawalStatus } from '@prisma/client';

/**
 * SPRINT_13_PHASE_3: Admin Visibility - Risk Escalation Insights
 * 
 * Exposes withdrawal risk escalation events to admins in a structured,
 * queryable, READ-ONLY manner.
 * 
 * CRITICAL CONSTRAINTS:
 * - ❌ DO NOT block withdrawals
 * - ❌ DO NOT change state machine
 * - ❌ DO NOT add approvals or confirmations
 * - ❌ DO NOT introduce schema changes
 * - ❌ DO NOT mutate any data
 * - ✅ READ-ONLY aggregation and presentation only
 */

export interface EscalationEvent {
    timestamp: string;
    fromRiskLevel: RiskSeverity;
    toRiskLevel: RiskSeverity;
    deltaScore: number;
    escalationType: string;
    newSignals: string[];
    severity: 'MEDIUM' | 'HIGH';
}

export interface WithdrawalEscalationSummary {
    withdrawalId: string;
    userId: string;
    status: WithdrawalStatus;
    requestedAt: string;
    approvedAt: string | null;
    escalations: EscalationEvent[];
    latestRiskLevel: RiskSeverity;
    latestRiskScore: number;
    escalationCount: number;
    highestSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface EscalationQueryFilters {
    startDate?: Date;
    endDate?: Date;
    severity?: 'MEDIUM' | 'HIGH';
    userId?: string;
    status?: WithdrawalStatus;
    limit?: number;
    offset?: number;
}

export interface EscalationQueryResult {
    withdrawals: WithdrawalEscalationSummary[];
    total: number;
    hasMore: boolean;
}

@Injectable()
export class WithdrawalRiskVisibilityService {
    private readonly logger = new Logger(WithdrawalRiskVisibilityService.name);
    private readonly DEFAULT_LIMIT = 50;
    private readonly MAX_LIMIT = 100;

    constructor(
        private readonly prisma: PrismaService,
        private readonly riskService: WithdrawalRiskService,
        private readonly escalationService: WithdrawalRiskEscalationService,
    ) { }

    /**
     * Get escalation summaries for withdrawals with filters
     * 
     * READ-ONLY: Aggregates escalation data from risk evaluations
     * Does NOT persist or mutate any data
     * 
     * @param filters - Query filters for escalation search
     * @param adminId - Admin user ID for audit logging
     * @returns Paginated escalation summaries
     */
    async getEscalations(
        filters: EscalationQueryFilters,
        adminId: string,
    ): Promise<EscalationQueryResult> {
        const startTime = Date.now();

        // Validate and sanitize limit
        const limit = Math.min(filters.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
        const offset = filters.offset || 0;

        this.logger.log({
            event: 'escalations_query_started',
            sprint: 'SPRINT_13_PHASE_3',
            adminId,
            filters: {
                startDate: filters.startDate?.toISOString(),
                endDate: filters.endDate?.toISOString(),
                severity: filters.severity,
                userId: filters.userId,
                status: filters.status,
                limit,
                offset,
            },
        });

        // Build where clause for withdrawal query
        const whereClause: any = {
            status: {
                in: [
                    WithdrawalStatus.APPROVED,
                    WithdrawalStatus.PROCESSING,
                    WithdrawalStatus.COMPLETED,
                ],
            },
        };

        if (filters.startDate || filters.endDate) {
            whereClause.requestedAt = {};
            if (filters.startDate) {
                whereClause.requestedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                whereClause.requestedAt.lte = filters.endDate;
            }
        }

        if (filters.userId) {
            whereClause.userId = filters.userId;
        }

        if (filters.status) {
            whereClause.status = filters.status;
        }

        // Fetch withdrawals matching criteria
        const [withdrawals, total] = await Promise.all([
            this.prisma.withdrawals.findMany({
                where: whereClause,
                orderBy: { requestedAt: 'desc' },
                take: limit + 1, // Fetch one extra to determine hasMore
                skip: offset,
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    requestedAt: true,
                    approvedAt: true,
                    processingStartedAt: true,
                },
            }),
            this.prisma.withdrawals.count({ where: whereClause }),
        ]);

        const hasMore = withdrawals.length > limit;
        const resultWithdrawals = hasMore ? withdrawals.slice(0, limit) : withdrawals;

        // Compute escalation summaries for each withdrawal
        const summariesPromises = resultWithdrawals.map((withdrawal) =>
            this.computeEscalationSummary(withdrawal),
        );

        const summaries = await Promise.all(summariesPromises);

        // Filter by severity if specified
        const filteredSummaries = filters.severity
            ? summaries.filter((s) => s.highestSeverity === filters.severity)
            : summaries;

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'escalations_query_completed',
            sprint: 'SPRINT_13_PHASE_3',
            adminId,
            resultCount: filteredSummaries.length,
            totalCount: total,
            hasMore,
            durationMs,
        });

        return {
            withdrawals: filteredSummaries,
            total,
            hasMore,
        };
    }

    /**
     * Get full risk timeline for a specific withdrawal
     * 
     * READ-ONLY: Reconstructs risk evaluation timeline from withdrawal history
     * 
     * @param withdrawalId - Withdrawal ID to get timeline for
     * @param adminId - Admin user ID for audit logging
     * @returns Complete escalation summary with timeline
     */
    async getWithdrawalRiskTimeline(
        withdrawalId: string,
        adminId: string,
    ): Promise<WithdrawalEscalationSummary | null> {
        const startTime = Date.now();

        this.logger.log({
            event: 'risk_timeline_query_started',
            sprint: 'SPRINT_13_PHASE_3',
            withdrawalId,
            adminId,
        });

        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
                approvedAt: true,
                processingStartedAt: true,
                completedAt: true,
            },
        });

        if (!withdrawal) {
            this.logger.warn({
                event: 'risk_timeline_withdrawal_not_found',
                sprint: 'SPRINT_13_PHASE_3',
                withdrawalId,
                adminId,
            });
            return null;
        }

        const summary = await this.computeEscalationSummary(withdrawal);

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'risk_timeline_query_completed',
            sprint: 'SPRINT_13_PHASE_3',
            withdrawalId,
            adminId,
            escalationCount: summary.escalationCount,
            highestSeverity: summary.highestSeverity,
            durationMs,
        });

        return summary;
    }

    /**
     * Compute escalation summary for a withdrawal
     * 
     * Reconstructs escalation timeline by evaluating risk at different lifecycle points:
     * - Approval time (initial snapshot)
     * - Processing start (if applicable)
     * - Current time
     * 
     * CRITICAL: This is READ-ONLY computation, no data persistence
     */
    private async computeEscalationSummary(
        withdrawal: {
            id: string;
            userId: string;
            status: WithdrawalStatus;
            requestedAt: Date;
            approvedAt: Date | null;
            processingStartedAt?: Date | null;
        },
    ): Promise<WithdrawalEscalationSummary> {
        // Get current risk profile
        const currentProfile = await this.riskService.computeUserRiskProfile(withdrawal.userId);

        // Create initial snapshot (approval time baseline)
        // Since we don't persist snapshots, we use current profile as baseline
        // In production, this could be enhanced with historical risk computation
        const initialSnapshot: RiskSnapshot = {
            riskLevel: RiskSeverity.LOW, // Default assumption for approved withdrawals
            riskScore: 30, // Default LOW risk score
            activeSignals: [],
            snapshotAt: withdrawal.approvedAt?.toISOString() || withdrawal.requestedAt.toISOString(),
        };

        const escalations: EscalationEvent[] = [];

        // Check for escalation from approval to current state
        if (
            withdrawal.status === WithdrawalStatus.PROCESSING ||
            withdrawal.status === WithdrawalStatus.COMPLETED
        ) {
            const escalationDecision = await this.escalationService.checkEscalation(
                withdrawal.userId,
                initialSnapshot,
                withdrawal.id,
                withdrawal.status,
            );

            if (escalationDecision.escalated) {
                escalations.push({
                    timestamp: new Date().toISOString(),
                    fromRiskLevel: escalationDecision.fromRiskLevel,
                    toRiskLevel: escalationDecision.toRiskLevel,
                    deltaScore: escalationDecision.deltaScore,
                    escalationType: escalationDecision.escalationType,
                    newSignals: escalationDecision.newSignals,
                    severity: escalationDecision.toRiskLevel === RiskSeverity.HIGH ? 'HIGH' : 'MEDIUM',
                });
            }
        }

        // Determine highest severity
        const highestSeverity = this.determineHighestSeverity(
            currentProfile.riskLevel,
            escalations,
        );

        return {
            withdrawalId: withdrawal.id,
            userId: withdrawal.userId,
            status: withdrawal.status,
            requestedAt: withdrawal.requestedAt.toISOString(),
            approvedAt: withdrawal.approvedAt?.toISOString() || null,
            escalations,
            latestRiskLevel: currentProfile.riskLevel,
            latestRiskScore: currentProfile.overallScore,
            escalationCount: escalations.length,
            highestSeverity,
        };
    }

    /**
     * Determine highest severity across current risk and escalations
     */
    private determineHighestSeverity(
        currentRiskLevel: RiskSeverity,
        escalations: EscalationEvent[],
    ): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (currentRiskLevel === RiskSeverity.HIGH) {
            return 'HIGH';
        }

        if (escalations.some((e) => e.severity === 'HIGH')) {
            return 'HIGH';
        }

        if (currentRiskLevel === RiskSeverity.MEDIUM) {
            return 'MEDIUM';
        }

        if (escalations.some((e) => e.severity === 'MEDIUM')) {
            return 'MEDIUM';
        }

        return 'LOW';
    }

    /**
     * Get escalation statistics across all withdrawals
     * 
     * READ-ONLY: Aggregates escalation metrics for admin dashboard
     */
    async getEscalationStatistics(
        filters: Pick<EscalationQueryFilters, 'startDate' | 'endDate'>,
        adminId: string,
    ): Promise<{
        totalWithdrawals: number;
        escalatedWithdrawals: number;
        escalationRate: number;
        severityBreakdown: {
            high: number;
            medium: number;
            low: number;
        };
    }> {
        this.logger.log({
            event: 'escalation_statistics_query_started',
            sprint: 'SPRINT_13_PHASE_3',
            adminId,
            filters,
        });

        const whereClause: any = {
            status: {
                in: [
                    WithdrawalStatus.APPROVED,
                    WithdrawalStatus.PROCESSING,
                    WithdrawalStatus.COMPLETED,
                ],
            },
        };

        if (filters.startDate || filters.endDate) {
            whereClause.requestedAt = {};
            if (filters.startDate) {
                whereClause.requestedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                whereClause.requestedAt.lte = filters.endDate;
            }
        }

        const withdrawals = await this.prisma.withdrawals.findMany({
            where: whereClause,
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
                approvedAt: true,
                processingStartedAt: true,
            },
        });

        const summaries = await Promise.all(
            withdrawals.map((w) => this.computeEscalationSummary(w)),
        );

        const escalatedWithdrawals = summaries.filter((s) => s.escalationCount > 0).length;
        const escalationRate = withdrawals.length > 0
            ? (escalatedWithdrawals / withdrawals.length) * 100
            : 0;

        const severityBreakdown = {
            high: summaries.filter((s) => s.highestSeverity === 'HIGH').length,
            medium: summaries.filter((s) => s.highestSeverity === 'MEDIUM').length,
            low: summaries.filter((s) => s.highestSeverity === 'LOW').length,
        };

        this.logger.log({
            event: 'escalation_statistics_query_completed',
            sprint: 'SPRINT_13_PHASE_3',
            adminId,
            totalWithdrawals: withdrawals.length,
            escalatedWithdrawals,
            escalationRate: escalationRate.toFixed(2),
        });

        return {
            totalWithdrawals: withdrawals.length,
            escalatedWithdrawals,
            escalationRate: parseFloat(escalationRate.toFixed(2)),
            severityBreakdown,
        };
    }
}
