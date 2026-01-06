import { IsString, IsOptional, IsInt, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    slug: string;

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
}
