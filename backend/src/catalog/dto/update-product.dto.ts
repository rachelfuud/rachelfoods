import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, IsArray, IsEnum, Min, MinLength, MaxLength } from 'class-validator';

export enum ProductStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    DISABLED = 'DISABLED',
    ARCHIVED = 'ARCHIVED',
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    slug?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    unit?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    weight?: number;

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

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;
}
