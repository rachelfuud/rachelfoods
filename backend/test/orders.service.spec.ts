import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/orders/order.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShippingEngine } from '../src/orders/shipping/shipping.engine';
import { NotificationService } from '../src/orders/notification.service';
import { ReviewService } from '../src/reviews/review.service';

/**
 * Unit Tests for OrderService
 * 
 * Test Scope:
 * - Order status updates
 * - Order retrieval
 * - Order lifecycle transitions
 */
describe('OrderService', () => {
    let service: OrderService;
    let prisma: PrismaService;

    const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-2026-001',
        buyerId: 'user-123',
        status: OrderStatus.PENDING,
        totalCost: 150.50,
        shippingCost: 10.00,
        subtotal: 140.50,
        deliveryAddress: '123 Main St',
        deliveryCity: 'New York',
        deliveryZipCode: '10001',
        deliveryState: 'NY',
        deliveryPhone: '+1234567890',
        deliveryNotes: null,
        confirmedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: PrismaService,
                    useValue: {
                        orders: {
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                            create: jest.fn(),
                            update: jest.fn(),
                            count: jest.fn(),
                        },
                        products: {
                            findMany: jest.fn(),
                        },
                        $transaction: jest.fn(),
                    },
                },
                {
                    provide: ShippingEngine,
                    useValue: {
                        calculateShipping: jest.fn(),
                    },
                },
                {
                    provide: NotificationService,
                    useValue: {
                        sendNotification: jest.fn(),
                    },
                },
                {
                    provide: ReviewService,
                    useValue: {
                        requestReview: jest.fn(),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOne', () => {
        it('should return an order by id', async () => {
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue(mockOrder as any);

            const result = await service.findOne('order-123', 'user-123', ['buyer']);

            expect(result).toEqual(mockOrder);
            expect(prisma.orders.findUnique).toHaveBeenCalled();
        });

        it('should return null when order not found', async () => {
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue(null);

            const result = await service.findOne('nonexistent', 'user-123', ['buyer']);

            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should return orders for a user', async () => {
            const mockOrders = [mockOrder];
            jest.spyOn(prisma.orders, 'findMany').mockResolvedValue(mockOrders as any);

            const result = await service.findAll('user-123', ['buyer']);

            expect(result).toEqual(mockOrders);
            expect(prisma.orders.findMany).toHaveBeenCalled();
        });
    });

    describe('updateStatus', () => {
        it('should update order status to CONFIRMED', async () => {
            const updatedOrder = { ...mockOrder, status: 'CONFIRMED' as any };
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue(mockOrder as any);
            jest.spyOn(prisma.orders, 'update').mockResolvedValue(updatedOrder as any);

            const result = await service.updateStatus('order-123', { status: 'CONFIRMED' as any }, 'user-123');

            expect(result.status).toBe('CONFIRMED');
        });

        it('should update order status to CANCELLED', async () => {
            const updatedOrder = {
                ...mockOrder,
                status: 'CANCELLED' as any,
                cancelledAt: new Date(),
            };
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue(mockOrder as any);
            jest.spyOn(prisma.orders, 'update').mockResolvedValue(updatedOrder as any);

            const result = await service.updateStatus('order-123', { status: 'CANCELLED' as any, cancellationReason: 'Test' }, 'user-123');

            expect(result.status).toBe('CANCELLED');
            expect(result.cancelledAt).toBeDefined();
        });
    });

    describe('Order lifecycle transitions', () => {
        it('should allow PENDING → CONFIRMED transition', async () => {
            const updatedOrder = { ...mockOrder, status: 'CONFIRMED' as any };
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue(mockOrder as any);
            jest.spyOn(prisma.orders, 'update').mockResolvedValue(updatedOrder as any);

            const result = await service.updateStatus('order-123', { status: 'CONFIRMED' as any }, 'user-123');

            expect(result.status).toBe('CONFIRMED');
        });

        it('should allow CONFIRMED → PREPARING transition', async () => {
            const updatedOrder = {
                ...mockOrder,
                status: 'PREPARING' as any,
            };
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' as any } as any);
            jest.spyOn(prisma.orders, 'update').mockResolvedValue(updatedOrder as any);

            const result = await service.updateStatus('order-123', { status: 'PREPARING' as any }, 'user-123');

            expect(result.status).toBe('PREPARING');
        });

        it('should allow PREPARING → SHIPPING transition', async () => {
            const updatedOrder = {
                ...mockOrder,
                status: 'SHIPPING' as any,
            };
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue({ ...mockOrder, status: 'PREPARING' as any } as any);
            jest.spyOn(prisma.orders, 'update').mockResolvedValue(updatedOrder as any);

            const result = await service.updateStatus('order-123', { status: 'SHIPPING' as any }, 'user-123');

            expect(result.status).toBe('SHIPPING');
        });

        it('should allow SHIPPING → DELIVERED transition', async () => {
            const updatedOrder = {
                ...mockOrder,
                status: 'DELIVERED' as any,
            };
            jest.spyOn(prisma.orders, 'findUnique').mockResolvedValue({ ...mockOrder, status: 'SHIPPING' as any } as any);
            jest.spyOn(prisma.orders, 'update').mockResolvedValue(updatedOrder as any);

            const result = await service.updateStatus('order-123', { status: 'DELIVERED' as any }, 'user-123');

            expect(result.status).toBe('DELIVERED');
        });
    });
});