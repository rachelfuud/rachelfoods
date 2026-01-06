import { ApiProperty } from '@nestjs/swagger';
import { ShippingStatus } from '@prisma/client';

export type AgentActivityEvent =
    | 'assignment_accepted'
    | 'pickup_confirmed'
    | 'transit_started'
    | 'delivery_confirmed'
    | 'delivery_failed'
    | 'assignment_cancelled';

export class AgentActivityEntryDto {
    @ApiProperty({ description: 'Activity timestamp' })
    timestamp: Date;

    @ApiProperty({
        enum: [
            'assignment_accepted',
            'pickup_confirmed',
            'transit_started',
            'delivery_confirmed',
            'delivery_failed',
            'assignment_cancelled',
        ],
        description: 'Activity event type',
    })
    event: AgentActivityEvent;

    @ApiProperty({ description: 'Shipping assignment ID' })
    assignmentId: string;

    @ApiProperty({ description: 'Order number' })
    orderNumber: string;

    @ApiProperty({ enum: ShippingStatus, required: false, description: 'Previous status' })
    fromStatus: ShippingStatus | null;

    @ApiProperty({ enum: ShippingStatus, description: 'New status' })
    toStatus: ShippingStatus;

    @ApiProperty({ required: false, description: 'Additional notes or comments' })
    notes?: string;
}

export class AgentActivityTimelineDto {
    @ApiProperty({ description: 'Unique agent ID' })
    agentId: string;

    @ApiProperty({ description: 'Agent code identifier' })
    agentCode: string;

    @ApiProperty({ type: [AgentActivityEntryDto], description: 'Activity log entries' })
    activities: AgentActivityEntryDto[];

    @ApiProperty({ description: 'Total number of activities in period' })
    total: number;

    @ApiProperty({ description: 'Whether more activities exist (pagination)' })
    hasMore: boolean;
}
