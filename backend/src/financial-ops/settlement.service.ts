import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
    SettlementQueryDto,
    PayoutExportQueryDto,
    FeeRevenueQueryDto,
    DailySettlementReport,
    DailySettlementEntry,
    PayoutExportReport,
    PayoutExportEntry,
    FeeRevenueReport,
    FeeRevenueEntry,
} from './dto/settlement.dto';

@Injectable()
export class SettlementService {
    private readonly logger = new Logger(SettlementService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate daily settlement report
     * Aggregates payments, refunds, withdrawals, and fees by day
     * READ-ONLY: No mutations, only aggregation queries
     */
    async getDailySettlement(query: SettlementQueryDto): Promise<DailySettlementReport> {
        const { startDate, endDate } = this.getDateRange(query.startDate, query.endDate);

        this.logger.log({
            event: 'daily_settlement_report_requested',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        // Get all payments captured in date range
        const payments = await this.prisma.payments.findMany({
            where: {
                lifecycle: 'CAPTURED',
                capturedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                amount: true,
                platformFeeAmount: true,
                capturedAt: true,
            },
        });

        // Get all refunds in date range
        const refunds = await this.prisma.refunds.findMany({
            where: {
                status: 'COMPLETED',
                processedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                amount: true,
                processedAt: true,
            },
        });

        // Get all withdrawals processed in date range
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                requestedAmount: true,
                feeAmount: true,
                netAmount: true,
                completedAt: true,
            },
        });

        // Group by day
        const settlementsByDay = new Map<string, DailySettlementEntry>();

        // Process payments
        for (const payment of payments) {
            const date = this.getDateKey(payment.capturedAt!);
            const entry = this.getOrCreateDailyEntry(settlementsByDay, date);

            entry.totalPaymentsCaptured = new Decimal(entry.totalPaymentsCaptured)
                .add(payment.amount)
                .toString();
            entry.totalPaymentsCapturedCount += 1;

            if (payment.platformFeeAmount) {
                entry.platformFeeRevenue = new Decimal(entry.platformFeeRevenue)
                    .add(payment.platformFeeAmount)
                    .toString();
            }
        }

        // Process refunds
        for (const refund of refunds) {
            const date = this.getDateKey(refund.processedAt!);
            const entry = this.getOrCreateDailyEntry(settlementsByDay, date);

            entry.totalRefundsIssued = new Decimal(entry.totalRefundsIssued)
                .add(refund.amount)
                .toString();
            entry.totalRefundsIssuedCount += 1;
        }

        // Process withdrawals
        for (const withdrawal of withdrawals) {
            const date = this.getDateKey(withdrawal.completedAt!);
            const entry = this.getOrCreateDailyEntry(settlementsByDay, date);

            entry.totalWithdrawalsProcessed = new Decimal(entry.totalWithdrawalsProcessed)
                .add(withdrawal.netAmount)
                .toString();
            entry.totalWithdrawalsProcessedCount += 1;

            entry.withdrawalFeeRevenue = new Decimal(entry.withdrawalFeeRevenue)
                .add(withdrawal.feeAmount)
                .toString();
        }

        // Calculate net settlement for each day
        const settlements: DailySettlementEntry[] = [];
        for (const [date, entry] of settlementsByDay) {
            const netSettlement = new Decimal(entry.totalPaymentsCaptured)
                .sub(entry.totalRefundsIssued)
                .sub(entry.totalWithdrawalsProcessed);

            entry.netSettlement = netSettlement.toString();
            settlements.push(entry);
        }

        // Sort by date
        settlements.sort((a, b) => a.date.localeCompare(b.date));

        // Calculate summary
        const summary = {
            totalDays: settlements.length,
            totalPaymentsCaptured: settlements
                .reduce((sum, s) => sum.add(s.totalPaymentsCaptured), new Decimal(0))
                .toString(),
            totalRefundsIssued: settlements
                .reduce((sum, s) => sum.add(s.totalRefundsIssued), new Decimal(0))
                .toString(),
            totalWithdrawalsProcessed: settlements
                .reduce((sum, s) => sum.add(s.totalWithdrawalsProcessed), new Decimal(0))
                .toString(),
            totalPlatformFeeRevenue: settlements
                .reduce((sum, s) => sum.add(s.platformFeeRevenue), new Decimal(0))
                .toString(),
            totalWithdrawalFeeRevenue: settlements
                .reduce((sum, s) => sum.add(s.withdrawalFeeRevenue), new Decimal(0))
                .toString(),
            totalRevenue: '0',
        };

        summary.totalRevenue = new Decimal(summary.totalPlatformFeeRevenue)
            .add(summary.totalWithdrawalFeeRevenue)
            .toString();

        this.logger.log({
            event: 'daily_settlement_report_generated',
            totalDays: summary.totalDays,
            totalRevenue: summary.totalRevenue,
        });

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            settlements,
            summary,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate payout export report
     * Lists all withdrawals with complete details for reconciliation
     * READ-ONLY: No mutations, only queries
     */
    async getPayoutExport(query: PayoutExportQueryDto): Promise<PayoutExportReport> {
        const where: any = {};

        // Date range filter
        if (query.startDate || query.endDate) {
            where.completedAt = {};
            if (query.startDate) {
                where.completedAt.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.completedAt.lte = new Date(query.endDate);
            }
        }

        // Status filter
        if (query.status) {
            where.status = query.status;
        } else {
            // Default to completed withdrawals
            where.status = 'COMPLETED';
        }

        this.logger.log({
            event: 'payout_export_requested',
            status: query.status || 'COMPLETED',
            startDate: query.startDate,
            endDate: query.endDate,
            limit: query.limit,
        });

        const withdrawals = await this.prisma.withdrawals.findMany({
            where,
            select: {
                id: true,
                walletId: true,
                userId: true,
                requestedAmount: true,
                feeAmount: true,
                netAmount: true,
                status: true,
                payoutProvider: true,
                payoutTransactionId: true,
                requestedAt: true,
                completedAt: true,
                wallets: {
                    select: {
                        walletCode: true,
                    },
                },
            },
            orderBy: { completedAt: 'desc' },
            take: query.limit,
        });

        const payouts: PayoutExportEntry[] = withdrawals.map((w) => ({
            withdrawalId: w.id,
            walletId: w.walletId,
            walletCode: w.wallets.walletCode,
            userId: w.userId,
            requestedAmount: w.requestedAmount.toString(),
            feeAmount: w.feeAmount.toString(),
            netAmount: w.netAmount.toString(),
            status: w.status,
            providerName: w.payoutProvider || '',
            providerWithdrawalId: w.payoutTransactionId,
            requestedAt: w.requestedAt.toISOString(),
            processedAt: null,
            completedAt: w.completedAt?.toISOString() || null,
            transactionId: `withdrawal-${w.id}`,
        }));

        // Calculate summary
        const summary = {
            totalPayouts: payouts.length,
            totalRequestedAmount: payouts
                .reduce((sum, p) => sum.add(p.requestedAmount), new Decimal(0))
                .toString(),
            totalFeeAmount: payouts
                .reduce((sum, p) => sum.add(p.feeAmount), new Decimal(0))
                .toString(),
            totalNetAmount: payouts
                .reduce((sum, p) => sum.add(p.netAmount), new Decimal(0))
                .toString(),
        };

        this.logger.log({
            event: 'payout_export_generated',
            totalPayouts: summary.totalPayouts,
            totalNetAmount: summary.totalNetAmount,
        });

        return {
            startDate: query.startDate || null,
            endDate: query.endDate || null,
            status: query.status || 'COMPLETED',
            payouts,
            summary,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate fee revenue report
     * Aggregates platform fees and withdrawal fees by time period
     * READ-ONLY: No mutations, only aggregation queries
     */
    async getFeeRevenue(query: FeeRevenueQueryDto): Promise<FeeRevenueReport> {
        const { startDate, endDate } = this.getDateRange(query.startDate, query.endDate);
        const groupBy = query.groupBy || 'day';

        this.logger.log({
            event: 'fee_revenue_report_requested',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            groupBy,
        });

        // Get payments with platform fees
        const payments = await this.prisma.payments.findMany({
            where: {
                lifecycle: 'CAPTURED',
                capturedAt: {
                    gte: startDate,
                    lte: endDate,
                },
                platformFeeAmount: {
                    not: null,
                },
            },
            select: {
                id: true,
                platformFeeAmount: true,
                capturedAt: true,
            },
        });

        // Get withdrawals with fees
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                feeAmount: true,
                completedAt: true,
            },
        });

        // Group by period
        const revenueByPeriod = new Map<string, FeeRevenueEntry>();

        // Process payment fees
        for (const payment of payments) {
            const period = this.getPeriodKey(payment.capturedAt!, groupBy);
            const entry = this.getOrCreateFeeEntry(revenueByPeriod, period);

            if (payment.platformFeeAmount) {
                entry.platformFeeCount += 1;
                entry.platformFeeRevenue = new Decimal(entry.platformFeeRevenue)
                    .add(payment.platformFeeAmount)
                    .toString();
            }
        }

        // Process withdrawal fees
        for (const withdrawal of withdrawals) {
            const period = this.getPeriodKey(withdrawal.completedAt!, groupBy);
            const entry = this.getOrCreateFeeEntry(revenueByPeriod, period);

            entry.withdrawalFeeCount += 1;
            entry.withdrawalFeeRevenue = new Decimal(entry.withdrawalFeeRevenue)
                .add(withdrawal.feeAmount)
                .toString();
        }

        // Calculate total fee revenue for each period
        const feeRevenue: FeeRevenueEntry[] = [];
        for (const [period, entry] of revenueByPeriod) {
            entry.totalFeeRevenue = new Decimal(entry.platformFeeRevenue)
                .add(entry.withdrawalFeeRevenue)
                .toString();
            feeRevenue.push(entry);
        }

        // Sort by period
        feeRevenue.sort((a, b) => a.period.localeCompare(b.period));

        // Calculate summary
        const summary = {
            totalPeriods: feeRevenue.length,
            totalPlatformFeeRevenue: feeRevenue
                .reduce((sum, f) => sum.add(f.platformFeeRevenue), new Decimal(0))
                .toString(),
            totalWithdrawalFeeRevenue: feeRevenue
                .reduce((sum, f) => sum.add(f.withdrawalFeeRevenue), new Decimal(0))
                .toString(),
            totalRevenue: '0',
        };

        summary.totalRevenue = new Decimal(summary.totalPlatformFeeRevenue)
            .add(summary.totalWithdrawalFeeRevenue)
            .toString();

        this.logger.log({
            event: 'fee_revenue_report_generated',
            totalPeriods: summary.totalPeriods,
            totalRevenue: summary.totalRevenue,
        });

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            groupBy,
            feeRevenue,
            summary,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Export settlement data to CSV format
     * READ-ONLY utility method
     */
    exportSettlementToCSV(report: DailySettlementReport): string {
        const headers = [
            'Date',
            'Payments Captured',
            'Payments Count',
            'Refunds Issued',
            'Refunds Count',
            'Withdrawals Processed',
            'Withdrawals Count',
            'Platform Fee Revenue',
            'Withdrawal Fee Revenue',
            'Net Settlement',
        ];

        const rows = report.settlements.map((s) => [
            s.date,
            s.totalPaymentsCaptured,
            s.totalPaymentsCapturedCount.toString(),
            s.totalRefundsIssued,
            s.totalRefundsIssuedCount.toString(),
            s.totalWithdrawalsProcessed,
            s.totalWithdrawalsProcessedCount.toString(),
            s.platformFeeRevenue,
            s.withdrawalFeeRevenue,
            s.netSettlement,
        ]);

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    /**
     * Export payout data to CSV format
     * READ-ONLY utility method
     */
    exportPayoutToCSV(report: PayoutExportReport): string {
        const headers = [
            'Withdrawal ID',
            'Wallet ID',
            'Wallet Code',
            'User ID',
            'Requested Amount',
            'Fee Amount',
            'Net Amount',
            'Status',
            'Provider',
            'Provider Withdrawal ID',
            'Requested At',
            'Processed At',
            'Completed At',
            'Transaction ID',
        ];

        const rows = report.payouts.map((p) => [
            p.withdrawalId,
            p.walletId,
            p.walletCode,
            p.userId,
            p.requestedAmount,
            p.feeAmount,
            p.netAmount,
            p.status,
            p.providerName,
            p.providerWithdrawalId || '',
            p.requestedAt,
            p.processedAt || '',
            p.completedAt || '',
            p.transactionId,
        ]);

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    /**
     * Export fee revenue data to CSV format
     * READ-ONLY utility method
     */
    exportFeeRevenueToCSV(report: FeeRevenueReport): string {
        const headers = [
            'Period',
            'Platform Fee Count',
            'Platform Fee Revenue',
            'Withdrawal Fee Count',
            'Withdrawal Fee Revenue',
            'Total Fee Revenue',
        ];

        const rows = report.feeRevenue.map((f) => [
            f.period,
            f.platformFeeCount.toString(),
            f.platformFeeRevenue,
            f.withdrawalFeeCount.toString(),
            f.withdrawalFeeRevenue,
            f.totalFeeRevenue,
        ]);

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // Private helper methods

    private getDateRange(startDate?: string, endDate?: string): { startDate: Date; endDate: Date } {
        const end = endDate ? new Date(endDate) : new Date();
        let start: Date;

        if (startDate) {
            start = new Date(startDate);
        } else {
            // Default to 30 days ago
            start = new Date(end);
            start.setDate(start.getDate() - 30);
        }

        // Enforce max 90 day range
        const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
        if (end.getTime() - start.getTime() > maxRange) {
            start = new Date(end.getTime() - maxRange);
        }

        return { startDate: start, endDate: end };
    }

    private getDateKey(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private getPeriodKey(date: Date, groupBy: string): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (groupBy) {
            case 'day':
                return `${year}-${month}-${day}`;
            case 'week':
                const weekNum = this.getWeekNumber(date);
                return `${year}-W${String(weekNum).padStart(2, '0')}`;
            case 'month':
                return `${year}-${month}`;
            default:
                return `${year}-${month}-${day}`;
        }
    }

    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }

    private getOrCreateDailyEntry(
        map: Map<string, DailySettlementEntry>,
        date: string,
    ): DailySettlementEntry {
        if (!map.has(date)) {
            map.set(date, {
                date,
                totalPaymentsCaptured: '0',
                totalPaymentsCapturedCount: 0,
                totalRefundsIssued: '0',
                totalRefundsIssuedCount: 0,
                totalWithdrawalsProcessed: '0',
                totalWithdrawalsProcessedCount: 0,
                platformFeeRevenue: '0',
                withdrawalFeeRevenue: '0',
                netSettlement: '0',
            });
        }
        return map.get(date)!;
    }

    private getOrCreateFeeEntry(map: Map<string, FeeRevenueEntry>, period: string): FeeRevenueEntry {
        if (!map.has(period)) {
            map.set(period, {
                period,
                platformFeeCount: 0,
                platformFeeRevenue: '0',
                withdrawalFeeCount: 0,
                withdrawalFeeRevenue: '0',
                totalFeeRevenue: '0',
            });
        }
        return map.get(period)!;
    }
}
