import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDecimal, Min, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class InitiateWithdrawalDto {
    @ApiProperty({ description: 'Wallet ID to withdraw from' })
    @IsNotEmpty()
    @IsString()
    walletId: string;

    @ApiProperty({ description: 'Amount to withdraw' })
    @IsNotEmpty()
    @Type(() => Number)
    @Min(1)
    requestedAmount: number;

    @ApiProperty({ description: 'Bank account number' })
    @IsNotEmpty()
    @IsString()
    bankAccount: string;

    @ApiProperty({ description: 'Account holder name' })
    @IsNotEmpty()
    @IsString()
    accountHolder: string;

    @ApiProperty({ description: 'Bank name', required: false })
    @IsString()
    bankName?: string;

    @ApiProperty({ description: 'IFSC code', required: false })
    @IsString()
    ifscCode?: string;

    @ApiPropertyOptional({
        description: 'Admin-only: Bypass active cooling period (requires bypassReason)',
        type: Boolean
    })
    @IsOptional()
    @IsBoolean()
    bypassCooling?: boolean;

    @ApiPropertyOptional({
        description: 'Admin-only: Reason for bypassing cooling period (required if bypassCooling=true)',
        type: String,
        minLength: 10
    })
    @IsOptional()
    @IsString()
    @MinLength(10, { message: 'Bypass reason must be at least 10 characters' })
    bypassReason?: string;
}
