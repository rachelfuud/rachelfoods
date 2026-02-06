import {
    Controller,
    Get,
    Put,
    Param,
    Body,
    UseGuards,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminOrderService } from './admin-order.service';
import { UpdateOrderStatusDto } from './dto';

@Controller('api/admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
export class AdminOrderController {
    constructor(private readonly adminOrderService: AdminOrderService) { }

    @Get()
    async getAllOrders(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('status') status?: string,
        @Query('paymentStatus') paymentStatus?: string,
        @Query('search') search?: string,
    ) {
        return this.adminOrderService.findAll({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            status,
            paymentStatus,
            search,
        });
    }

    @Get(':id')
    async getOrder(@Param('id') id: string) {
        return this.adminOrderService.findOne(id);
    }

    @Put(':id/status')
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.adminOrderService.updateStatus(id, dto);
    }

    @Get('stats/overview')
    async getOrderStats() {
        return this.adminOrderService.getStats();
    }
}
