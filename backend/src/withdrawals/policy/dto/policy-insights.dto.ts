import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum InsightsTimeWindow {
    LAST_24H = 'LAST_24H',
    LAST_7D = 'LAST_7D',
    LAST_30D = 'LAST_30D',
}

export class PolicyInsightsQueryDto {
    @ApiPropertyOptional({ enum: InsightsTimeWindow, default: InsightsTimeWindow.LAST_7D })
    @IsOptional()
    @IsEnum(InsightsTimeWindow)
    timeWindow?: InsightsTimeWindow = InsightsTimeWindow.LAST_7D;
}

export class SimulateWithdrawalDto {
    @ApiProperty({ description: 'User ID to simulate for' })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Wallet ID to simulate from' })
    @IsString()
    walletId: string;

    @ApiProperty({ description: 'Withdrawal amount to simulate' })
    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Currency code' })
    @IsString()
    currency: string;

    @ApiPropertyOptional({ description: 'User role to simulate (optional)' })
    @IsOptional()
    @IsString()
    userRole?: string;
}

// Response Interfaces

export interface ViolationMetrics {
    violationType: string;
    count: number;
    percentage: number;
}

export interface PolicyViolationSummary {
    policyId: string;
    policyScope: string;
    role: string | null;
    currency: string;
    totalViolations: number;
    violationBreakdown: ViolationMetrics[];
    affectedUserCount: number;
}

export interface RoleViolationSummary {
    role: string;
    totalViolations: number;
    violationTypes: ViolationMetrics[];
    topCurrencies: {
        currency: string;
        count: number;
    }[];
}

export interface InsightsSummary {
    timeWindow: string;
    period: {
        startDate: string;
        endDate: string;
    };
    totalAttempts: number;
    totalBlocked: number;
    blockRate: number;
    topViolationTypes: ViolationMetrics[];
    topBlockedUsers: {
        userId: string;
        violationCount: number;
        lastAttempt: string;
    }[];
    policiesTriggered: {
        policyId: string;
        scope: string;
        triggerCount: number;
    }[];
}

export interface SimulationResult {
    allowed: boolean;
    evaluationMode: 'SIMULATION';
    violations: {
        violationType: string;
        message: string;
        currentValue: string | number;
        limitValue: string | number;
    }[];
    policyApplied: {
        policyId: string;
        scopeType: string;
        role: string | null;
        currency: string;
    } | null;
    userMetrics: {
        dailyCount: number;
        weeklyCount: number;
        monthlyCount: number;
        dailyAmount: string;
        weeklyAmount: string;
        monthlyAmount: string;
    };
    simulatedAt: string;
}
