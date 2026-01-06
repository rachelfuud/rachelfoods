import { ApiProperty } from '@nestjs/swagger';

export class WebhookSubscriptionDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    url: string;

    @ApiProperty({ type: [String] })
    eventTypes: string[];

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty()
    createdBy: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class WebhookDeliveryDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    webhookSubscriptionId: string;

    @ApiProperty()
    eventId: string;

    @ApiProperty()
    eventType: string;

    @ApiProperty({ type: Object, additionalProperties: true })
    payload: any;

    @ApiProperty({ enum: ['PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'CANCELLED'] })
    status: string;

    @ApiProperty()
    attemptCount: number;

    @ApiProperty()
    maxRetries: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty({ required: false })
    lastAttemptAt?: Date;

    @ApiProperty({ required: false })
    nextRetryAt?: Date;

    @ApiProperty({ required: false })
    deliveredAt?: Date;

    @ApiProperty({ required: false })
    responseStatus?: number;

    @ApiProperty({ required: false })
    responseBody?: string;

    @ApiProperty({ required: false })
    errorMessage?: string;
}

export interface WebhookEventPayload<T = any> {
    eventId: string;
    eventType: string;
    timestamp: string;
    idempotencyKey: string;
    data: T;
}
