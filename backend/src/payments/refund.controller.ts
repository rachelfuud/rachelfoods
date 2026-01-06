import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RefundPermissions } from '../auth/permissions.constants';
import {
    CreateRefundDto,
    ApproveRefundDto,
    RejectRefundDto,
} from './dto/refund-dtos';

/**
 * RefundController
 * 
 * ARCHITECTURAL PRINCIPLE:
 * This controller is THIN - it ONLY:
 * 1. Validates input (via DTOs)
 * 2. Extracts user context
 * 3. Delegates to RefundService
 * 4. Returns service result
 * 
 * NO BUSINESS LOGIC. NO PRISMA. NO CROSS-SERVICE CALLS.
 * Services own all orchestration and database access.
 * 
 * REFUND WORKFLOW:
 * 1. Buyer initiates refund → POST /refunds (PENDING)
 * 2. Admin approves → POST /refunds/:id/approve (APPROVED)
 * 3. System processes → POST /refunds/:id/process (COMPLETED)
 *    OR Admin rejects → POST /refunds/:id/reject (REJECTED)
 */
@Controller('refunds')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RefundController {
    constructor(private readonly refundService: RefundService) { }

    /**
     * POST /refunds
     * Initiate a refund request
     * 
     * Permission: refund.create
     * Required: buyer role (who paid for the order)
     */
    @Post()
    @RequirePermission(RefundPermissions.CREATE)
    async initiateRefund(
        @Body() dto: CreateRefundDto,
        @CurrentUser() user: any,
    ) {
        return this.refundService.initiateRefund({
            paymentId: dto.paymentId,
            amount: dto.amount,
            reason: dto.reason,
            description: dto.description,
            evidence: dto.evidence,
            refundPlatformFee: dto.refundPlatformFee ?? false,
            requestedBy: user.id, // Extract from authenticated user
        });
    }

    /**
     * POST /refunds/:id/approve
     * Approve a refund request
     * 
     * Permission: refund.approve
     * Required: platform-admin role
     */
    @Post(':id/approve')
    @RequirePermission(RefundPermissions.APPROVE)
    async approveRefund(
        @Param('id') refundId: string,
        @Body() dto: ApproveRefundDto,
        @CurrentUser() user: any,
    ) {
        return this.refundService.approveRefund(refundId, user.id);
    }

    /**
     * POST /refunds/:id/reject
     * Reject a refund request
     * 
     * Permission: refund.reject
     * Required: platform-admin role
     */
    @Post(':id/reject')
    @RequirePermission(RefundPermissions.REJECT)
    async rejectRefund(
        @Param('id') refundId: string,
        @Body() dto: RejectRefundDto,
        @CurrentUser() user: any,
    ) {
        return this.refundService.rejectRefund(refundId, user.id, dto.reason);
    }

    /**
     * POST /refunds/:id/process
     * Process an approved refund (execute ledger entries)
     * 
     * Permission: refund.process
     * Required: platform-admin role
     * 
     * Note: This endpoint triggers actual money movement via ledger.
     * Should only be called after manual verification by admin.
     */
    @Post(':id/process')
    @RequirePermission(RefundPermissions.PROCESS)
    async processRefund(
        @Param('id') refundId: string,
        @CurrentUser() user: any,
    ) {
        return this.refundService.processRefund(refundId);
    }

    /**
     * GET /refunds/:id
     * Get refund details
     * 
     * Permission: refund.read_self OR refund.read_any
     * - read_self: buyers/sellers can see their own refunds
     * - read_any: platform-admin can see all refunds
     */
    @Get(':id')
    @RequirePermission(RefundPermissions.READ_SELF, RefundPermissions.READ_ANY)
    async getRefund(
        @Param('id') refundId: string,
        @CurrentUser() user: any,
    ) {
        // TODO: Implement access control check in service layer
        // User should only see refunds they're involved in (unless admin)
        return this.refundService.getRefund(refundId);
    }

    /**
     * GET /payments/:paymentId/refunds
     * Get all refunds for a payment
     * 
     * Permission: refund.read_self OR refund.read_any
     * - read_self: buyers/sellers can see refunds for their payments
     * - read_any: platform-admin can see all refunds
     */
    @Get('/payments/:paymentId/refunds')
    @RequirePermission(RefundPermissions.READ_SELF, RefundPermissions.READ_ANY)
    async getRefundsByPayment(
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: any,
    ) {
        // TODO: Implement access control check in service layer
        // User should only see refunds for payments they're involved in (unless admin)
        return this.refundService.getRefundsByPayment(paymentId);
    }
}
