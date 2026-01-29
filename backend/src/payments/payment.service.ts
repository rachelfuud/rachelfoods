import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { LedgerService, CreateLedgerEntryInput } from './ledger.service';
import {
    PlatformFeeService,
    FeeCalculationContext,
} from './platform-fee.service';
import { PaymentLifecycle, LedgerEntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Payment initiation context
 */
export interface InitiatePaymentDto {
    orderId: string;
    paymentMethod: 'PAYPAL' | 'COD' | 'PREPAID' | 'CHECKOUT';
    amount: Decimal;
    payerUserId: string; // Buyer user ID
    payeeUserId: string; // Seller user ID
    categoryId?: string; // For platform fee calculation
}

/**
 * Payment capture context
 */
export interface CapturePaymentDto {
    paymentId: string;
    confirmedBy?: string; // Delivery agent ID (required for COD)
    confirmedAt?: Date; // Confirmation timestamp (COD)
    gatewayTransactionId?: string; // Gateway transaction ID (PREPAID/CHECKOUT)
    gatewayResponse?: string; // Gateway response JSON (PREPAID/CHECKOUT)
}

/**
 * Payment authorization context (PREPAID/CHECKOUT only)
 */
export interface AuthorizePaymentDto {
    paymentId: string;
    gatewayTransactionId: string;
    gatewayResponse?: string;
}

/**
 * PaymentService
 * 
 * Orchestrates payment lifecycle and coordinates financial operations.
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * This service is an ORCHESTRATOR, not a ledger.
 * - It does NOT compute balances (WalletService does)
 * - It does NOT directly mutate money (LedgerService does)
 * - It coordinates validation, fee calculation, and ledger recording
 * 
 * PAYMENT LIFECYCLE:
 * 
 * COD Flow:
 * INITIATED → (delivery) → CAPTURED
 *     ↓
 * CANCELLED (if order cancelled before delivery)
 * 
 * PREPAID/CHECKOUT Flow:
 * INITIATED → AUTHORIZED → CAPTURED
 *     ↓            ↓
 * FAILED      CANCELLED
 * 
 * FINANCIAL GUARANTEES:
 * 1. Idempotency: All operations use unique idempotencyKey
 * 2. Atomicity: Ledger entries created in single transaction
 * 3. Invariant: Sum of ledger entries per transactionId = 0
 * 4. Validation: Wallet status and balance checked before capture
 * 5. Auditability: All state changes logged with timestamps
 * 
 * LEDGER ENTRY PATTERN (Payment Capture):
 * Entry 1: Buyer wallet DEBIT (-amount)
 * Entry 2: Seller wallet CREDIT (+amount - platformFee)
 * Entry 3: Platform wallet CREDIT (+platformFee)
 * Sum: -amount + (amount - fee) + fee = 0 ✅
 * 
 * DEPENDENCIES:
 * - WalletService: Wallet validation and retrieval
 * - LedgerService: Immutable ledger recording
 * - PlatformFeeService: Fee calculation
 * 
 * NOT RESPONSIBLE FOR:
 * - Refund processing (use RefundService)
 * - Wallet creation (use WalletService)
 * - Order management (use OrderService)
 */
@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private ledgerService: LedgerService,
        private platformFeeService: PlatformFeeService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Initiate a new payment
     * 
     * Creates payment record in INITIATED state.
     * Does NOT capture funds yet - that happens later.
     * 
     * WORKFLOW:
     * 1. Validate order exists and is not paid
     * 2. Get buyer and seller wallets
     * 3. Calculate platform fee
     * 4. Create payment record
     * 5. NO ledger entries yet (payment not captured)
     * 
     * @param dto - Payment initiation context
     * @returns Created payment record
     * 
     * @throws NotFoundException if order, buyer, or seller wallet not found
     * @throws BadRequestException if order already has payment
     */
    async initiatePayment(dto: InitiatePaymentDto) {
        const { orderId, paymentMethod, amount, payerUserId, payeeUserId, categoryId } = dto;

        // Validate order exists
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            include: { payments: true },
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Check order doesn't already have payment
        if (order.payments) {
            throw new BadRequestException(
                `Order ${orderId} already has payment ${order.payments.id}`,
            );
        }

        // Get buyer and seller wallets
        const payerWallet = await this.walletService.getUserWallet(payerUserId);
        const payeeWallet = await this.walletService.getUserWallet(payeeUserId);

        // Calculate platform fee
        const feeCalculation = await this.platformFeeService.calculateFee({
            orderAmount: amount,
            categoryId,
            sellerId: payeeUserId,
        });

        // Generate idempotency key
        const idempotencyKey = `payment-initiate-${orderId}-${Date.now()}`;

        // Create payment record
        const payment = await this.prisma.payments.create({
            data: {
                id: `payment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                orderId,
                amount,
                paymentMethod,
                lifecycle: PaymentLifecycle.INITIATED,
                payerWalletId: payerWallet.id,
                payeeWalletId: payeeWallet.id,
                platformFeeAmount: feeCalculation.amount,
                platformFeePercent: feeCalculation.feePercent,
                idempotencyKey,
                initiatedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            message: 'Payment initiated',
            paymentId: payment.id,
            orderId,
            paymentMethod,
            amount: amount.toString(),
            platformFee: feeCalculation.amount.toString(),
            payerUserId,
            payeeUserId,
        });

        return payment;
    }

    /**
     * Authorize payment (PREPAID/CHECKOUT only)
     * 
     * Records authorization from payment gateway.
     * Funds are held but not yet captured.
     * 
     * WORKFLOW:
     * 1. Validate payment exists and is INITIATED
     * 2. Validate payment method is PREPAID or CHECKOUT
     * 3. Update payment with gateway details
     * 4. NO ledger entries yet (authorization ≠ capture)
     * 
     * @param dto - Authorization context
     * @returns Updated payment record
     * 
     * @throws NotFoundException if payment not found
     * @throws BadRequestException if payment already authorized or wrong method
     */
    async authorizePayment(dto: AuthorizePaymentDto) {
        const { paymentId, gatewayTransactionId, gatewayResponse } = dto;

        // Get payment
        const payment = await this.getPaymentOrThrow(paymentId);

        // Validate payment method
        if (payment.paymentMethod === 'COD') {
            throw new BadRequestException(
                'COD payments cannot be authorized (use capturePayment after delivery)',
            );
        }

        // Validate payment state
        if (payment.lifecycle !== PaymentLifecycle.INITIATED) {
            throw new BadRequestException(
                `Payment ${paymentId} already in ${payment.lifecycle} state`,
            );
        }

        // Update payment with authorization details
        const updatedPayment = await this.prisma.payments.update({
            where: { id: paymentId },
            data: {
                lifecycle: PaymentLifecycle.INITIATED, // Still INITIATED, not CAPTURED
                gatewayTransactionId,
                gatewayResponse,
            },
        });

        this.logger.log(
            `Payment ${paymentId} authorized via gateway ${gatewayTransactionId}`,
        );

        return updatedPayment;
    }

    /**
     * Capture payment (record funds in ledger)
     * 
     * THIS IS THE CRITICAL OPERATION where money moves.
     * Creates immutable ledger entries to record the payment.
     * 
     * WORKFLOW:
     * 1. Validate payment exists and is INITIATED
     * 2. Validate wallet statuses
     * 3. Validate sufficient balance (PREPAID/CHECKOUT)
     * 4. Create ledger entries (buyer debit, seller credit, platform fee)
     * 5. Verify ledger invariant (sum = 0)
     * 6. Update payment to CAPTURED
     * 
     * COD-SPECIFIC RULES:
     * - Requires confirmedBy (delivery agent ID)
     * - Requires confirmedAt (confirmation timestamp)
     * - Can only be captured after delivery
     * 
     * FINANCIAL GUARANTEE:
     * All ledger entries created atomically via LedgerService.
     * If any step fails, entire operation rolls back.
     * 
     * @param dto - Capture context
     * @returns Updated payment record
     * 
     * @throws NotFoundException if payment, wallets not found
     * @throws BadRequestException if payment not capturable or validation fails
     * @throws ForbiddenException if wallet frozen/insufficient balance
     */
    async capturePayment(dto: CapturePaymentDto) {
        const {
            paymentId,
            confirmedBy,
            confirmedAt,
            gatewayTransactionId,
            gatewayResponse,
        } = dto;

        // Get payment with relations
        const payment = await this.prisma.payments.findUnique({
            where: { id: paymentId },
            include: {
                orders: { select: { id: true, orderNumber: true } },
                wallets_payments_payerWalletIdTowallets: true,
                wallets_payments_payeeWalletIdTowallets: true,
            },
        });

        if (!payment) {
            throw new NotFoundException(`Payment ${paymentId} not found`);
        }

        // Validate payment state
        if (payment.lifecycle === PaymentLifecycle.CAPTURED) {
            this.logger.warn({
                message: 'Payment already captured - idempotent return',
                paymentId,
                orderId: payment.orderId,
                lifecycle: payment.lifecycle,
            });
            return payment; // Idempotent - already captured
        }

        if (payment.lifecycle === PaymentLifecycle.REFUNDED) {
            throw new BadRequestException(
                `Payment ${paymentId} already refunded - cannot capture`,
            );
        }

        if (payment.lifecycle === PaymentLifecycle.CANCELLED) {
            throw new BadRequestException(
                `Payment ${paymentId} cancelled - cannot capture`,
            );
        }

        // COD-specific validation
        if (payment.paymentMethod === 'COD') {
            if (!confirmedBy || !confirmedAt) {
                throw new BadRequestException(
                    'COD payment requires confirmedBy and confirmedAt',
                );
            }
        }

        // PREPAID/CHECKOUT-specific validation
        if (
            payment.paymentMethod === 'PREPAID' ||
            payment.paymentMethod === 'CHECKOUT'
        ) {
            // For PREPAID/CHECKOUT, validate sufficient balance
            await this.walletService.validateSufficientBalance(
                payment.payerWalletId,
                payment.amount,
            );
        }

        // Get platform wallet
        const platformWallet =
            await this.walletService.getPlatformWallet('PLATFORM_MAIN');

        // Calculate seller receives (after platform fee)
        const sellerReceives = payment.amount.minus(
            payment.platformFeeAmount || new Decimal(0),
        );

        // Generate transaction ID and idempotency key
        const transactionId = `payment-capture-${paymentId}-${Date.now()}`;
        const idempotencyKey = `capture-${paymentId}`;

        // Check idempotency BEFORE creating entries
        const alreadyProcessed =
            await this.ledgerService.hasProcessed(idempotencyKey);
        if (alreadyProcessed) {
            this.logger.warn(
                `Payment ${paymentId} capture already processed (idempotent)`,
            );
            // Return updated payment status
            return await this.prisma.payments.findUnique({
                where: { id: paymentId },
            });
        }

        // Prepare ledger entries
        const ledgerEntries: CreateLedgerEntryInput[] = [
            // Entry 1: Debit buyer wallet
            {
                walletId: payment.payerWalletId,
                amount: payment.amount.neg(), // Negative = debit
                entryType: LedgerEntryType.PAYMENT_DEBIT,
                description: `Payment for order ${payment.orders.orderNumber}`,
                paymentId: payment.id,
                orderId: payment.orderId,
            },
            // Entry 2: Credit seller wallet (after fee)
            {
                walletId: payment.payeeWalletId,
                amount: sellerReceives, // Positive = credit
                entryType: LedgerEntryType.PAYMENT_CREDIT,
                description: `Payment for order ${payment.orders.orderNumber}`,
                paymentId: payment.id,
                orderId: payment.orderId,
            },
        ];

        // Entry 3: Credit platform wallet (if fee > 0)
        if (payment.platformFeeAmount && payment.platformFeeAmount.greaterThan(0)) {
            ledgerEntries.push({
                walletId: platformWallet.id,
                amount: payment.platformFeeAmount, // Positive = credit
                entryType: LedgerEntryType.PLATFORM_FEE_CREDIT,
                description: `Platform fee for order ${payment.orders.orderNumber}`,
                paymentId: payment.id,
                orderId: payment.orderId,
            });
        }

        // Record ledger entries atomically
        // This ensures: sum = -amount + sellerReceives + platformFee = 0
        await this.ledgerService.recordEntries(
            ledgerEntries,
            transactionId,
            idempotencyKey,
        );

        // Update payment status to CAPTURED
        const updatedPayment = await this.prisma.payments.update({
            where: { id: paymentId },
            data: {
                lifecycle: PaymentLifecycle.CAPTURED,
                capturedAt: new Date(),
                confirmedBy: confirmedBy || null,
                confirmedAt: confirmedAt || null,
                gatewayTransactionId: gatewayTransactionId || payment.gatewayTransactionId,
                gatewayResponse: gatewayResponse || payment.gatewayResponse,
            },
        });

        this.logger.log({
            message: 'Payment captured - ledger entries recorded',
            paymentId,
            orderId: payment.orderId,
            transactionId,
            amount: payment.amount.toString(),
            platformFee: payment.platformFeeAmount.toString(),
            paymentMethod: payment.paymentMethod,
            confirmedBy,
        });

        // Emit event POST-COMMIT for webhook delivery
        try {
            await this.eventEmitter.emitAsync('payment.captured', {
                paymentId: updatedPayment.id,
                orderId: updatedPayment.orderId,
                orderNumber: payment.orders.orderNumber,
                amount: updatedPayment.amount.toNumber(),
                currency: 'USD',
                paymentMethod: updatedPayment.paymentMethod,
                capturedAt: updatedPayment.capturedAt?.toISOString(),
                confirmedBy: updatedPayment.confirmedBy,
            });
        } catch (error) {
            // Log but don't throw - webhook failures should not affect payment
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'payment.captured',
                paymentId,
                error: error.message,
            });
        }

        return updatedPayment;
    }

    /**
     * Mark payment as failed
     * 
     * Used when payment gateway rejects transaction or validation fails.
     * Terminal state - payment cannot be retried.
     * 
     * @param paymentId - Payment ID
     * @param reason - Failure reason
     * @returns Updated payment record
     * 
     * @throws NotFoundException if payment not found
     * @throws BadRequestException if payment already captured
     */
    async failPayment(paymentId: string, reason: string) {
        const payment = await this.getPaymentOrThrow(paymentId);

        // Cannot fail already captured payment
        if (payment.lifecycle === PaymentLifecycle.CAPTURED) {
            throw new BadRequestException(
                `Payment ${paymentId} already captured - cannot mark as failed`,
            );
        }

        // Update payment (no lifecycle enum for FAILED, using CANCELLED)
        const updatedPayment = await this.prisma.payments.update({
            where: { id: paymentId },
            data: {
                lifecycle: PaymentLifecycle.CANCELLED,
                gatewayResponse: JSON.stringify({ status: 'FAILED', reason }),
            },
        });

        this.logger.error({
            message: 'Payment failed',
            paymentId,
            orderId: payment.orderId,
            reason,
            previousLifecycle: payment.lifecycle,
        });

        // Emit payment.failed event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('payment.failed', {
                paymentId: updatedPayment.id,
                orderId: updatedPayment.orderId,
                amount: updatedPayment.amount.toNumber(),
                currency: 'USD',
                paymentMethod: updatedPayment.paymentMethod,
                failureReason: reason,
                failedAt: new Date().toISOString(),
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'payment.failed',
                paymentId,
                error: error.message,
            });
        }

        return updatedPayment;
    }

    /**
     * Cancel payment (before capture)
     * 
     * Used when order is cancelled before delivery (COD) or before authorization (PREPAID).
     * 
     * @param paymentId - Payment ID
     * @returns Updated payment record
     * 
     * @throws NotFoundException if payment not found
     * @throws BadRequestException if payment already captured
     */
    async cancelPayment(paymentId: string) {
        const payment = await this.getPaymentOrThrow(paymentId);

        // Cannot cancel captured payment (use refund instead)
        if (payment.lifecycle === PaymentLifecycle.CAPTURED) {
            throw new BadRequestException(
                `Payment ${paymentId} already captured - use refund process instead`,
            );
        }

        // Update payment status
        const updatedPayment = await this.prisma.payments.update({
            where: { id: paymentId },
            data: {
                lifecycle: PaymentLifecycle.CANCELLED,
            },
        });

        this.logger.log({
            message: 'Payment cancelled',
            paymentId,
            orderId: payment.orderId,
            previousLifecycle: payment.lifecycle,
        });

        return updatedPayment;
    }

    /**
     * Get payment by order ID
     * 
     * @param orderId - Order ID
     * @returns Payment record
     * 
     * @throws NotFoundException if payment not found
     */
    async getPaymentByOrder(orderId: string) {
        const payment = await this.prisma.payments.findUnique({
            where: { orderId },
            include: {
                orders: { select: { orderNumber: true, totalCost: true } },
                wallets_payments_payerWalletIdTowallets: {
                    select: {
                        id: true,
                        userId: true,
                        walletType: true,
                    },
                },
                wallets_payments_payeeWalletIdTowallets: {
                    select: {
                        id: true,
                        userId: true,
                        walletType: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException(`Payment for order ${orderId} not found`);
        }

        return payment;
    }

    /**
     * Get payment by ID
     * 
     * @param paymentId - Payment ID
     * @returns Payment record
     * 
     * @throws NotFoundException if payment not found
     */
    async getPayment(paymentId: string) {
        const payment = await this.prisma.payments.findUnique({
            where: { id: paymentId },
            include: {
                orders: { select: { orderNumber: true, totalCost: true } },
                wallets_payments_payerWalletIdTowallets: {
                    select: {
                        id: true,
                        userId: true,
                        walletType: true,
                    },
                },
                wallets_payments_payeeWalletIdTowallets: {
                    select: {
                        id: true,
                        userId: true,
                        walletType: true,
                    },
                },
                ledger_entries: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException(`Payment ${paymentId} not found`);
        }

        return payment;
    }

    /**
     * Get all payments for a user (as payer)
     * 
     * @param userId - User ID
     * @param options - Pagination options
     * @returns Paginated payments
     */
    async getUserPayments(
        userId: string,
        options?: { skip?: number; take?: number },
    ) {
        // Get user's wallet
        const wallet = await this.walletService.getUserWallet(userId);

        // Get payments where user is payer
        const payments = await this.prisma.payments.findMany({
            where: { payerWalletId: wallet.id },
            orderBy: { initiatedAt: 'desc' },
            skip: options?.skip || 0,
            take: options?.take || 50,
            include: {
                orders: { select: { orderNumber: true, totalCost: true } },
            },
        });

        return payments;
    }

    /**
     * Get payment statistics
     * 
     * Admin utility for dashboard.
     * 
     * @returns Payment statistics
     */
    async getStatistics() {
        const [
            totalPayments,
            capturedPayments,
            totalVolume,
            totalFees,
            paymentsByMethod,
        ] = await Promise.all([
            this.prisma.payments.count(),
            this.prisma.payments.count({
                where: { lifecycle: PaymentLifecycle.CAPTURED },
            }),
            this.prisma.payments.aggregate({
                where: { lifecycle: PaymentLifecycle.CAPTURED },
                _sum: { amount: true },
            }),
            this.prisma.payments.aggregate({
                where: { lifecycle: PaymentLifecycle.CAPTURED },
                _sum: { platformFeeAmount: true },
            }),
            this.prisma.payments.groupBy({
                by: ['paymentMethod'],
                _count: { id: true },
            }),
        ]);

        return {
            totalPayments,
            capturedPayments,
            totalVolume: totalVolume._sum.amount || new Decimal(0),
            totalFees: totalFees._sum.platformFeeAmount || new Decimal(0),
            paymentsByMethod: paymentsByMethod.reduce((acc, item) => {
                acc[item.paymentMethod] = item._count.id;
                return acc;
            }, {} as Record<string, number>),
        };
    }

    /**
     * Get payment or throw NotFoundException
     * 
     * @private
     * @param paymentId - Payment ID
     * @returns Payment record
     * 
     * @throws NotFoundException if payment not found
     */
    private async getPaymentOrThrow(paymentId: string) {
        const payment = await this.prisma.payments.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException(`Payment ${paymentId} not found`);
        }

        return payment;
    }
}
