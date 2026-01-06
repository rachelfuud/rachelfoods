import { IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateReviewDto {
    @ApiPropertyOptional({
        description: 'Flag review as inappropriate',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isFlagged?: boolean;

    @ApiPropertyOptional({
        description: 'Hide review from public display',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean;

    @ApiPropertyOptional({
        description: 'Moderation notes (admin only)',
        example: 'Review contains inappropriate language',
    })
    @IsOptional()
    @IsString()
    moderationNotes?: string;
}
