import { IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionReconciliationQueryDto {
    @ApiProperty({ required: false, description: 'Start date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, description: 'End date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, description: 'Wallet ID filter' })
    @IsOptional()
    @IsString()
    walletId?: string;

    @ApiProperty({ required: false, description: 'Entry type filter' })
    @IsOptional()
    @IsString()
    entryType?: string;

    @ApiProperty({ required: false, description: 'Transaction ID filter' })
    @IsOptional()
    @IsString()
    transactionId?: string;

    @ApiProperty({ required: false, description: 'Page size', default: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number = 100;

    @ApiProperty({ required: false, description: 'Cursor for pagination' })
    @IsOptional()
    @IsString()
    cursor?: string;
}

export class WalletBalanceQueryDto {
    @ApiProperty({ required: false, description: 'Wallet type filter' })
    @IsOptional()
    @IsString()
    walletType?: string;

    @ApiProperty({ required: false, description: 'Wallet status filter' })
    @IsOptional()
    @IsString()
    walletStatus?: string;

    @ApiProperty({ required: false, description: 'Currency filter' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({ required: false, description: 'User ID filter' })
    @IsOptional()
    @IsString()
    userId?: string;
}

export interface LedgerReconciliationResult {
    transactionId: string;
    entryCount: number;
    totalAmount: string;
    isBalanced: boolean;
    entries: Array<{
        id: string;
        walletId: string;
        amount: string;
        entryType: string;
        description: string;
        createdAt: string;
    }>;
}

export interface TransactionGroupResult {
    transactionId: string;
    entryCount: number;
    totalAmount: string;
    isBalanced: boolean;
}

export interface WalletBalanceSnapshot {
    walletId: string;
    walletCode: string;
    walletType: string;
    walletStatus: string;
    currency: string;
    userId: string | null;
    computedBalance: string;
    entryCount: number;
    lastEntryAt: string | null;
}

export interface ReconciliationSummary {
    totalTransactions: number;
    balancedTransactions: number;
    unbalancedTransactions: number;
    unbalancedList: TransactionGroupResult[];
    totalWallets: number;
    totalPlatformLiability: string;
    platformWalletBalances: {
        PLATFORM_MAIN: string;
        PLATFORM_ESCROW: string;
    };
}
