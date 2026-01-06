import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class CustomOrderItemDto {
    @IsString()
    itemName: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsString()
    unit: string; // "kg", "pack", "pcs"

    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedPrice?: number;
}
