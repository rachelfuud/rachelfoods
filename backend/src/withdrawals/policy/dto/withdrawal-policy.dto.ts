import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsNumber,
    Min,
    IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PolicyScopeType {
    GLOBAL = 'GLOBAL',
    ROLE = 'ROLE',
}

export enum PolicyRole {
    SELLER = 'SELLER',
    AGENT = 'AGENT',
}

export class CreateWithdrawalPolicyDto {
    @ApiProperty({ enum: PolicyScopeType, description: 'Policy scope type' })
    @IsEnum(PolicyScopeType)
    scopeType: PolicyScopeType;

    @ApiPropertyOptional({ enum: PolicyRole, description: 'Role for ROLE-scoped policies' })
    @IsOptional()
    @IsEnum(PolicyRole)
    role?: PolicyRole;

    @ApiProperty({ description: 'Currency code (e.g., INR)' })
    @IsString()
    currency: string;

    @ApiPropertyOptional({ description: 'Daily amount limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    dailyAmountLimit?: number;

    @ApiPropertyOptional({ description: 'Weekly amount limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    weeklyAmountLimit?: number;

    @ApiPropertyOptional({ description: 'Monthly amount limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    monthlyAmountLimit?: number;

    @ApiPropertyOptional({ description: 'Daily count limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    dailyCountLimit?: number;

    @ApiPropertyOptional({ description: 'Weekly count limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    weeklyCountLimit?: number;

    @ApiPropertyOptional({ description: 'Monthly count limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    monthlyCountLimit?: number;

    @ApiPropertyOptional({ description: 'Maximum single withdrawal amount' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxSingleWithdrawal?: number;

    @ApiPropertyOptional({ description: 'Minimum single withdrawal amount' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minSingleWithdrawal?: number;

    @ApiPropertyOptional({ description: 'Enable policy', default: true })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean = true;
}

export class UpdateWithdrawalPolicyDto {
    @ApiPropertyOptional({ description: 'Daily amount limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    dailyAmountLimit?: number;

    @ApiPropertyOptional({ description: 'Weekly amount limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    weeklyAmountLimit?: number;

    @ApiPropertyOptional({ description: 'Monthly amount limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    monthlyAmountLimit?: number;

    @ApiPropertyOptional({ description: 'Daily count limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    dailyCountLimit?: number;

    @ApiPropertyOptional({ description: 'Weekly count limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    weeklyCountLimit?: number;

    @ApiPropertyOptional({ description: 'Monthly count limit' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    monthlyCountLimit?: number;

    @ApiPropertyOptional({ description: 'Maximum single withdrawal amount' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxSingleWithdrawal?: number;

    @ApiPropertyOptional({ description: 'Minimum single withdrawal amount' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minSingleWithdrawal?: number;
}

export interface WithdrawalPolicyResponse {
    id: string;
    scopeType: string;
    role: string | null;
    currency: string;
    dailyAmountLimit: string | null;
    weeklyAmountLimit: string | null;
    monthlyAmountLimit: string | null;
    dailyCountLimit: number | null;
    weeklyCountLimit: number | null;
    monthlyCountLimit: number | null;
    maxSingleWithdrawal: string | null;
    minSingleWithdrawal: string | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface EffectivePolicy {
    policyId: string;
    scopeType: string;
    role: string | null;
    currency: string;
    dailyAmountLimit: number | null;
    weeklyAmountLimit: number | null;
    monthlyAmountLimit: number | null;
    dailyCountLimit: number | null;
    weeklyCountLimit: number | null;
    monthlyCountLimit: number | null;
    maxSingleWithdrawal: number | null;
    minSingleWithdrawal: number | null;
}

export interface LimitViolation {
    violationType: string;
    message: string;
    currentValue: number | string;
    limitValue: number | string;
}

export interface LimitEvaluationResult {
    allowed: boolean;
    violations: LimitViolation[];
    policyApplied: EffectivePolicy | null;
    metrics: {
        dailyCount: number;
        weeklyCount: number;
        monthlyCount: number;
        dailyAmount: string;
        weeklyAmount: string;
        monthlyAmount: string;
    };
}
