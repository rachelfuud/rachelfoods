import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, IsArray, Min, MinLength, MaxLength } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    name: string;

    @IsString()
    @MinLength(2)
    @MaxLength(200)
    slug: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @IsString()
    @MinLength(1)
    @MaxLength(20)
    unit: string; // e.g., "kg", "pack", "pcs"

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    weight: number; // Weight in kg for shipping calculation

    @IsOptional()
    @IsBoolean()
    perishable?: boolean;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];
}
