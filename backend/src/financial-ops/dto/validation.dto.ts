import { IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidationQueryDto {
    @ApiProperty({ required: false, description: 'Start date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, description: 'End date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, description: 'Limit results', default: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number = 100;
}

export interface LedgerZeroSumViolation {
    transactionId: string;
    entryCount: number;
    totalAmount: string;
    expectedAmount: string;
    difference: string;
    entries: Array<{
        id: string;
        walletId: string;
        amount: string;
        entryType: string;
        description: string;
        createdAt: string;
    }>;
}

export interface LedgerZeroSumValidationResult {
    totalTransactionsChecked: number;
    violationsFound: number;
    violations: LedgerZeroSumViolation[];
}

export interface OrphanedLedgerEntry {
    entryId: string;
    walletId: string;
    amount: string;
    entryType: string;
    transactionId: string;
    paymentId: string | null;
    orderId: string | null;
    refundId: string | null;
    description: string;
    reason: string;
    createdAt: string;
}

export interface OrphanedEntryValidationResult {
    totalEntriesChecked: number;
    orphanedEntriesFound: number;
    orphanedEntries: OrphanedLedgerEntry[];
}

export interface MissingLedgerEntry {
    resourceType: 'payment' | 'refund' | 'withdrawal';
    resourceId: string;
    expectedEntryType: string;
    transactionId: string;
    amount: string;
    status: string;
    reason: string;
    createdAt: string;
}

export interface MissingLedgerEntryResult {
    totalResourcesChecked: number;
    missingEntriesFound: number;
    missingEntries: MissingLedgerEntry[];
}

export interface BalanceDrift {
    walletId: string;
    walletCode: string;
    walletType: string;
    computedBalance: string;
    cachedBalance: string;
    difference: string;
    entryCount: number;
    lastEntryAt: string | null;
}

export interface BalanceDriftValidationResult {
    totalWalletsChecked: number;
    driftsFound: number;
    drifts: BalanceDrift[];
}

export interface FeeIntegrityViolation {
    resourceType: 'withdrawal' | 'payment';
    resourceId: string;
    requestedAmount: string;
    feeAmount: string;
    netAmount: string;
    expectedNetAmount: string;
    difference: string;
    reason: string;
    createdAt: string;
}

export interface FeeIntegrityValidationResult {
    totalResourcesChecked: number;
    violationsFound: number;
    violations: FeeIntegrityViolation[];
}

export interface ValidationSummary {
    validationRunAt: string;
    ledgerZeroSum: {
        checked: number;
        violations: number;
    };
    orphanedEntries: {
        checked: number;
        orphaned: number;
    };
    missingEntries: {
        checked: number;
        missing: number;
    };
    balanceDrift: {
        checked: number;
        drifts: number;
    };
    feeIntegrity: {
        checked: number;
        violations: number;
    };
}
