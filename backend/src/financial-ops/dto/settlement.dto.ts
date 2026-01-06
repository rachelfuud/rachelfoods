import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class SettlementQueryDto {
    @ApiPropertyOptional({ description: 'Start date for settlement range (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for settlement range (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Maximum number of records to return', default: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 100;

    @ApiPropertyOptional({ description: 'Cursor for pagination' })
    @IsOptional()
    @IsString()
    cursor?: string;
}

export class PayoutExportQueryDto {
    @ApiPropertyOptional({ description: 'Start date for payout range (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for payout range (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Filter by withdrawal status' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Maximum number of records to return', default: 1000 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 1000;
}

export class FeeRevenueQueryDto {
    @ApiPropertyOptional({ description: 'Start date for fee revenue range (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for fee revenue range (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Group by period: day, week, month', default: 'day' })
    @IsOptional()
    @IsString()
    groupBy?: 'day' | 'week' | 'month' = 'day';
}

// Daily Settlement Report Interfaces
export interface DailySettlementEntry {
    date: string; // ISO date string
    totalPaymentsCaptured: string;
    totalPaymentsCapturedCount: number;
    totalRefundsIssued: string;
    totalRefundsIssuedCount: number;
    totalWithdrawalsProcessed: string;
    totalWithdrawalsProcessedCount: number;
    platformFeeRevenue: string;
    withdrawalFeeRevenue: string;
    netSettlement: string;
}

export interface DailySettlementReport {
    startDate: string;
    endDate: string;
    settlements: DailySettlementEntry[];
    summary: {
        totalDays: number;
        totalPaymentsCaptured: string;
        totalRefundsIssued: string;
        totalWithdrawalsProcessed: string;
        totalPlatformFeeRevenue: string;
        totalWithdrawalFeeRevenue: string;
        totalRevenue: string;
    };
    generatedAt: string;
}

// Payout Export Interfaces
export interface PayoutExportEntry {
    withdrawalId: string;
    walletId: string;
    walletCode: string;
    userId: string;
    requestedAmount: string;
    feeAmount: string;
    netAmount: string;
    status: string;
    providerName: string;
    providerWithdrawalId: string | null;
    requestedAt: string;
    processedAt: string | null;
    completedAt: string | null;
    transactionId: string;
}

export interface PayoutExportReport {
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    payouts: PayoutExportEntry[];
    summary: {
        totalPayouts: number;
        totalRequestedAmount: string;
        totalFeeAmount: string;
        totalNetAmount: string;
    };
    generatedAt: string;
}

// Fee Revenue Report Interfaces
export interface FeeRevenueEntry {
    period: string; // ISO date string or period label
    platformFeeCount: number;
    platformFeeRevenue: string;
    withdrawalFeeCount: number;
    withdrawalFeeRevenue: string;
    totalFeeRevenue: string;
}

export interface FeeRevenueReport {
    startDate: string;
    endDate: string;
    groupBy: string;
    feeRevenue: FeeRevenueEntry[];
    summary: {
        totalPeriods: number;
        totalPlatformFeeRevenue: string;
        totalWithdrawalFeeRevenue: string;
        totalRevenue: string;
    };
    generatedAt: string;
}
