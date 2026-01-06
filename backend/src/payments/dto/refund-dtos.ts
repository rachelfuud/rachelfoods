import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * DTO for initiating a refund
 */
export class CreateRefundDto {
    @IsString()
    @IsNotEmpty()
    paymentId: string;

    @Transform(({ value }) => new Decimal(value))
    @IsNotEmpty()
    amount: Decimal;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    evidence?: string[]; // URLs to photos, documents

    @IsBoolean()
    @IsOptional()
    refundPlatformFee?: boolean; // Default: false
}

/**
 * DTO for approving a refund
 */
export class ApproveRefundDto {
    // No additional fields needed - admin approves refund
    // approvedBy will come from authenticated user
}

/**
 * DTO for rejecting a refund
 */
export class RejectRefundDto {
    @IsString()
    @IsNotEmpty()
    reason: string; // Rejection reason
}
