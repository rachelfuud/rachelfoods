import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../payments/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
    ValidationQueryDto,
    LedgerZeroSumValidationResult,
    LedgerZeroSumViolation,
    OrphanedEntryValidationResult,
    OrphanedLedgerEntry,
    MissingLedgerEntryResult,
    MissingLedgerEntry,
    BalanceDriftValidationResult,
    BalanceDrift,
    FeeIntegrityValidationResult,
    FeeIntegrityViolation,
    ValidationSummary,
} from './dto/validation.dto';

@Injectable()
export class ValidationService {
    private readonly logger = new Logger(ValidationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly walletService: WalletService,
    ) { }

    /**
     * Validate ledger zero-sum invariant per transactionId
     * READ-ONLY: No mutations
     */
    async validateLedgerZeroSum(
        query: ValidationQueryDto,
    ): Promise<LedgerZeroSumValidationResult> {
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

        // Get all ledger entries in range
        const entries = await this.prisma.ledger_entries.findMany({
            where,
            orderBy: { transactionId: 'asc' },
        });

        // Group by transactionId
        const transactionMap = new Map<
            string,
            Array<{
                id: string;
                walletId: string;
                amount: Decimal;
                entryType: string;
                description: string;
                createdAt: Date;
            }>
        >();

        for (const entry of entries) {
            if (!transactionMap.has(entry.transactionId)) {
                transactionMap.set(entry.transactionId, []);
            }
            transactionMap.get(entry.transactionId)!.push({
                id: entry.id,
                walletId: entry.walletId,
                amount: entry.amount,
                entryType: entry.entryType,
                description: entry.description,
                createdAt: entry.createdAt,
            });
        }

        // Check zero-sum invariant
        const violations: LedgerZeroSumViolation[] = [];

        for (const [transactionId, txnEntries] of transactionMap) {
            const sum = txnEntries.reduce((acc, e) => acc.add(e.amount), new Decimal(0));

            if (!sum.eq(0)) {
                violations.push({
                    transactionId,
                    entryCount: txnEntries.length,
                    totalAmount: sum.toString(),
                    expectedAmount: '0',
                    difference: sum.toString(),
                    entries: txnEntries.map((e) => ({
                        id: e.id,
                        walletId: e.walletId,
                        amount: e.amount.toString(),
                        entryType: e.entryType,
                        description: e.description,
                        createdAt: e.createdAt.toISOString(),
                    })),
                });

                if (violations.length >= limit) {
                    break;
                }
            }
        }

        this.logger.log({
            event: 'ledger_zero_sum_validation_completed',
            totalTransactions: transactionMap.size,
            violations: violations.length,
        });

        return {
            totalTransactionsChecked: transactionMap.size,
            violationsFound: violations.length,
            violations,
        };
    }

    /**
     * Detect orphaned ledger entries (missing related payment/refund/withdrawal)
     * READ-ONLY: No mutations
     */
    async detectOrphanedEntries(
        query: ValidationQueryDto,
    ): Promise<OrphanedEntryValidationResult> {
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

        // Get all ledger entries with related resource IDs
        const entries = await this.prisma.ledger_entries.findMany({
            where,
            select: {
                id: true,
                walletId: true,
                amount: true,
                entryType: true,
                transactionId: true,
                paymentId: true,
                orderId: true,
                refundId: true,
                description: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const orphanedEntries: OrphanedLedgerEntry[] = [];

        for (const entry of entries) {
            let isOrphaned = false;
            let reason = '';

            // Check payment reference
            if (entry.paymentId) {
                const payment = await this.prisma.payments.findUnique({
                    where: { id: entry.paymentId },
                    select: { id: true },
                });
                if (!payment) {
                    isOrphaned = true;
                    reason = `Payment ${entry.paymentId} not found`;
                }
            }

            // Check refund reference
            if (entry.refundId && !isOrphaned) {
                const refund = await this.prisma.refunds.findUnique({
                    where: { id: entry.refundId },
                    select: { id: true },
                });
                if (!refund) {
                    isOrphaned = true;
                    reason = `Refund ${entry.refundId} not found`;
                }
            }

            // Check order reference
            if (entry.orderId && !isOrphaned) {
                const order = await this.prisma.orders.findUnique({
                    where: { id: entry.orderId },
                    select: { id: true },
                });
                if (!order) {
                    isOrphaned = true;
                    reason = `Order ${entry.orderId} not found`;
                }
            }

            if (isOrphaned) {
                orphanedEntries.push({
                    entryId: entry.id,
                    walletId: entry.walletId,
                    amount: entry.amount.toString(),
                    entryType: entry.entryType,
                    transactionId: entry.transactionId,
                    paymentId: entry.paymentId,
                    orderId: entry.orderId,
                    refundId: entry.refundId,
                    description: entry.description,
                    reason,
                    createdAt: entry.createdAt.toISOString(),
                });

                if (orphanedEntries.length >= limit) {
                    break;
                }
            }
        }

        this.logger.log({
            event: 'orphaned_entries_detection_completed',
            totalEntries: entries.length,
            orphaned: orphanedEntries.length,
        });

        return {
            totalEntriesChecked: entries.length,
            orphanedEntriesFound: orphanedEntries.length,
            orphanedEntries,
        };
    }

    /**
     * Detect missing ledger entries for completed payments/refunds/withdrawals
     * READ-ONLY: No mutations
     */
    async detectMissingLedgerEntries(
        query: ValidationQueryDto,
    ): Promise<MissingLedgerEntryResult> {
        const limit = query.limit || 100;
        const missingEntries: MissingLedgerEntry[] = [];

        // Build where clause for date range
        const dateWhere: any = {};
        if (query.startDate || query.endDate) {
            if (query.startDate) {
                dateWhere.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                dateWhere.lte = new Date(query.endDate);
            }
        }

        // Check completed withdrawals
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                status: 'COMPLETED',
                ...(Object.keys(dateWhere).length > 0 && { completedAt: dateWhere }),
            },
            select: {
                id: true,
                walletId: true,
                netAmount: true,
                status: true,
                completedAt: true,
            },
            take: limit,
        });

        for (const withdrawal of withdrawals) {
            const transactionId = `withdrawal-${withdrawal.id}`;
            const entries = await this.prisma.ledger_entries.findMany({
                where: { transactionId },
                select: { entryType: true },
            });

            const hasDebit = entries.some((e) => e.entryType === 'WITHDRAWAL_DEBIT');

            if (!hasDebit) {
                missingEntries.push({
                    resourceType: 'withdrawal',
                    resourceId: withdrawal.id,
                    expectedEntryType: 'WITHDRAWAL_DEBIT',
                    transactionId,
                    amount: withdrawal.netAmount.toString(),
                    status: withdrawal.status,
                    reason: 'Completed withdrawal missing WITHDRAWAL_DEBIT ledger entry',
                    createdAt: withdrawal.completedAt?.toISOString() || '',
                });

                if (missingEntries.length >= limit) {
                    break;
                }
            }
        }

        // Check completed payments (if not at limit)
        if (missingEntries.length < limit) {
            const payments = await this.prisma.payments.findMany({
                where: {
                    lifecycle: 'CAPTURED',
                    ...(Object.keys(dateWhere).length > 0 && { createdAt: dateWhere }),
                },
                select: {
                    id: true,
                    amount: true,
                    lifecycle: true,
                    createdAt: true,
                },
                take: limit - missingEntries.length,
            });

            for (const payment of payments) {
                const entries = await this.prisma.ledger_entries.findMany({
                    where: { paymentId: payment.id },
                    select: { entryType: true },
                });

                if (entries.length === 0) {
                    missingEntries.push({
                        resourceType: 'payment',
                        resourceId: payment.id,
                        expectedEntryType: 'PAYMENT_DEBIT/CREDIT',
                        transactionId: `payment-${payment.id}`,
                        amount: payment.amount.toString(),
                        status: payment.lifecycle,
                        reason: 'Completed payment has no ledger entries',
                        createdAt: payment.createdAt.toISOString(),
                    });

                    if (missingEntries.length >= limit) {
                        break;
                    }
                }
            }
        }

        // Check completed refunds (if not at limit)
        if (missingEntries.length < limit) {
            const refunds = await this.prisma.refunds.findMany({
                where: {
                    status: 'COMPLETED',
                    ...(Object.keys(dateWhere).length > 0 && { createdAt: dateWhere }),
                },
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    createdAt: true,
                },
                take: limit - missingEntries.length,
            });

            for (const refund of refunds) {
                const entries = await this.prisma.ledger_entries.findMany({
                    where: { refundId: refund.id },
                    select: { entryType: true },
                });

                if (entries.length === 0) {
                    missingEntries.push({
                        resourceType: 'refund',
                        resourceId: refund.id,
                        expectedEntryType: 'REFUND_DEBIT/CREDIT',
                        transactionId: `refund-${refund.id}`,
                        amount: refund.amount.toString(),
                        status: refund.status,
                        reason: 'Completed refund has no ledger entries',
                        createdAt: refund.createdAt.toISOString(),
                    });

                    if (missingEntries.length >= limit) {
                        break;
                    }
                }
            }
        }

        const totalChecked = withdrawals.length + (limit > withdrawals.length ? limit - withdrawals.length : 0);

        this.logger.log({
            event: 'missing_ledger_entries_detection_completed',
            totalResources: totalChecked,
            missing: missingEntries.length,
        });

        return {
            totalResourcesChecked: totalChecked,
            missingEntriesFound: missingEntries.length,
            missingEntries,
        };
    }

    /**
     * Detect balance drift between computed balance and cached balance (if exists)
     * READ-ONLY: No mutations
     */
    async detectBalanceDrift(
        query: ValidationQueryDto,
    ): Promise<BalanceDriftValidationResult> {
        const limit = query.limit || 100;

        // Get all wallets
        const wallets = await this.prisma.wallets.findMany({
            select: {
                id: true,
                walletCode: true,
                walletType: true,
                walletStatus: true,
            },
            take: limit,
        });

        const drifts: BalanceDrift[] = [];

        for (const wallet of wallets) {
            // Compute balance from ledger
            const computedBalance = await this.walletService.getWalletBalance(wallet.id);

            // Note: wallets table doesn't have a cached balance field in the schema
            // This check is for future-proofing if a balance field is added
            // For now, we'll check if entries exist and report basic stats

            const stats = await this.prisma.ledger_entries.aggregate({
                where: { walletId: wallet.id },
                _count: true,
            });

            const lastEntry = await this.prisma.ledger_entries.findFirst({
                where: { walletId: wallet.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });

            // Currently, since there's no cached balance field, we just report computed balance
            // If drift detection is needed, a balance field would need to be added to the schema
            // For now, we'll report wallets with entries for monitoring
            if (stats._count && stats._count > 0) {
                drifts.push({
                    walletId: wallet.id,
                    walletCode: wallet.walletCode,
                    walletType: wallet.walletType,
                    computedBalance: computedBalance.toString(),
                    cachedBalance: 'N/A (no cached balance field)',
                    difference: '0',
                    entryCount: stats._count,
                    lastEntryAt: lastEntry?.createdAt.toISOString() || null,
                });
            }
        }

        this.logger.log({
            event: 'balance_drift_detection_completed',
            totalWallets: wallets.length,
            walletsWithEntries: drifts.length,
        });

        return {
            totalWalletsChecked: wallets.length,
            driftsFound: 0, // No actual drift detection without cached balance field
            drifts: [], // Return empty since we can't detect actual drift
        };
    }

    /**
     * Validate fee integrity for withdrawals and payments
     * READ-ONLY: No mutations
     */
    async validateFeeIntegrity(
        query: ValidationQueryDto,
    ): Promise<FeeIntegrityValidationResult> {
        const limit = query.limit || 100;
        const violations: FeeIntegrityViolation[] = [];

        // Build where clause for date range
        const dateWhere: any = {};
        if (query.startDate || query.endDate) {
            if (query.startDate) {
                dateWhere.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                dateWhere.lte = new Date(query.endDate);
            }
        }

        // Check withdrawals fee integrity: netAmount = requestedAmount - feeAmount
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: {
                ...(Object.keys(dateWhere).length > 0 && { requestedAt: dateWhere }),
            },
            select: {
                id: true,
                requestedAmount: true,
                feeAmount: true,
                netAmount: true,
                requestedAt: true,
            },
            take: limit,
        });

        for (const withdrawal of withdrawals) {
            const expectedNetAmount = withdrawal.requestedAmount.sub(withdrawal.feeAmount);
            const difference = withdrawal.netAmount.sub(expectedNetAmount);

            if (!difference.eq(0)) {
                violations.push({
                    resourceType: 'withdrawal',
                    resourceId: withdrawal.id,
                    requestedAmount: withdrawal.requestedAmount.toString(),
                    feeAmount: withdrawal.feeAmount.toString(),
                    netAmount: withdrawal.netAmount.toString(),
                    expectedNetAmount: expectedNetAmount.toString(),
                    difference: difference.toString(),
                    reason: 'netAmount != requestedAmount - feeAmount',
                    createdAt: withdrawal.requestedAt.toISOString(),
                });

                if (violations.length >= limit) {
                    break;
                }
            }
        }

        // Check payments fee integrity (if not at limit)
        // Note: Payment fee structure depends on implementation
        // This is a placeholder for payment fee validation

        const totalChecked = withdrawals.length;

        this.logger.log({
            event: 'fee_integrity_validation_completed',
            totalResources: totalChecked,
            violations: violations.length,
        });

        return {
            totalResourcesChecked: totalChecked,
            violationsFound: violations.length,
            violations,
        };
    }

    /**
     * Get comprehensive validation summary
     * READ-ONLY: No mutations
     */
    async getValidationSummary(query: ValidationQueryDto): Promise<ValidationSummary> {
        const [zeroSum, orphaned, missing, drift, feeIntegrity] = await Promise.all([
            this.validateLedgerZeroSum(query),
            this.detectOrphanedEntries(query),
            this.detectMissingLedgerEntries(query),
            this.detectBalanceDrift(query),
            this.validateFeeIntegrity(query),
        ]);

        return {
            validationRunAt: new Date().toISOString(),
            ledgerZeroSum: {
                checked: zeroSum.totalTransactionsChecked,
                violations: zeroSum.violationsFound,
            },
            orphanedEntries: {
                checked: orphaned.totalEntriesChecked,
                orphaned: orphaned.orphanedEntriesFound,
            },
            missingEntries: {
                checked: missing.totalResourcesChecked,
                missing: missing.missingEntriesFound,
            },
            balanceDrift: {
                checked: drift.totalWalletsChecked,
                drifts: drift.driftsFound,
            },
            feeIntegrity: {
                checked: feeIntegrity.totalResourcesChecked,
                violations: feeIntegrity.violationsFound,
            },
        };
    }
}
