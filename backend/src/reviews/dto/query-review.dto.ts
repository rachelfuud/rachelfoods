import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum ReviewStatus {
    PENDING = 'PENDING',
    SUBMITTED = 'SUBMITTED',
    MODERATED = 'MODERATED',
}

export class QueryReviewDto {
    @ApiPropertyOptional({
        description: 'Filter by buyer ID',
        example: 'uuid-buyer-123',
    })
    @IsOptional()
    @IsString()
    buyerId?: string;

    @ApiPropertyOptional({
        description: 'Filter by order ID',
        example: 'uuid-order-456',
    })
    @IsOptional()
    @IsString()
    orderId?: string;

    @ApiPropertyOptional({
        description: 'Filter by review status',
        enum: ReviewStatus,
        example: 'SUBMITTED',
    })
    @IsOptional()
    @IsEnum(ReviewStatus)
    status?: ReviewStatus;

    @ApiPropertyOptional({
        description: 'Filter flagged reviews only',
        example: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    isFlagged?: boolean;

    @ApiPropertyOptional({
        description: 'Filter hidden reviews',
        example: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    isHidden?: boolean;

    @ApiPropertyOptional({
        description: 'Page number',
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Items per page',
        default: 20,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;
}
