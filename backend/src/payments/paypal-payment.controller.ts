import {
    Controller,
    Post,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PayPalPaymentService } from './paypal-payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Payments - PayPal')
@Controller('api/payments/paypal')
export class PayPalPaymentController {
    constructor(private paypalPaymentService: PayPalPaymentService) { }

    /**
     * Create PayPal order
     * POST /api/payments/paypal/create-order
     */
    @Post('create-order')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create PayPal order for checkout' })
    @ApiResponse({ status: 200, description: 'PayPal order created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid order or payment data' })
    async createOrder(
        @Body('orderId') orderId: string,
        @CurrentUser() user: any,
    ) {
        return this.paypalPaymentService.createPayPalOrder(orderId, user.id);
    }

    /**
     * Capture PayPal payment
     * POST /api/payments/paypal/capture/:paypalOrderId
     */
    @Post('capture/:paypalOrderId')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Capture PayPal payment after buyer approval' })
    @ApiResponse({ status: 200, description: 'Payment captured successfully' })
    @ApiResponse({ status: 400, description: 'Payment capture failed' })
    async capturePayment(
        @Param('paypalOrderId') paypalOrderId: string,
    ) {
        return this.paypalPaymentService.capturePayPalPayment(paypalOrderId);
    }

    /**
     * PayPal webhook endpoint
     * POST /api/payments/paypal/webhook
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle PayPal webhook events' })
    async handleWebhook(@Body() event: any) {
        return this.paypalPaymentService.handleWebhook(event);
    }
}
