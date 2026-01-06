import { IsString, IsOptional, IsInt, IsUUID, IsEnum, MinLength, MaxLength } from 'class-validator';

export enum CategoryStatus {
    ACTIVE = 'ACTIVE',
    DISABLED = 'DISABLED',
}

export class UpdateCategoryDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    slug?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsInt()
    displayOrder?: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;
}
