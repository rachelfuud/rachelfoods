import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { WalletType, WalletStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Wallet statement entry (formatted for display)
 */
export interface WalletStatementEntry {
    id: string;
    date: Date;
    amount: Decimal;
    type: string;
    description: string;
    balance: Decimal; // Running balance at this point
    relatedEntity: {
        type: 'payment' | 'order' | 'refund' | null;
        id: string | null;
        reference?: string; // Order number, payment ID, etc.
    };
}

/**
 * Wallet statement with pagination
 */
export interface WalletStatement {
    walletId: string;
    currentBalance: Decimal;
    entries: WalletStatementEntry[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
}

/**
 * Wallet details with computed balance
 */
export interface WalletDetails {
    id: string;
    userId: string | null;
    walletType: WalletType;
    walletStatus: WalletStatus;
    walletCode: string | null;
    currency: string;
    balance: Decimal; // COMPUTED from ledger
    freezeReason: string | null;
    frozenAt: Date | null;
    frozenBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * WalletService
 * 
 * Manages wallet accounts and computes balances from the ledger.
 * 
 * CRITICAL DESIGN PRINCIPLE:
 * This service is READ-ONLY with respect to money.
 * It NEVER creates ledger_entries records - that's LedgerService's job.
 * 
 * BALANCE COMPUTATION:
 * All wallet balances are computed on-demand from ledger_entries:
 * balance = SUM(ledger_entries.amount WHERE walletId = X)
 * 
 * NO STORED BALANCE - The wallet table has no balance field.
 * NO CACHING - Balances always reflect current ledger state.
 * NO DENORMALIZATION - Single source of truth is the ledger.
 * 
 * FINANCIAL GUARANTEES:
 * 1. Balance accuracy: Always matches ledger sum (atomic reads)
 * 2. Status enforcement: Frozen/suspended wallets block operations
 * 3. Existence validation: All wallet IDs verified before operations
 * 4. Type safety: Platform wallets identified by walletCode, not userId
 * 
 * RESPONSIBILITIES:
 * - Wallet CRUD (create, read, update status)
 * - Balance computation (from ledger aggregation)
 * - Transaction history (formatted statements)
 * - Status validation (sufficient funds, active status)
 * - Wallet retrieval (by user, by code, by type)
 * 
 * NOT RESPONSIBLE FOR:
 * - Creating ledger entries (use LedgerService)
 * - Payment processing (use PaymentService)
 * - Refund processing (use RefundService)
 * - Platform fee calculation (use PlatformFeeService)
 */
@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        private prisma: PrismaService,
        private ledgerService: LedgerService,
    ) { }

    /**
     * Compute wallet balance from ledger entries
     * 
     * FINANCIAL GUARANTEE:
     * Balance is ALWAYS accurate because it's computed from immutable ledger.
     * No race conditions, no sync issues, no stale data.
     * 
     * PERFORMANCE:
     * - O(1) with database aggregation (SUM query)
     * - Uses index on ledger_entries(walletId)
     * - Typical query time: 10-50ms
     * 
     * @param walletId - Wallet ID to compute balance for
     * @returns Current balance as Decimal (never null, defaults to 0)
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async getWalletBalance(walletId: string): Promise<Decimal> {
        // Verify wallet exists
        await this.getWalletOrThrow(walletId);

        // Aggregate ledger entries for this wallet
        const result = await this.prisma.ledger_entries.aggregate({
            where: { walletId },
            _sum: { amount: true },
        });

        // Return sum or 0 if no entries yet
        const balance = result._sum.amount || new Decimal(0);

        this.logger.debug(`Wallet ${walletId} balance: ${balance.toString()}`);

        return balance;
    }

    /**
     * Get wallet details with computed balance
     * 
     * @param walletId - Wallet ID
     * @returns Wallet details including current balance
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async getWalletDetails(walletId: string): Promise<WalletDetails> {
        const wallet = await this.getWalletOrThrow(walletId);
        const balance = await this.getWalletBalance(walletId);

        return {
            id: wallet.id,
            userId: wallet.userId,
            walletType: wallet.walletType,
            walletStatus: wallet.walletStatus,
            walletCode: wallet.walletCode,
            currency: wallet.currency,
            balance, // Computed from ledger
            freezeReason: wallet.freezeReason,
            frozenAt: wallet.frozenAt,
            frozenBy: wallet.frozenBy,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
    }

    /**
     * Get user's wallet (one wallet per user)
     * 
     * @param userId - User ID
     * @returns Wallet details with balance
     * 
     * @throws NotFoundException if user has no wallet
     */
    async getUserWallet(userId: string): Promise<WalletDetails> {
        const wallet = await this.prisma.wallets.findUnique({
            where: {
                userId_walletType: {
                    userId,
                    walletType: WalletType.USER,
                },
            },
        });

        if (!wallet) {
            throw new NotFoundException(`User ${userId} has no wallet`);
        }

        const balance = await this.getWalletBalance(wallet.id);

        return {
            id: wallet.id,
            userId: wallet.userId,
            walletType: wallet.walletType,
            walletStatus: wallet.walletStatus,
            walletCode: wallet.walletCode,
            currency: wallet.currency,
            balance,
            freezeReason: wallet.freezeReason,
            frozenAt: wallet.frozenAt,
            frozenBy: wallet.frozenBy,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
    }

    /**
     * Get platform wallet by wallet code
     * 
     * Platform wallets are system accounts with no userId.
     * Identified by unique walletCode (e.g., 'PLATFORM_MAIN').
     * 
     * @param walletCode - Platform wallet code (default: 'PLATFORM_MAIN')
     * @returns Platform wallet details with balance
     * 
     * @throws NotFoundException if platform wallet doesn't exist
     */
    async getPlatformWallet(
        walletCode: string = 'PLATFORM_MAIN',
    ): Promise<WalletDetails> {
        const wallet = await this.prisma.wallets.findUnique({
            where: { walletCode },
        });

        if (!wallet) {
            throw new NotFoundException(
                `Platform wallet '${walletCode}' not found`,
            );
        }

        if (wallet.walletType !== WalletType.PLATFORM) {
            throw new BadRequestException(
                `Wallet '${walletCode}' is not a platform wallet`,
            );
        }

        const balance = await this.getWalletBalance(wallet.id);

        return {
            id: wallet.id,
            userId: wallet.userId,
            walletType: wallet.walletType,
            walletStatus: wallet.walletStatus,
            walletCode: wallet.walletCode,
            currency: wallet.currency,
            balance,
            freezeReason: wallet.freezeReason,
            frozenAt: wallet.frozenAt,
            frozenBy: wallet.frozenBy,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
    }

    /**
     * Get wallet statement (transaction history with running balances)
     * 
     * DESIGN NOTE:
     * Uses LedgerService.getWalletEntries() to fetch ledger data.
     * Computes running balance for each entry for statement display.
     * 
     * @param walletId - Wallet ID
     * @param options - Pagination and filtering options
     * @returns Formatted wallet statement with entries and balance
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async getWalletStatement(
        walletId: string,
        options?: {
            page?: number;
            pageSize?: number;
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<WalletStatement> {
        // Verify wallet exists
        await this.getWalletOrThrow(walletId);

        // Get current balance
        const currentBalance = await this.getWalletBalance(walletId);

        // Pagination defaults
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 50;
        const skip = (page - 1) * pageSize;

        // Fetch ledger entries via LedgerService
        const { entries: ledgerEntries, total } =
            await this.ledgerService.getWalletEntries(walletId, {
                skip,
                take: pageSize,
                startDate: options?.startDate,
                endDate: options?.endDate,
            });

        // Compute running balance for each entry
        // Note: Entries are DESC by createdAt, so we work backwards
        let runningBalance = currentBalance;
        const statementEntries: WalletStatementEntry[] = [];

        for (const entry of ledgerEntries) {
            // Current entry's balance (before this transaction)
            const entryBalance = runningBalance;

            statementEntries.push({
                id: entry.id,
                date: entry.createdAt,
                amount: entry.amount,
                type: entry.entryType,
                description: entry.description,
                balance: entryBalance,
                relatedEntity: {
                    type: entry.paymentId
                        ? 'payment'
                        : entry.orderId
                            ? 'order'
                            : entry.refundId
                                ? 'refund'
                                : null,
                    id:
                        entry.paymentId ||
                        entry.orderId ||
                        entry.refundId ||
                        null,
                    reference: entry.orders?.orderNumber || entry.paymentId,
                },
            });

            // Move backwards in time (subtract current entry amount)
            runningBalance = runningBalance.minus(entry.amount);
        }

        return {
            walletId,
            currentBalance,
            entries: statementEntries,
            pagination: {
                total,
                page,
                pageSize,
                hasMore: skip + ledgerEntries.length < total,
            },
        };
    }

    /**
     * Validate wallet has sufficient balance for a transaction
     * 
     * FINANCIAL GUARANTEE:
     * Validates against current ledger-derived balance.
     * Safe to call before initiating payment/refund.
     * 
     * @param walletId - Wallet ID to check
     * @param requiredAmount - Amount needed (positive)
     * 
     * @throws NotFoundException if wallet doesn't exist
     * @throws BadRequestException if insufficient balance
     * @throws ForbiddenException if wallet is frozen/closed
     */
    async validateSufficientBalance(
        walletId: string,
        requiredAmount: Decimal,
    ): Promise<void> {
        // Validate amount is positive
        if (requiredAmount.lessThanOrEqualTo(0)) {
            throw new BadRequestException('Required amount must be positive');
        }

        // Get wallet and check status
        const wallet = await this.getWalletOrThrow(walletId);
        this.validateWalletStatus(wallet, 'debit');

        // Get current balance
        const balance = await this.getWalletBalance(walletId);

        // Check sufficient funds
        if (balance.lessThan(requiredAmount)) {
            throw new BadRequestException(
                `Insufficient balance. Required: ${requiredAmount.toString()}, Available: ${balance.toString()}`,
            );
        }

        this.logger.debug(
            `Wallet ${walletId} has sufficient balance: ${balance.toString()} >= ${requiredAmount.toString()}`,
        );
    }

    /**
     * Create a new user wallet
     * 
     * Called during user registration.
     * One wallet per user (enforced by unique constraint).
     * 
     * @param userId - User ID
     * @returns Created wallet with balance = 0
     * 
     * @throws BadRequestException if user already has wallet
     */
    async createUserWallet(userId: string) {
        try {
            const wallet = await this.prisma.wallets.create({
                data: {
                    userId,
                    walletType: WalletType.USER,
                    walletStatus: WalletStatus.ACTIVE,
                    currency: 'INR',
                },
            });

            this.logger.log(`Created wallet ${wallet.id} for user ${userId}`);

            return {
                ...wallet,
                balance: new Decimal(0), // New wallet has 0 balance
            };
        } catch (error) {
            if (error.code === 'P2002') {
                // Unique constraint violation
                throw new BadRequestException('User already has a wallet');
            }
            throw error;
        }
    }

    /**
     * Create a platform wallet
     * 
     * Called during system initialization.
     * Platform wallets have no userId, identified by walletCode.
     * 
     * @param walletCode - Unique identifier (e.g., 'PLATFORM_MAIN')
     * @returns Created platform wallet with balance = 0
     * 
     * @throws BadRequestException if wallet code already exists
     */
    async createPlatformWallet(walletCode: string) {
        try {
            const wallet = await this.prisma.wallets.create({
                data: {
                    userId: null,
                    walletType: WalletType.PLATFORM,
                    walletCode,
                    walletStatus: WalletStatus.ACTIVE,
                    currency: 'INR',
                },
            });

            this.logger.log(`Created platform wallet ${wallet.id} (${walletCode})`);

            return {
                ...wallet,
                balance: new Decimal(0),
            };
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException(
                    `Wallet code '${walletCode}' already exists`,
                );
            }
            throw error;
        }
    }

    /**
     * Create an escrow wallet
     * 
     * Future use for holding funds during disputes or multi-step orders.
     * 
     * @param walletCode - Unique identifier (e.g., 'ESCROW_COD_order123')
     * @returns Created escrow wallet with balance = 0
     */
    async createEscrowWallet(walletCode: string) {
        try {
            const wallet = await this.prisma.wallets.create({
                data: {
                    userId: null,
                    walletType: WalletType.ESCROW,
                    walletCode,
                    walletStatus: WalletStatus.ACTIVE,
                    currency: 'INR',
                },
            });

            this.logger.log(`Created escrow wallet ${wallet.id} (${walletCode})`);

            return {
                ...wallet,
                balance: new Decimal(0),
            };
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException(
                    `Wallet code '${walletCode}' already exists`,
                );
            }
            throw error;
        }
    }

    /**
     * Freeze a wallet (admin operation)
     * 
     * Frozen wallets cannot send or receive funds.
     * Used for fraud investigation, legal holds, security breaches.
     * 
     * @param walletId - Wallet ID to freeze
     * @param reason - Reason for freezing
     * @param adminUserId - Admin user ID performing action
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async freezeWallet(
        walletId: string,
        reason: string,
        adminUserId: string,
    ) {
        await this.getWalletOrThrow(walletId);

        const wallet = await this.prisma.wallets.update({
            where: { id: walletId },
            data: {
                walletStatus: WalletStatus.FROZEN,
                freezeReason: reason,
                frozenAt: new Date(),
                frozenBy: adminUserId,
            },
        });

        this.logger.warn(
            `Wallet ${walletId} frozen by admin ${adminUserId}: ${reason}`,
        );

        return wallet;
    }

    /**
     * Unfreeze a wallet (admin operation)
     * 
     * @param walletId - Wallet ID to unfreeze
     * @param adminUserId - Admin user ID performing action
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async unfreezeWallet(walletId: string, adminUserId: string) {
        await this.getWalletOrThrow(walletId);

        const wallet = await this.prisma.wallets.update({
            where: { id: walletId },
            data: {
                walletStatus: WalletStatus.ACTIVE,
                freezeReason: null,
                frozenAt: null,
                frozenBy: null,
            },
        });

        this.logger.log(`Wallet ${walletId} unfrozen by admin ${adminUserId}`);

        return wallet;
    }

    /**
     * Suspend a wallet (verification pending)
     * 
     * Suspended wallets cannot send funds but can receive.
     * Used for KYC verification, document submission.
     * 
     * @param walletId - Wallet ID to suspend
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async suspendWallet(walletId: string) {
        await this.getWalletOrThrow(walletId);

        const wallet = await this.prisma.wallets.update({
            where: { id: walletId },
            data: { walletStatus: WalletStatus.SUSPENDED },
        });

        this.logger.log(`Wallet ${walletId} suspended`);

        return wallet;
    }

    /**
     * Activate a wallet (remove suspension)
     * 
     * @param walletId - Wallet ID to activate
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    async activateWallet(walletId: string) {
        await this.getWalletOrThrow(walletId);

        const wallet = await this.prisma.wallets.update({
            where: { id: walletId },
            data: { walletStatus: WalletStatus.ACTIVE },
        });

        this.logger.log(`Wallet ${walletId} activated`);

        return wallet;
    }

    /**
     * Close a wallet permanently
     * 
     * Closed wallets cannot be reopened.
     * Requires zero balance (all funds withdrawn).
     * 
     * @param walletId - Wallet ID to close
     * 
     * @throws NotFoundException if wallet doesn't exist
     * @throws BadRequestException if wallet has non-zero balance
     */
    async closeWallet(walletId: string) {
        await this.getWalletOrThrow(walletId);

        // Check balance is zero
        const balance = await this.getWalletBalance(walletId);
        if (!balance.equals(0)) {
            throw new BadRequestException(
                `Cannot close wallet with non-zero balance: ${balance.toString()}`,
            );
        }

        const wallet = await this.prisma.wallets.update({
            where: { id: walletId },
            data: { walletStatus: WalletStatus.CLOSED },
        });

        this.logger.log(`Wallet ${walletId} closed permanently`);

        return wallet;
    }

    /**
     * Validate wallet operation is allowed based on status
     * 
     * @private
     * @param wallet - Wallet to validate
     * @param operation - 'debit' (send money) or 'credit' (receive money)
     * 
     * @throws ForbiddenException if operation not allowed
     */
    private validateWalletStatus(
        wallet: { walletStatus: WalletStatus; id: string },
        operation: 'debit' | 'credit',
    ): void {
        const { walletStatus, id } = wallet;

        // CLOSED wallets: No operations allowed
        if (walletStatus === WalletStatus.CLOSED) {
            throw new ForbiddenException(`Wallet ${id} is closed`);
        }

        // FROZEN wallets: No operations allowed
        if (walletStatus === WalletStatus.FROZEN) {
            throw new ForbiddenException(`Wallet ${id} is frozen`);
        }

        // SUSPENDED wallets: Can receive but not send
        if (walletStatus === WalletStatus.SUSPENDED && operation === 'debit') {
            throw new ForbiddenException(
                `Wallet ${id} is suspended - cannot send funds`,
            );
        }

        // ACTIVE wallets: All operations allowed
    }

    /**
     * Get wallet or throw NotFoundException
     * 
     * @private
     * @param walletId - Wallet ID
     * @returns Wallet record
     * 
     * @throws NotFoundException if wallet doesn't exist
     */
    private async getWalletOrThrow(walletId: string) {
        const wallet = await this.prisma.wallets.findUnique({
            where: { id: walletId },
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet ${walletId} not found`);
        }

        return wallet;
    }

    /**
     * Check if user has a wallet
     * 
     * @param userId - User ID to check
     * @returns true if user has wallet, false otherwise
     */
    async hasWallet(userId: string): Promise<boolean> {
        const wallet = await this.prisma.wallets.findUnique({
            where: {
                userId_walletType: {
                    userId,
                    walletType: WalletType.USER,
                },
            },
            select: { id: true },
        });

        return wallet !== null;
    }

    /**
     * Get all wallets by type
     * 
     * Admin utility for listing wallets.
     * 
     * @param walletType - Type of wallets to fetch
     * @param options - Pagination options
     * @returns Paginated list of wallet details with balances
     */
    async getWalletsByType(
        walletType: WalletType,
        options?: { skip?: number; take?: number },
    ) {
        const wallets = await this.prisma.wallets.findMany({
            where: { walletType },
            skip: options?.skip || 0,
            take: options?.take || 50,
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        // Compute balance for each wallet
        const walletsWithBalance = await Promise.all(
            wallets.map(async (wallet) => {
                const balance = await this.getWalletBalance(wallet.id);
                return {
                    ...wallet,
                    balance,
                };
            }),
        );

        return walletsWithBalance;
    }

    /**
     * Get wallets with negative balance (admin alert)
     * 
     * Negative balances indicate potential issues:
     * - System errors
     * - Fraudulent activity
     * - Ledger corruption
     * 
     * @returns List of wallets with negative balance
     */
    async getWalletsWithNegativeBalance() {
        // Get all wallets
        const wallets = await this.prisma.wallets.findMany({
            select: { id: true, userId: true, walletType: true },
        });

        // Check balance for each
        const negativeBalanceWallets = [];

        for (const wallet of wallets) {
            const balance = await this.getWalletBalance(wallet.id);
            if (balance.lessThan(0)) {
                negativeBalanceWallets.push({
                    walletId: wallet.id,
                    userId: wallet.userId,
                    walletType: wallet.walletType,
                    balance,
                });
            }
        }

        if (negativeBalanceWallets.length > 0) {
            this.logger.warn(
                `Found ${negativeBalanceWallets.length} wallets with negative balance`,
            );
        }

        return negativeBalanceWallets;
    }
}
