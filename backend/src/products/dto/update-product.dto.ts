import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsNumber()
    weight?: number;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsBoolean()
    isPerishable?: boolean;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsInt()
    stock?: number;

    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @IsOptional()
    @IsBoolean()
    supportsRefill?: boolean;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductImageDto)
    images?: ProductImageDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductVideoDto)
    videos?: ProductVideoDto[];
}

export class ProductImageDto {
    @IsUrl()
    url: string;

    @IsOptional()
    @IsString()
    altText?: string;

    @IsOptional()
    @IsInt()
    displayOrder?: number;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}

export class ProductVideoDto {
    @IsUrl()
    url: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUrl()
    thumbnail?: string;

    @IsOptional()
    @IsInt()
    duration?: number;

    @IsOptional()
    @IsInt()
    displayOrder?: number;
}

