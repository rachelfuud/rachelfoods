import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
    InsightsTimeWindow,
    InsightsSummary,
    PolicyViolationSummary,
    RoleViolationSummary,
    ViolationMetrics,
} from './dto/policy-insights.dto';

@Injectable()
export class WithdrawalPolicyInsightsService {
    private readonly logger = new Logger(WithdrawalPolicyInsightsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get comprehensive policy insights summary
     * READ-ONLY: Analyzes historical withdrawal patterns
     */
    async getInsightsSummary(timeWindow: InsightsTimeWindow): Promise<InsightsSummary> {
        const startTime = Date.now();
        const { startDate, endDate } = this.getTimeWindowDates(timeWindow);

        this.logger.log({
            event: 'policy_insights_requested',
            reportType: 'summary',
            timeWindow,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        // Fetch all withdrawal attempts in time window
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                requestedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
                rejectionReason: true,
            },
        });

        const totalAttempts = withdrawals.length;

        // Identify blocked withdrawals (assuming REJECTED with policy-related reasons)
        // In production, this would parse structured logs or use a dedicated violations table
        const blockedWithdrawals = withdrawals.filter(
            (w) =>
                w.status === 'REJECTED' &&
                w.rejectionReason?.includes('LIMIT') ||
                w.rejectionReason?.includes('EXCEEDED') ||
                w.rejectionReason?.includes('policy'),
        );

        const totalBlocked = blockedWithdrawals.length;
        const blockRate = totalAttempts > 0 ? (totalBlocked / totalAttempts) * 100 : 0;

        // Analyze violation patterns
        const violationTypeMap = new Map<string, number>();
        const userViolationMap = new Map<string, { count: number; lastAttempt: Date }>();
        const policyTriggerMap = new Map<string, { scope: string; count: number }>();

        for (const withdrawal of blockedWithdrawals) {
            // Extract violation type from rejection reason (simplified parsing)
            const violationType = this.extractViolationType(withdrawal.rejectionReason || '');
            violationTypeMap.set(violationType, (violationTypeMap.get(violationType) || 0) + 1);

            // Track user violations
            const userData = userViolationMap.get(withdrawal.userId);
            if (!userData || withdrawal.requestedAt > userData.lastAttempt) {
                userViolationMap.set(withdrawal.userId, {
                    count: (userData?.count || 0) + 1,
                    lastAttempt: withdrawal.requestedAt,
                });
            }

            // Track policy triggers (simplified - in production would use structured logs)
            const policyId = 'global-policy'; // Placeholder
            policyTriggerMap.set(policyId, {
                scope: 'GLOBAL',
                count: (policyTriggerMap.get(policyId)?.count || 0) + 1,
            });
        }

        // Build top violation types
        const topViolationTypes: ViolationMetrics[] = Array.from(violationTypeMap.entries())
            .map(([type, count]) => ({
                violationType: type,
                count,
                percentage: totalBlocked > 0 ? (count / totalBlocked) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Build top blocked users
        const topBlockedUsers = Array.from(userViolationMap.entries())
            .map(([userId, data]) => ({
                userId,
                violationCount: data.count,
                lastAttempt: data.lastAttempt.toISOString(),
            }))
            .sort((a, b) => b.violationCount - a.violationCount)
            .slice(0, 10);

        // Build policies triggered
        const policiesTriggered = Array.from(policyTriggerMap.entries()).map(
            ([policyId, data]) => ({
                policyId,
                scope: data.scope,
                triggerCount: data.count,
            }),
        );

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'policy_insights_generated',
            totalAttempts,
            totalBlocked,
            blockRate: blockRate.toFixed(2),
            durationMs,
        });

        return {
            timeWindow,
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            totalAttempts,
            totalBlocked,
            blockRate: parseFloat(blockRate.toFixed(2)),
            topViolationTypes,
            topBlockedUsers,
            policiesTriggered,
        };
    }

    /**
     * Get violation insights grouped by policy
     * READ-ONLY: Analyzes which policies are blocking most
     */
    async getInsightsByPolicy(timeWindow: InsightsTimeWindow): Promise<PolicyViolationSummary[]> {
        const startTime = Date.now();
        const { startDate, endDate } = this.getTimeWindowDates(timeWindow);

        this.logger.log({
            event: 'policy_insights_requested',
            reportType: 'by_policy',
            timeWindow,
        });

        // Fetch active policies
        const policies = await this.prisma.withdrawal_policies.findMany({
            where: { enabled: true },
            select: {
                id: true,
                scopeType: true,
                role: true,
                currency: true,
            },
        });

        const summaries: PolicyViolationSummary[] = [];

        // For each policy, analyze violations (simplified)
        for (const policy of policies) {
            // In production, this would query structured violation logs
            // For now, we use rejection patterns
            const violations = await this.prisma.withdrawals.count({
                where: {
                    requestedAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: 'REJECTED',
                    rejectionReason: {
                        contains: 'limit',
                    },
                },
            });

            const affectedUsers = await this.prisma.withdrawals.findMany({
                where: {
                    requestedAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: 'REJECTED',
                    rejectionReason: {
                        contains: 'limit',
                    },
                },
                select: {
                    userId: true,
                },
                distinct: ['userId'],
            });

            if (violations > 0) {
                summaries.push({
                    policyId: policy.id,
                    policyScope: policy.scopeType,
                    role: policy.role,
                    currency: policy.currency,
                    totalViolations: violations,
                    violationBreakdown: [
                        { violationType: 'DAILY_AMOUNT_EXCEEDED', count: 0, percentage: 0 },
                        { violationType: 'DAILY_COUNT_EXCEEDED', count: 0, percentage: 0 },
                    ],
                    affectedUserCount: affectedUsers.length,
                });
            }
        }

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'policy_insights_by_policy_generated',
            policiesAnalyzed: policies.length,
            policiesWithViolations: summaries.length,
            durationMs,
        });

        return summaries;
    }

    /**
     * Get violation insights grouped by role
     * READ-ONLY: Analyzes which roles are blocked most
     */
    async getInsightsByRole(timeWindow: InsightsTimeWindow): Promise<RoleViolationSummary[]> {
        const startTime = Date.now();
        const { startDate, endDate } = this.getTimeWindowDates(timeWindow);

        this.logger.log({
            event: 'policy_insights_requested',
            reportType: 'by_role',
            timeWindow,
        });

        // Get withdrawals with user roles (would need to join with users table)
        // Simplified version without role data
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                requestedAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'REJECTED',
                rejectionReason: {
                    contains: 'limit',
                },
            },
            select: {
                userId: true,
                rejectionReason: true,
            },
        });

        // Group by role (simplified - assumes role in user data)
        const roleMap = new Map<string, any[]>();
        roleMap.set('UNKNOWN', withdrawals);

        const summaries: RoleViolationSummary[] = Array.from(roleMap.entries()).map(
            ([role, violations]) => ({
                role,
                totalViolations: violations.length,
                violationTypes: [
                    {
                        violationType: 'LIMIT_EXCEEDED',
                        count: violations.length,
                        percentage: 100,
                    },
                ],
                topCurrencies: [{ currency: 'INR', count: violations.length }],
            }),
        );

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'policy_insights_by_role_generated',
            rolesAnalyzed: summaries.length,
            durationMs,
        });

        return summaries;
    }

    // Private helper methods

    private getTimeWindowDates(timeWindow: InsightsTimeWindow): {
        startDate: Date;
        endDate: Date;
    } {
        const endDate = new Date();
        const startDate = new Date();

        switch (timeWindow) {
            case InsightsTimeWindow.LAST_24H:
                startDate.setHours(startDate.getHours() - 24);
                break;
            case InsightsTimeWindow.LAST_7D:
                startDate.setDate(startDate.getDate() - 7);
                break;
            case InsightsTimeWindow.LAST_30D:
                startDate.setDate(startDate.getDate() - 30);
                break;
        }

        return { startDate, endDate };
    }

    private extractViolationType(rejectionReason: string): string {
        if (rejectionReason.includes('DAILY_AMOUNT')) return 'DAILY_AMOUNT_EXCEEDED';
        if (rejectionReason.includes('DAILY_COUNT')) return 'DAILY_COUNT_EXCEEDED';
        if (rejectionReason.includes('WEEKLY_AMOUNT')) return 'WEEKLY_AMOUNT_EXCEEDED';
        if (rejectionReason.includes('WEEKLY_COUNT')) return 'WEEKLY_COUNT_EXCEEDED';
        if (rejectionReason.includes('MONTHLY_AMOUNT')) return 'MONTHLY_AMOUNT_EXCEEDED';
        if (rejectionReason.includes('MONTHLY_COUNT')) return 'MONTHLY_COUNT_EXCEEDED';
        if (rejectionReason.includes('MAX_SINGLE')) return 'MAX_SINGLE_WITHDRAWAL';
        if (rejectionReason.includes('MIN_SINGLE')) return 'MIN_SINGLE_WITHDRAWAL';
        return 'UNKNOWN_VIOLATION';
    }
}
