import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum ShippingStatusEnum {
    PENDING = 'PENDING',
    ASSIGNED = 'ASSIGNED',
    ACCEPTED = 'ACCEPTED',
    PICKED_UP = 'PICKED_UP',
    IN_TRANSIT = 'IN_TRANSIT',
    DELIVERED = 'DELIVERED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

export class UpdateShippingStatusDto {
    @IsEnum(ShippingStatusEnum)
    status: ShippingStatusEnum;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    deliveryProof?: string; // URL to photo or signature

    @IsString()
    @IsOptional()
    failureReason?: string; // Required if status is FAILED
}
