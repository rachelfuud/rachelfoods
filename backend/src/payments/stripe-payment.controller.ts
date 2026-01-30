import {
    Controller,
    Post,
    Body,
    Headers,
    RawBodyRequest,
    Req,
    UseGuards,
    Get,
    Param,
} from '@nestjs/common';
import { StripePaymentService } from './stripe-payment.service';
import { CreatePaymentIntentDto, PaymentResponseDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('api/payments')
export class StripePaymentController {
    constructor(private readonly stripePaymentService: StripePaymentService) { }

    /**
     * POST /api/payments/create-intent
     * Create a Stripe PaymentIntent for an order
     */
    @Post('create-intent')
    @UseGuards(JwtAuthGuard)
    async createPaymentIntent(
        @Body() dto: CreatePaymentIntentDto,
        @Req() req: Request,
    ): Promise<PaymentResponseDto> {
        const userId = (req.user as any).sub;
        return this.stripePaymentService.createPaymentIntent(dto.orderId, userId);
    }

    /**
     * POST /api/payments/webhook
     * Handle Stripe webhook events
     * NOTE: This endpoint must be configured to receive raw body in main.ts
     */
    @Post('webhook')
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() req: RawBodyRequest<Request>,
    ) {
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new Error('Raw body is required for webhook verification');
        }
        return this.stripePaymentService.handleWebhook(signature, rawBody);
    }

    /**
     * GET /api/payments/order/:orderId
     * Get payment transactions for an order
     */
    @Get('order/:orderId')
    @UseGuards(JwtAuthGuard)
    async getOrderPayments(
        @Param('orderId') orderId: string,
        @Req() req: Request,
    ) {
        const userId = (req.user as any).sub;
        return this.stripePaymentService.getOrderPayments(orderId, userId);
    }

    /**
     * POST /api/payments/cod-confirm
     * Confirm COD order (mark as awaiting confirmation)
     */
    @Post('cod-confirm')
    @UseGuards(JwtAuthGuard)
    async confirmCODOrder(
        @Body() dto: CreatePaymentIntentDto,
        @Req() req: Request,
    ) {
        const userId = (req.user as any).sub;
        return this.stripePaymentService.markOrderAsAwaitingConfirmation(dto.orderId, userId);
    }
}
