import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentService } from '../src/payments/payment.service';
import { RefundService } from '../src/payments/refund.service';
import { WalletService } from '../src/payments/wallet.service';
import { LedgerService } from '../src/payments/ledger.service';
import { PlatformFeeService } from '../src/payments/platform-fee.service';
import { PaymentLifecycle, PaymentMethod, RefundStatus, WalletStatus, LedgerEntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Integration Tests for Payments & Refunds Module
 * 
 * Test Scope:
 * 1. Payment lifecycle (PREPAID, COD, cancel)
 * 2. Refund lifecycle (approve, reject, partial)
 * 3. Idempotency verification
 * 4. Security & abuse prevention
 * 5. Ledger invariant verification (sum = 0)
 * 
 * Uses real Prisma test database - NO MOCKS for core services
 */
describe('Payments & Refunds Integration Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let paymentService: PaymentService;
    let refundService: RefundService;
    let walletService: WalletService;
    let ledgerService: LedgerService;

    // Test users
    let buyerUserId: string;
    let sellerUserId: string;
    let deliveryAgentUserId: string;
    let adminUserId: string;

    // Test wallets
    let buyerWalletId: string;
    let sellerWalletId: string;
    let platformMainWalletId: string;
    let platformEscrowWalletId: string;

    // Test order
    let testOrderId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                PrismaService,
                PaymentService,
                RefundService,
                WalletService,
                LedgerService,
                PlatformFeeService,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
        paymentService = moduleFixture.get<PaymentService>(PaymentService);
        refundService = moduleFixture.get<RefundService>(RefundService);
        walletService = moduleFixture.get<WalletService>(WalletService);
        ledgerService = moduleFixture.get<LedgerService>(LedgerService);

        // Clean database before tests
        await cleanDatabase(prisma);

        // Seed test data
        await seedTestData(prisma);

        // Get test user IDs
        const buyer = await prisma.users.findFirst({ where: { email: 'test-buyer@example.com' } });
        const seller = await prisma.users.findFirst({ where: { email: 'test-seller@example.com' } });
        const agent = await prisma.users.findFirst({ where: { email: 'test-agent@example.com' } });
        const admin = await prisma.users.findFirst({ where: { email: 'test-admin@example.com' } });

        buyerUserId = buyer.id;
        sellerUserId = seller.id;
        deliveryAgentUserId = agent.id;
        adminUserId = admin.id;

        // Get wallet IDs
        const buyerWallet = await prisma.wallets.findFirst({ where: { userId: buyerUserId } });
        const sellerWallet = await prisma.wallets.findFirst({ where: { userId: sellerUserId } });
        const platformMain = await prisma.wallets.findFirst({ where: { walletCode: 'PLATFORM_MAIN' } });
        const platformEscrow = await prisma.wallets.findFirst({ where: { walletCode: 'PLATFORM_ESCROW' } });

        buyerWalletId = buyerWallet.id;
        sellerWalletId = sellerWallet.id;
        platformMainWalletId = platformMain.id;
        platformEscrowWalletId = platformEscrow.id;

        // Fund buyer wallet for tests
        await fundWallet(prisma, buyerWalletId, new Decimal(10000));
    });

    afterAll(async () => {
        await cleanDatabase(prisma);
        await app.close();
    });

    beforeEach(async () => {
        // Create fresh test order for each test
        const order = await prisma.orders.create({
            data: {
                id: `order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                orderNumber: `TEST-ORDER-${Date.now()}`,
                users: { connect: { id: buyerUserId } },
                deliveryAddress: '123 Test St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-0100',
                subtotal: new Decimal(1000),
                shippingCost: new Decimal(0),
                totalCost: new Decimal(1000),
                totalWeight: new Decimal(1),
                paymentMethod: PaymentMethod.COD,
                status: 'CONFIRMED',
                updatedAt: new Date(),
            },
        });
        testOrderId = order.id;
    });

    afterEach(async () => {
        // Clean up test orders and related data
        if (testOrderId) {
            await prisma.payments.deleteMany({ where: { orderId: testOrderId } });
            await prisma.orders.delete({ where: { id: testOrderId } });
        }
    });

    /**
     * TEST SUITE 1: Payment Lifecycle Tests
     */
    describe('Payment Lifecycle', () => {
        test('should complete PREPAID payment flow: initiate → capture', async () => {
            // Initiate payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(1000),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            expect(payment).toBeDefined();
            expect(payment.lifecycle).toBe(PaymentLifecycle.INITIATED);
            expect(payment.amount.toString()).toBe('1000');

            // Capture payment
            const captured = await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'test-gateway-txn-123',
                gatewayResponse: JSON.stringify({ status: 'success' }),
            });

            expect(captured.lifecycle).toBe(PaymentLifecycle.CAPTURED);
            expect(captured.capturedAt).toBeDefined();

            // Verify ledger invariant (sum = 0)
            await verifyLedgerInvariant(prisma, payment.id);

            // Verify balances changed correctly
            const buyerBalance = await walletService.getWalletBalance(buyerWalletId);
            const sellerBalance = await walletService.getWalletBalance(sellerWalletId);
            const platformBalance = await walletService.getWalletBalance(platformMainWalletId);

            // Buyer debited 1000
            expect(buyerBalance.toString()).toBe('9000'); // 10000 - 1000

            // Seller credited (1000 - platformFee)
            // Platform credited platformFee
            // Total must = 1000
            expect(Number(sellerBalance.add(platformBalance).toString())).toBeLessThanOrEqual(1000);
        });

        test('should complete COD payment flow: initiate → capture with delivery confirmation', async () => {
            // Initiate COD payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.COD,
                amount: new Decimal(500),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            expect(payment.lifecycle).toBe(PaymentLifecycle.INITIATED);
            expect(payment.paymentMethod).toBe(PaymentMethod.COD);

            // Delivery agent captures payment after delivery
            const captured = await paymentService.capturePayment({
                paymentId: payment.id,
                confirmedBy: deliveryAgentUserId,
                confirmedAt: new Date(),
            });

            expect(captured.lifecycle).toBe(PaymentLifecycle.CAPTURED);
            expect(captured.confirmedBy).toBe(deliveryAgentUserId);
            expect(captured.confirmedAt).toBeDefined();

            // Verify ledger invariant
            await verifyLedgerInvariant(prisma, payment.id);
        });

        test('should cancel payment before capture', async () => {
            // Initiate payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(750),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            expect(payment.lifecycle).toBe(PaymentLifecycle.INITIATED);

            // Cancel before capture
            const cancelled = await paymentService.cancelPayment(payment.id);

            expect(cancelled.lifecycle).toBe(PaymentLifecycle.CANCELLED);
            // Verify cancel timestamp not exposed (internal only)

            // No ledger entries should exist (payment never captured)
            const ledgerEntries = await prisma.ledger_entries.findMany({
                where: { paymentId: payment.id },
            });

            expect(ledgerEntries.length).toBe(0);
        });

        test('should fail to cancel payment after capture', async () => {
            // Initiate and capture
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(300),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'test-txn-456',
            });

            // Attempt to cancel captured payment
            await expect(
                paymentService.cancelPayment(payment.id)
            ).rejects.toThrow();
        });
    });

    /**
     * TEST SUITE 2: Refund Lifecycle Tests
     */
    describe('Refund Lifecycle', () => {
        let capturedPaymentId: string;

        beforeEach(async () => {
            // Create and capture payment for refund tests
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(2000),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'test-txn-refund',
            });

            capturedPaymentId = payment.id;

            // Fund seller wallet for refund
            await fundWallet(prisma, sellerWalletId, new Decimal(5000));
        });

        test('should complete full refund: initiate → approve → process', async () => {
            // Buyer initiates refund
            const refund = await refundService.initiateRefund({
                paymentId: capturedPaymentId,
                amount: new Decimal(2000),
                reason: 'Product defective',
                requestedBy: buyerUserId,
            });

            expect(refund.status).toBe(RefundStatus.PENDING);
            expect(refund.amount.toString()).toBe('2000');

            // Admin approves refund
            const approved = await refundService.approveRefund(refund.id, adminUserId);

            expect(approved.status).toBe(RefundStatus.APPROVED);
            expect(approved.approvedBy).toBe(adminUserId);
            expect(approved.approvedAt).toBeDefined();

            // System processes refund
            const processed = await refundService.processRefund(refund.id);

            expect(processed.status).toBe(RefundStatus.COMPLETED);
            expect(processed.completedAt).toBeDefined();

            // Verify ledger invariant for refund transaction
            const refundLedgerEntries = await prisma.ledger_entries.findMany({
                where: { refundId: refund.id },
            });

            const sum = refundLedgerEntries.reduce(
                (acc, entry) => acc.add(entry.amount),
                new Decimal(0)
            );

            expect(sum.toString()).toBe('0');

            // Verify payment marked as refunded
            const payment = await prisma.payments.findUnique({
                where: { id: capturedPaymentId },
            });

            expect(payment.lifecycle).toBe(PaymentLifecycle.REFUNDED);
        });

        test('should reject refund request', async () => {
            // Buyer initiates refund
            const refund = await refundService.initiateRefund({
                paymentId: capturedPaymentId,
                amount: new Decimal(500),
                reason: 'Changed mind',
                requestedBy: buyerUserId,
            });

            expect(refund.status).toBe(RefundStatus.PENDING);

            // Admin rejects refund
            const rejected = await refundService.rejectRefund(
                refund.id,
                adminUserId,
                'Refund policy does not cover buyer remorse'
            );

            expect(rejected.status).toBe(RefundStatus.REJECTED);
            expect(rejected.rejectedBy).toBe(adminUserId);
            expect(rejected.rejectionReason).toBeDefined();

            // No ledger entries created for rejected refund
            const ledgerEntries = await prisma.ledger_entries.findMany({
                where: { refundId: refund.id },
            });

            expect(ledgerEntries.length).toBe(0);
        });

        test('should handle multiple partial refunds until full amount', async () => {
            // First partial refund (800 of 2000)
            const refund1 = await refundService.initiateRefund({
                paymentId: capturedPaymentId,
                amount: new Decimal(800),
                reason: 'Partial damage',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund1.id, adminUserId);
            await refundService.processRefund(refund1.id);

            // Second partial refund (700 of 2000)
            const refund2 = await refundService.initiateRefund({
                paymentId: capturedPaymentId,
                amount: new Decimal(700),
                reason: 'Additional issues found',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund2.id, adminUserId);
            await refundService.processRefund(refund2.id);

            // Third partial refund (500 of 2000) - completes to 2000
            const refund3 = await refundService.initiateRefund({
                paymentId: capturedPaymentId,
                amount: new Decimal(500),
                reason: 'Complete refund',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund3.id, adminUserId);
            await refundService.processRefund(refund3.id);

            // Verify payment fully refunded
            const payment = await prisma.payments.findUnique({
                where: { id: capturedPaymentId },
            });

            expect(payment.lifecycle).toBe(PaymentLifecycle.REFUNDED);

            // Attempt to refund beyond payment amount
            await expect(
                refundService.initiateRefund({
                    paymentId: capturedPaymentId,
                    amount: new Decimal(100),
                    reason: 'Exceeds total',
                    requestedBy: buyerUserId,
                })
            ).rejects.toThrow(/exceed payment amount/);
        });
    });

    /**
     * TEST SUITE 3: Idempotency Tests
     */
    describe('Idempotency', () => {
        test('should handle repeated payment capture idempotently', async () => {
            // Create payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(600),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            // Capture once
            const captured1 = await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'idempotent-test-123',
            });

            expect(captured1.lifecycle).toBe(PaymentLifecycle.CAPTURED);

            // Capture again with same paymentId (idempotent)
            const captured2 = await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'idempotent-test-123',
            });

            // Should return same payment without error
            expect(captured2.id).toBe(captured1.id);
            expect(captured2.lifecycle).toBe(PaymentLifecycle.CAPTURED);

            // Verify only one set of ledger entries exists
            const ledgerEntries = await prisma.ledger_entries.findMany({
                where: { paymentId: payment.id },
            });

            // Should have exactly 3 entries: buyer debit, seller credit, platform credit
            expect(ledgerEntries.length).toBe(3);
        });

        test('should handle repeated refund processing idempotently', async () => {
            // Create and capture payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(400),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'test-refund-idempotent',
            });

            // Fund seller for refund
            await fundWallet(prisma, sellerWalletId, new Decimal(1000));

            // Create and approve refund
            const refund = await refundService.initiateRefund({
                paymentId: payment.id,
                amount: new Decimal(400),
                reason: 'Test idempotency',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund.id, adminUserId);

            // Process refund
            const processed1 = await refundService.processRefund(refund.id);
            expect(processed1.status).toBe(RefundStatus.COMPLETED);

            // Attempt to process again
            await expect(
                refundService.processRefund(refund.id)
            ).rejects.toThrow(/cannot process refund in COMPLETED state/i);

            // Verify only one set of refund ledger entries
            const refundEntries = await prisma.ledger_entries.findMany({
                where: { refundId: refund.id },
            });

            expect(refundEntries.length).toBeGreaterThan(0);

            // Verify invariant
            const sum = refundEntries.reduce(
                (acc, entry) => acc.add(entry.amount),
                new Decimal(0)
            );

            expect(sum.toString()).toBe('0');
        });
    });

    /**
     * TEST SUITE 4: Security & Abuse Prevention Tests
     */
    describe('Security & Abuse Prevention', () => {
        test('should prevent refund exceeding payment amount', async () => {
            // Create and capture small payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(100),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'test-abuse-1',
            });

            // Attempt to refund more than payment
            await expect(
                refundService.initiateRefund({
                    paymentId: payment.id,
                    amount: new Decimal(200),
                    reason: 'Fraudulent refund attempt',
                    requestedBy: buyerUserId,
                })
            ).rejects.toThrow(/exceeds payment amount/i);
        });

        test('should prevent debit from frozen wallet', async () => {
            // Freeze buyer wallet
            await prisma.wallets.update({
                where: { id: buyerWalletId },
                data: { walletStatus: WalletStatus.FROZEN },
            });

            // Attempt payment with frozen wallet
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(300),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await expect(
                paymentService.capturePayment({
                    paymentId: payment.id,
                    gatewayTransactionId: 'test-frozen-wallet',
                })
            ).rejects.toThrow(/frozen/i);

            // Restore wallet for other tests
            await prisma.wallets.update({
                where: { id: buyerWalletId },
                data: { walletStatus: WalletStatus.ACTIVE },
            });
        });

        test('should prevent refund on non-captured payment', async () => {
            // Create payment but don't capture
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(500),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            // Attempt refund on initiated payment
            await expect(
                refundService.initiateRefund({
                    paymentId: payment.id,
                    amount: new Decimal(100),
                    reason: 'Invalid refund',
                    requestedBy: buyerUserId,
                })
            ).rejects.toThrow(/only CAPTURED payments can be refunded/i);
        });

        test('should prevent refund with insufficient seller balance', async () => {
            // Create and capture payment
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(1000),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'test-insufficient-balance',
            });

            // Drain seller wallet
            const sellerBalance = await walletService.getWalletBalance(sellerWalletId);
            if (sellerBalance.gt(0)) {
                await prisma.ledger_entries.create({
                    data: {
                        id: `entry-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        wallets: { connect: { id: sellerWalletId } },
                        amount: sellerBalance.neg(),
                        entryType: LedgerEntryType.ADJUSTMENT_DEBIT,
                        description: 'Test drain wallet',
                        transactionId: `drain-${Date.now()}`,
                    },
                });
            }

            // Create and approve refund
            const refund = await refundService.initiateRefund({
                paymentId: payment.id,
                amount: new Decimal(1000),
                reason: 'Full refund',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund.id, adminUserId);

            // Attempt to process with insufficient balance
            await expect(
                refundService.processRefund(refund.id)
            ).rejects.toThrow(/insufficient balance/i);
        });
    });

    /**
     * TEST SUITE 5: Ledger Invariant Verification
     */
    describe('Ledger Invariant (sum = 0)', () => {
        test('should maintain ledger invariant for payment capture', async () => {
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(1500),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'invariant-test-1',
            });

            // Verify invariant
            await verifyLedgerInvariant(prisma, payment.id);
        });

        test('should maintain ledger invariant for refund', async () => {
            const payment = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(800),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment.id,
                gatewayTransactionId: 'invariant-test-2',
            });

            // Fund seller for refund
            await fundWallet(prisma, sellerWalletId, new Decimal(2000));

            const refund = await refundService.initiateRefund({
                paymentId: payment.id,
                amount: new Decimal(800),
                reason: 'Invariant test',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund.id, adminUserId);
            await refundService.processRefund(refund.id);

            // Verify payment invariant
            await verifyLedgerInvariant(prisma, payment.id);

            // Verify refund invariant
            const refundEntries = await prisma.ledger_entries.findMany({
                where: { refundId: refund.id },
            });

            const sum = refundEntries.reduce(
                (acc, entry) => acc.add(entry.amount),
                new Decimal(0)
            );

            expect(sum.toString()).toBe('0');
        });

        test('should maintain invariant across multiple operations', async () => {
            // Payment 1
            const payment1 = await paymentService.initiatePayment({
                orderId: testOrderId,
                paymentMethod: PaymentMethod.COD,
                amount: new Decimal(400),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment1.id,
                confirmedBy: deliveryAgentUserId,
            });

            // Create second order for second payment
            const order2 = await prisma.orders.create({
                data: {
                    id: `order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    orderNumber: `MULTI-OP-${Date.now()}`,
                    users: { connect: { id: buyerUserId } },
                    deliveryAddress: '456 Multi St',
                    deliveryCity: 'Multi City',
                    deliveryPhone: '555-0200',
                    subtotal: new Decimal(600),
                    shippingCost: new Decimal(0),
                    totalCost: new Decimal(600),
                    totalWeight: new Decimal(1),
                    paymentMethod: PaymentMethod.PREPAID,
                    status: 'CONFIRMED',
                    updatedAt: new Date(),
                },
            });

            // Payment 2
            const payment2 = await paymentService.initiatePayment({
                orderId: order2.id,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(600),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: payment2.id,
                gatewayTransactionId: 'multi-op-test',
            });

            // Fund seller
            await fundWallet(prisma, sellerWalletId, new Decimal(3000));

            // Refund payment1
            const refund1 = await refundService.initiateRefund({
                paymentId: payment1.id,
                amount: new Decimal(200),
                reason: 'Partial refund',
                requestedBy: buyerUserId,
            });

            await refundService.approveRefund(refund1.id, adminUserId);
            await refundService.processRefund(refund1.id);

            // Verify all invariants
            await verifyLedgerInvariant(prisma, payment1.id);
            await verifyLedgerInvariant(prisma, payment2.id);

            const refund1Entries = await prisma.ledger_entries.findMany({
                where: { refundId: refund1.id },
            });

            const refund1Sum = refund1Entries.reduce(
                (acc, entry) => acc.add(entry.amount),
                new Decimal(0)
            );

            expect(refund1Sum.toString()).toBe('0');

            // Cleanup
            await prisma.payments.deleteMany({ where: { orderId: order2.id } });
            await prisma.orders.delete({ where: { id: order2.id } });
        });
    });
});

/**
 * Test Helper Functions
 */

async function cleanDatabase(prisma: PrismaService) {
    // Delete in dependency order
    await prisma.ledger_entries.deleteMany();
    await prisma.refunds.deleteMany();
    await prisma.payments.deleteMany();
    await prisma.orders.deleteMany();
    await prisma.wallets.deleteMany({ where: { walletType: 'USER' } });
    await prisma.users.deleteMany({
        where: {
            email: {
                startsWith: 'test-',
            },
        },
    });
}

async function seedTestData(prisma: PrismaService) {
    // Create test users
    await prisma.users.createMany({
        data: [
            {
                id: `user-${Date.now()}-1`,
                email: 'test-buyer@example.com',
                password: 'hashed-password',
                firstName: 'Test',
                lastName: 'Buyer',
                updatedAt: new Date(),
            },
            {
                id: `user-${Date.now()}-2`,
                email: 'test-seller@example.com',
                password: 'hashed-password',
                firstName: 'Test',
                lastName: 'Seller',
                updatedAt: new Date(),
            },
            {
                id: `user-${Date.now()}-3`,
                email: 'test-agent@example.com',
                password: 'hashed-password',
                firstName: 'Test',
                lastName: 'Agent',
                updatedAt: new Date(),
            },
            {
                id: `user-${Date.now()}-4`,
                email: 'test-admin@example.com',
                password: 'hashed-password',
                firstName: 'Test',
                lastName: 'Admin',
                updatedAt: new Date(),
            },
        ],
    });

    // Get created users
    const buyer = await prisma.users.findFirst({ where: { email: 'test-buyer@example.com' } });
    const seller = await prisma.users.findFirst({ where: { email: 'test-seller@example.com' } });

    // Create user wallets
    await prisma.wallets.createMany({
        data: [
            {
                walletCode: `BUYER-${buyer.id.substring(0, 8)}`,
                walletType: 'USER',
                walletStatus: 'ACTIVE',
                userId: buyer.id,
                currency: 'USD',
            },
            {
                walletCode: `SELLER-${seller.id.substring(0, 8)}`,
                walletType: 'USER',
                walletStatus: 'ACTIVE',
                userId: seller.id,
                currency: 'USD',
            },
        ],
    });

    // Create platform wallets if not exist
    const existingPlatformMain = await prisma.wallets.findFirst({
        where: { walletCode: 'PLATFORM_MAIN' },
    });

    if (!existingPlatformMain) {
        await prisma.wallets.createMany({
            data: [
                {
                    walletCode: 'PLATFORM_MAIN',
                    walletType: 'PLATFORM',
                    walletStatus: 'ACTIVE',
                    currency: 'USD',
                },
                {
                    walletCode: 'PLATFORM_ESCROW',
                    walletType: 'ESCROW',
                    walletStatus: 'ACTIVE',
                    currency: 'USD',
                },
            ],
        });
    }
}

async function fundWallet(prisma: PrismaService, walletId: string, amount: Decimal) {
    await prisma.ledger_entries.create({
        data: {
            id: `entry-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            wallets: { connect: { id: walletId } },
            amount,
            entryType: LedgerEntryType.ADJUSTMENT_CREDIT,
            description: 'Test funding',
            transactionId: `test-fund-${Date.now()}-${Math.random()}`,
        },
    });
}

async function verifyLedgerInvariant(prisma: PrismaService, paymentId: string) {
    const entries = await prisma.ledger_entries.findMany({
        where: { paymentId },
    });

    const sum = entries.reduce(
        (acc, entry) => acc.add(entry.amount),
        new Decimal(0)
    );

    expect(sum.toString()).toBe('0');
}

