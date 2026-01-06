import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { HighRiskUsersQueryDto } from './dto/withdrawal-risk.dto';

@ApiTags('Withdrawal Risk Analysis - Admin Only')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN', 'ADMIN')
@Controller('api/admin/withdrawals/risk')
export class WithdrawalRiskController {
    constructor(private readonly riskService: WithdrawalRiskService) { }

    @Get('user/:userId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get risk profile for a specific user (Admin only)',
        description:
            'READ-ONLY: Computes comprehensive risk signals based on historical withdrawal patterns',
    })
    @ApiParam({ name: 'userId', description: 'User ID to analyze' })
    @ApiResponse({
        status: 200,
        description: 'User risk profile retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getUserRiskProfile(@Param('userId') userId: string) {
        return this.riskService.computeUserRiskProfile(userId);
    }

    @Get('high-risk')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get list of high-risk users (Admin only)',
        description:
            'READ-ONLY: Identifies users with elevated risk scores across the platform',
    })
    @ApiResponse({
        status: 200,
        description: 'High-risk users retrieved successfully',
    })
    async getHighRiskUsers(@Query() query: HighRiskUsersQueryDto) {
        return this.riskService.getHighRiskUsers(query.minScore, query.limit);
    }

    @Get('signals/summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get platform-wide risk signals summary (Admin only)',
        description:
            'READ-ONLY: Aggregates risk metrics and signal occurrences across all users',
    })
    @ApiResponse({
        status: 200,
        description: 'Risk signals summary retrieved successfully',
    })
    async getRiskSignalsSummary() {
        return this.riskService.getRiskSignalsSummary();
    }
}
