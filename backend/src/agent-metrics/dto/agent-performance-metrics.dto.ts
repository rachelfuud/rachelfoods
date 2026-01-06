import { ApiProperty } from '@nestjs/swagger';
import { DeliveryAgentStatus } from '@prisma/client';

export class AgentPerformanceMetricsDto {
    @ApiProperty({ description: 'Unique agent ID' })
    agentId: string;

    @ApiProperty({ description: 'Agent code identifier' })
    agentCode: string;

    @ApiProperty({ description: 'Full name of agent' })
    agentName: string;

    // Delivery Stats
    @ApiProperty({ description: 'Total number of assignments' })
    totalAssignments: number;

    @ApiProperty({ description: 'Total deliveries (completed or failed)' })
    totalDeliveries: number;

    @ApiProperty({ description: 'Successfully delivered assignments' })
    successfulDeliveries: number;

    @ApiProperty({ description: 'Failed delivery attempts' })
    failedDeliveries: number;

    @ApiProperty({ description: 'Cancelled assignments' })
    cancelledAssignments: number;

    @ApiProperty({ description: 'Success rate percentage (successful / total * 100)' })
    successRate: number;

    // Time-based Metrics
    @ApiProperty({ description: 'Average pickup time in minutes (ASSIGNED to PICKED_UP)' })
    avgPickupTime: number;

    @ApiProperty({ description: 'Average transit time in minutes (PICKED_UP to DELIVERED)' })
    avgTransitTime: number;

    @ApiProperty({ description: 'Average total delivery time in minutes (ASSIGNED to DELIVERED)' })
    avgTotalDeliveryTime: number;

    // SLA Compliance
    @ApiProperty({ description: 'Number of on-time deliveries' })
    onTimeDeliveries: number;

    @ApiProperty({ description: 'Number of late deliveries' })
    lateDeliveries: number;

    @ApiProperty({ description: 'On-time delivery rate percentage' })
    onTimeRate: number;

    @ApiProperty({ description: 'Average delay in minutes for late deliveries' })
    avgDelayMinutes: number;

    // Current Status
    @ApiProperty({ description: 'Number of current active assignments' })
    currentAssignments: number;

    @ApiProperty({ description: 'Agent availability status' })
    isAvailable: boolean;

    @ApiProperty({ enum: DeliveryAgentStatus, description: 'Agent status' })
    status: DeliveryAgentStatus;

    // Period
    @ApiProperty({ description: 'Start of metrics calculation period' })
    periodStart: Date;

    @ApiProperty({ description: 'End of metrics calculation period' })
    periodEnd: Date;

    @ApiProperty({ description: 'Timestamp when metrics were calculated' })
    calculatedAt: Date;
}
