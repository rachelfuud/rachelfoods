import { IsInt, IsString, IsDecimal, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateReferralConfigDto {
    @ApiPropertyOptional({
        description: 'Minimum orders required for referral qualification',
        example: 2,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    minOrdersRequired?: number;

    @ApiPropertyOptional({
        description: 'Reward type: PERCENTAGE or FLAT',
        example: 'PERCENTAGE',
        enum: ['PERCENTAGE', 'FLAT'],
    })
    @IsOptional()
    @IsString()
    rewardType?: string;

    @ApiPropertyOptional({
        description: 'Reward value (percentage or flat amount)',
        example: 10.00,
    })
    @IsOptional()
    @Type(() => Number)
    @Min(0)
    rewardValue?: number;

    @ApiPropertyOptional({
        description: 'Reward expiry in days',
        example: 30,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    rewardExpiryDays?: number;

    @ApiPropertyOptional({
        description: 'Whether referral program is active',
        example: true,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;
}
