import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    Header,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReconciliationService } from './reconciliation.service';
import { ValidationService } from './validation.service';
import { SettlementService } from './settlement.service';
import { AuditService } from './audit.service';
import {
    TransactionReconciliationQueryDto,
    WalletBalanceQueryDto,
} from './dto/reconciliation.dto';
import { ValidationQueryDto } from './dto/validation.dto';
import {
    SettlementQueryDto,
    PayoutExportQueryDto,
    FeeRevenueQueryDto,
} from './dto/settlement.dto';
import {
    UserTimelineQueryDto,
    SuspiciousActivityQueryDto,
    ComplianceSummaryQueryDto,
    AdminActionAuditQueryDto,
} from './dto/audit.dto';

@ApiTags('Financial Operations - Admin Only')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN')
@Controller('api/admin/financial')
export class FinancialOpsController {
    constructor(
        private readonly reconciliationService: ReconciliationService,
        private readonly validationService: ValidationService,
        private readonly settlementService: SettlementService,
        private readonly auditService: AuditService,
    ) { }

    @Get('reconciliation/ledger')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get ledger reconciliation report (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'walletId', required: false, type: String })
    @ApiQuery({ name: 'entryType', required: false, type: String })
    @ApiQuery({ name: 'transactionId', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'cursor', required: false, type: String })
    @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
    @ApiResponse({ status: 200, description: 'Ledger reconciliation report retrieved' })
    async getLedgerReconciliation(
        @Query() query: TransactionReconciliationQueryDto,
        @Query('format') format?: string,
    ) {
        const result = await this.reconciliationService.getLedgerReconciliation(query);

        if (format === 'csv') {
            const csv = await this.reconciliationService.exportToCSV(
                result.results,
                'ledger',
            );
            return csv;
        }

        return result;
    }

    @Get('reconciliation/ledger/csv')
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="ledger-reconciliation.csv"')
    @ApiOperation({ summary: 'Export ledger reconciliation report as CSV (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'walletId', required: false, type: String })
    @ApiQuery({ name: 'entryType', required: false, type: String })
    @ApiQuery({ name: 'transactionId', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'CSV export generated' })
    async exportLedgerReconciliationCSV(@Query() query: TransactionReconciliationQueryDto) {
        const result = await this.reconciliationService.getLedgerReconciliation(query);
        return this.reconciliationService.exportToCSV(result.results, 'ledger');
    }

    @Get('reconciliation/transactions')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get transaction zero-sum validation report (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Transaction zero-sum report retrieved' })
    async getTransactionZeroSumReport(@Query() query: TransactionReconciliationQueryDto) {
        return this.reconciliationService.getTransactionZeroSumReport(query);
    }

    @Get('reconciliation/wallet-balances')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get wallet balance snapshots (Admin only)' })
    @ApiQuery({ name: 'walletType', required: false, type: String })
    @ApiQuery({ name: 'walletStatus', required: false, type: String })
    @ApiQuery({ name: 'currency', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
    @ApiResponse({ status: 200, description: 'Wallet balance snapshots retrieved' })
    async getWalletBalanceSnapshots(
        @Query() query: WalletBalanceQueryDto,
        @Query('format') format?: string,
    ) {
        const snapshots = await this.reconciliationService.getWalletBalanceSnapshots(query);

        if (format === 'csv') {
            return this.reconciliationService.exportToCSV(snapshots, 'wallet');
        }

        return snapshots;
    }

    @Get('reconciliation/wallet-balances/csv')
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="wallet-balances.csv"')
    @ApiOperation({ summary: 'Export wallet balance snapshots as CSV (Admin only)' })
    @ApiQuery({ name: 'walletType', required: false, type: String })
    @ApiQuery({ name: 'walletStatus', required: false, type: String })
    @ApiQuery({ name: 'currency', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiResponse({ status: 200, description: 'CSV export generated' })
    async exportWalletBalancesCSV(@Query() query: WalletBalanceQueryDto) {
        const snapshots = await this.reconciliationService.getWalletBalanceSnapshots(query);
        return this.reconciliationService.exportToCSV(snapshots, 'wallet');
    }

    @Get('reconciliation/summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get comprehensive reconciliation summary (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Reconciliation summary retrieved' })
    async getReconciliationSummary(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reconciliationService.getReconciliationSummary(startDate, endDate);
    }

    @Get('validation/ledger-zero-sum')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate ledger zero-sum invariant (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Ledger zero-sum validation completed' })
    async validateLedgerZeroSum(@Query() query: ValidationQueryDto) {
        return this.validationService.validateLedgerZeroSum(query);
    }

    @Get('validation/orphaned-entries')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Detect orphaned ledger entries (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Orphaned entries detection completed' })
    async detectOrphanedEntries(@Query() query: ValidationQueryDto) {
        return this.validationService.detectOrphanedEntries(query);
    }

    @Get('validation/missing-entries')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Detect missing ledger entries (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Missing entries detection completed' })
    async detectMissingEntries(@Query() query: ValidationQueryDto) {
        return this.validationService.detectMissingLedgerEntries(query);
    }

    @Get('validation/balance-drift')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Detect balance drift (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Balance drift detection completed' })
    async detectBalanceDrift(@Query() query: ValidationQueryDto) {
        return this.validationService.detectBalanceDrift(query);
    }

    @Get('validation/fee-integrity')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate fee integrity (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Fee integrity validation completed' })
    async validateFeeIntegrity(@Query() query: ValidationQueryDto) {
        return this.validationService.validateFeeIntegrity(query);
    }

    @Get('validation/summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get comprehensive validation summary (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Validation summary retrieved' })
    async getValidationSummary(@Query() query: ValidationQueryDto) {
        return this.validationService.getValidationSummary(query);
    }

    @Get('settlement/daily')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get daily settlement report (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Daily settlement report generated' })
    async getDailySettlement(@Query() query: SettlementQueryDto) {
        return this.settlementService.getDailySettlement(query);
    }

    @Get('settlement/daily/csv')
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="daily-settlement.csv"')
    @ApiOperation({ summary: 'Export daily settlement report as CSV (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'CSV export generated' })
    async getDailySettlementCSV(@Query() query: SettlementQueryDto) {
        const report = await this.settlementService.getDailySettlement(query);
        return this.settlementService.exportSettlementToCSV(report);
    }

    @Get('settlement/payout-export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get payout export report (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Payout export report generated' })
    async getPayoutExport(@Query() query: PayoutExportQueryDto) {
        return this.settlementService.getPayoutExport(query);
    }

    @Get('settlement/payout-export/csv')
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="payout-export.csv"')
    @ApiOperation({ summary: 'Export payout report as CSV (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'CSV export generated' })
    async getPayoutExportCSV(@Query() query: PayoutExportQueryDto) {
        const report = await this.settlementService.getPayoutExport(query);
        return this.settlementService.exportPayoutToCSV(report);
    }

    @Get('settlement/fee-revenue')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get fee revenue report (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
    @ApiResponse({ status: 200, description: 'Fee revenue report generated' })
    async getFeeRevenue(@Query() query: FeeRevenueQueryDto) {
        return this.settlementService.getFeeRevenue(query);
    }

    @Get('settlement/fee-revenue/csv')
    @HttpCode(HttpStatus.OK)
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="fee-revenue.csv"')
    @ApiOperation({ summary: 'Export fee revenue report as CSV (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
    @ApiResponse({ status: 200, description: 'CSV export generated' })
    async getFeeRevenueCSV(@Query() query: FeeRevenueQueryDto) {
        const report = await this.settlementService.getFeeRevenue(query);
        return this.settlementService.exportFeeRevenueToCSV(report);
    }

    @Get('audit/user-timeline/:userId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get user financial timeline (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'cursor', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'User timeline retrieved' })
    async getUserTimeline(
        @Param('userId') userId: string,
        @Query() query: UserTimelineQueryDto,
    ) {
        return this.auditService.getUserFinancialTimeline(userId, query);
    }

    @Get('audit/suspicious-activity')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Detect suspicious activity patterns (Admin only)' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    @ApiQuery({ name: 'withdrawalCountThreshold', required: false, type: Number })
    @ApiQuery({ name: 'largeAmountThreshold', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Suspicious activity report generated' })
    async getSuspiciousActivity(@Query() query: SuspiciousActivityQueryDto) {
        return this.auditService.getSuspiciousActivity(query);
    }

    @Get('audit/compliance-summary')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get compliance summary metrics (Admin only)' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    @ApiResponse({ status: 200, description: 'Compliance summary generated' })
    async getComplianceSummary(@Query() query: ComplianceSummaryQueryDto) {
        return this.auditService.getComplianceSummary(query);
    }

    @Get('audit/admin-actions')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get admin action audit trail (Admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'actorId', required: false, type: String })
    @ApiQuery({ name: 'actionType', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Admin action audit retrieved' })
    async getAdminActions(@Query() query: AdminActionAuditQueryDto) {
        return this.auditService.getAdminActionAudit(query);
    }
}
