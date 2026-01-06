import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { WebhookSubscriptionDto, WebhookDeliveryDto } from './dto/webhook.dto';
import { WebhookService } from './webhook.service';
import * as crypto from 'crypto';

@ApiTags('Webhook Subscriptions (Admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN', 'ADMIN')
@Controller('api/admin/webhooks/subscriptions')
export class WebhookSubscriptionsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly webhookService: WebhookService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new webhook subscription' })
    @ApiResponse({ status: 201, description: 'Subscription created successfully', type: WebhookSubscriptionDto })
    async createSubscription(
        @Body() dto: CreateWebhookSubscriptionDto,
        @Request() req: any,
    ): Promise<any> {
        // Generate random secret for HMAC signing
        const secret = crypto.randomBytes(32).toString('hex');

        const subscription = await this.prisma.webhook_subscriptions.create({
            data: {
                url: dto.url,
                eventTypes: dto.eventTypes,
                secret,
                isActive: dto.isActive ?? true,
                description: dto.description,
                createdBy: req.user.id,
            },
        });

        // Don't return secret in response - subscriber must store it separately
        return {
            id: subscription.id,
            url: subscription.url,
            eventTypes: subscription.eventTypes,
            isActive: subscription.isActive,
            description: subscription.description,
            secret, // Only returned on creation
            createdBy: subscription.createdBy,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
        };
    }

    @Get()
    @ApiOperation({ summary: 'List all webhook subscriptions' })
    @ApiResponse({ status: 200, description: 'List of subscriptions', type: [WebhookSubscriptionDto] })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    async listSubscriptions(@Query('isActive') isActive?: string): Promise<any[]> {
        const where: any = {};

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const subscriptions = await this.prisma.webhook_subscriptions.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                url: true,
                eventTypes: true,
                isActive: true,
                description: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
                // secret not included for security
            },
        });

        return subscriptions;
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get subscription by ID' })
    @ApiResponse({ status: 200, description: 'Subscription details', type: WebhookSubscriptionDto })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async getSubscription(@Param('id') id: string): Promise<any> {
        const subscription = await this.prisma.webhook_subscriptions.findUnique({
            where: { id },
            select: {
                id: true,
                url: true,
                eventTypes: true,
                isActive: true,
                description: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
                // secret not included for security
            },
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        return subscription;
    }

    @Get(':id/deliveries')
    @ApiOperation({ summary: 'Get delivery history for a subscription' })
    @ApiResponse({ status: 200, description: 'List of deliveries', type: [WebhookDeliveryDto] })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getDeliveries(
        @Param('id') id: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ): Promise<any> {
        const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;
        const offsetNum = offset ? parseInt(offset, 10) : 0;

        return this.webhookService.getDeliveriesForSubscription(id, limitNum, offsetNum);
    }
}
