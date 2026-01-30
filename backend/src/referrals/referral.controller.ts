import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ReferralService } from './referral.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralConfigDto } from './dto/update-referral-config.dto';
import { QueryReferralDto } from './dto/query-referral.dto';

@ApiTags('referrals')
@Controller('api/referrals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReferralController {
    constructor(private readonly referralService: ReferralService) { }

    @Post('create')
    @Permissions('referral:create')
    @ApiOperation({ summary: 'Create a new referral (Buyer)' })
    @ApiResponse({ status: 201, description: 'Referral created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data or referral program inactive' })
    @ApiResponse({ status: 409, description: 'Email already referred by you' })
    async createReferral(@Body() dto: CreateReferralDto, @Request() req) {
        return this.referralService.createReferral(req.user.userId, dto);
    }

    @Get('my-referrals')
    @Permissions('referral:view')
    @ApiOperation({ summary: 'Get all referrals created by current buyer' })
    @ApiResponse({ status: 200, description: 'Referrals retrieved successfully' })
    async getMyReferrals(@Query() query: QueryReferralDto, @Request() req) {
        return this.referralService.queryReferrals({
            ...query,
            referrerId: req.user.userId,
        });
    }

    @Get('my-stats')
    @Permissions('referral:view')
    @ApiOperation({ summary: 'Get referral statistics for current buyer' })
    @ApiResponse({ status: 200, description: 'Referral statistics retrieved successfully' })
    async getMyReferralStats(@Request() req) {
        return this.referralService.getReferralStats(req.user.userId);
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Get referral by code (public endpoint for sign-up)' })
    @ApiResponse({ status: 200, description: 'Referral retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Referral code not found' })
    async getReferralByCode(@Param('code') code: string) {
        return this.referralService.getReferralByCode(code);
    }

    @Get('query')
    @Permissions('referral:viewAll')
    @ApiOperation({ summary: 'Query referrals with filters (Admin)' })
    @ApiResponse({ status: 200, description: 'Referrals retrieved successfully' })
    async queryReferrals(@Query() query: QueryReferralDto) {
        return this.referralService.queryReferrals(query);
    }

    @Get('user/:userId/stats')
    @Permissions('referral:viewAll')
    @ApiOperation({ summary: 'Get referral statistics for a user (Admin)' })
    @ApiResponse({ status: 200, description: 'Referral statistics retrieved successfully' })
    async getUserReferralStats(@Param('userId') userId: string) {
        return this.referralService.getReferralStats(userId);
    }

    @Get('config')
    @Permissions('referral:viewConfig')
    @ApiOperation({ summary: 'Get referral program configuration (Admin)' })
    @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
    async getReferralConfig() {
        return this.referralService.getreferral_config();
    }

    @Patch('config')
    @Permissions('referral:manageConfig')
    @ApiOperation({ summary: 'Update referral program configuration (Admin only)' })
    @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
    async updateReferralConfig(@Body() dto: UpdateReferralConfigDto) {
        return this.referralService.updatereferral_config(dto);
    }

    @Post('expire-old-rewards')
    @Permissions('referral:manageConfig')
    @ApiOperation({ summary: 'Manually expire old rewards (Admin only)' })
    @ApiResponse({ status: 200, description: 'Expired rewards processed' })
    async expireOldRewards() {
        return this.referralService.expireOldRewards();
    }
}
