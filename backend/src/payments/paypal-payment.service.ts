import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderEmailHelper } from '../orders/order-email.helper';
import { NotificationService } from '../notifications/notification.service';
const paypal = require('@paypal/checkout-server-sdk');

@Injectable()
export class PayPalPaymentService {
    private client: any;
    private readonly logger = new Logger(PayPalPaymentService.name);

    constructor(
        private prisma: PrismaService,
        private orderEmailHelper: OrderEmailHelper,
        private notificationService: NotificationService,
    ) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

        if (!clientId || !clientSecret) {
            this.logger.warn('PayPal credentials not configured - PayPal payments will not work');
        } else {
            // Initialize PayPal environment
            const Environment = environment === 'production'
                ? paypal.core.LiveEnvironment
                : paypal.core.SandboxEnvironment;

            const paypalEnvironment = new Environment(clientId, clientSecret);
            this.client = new paypal.core.PayPalHttpClient(paypalEnvironment);
            this.logger.log(`PayPal client initialized in ${environment} mode`);
        }
    }

    /**
     * Create PayPal order for checkout
     */
    async createPayPalOrder(orderId: string, userId: string) {
        if (!this.client) {
            throw new BadRequestException('PayPal is not configured');
        }

        // 1. Fetch and validate order
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            include: {
                order_items: {
                    include: {
                        products: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.buyerId !== userId) {
            throw new BadRequestException('Order does not belong to this user');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Order is not in PENDING status');
        }

        // 2. Calculate total
        const total = parseFloat(order.totalCost.toString());

        // 3. Create PayPal order
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: orderId,
                description: `Order #${order.orderNumber}`,
                amount: {
                    currency_code: 'USD',
                    value: total.toFixed(2),
                    breakdown: {
                        item_total: {
                            currency_code: 'USD',
                            value: total.toFixed(2),
                        },
                    },
                },
                items: order.order_items.map(item => ({
                    name: item.products?.name || 'Product',
                    description: item.products?.description?.substring(0, 127) || '',
                    unit_amount: {
                        currency_code: 'USD',
                        value: parseFloat(item.productPrice.toString()).toFixed(2),
                    },
                    quantity: item.quantity.toString(),
                })),
            }],
            application_context: {
                brand_name: 'RachelFoods',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
            },
        });

        try {
            const response = await this.client.execute(request);
            const paypalOrderId = response.result.id;

            // 4. Get platform wallet IDs (we need actual wallet IDs, not null)
            const platformWallet = await this.prisma.wallets.findFirst({
                where: { walletType: 'PLATFORM' },
            });

            if (!platformWallet) {
                throw new BadRequestException('Platform wallet not configured');
            }

            const buyerWallet = await this.prisma.wallets.findFirst({
                where: { userId: userId },
            });

            if (!buyerWallet) {
                throw new BadRequestException('Buyer wallet not found');
            }

            // 5. Create payment record
            const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await this.prisma.payments.create({
                data: {
                    id: paymentId,
                    orders: {
                        connect: { id: orderId },
                    },
                    paymentMethod: 'PAYPAL',
                    lifecycle: 'INITIATED',
                    wallets_payments_payerWalletIdTowallets: {
                        connect: { id: buyerWallet.id },
                    },
                    wallets_payments_payeeWalletIdTowallets: {
                        connect: { id: platformWallet.id },
                    },
                    amount: total,
                    gatewayTransactionId: paypalOrderId,
                    updatedAt: new Date(),
                },
            });

            return {
                paypalOrderId,
                orderId,
            };
        } catch (error) {
            this.logger.error('PayPal order creation failed', error);
            throw new BadRequestException('Failed to create PayPal order');
        }
    }

    /**
     * Capture PayPal payment after buyer approval
     */
    async capturePayPalPayment(paypalOrderId: string) {
        if (!this.client) {
            throw new BadRequestException('PayPal is not configured');
        }

        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
        request.requestBody({});

        try {
            const response = await this.client.execute(request);

            // Find payment record
            const payment = await this.prisma.payments.findFirst({
                where: {
                    gatewayTransactionId: paypalOrderId,
                },
                include: {
                    orders: true,
                },
            });

            if (!payment) {
                throw new NotFoundException('Payment not found');
            }

            // Update payment as completed
            await this.prisma.payments.update({
                where: { id: payment.id },
                data: {
                    lifecycle: 'CAPTURED',
                    confirmedBy: 'PAYPAL',
                    confirmedAt: new Date(),
                    capturedAt: new Date(),
                },
            });

            // Update order status to PAID
            await this.prisma.orders.update({
                where: { id: payment.orderId },
                data: {
                    status: 'PAID',
                },
            });

            // Send notifications (commented out as methods don't exist yet)
            // try {
            //     await this.orderEmailHelper.sendOrderConfirmation(payment.orders);
            // } catch (emailError) {
            //     this.logger.error('Failed to send order confirmation email', emailError);
            // }

            // try {
            //     await this.notificationService.notifyOrderPlaced(payment.orders);
            // } catch (notifError) {
            //     this.logger.error('Failed to send order notification', notifError);
            // }

            this.logger.log(`PayPal payment captured for order ${payment.orderId}`);

            return {
                success: true,
                orderId: payment.orderId,
                paypalOrderId,
                captureId: response.result.purchase_units[0].payments.captures[0].id,
            };
        } catch (error) {
            this.logger.error('PayPal capture failed', error);

            // Mark payment as failed
            try {
                await this.prisma.payments.updateMany({
                    where: { gatewayTransactionId: paypalOrderId },
                    data: { lifecycle: 'CANCELLED' },
                });
            } catch (dbError) {
                this.logger.error('Failed to update payment status', dbError);
            }

            throw new BadRequestException('Failed to capture PayPal payment');
        }
    }

    /**
     * Handle PayPal webhook events
     */
    async handleWebhook(event: any) {
        this.logger.log(`PayPal webhook received: ${event.event_type}`);

        switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                await this.handlePaymentCaptured(event);
                break;
            case 'PAYMENT.CAPTURE.DENIED':
            case 'PAYMENT.CAPTURE.REFUNDED':
                await this.handlePaymentFailed(event);
                break;
            default:
                this.logger.log(`Unhandled PayPal event: ${event.event_type}`);
        }

        return { received: true };
    }

    private async handlePaymentCaptured(event: any) {
        const captureId = event.resource.id;
        const orderId = event.resource.supplementary_data?.related_ids?.order_id;

        if (!orderId) {
            this.logger.warn('PayPal webhook missing order ID');
            return;
        }

        // Update payment if not already updated
        const payment = await this.prisma.payments.findFirst({
            where: { gatewayTransactionId: orderId },
        });

        if (payment && payment.lifecycle !== 'CAPTURED') {
            await this.prisma.payments.update({
                where: { id: payment.id },
                data: {
                    lifecycle: 'CAPTURED',
                    confirmedBy: 'PAYPAL_WEBHOOK',
                    confirmedAt: new Date(),
                    capturedAt: new Date(),
                },
            });

            this.logger.log(`Payment captured via webhook for order ${payment.orderId}`);
        }
    }

    private async handlePaymentFailed(event: any) {
        const orderId = event.resource.supplementary_data?.related_ids?.order_id;

        if (!orderId) {
            return;
        }

        const payment = await this.prisma.payments.findFirst({
            where: { gatewayTransactionId: orderId },
        });

        if (payment) {
            await this.prisma.payments.update({
                where: { id: payment.id },
                data: { lifecycle: 'CANCELLED' },
            });

            this.logger.warn(`Payment failed for order ${payment.orderId}`);
        }
    }
}
