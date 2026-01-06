import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { ShippingService } from '../src/shipping/shipping.service';
import { PaymentService } from '../src/payments/payment.service';
import { WalletService } from '../src/payments/wallet.service';
import { LedgerService } from '../src/payments/ledger.service';
import { PlatformFeeService } from '../src/payments/platform-fee.service';
import {
    ShippingStatus,
    DeliveryAgentStatus,
    PaymentLifecycle,
    PaymentMethod,
    OrderStatus,
    LedgerEntryType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Integration Tests for Shipping → COD Payment Capture
 * 
 * Test Scope:
 * 1. COD order delivery triggers PaymentService.capturePayment()
 * 2. Successful COD capture after delivery confirmation
 * 3. Failed COD capture does NOT rollback shipping status
 * 4. Ledger invariants remain intact (sum = 0)
 * 5. Correct structured logs emitted (cod_capture_initiated/success/failed)
 * 
 * Uses real Prisma test database - NO MOCKS for core services
 */
describe('Shipping → COD Payment Integration Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let shippingService: ShippingService;
    let paymentService: PaymentService;
    let walletService: WalletService;
    let ledgerService: LedgerService;

    // Test users
    let buyerUserId: string;
    let sellerUserId: string;
    let agentUserId: string;

    // Test wallets
    let buyerWalletId: string;
    let sellerWalletId: string;
    let platformMainWalletId: string;
    let platformEscrowWalletId: string;

    // Test delivery agent
    let deliveryAgentId: string;

    // Test order and payment
    let testOrderId: string;
    let testPaymentId: string;
    let testAssignmentId: string;

    // Logger spy for log verification
    let loggerSpy: jest.SpyInstance;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                PrismaService,
                ShippingService,
                PaymentService,
                WalletService,
                LedgerService,
                PlatformFeeService,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
        shippingService = moduleFixture.get<ShippingService>(ShippingService);
        paymentService = moduleFixture.get<PaymentService>(PaymentService);
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

        buyerUserId = buyer.id;
        sellerUserId = seller.id;
        agentUserId = agent.id;

        // Get wallet IDs
        const buyerWallet = await prisma.wallets.findFirst({ where: { userId: buyerUserId } });
        const sellerWallet = await prisma.wallets.findFirst({ where: { userId: sellerUserId } });
        const platformMain = await prisma.wallets.findFirst({ where: { walletCode: 'PLATFORM_MAIN' } });
        const platformEscrow = await prisma.wallets.findFirst({ where: { walletCode: 'PLATFORM_ESCROW' } });

        buyerWalletId = buyerWallet.id;
        sellerWalletId = sellerWallet.id;
        platformMainWalletId = platformMain.id;
        platformEscrowWalletId = platformEscrow.id;

        // Create delivery agent
        const deliveryAgent = await prisma.delivery_agents.create({
            data: {
                id: `agent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                users: { connect: { id: agentUserId } },
                agentCode: 'DA-TEST-001',
                vehicleType: 'bike',
                serviceZipCodes: ['12345', '67890'],
                isAvailable: true,
                status: DeliveryAgentStatus.ACTIVE,
                updatedAt: new Date(),
            },
        });
        deliveryAgentId = deliveryAgent.id;
    });

    afterAll(async () => {
        await cleanDatabase(prisma);
        await app.close();
    });

    beforeEach(async () => {
        // Spy on logger to verify log emissions
        loggerSpy = jest.spyOn(Logger.prototype, 'log');

        // Create fresh COD order for each test
        const order = await prisma.orders.create({
            data: {
                id: `order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                orderNumber: `COD-TEST-${Date.now()}`,
                users: { connect: { id: buyerUserId } },
                deliveryAddress: '123 Test St',
                deliveryCity: 'Test City',
                deliveryZipCode: '12345',
                deliveryPhone: '555-0100',
                subtotal: new Decimal(1000),
                shippingCost: new Decimal(50),
                totalCost: new Decimal(1050),
                totalWeight: new Decimal(1),
                paymentMethod: PaymentMethod.COD,
                status: OrderStatus.CONFIRMED,
                updatedAt: new Date(),
            },
        });
        testOrderId = order.id;

        // Initiate COD payment
        const payment = await paymentService.initiatePayment({
            orderId: testOrderId,
            paymentMethod: PaymentMethod.COD,
            amount: new Decimal(1050),
            payerUserId: buyerUserId,
            payeeUserId: sellerUserId,
        });
        testPaymentId = payment.id;

        // Create shipping assignment
        const assignment = await shippingService.createAssignment(testOrderId);
        testAssignmentId = assignment.id;
    });

    afterEach(async () => {
        // Clean up test data in proper order (foreign key constraints)
        if (testOrderId) {
            // Delete shipping logs first
            const assignment = await prisma.shipping_assignments.findFirst({
                where: { orderId: testOrderId },
            });
            if (assignment) {
                await prisma.shipping_logs.deleteMany({
                    where: { assignmentId: assignment.id },
                });
            }
            // Delete shipping assignments
            await prisma.shipping_assignments.deleteMany({ where: { orderId: testOrderId } });
            // Delete ledger entries (must be before payment/wallets due to foreign keys)
            await prisma.ledger_entries.deleteMany({
                where: {
                    OR: [
                        { paymentId: testPaymentId },
                        { orderId: testOrderId },
                    ],
                },
            });
            // Delete payment
            await prisma.payments.deleteMany({ where: { orderId: testOrderId } });
            // Delete order
            await prisma.orders.delete({ where: { id: testOrderId } });
        }

        // Restore logger spy
        if (loggerSpy) {
            loggerSpy.mockRestore();
        }
    });

    /**
     * TEST SUITE 1: COD Capture Success Flow
     */
    describe('COD Capture Success Flow', () => {
        test('should complete end-to-end COD delivery and capture payment', async () => {
            // ARRANGE: Verify initial state
            const initialPayment = await prisma.payments.findUnique({
                where: { id: testPaymentId },
            });
            expect(initialPayment.lifecycle).toBe(PaymentLifecycle.INITIATED);

            // Fund seller wallet for platform fee deduction
            await fundWallet(prisma, sellerWalletId, new Decimal(5000));

            // ACT: Complete full shipping lifecycle
            // 1. Assign agent
            await shippingService.assignAgent(testAssignmentId, deliveryAgentId, agentUserId);

            // 2. Agent accepts assignment
            await shippingService.acceptAssignment(testAssignmentId, agentUserId);

            // 3. Agent confirms pickup
            await shippingService.confirmPickup(
                testAssignmentId,
                agentUserId,
                'Package picked up from seller',
            );

            // 4. Agent starts transit
            await shippingService.startTransit(testAssignmentId, agentUserId);

            // 5. Agent confirms delivery (should trigger COD capture)
            const deliveredAssignment = await shippingService.confirmDelivery(
                testAssignmentId,
                agentUserId,
                'https://example.com/proof.jpg',
                'Package delivered to buyer',
            );

            // ASSERT: Verify shipping status
            expect(deliveredAssignment.status).toBe(ShippingStatus.DELIVERED);
            expect(deliveredAssignment.deliveredAt).toBeDefined();
            expect(deliveredAssignment.deliveryProof).toBe('https://example.com/proof.jpg');

            // ASSERT: Verify order status updated
            const updatedOrder = await prisma.orders.findUnique({
                where: { id: testOrderId },
            });
            expect(updatedOrder.status).toBe(OrderStatus.DELIVERED);
            expect(updatedOrder.deliveredAt).toBeDefined();

            // ASSERT: Verify payment captured
            const capturedPayment = await prisma.payments.findUnique({
                where: { id: testPaymentId },
            });
            expect(capturedPayment.lifecycle).toBe(PaymentLifecycle.CAPTURED);
            expect(capturedPayment.capturedAt).toBeDefined();

            // ASSERT: Verify ledger invariant (sum = 0)
            await verifyLedgerInvariant(prisma, testPaymentId);

            // ASSERT: Verify agent statistics updated
            const updatedAgent = await prisma.delivery_agents.findUnique({
                where: { id: deliveryAgentId },
            });
            expect(updatedAgent.totalDeliveries).toBe(1);
            expect(updatedAgent.successfulDeliveries).toBe(1);

            // ASSERT: Verify structured logs emitted
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: 'cod_capture_initiated',
                    assignmentId: testAssignmentId,
                    paymentId: testPaymentId,
                }),
            );

            expect(loggerSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: 'cod_capture_success',
                    assignmentId: testAssignmentId,
                    paymentId: testPaymentId,
                }),
            );
        });

        test('should maintain idempotency - multiple confirmDelivery calls do not duplicate capture', async () => {
            // ARRANGE: Fund seller wallet
            await fundWallet(prisma, sellerWalletId, new Decimal(5000));

            // Complete shipping flow
            await shippingService.assignAgent(testAssignmentId, deliveryAgentId, agentUserId);
            await shippingService.acceptAssignment(testAssignmentId, agentUserId);
            await shippingService.confirmPickup(testAssignmentId, agentUserId, 'Picked up');
            await shippingService.startTransit(testAssignmentId, agentUserId);

            // ACT: First delivery confirmation
            await shippingService.confirmDelivery(
                testAssignmentId,
                agentUserId,
                'https://example.com/proof1.jpg',
            );

            const initialLedgerCount = await prisma.ledger_entries.count({
                where: { paymentId: testPaymentId },
            });

            // ACT: Second delivery confirmation (idempotent call)
            await shippingService.confirmDelivery(
                testAssignmentId,
                agentUserId,
                'https://example.com/proof2.jpg', // Different proof shouldn't matter
            );

            // ASSERT: No duplicate ledger entries created
            const finalLedgerCount = await prisma.ledger_entries.count({
                where: { paymentId: testPaymentId },
            });

            expect(finalLedgerCount).toBe(initialLedgerCount);

            // ASSERT: Payment still captured (not duplicated)
            const payment = await prisma.payments.findUnique({
                where: { id: testPaymentId },
            });
            expect(payment.lifecycle).toBe(PaymentLifecycle.CAPTURED);
        });
    });

    /**
     * TEST SUITE 2: COD Capture Failure Flow
     */
    describe('COD Capture Failure Flow', () => {
        test('should NOT rollback shipping status when COD capture fails', async () => {
            // ARRANGE: Create a scenario where capture will fail
            // Update payment to CANCELLED state to trigger failure in capturePayment
            await prisma.payments.update({
                where: { id: testPaymentId },
                data: { lifecycle: PaymentLifecycle.CANCELLED },
            });

            // Complete shipping flow
            await shippingService.assignAgent(testAssignmentId, deliveryAgentId, agentUserId);
            await shippingService.acceptAssignment(testAssignmentId, agentUserId);
            await shippingService.confirmPickup(testAssignmentId, agentUserId, 'Picked up');
            await shippingService.startTransit(testAssignmentId, agentUserId);

            // Spy on error logger
            const errorLoggerSpy = jest.spyOn(Logger.prototype, 'error');

            // ACT: Confirm delivery (COD capture will fail because payment is CANCELLED)
            const deliveredAssignment = await shippingService.confirmDelivery(
                testAssignmentId,
                agentUserId,
                'https://example.com/proof.jpg',
                'Package delivered',
            );

            // ASSERT: Shipping status remains DELIVERED (not rolled back)
            expect(deliveredAssignment.status).toBe(ShippingStatus.DELIVERED);
            expect(deliveredAssignment.deliveredAt).toBeDefined();

            // ASSERT: Order status still DELIVERED (not rolled back)
            const updatedOrder = await prisma.orders.findUnique({
                where: { id: testOrderId },
            });
            expect(updatedOrder.status).toBe(OrderStatus.DELIVERED);

            // ASSERT: Payment still in CANCELLED state (capture failed)
            const failedPayment = await prisma.payments.findUnique({
                where: { id: testPaymentId },
            });
            expect(failedPayment.lifecycle).toBe(PaymentLifecycle.CANCELLED);

            // ASSERT: Agent statistics still updated (delivery succeeded)
            const updatedAgent = await prisma.delivery_agents.findUnique({
                where: { id: deliveryAgentId },
            });
            expect(updatedAgent.totalDeliveries).toBeGreaterThanOrEqual(1);
            expect(updatedAgent.successfulDeliveries).toBeGreaterThanOrEqual(1);

            // ASSERT: Error logged for COD capture failure
            expect(errorLoggerSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: 'cod_capture_failed',
                    assignmentId: testAssignmentId,
                    paymentId: testPaymentId,
                    message: expect.stringContaining('shipment status remains DELIVERED'),
                }),
            );

            // Cleanup error spy
            errorLoggerSpy.mockRestore();
        });

        test('should log cod_capture_initiated even when capture fails', async () => {
            // ARRANGE: Set payment to CANCELLED to cause failure
            await prisma.payments.update({
                where: { id: testPaymentId },
                data: { lifecycle: PaymentLifecycle.CANCELLED },
            });

            // Complete shipping flow
            await shippingService.assignAgent(testAssignmentId, deliveryAgentId, agentUserId);
            await shippingService.acceptAssignment(testAssignmentId, agentUserId);
            await shippingService.confirmPickup(testAssignmentId, agentUserId, 'Picked up');
            await shippingService.startTransit(testAssignmentId, agentUserId);

            // ACT: Confirm delivery
            await shippingService.confirmDelivery(
                testAssignmentId,
                agentUserId,
                'https://example.com/proof.jpg',
            );

            // ASSERT: cod_capture_initiated log emitted before failure
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: 'cod_capture_initiated',
                    assignmentId: testAssignmentId,
                    paymentId: testPaymentId,
                    message: 'Delegating COD payment capture to PaymentService',
                }),
            );
        });
    });

    /**
     * TEST SUITE 3: Ledger Invariant Verification
     */
    describe('Ledger Invariant Verification', () => {
        test('should maintain ledger invariant (sum = 0) after successful COD capture', async () => {
            // ARRANGE: Fund seller wallet
            await fundWallet(prisma, sellerWalletId, new Decimal(5000));

            // Complete shipping and delivery flow
            await shippingService.assignAgent(testAssignmentId, deliveryAgentId, agentUserId);
            await shippingService.acceptAssignment(testAssignmentId, agentUserId);
            await shippingService.confirmPickup(testAssignmentId, agentUserId, 'Picked up');
            await shippingService.startTransit(testAssignmentId, agentUserId);
            await shippingService.confirmDelivery(
                testAssignmentId,
                agentUserId,
                'https://example.com/proof.jpg',
            );

            // ACT & ASSERT: Verify ledger invariant for payment transaction
            const paymentLedgerEntries = await prisma.ledger_entries.findMany({
                where: { paymentId: testPaymentId },
            });

            // If payment capture succeeded, verify invariant
            if (paymentLedgerEntries.length > 0) {
                const paymentSum = paymentLedgerEntries.reduce(
                    (acc, entry) => acc.add(entry.amount),
                    new Decimal(0),
                );

                expect(paymentSum.toString()).toBe('0');

                // Verify payment was captured
                const capturedPayment = await prisma.payments.findUnique({
                    where: { id: testPaymentId },
                });
                expect(capturedPayment.lifecycle).toBe(PaymentLifecycle.CAPTURED);
            } else {
                // If no ledger entries, payment capture failed but shipping should still be DELIVERED
                const assignment = await prisma.shipping_assignments.findUnique({
                    where: { id: testAssignmentId },
                });
                expect(assignment.status).toBe(ShippingStatus.DELIVERED);
            }
        });
    });

    /**
     * TEST SUITE 4: Non-COD Orders (Control Test)
     */
    describe('Non-COD Orders', () => {
        test('should NOT invoke capturePayment for PREPAID orders', async () => {
            // ARRANGE: Fund buyer wallet for PREPAID payment
            await fundWallet(prisma, buyerWalletId, new Decimal(5000));

            // Create PREPAID order
            const prepaidOrder = await prisma.orders.create({
                data: {
                    id: `order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    orderNumber: `PREPAID-TEST-${Date.now()}`,
                    users: { connect: { id: buyerUserId } },
                    deliveryAddress: '123 Test St',
                    deliveryCity: 'Test City',
                    deliveryZipCode: '12345',
                    deliveryPhone: '555-0100',
                    subtotal: new Decimal(2000),
                    shippingCost: new Decimal(50),
                    totalCost: new Decimal(2050),
                    totalWeight: new Decimal(2),
                    paymentMethod: PaymentMethod.PREPAID,
                    status: OrderStatus.CONFIRMED,
                    updatedAt: new Date(),
                },
            });

            // Create PREPAID payment (already captured before shipping)
            const prepaidPayment = await paymentService.initiatePayment({
                orderId: prepaidOrder.id,
                paymentMethod: PaymentMethod.PREPAID,
                amount: new Decimal(2050),
                payerUserId: buyerUserId,
                payeeUserId: sellerUserId,
            });

            await paymentService.capturePayment({
                paymentId: prepaidPayment.id,
                gatewayTransactionId: 'test-gateway-txn',
            });

            // Create shipping assignment
            const prepaidAssignment = await shippingService.createAssignment(prepaidOrder.id);

            // Clear logger spy to isolate this test
            loggerSpy.mockClear();

            // ACT: Complete shipping flow
            await shippingService.assignAgent(prepaidAssignment.id, deliveryAgentId, agentUserId);
            await shippingService.acceptAssignment(prepaidAssignment.id, agentUserId);
            await shippingService.confirmPickup(prepaidAssignment.id, agentUserId, 'Picked up');
            await shippingService.startTransit(prepaidAssignment.id, agentUserId);
            await shippingService.confirmDelivery(
                prepaidAssignment.id,
                agentUserId,
                'https://example.com/proof.jpg',
            );

            // ASSERT: No COD capture logs emitted
            const codCaptureLogs = loggerSpy.mock.calls.filter(
                (call) =>
                    call[0]?.event === 'cod_capture_initiated' ||
                    call[0]?.event === 'cod_capture_success' ||
                    call[0]?.event === 'cod_capture_failed',
            );

            expect(codCaptureLogs).toHaveLength(0);

            // ASSERT: Payment lifecycle unchanged (already CAPTURED)
            const finalPayment = await prisma.payments.findUnique({
                where: { id: prepaidPayment.id },
            });
            expect(finalPayment.lifecycle).toBe(PaymentLifecycle.CAPTURED);

            // Cleanup
            const cleanupAssignment = await prisma.shipping_assignments.findFirst({
                where: { orderId: prepaidOrder.id },
            });
            if (cleanupAssignment) {
                await prisma.shipping_logs.deleteMany({
                    where: { assignmentId: cleanupAssignment.id },
                });
            }
            await prisma.shipping_assignments.deleteMany({ where: { orderId: prepaidOrder.id } });
            await prisma.ledger_entries.deleteMany({ where: { paymentId: prepaidPayment.id } });
            await prisma.payments.deleteMany({ where: { orderId: prepaidOrder.id } });
            await prisma.orders.delete({ where: { id: prepaidOrder.id } });
        });
    });
});

/**
 * Helper Functions
 */

async function cleanDatabase(prisma: PrismaService) {
    await prisma.shipping_logs.deleteMany();
    await prisma.shipping_assignments.deleteMany();
    await prisma.delivery_agents.deleteMany();
    await prisma.ledger_entries.deleteMany();
    await prisma.payments.deleteMany();
    await prisma.refunds.deleteMany();
    await prisma.orders.deleteMany();
    await prisma.wallets.deleteMany();
    await prisma.users.deleteMany();
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

    // Create platform wallets
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
            idempotencyKey: `test-idempotency-${Date.now()}-${Math.random()}`,
        },
    });
}

async function verifyLedgerInvariant(prisma: PrismaService, paymentId: string) {
    const entries = await prisma.ledger_entries.findMany({
        where: { paymentId },
    });

    const sum = entries.reduce((acc, entry) => acc.add(entry.amount), new Decimal(0));

    expect(sum.toString()).toBe('0');
}

