import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitReviewDto {
    @ApiProperty({
        description: 'Product quality rating (1-5)',
        minimum: 1,
        maximum: 5,
        example: 4,
    })
    @IsInt()
    @Min(1)
    @Max(5)
    productQualityRating: number;

    @ApiProperty({
        description: 'Delivery experience rating (1-5)',
        minimum: 1,
        maximum: 5,
        example: 5,
    })
    @IsInt()
    @Min(1)
    @Max(5)
    deliveryExperienceRating: number;

    @ApiProperty({
        description: 'Overall satisfaction rating (1-5)',
        minimum: 1,
        maximum: 5,
        example: 4,
    })
    @IsInt()
    @Min(1)
    @Max(5)
    overallSatisfactionRating: number;

    @ApiProperty({
        description: 'Recommendation score (0-10): Would you recommend this to a friend?',
        minimum: 0,
        maximum: 10,
        example: 8,
    })
    @IsInt()
    @Min(0)
    @Max(10)
    recommendationScore: number;

    @ApiPropertyOptional({
        description: 'Optional written feedback',
        example: 'Great food quality and fast delivery! Highly recommended.',
    })
    @IsOptional()
    @IsString()
    feedback?: string;
}
