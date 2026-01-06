import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface WithdrawalMetrics {
    countsByStatus: {
        REQUESTED: number;
        APPROVED: number;
        REJECTED: number;
        CANCELLED: number;
        PROCESSING: number;
        COMPLETED: number;
        FAILED: number;
    };
    successRate: number;
    failureRate: number;
    averageProcessingTimeMs: number | null;
    totalRequestedAmount: string;
    totalNetAmount: string;
    totalFeeAmountCollected: string;
    topFailureReasons: Array<{ reason: string; count: number }>;
}

export interface MetricsQuery {
    startDate?: Date;
    endDate?: Date;
}

@Injectable()
export class WithdrawalMetricsService {
    constructor(private readonly prisma: PrismaService) { }

    async getMetrics(query?: MetricsQuery): Promise<WithdrawalMetrics> {
        const whereClause = this.buildWhereClause(query);

        // Parallel execution for performance
        const [
            countsByStatus,
            processingTimes,
            totalAmounts,
            failureReasons,
        ] = await Promise.all([
            this.getCountsByStatus(whereClause),
            this.getAverageProcessingTime(whereClause),
            this.getTotalAmounts(whereClause),
            this.getTopFailureReasons(whereClause),
        ]);

        const totalProcessed = countsByStatus.COMPLETED + countsByStatus.FAILED;
        const successRate = totalProcessed > 0
            ? (countsByStatus.COMPLETED / totalProcessed) * 100
            : 0;
        const failureRate = totalProcessed > 0
            ? (countsByStatus.FAILED / totalProcessed) * 100
            : 0;

        return {
            countsByStatus,
            successRate: Math.round(successRate * 100) / 100,
            failureRate: Math.round(failureRate * 100) / 100,
            averageProcessingTimeMs: processingTimes,
            totalRequestedAmount: totalAmounts.totalRequestedAmount.toString(),
            totalNetAmount: totalAmounts.totalNetAmount.toString(),
            totalFeeAmountCollected: totalAmounts.totalFeeAmountCollected.toString(),
            topFailureReasons: failureReasons,
        };
    }

    private buildWhereClause(query?: MetricsQuery): any {
        if (!query?.startDate && !query?.endDate) {
            return {};
        }

        const where: any = {};

        if (query.startDate || query.endDate) {
            where.requestedAt = {};
            if (query.startDate) {
                where.requestedAt.gte = query.startDate;
            }
            if (query.endDate) {
                where.requestedAt.lte = query.endDate;
            }
        }

        return where;
    }

    private async getCountsByStatus(whereClause: any): Promise<WithdrawalMetrics['countsByStatus']> {
        const statuses = [
            WithdrawalStatus.REQUESTED,
            WithdrawalStatus.APPROVED,
            WithdrawalStatus.REJECTED,
            WithdrawalStatus.CANCELLED,
            WithdrawalStatus.PROCESSING,
            WithdrawalStatus.COMPLETED,
            WithdrawalStatus.FAILED,
        ];

        const counts = await Promise.all(
            statuses.map((status) =>
                this.prisma.withdrawals.count({
                    where: { ...whereClause, status },
                })
            )
        );

        return {
            REQUESTED: counts[0],
            APPROVED: counts[1],
            REJECTED: counts[2],
            CANCELLED: counts[3],
            PROCESSING: counts[4],
            COMPLETED: counts[5],
            FAILED: counts[6],
        };
    }

    private async getAverageProcessingTime(whereClause: any): Promise<number | null> {
        const completedWithdrawals = await this.prisma.withdrawals.findMany({
            where: {
                ...whereClause,
                status: WithdrawalStatus.COMPLETED,
                processingStartedAt: { not: null },
                completedAt: { not: null },
            },
            select: {
                processingStartedAt: true,
                completedAt: true,
            },
        });

        if (completedWithdrawals.length === 0) {
            return null;
        }

        const totalProcessingTime = completedWithdrawals.reduce((sum, withdrawal) => {
            const startTime = withdrawal.processingStartedAt!.getTime();
            const endTime = withdrawal.completedAt!.getTime();
            return sum + (endTime - startTime);
        }, 0);

        return Math.round(totalProcessingTime / completedWithdrawals.length);
    }

    private async getTotalAmounts(whereClause: any): Promise<{
        totalRequestedAmount: Decimal;
        totalNetAmount: Decimal;
        totalFeeAmountCollected: Decimal;
    }> {
        const aggregation = await this.prisma.withdrawals.aggregate({
            where: whereClause,
            _sum: {
                requestedAmount: true,
                netAmount: true,
                feeAmount: true,
            },
        });

        return {
            totalRequestedAmount: aggregation._sum.requestedAmount || new Decimal(0),
            totalNetAmount: aggregation._sum.netAmount || new Decimal(0),
            totalFeeAmountCollected: aggregation._sum.feeAmount || new Decimal(0),
        };
    }

    private async getTopFailureReasons(whereClause: any): Promise<Array<{ reason: string; count: number }>> {
        const failedWithdrawals = await this.prisma.withdrawals.findMany({
            where: {
                ...whereClause,
                status: WithdrawalStatus.FAILED,
                failureReason: { not: null },
            },
            select: {
                failureReason: true,
            },
        });

        // Aggregate failure reasons
        const reasonCounts = new Map<string, number>();
        failedWithdrawals.forEach((withdrawal) => {
            const reason = withdrawal.failureReason || 'Unknown';
            reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });

        // Sort by count descending and take top 10
        return Array.from(reasonCounts.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
}
