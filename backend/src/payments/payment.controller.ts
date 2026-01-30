import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentPermissions } from '../auth/permissions.constants';
import {
    CreatePaymentDto,
    CapturePaymentDto,
    CancelPaymentDto,
} from './dto/payment-dtos';
import { PaymentStatus } from '@prisma/client';

/**
 * PaymentController
 * 
 * ARCHITECTURAL PRINCIPLE:
 * This controller is THIN - it ONLY:
 * 1. Validates input (via DTOs)
 * 2. Extracts user context
 * 3. Delegates to PaymentService
 * 4. Returns service result
 * 
 * NO BUSINESS LOGIC. NO PRISMA. NO CROSS-SERVICE CALLS.
 * Services own all orchestration and database access.
 */
@Controller('api/payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    /**
     * POST /payments
     * Initiate a new payment
     * 
     * Permission: payment.create
     * Required: buyer role
     */
    @Post()
    @RequirePermission(PaymentPermissions.CREATE)
    async initiatePayment(
        @Body() dto: CreatePaymentDto,
        @CurrentUser() user: any,
    ) {
        return this.paymentService.initiatePayment({
            orderId: dto.orderId,
            paymentMethod: dto.paymentMethod,
            amount: dto.amount,
            payerUserId: user.id, // Extract from authenticated user
            payeeUserId: dto.payeeUserId,
            categoryId: dto.categoryId,
        });
    }

    /**
     * POST /payments/:id/capture
     * Capture a payment (COD delivery confirmation or gateway capture)
     * 
     * Permission: payment.capture
     * Required: delivery-agent (COD) or platform-admin (gateway)
     */
    @Post(':id/capture')
    @RequirePermission(PaymentPermissions.CAPTURE)
    async capturePayment(
        @Param('id') paymentId: string,
        @Body() dto: CapturePaymentDto,
        @CurrentUser() user: any,
    ) {
        return this.paymentService.capturePayment({
            paymentId,
            confirmedBy: dto.confirmedBy || user.id, // Default to current user
            confirmedAt: dto.confirmedAt ? new Date(dto.confirmedAt) : new Date(),
            gatewayTransactionId: dto.gatewayTransactionId,
            gatewayResponse: dto.gatewayResponse, // Already a string
        });
    }

    /**
     * POST /payments/:id/cancel
     * Cancel a payment (before capture)
     * 
     * Permission: payment.cancel
     * Required: buyer or platform-admin
     */
    @Post(':id/cancel')
    @RequirePermission(PaymentPermissions.CANCEL)
    async cancelPayment(
        @Param('id') paymentId: string,
        @Body() dto: CancelPaymentDto,
        @CurrentUser() user: any,
    ) {
        return this.paymentService.cancelPayment(paymentId);
    }

    /**
     * GET /payments/:id
     * Get payment details
     * 
     * Permission: payment.read_self OR payment.read_any
     * - read_self: buyers/sellers can see their own payments
     * - read_any: platform-admin can see all payments
     */
    @Get(':id')
    @RequirePermission(PaymentPermissions.READ_SELF, PaymentPermissions.READ_ANY)
    async getPayment(
        @Param('id') paymentId: string,
        @CurrentUser() user: any,
    ) {
        const payment = await this.paymentService.getPaymentByOrder(paymentId);

        // Access control: user can only see their own payments unless they have READ_ANY
        // Note: PermissionsGuard already checked permissions, this is additional data filtering
        // TODO: Implement proper access control check in service layer

        return payment;
    }

    /**
     * GET /payments
     * Get user's payments with filtering
     * 
     * Permission: payment.read_self
     * Required: any authenticated user
     * 
     * Query params:
     * - status: PaymentStatus (optional)
     * - startDate: ISO date (optional)
     * - endDate: ISO date (optional)
     */
    @Get()
    @RequirePermission(PaymentPermissions.READ_SELF)
    async getUserPayments(
        @CurrentUser() user: any,
        @Query('status') status?: PaymentStatus,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const filters: any = {};
        if (status) filters.status = status;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);

        return this.paymentService.getUserPayments(user.id, filters);
    }
}
