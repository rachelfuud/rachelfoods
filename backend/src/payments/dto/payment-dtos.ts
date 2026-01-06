import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsDateString,
    IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * DTO for initiating a new payment
 */
export class CreatePaymentDto {
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    @Transform(({ value }) => new Decimal(value))
    @IsNotEmpty()
    amount: Decimal;

    @IsString()
    @IsNotEmpty()
    payeeUserId: string; // Store owner or delivery agent

    @IsString()
    @IsOptional()
    categoryId?: string; // For fee calculation
}

/**
 * DTO for capturing a payment (COD completion or gateway confirmation)
 */
export class CapturePaymentDto {
    @IsString()
    @IsOptional()
    confirmedBy?: string; // Delivery agent ID (required for COD)

    @IsDateString()
    @IsOptional()
    confirmedAt?: string;

    @IsString()
    @IsOptional()
    gatewayTransactionId?: string; // For PREPAID/CHECKOUT

    @IsString()
    @IsOptional()
    gatewayResponse?: string; // JSON string from gateway
}

/**
 * DTO for cancelling a payment
 */
export class CancelPaymentDto {
    @IsString()
    @IsNotEmpty()
    reason: string;
}
