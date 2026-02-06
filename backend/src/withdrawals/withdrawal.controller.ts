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
    Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalProcessingService } from './withdrawal-processing.service';
import { WithdrawalMetricsService } from './withdrawal-metrics.service';
import { InitiateWithdrawalDto } from './dto/initiate-withdrawal.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { CancelWithdrawalDto } from './dto/cancel-withdrawal.dto';
import { WithdrawalStatus } from '@prisma/client';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller('api/withdrawals')
export class WithdrawalController {
    constructor(
        private readonly withdrawalService: WithdrawalService,
        private readonly processingService: WithdrawalProcessingService,
        private readonly metricsService: WithdrawalMetricsService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Initiate a new withdrawal request' })
    @ApiResponse({ status: 201, description: 'Withdrawal initiated successfully' })
    async initiateWithdrawal(@Body() dto: InitiateWithdrawalDto, @Request() req: any) {
        const userId = req.user.id;
        const userRole = req.user.role;
        return this.withdrawalService.initiateWithdrawal(dto, userId, userRole);
    }

    @Put('approve')
    @Roles('PLATFORM_ADMIN')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve a withdrawal request (Admin only)' })
    @ApiResponse({ status: 200, description: 'Withdrawal approved successfully' })
    async approveWithdrawal(@Body() dto: ApproveWithdrawalDto, @Request() req: any) {
        const adminUserId = req.user.id;
        return this.withdrawalService.approveWithdrawal(dto.withdrawalId, adminUserId, dto.reason);
    }

    @Put('reject')
    @Roles('PLATFORM_ADMIN')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reject a withdrawal request (Admin only)' })
    @ApiResponse({ status: 200, description: 'Withdrawal rejected successfully' })
    async rejectWithdrawal(@Body() dto: RejectWithdrawalDto, @Request() req: any) {
        const adminUserId = req.user.id;
        return this.withdrawalService.rejectWithdrawal(dto.withdrawalId, adminUserId, dto.reason);
    }

    @Put('cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel own withdrawal request' })
    @ApiResponse({ status: 200, description: 'Withdrawal cancelled successfully' })
    async cancelWithdrawal(@Body() dto: CancelWithdrawalDto, @Request() req: any) {
        const userId = req.user.id;
        return this.withdrawalService.cancelWithdrawal(dto.withdrawalId, userId, dto.reason);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get withdrawal details by ID' })
    @ApiResponse({ status: 200, description: 'Withdrawal details retrieved' })
    async getWithdrawal(@Param('id') id: string) {
        return this.withdrawalService.getWithdrawal(id);
    }

    @Get('user/me')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get current user withdrawals' })
    @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
    @ApiResponse({ status: 200, description: 'User withdrawals retrieved' })
    async getUserWithdrawals(@Request() req: any, @Query('status') status?: WithdrawalStatus) {
        const userId = req.user.id;
        return this.withdrawalService.getUserWithdrawals(userId, status);
    }

    @Get()
    @Roles('PLATFORM_ADMIN')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all withdrawals (Admin only)' })
    @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
    @ApiResponse({ status: 200, description: 'All withdrawals retrieved' })
    async getAllWithdrawals(@Query('status') status?: WithdrawalStatus) {
        return this.withdrawalService.getAllWithdrawals(status);
    }

    @Put('process')
    @Roles('PLATFORM_ADMIN')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start processing an approved withdrawal (Admin only)' })
    @ApiResponse({ status: 200, description: 'Withdrawal processing started' })
    async processWithdrawal(@Body('withdrawalId') withdrawalId: string, @Request() req: any) {
        const initiatorId = req.user.id;
        return this.processingService.startProcessing(withdrawalId, initiatorId);
    }

    @Get('admin/metrics')
    @Roles('PLATFORM_ADMIN')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get withdrawal metrics (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
    @ApiResponse({ status: 200, description: 'Withdrawal metrics retrieved' })
    async getMetrics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const query: any = {};
        if (startDate) {
            query.startDate = new Date(startDate);
        }
        if (endDate) {
            query.endDate = new Date(endDate);
        }
        return this.metricsService.getMetrics(query);
    }

    @Put('retry')
    @Roles('PLATFORM_ADMIN')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Retry a failed withdrawal (Admin only)' })
    @ApiResponse({ status: 200, description: 'Withdrawal retry initiated' })
    async retryWithdrawal(@Body('withdrawalId') withdrawalId: string, @Request() req: any) {
        const adminUserId = req.user.id;
        return this.processingService.retryWithdrawal(withdrawalId, adminUserId);
    }
}
