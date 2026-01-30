import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

class ProcessRefundDto {
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    refundAmount?: number; // If not specified, full order amount

    @IsOptional()
    @IsString()
    reason?: string;
}

@Controller('api/refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
    constructor(private refundService: RefundService) { }

    /**
     * Process refund for an order (credits wallet)
     * Admin only
     */
    @Post('/order/:orderId')
    @UseGuards(PermissionsGuard)
    @Permissions('refund.process')
    async processRefund(
        @Param('orderId') orderId: string,
        @Body() dto: ProcessRefundDto,
        @Request() req,
    ) {
        return this.refundService.processRefund(
            orderId,
            req.user.id,
            dto.refundAmount,
            dto.reason,
        );
    }

    /**
     * Get refund details
     * Admin only
     */
    @Get('/:refundId')
    @UseGuards(PermissionsGuard)
    @Permissions('refund.view')
    async getRefund(@Param('refundId') refundId: string) {
        return this.refundService.getRefund(refundId);
    }

    /**
     * Get refunds for specific order
     * Admin or order owner
     */
    @Get('/order/:orderId')
    async getRefundsByOrder(@Param('orderId') orderId: string) {
        return this.refundService.getRefundsByOrder(orderId);
    }

    /**
     * List all refunds
     * Admin only
     */
    @Get('/')
    @UseGuards(PermissionsGuard)
    @Permissions('refund.view')
    async getAllRefunds() {
        return this.refundService.getAllRefunds();
    }
}
