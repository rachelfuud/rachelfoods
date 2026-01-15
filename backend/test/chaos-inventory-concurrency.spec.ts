import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/orders/order.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShippingEngine } from '../src/orders/shipping/shipping.engine';
import { NotificationService } from '../src/orders/notification.service';
import { OrderEmailHelper } from '../src/orders/order-email.helper';
import { PromotionService } from '../src/promotion/promotion.service';
import { WalletService } from '../src/wallet/wallet.service';
import { ReviewService } from '../src/reviews/review.service';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod } from '../src/orders/dto/create-order.dto';

/**
 * PHASE 9C: Inventory Concurrency Chaos Tests
 * 
 * Simulates real-world race conditions:
 * 1. Multiple buyers purchasing last few items simultaneously
 * 2. Oversell prevention under concurrent load
 * 3. Stock deduction atomicity and rollback
 * 
 * Critical Safety Invariants:
 * - Stock quantity NEVER goes negative (oversell prevention)
 * - Failed orders do NOT deduct stock
 * - Concurrent orders for same product are serialized
 */
describe('CHAOS: OrderService - Inventory Concurrency & Oversell Prevention', () => {
    let service: OrderService;
    let prisma: PrismaService;

    const mockPrisma: any = {
        products: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        orders: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
        },
        order_items: {
            createMany: jest.fn(),
        },
        $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    const mockShippingEngine = {
        calculateShipping: jest.fn(),
    };

    const mockNotificationService = {
        notifyOrderConfirmed: jest.fn(),
    };

    const mockOrderEmailHelper = {
        sendOrderConfirmationEmail: jest.fn(),
    };

    const mockPromotionService = {
        applyCoupon: jest.fn(),
    };

    const mockWalletService = {
        debitWallet: jest.fn(),
    };

    const mockReviewService = {
        // Add any needed methods
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
                {
                    provide: ShippingEngine,
                    useValue: mockShippingEngine,
                },
                {
                    provide: NotificationService,
                    useValue: mockNotificationService,
                },
                {
                    provide: OrderEmailHelper,
                    useValue: mockOrderEmailHelper,
                },
                {
                    provide: PromotionService,
                    useValue: mockPromotionService,
                },
                {
                    provide: WalletService,
                    useValue: mockWalletService,
                },
                {
                    provide: ReviewService,
                    useValue: mockReviewService,
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();

        // Default mock setup
        mockShippingEngine.calculateShipping.mockResolvedValue({
            cost: new Decimal(10.0),
            providerName: 'Standard',
        });
    });

    describe('Race Condition: Concurrent Stock Depletion', () => {
        it('CHAOS: should prevent overselling when 3 buyers race for last 2 items', async () => {
            // Arrange: Product with only 2 items in stock
            let stockQuantity = 2;
            const product = {
                id: 'prod-1',
                name: 'Limited Edition Widget',
                price: new Decimal(50.0),
                stockQuantity,
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'Electronics' },
                variants: [],
            };

            // Simulate race condition: all 3 buyers see stock = 2
            mockPrisma.products.findMany.mockImplementation(async (args: any) => {
                const ids = args?.where?.id?.in || [];
                return ids.map(() => ({ ...product, stockQuantity }));
            });

            mockPrisma.products.findUnique.mockImplementation(() => {
                return Promise.resolve({ ...product, stockQuantity });
            });

            // Simulate database constraint: reject negative stock
            mockPrisma.products.update.mockImplementation((args: any) => {
                const newStock = args.data.stockQuantity;
                if (typeof newStock === 'object' && newStock.decrement) {
                    const finalStock = stockQuantity - newStock.decrement;
                    if (finalStock < 0) {
                        throw new Error('Stock cannot go negative');
                    }
                    stockQuantity = finalStock;
                    return Promise.resolve({ ...product, stockQuantity });
                }
                return Promise.resolve({ ...product, stockQuantity: newStock });
            });

            mockPrisma.orders.create.mockImplementation((args: any) => {
                return Promise.resolve({
                    id: 'order-' + Math.random(),
                    status: 'PENDING_PAYMENT',
                    ...args.data,
                });
            });

            mockPrisma.order_items.createMany.mockResolvedValue({ count: 1 });

            const orderDto = {
                items: [{ productId: 'prod-1', quantity: 1 }],
                deliveryAddress: '123 Main St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            // Act: 3 concurrent orders for 1 item each
            const results = await Promise.allSettled([
                service.create(orderDto, 'buyer-1'),
                service.create(orderDto, 'buyer-2'),
                service.create(orderDto, 'buyer-3'),
            ]);

            // Assert: Only 2 should succeed, 1 MUST fail
            const successes = results.filter(r => r.status === 'fulfilled');
            const failures = results.filter(r => r.status === 'rejected');

            expect(successes.length).toBeLessThanOrEqual(2);
            expect(failures.length).toBeGreaterThanOrEqual(1);

            // CRITICAL: Stock should never go negative
            expect(stockQuantity).toBeGreaterThanOrEqual(0);
        });

        it('CHAOS: should handle multiple products with different stock levels concurrently', async () => {
            // Arrange: Product A has 5 stock, Product B has 2 stock
            const stocks = {
                'prod-a': 5,
                'prod-b': 2,
            };

            const createProduct = (id: string, stock: number) => ({
                id,
                name: `Product ${id}`,
                price: new Decimal(25.0),
                stockQuantity: stock,
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'General' },
                variants: [],
            });

            mockPrisma.products.findMany.mockImplementation(async (args: any) => {
                const ids = args?.where?.id?.in || [];
                return ids.map((id: string) => createProduct(id, stocks[id as keyof typeof stocks] || 0));
            });

            mockPrisma.products.findUnique.mockImplementation(async (args: any) => {
                const id = args.where.id as keyof typeof stocks;
                return createProduct(id, stocks[id] || 0);
            });

            mockPrisma.products.update.mockImplementation((args: any) => {
                const productId = args.where.id as keyof typeof stocks;
                const newStock = args.data.stockQuantity;

                if (typeof newStock === 'object' && newStock.decrement) {
                    const finalStock = stocks[productId] - newStock.decrement;
                    if (finalStock < 0) {
                        throw new BadRequestException('Insufficient stock');
                    }
                    stocks[productId] = finalStock;
                }

                return Promise.resolve(createProduct(productId, stocks[productId]));
            });

            mockPrisma.orders.create.mockImplementation((args: any) => {
                return Promise.resolve({
                    id: 'order-' + Math.random(),
                    status: 'PENDING_PAYMENT',
                    ...args.data,
                });
            });

            mockPrisma.order_items.createMany.mockResolvedValue({ count: 1 });

            // Act: Multiple concurrent orders for different products
            const results = await Promise.allSettled([
                service.create({
                    items: [{ productId: 'prod-a', quantity: 2 }],
                    deliveryAddress: '123 Main St',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0001',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-1'),
                service.create({
                    items: [{ productId: 'prod-b', quantity: 1 }],
                    deliveryAddress: '456 Oak Ave',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0002',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-2'),
                service.create({
                    items: [{ productId: 'prod-a', quantity: 3 }],
                    deliveryAddress: '789 Elm St',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0003',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-3'),
            ]);

            // Assert: All stocks should remain non-negative
            expect(stocks['prod-a']).toBeGreaterThanOrEqual(0);
            expect(stocks['prod-b']).toBeGreaterThanOrEqual(0);

            const successes = results.filter(r => r.status === 'fulfilled');
            expect(successes.length).toBeGreaterThan(0); // At least some should succeed
        });
    });

    describe('Transaction Rollback: Order Creation Failures', () => {
        it('CHAOS: should rollback stock deduction if order creation fails', async () => {
            // Arrange
            let stockQuantity = 10;
            const product = {
                id: 'prod-1',
                name: 'Test Product',
                price: new Decimal(30.0),
                stockQuantity,
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'Test' },
                variants: [],
            };

            mockPrisma.products.findMany.mockResolvedValue([product]);
            mockPrisma.products.findUnique.mockResolvedValue(product);

            mockPrisma.products.update.mockImplementation((args: any) => {
                const newStock = args.data.stockQuantity;
                if (typeof newStock === 'object' && newStock.decrement) {
                    stockQuantity -= newStock.decrement;
                }
                return Promise.resolve({ ...product, stockQuantity });
            });

            // Simulate order creation failure
            mockPrisma.orders.create.mockRejectedValue(
                new Error('Database constraint violation')
            );

            // Mock transaction to rollback on failure
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                const originalStock = stockQuantity;
                try {
                    return await callback(mockPrisma);
                } catch (error) {
                    // Rollback: restore stock
                    stockQuantity = originalStock;
                    throw error;
                }
            });

            const orderDto = {
                items: [{ productId: 'prod-1', quantity: 2 }],
                deliveryAddress: '123 Main St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            // Act & Assert
            await expect(
                service.create(orderDto, 'buyer-1')
            ).rejects.toThrow();

            // CRITICAL: Stock should be restored (rollback)
            expect(stockQuantity).toBe(10);
        });

        it('CHAOS: should not create order_items if stock update fails', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Test Product',
                price: new Decimal(30.0),
                stockQuantity: 1, // Only 1 left
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'Test' },
                variants: [],
            };

            mockPrisma.products.findMany.mockResolvedValue([product]);
            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Simulate insufficient stock error
            mockPrisma.products.update.mockRejectedValue(
                new BadRequestException('Insufficient stock for product')
            );

            const orderDto = {
                items: [{ productId: 'prod-1', quantity: 5 }], // Requesting 5, only 1 available
                deliveryAddress: '123 Main St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            // Act & Assert
            await expect(
                service.create(orderDto, 'buyer-1')
            ).rejects.toThrow();

            // CRITICAL: order_items should NOT be created
            expect(mockPrisma.order_items.createMany).not.toHaveBeenCalled();
        });
    });

    describe('Boundary Conditions: High Concurrency', () => {
        it('CHAOS: should handle 10 concurrent orders for same product gracefully', async () => {
            // Arrange: Product with 5 items
            let stockQuantity = 5;
            const product = {
                id: 'prod-1',
                name: 'Popular Item',
                price: new Decimal(20.0),
                stockQuantity,
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'Hot Items' },
                variants: [],
            };

            mockPrisma.products.findMany.mockImplementation(() => {
                return Promise.resolve([{ ...product, stockQuantity }]);
            });

            mockPrisma.products.findUnique.mockImplementation(() => {
                return Promise.resolve({ ...product, stockQuantity });
            });

            mockPrisma.products.update.mockImplementation((args: any) => {
                const newStock = args.data.stockQuantity;
                if (typeof newStock === 'object' && newStock.decrement) {
                    const finalStock = stockQuantity - newStock.decrement;
                    if (finalStock < 0) {
                        throw new BadRequestException('Insufficient stock');
                    }
                    stockQuantity = finalStock;
                }
                return Promise.resolve({ ...product, stockQuantity });
            });

            mockPrisma.orders.create.mockImplementation((args: any) => {
                return Promise.resolve({
                    id: 'order-' + Math.random(),
                    status: 'PENDING_PAYMENT',
                    ...args.data,
                });
            });

            mockPrisma.order_items.createMany.mockResolvedValue({ count: 1 });

            const orderDto = {
                items: [{ productId: 'prod-1', quantity: 1 }],
                deliveryAddress: '123 Main St',
                deliveryCity: 'City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            // Act: 10 concurrent orders for 1 item each
            const attempts = Array(10).fill(null).map((_, i) =>
                service.create(orderDto, `buyer-${i + 1}`)
            );

            const results = await Promise.allSettled(attempts);

            // Assert: Only 5 should succeed (stock = 5)
            const successes = results.filter(r => r.status === 'fulfilled');
            const failures = results.filter(r => r.status === 'rejected');

            expect(successes.length).toBeLessThanOrEqual(5);
            expect(failures.length).toBeGreaterThanOrEqual(5);
            expect(stockQuantity).toBe(0); // All 5 should be sold out
        });

        it('CHAOS: should maintain stock integrity across mixed order sizes', async () => {
            // Arrange: Product with 20 items
            let stockQuantity = 20;
            const product = {
                id: 'prod-1',
                name: 'Bulk Item',
                price: new Decimal(15.0),
                stockQuantity,
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'Wholesale' },
                variants: [],
            };

            mockPrisma.products.findMany.mockImplementation(() => {
                return Promise.resolve([{ ...product, stockQuantity }]);
            });

            mockPrisma.products.findUnique.mockImplementation(() => {
                return Promise.resolve({ ...product, stockQuantity });
            });

            mockPrisma.products.update.mockImplementation((args: any) => {
                const newStock = args.data.stockQuantity;
                if (typeof newStock === 'object' && newStock.decrement) {
                    const finalStock = stockQuantity - newStock.decrement;
                    if (finalStock < 0) {
                        throw new BadRequestException('Insufficient stock');
                    }
                    stockQuantity = finalStock;
                }
                return Promise.resolve({ ...product, stockQuantity });
            });

            mockPrisma.orders.create.mockImplementation((args: any) => {
                return Promise.resolve({
                    id: 'order-' + Math.random(),
                    status: 'PENDING_PAYMENT',
                    ...args.data,
                });
            });

            mockPrisma.order_items.createMany.mockResolvedValue({ count: 1 });

            // Act: Mixed order sizes (1, 3, 5, 7, 10 items)
            const results = await Promise.allSettled([
                service.create({
                    items: [{ productId: 'prod-1', quantity: 1 }],
                    deliveryAddress: '123 Main St',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0001',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-1'),
                service.create({
                    items: [{ productId: 'prod-1', quantity: 3 }],
                    deliveryAddress: '456 Oak Ave',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0002',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-2'),
                service.create({
                    items: [{ productId: 'prod-1', quantity: 5 }],
                    deliveryAddress: '789 Elm St',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0003',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-3'),
                service.create({
                    items: [{ productId: 'prod-1', quantity: 7 }],
                    deliveryAddress: '321 Pine Rd',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0004',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-4'),
                service.create({
                    items: [{ productId: 'prod-1', quantity: 10 }],
                    deliveryAddress: '654 Maple Ln',
                    deliveryCity: 'City',
                    deliveryPhone: '555-0005',
                    paymentMethod: PaymentMethod.COD,
                }, 'buyer-5'),
            ]);

            // Assert: Stock should never go negative
            expect(stockQuantity).toBeGreaterThanOrEqual(0);

            // Calculate expected stock based on successes
            const successes = results.filter(r => r.status === 'fulfilled');
            expect(successes.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases: Zero Stock and Invalid Quantities', () => {
        it('CHAOS: should reject orders when stock is already depleted', async () => {
            // Arrange: Out of stock product
            const product = {
                id: 'prod-1',
                name: 'Sold Out Item',
                price: new Decimal(25.0),
                stockQuantity: 0, // OUT OF STOCK
                weight: new Decimal(1.0),
                status: 'ACTIVE',
                category: { id: 'cat-1', name: 'Test' },
                variants: [],
            };

            mockPrisma.products.findMany.mockResolvedValue([product]);
            mockPrisma.products.findUnique.mockResolvedValue(product);

            const orderDto = {
                items: [{ productId: 'prod-1', quantity: 1 }],
                deliveryAddress: '123 Main St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            // Act & Assert
            await expect(
                service.create(orderDto, 'buyer-1')
            ).rejects.toThrow();
        });

        it('CHAOS: should reject orders with zero quantity', async () => {
            const orderDto = {
                items: [{ productId: 'prod-1', quantity: 0 }], // Invalid
                deliveryAddress: '123 Main St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            await expect(
                service.create(orderDto, 'buyer-1')
            ).rejects.toThrow();
        });

        it('CHAOS: should reject orders with negative quantity', async () => {
            const orderDto = {
                items: [{ productId: 'prod-1', quantity: -5 }], // Invalid
                deliveryAddress: '123 Main St',
                deliveryCity: 'Test City',
                deliveryPhone: '555-1234',
                paymentMethod: PaymentMethod.COD,
            };

            await expect(
                service.create(orderDto, 'buyer-1')
            ).rejects.toThrow();
        });
    });
});

