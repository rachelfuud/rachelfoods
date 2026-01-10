import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateProductVariantDto {
    @IsString()
    name: string;

    @IsString()
    sku: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
