import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Inject,
    forwardRef,
    Logger,
    ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ShippingEngine } from './shipping/shipping.engine';
import { NotificationService } from './notification.service';
import { ReviewService } from '../reviews/review.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        private prisma: PrismaService,
        private shippingEngine: ShippingEngine,
        private notificationService: NotificationService,
        @Inject(forwardRef(() => ReviewService))
        private reviewService: ReviewService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Generate unique order number
     */
    private async generateOrderNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.prisma.orders.count({
            where: {
                orderNumber: {
                    startsWith: `ORD-${year}-`,
                },
            },
        });
        return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    /**
     * Create a new order
     */
    async create(createOrderDto: CreateOrderDto, buyerId: string) {
        // Validate products exist and are active
        const productIds = createOrderDto.items.map((item) => item.productId);
        const products = await this.prisma.products.findMany({
            where: {
                id: { in: productIds },
                deletedAt: null,
            },
            include: { categories: true },
        });

        if (products.length !== productIds.length) {
            throw new BadRequestException('Some products not found or unavailable');
        }

        // Check if any products are inactive
        const inactiveProducts = products.filter((p) => p.status !== 'ACTIVE');
        if (inactiveProducts.length > 0) {
            throw new BadRequestException(
                `Products not available: ${inactiveProducts.map((p) => p.name).join(', ')}`,
            );
        }

        // Calculate order totals
        let subtotal = new Decimal(0);
        let totalWeight = new Decimal(0);
        let hasPerishableItems = false;

        const orderItemsData = createOrderDto.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            const itemSubtotal = product.price.mul(item.quantity);
            const itemWeight = product.weight.mul(item.quantity);

            subtotal = subtotal.add(itemSubtotal);
            totalWeight = totalWeight.add(itemWeight);

            if (product.perishable) {
                hasPerishableItems = true;
            }

            return {
                id: crypto.randomUUID(),
                productId: product.id,
                categoryId: product.categoryId,
                productName: product.name,
                productPrice: product.price,
                productWeight: product.weight,
                productUnit: product.unit,
                quantity: item.quantity,
                subtotal: itemSubtotal,
            };
        });

        // Calculate shipping cost
        // TODO: Calculate actual distance from buyer address to store
        const estimatedDistance = 15; // Placeholder - should calculate from addresses

        const shippingResult = await this.shippingEngine.calculateShipping(
            estimatedDistance,
            parseFloat(totalWeight.toString()),
            hasPerishableItems,
        );

        const shippingCost = new Decimal(shippingResult.shippingCost);
        const totalCost = subtotal.add(shippingCost);

        // Generate order number
        const orderNumber = await this.generateOrderNumber();

        // Create order with items
        const order = await this.prisma.orders.create({
            data: {
                id: crypto.randomUUID(),
                orderNumber,
                buyerId,
                deliveryAddress: createOrderDto.deliveryAddress,
                deliveryCity: createOrderDto.deliveryCity,
                deliveryState: createOrderDto.deliveryState,
                deliveryZipCode: createOrderDto.deliveryZipCode,
                deliveryPhone: createOrderDto.deliveryPhone,
                deliveryNotes: createOrderDto.deliveryNotes,
                subtotal,
                updatedAt: new Date(),
                shippingCost,
                totalCost,
                totalWeight,
                distance: new Decimal(estimatedDistance),
                shippingProvider: shippingResult.selectedProvider,
                paymentMethod: createOrderDto.paymentMethod,
                isKitchenRefill: createOrderDto.isKitchenRefill || false,
                refillType: createOrderDto.refillType,
                refillStartDate: createOrderDto.refillStartDate
                    ? new Date(createOrderDto.refillStartDate)
                    : null,
                refillEndDate: createOrderDto.refillEndDate
                    ? new Date(createOrderDto.refillEndDate)
                    : null,
                eventDescription: createOrderDto.eventDescription,
                order_items: {
                    create: orderItemsData,
                },
                custom_order_items: createOrderDto.customItems
                    ? {
                        create: createOrderDto.customItems.map((item) => ({
                            id: crypto.randomUUID(),
                            itemName: item.itemName,
                            description: item.description,
                            quantity: item.quantity,
                            unit: item.unit,
                            estimatedPrice: item.estimatedPrice
                                ? new Decimal(item.estimatedPrice)
                                : null,
                        })),
                    }
                    : undefined,
            },
            include: {
                order_items: {
                    include: {
                        products: true,
                        categories: true,
                    },
                },
                custom_order_items: true,
                users: true,
            },
        });

        // Send notifications
        await this.notificationService.notifyOrderPlaced(
            order.users.email,
            order.users.phone || order.deliveryPhone,
            order.orderNumber,
            parseFloat(order.totalCost.toString()),
        );

        return order;
    }

    /**
     * Find all orders (with filters)
     */
    async findAll(userId: string, userRoles: string[], filters?: any) {
        const where: any = {};

        // Buyers see only their orders
        if (userRoles.includes('buyer') && !userRoles.includes('platform-admin')) {
            where.buyerId = userId;
        }

        // Apply status filter if provided
        if (filters?.status) {
            where.status = filters.status;
        }

        // Apply date range filter
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
        }

        return this.prisma.orders.findMany({
            where,
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                order_items: {
                    include: {
                        products: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                images: true,
                            },
                        },
                    },
                },
                custom_order_items: true,
                _count: {
                    select: {
                        order_items: true,
                        custom_order_items: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find order by ID
     */
    async findOne(id: string, userId: string, userRoles: string[]) {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                order_items: {
                    include: {
                        products: true,
                        categories: true,
                    },
                },
                custom_order_items: true,
            },
        });

        if (!order) {
            throw new NotFoundException(`Order with id '${id}' not found`);
        }

        // Buyers can only see their own orders (unless admin/seller)
        if (
            order.buyerId !== userId &&
            !userRoles.includes('platform-admin') &&
            !userRoles.includes('store-owner')
        ) {
            throw new ForbiddenException('You do not have access to this order');
        }

        return order;
    }

    /**
     * Confirm order (Seller only)
     */
    async confirmOrder(
        id: string,
        confirmDto: ConfirmOrderDto,
        sellerId: string,
    ) {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            include: {
                users: true,
                custom_order_items: {
                    where: { status: 'PENDING' },
                },
            },
        });

        if (!order) {
            throw new NotFoundException(`Order with id '${id}' not found`);
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException(
                `Order cannot be confirmed. Current status: ${order.status}`,
            );
        }

        // Check if there are pending custom items
        if (order.custom_order_items.length > 0) {
            throw new BadRequestException(
                'Please approve or reject all custom items before confirming order',
            );
        }

        const updateData: any = {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            confirmedBy: sellerId,
        };

        if (confirmDto.expectedDeliveryDate) {
            updateData.expectedDeliveryDate = new Date(confirmDto.expectedDeliveryDate);
        }

        // Handle shipping cost override
        if (confirmDto.shippingCostOverride !== undefined) {
            const newShippingCost = new Decimal(confirmDto.shippingCostOverride);
            const newTotalCost = order.subtotal.add(newShippingCost);

            updateData.shippingCost = newShippingCost;
            updateData.totalCost = newTotalCost;
            updateData.shippingOverride = true;
            updateData.shippingOverrideReason = confirmDto.shippingOverrideReason;
        }

        const updatedOrder = await this.prisma.orders.update({
            where: { id },
            data: updateData,
            include: {
                users: true,
                order_items: {
                    include: { products: true },
                },
                custom_order_items: true,
            },
        });

        // Send notifications
        await this.notificationService.notifyOrderConfirmed(
            updatedOrder.users.email,
            updatedOrder.users.phone || updatedOrder.deliveryPhone,
            updatedOrder.orderNumber,
            updatedOrder.expectedDeliveryDate?.toISOString().split('T')[0],
        );

        // Emit order.confirmed event (async, post-commit)
        try {
            await this.eventEmitter.emitAsync('order.confirmed', {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                buyerId: updatedOrder.buyerId,
                totalAmount: updatedOrder.totalCost.toNumber(),
                currency: 'USD',
                expectedDeliveryDate: updatedOrder.expectedDeliveryDate?.toISOString(),
                confirmedAt: updatedOrder.confirmedAt?.toISOString(),
                confirmedBy: sellerId,
            });
        } catch (error) {
            this.logger.error({
                event: 'event_emission_failed',
                eventType: 'order.confirmed',
                orderId: id,
                error: error.message,
            });
        }

        return updatedOrder;
    }

    /**
     * Update order status
     */
    async updateStatus(id: string, updateDto: UpdateOrderDto, userId: string) {
        // Sprint 8 Track D: Optimistic locking with retry for concurrent status updates
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                return await this.updateStatusWithOptimisticLock(id, updateDto, userId);
            } catch (error) {
                if (error instanceof ConflictException && attempt < maxRetries - 1) {
                    attempt++;
                    this.logger.warn({
                        event: 'order_status_update_retry',
                        orderId: id,
                        attempt,
                        error: error.message,
                    });
                    // Exponential backoff: 50ms, 100ms, 200ms
                    await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt - 1)));
                    continue;
                }
                throw error;
            }
        }
    }

    private async updateStatusWithOptimisticLock(id: string, updateDto: UpdateOrderDto, userId: string) {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            include: { users: true },
        });

        if (!order) {
            throw new NotFoundException(`Order with id '${id}' not found`);
        }

        const updateData: any = {};
        const currentStatus = order.status;

        if (updateDto.status) {
            // Validate status transitions
            this.validateStatusTransition(order.status, updateDto.status);

            // FORCED REVIEW REQUIREMENT: Cannot complete order without submitted review
            if (updateDto.status === 'COMPLETED') {
                const hasReview = await this.reviewService.hasSubmittedReview(id);
                if (!hasReview) {
                    throw new BadRequestException(
                        'Order cannot be marked as COMPLETED until buyer submits a review. Please submit a review first.',
                    );
                }
            }

            updateData.status = updateDto.status;

            // Set timestamps based on status
            switch (updateDto.status) {
                case 'SHIPPING':
                    updateData.shippedAt = new Date();
                    break;
                case 'DELIVERED':
                    updateData.deliveredAt = new Date();
                    // Auto-create pending review when order is delivered
                    try {
                        await this.reviewService.createPendingReview(id, order.buyerId);
                    } catch (error) {
                        // Review might already exist, ignore error
                        console.warn('Could not create pending review:', error.message);
                    }
                    break;
                case 'COMPLETED':
                    updateData.completedAt = new Date();
                    break;
                case 'CANCELLED':
                    updateData.cancelledAt = new Date();
                    updateData.cancellationReason = updateDto.cancellationReason;
                    break;
            }
        }

        if (updateDto.expectedDeliveryDate) {
            updateData.expectedDeliveryDate = new Date(updateDto.expectedDeliveryDate);
        }

        if (updateDto.deliveryNotes) {
            updateData.deliveryNotes = updateDto.deliveryNotes;
        }

        // Optimistic locking: Only update if status hasn't changed
        const updateResult = await this.prisma.orders.updateMany({
            where: {
                id,
                status: currentStatus, // Only update if status still matches
            },
            data: updateData,
        });

        // Check if update succeeded
        if (updateResult.count === 0) {
            this.logger.error({
                event: 'order_status_update_conflict',
                orderId: id,
                expectedStatus: currentStatus,
                attemptedStatus: updateDto.status,
                error: 'Concurrent status update detected',
            });
            throw new ConflictException(
                'Order status was updated by another request. Please refresh and try again.',
            );
        }

        // Fetch updated order with relations
        const updatedOrder = await this.prisma.orders.findUnique({
            where: { id },
            include: {
                users: true,
                order_items: { include: { products: true } },
                custom_order_items: true,
            },
        });

        // Send notifications based on status
        const buyerEmail = updatedOrder.users.email;
        const buyerPhone = updatedOrder.users.phone || updatedOrder.deliveryPhone;

        if (updateDto.status === 'SHIPPING') {
            await this.notificationService.notifyOrderShipped(
                buyerEmail,
                buyerPhone,
                updatedOrder.orderNumber,
            );
        } else if (updateDto.status === 'DELIVERED') {
            await this.notificationService.notifyOrderDelivered(
                buyerEmail,
                buyerPhone,
                updatedOrder.orderNumber,
            );

            // Emit order.delivered event (async, post-commit)
            try {
                await this.eventEmitter.emitAsync('order.delivered', {
                    orderId: updatedOrder.id,
                    orderNumber: updatedOrder.orderNumber,
                    buyerId: updatedOrder.buyerId,
                    deliveredAt: updatedOrder.deliveredAt?.toISOString(),
                    totalAmount: updatedOrder.totalCost.toNumber(),
                    currency: 'USD',
                });
            } catch (error) {
                this.logger.error({
                    event: 'event_emission_failed',
                    eventType: 'order.delivered',
                    orderId: updatedOrder.id,
                    error: error.message,
                });
            }
        } else if (updateDto.status === 'CANCELLED') {
            await this.notificationService.notifyOrderCancelled(
                buyerEmail,
                buyerPhone,
                updatedOrder.orderNumber,
                updateDto.cancellationReason,
            );

            // Emit order.cancelled event (async, post-commit)
            try {
                await this.eventEmitter.emitAsync('order.cancelled', {
                    orderId: updatedOrder.id,
                    orderNumber: updatedOrder.orderNumber,
                    buyerId: updatedOrder.buyerId,
                    cancellationReason: updateDto.cancellationReason,
                    cancelledAt: updatedOrder.cancelledAt?.toISOString(),
                    cancelledBy: userId,
                });
            } catch (error) {
                this.logger.error({
                    event: 'event_emission_failed',
                    eventType: 'order.cancelled',
                    orderId: updatedOrder.id,
                    error: error.message,
                });
            }
        }

        return updatedOrder;
    }

    /**
     * Cancel order
     */
    async cancel(id: string, reason: string, userId: string, userRoles: string[]) {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            include: { users: true },
        });

        if (!order) {
            throw new NotFoundException(`Order with id '${id}' not found`);
        }

        // Only buyer or seller can cancel
        if (
            order.buyerId !== userId &&
            !userRoles.includes('store-owner') &&
            !userRoles.includes('platform-admin')
        ) {
            throw new ForbiddenException('You do not have permission to cancel this order');
        }

        // Can only cancel pending or confirmed orders
        if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
            throw new BadRequestException(
                `Order cannot be cancelled. Current status: ${order.status}`,
            );
        }

        return this.updateStatus(
            id,
            {
                status: 'CANCELLED' as any,
                cancellationReason: reason,
            },
            userId,
        );
    }

    /**
     * Validate status transition
     */
    private validateStatusTransition(currentStatus: string, newStatus: string): void {
        const validTransitions: Record<string, string[]> = {
            PENDING: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['PAID', 'CANCELLED'],
            PAID: ['PREPARING', 'CANCELLED'],
            PREPARING: ['SHIPPING'],
            SHIPPING: ['DELIVERED'],
            DELIVERED: ['COMPLETED'],
            COMPLETED: [],
            CANCELLED: [],
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid status transition from ${currentStatus} to ${newStatus}`,
            );
        }
    }
}

