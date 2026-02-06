import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Body,
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
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import { WithdrawalPolicyInsightsService } from './withdrawal-policy-insights.service';
import { WithdrawalPolicySimulationService } from './withdrawal-policy-simulation.service';
import {
    CreateWithdrawalPolicyDto,
    UpdateWithdrawalPolicyDto,
} from './dto/withdrawal-policy.dto';
import {
    PolicyInsightsQueryDto,
    SimulateWithdrawalDto,
} from './dto/policy-insights.dto';

@ApiTags('Withdrawal Policies - Admin Only')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN')
@Controller('api/admin/withdrawal-policies')
export class WithdrawalPolicyController {
    constructor(
        private readonly policyService: WithdrawalPolicyService,
        private readonly insightsService: WithdrawalPolicyInsightsService,
        private readonly simulationService: WithdrawalPolicySimulationService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new withdrawal policy (Admin only)' })
    @ApiResponse({ status: 201, description: 'Policy created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid policy configuration' })
    async createPolicy(@Body() dto: CreateWithdrawalPolicyDto) {
        return this.policyService.createPolicy(dto);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update an existing withdrawal policy (Admin only)' })
    @ApiResponse({ status: 200, description: 'Policy updated successfully' })
    @ApiResponse({ status: 404, description: 'Policy not found' })
    async updatePolicy(
        @Param('id') id: string,
        @Body() dto: UpdateWithdrawalPolicyDto,
    ) {
        return this.policyService.updatePolicy(id, dto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all withdrawal policies (Admin only)' })
    @ApiResponse({ status: 200, description: 'Policies retrieved successfully' })
    async getAllPolicies() {
        return this.policyService.getAllPolicies();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get a specific withdrawal policy (Admin only)' })
    @ApiResponse({ status: 200, description: 'Policy retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Policy not found' })
    async getPolicyById(@Param('id') id: string) {
        return this.policyService.getPolicyById(id);
    }

    @Patch(':id/enable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Enable a withdrawal policy (Admin only)' })
    @ApiResponse({ status: 200, description: 'Policy enabled successfully' })
    @ApiResponse({ status: 404, description: 'Policy not found' })
    async enablePolicy(@Param('id') id: string) {
        return this.policyService.enablePolicy(id);
    }

    @Patch(':id/disable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable a withdrawal policy (Admin only)' })
    @ApiResponse({ status: 200, description: 'Policy disabled successfully' })
    @ApiResponse({ status: 404, description: 'Policy not found' })
    async disablePolicy(@Param('id') id: string) {
        return this.policyService.disablePolicy(id);
    }

    // ========================================
    // OBSERVABILITY ENDPOINTS (READ-ONLY)
    // ========================================

    @Get('insights/summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get policy violation insights summary (Admin only)',
        description: 'READ-ONLY: Provides aggregated metrics on policy violations',
    })
    @ApiResponse({
        status: 200,
        description: 'Insights retrieved successfully',
    })
    async getInsightsSummary(@Query() query: PolicyInsightsQueryDto) {
        return this.insightsService.getInsightsSummary(query.timeWindow);
    }

    @Get('insights/by-policy')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get policy violations grouped by policy (Admin only)',
        description: 'READ-ONLY: Shows which policies are blocking most withdrawals',
    })
    @ApiResponse({
        status: 200,
        description: 'Policy-grouped insights retrieved successfully',
    })
    async getInsightsByPolicy(@Query() query: PolicyInsightsQueryDto) {
        return this.insightsService.getInsightsByPolicy(query.timeWindow);
    }

    @Get('insights/by-role')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get policy violations grouped by role (Admin only)',
        description: 'READ-ONLY: Shows which roles are blocked most frequently',
    })
    @ApiResponse({
        status: 200,
        description: 'Role-grouped insights retrieved successfully',
    })
    async getInsightsByRole(@Query() query: PolicyInsightsQueryDto) {
        return this.insightsService.getInsightsByRole(query.timeWindow);
    }

    @Post('simulate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Simulate withdrawal evaluation (Admin only)',
        description:
            'READ-ONLY: Tests policy enforcement without creating withdrawal records',
    })
    @ApiResponse({
        status: 200,
        description: 'Simulation completed successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'User or wallet not found',
    })
    async simulateWithdrawal(@Body() dto: SimulateWithdrawalDto) {
        return this.simulationService.simulateWithdrawal(dto);
    }
}
