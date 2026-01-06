import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookSubscriptionDto {
    @ApiProperty({ description: 'Webhook endpoint URL', example: 'https://api.example.com/webhooks' })
    @IsUrl()
    url: string;

    @ApiProperty({ description: 'Array of event types to subscribe to', example: ['order.confirmed', 'payment.captured'] })
    @IsArray()
    @IsString({ each: true })
    eventTypes: string[];

    @ApiProperty({ description: 'Optional description of the subscription', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Whether the subscription is active', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
