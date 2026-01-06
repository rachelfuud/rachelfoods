import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../payments/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
    TransactionReconciliationQueryDto,
    WalletBalanceQueryDto,
    LedgerReconciliationResult,
    TransactionGroupResult,
    WalletBalanceSnapshot,
    ReconciliationSummary,
} from './dto/reconciliation.dto';

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly walletService: WalletService,
    ) { }

    /**
     * Get ledger reconciliation report with zero-sum validation
     * READ-ONLY: No mutations
     */
    async getLedgerReconciliation(
        query: TransactionReconciliationQueryDto,
    ): Promise<{ results: LedgerReconciliationResult[]; nextCursor: string | null }> {
        const limit = query.limit || 100;

        // Build where clause
        const where: any = {};
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) {
                where.createdAt.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.createdAt.lte = new Date(query.endDate);
            }
        }
        if (query.walletId) {
            where.walletId = query.walletId;
        }
        if (query.entryType) {
            where.entryType = query.entryType;
        }
        if (query.transactionId) {
            where.transactionId = query.transactionId;
        }

        // Get unique transaction IDs with pagination
        const entries = await this.prisma.ledger_entries.findMany({
            where,
            select: {
                transactionId: true,
            },
            distinct: ['transactionId'],
            orderBy: { transactionId: 'asc' },
            take: limit + 1,
            ...(query.cursor && {
                skip: 1,
                cursor: { id: query.cursor },
            }),
        });

        const hasMore = entries.length > limit;
        const transactionIds = entries.slice(0, limit).map((e) => e.transactionId);
        const nextCursor = hasMore ? entries[limit - 1].transactionId : null;

        // Get all entries for these transactions
        const allEntries = await this.prisma.ledger_entries.findMany({
            where: {
                transactionId: { in: transactionIds },
            },
            orderBy: [{ transactionId: 'asc' }, { createdAt: 'asc' }],
        });

        // Group by transaction ID and calculate sums
        const transactionMap = new Map<string, LedgerReconciliationResult>();

        for (const entry of allEntries) {
            if (!transactionMap.has(entry.transactionId)) {
                transactionMap.set(entry.transactionId, {
                    transactionId: entry.transactionId,
                    entryCount: 0,
                    totalAmount: '0',
                    isBalanced: false,
                    entries: [],
                });
            }

            const txn = transactionMap.get(entry.transactionId)!;
            txn.entryCount++;
            txn.entries.push({
                id: entry.id,
                walletId: entry.walletId,
                amount: entry.amount.toString(),
                entryType: entry.entryType,
                description: entry.description,
                createdAt: entry.createdAt.toISOString(),
            });
        }

        // Calculate totals and check balance
        const results: LedgerReconciliationResult[] = [];
        for (const [transactionId, txn] of transactionMap) {
            const sum = txn.entries.reduce(
                (acc, e) => acc.add(new Decimal(e.amount)),
                new Decimal(0),
            );
            txn.totalAmount = sum.toString();
            txn.isBalanced = sum.eq(0);
            results.push(txn);
        }

        this.logger.log({
            event: 'ledger_reconciliation_report_generated',
            transactionCount: results.length,
            unbalancedCount: results.filter((r) => !r.isBalanced).length,
        });

        return { results, nextCursor };
    }

    /**
     * Get transaction groups with zero-sum validation
     * READ-ONLY: No mutations
     */
    async getTransactionZeroSumReport(
        query: TransactionReconciliationQueryDto,
    ): Promise<TransactionGroupResult[]> {
        // Build where clause
        const where: any = {};
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) {
                where.createdAt.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.createdAt.lte = new Date(query.endDate);
            }
        }

        // Get all entries grouped by transaction
        const entries = await this.prisma.ledger_entries.findMany({
            where,
            select: {
                transactionId: true,
                amount: true,
            },
            orderBy: { transactionId: 'asc' },
        });

        // Group and aggregate
        const transactionMap = new Map<
            string,
            { count: number; entries: Decimal[] }
        >();

        for (const entry of entries) {
            if (!transactionMap.has(entry.transactionId)) {
                transactionMap.set(entry.transactionId, {
                    count: 0,
                    entries: [],
                });
            }
            const txn = transactionMap.get(entry.transactionId)!;
            txn.count++;
            txn.entries.push(entry.amount);
        }

        // Calculate results
        const results: TransactionGroupResult[] = [];
        for (const [transactionId, txn] of transactionMap) {
            const sum = txn.entries.reduce((acc, amt) => acc.add(amt), new Decimal(0));
            results.push({
                transactionId,
                entryCount: txn.count,
                totalAmount: sum.toString(),
                isBalanced: sum.eq(0),
            });
        }

        this.logger.log({
            event: 'transaction_zero_sum_report_generated',
            totalTransactions: results.length,
            unbalancedTransactions: results.filter((r) => !r.isBalanced).length,
        });

        return results;
    }

    /**
     * Get wallet balance snapshots with computed balances
     * READ-ONLY: No mutations
     */
    async getWalletBalanceSnapshots(
        query: WalletBalanceQueryDto,
    ): Promise<WalletBalanceSnapshot[]> {
        // Build where clause
        const where: any = {};
        if (query.walletType) {
            where.walletType = query.walletType;
        }
        if (query.walletStatus) {
            where.walletStatus = query.walletStatus;
        }
        if (query.currency) {
            where.currency = query.currency;
        }
        if (query.userId) {
            where.userId = query.userId;
        }

        // Get all wallets
        const wallets = await this.prisma.wallets.findMany({
            where,
            orderBy: { walletCode: 'asc' },
        });

        // Compute balance for each wallet using WalletService
        const snapshots: WalletBalanceSnapshot[] = [];

        for (const wallet of wallets) {
            const computedBalance = await this.walletService.getWalletBalance(wallet.id);

            // Get entry count and last entry timestamp
            const stats = await this.prisma.ledger_entries.aggregate({
                where: { walletId: wallet.id },
                _count: true,
            });

            const lastEntry = await this.prisma.ledger_entries.findFirst({
                where: { walletId: wallet.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });

            snapshots.push({
                walletId: wallet.id,
                walletCode: wallet.walletCode,
                walletType: wallet.walletType,
                walletStatus: wallet.walletStatus,
                currency: wallet.currency,
                userId: wallet.userId,
                computedBalance: computedBalance.toString(),
                entryCount: stats._count || 0,
                lastEntryAt: lastEntry?.createdAt.toISOString() || null,
            });
        }

        this.logger.log({
            event: 'wallet_balance_snapshots_generated',
            walletCount: snapshots.length,
        });

        return snapshots;
    }

    /**
     * Get comprehensive reconciliation summary
     * READ-ONLY: No mutations
     */
    async getReconciliationSummary(
        startDate?: string,
        endDate?: string,
    ): Promise<ReconciliationSummary> {
        // Get all transaction groups
        const transactionGroups = await this.getTransactionZeroSumReport({
            startDate,
            endDate,
        });

        const unbalancedTransactions = transactionGroups.filter((t) => !t.isBalanced);

        // Get wallet snapshots for platform wallets
        const platformWallets = await this.prisma.wallets.findMany({
            where: {
                walletCode: { in: ['PLATFORM_MAIN', 'PLATFORM_ESCROW'] },
            },
        });

        const platformBalances: any = {
            PLATFORM_MAIN: '0',
            PLATFORM_ESCROW: '0',
        };

        for (const wallet of platformWallets) {
            const balance = await this.walletService.getWalletBalance(wallet.id);
            if (wallet.walletCode === 'PLATFORM_MAIN') {
                platformBalances.PLATFORM_MAIN = balance.toString();
            } else if (wallet.walletCode === 'PLATFORM_ESCROW') {
                platformBalances.PLATFORM_ESCROW = balance.toString();
            }
        }

        // Get all user wallets for liability calculation
        const userWallets = await this.prisma.wallets.findMany({
            where: {
                walletType: 'USER',
                walletStatus: 'ACTIVE',
            },
        });

        let totalLiability = new Decimal(0);
        for (const wallet of userWallets) {
            const balance = await this.walletService.getWalletBalance(wallet.id);
            totalLiability = totalLiability.add(balance);
        }

        const totalWallets = await this.prisma.wallets.count();

        this.logger.log({
            event: 'reconciliation_summary_generated',
            totalTransactions: transactionGroups.length,
            unbalancedTransactions: unbalancedTransactions.length,
            totalWallets,
        });

        return {
            totalTransactions: transactionGroups.length,
            balancedTransactions: transactionGroups.length - unbalancedTransactions.length,
            unbalancedTransactions: unbalancedTransactions.length,
            unbalancedList: unbalancedTransactions.slice(0, 100), // Limit to 100 for performance
            totalWallets,
            totalPlatformLiability: totalLiability.toString(),
            platformWalletBalances: platformBalances,
        };
    }

    /**
     * Export reconciliation data to CSV format
     * READ-ONLY: No mutations
     */
    async exportToCSV(
        data: LedgerReconciliationResult[] | WalletBalanceSnapshot[],
        type: 'ledger' | 'wallet',
    ): Promise<string> {
        if (type === 'ledger') {
            const ledgerData = data as LedgerReconciliationResult[];
            const rows = [
                'Transaction ID,Entry Count,Total Amount,Is Balanced,Entry ID,Wallet ID,Amount,Entry Type,Description,Created At',
            ];

            for (const txn of ledgerData) {
                for (const entry of txn.entries) {
                    rows.push(
                        [
                            txn.transactionId,
                            txn.entryCount,
                            txn.totalAmount,
                            txn.isBalanced,
                            entry.id,
                            entry.walletId,
                            entry.amount,
                            entry.entryType,
                            `"${entry.description}"`,
                            entry.createdAt,
                        ].join(','),
                    );
                }
            }

            return rows.join('\n');
        } else {
            const walletData = data as WalletBalanceSnapshot[];
            const rows = [
                'Wallet ID,Wallet Code,Wallet Type,Wallet Status,Currency,User ID,Computed Balance,Entry Count,Last Entry At',
            ];

            for (const wallet of walletData) {
                rows.push(
                    [
                        wallet.walletId,
                        wallet.walletCode,
                        wallet.walletType,
                        wallet.walletStatus,
                        wallet.currency,
                        wallet.userId || '',
                        wallet.computedBalance,
                        wallet.entryCount,
                        wallet.lastEntryAt || '',
                    ].join(','),
                );
            }

            return rows.join('\n');
        }
    }
}
