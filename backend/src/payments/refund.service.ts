import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { WalletService } from './wallet.service';
import { LedgerService, CreateLedgerEntryInput } from './ledger.service';
import { RefundStatus, LedgerEntryType, PaymentLifecycle } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Refund initiation context
 */
export interface InitiateRefundDto {
    paymentId: string;
    amount: Decimal;
    reason: string;
    description?: string; // Detailed explanation
    evidence?: string[]; // Photos, documents (URLs)
    refundPlatformFee?: boolean; // Default: false (platform keeps fee)
    requestedBy: string; // User ID who initiated refund (buyer)
}

/**
 * RefundService
 * 
 * Orchestrates refund lifecycle and coordinates financial reversal operations.
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * This service is an ORCHESTRATOR, not a ledger.
 * - It does NOT compute balances (WalletService does)
 * - It does NOT directly mutate money (LedgerService does)
 * - It coordinates validation, payment lookup, and ledger recording
 * 
 * REFUND LIFECYCLE:
 * PENDING → APPROVED → PROCESSING → COMPLETED
 *     ↓          ↓
 * REJECTED   FAILED (terminal state)
 * 
 * REFUND PRECONDITIONS:
 * 1. Payment MUST be in CAPTURED state
 * 2. Refund amount MUST be <= original payment amount
 * 3. Multiple refunds allowed, but total refunded <= payment.amount
 * 4. Cannot refund CANCELLED or FAILED payments
 * 5. Seller wallet MUST have sufficient balance
 * 
 * LEDGER ENTRY PATTERN (Refund):
 * 
 * WITHOUT Platform Fee Refund (default):
 * Entry 1: Seller wallet DEBIT (-refundAmount)
 * Entry 2: Buyer wallet CREDIT (+refundAmount)
 * Sum: -refundAmount + refundAmount = 0 ✅
 * 
 * WITH Platform Fee Refund (refundPlatformFee = true):
 * Entry 1: Seller wallet DEBIT (-refundAmount + platformFeeRefund)
 * Entry 2: Buyer wallet CREDIT (+refundAmount)
 * Entry 3: Platform wallet DEBIT (-platformFeeRefund)
 * Sum: -(refundAmount - fee) + refundAmount + (-fee) = 0 ✅
 * 
 * FINANCIAL GUARANTEES:
 * 1. Idempotency: All operations use unique idempotencyKey
 * 2. Atomicity: Ledger entries created in single transaction
 * 3. Invariant: Sum of ledger entries per transactionId = 0
 * 4. Validation: Payment state, amounts, and wallet balances checked
 * 5. Auditability: All state changes logged with timestamps
 * 
 * PAYMENT LIFECYCLE UPDATE:
 * - Full refund (total refunded = payment.amount): Payment → REFUNDED
 * - Partial refund (total refunded < payment.amount): Payment remains CAPTURED
 * 
 * DEPENDENCIES:
 * - PaymentService: Payment state validation
 * - WalletService: Wallet validation and retrieval
 * - LedgerService: Immutable ledger recording
 * 
 * NOT RESPONSIBLE FOR:
 * - Payment processing (use PaymentService)
 * - Wallet creation (use WalletService)
 * - Fee calculation (reuse stored payment values)
 */
@Injectable()
export class RefundService {
    private readonly logger = new Logger(RefundService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentService: PaymentService,
        private readonly walletService: WalletService,
        private readonly ledgerService: LedgerService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Initiate refund for a captured payment
     * 
     * FINANCIAL GUARANTEE: Creates refund request in PENDING state
     * - Awaits admin approval before processing
     * - No ledger entries created until processRefund()
     * 
     * @param dto Refund initiation context
     * @returns Created refund record
     * @throws NotFoundException if payment not found
     * @throws BadRequestException if payment not captured or amount invalid
     * @throws ConflictException if total refunds exceed payment amount
     */
    async initiateRefund(dto: InitiateRefundDto) {
        this.logger.log({
            message: 'Initiating refund',
            paymentId: dto.paymentId,
            amount: dto.amount.toString(),
            reason: dto.reason,
            requestedBy: dto.requestedBy,
        });

        // 1. Validate payment exists and is in correct state
        const payment = await this.prisma.payments.findUnique({
            where: { id: dto.paymentId },
            include: {
                orders: {
                    select: {
                        id: true,
                        buyerId: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException(`Payment ${dto.paymentId} not found`);
        }

        // Payment must be CAPTURED to be refundable
        if (payment.lifecycle !== PaymentLifecycle.CAPTURED) {
            throw new BadRequestException(
                `Cannot refund payment in ${payment.lifecycle} state. Only CAPTURED payments can be refunded.`
            );
        }

        // 2. Validate refund amount
        if (dto.amount.lte(0)) {
            throw new BadRequestException('Refund amount must be greater than zero');
        }

        if (dto.amount.gt(payment.amount)) {
            throw new BadRequestException(
                `Refund amount ${dto.amount} exceeds payment amount ${payment.amount}`
            );
        }

        // 3. Check total refunds don't exceed payment amount
        const existingRefunds = await this.prisma.refunds.findMany({
            where: {
                paymentId: dto.paymentId,
                status: { in: [RefundStatus.APPROVED, RefundStatus.PROCESSING, RefundStatus.COMPLETED] },
            },
        });

        const totalRefunded = existingRefunds.reduce(
            (sum, refund) => sum.add(refund.amount),
            new Decimal(0)
        );

        const newTotalRefunded = totalRefunded.add(dto.amount);

        if (newTotalRefunded.gt(payment.amount)) {
            throw new ConflictException(
                `Total refund amount ${newTotalRefunded} would exceed payment amount ${payment.amount}. Already refunded: ${totalRefunded}`
            );
        }

        // 4. Get wallets (issuer = seller/payee, recipient = buyer/payer)
        const issuerWallet = payment.payeeWalletId; // Seller pays refund
        const recipientWallet = payment.payerWalletId; // Buyer receives refund

        // 5. Create refund record in PENDING state (awaiting approval)
        const refund = await this.prisma.refunds.create({
            data: {
                id: `refund-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                paymentId: dto.paymentId,
                orderId: payment.orderId,
                amount: dto.amount,
                reason: dto.reason,
                description: dto.description,
                evidence: dto.evidence || [],
                refundPlatformFee: dto.refundPlatformFee || false,
                issuerWalletId: issuerWallet,
                recipientWalletId: recipientWallet,
                requestedBy: dto.requestedBy,
                requestedAt: new Date(),
                updatedAt: new Date(),
                status: RefundStatus.PENDING,
            },
        });

        this.logger.log({
            message: 'Refund initiated and awaiting approval',
            refundId: refund.id,
            paymentId: dto.paymentId,
            orderId: payment.orderId,
            amount: dto.amount.toString(),
            status: refund.status,
        });

        // Emit refund.initiated event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('refund.initiated', {
                refundId: refund.id,
                paymentId: dto.paymentId,
                orderId: payment.orderId,
                amount: dto.amount.toNumber(),
                currency: 'USD',
                reason: dto.reason,
                requestedBy: dto.requestedBy,
                requestedAt: refund.requestedAt?.toISOString(),
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'refund.initiated',
                refundId: refund.id,
                error: error.message,
            });
        }

        return refund;
    }

    /**
     * Approve refund (admin action)
     * 
     * @param refundId Refund ID
     * @param approvedBy Admin user ID
     * @returns Updated refund record
     * @throws NotFoundException if refund not found
     * @throws BadRequestException if refund not in PENDING state
     */
    async approveRefund(refundId: string, approvedBy: string) {
        this.logger.log({
            message: 'Approving refund',
            refundId,
            approvedBy,
        });

        const refund = await this.prisma.refunds.findUnique({
            where: { id: refundId },
        });

        if (!refund) {
            throw new NotFoundException(`Refund ${refundId} not found`);
        }

        if (refund.status !== RefundStatus.PENDING) {
            throw new BadRequestException(
                `Cannot approve refund in ${refund.status} state. Only PENDING refunds can be approved.`
            );
        }

        const updatedRefund = await this.prisma.refunds.update({
            where: { id: refundId },
            data: {
                status: RefundStatus.APPROVED,
                approvedBy,
                approvedAt: new Date(),
            },
        });

        this.logger.log({
            message: 'Refund approved',
            refundId,
            paymentId: refund.paymentId,
            orderId: refund.orderId,
            amount: refund.amount.toString(),
            approvedBy,
        });

        return updatedRefund;
    }

    /**
     * Reject refund (admin action)
     * 
     * @param refundId Refund ID
     * @param rejectedBy Admin user ID
     * @param reason Rejection reason
     * @returns Updated refund record
     * @throws NotFoundException if refund not found
     * @throws BadRequestException if refund not in PENDING state
     */
    async rejectRefund(refundId: string, rejectedBy: string, reason: string) {
        this.logger.log({
            message: 'Rejecting refund',
            refundId,
            rejectedBy,
            reason,
        });

        const refund = await this.prisma.refunds.findUnique({
            where: { id: refundId },
        });

        if (!refund) {
            throw new NotFoundException(`Refund ${refundId} not found`);
        }

        if (refund.status !== RefundStatus.PENDING) {
            throw new BadRequestException(
                `Cannot reject refund in ${refund.status} state. Only PENDING refunds can be rejected.`
            );
        }

        const updatedRefund = await this.prisma.refunds.update({
            where: { id: refundId },
            data: {
                status: RefundStatus.REJECTED,
                rejectedBy,
                rejectedAt: new Date(),
                rejectionReason: reason,
            },
        });

        this.logger.log({
            message: 'Refund rejected',
            refundId,
            paymentId: refund.paymentId,
            orderId: refund.orderId,
            amount: refund.amount.toString(),
            rejectedBy,
            reason,
        });

        return updatedRefund;
    }

    /**
     * Process approved refund and record ledger entries
     * 
     * FINANCIAL GUARANTEE: Atomic ledger recording with invariant enforcement
     * - Seller wallet debited
     * - Buyer wallet credited
     * - Platform wallet debited (if refundPlatformFee = true)
     * - Sum of all entries = 0 (enforced by LedgerService)
     * - Operation is idempotent (safe to retry)
     * 
     * @param refundId Refund ID to process
     * @returns Updated refund record
     * @throws NotFoundException if refund not found
     * @throws BadRequestException if refund not in APPROVED state
     * @throws BadRequestException if seller has insufficient balance
     */
    async processRefund(refundId: string) {
        this.logger.log({
            message: 'Processing refund',
            refundId,
        });

        // 1. Load refund with payment details
        const refund = await this.prisma.refunds.findUnique({
            where: { id: refundId },
            include: {
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        orderId: true,
                        lifecycle: true,
                        platformFeeAmount: true,
                        platformFeePercent: true,
                    },
                },
            },
        });

        if (!refund) {
            throw new NotFoundException(`Refund ${refundId} not found`);
        }

        // Refund must be APPROVED to be processed
        if (refund.status !== RefundStatus.APPROVED) {
            throw new BadRequestException(
                `Cannot process refund in ${refund.status} state. Only APPROVED refunds can be processed.`
            );
        }

        const payment = refund.payments;

        // 2. Check idempotency via ledger entries
        const existingLedgerEntries = await this.prisma.ledger_entries.findMany({
            where: { refundId },
        });

        if (existingLedgerEntries.length > 0) {
            this.logger.warn(`Refund ${refundId} already has ledger entries (idempotent)`);
            // Return existing completed refund
            const existingRefund = await this.prisma.refunds.findUnique({
                where: { id: refundId },
            });
            if (existingRefund && existingRefund.status === RefundStatus.COMPLETED) {
                return existingRefund;
            }
        }

        // 3. Calculate platform fee to refund if requested
        let platformFeeRefundAmount = new Decimal(0);
        if (refund.refundPlatformFee && payment.platformFeeAmount) {
            // Calculate proportional platform fee refund
            const refundRatio = refund.amount.div(payment.amount);
            platformFeeRefundAmount = payment.platformFeeAmount.mul(refundRatio);
        }

        // 4. Get wallets
        const issuerWallet = await this.prisma.wallets.findUnique({
            where: { id: refund.issuerWalletId },
        });

        const recipientWallet = await this.prisma.wallets.findUnique({
            where: { id: refund.recipientWalletId },
        });

        if (!issuerWallet || !recipientWallet) {
            throw new NotFoundException('Wallet not found for refund processing');
        }

        // 5. Get platform wallet if refunding platform fee
        let platformWallet = null;
        if (refund.refundPlatformFee && platformFeeRefundAmount.gt(0)) {
            platformWallet = await this.walletService.getPlatformWallet('PLATFORM_MAIN');
        }

        // 6. Validate seller has sufficient balance
        // Seller needs: refundAmount (to return to buyer)
        // If refundPlatformFee = false, seller covers full refund
        // If refundPlatformFee = true, seller covers (refundAmount - platformFeeRefund)
        const sellerRequiredBalance = refund.refundPlatformFee
            ? refund.amount.sub(platformFeeRefundAmount)
            : refund.amount;

        const sellerBalance = await this.walletService.getWalletBalance(issuerWallet.id);
        if (sellerBalance.lt(sellerRequiredBalance)) {
            throw new BadRequestException(
                `Insufficient balance in seller wallet. Required: ${sellerRequiredBalance}, Available: ${sellerBalance}`
            );
        }

        // 7. If refunding platform fee, validate platform has sufficient balance
        if (platformWallet && platformFeeRefundAmount.gt(0)) {
            const platformBalance = await this.walletService.getWalletBalance(platformWallet.id);
            if (platformBalance.lt(platformFeeRefundAmount)) {
                throw new BadRequestException(
                    `Insufficient balance in platform wallet for fee refund. Required: ${platformFeeRefundAmount}, Available: ${platformBalance}`
                );
            }
        }

        // 8. Update refund status to PROCESSING
        await this.prisma.refunds.update({
            where: { id: refundId },
            data: {
                status: RefundStatus.PROCESSING,
                processedAt: new Date(),
            },
        });

        try {
            // 9. Create ledger entries
            const transactionId = `refund-${refundId}`;
            const ledgerEntries: CreateLedgerEntryInput[] = [];

            if (refund.refundPlatformFee && platformFeeRefundAmount.gt(0) && platformWallet) {
                // WITH Platform Fee Refund (3 entries)
                // Entry 1: Seller wallet DEBIT (-(refundAmount - platformFeeRefund))
                ledgerEntries.push({
                    walletId: issuerWallet.id,
                    amount: refund.amount.sub(platformFeeRefundAmount).neg(),
                    entryType: LedgerEntryType.REFUND_DEBIT,
                    description: `Refund to buyer (partial seller cost)`,
                    refundId,
                    orderId: payment.orderId,
                    paymentId: payment.id,
                });

                // Entry 2: Buyer wallet CREDIT (+refundAmount)
                ledgerEntries.push({
                    walletId: recipientWallet.id,
                    amount: refund.amount,
                    entryType: LedgerEntryType.REFUND_CREDIT,
                    description: `Refund received`,
                    refundId,
                    orderId: payment.orderId,
                    paymentId: payment.id,
                });

                // Entry 3: Platform wallet DEBIT (-platformFeeRefund)
                ledgerEntries.push({
                    walletId: platformWallet.id,
                    amount: platformFeeRefundAmount.neg(),
                    entryType: LedgerEntryType.PLATFORM_FEE_DEBIT,
                    description: `Platform fee refund`,
                    refundId,
                    orderId: payment.orderId,
                    paymentId: payment.id,
                });
            } else {
                // WITHOUT Platform Fee Refund (2 entries)
                // Entry 1: Seller wallet DEBIT (-refundAmount)
                ledgerEntries.push({
                    walletId: issuerWallet.id,
                    amount: refund.amount.neg(),
                    entryType: LedgerEntryType.REFUND_DEBIT,
                    description: `Refund to buyer`,
                    refundId,
                    orderId: payment.orderId,
                    paymentId: payment.id,
                });

                // Entry 2: Buyer wallet CREDIT (+refundAmount)
                ledgerEntries.push({
                    walletId: recipientWallet.id,
                    amount: refund.amount,
                    entryType: LedgerEntryType.REFUND_CREDIT,
                    description: `Refund received`,
                    refundId,
                    orderId: payment.orderId,
                    paymentId: payment.id,
                });
            }

            // Record entries atomically with invariant enforcement
            await this.ledgerService.recordEntries(ledgerEntries, transactionId);

            // 10. Update refund status to COMPLETED
            const completedRefund = await this.prisma.refunds.update({
                where: { id: refundId },
                data: {
                    status: RefundStatus.COMPLETED,
                    completedAt: new Date(),
                },
            });

            // 11. Check if payment is fully refunded
            const totalRefunded = await this.getTotalRefunded(payment.id);

            // If fully refunded, update payment lifecycle to REFUNDED
            if (totalRefunded.gte(payment.amount)) {
                await this.prisma.payments.update({
                    where: { id: payment.id },
                    data: { lifecycle: PaymentLifecycle.REFUNDED },
                });

                this.logger.log({
                    message: 'Payment fully refunded',
                    paymentId: payment.id,
                    orderId: payment.orderId,
                    totalRefunded: totalRefunded.toString(),
                    paymentAmount: payment.amount.toString(),
                });
            }

            this.logger.log({
                message: 'Refund completed successfully',
                refundId,
                paymentId: payment.id,
                orderId: refund.orderId,
                transactionId,
                amount: refund.amount.toString(),
                refundPlatformFee: refund.refundPlatformFee,
            });

            // Emit refund.completed event (async, post-commit)
            try {
                await this.eventEmitter.emitAsync('refund.completed', {
                    refundId: completedRefund.id,
                    paymentId: payment.id,
                    orderId: refund.orderId,
                    amount: refund.amount.toNumber(),
                    currency: 'USD',
                    refundPlatformFee: refund.refundPlatformFee,
                    platformFeeRefundAmount: platformFeeRefundAmount.toNumber(),
                    completedAt: completedRefund.completedAt?.toISOString(),
                });
            } catch (error) {
                this.logger.error({
                    event: 'event_emission_failed',
                    eventType: 'refund.completed',
                    refundId,
                    error: error.message,
                });
            }

            return completedRefund;
        } catch (error) {
            // If ledger recording fails, mark refund as FAILED
            this.logger.error({
                message: 'Failed to process refund',
                refundId,
                error: error.message,
                stack: error.stack,
            });

            await this.prisma.refunds.update({
                where: { id: refundId },
                data: {
                    status: RefundStatus.FAILED,
                    failureReason: error.message,
                },
            });

            throw error;
        }
    }

    /**
     * Mark refund as failed
     * 
     * @param refundId Refund ID
     * @param reason Failure reason
     * @returns Updated refund record
     * @throws NotFoundException if refund not found
     */
    async failRefund(refundId: string, reason: string) {
        this.logger.log(`Failing refund ${refundId}: ${reason}`);

        const refund = await this.prisma.refunds.findUnique({
            where: { id: refundId },
        });

        if (!refund) {
            throw new NotFoundException(`Refund ${refundId} not found`);
        }

        // Only fail refunds that are INITIATED or PROCESSING
        if (refund.status === RefundStatus.COMPLETED) {
            throw new BadRequestException('Cannot fail a completed refund');
        }

        if (refund.status === RefundStatus.FAILED) {
            this.logger.warn(`Refund ${refundId} already failed`);
            return refund;
        }

        return await this.prisma.refunds.update({
            where: { id: refundId },
            data: {
                status: RefundStatus.FAILED,
                failureReason: reason,
            },
        });
    }

    /**
     * Get refund by ID
     * 
     * @param refundId Refund ID
     * @returns Refund record with payment details
     * @throws NotFoundException if refund not found
     */
    async getRefund(refundId: string) {
        const refund = await this.prisma.refunds.findUnique({
            where: { id: refundId },
            include: {
                payments: {
                    include: {
                        orders: true,
                    },
                },
            },
        });

        if (!refund) {
            throw new NotFoundException(`Refund ${refundId} not found`);
        }

        return refund;
    }

    /**
     * Get all refunds for a payment
     * 
     * @param paymentId Payment ID
     * @returns Array of refunds ordered by creation date
     */
    async getRefundsByPayment(paymentId: string) {
        return await this.prisma.refunds.findMany({
            where: { paymentId },
            orderBy: { createdAt: 'desc' },
            include: {
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        lifecycle: true,
                        orderId: true,
                    },
                },
            },
        });
    }

    /**
     * Get total refunded amount for a payment
     * 
     * @param paymentId Payment ID
     * @returns Total refunded amount (completed refunds only)
     */
    async getTotalRefunded(paymentId: string): Promise<Decimal> {
        const completedRefunds = await this.prisma.refunds.findMany({
            where: {
                paymentId,
                status: RefundStatus.COMPLETED,
            },
        });

        return completedRefunds.reduce(
            (sum, refund) => sum.add(refund.amount),
            new Decimal(0)
        );
    }

    /**
     * Check if payment is refundable
     * 
     * @param paymentId Payment ID
     * @returns Object with refundable status and available amount
     */
    async checkRefundable(paymentId: string) {
        const payment = await this.prisma.payments.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException(`Payment ${paymentId} not found`);
        }

        // Payment must be CAPTURED
        if (payment.lifecycle !== PaymentLifecycle.CAPTURED) {
            return {
                refundable: false,
                reason: `Payment is in ${payment.lifecycle} state. Only CAPTURED payments can be refunded.`,
                availableAmount: new Decimal(0),
            };
        }

        // Calculate available amount
        const totalRefunded = await this.getTotalRefunded(paymentId);
        const availableAmount = payment.amount.sub(totalRefunded);

        if (availableAmount.lte(0)) {
            return {
                refundable: false,
                reason: 'Payment has been fully refunded',
                availableAmount: new Decimal(0),
            };
        }

        return {
            refundable: true,
            availableAmount,
            totalRefunded,
            originalAmount: payment.amount,
        };
    }

    /**
     * Get refund statistics for a user (buyer perspective)
     * 
     * @param buyerId User ID
     * @returns Refund statistics
     */
    async getUserRefundStatistics(buyerId: string) {
        const refunds = await this.prisma.refunds.findMany({
            where: {
                requestedBy: buyerId,
            },
        });

        const totalRefunded = refunds
            .filter(r => r.status === RefundStatus.COMPLETED)
            .reduce((sum, r) => sum.add(r.amount), new Decimal(0));

        return {
            totalRefunds: refunds.length,
            pendingRefunds: refunds.filter(r => r.status === RefundStatus.PENDING).length,
            approvedRefunds: refunds.filter(r => r.status === RefundStatus.APPROVED).length,
            completedRefunds: refunds.filter(r => r.status === RefundStatus.COMPLETED).length,
            rejectedRefunds: refunds.filter(r => r.status === RefundStatus.REJECTED).length,
            failedRefunds: refunds.filter(r => r.status === RefundStatus.FAILED).length,
            totalRefunded,
        };
    }

    /**
     * Get refund statistics for wallets owned by a seller
     * 
     * @param issuerWalletId Seller wallet ID
     * @returns Refund statistics
     */
    async getWalletRefundStatistics(issuerWalletId: string) {
        const refunds = await this.prisma.refunds.findMany({
            where: {
                issuerWalletId,
            },
        });

        const totalRefunded = refunds
            .filter(r => r.status === RefundStatus.COMPLETED)
            .reduce((sum, r) => sum.add(r.amount), new Decimal(0));

        return {
            totalRefunds: refunds.length,
            pendingRefunds: refunds.filter(r => r.status === RefundStatus.PENDING).length,
            approvedRefunds: refunds.filter(r => r.status === RefundStatus.APPROVED).length,
            completedRefunds: refunds.filter(r => r.status === RefundStatus.COMPLETED).length,
            rejectedRefunds: refunds.filter(r => r.status === RefundStatus.REJECTED).length,
            failedRefunds: refunds.filter(r => r.status === RefundStatus.FAILED).length,
            totalRefunded,
        };
    }
}
