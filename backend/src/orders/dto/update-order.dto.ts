import { IsOptional, IsEnum, IsDateString, IsString, IsNumber, Min, MaxLength } from 'class-validator';

export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PAID = 'PAID',
    PREPARING = 'PREPARING',
    SHIPPING = 'SHIPPING',
    DELIVERED = 'DELIVERED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export class UpdateOrderDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsDateString()
    expectedDeliveryDate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    deliveryNotes?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    cancellationReason?: string;
}
