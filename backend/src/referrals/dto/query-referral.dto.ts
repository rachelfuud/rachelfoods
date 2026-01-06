import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum ReferralStatus {
    PENDING = 'PENDING',
    QUALIFIED = 'QUALIFIED',
    REWARDED = 'REWARDED',
    EXPIRED = 'EXPIRED',
}

export class QueryReferralDto {
    @ApiPropertyOptional({
        description: 'Filter by referrer ID',
        example: 'uuid-user-123',
    })
    @IsOptional()
    @IsString()
    referrerId?: string;

    @ApiPropertyOptional({
        description: 'Filter by referred user ID',
        example: 'uuid-user-456',
    })
    @IsOptional()
    @IsString()
    referredUserId?: string;

    @ApiPropertyOptional({
        description: 'Filter by referral status',
        enum: ReferralStatus,
        example: 'QUALIFIED',
    })
    @IsOptional()
    @IsEnum(ReferralStatus)
    status?: ReferralStatus;

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
