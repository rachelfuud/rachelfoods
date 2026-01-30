import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { DeliveryAgentService } from './delivery-agent.service';
import { CreateDeliveryAgentDto } from './dto/create-delivery-agent.dto';
import { UpdateDeliveryAgentDto } from './dto/update-delivery-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/delivery-agents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveryAgentController {
    constructor(private readonly deliveryAgentService: DeliveryAgentService) { }

    /**
     * Create a new delivery agent
     * POST /delivery-agents
     */
    @Post()
    @Permissions('user.create')
    async create(@Body() createDto: CreateDeliveryAgentDto) {
        return this.deliveryAgentService.create(createDto);
    }

    /**
     * Get all delivery agents
     * GET /delivery-agents
     */
    @Get()
    @Permissions('shipping.view')
    async findAll(@Query() query: any) {
        return this.deliveryAgentService.findAll(query);
    }

    /**
     * Get current agent's profile
     * GET /delivery-agents/me
     */
    @Get('me')
    @Permissions('shipping.view')
    async getMyProfile(@Request() req: any) {
        return this.deliveryAgentService.findByUserId(req.user.userId);
    }

    /**
     * Get agent statistics
     * GET /delivery-agents/:id/statistics
     */
    @Get(':id/statistics')
    @Permissions('shipping.view')
    async getStatistics(@Param('id') id: string) {
        return this.deliveryAgentService.getStatistics(id);
    }

    /**
     * Get available agents for a zip code
     * GET /delivery-agents/available/:zipCode
     */
    @Get('available/:zipCode')
    @Permissions('shipping.assign')
    async getAvailableAgents(@Param('zipCode') zipCode: string) {
        return this.deliveryAgentService.getAvailableAgentsForZipCode(zipCode);
    }

    /**
     * Get a specific delivery agent
     * GET /delivery-agents/:id
     */
    @Get(':id')
    @Permissions('shipping.view')
    async findOne(@Param('id') id: string) {
        return this.deliveryAgentService.findOne(id);
    }

    /**
     * Update delivery agent
     * PATCH /delivery-agents/:id
     */
    @Patch(':id')
    @Permissions('user.update')
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateDeliveryAgentDto,
    ) {
        return this.deliveryAgentService.update(id, updateDto);
    }

    /**
     * Toggle agent availability
     * POST /delivery-agents/:id/toggle-availability
     */
    @Post(':id/toggle-availability')
    @Permissions('shipping.update_status')
    async toggleAvailability(@Param('id') id: string) {
        return this.deliveryAgentService.toggleAvailability(id);
    }
}
