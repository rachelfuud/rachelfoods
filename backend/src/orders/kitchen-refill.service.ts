import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveCustomItemDto } from './dto/approve-custom-item.dto';
import { NotificationService, NotificationChannel } from './notification.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class KitchenRefillService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) { }

    /**
     * Get all kitchen refill orders
     */
    async findAllKitchenRefills(filters?: any) {
        const where: any = {
            isKitchenRefill: true,
        };

        if (filters?.refillType) {
            where.refillType = filters.refillType;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.startDate || filters?.endDate) {
            where.refillStartDate = {};
            if (filters.startDate) {
                where.refillStartDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.refillStartDate.lte = new Date(filters.endDate);
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
                                images: true,
                            },
                        },
                        categories: true,
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
            orderBy: { refillStartDate: 'asc' },
        });
    }

    /**
     * Get all pending custom items across all orders
     */
    async findPendingCustomItems() {
        const customItems = await this.prisma.custom_order_items.findMany({
            where: {
                status: 'PENDING',
            },
            include: {
                orders: {
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
                    },
                },
            },
        });

        return customItems;
    }

    /**
     * Get custom items for a specific order
     */
    async findCustomItemsByOrder(orderId: string) {
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            select: { id: true },
        });

        if (!order) {
            throw new NotFoundException(`Order with id '${orderId}' not found`);
        }

        return this.prisma.custom_order_items.findMany({
            where: { orderId },
        });
    }

    /**
     * Approve or reject a custom item
     */
    async approveCustomItem(
        itemId: string,
        approveDto: ApproveCustomItemDto,
        sellerId: string,
    ) {
        const customItem = await this.prisma.custom_order_items.findUnique({
            where: { id: itemId },
            include: {
                orders: {
                    include: {
                        users: true,
                        order_items: true,
                        custom_order_items: true,
                    },
                },
            },
        });

        if (!customItem) {
            throw new NotFoundException(`Custom item with id '${itemId}' not found`);
        }

        if (customItem.status !== 'PENDING') {
            throw new BadRequestException(
                `Custom item has already been ${customItem.status.toLowerCase()}`,
            );
        }

        const updateData: any = {
            status: approveDto.approved ? 'APPROVED' : 'REJECTED',
            approvedAt: new Date(),
            approvedBy: sellerId,
        };

        if (approveDto.approved) {
            if (!approveDto.finalPrice) {
                throw new BadRequestException('Final price is required for approval');
            }
            updateData.approvedPrice = new Decimal(approveDto.finalPrice);
        } else {
            if (!approveDto.rejectionReason) {
                throw new BadRequestException('Rejection reason is required');
            }
            updateData.rejectionReason = approveDto.rejectionReason;
            updateData.rejectedAt = new Date();
        }

        if (approveDto.sellerNotes) {
            updateData.sellerNotes = approveDto.sellerNotes;
        }

        // Update the custom item
        const updatedItem = await this.prisma.custom_order_items.update({
            where: { id: itemId },
            data: updateData,
        });

        // Recalculate order total if approved
        if (approveDto.approved && approveDto.finalPrice) {
            await this.recalculateOrderTotal(customItem.orderId);
        }

        // Send notification to buyer
        const order = customItem.orders;
        const buyerEmail = order.users.email;
        const buyerPhone = order.users.phone || order.deliveryPhone;

        if (approveDto.approved) {
            // TODO: Add specific notification method for custom item approval
            await this.notificationService.send(
                NotificationChannel.EMAIL,
                {
                    recipient: buyerEmail,
                    subject: `Custom item "${customItem.itemName}" approved`,
                    message: `Your custom item request has been approved at ₹${approveDto.finalPrice}. Order #${order.orderNumber}`,
                },
            );
        } else {
            // TODO: Add specific notification method for custom item rejection
            await this.notificationService.send(
                NotificationChannel.EMAIL,
                {
                    recipient: buyerEmail,
                    subject: `Custom item "${customItem.itemName}" not available`,
                    message: `Unfortunately, we cannot fulfill your custom item request. Reason: ${approveDto.rejectionReason}. Order #${order.orderNumber}`,
                },
            );
        }

        return updatedItem;
    }

    /**
     * Recalculate order total after custom item approval/rejection
     */
    private async recalculateOrderTotal(orderId: string): Promise<void> {
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            include: {
                order_items: true,
                custom_order_items: {
                    where: {
                        status: 'APPROVED',
                    },
                },
            },
        });

        if (!order) return;

        // Calculate subtotal from regular items
        let subtotal = order.order_items.reduce(
            (sum, item) => sum.add(item.subtotal),
            new Decimal(0),
        );

        // Add approved custom items
        const customItemsTotal = order.custom_order_items.reduce(
            (sum, item) =>
                item.approvedPrice ? sum.add(item.approvedPrice.mul(item.quantity)) : sum,
            new Decimal(0),
        );

        subtotal = subtotal.add(customItemsTotal);

        // Recalculate total cost (subtotal + shipping)
        const totalCost = subtotal.add(order.shippingCost);

        // Update order
        await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                subtotal,
                totalCost,
            },
        });
    }

    /**
     * Get kitchen refill statistics
     */
    async getKitchenRefillStats(filters?: any) {
        const where: any = {
            isKitchenRefill: true,
        };

        if (filters?.startDate || filters?.endDate) {
            where.refillStartDate = {};
            if (filters.startDate) {
                where.refillStartDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.refillStartDate.lte = new Date(filters.endDate);
            }
        }

        const [
            totalOrders,
            preOrders,
            eventOrders,
            pendingOrders,
            confirmedOrders,
            completedOrders,
            totalRevenue,
            pendingCustomItems,
        ] = await Promise.all([
            // Total kitchen refill orders
            this.prisma.orders.count({ where }),

            // Pre-orders count
            this.prisma.orders.count({
                where: { ...where, refillType: 'PRE_ORDER' },
            }),

            // Event orders count
            this.prisma.orders.count({
                where: { ...where, refillType: 'EVENT' },
            }),

            // Pending orders
            this.prisma.orders.count({
                where: { ...where, status: 'PENDING' },
            }),

            // Confirmed orders
            this.prisma.orders.count({
                where: { ...where, status: { in: ['CONFIRMED', 'PAID', 'PREPARING', 'SHIPPING', 'DELIVERED'] } },
            }),

            // Completed orders
            this.prisma.orders.count({
                where: { ...where, status: 'COMPLETED' },
            }),

            // Total revenue from completed orders
            this.prisma.orders.aggregate({
                where: { ...where, status: 'COMPLETED' },
                _sum: { totalCost: true },
            }),

            // Pending custom items
            this.prisma.custom_order_items.count({
                where: {
                    status: 'PENDING',
                    orders: { isKitchenRefill: true },
                },
            }),
        ]);

        return {
            totalOrders,
            byType: {
                preOrders,
                eventOrders,
            },
            byStatus: {
                pending: pendingOrders,
                confirmed: confirmedOrders,
                completed: completedOrders,
            },
            revenue: {
                total: totalRevenue._sum.totalCost || new Decimal(0),
                formatted: `₹${(totalRevenue._sum.totalCost || new Decimal(0)).toString()}`,
            },
            custom_order_items: {
                pending: pendingCustomItems,
            },
        };
    }

    /**
     * Get upcoming refills (next 7 days)
     */
    async getUpcomingRefills() {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        return this.prisma.orders.findMany({
            where: {
                isKitchenRefill: true,
                refillStartDate: {
                    gte: today,
                    lte: nextWeek,
                },
                status: {
                    in: ['CONFIRMED', 'PAID', 'PREPARING'],
                },
            },
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
                            },
                        },
                    },
                },
                custom_order_items: {
                    where: {
                        status: 'APPROVED',
                    },
                },
            },
            orderBy: { refillStartDate: 'asc' },
        });
    }
}


