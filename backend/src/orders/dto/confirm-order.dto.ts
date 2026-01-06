import { IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class ConfirmOrderDto {
    @IsOptional()
    @IsString()
    expectedDeliveryDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    shippingCostOverride?: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    shippingOverrideReason?: string;
}
