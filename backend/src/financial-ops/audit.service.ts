import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
    UserTimelineQueryDto,
    SuspiciousActivityQueryDto,
    ComplianceSummaryQueryDto,
    AdminActionAuditQueryDto,
    UserFinancialTimeline,
    TimelineEvent,
    SuspiciousActivityReport,
    SuspiciousUser,
    ComplianceMetrics,
    AdminActionAuditReport,
    AdminActionRecord,
} from './dto/audit.dto';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get chronological financial timeline for a user
     * Merges payments, refunds, withdrawals, and ledger entries
     * READ-ONLY: No mutations
     */
    async getUserFinancialTimeline(
        userId: string,
        query: UserTimelineQueryDto,
    ): Promise<UserFinancialTimeline> {
        const startTime = Date.now();
        const limit = query.limit || 50;

        // Enforce max date range
        const { startDate, endDate } = this.getDateRange(query.startDate, query.endDate, 90);

        this.logger.log({
            event: 'financial_audit_report_generated',
            reportType: 'user_timeline',
            userId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        const dateFilter = {
            gte: startDate,
            lte: endDate,
        };

        // Fetch all financial events in parallel
        const [payments, refunds, withdrawals, ledgerEntries] = await Promise.all([
            // Payments
            this.prisma.payments.findMany({
                where: {
                    OR: [
                        { wallets_payments_payerWalletIdTowallets: { userId } },
                        { wallets_payments_payeeWalletIdTowallets: { userId } },
                    ],
                    createdAt: dateFilter,
                },
                select: {
                    id: true,
                    amount: true,
                    lifecycle: true,
                    paymentMethod: true,
                    confirmedBy: true,
                    confirmedAt: true,
                    createdAt: true,
                    orderId: true,
                },
                orderBy: { createdAt: 'asc' },
            }),

            // Refunds
            this.prisma.refunds.findMany({
                where: {
                    payments: {
                        OR: [
                            { wallets_payments_payerWalletIdTowallets: { userId } },
                            { wallets_payments_payeeWalletIdTowallets: { userId } },
                        ],
                    },
                    createdAt: dateFilter,
                },
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    reason: true,
                    approvedBy: true,
                    processedAt: true,
                    createdAt: true,
                    paymentId: true,
                },
                orderBy: { createdAt: 'asc' },
            }),

            // Withdrawals
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    createdAt: dateFilter,
                },
                select: {
                    id: true,
                    requestedAmount: true,
                    feeAmount: true,
                    netAmount: true,
                    status: true,
                    approvedBy: true,
                    rejectedBy: true,
                    rejectionReason: true,
                    requestedAt: true,
                    approvedAt: true,
                    rejectedAt: true,
                    completedAt: true,
                    failedAt: true,
                    failureReason: true,
                },
                orderBy: { requestedAt: 'asc' },
            }),

            // Ledger Entries
            this.prisma.ledger_entries.findMany({
                where: {
                    wallets: { userId },
                    createdAt: dateFilter,
                },
                select: {
                    id: true,
                    entryType: true,
                    amount: true,
                    transactionId: true,
                    description: true,
                    createdAt: true,
                    paymentId: true,
                    refundId: true,
                    orderId: true,
                },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        // Merge and sort all events chronologically
        const events: TimelineEvent[] = [];

        // Convert payments to timeline events
        for (const payment of payments) {
            events.push({
                id: payment.id,
                type: 'payment',
                status: payment.lifecycle,
                amount: payment.amount.toString(),
                timestamp: payment.createdAt.toISOString(),
                details: {
                    description: `Payment via ${payment.paymentMethod}`,
                    actorId: payment.confirmedBy || undefined,
                    actorType: payment.confirmedBy ? 'ADMIN' : 'SYSTEM',
                    metadata: {
                        orderId: payment.orderId,
                        confirmedAt: payment.confirmedAt?.toISOString(),
                    },
                },
            });
        }

        // Convert refunds to timeline events
        for (const refund of refunds) {
            events.push({
                id: refund.id,
                type: 'refund',
                status: refund.status,
                amount: refund.amount.toString(),
                timestamp: refund.createdAt.toISOString(),
                details: {
                    description: 'Refund processed',
                    actorId: refund.approvedBy || undefined,
                    actorType: refund.approvedBy ? 'ADMIN' : 'SYSTEM',
                    reason: refund.reason || undefined,
                    metadata: {
                        paymentId: refund.paymentId,
                        processedAt: refund.processedAt?.toISOString(),
                    },
                },
            });
        }

        // Convert withdrawals to timeline events
        for (const withdrawal of withdrawals) {
            const actor = withdrawal.approvedBy || withdrawal.rejectedBy;
            const actorType = actor ? 'ADMIN' : 'USER';

            events.push({
                id: withdrawal.id,
                type: 'withdrawal',
                status: withdrawal.status,
                amount: withdrawal.netAmount.toString(),
                timestamp: withdrawal.requestedAt.toISOString(),
                details: {
                    description: `Withdrawal ${withdrawal.status.toLowerCase()}`,
                    actorId: actor || undefined,
                    actorType,
                    reason: withdrawal.rejectionReason || withdrawal.failureReason || undefined,
                    metadata: {
                        requestedAmount: withdrawal.requestedAmount.toString(),
                        feeAmount: withdrawal.feeAmount.toString(),
                        approvedAt: withdrawal.approvedAt?.toISOString(),
                        rejectedAt: withdrawal.rejectedAt?.toISOString(),
                        completedAt: withdrawal.completedAt?.toISOString(),
                        failedAt: withdrawal.failedAt?.toISOString(),
                    },
                },
            });
        }

        // Convert ledger entries to timeline events
        for (const entry of ledgerEntries) {
            events.push({
                id: entry.id,
                type: 'ledger_entry',
                status: 'RECORDED',
                amount: entry.amount.toString(),
                timestamp: entry.createdAt.toISOString(),
                details: {
                    description: entry.description || entry.entryType,
                    actorType: 'SYSTEM',
                    metadata: {
                        entryType: entry.entryType,
                        transactionId: entry.transactionId,
                        paymentId: entry.paymentId,
                        refundId: entry.refundId,
                        orderId: entry.orderId,
                    },
                },
            });
        }

        // Sort by timestamp
        events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        // Apply pagination
        const paginatedEvents = events.slice(0, limit);
        const hasMore = events.length > limit;
        const nextCursor = hasMore ? paginatedEvents[paginatedEvents.length - 1].timestamp : null;

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'user_timeline_generated',
            userId,
            totalEvents: events.length,
            returnedEvents: paginatedEvents.length,
            durationMs,
        });

        return {
            userId,
            events: paginatedEvents,
            pagination: {
                nextCursor,
                hasMore,
                total: events.length,
            },
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Detect suspicious activity patterns
     * FLAGS only - no blocking or mutations
     * READ-ONLY: No mutations
     */
    async getSuspiciousActivity(
        query: SuspiciousActivityQueryDto,
    ): Promise<SuspiciousActivityReport> {
        const startTime = Date.now();
        const days = query.days || 7;
        const withdrawalCountThreshold = query.withdrawalCountThreshold || 5;
        const largeAmountThreshold = query.largeAmountThreshold || 100000;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        this.logger.log({
            event: 'financial_audit_report_generated',
            reportType: 'suspicious_activity',
            days,
            withdrawalCountThreshold,
            largeAmountThreshold,
        });

        // Get all withdrawals in the period
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                requestedAt: {
                    gte: startDate,
                },
            },
            select: {
                id: true,
                userId: true,
                requestedAmount: true,
                status: true,
                bankAccount: true,
                requestedAt: true,
            },
            orderBy: { requestedAt: 'desc' },
        });

        // Group by user
        const userMap = new Map<string, any>();

        for (const withdrawal of withdrawals) {
            if (!userMap.has(withdrawal.userId)) {
                userMap.set(withdrawal.userId, {
                    userId: withdrawal.userId,
                    withdrawals: [],
                    bankAccounts: new Set<string>(),
                    totalAmount: new Decimal(0),
                    failedCount: 0,
                    largeCount: 0,
                });
            }

            const userData = userMap.get(withdrawal.userId);
            userData.withdrawals.push(withdrawal);
            userData.bankAccounts.add(withdrawal.bankAccount);
            userData.totalAmount = userData.totalAmount.add(withdrawal.requestedAmount);

            if (withdrawal.status === 'FAILED') {
                userData.failedCount++;
            }

            if (withdrawal.requestedAmount.gte(largeAmountThreshold)) {
                userData.largeCount++;
            }
        }

        // Analyze and flag suspicious users
        const suspiciousUsers: SuspiciousUser[] = [];

        for (const [userId, data] of userMap) {
            const flags: string[] = [];

            // Flag: High withdrawal frequency
            if (data.withdrawals.length >= withdrawalCountThreshold) {
                flags.push(`HIGH_FREQUENCY: ${data.withdrawals.length} withdrawals in ${days} days`);
            }

            // Flag: Large withdrawals
            if (data.largeCount > 0) {
                flags.push(
                    `LARGE_AMOUNTS: ${data.largeCount} withdrawals above ${largeAmountThreshold}`,
                );
            }

            // Flag: Multiple failed withdrawals
            if (data.failedCount >= 3) {
                flags.push(`FAILED_ATTEMPTS: ${data.failedCount} failed withdrawals`);
            }

            // Flag: Multiple bank accounts
            if (data.bankAccounts.size >= 3) {
                flags.push(`MULTIPLE_ACCOUNTS: ${data.bankAccounts.size} different bank accounts`);
            }

            // Only include users with flags
            if (flags.length > 0) {
                const avgAmount = data.totalAmount.div(data.withdrawals.length);

                suspiciousUsers.push({
                    userId,
                    flags,
                    metrics: {
                        withdrawalCount: data.withdrawals.length,
                        largeWithdrawalCount: data.largeCount,
                        failedWithdrawalCount: data.failedCount,
                        uniqueBankAccounts: data.bankAccounts.size,
                        totalWithdrawalAmount: data.totalAmount.toString(),
                        avgWithdrawalAmount: avgAmount.toString(),
                    },
                    recentWithdrawals: data.withdrawals.slice(0, 5).map((w: any) => ({
                        id: w.id,
                        amount: w.requestedAmount.toString(),
                        status: w.status,
                        timestamp: w.requestedAt.toISOString(),
                    })),
                });
            }
        }

        // Sort by number of flags (most suspicious first)
        suspiciousUsers.sort((a, b) => b.flags.length - a.flags.length);

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'suspicious_activity_detected',
            totalUsersFlagged: suspiciousUsers.length,
            totalFlags: suspiciousUsers.reduce((sum, u) => sum + u.flags.length, 0),
            durationMs,
        });

        return {
            analyzedDays: days,
            thresholds: {
                withdrawalCount: withdrawalCountThreshold,
                largeAmount: largeAmountThreshold,
            },
            suspiciousUsers,
            summary: {
                totalUsersFlagged: suspiciousUsers.length,
                totalFlags: suspiciousUsers.reduce((sum, u) => sum + u.flags.length, 0),
            },
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate compliance summary with transaction volumes and ratios
     * READ-ONLY: No mutations
     */
    async getComplianceSummary(query: ComplianceSummaryQueryDto): Promise<ComplianceMetrics> {
        const startTime = Date.now();
        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);

        // Enforce max 90-day range
        const maxRange = 90 * 24 * 60 * 60 * 1000;
        if (endDate.getTime() - startDate.getTime() > maxRange) {
            throw new Error('Date range cannot exceed 90 days');
        }

        this.logger.log({
            event: 'financial_audit_report_generated',
            reportType: 'compliance_summary',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        const dateFilter = {
            gte: startDate,
            lte: endDate,
        };

        // Fetch all metrics in parallel
        const [paymentStats, refundStats, withdrawalStats] = await Promise.all([
            // Payment metrics
            this.prisma.payments.groupBy({
                by: ['lifecycle'],
                where: {
                    createdAt: dateFilter,
                },
                _count: { id: true },
                _sum: { amount: true, platformFeeAmount: true },
            }),

            // Refund metrics
            this.prisma.refunds.groupBy({
                by: ['status'],
                where: {
                    createdAt: dateFilter,
                },
                _count: { id: true },
                _sum: { amount: true },
            }),

            // Withdrawal metrics
            this.prisma.withdrawals.groupBy({
                by: ['status'],
                where: {
                    requestedAt: dateFilter,
                },
                _count: { id: true },
                _sum: { requestedAmount: true, feeAmount: true },
            }),
        ]);

        // Calculate payment metrics
        let totalPayments = 0;
        let totalPaymentAmount = new Decimal(0);
        let capturedPayments = 0;
        let capturedAmount = new Decimal(0);
        let platformFeeRevenue = new Decimal(0);

        for (const stat of paymentStats) {
            totalPayments += stat._count.id;
            totalPaymentAmount = totalPaymentAmount.add(stat._sum.amount || 0);

            if (stat.lifecycle === 'CAPTURED') {
                capturedPayments = stat._count.id;
                capturedAmount = capturedAmount.add(stat._sum.amount || 0);
            }

            if (stat._sum.platformFeeAmount) {
                platformFeeRevenue = platformFeeRevenue.add(stat._sum.platformFeeAmount);
            }
        }

        // Calculate refund metrics
        let totalRefunds = 0;
        let totalRefundAmount = new Decimal(0);
        let completedRefunds = 0;
        let completedRefundAmount = new Decimal(0);

        for (const stat of refundStats) {
            totalRefunds += stat._count.id;
            totalRefundAmount = totalRefundAmount.add(stat._sum.amount || 0);

            if (stat.status === 'COMPLETED') {
                completedRefunds = stat._count.id;
                completedRefundAmount = completedRefundAmount.add(stat._sum.amount || 0);
            }
        }

        // Calculate withdrawal metrics
        let totalWithdrawals = 0;
        let totalWithdrawalAmount = new Decimal(0);
        let completedWithdrawals = 0;
        let completedWithdrawalAmount = new Decimal(0);
        let withdrawalFeeRevenue = new Decimal(0);

        for (const stat of withdrawalStats) {
            totalWithdrawals += stat._count.id;
            totalWithdrawalAmount = totalWithdrawalAmount.add(stat._sum.requestedAmount || 0);

            if (stat.status === 'COMPLETED') {
                completedWithdrawals = stat._count.id;
                completedWithdrawalAmount = completedWithdrawalAmount.add(
                    stat._sum.requestedAmount || 0,
                );
            }

            if (stat._sum.feeAmount) {
                withdrawalFeeRevenue = withdrawalFeeRevenue.add(stat._sum.feeAmount);
            }
        }

        // Calculate success rates
        const paymentSuccessRate = totalPayments > 0 ? (capturedPayments / totalPayments) * 100 : 0;
        const refundSuccessRate = totalRefunds > 0 ? (completedRefunds / totalRefunds) * 100 : 0;
        const withdrawalSuccessRate =
            totalWithdrawals > 0 ? (completedWithdrawals / totalWithdrawals) * 100 : 0;

        const totalRevenue = platformFeeRevenue.add(withdrawalFeeRevenue);

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'compliance_summary_generated',
            totalPayments,
            totalRefunds,
            totalWithdrawals,
            totalRevenue: totalRevenue.toString(),
            durationMs,
        });

        return {
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            payments: {
                totalCount: totalPayments,
                totalAmount: totalPaymentAmount.toString(),
                capturedCount: capturedPayments,
                capturedAmount: capturedAmount.toString(),
                successRate: parseFloat(paymentSuccessRate.toFixed(2)),
            },
            refunds: {
                totalCount: totalRefunds,
                totalAmount: totalRefundAmount.toString(),
                completedCount: completedRefunds,
                completedAmount: completedRefundAmount.toString(),
                successRate: parseFloat(refundSuccessRate.toFixed(2)),
            },
            withdrawals: {
                totalCount: totalWithdrawals,
                totalAmount: totalWithdrawalAmount.toString(),
                completedCount: completedWithdrawals,
                completedAmount: completedWithdrawalAmount.toString(),
                successRate: parseFloat(withdrawalSuccessRate.toFixed(2)),
                totalFees: withdrawalFeeRevenue.toString(),
            },
            fees: {
                platformFeeRevenue: platformFeeRevenue.toString(),
                withdrawalFeeRevenue: withdrawalFeeRevenue.toString(),
                totalRevenue: totalRevenue.toString(),
            },
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Get admin action audit trail
     * Reconstructs admin actions from database records
     * READ-ONLY: No mutations
     */
    async getAdminActionAudit(query: AdminActionAuditQueryDto): Promise<AdminActionAuditReport> {
        const startTime = Date.now();
        const limit = query.limit || 100;

        const { startDate, endDate } = this.getDateRange(query.startDate, query.endDate, 90);

        this.logger.log({
            event: 'financial_audit_report_generated',
            reportType: 'admin_actions',
            actorId: query.actorId,
            actionType: query.actionType,
        });

        const dateFilter = {
            gte: startDate,
            lte: endDate,
        };

        // Fetch admin actions from withdrawals
        const whereClause: any = {
            OR: [
                { approvedBy: { not: null }, approvedAt: dateFilter },
                { rejectedBy: { not: null }, rejectedAt: dateFilter },
                { cancelledBy: { not: null }, cancelledAt: dateFilter },
            ],
        };

        if (query.actorId) {
            whereClause.OR = whereClause.OR.map((clause: any) => {
                const key = Object.keys(clause)[0];
                if (key.endsWith('By')) {
                    return { ...clause, [key]: query.actorId };
                }
                return clause;
            });
        }

        const withdrawals = await this.prisma.withdrawals.findMany({
            where: whereClause,
            select: {
                id: true,
                status: true,
                approvedBy: true,
                approvedAt: true,
                rejectedBy: true,
                rejectedAt: true,
                rejectionReason: true,
                cancelledBy: true,
                cancelledAt: true,
                cancellationReason: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });

        // Convert to action records
        const actions: AdminActionRecord[] = [];

        for (const withdrawal of withdrawals) {
            // Approval action
            if (withdrawal.approvedBy && withdrawal.approvedAt) {
                actions.push({
                    id: `${withdrawal.id}-approval`,
                    actorId: withdrawal.approvedBy,
                    actorType: 'ADMIN',
                    actionType: 'WITHDRAWAL_APPROVED',
                    resourceType: 'withdrawal',
                    resourceId: withdrawal.id,
                    status: 'APPROVED',
                    reason: null,
                    timestamp: withdrawal.approvedAt.toISOString(),
                    metadata: { withdrawalStatus: withdrawal.status },
                });
            }

            // Rejection action
            if (withdrawal.rejectedBy && withdrawal.rejectedAt) {
                actions.push({
                    id: `${withdrawal.id}-rejection`,
                    actorId: withdrawal.rejectedBy,
                    actorType: 'ADMIN',
                    actionType: 'WITHDRAWAL_REJECTED',
                    resourceType: 'withdrawal',
                    resourceId: withdrawal.id,
                    status: 'REJECTED',
                    reason: withdrawal.rejectionReason,
                    timestamp: withdrawal.rejectedAt.toISOString(),
                    metadata: { withdrawalStatus: withdrawal.status },
                });
            }

            // Cancellation action
            if (withdrawal.cancelledBy && withdrawal.cancelledAt) {
                actions.push({
                    id: `${withdrawal.id}-cancellation`,
                    actorId: withdrawal.cancelledBy,
                    actorType: 'ADMIN',
                    actionType: 'WITHDRAWAL_CANCELLED',
                    resourceType: 'withdrawal',
                    resourceId: withdrawal.id,
                    status: 'CANCELLED',
                    reason: withdrawal.cancellationReason,
                    timestamp: withdrawal.cancelledAt.toISOString(),
                    metadata: { withdrawalStatus: withdrawal.status },
                });
            }
        }

        // Sort by timestamp descending
        actions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // Filter by action type if specified
        const filteredActions = query.actionType
            ? actions.filter((a) => a.actionType === query.actionType)
            : actions;

        // Calculate summary
        const actionsByType: Record<string, number> = {};
        const actionsByActor: Record<string, number> = {};

        for (const action of filteredActions) {
            actionsByType[action.actionType] = (actionsByType[action.actionType] || 0) + 1;
            actionsByActor[action.actorId] = (actionsByActor[action.actorId] || 0) + 1;
        }

        const durationMs = Date.now() - startTime;
        this.logger.log({
            event: 'admin_action_audit_generated',
            totalActions: filteredActions.length,
            uniqueActors: Object.keys(actionsByActor).length,
            durationMs,
        });

        return {
            actions: filteredActions,
            summary: {
                totalActions: filteredActions.length,
                actionsByType,
                actionsByActor,
            },
            generatedAt: new Date().toISOString(),
        };
    }

    // Private helper methods

    private getDateRange(
        startDate?: string,
        endDate?: string,
        maxDays: number = 90,
    ): { startDate: Date; endDate: Date } {
        const end = endDate ? new Date(endDate) : new Date();
        let start: Date;

        if (startDate) {
            start = new Date(startDate);
        } else {
            // Default to 30 days ago
            start = new Date(end);
            start.setDate(start.getDate() - 30);
        }

        // Enforce max range
        const maxRange = maxDays * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > maxRange) {
            start = new Date(end.getTime() - maxRange);
        }

        return { startDate: start, endDate: end };
    }
}
