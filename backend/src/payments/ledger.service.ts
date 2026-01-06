import {
    Injectable,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * LedgerEntry creation input (without id and createdAt)
 */
export interface CreateLedgerEntryInput {
    walletId: string;
    amount: Decimal;
    entryType: LedgerEntryType;
    description: string;
    paymentId?: string;
    orderId?: string;
    refundId?: string;
    createdBy?: string;
}

/**
 * LedgerService
 * 
 * Core financial ledger service implementing immutable, append-only transaction log.
 * 
 * CRITICAL INVARIANT:
 * For every transactionId, the sum of all ledger entry amounts MUST equal ZERO.
 * This enforces double-entry bookkeeping: every debit has an equal credit.
 * 
 * ARCHITECTURAL PRINCIPLES:
 * 1. Immutability: Ledger entries are NEVER updated or deleted
 * 2. Append-Only: Only INSERT operations allowed
 * 3. Idempotency: Duplicate operations prevented via idempotencyKey
 * 4. Atomicity: All entries in a transaction recorded atomically
 * 5. Invariant: Sum of amounts per transactionId = 0 (verified before commit)
 * 
 * NO WALLET BALANCE LOGIC - Balances computed by WalletService from ledger sums
 * NO PAYMENT/REFUND LOGIC - Business logic handled by respective services
 * NO SIDE EFFECTS - Pure ledger recording only
 */
@Injectable()
export class LedgerService {
    private readonly logger = new Logger(LedgerService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Record multiple ledger entries in a single atomic transaction
     * 
     * CRITICAL: This is the ONLY method that writes to ledger_entries table.
     * All financial operations must funnel through this method.
     * 
     * @param entries - Array of ledger entries to record
     * @param transactionId - UUID grouping related entries (must be unique)
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     * 
     * @throws BadRequestException if:
     *   - Entries array is empty
     *   - Any entry has amount = 0
     *   - Sum of entry amounts != 0 (invariant violation)
     *   - Missing required fields
     * 
     * @throws InternalServerErrorException if database operation fails
     * 
     * @returns Created ledger entries with generated IDs
     * 
     * IDEMPOTENCY GUARANTEE:
     * If called multiple times with same idempotencyKey, only first call writes.
     * Subsequent calls return existing entries without error.
     * 
     * ATOMICITY GUARANTEE:
     * Either ALL entries are recorded or NONE are (Prisma transaction).
     * Database rollback occurs if invariant check fails.
     */
    async recordEntries(
        entries: CreateLedgerEntryInput[],
        transactionId: string,
        idempotencyKey?: string,
    ) {
        // Validate inputs
        this.validateEntries(entries, transactionId);

        // Check idempotency BEFORE starting transaction
        if (idempotencyKey) {
            const processed = await this.hasProcessed(idempotencyKey);
            if (processed) {
                this.logger.log(
                    `Idempotent operation detected: ${idempotencyKey} - returning existing entries`,
                );
                // Return existing entries for this idempotency key
                return await this.prisma.ledger_entries.findMany({
                    where: { idempotencyKey },
                    orderBy: { createdAt: 'asc' },
                });
            }
        }

        // Verify invariant BEFORE attempting write
        this.verifyEntriesInvariant(entries);

        try {
            // Use Prisma transaction for atomicity
            return await this.prisma.$transaction(async (tx) => {
                // Create all entries with shared idempotencyKey
                const createdEntries = [];

                for (const entry of entries) {
                    const created = await tx.ledger_entries.create({
                        data: {
                            id: crypto.randomUUID(),
                            walletId: entry.walletId,
                            amount: entry.amount,
                            entryType: entry.entryType,
                            description: entry.description,
                            transactionId,
                            paymentId: entry.paymentId,
                            orderId: entry.orderId,
                            refundId: entry.refundId,
                            createdBy: entry.createdBy,
                            idempotencyKey: idempotencyKey || null,
                        },
                    });
                    createdEntries.push(created);
                }

                // Verify invariant in database (final safety check)
                await this.verifyTransactionInvariant(transactionId, tx);

                this.logger.log({
                    message: 'Ledger entries recorded',
                    transactionId,
                    entryCount: createdEntries.length,
                    idempotencyKey,
                });

                return createdEntries;
            });
        } catch (error) {
            this.logger.error({
                message: 'Failed to record ledger entries',
                transactionId,
                error: error.message,
                code: error.code,
                stack: error.stack,
            });

            // Check for unique constraint violation on idempotencyKey
            if (
                error.code === 'P2002' &&
                error.meta?.target?.includes('idempotencyKey')
            ) {
                // Race condition: another process recorded with same key
                // Return existing entries (idempotent behavior)
                this.logger.warn(
                    `Race condition detected for idempotencyKey: ${idempotencyKey}`,
                );
                return await this.prisma.ledger_entries.findMany({
                    where: { idempotencyKey },
                    orderBy: { createdAt: 'asc' },
                });
            }

            throw new InternalServerErrorException(
                'Failed to record ledger entries',
            );
        }
    }

    /**
     * Verify that all ledger entries for a transactionId sum to zero
     * 
     * This is the CRITICAL INVARIANT that ensures financial accuracy.
     * 
     * @param transactionId - Transaction to verify
     * @param tx - Optional Prisma transaction context (for use within transactions)
     * 
     * @throws BadRequestException if invariant is violated (sum != 0)
     * 
     * INVARIANT ENFORCEMENT:
     * Sum of all entry amounts for a transactionId MUST equal ZERO.
     * 
     * Examples of valid transactions:
     * - 2 entries: [-1000, +1000] = 0 ✅
     * - 3 entries: [-1000, +975, +25] = 0 ✅
     * - 4 entries: [-975, -25, +1000, 0] = INVALID (contains zero) ❌
     * 
     * This method is called:
     * 1. Before committing transaction (in recordEntries)
     * 2. During periodic audits (batch verification)
     * 3. When investigating discrepancies
     */
    async verifyTransactionInvariant(
        transactionId: string,
        tx?: Prisma.TransactionClient,
    ): Promise<void> {
        const prismaClient = tx || this.prisma;

        // Get all entries for this transaction
        const entries = await prismaClient.ledger_entries.findMany({
            where: { transactionId },
            select: { amount: true, id: true },
        });

        if (entries.length === 0) {
            throw new BadRequestException(
                `No ledger entries found for transaction ${transactionId}`,
            );
        }

        // Calculate sum with Decimal precision
        const sum = entries.reduce(
            (acc, entry) => acc.add(entry.amount),
            new Decimal(0),
        );

        // Check invariant: sum MUST equal 0
        if (!sum.equals(0)) {
            const errorMsg = `LEDGER INVARIANT VIOLATED: Transaction ${transactionId} sum = ${sum.toString()} (expected 0). Entry count: ${entries.length}`;

            this.logger.error(errorMsg);

            // Log entry details for debugging
            this.logger.error(
                `Entry amounts: ${entries.map(e => e.amount.toString()).join(', ')}`,
            );

            throw new BadRequestException(errorMsg);
        }

        this.logger.debug(
            `Transaction ${transactionId} invariant verified: ${entries.length} entries, sum = 0`,
        );
    }

    /**
     * Check if an operation with given idempotencyKey has already been processed
     * 
     * @param idempotencyKey - Unique key for operation
     * @returns true if ledger entry with this key exists, false otherwise
     * 
     * IDEMPOTENCY PATTERN:
     * Before executing any financial operation, check if it was already processed.
     * If yes, return cached result without re-executing (safe retry).
     * If no, proceed with execution and record idempotencyKey.
     * 
     * Example usage:
     * ```typescript
     * if (await ledgerService.hasProcessed(key)) {
     *   return getCachedResult(key);
     * }
     * await ledgerService.recordEntries(..., key);
     * ```
     */
    async hasProcessed(idempotencyKey: string): Promise<boolean> {
        const existingEntry = await this.prisma.ledger_entries.findUnique({
            where: { idempotencyKey },
            select: { id: true },
        });

        return existingEntry !== null;
    }

    /**
     * Get all ledger entries for a specific transaction
     * 
     * Useful for:
     * - Auditing transactions
     * - Debugging financial issues
     * - Generating transaction receipts
     * 
     * @param transactionId - Transaction ID to query
     * @returns Array of ledger entries ordered by creation time
     */
    async getTransactionEntries(transactionId: string) {
        return await this.prisma.ledger_entries.findMany({
            where: { transactionId },
            orderBy: { createdAt: 'asc' },
            include: {
                wallets: {
                    select: {
                        id: true,
                        walletType: true,
                        userId: true,
                        walletCode: true,
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        lifecycle: true,
                    },
                },
                orders: {
                    select: {
                        id: true,
                        orderNumber: true,
                    },
                },
                refunds: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                    },
                },
            },
        });
    }

    /**
     * Get all ledger entries for a specific wallet
     * 
     * Used by WalletService to compute wallet balance:
     * balance = SUM(amount) WHERE walletId = X
     * 
     * @param walletId - Wallet ID to query
     * @param options - Optional pagination and filtering
     * @returns Paginated ledger entries
     */
    async getWalletEntries(
        walletId: string,
        options?: {
            skip?: number;
            take?: number;
            startDate?: Date;
            endDate?: Date;
        },
    ) {
        const where: Prisma.ledger_entriesWhereInput = {
            walletId,
            ...(options?.startDate || options?.endDate
                ? {
                    createdAt: {
                        ...(options.startDate && { gte: options.startDate }),
                        ...(options.endDate && { lte: options.endDate }),
                    },
                }
                : {}),
        };

        const [entries, total] = await Promise.all([
            this.prisma.ledger_entries.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: options?.skip || 0,
                take: options?.take || 50,
                include: {
                    payments: {
                        select: {
                            id: true,
                            paymentMethod: true,
                            lifecycle: true,
                        },
                    },
                    orders: {
                        select: {
                            id: true,
                            orderNumber: true,
                        },
                    },
                    refunds: {
                        select: {
                            id: true,
                            status: true,
                        },
                    },
                },
            }),
            this.prisma.ledger_entries.count({ where }),
        ]);

        return { entries, total };
    }

    /**
     * Validate ledger entries before recording
     * 
     * @private
     * @throws BadRequestException if validation fails
     */
    private validateEntries(
        entries: CreateLedgerEntryInput[],
        transactionId: string,
    ): void {
        // Must have at least 2 entries (minimum for balanced transaction)
        if (!entries || entries.length < 2) {
            throw new BadRequestException(
                'At least 2 ledger entries required for a transaction',
            );
        }

        // Validate transactionId
        if (!transactionId || transactionId.trim().length === 0) {
            throw new BadRequestException('transactionId is required');
        }

        // Validate each entry
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            // Validate required fields
            if (!entry.walletId) {
                throw new BadRequestException(
                    `Entry ${i}: walletId is required`,
                );
            }

            if (!entry.entryType) {
                throw new BadRequestException(
                    `Entry ${i}: entryType is required`,
                );
            }

            if (!entry.description || entry.description.trim().length === 0) {
                throw new BadRequestException(
                    `Entry ${i}: description is required`,
                );
            }

            // Validate amount
            if (!(entry.amount instanceof Decimal)) {
                throw new BadRequestException(
                    `Entry ${i}: amount must be a Decimal`,
                );
            }

            // Zero amount not allowed
            if (entry.amount.equals(0)) {
                throw new BadRequestException(
                    `Entry ${i}: amount cannot be zero`,
                );
            }

            // Must reference at least one entity (payment, order, or refund)
            // OR be an adjustment (createdBy admin)
            if (!entry.paymentId && !entry.orderId && !entry.refundId && !entry.createdBy) {
                throw new BadRequestException(
                    `Entry ${i}: must reference at least one entity (payment, order, refund) or be an admin adjustment (createdBy)`,
                );
            }
        }
    }

    /**
     * Verify entries sum to zero (in-memory check before database write)
     * 
     * @private
     * @throws BadRequestException if sum != 0
     */
    private verifyEntriesInvariant(entries: CreateLedgerEntryInput[]): void {
        const sum = entries.reduce(
            (acc, entry) => acc.add(entry.amount),
            new Decimal(0),
        );

        if (!sum.equals(0)) {
            const amounts = entries.map(e => e.amount.toString());
            throw new BadRequestException(
                `Ledger invariant violation: Sum of entries = ${sum.toString()} (expected 0). Entry amounts: [${amounts.join(', ')}]`,
            );
        }
    }

    /**
     * Batch verify invariant for multiple transactions
     * 
     * Useful for periodic audits to detect ledger corruption.
     * 
     * @param transactionIds - Array of transaction IDs to verify
     * @returns Object with passed/failed counts and failed transaction IDs
     */
    async batchVerifyInvariant(transactionIds: string[]) {
        const results = {
            total: transactionIds.length,
            passed: 0,
            failed: 0,
            failedTransactions: [] as string[],
        };

        for (const txId of transactionIds) {
            try {
                await this.verifyTransactionInvariant(txId);
                results.passed++;
            } catch (error) {
                results.failed++;
                results.failedTransactions.push(txId);
                this.logger.error(
                    `Invariant verification failed for transaction ${txId}`,
                    error.message,
                );
            }
        }

        return results;
    }

    /**
     * Get aggregate statistics for ledger entries
     * 
     * Useful for admin dashboards and reporting.
     * 
     * @returns Statistics about ledger entries
     */
    async getStatistics() {
        const [
            totalEntries,
            totalTransactions,
            entryCountByType,
            recentEntries,
        ] = await Promise.all([
            this.prisma.ledger_entries.count(),
            this.prisma.ledger_entries.findMany({
                select: { transactionId: true },
                distinct: ['transactionId'],
            }),
            this.prisma.ledger_entries.groupBy({
                by: ['entryType'],
                _count: { id: true },
            }),
            this.prisma.ledger_entries.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    amount: true,
                    entryType: true,
                    transactionId: true,
                    createdAt: true,
                },
            }),
        ]);

        return {
            totalEntries,
            totalTransactions: totalTransactions.length,
            entryCountByType: entryCountByType.reduce((acc, item) => {
                acc[item.entryType] = item._count.id;
                return acc;
            }, {} as Record<string, number>),
            recentEntries,
        };
    }
}
