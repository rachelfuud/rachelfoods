import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UserTimelineQueryDto {
    @ApiPropertyOptional({ description: 'Start date for timeline (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for timeline (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Cursor for pagination' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ description: 'Maximum number of records', default: 50, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;
}

export class SuspiciousActivityQueryDto {
    @ApiPropertyOptional({ description: 'Number of days to analyze', default: 7 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(90)
    days?: number = 7;

    @ApiPropertyOptional({ description: 'Withdrawal count threshold', default: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    withdrawalCountThreshold?: number = 5;

    @ApiPropertyOptional({ description: 'Large amount threshold', default: 100000 })
    @IsOptional()
    @Type(() => Number)
    largeAmountThreshold?: number = 100000;
}

export class ComplianceSummaryQueryDto {
    @ApiProperty({ description: 'Start date for summary (ISO 8601)' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'End date for summary (ISO 8601)' })
    @IsDateString()
    endDate: string;
}

export class AdminActionAuditQueryDto {
    @ApiPropertyOptional({ description: 'Start date for audit (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for audit (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Filter by actor ID' })
    @IsOptional()
    @IsString()
    actorId?: string;

    @ApiPropertyOptional({ description: 'Filter by action type' })
    @IsOptional()
    @IsString()
    actionType?: string;

    @ApiPropertyOptional({ description: 'Maximum number of records', default: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 100;
}

// Response Interfaces

export interface TimelineEvent {
    id: string;
    type: 'payment' | 'refund' | 'withdrawal' | 'ledger_entry';
    status: string;
    amount: string;
    timestamp: string;
    details: {
        description?: string;
        actorId?: string;
        actorType?: string;
        reason?: string;
        metadata?: any;
    };
}

export interface UserFinancialTimeline {
    userId: string;
    events: TimelineEvent[];
    pagination: {
        nextCursor: string | null;
        hasMore: boolean;
        total: number;
    };
    generatedAt: string;
}

export interface SuspiciousUser {
    userId: string;
    flags: string[];
    metrics: {
        withdrawalCount: number;
        largeWithdrawalCount: number;
        failedWithdrawalCount: number;
        uniqueBankAccounts: number;
        totalWithdrawalAmount: string;
        avgWithdrawalAmount: string;
    };
    recentWithdrawals: {
        id: string;
        amount: string;
        status: string;
        timestamp: string;
    }[];
}

export interface SuspiciousActivityReport {
    analyzedDays: number;
    thresholds: {
        withdrawalCount: number;
        largeAmount: number;
    };
    suspiciousUsers: SuspiciousUser[];
    summary: {
        totalUsersFlagged: number;
        totalFlags: number;
    };
    generatedAt: string;
}

export interface ComplianceMetrics {
    period: {
        startDate: string;
        endDate: string;
    };
    payments: {
        totalCount: number;
        totalAmount: string;
        capturedCount: number;
        capturedAmount: string;
        successRate: number;
    };
    refunds: {
        totalCount: number;
        totalAmount: string;
        completedCount: number;
        completedAmount: string;
        successRate: number;
    };
    withdrawals: {
        totalCount: number;
        totalAmount: string;
        completedCount: number;
        completedAmount: string;
        successRate: number;
        totalFees: string;
    };
    fees: {
        platformFeeRevenue: string;
        withdrawalFeeRevenue: string;
        totalRevenue: string;
    };
    generatedAt: string;
}

export interface AdminActionRecord {
    id: string;
    actorId: string;
    actorType: string;
    actionType: string;
    resourceType: string;
    resourceId: string;
    status: string;
    reason: string | null;
    timestamp: string;
    metadata: any;
}

export interface AdminActionAuditReport {
    actions: AdminActionRecord[];
    summary: {
        totalActions: number;
        actionsByType: Record<string, number>;
        actionsByActor: Record<string, number>;
    };
    generatedAt: string;
}
