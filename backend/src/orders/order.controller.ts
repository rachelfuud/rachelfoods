import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { KitchenRefillService } from './kitchen-refill.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ApproveCustomItemDto } from './dto/approve-custom-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderController {
    constructor(
        private readonly orderService: OrderService,
        private readonly kitchenRefillService: KitchenRefillService,
    ) { }

    /**
     * Place a new order
     * POST /orders
     */
    @Post()
    @Permissions('order.create')
    @ApiOperation({ summary: 'Place a new order' })
    @ApiResponse({ status: 201, description: 'Order successfully created' })
    @ApiResponse({ status: 400, description: 'Invalid order data' })
    async create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
        return this.orderService.create(createOrderDto, req.user.userId);
    }

    /**
     * Get all orders (filtered by user role)
     * GET /orders
     */
    @Get()
    @Permissions('order.view')
    @ApiOperation({ summary: 'Get all orders (filtered by user role)' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    async findAll(@Request() req: any, @Query() query: any) {
        return this.orderService.findAll(
            req.user.userId,
            req.user.roles || [],
            query,
        );
    }

    /**
     * Get a specific order by ID
     * GET /orders/:id
     */
    @Get(':id')
    @Permissions('order.view')
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.orderService.findOne(id, req.user.userId, req.user.roles || []);
    }

    /**
     * Confirm an order (Seller only)
     * POST /orders/:id/confirm
     */
    @Post(':id/confirm')
    @Permissions('order.confirm')
    @ApiOperation({ summary: 'Confirm an order (Seller only - seller confirmation before payment)' })
    @ApiResponse({ status: 200, description: 'Order confirmed successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - seller only' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async confirm(
        @Param('id') id: string,
        @Body() confirmDto: ConfirmOrderDto,
        @Request() req: any,
    ) {
        return this.orderService.confirmOrder(id, confirmDto, req.user.userId);
    }

    /**
     * Update order status
     * PATCH /orders/:id
     */
    @Patch(':id')
    @Permissions('order.update')
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateOrderDto,
        @Request() req: any,
    ) {
        return this.orderService.updateStatus(id, updateDto, req.user.userId);
    }

    /**
     * Cancel an order
     * POST /orders/:id/cancel
     */
    @Post(':id/cancel')
    @Permissions('order.cancel')
    async cancel(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Request() req: any,
    ) {
        return this.orderService.cancel(
            id,
            reason,
            req.user.userId,
            req.user.roles || [],
        );
    }

    // ============================================================
    // Kitchen Refill Endpoints
    // ============================================================

    /**
     * Get all kitchen refill orders
     * GET /orders/kitchen-refill/all
     */
    @Get('kitchen-refill/all')
    @Permissions('order.view')
    async getKitchenRefills(@Query() query: any) {
        return this.kitchenRefillService.findAllKitchenRefills(query);
    }

    /**
     * Get kitchen refill statistics
     * GET /orders/kitchen-refill/stats
     */
    @Get('kitchen-refill/stats')
    @Permissions('order.view')
    async getKitchenRefillStats(@Query() query: any) {
        return this.kitchenRefillService.getKitchenRefillStats(query);
    }

    /**
     * Get upcoming kitchen refills (next 7 days)
     * GET /orders/kitchen-refill/upcoming
     */
    @Get('kitchen-refill/upcoming')
    @Permissions('order.view')
    async getUpcomingRefills() {
        return this.kitchenRefillService.getUpcomingRefills();
    }

    /**
     * Get all pending custom items
     * GET /orders/custom-items/pending
     */
    @Get('custom-items/pending')
    @Permissions('order.view')
    async getPendingCustomItems() {
        return this.kitchenRefillService.findPendingCustomItems();
    }

    /**
     * Get custom items for a specific order
     * GET /orders/:id/custom-items
     */
    @Get(':id/custom-items')
    @Permissions('order.view')
    async getCustomItemsByOrder(@Param('id') id: string) {
        return this.kitchenRefillService.findCustomItemsByOrder(id);
    }

    /**
     * Approve or reject a custom item
     * POST /orders/custom-items/:itemId/approve
     */
    @Post('custom-items/:itemId/approve')
    @Permissions('order.confirm')
    async approveCustomItem(
        @Param('itemId') itemId: string,
        @Body() approveDto: ApproveCustomItemDto,
        @Request() req: any,
    ) {
        return this.kitchenRefillService.approveCustomItem(
            itemId,
            approveDto,
            req.user.userId,
        );
    }
}
