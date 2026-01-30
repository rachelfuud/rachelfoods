import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/admin/coupons')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PromotionController {
    constructor(private readonly promotionService: PromotionService) { }

    /**
     * Create a new coupon
     * POST /admin/coupons
     */
    @Post()
    @Permissions('coupon.create')
    @HttpCode(HttpStatus.CREATED)
    async createCoupon(
        @Body() dto: CreateCouponDto,
        @CurrentUser() user: any,
    ) {
        return this.promotionService.createCoupon(dto, user.userId);
    }

    /**
     * Get all coupons
     * GET /admin/coupons
     */
    @Get()
    @Permissions('coupon.view')
    async getAllCoupons(@Query('includeInactive') includeInactive?: string) {
        return this.promotionService.getAllCoupons(includeInactive === 'true');
    }

    /**
     * Get coupon by ID
     * GET /admin/coupons/:id
     */
    @Get(':id')
    @Permissions('coupon.view')
    async getCouponById(@Param('id') id: string) {
        return this.promotionService.getCouponById(id);
    }

    /**
     * Get coupon statistics
     * GET /admin/coupons/:id/stats
     */
    @Get(':id/stats')
    @Permissions('coupon.view')
    async getCouponStats(@Param('id') id: string) {
        return this.promotionService.getCouponStats(id);
    }

    /**
     * Update coupon
     * PUT /admin/coupons/:id
     */
    @Put(':id')
    @Permissions('coupon.update')
    async updateCoupon(
        @Param('id') id: string,
        @Body() dto: UpdateCouponDto,
    ) {
        return this.promotionService.updateCoupon(id, dto);
    }

    /**
     * Delete coupon (soft delete)
     * DELETE /admin/coupons/:id
     */
    @Delete(':id')
    @Permissions('coupon.delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteCoupon(@Param('id') id: string) {
        await this.promotionService.deleteCoupon(id);
    }

    /**
     * Validate coupon (public endpoint for checkout)
     * POST /admin/coupons/validate
     */
    @Post('validate')
    @HttpCode(HttpStatus.OK)
    async validateCoupon(@Body() dto: ValidateCouponDto) {
        return this.promotionService.validateCoupon(dto.code, dto.orderSubtotal);
    }
}
