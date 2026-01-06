import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum RiskSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export enum RiskSignalType {
    FREQUENCY_ACCELERATION = 'FREQUENCY_ACCELERATION',
    HIGH_FAILURE_RATE = 'HIGH_FAILURE_RATE',
    AMOUNT_DEVIATION = 'AMOUNT_DEVIATION',
    MULTIPLE_BANK_ACCOUNTS = 'MULTIPLE_BANK_ACCOUNTS',
    RECENT_REJECTIONS = 'RECENT_REJECTIONS',
    POLICY_VIOLATION_DENSITY = 'POLICY_VIOLATION_DENSITY',
}

export interface RiskSignal {
    signalType: RiskSignalType;
    severity: RiskSeverity;
    score: number; // 0-100
    explanation: string;
    metadata?: Record<string, any>;
}

export interface UserRiskProfile {
    userId: string;
    riskLevel: RiskSeverity;
    overallScore: number; // 0-100
    activeSignals: RiskSignal[];
    lastEvaluatedAt: string;
    evaluationContext: {
        totalWithdrawals: number;
        last30DaysWithdrawals: number;
        last7DaysWithdrawals: number;
        successRate: number;
        failureRate: number;
    };
}

export interface HighRiskUser {
    userId: string;
    riskLevel: RiskSeverity;
    overallScore: number;
    topSignals: {
        signalType: RiskSignalType;
        severity: RiskSeverity;
        score: number;
    }[];
    lastWithdrawalAt: string | null;
    totalWithdrawals: number;
}

export interface RiskSignalsSummary {
    totalUsersAnalyzed: number;
    riskDistribution: {
        low: number;
        medium: number;
        high: number;
    };
    topSignals: {
        signalType: RiskSignalType;
        occurrences: number;
        averageSeverity: RiskSeverity;
    }[];
    highRiskUserCount: number;
    evaluatedAt: string;
}

export class HighRiskUsersQueryDto {
    @ApiPropertyOptional({ description: 'Minimum risk score (0-100)', default: 70 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minScore?: number = 70;

    @ApiPropertyOptional({ description: 'Maximum results to return', default: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 50;
}
