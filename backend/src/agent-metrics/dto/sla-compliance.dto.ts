import { ApiProperty } from '@nestjs/swagger';

export class SLAPeriodDto {
    @ApiProperty({ description: 'Period start date' })
    start: Date;

    @ApiProperty({ description: 'Period end date' })
    end: Date;

    @ApiProperty({ description: 'Human-readable period label', example: 'This Week' })
    label: string;
}

export class OverallSLADto {
    @ApiProperty({ description: 'Total number of deliveries' })
    totalDeliveries: number;

    @ApiProperty({ description: 'Number of on-time deliveries' })
    onTimeDeliveries: number;

    @ApiProperty({ description: 'Number of late deliveries' })
    lateDeliveries: number;

    @ApiProperty({ description: 'On-time delivery rate percentage' })
    onTimeRate: number;

    @ApiProperty({ description: 'Average delay in minutes for late deliveries' })
    avgDelayMinutes: number;
}

export class AgentSLADto {
    @ApiProperty({ description: 'Unique agent ID' })
    agentId: string;

    @ApiProperty({ description: 'Agent code identifier' })
    agentCode: string;

    @ApiProperty({ description: 'Full name of agent' })
    agentName: string;

    @ApiProperty({ description: 'Total deliveries for this agent' })
    totalDeliveries: number;

    @ApiProperty({ description: 'On-time deliveries for this agent' })
    onTimeDeliveries: number;

    @ApiProperty({ description: 'On-time rate percentage for this agent' })
    onTimeRate: number;

    @ApiProperty({ description: 'Average delay in minutes for this agent' })
    avgDelayMinutes: number;
}

export class CriticalDelayDto {
    @ApiProperty({ description: 'Shipping assignment ID' })
    assignmentId: string;

    @ApiProperty({ description: 'Order number' })
    orderNumber: string;

    @ApiProperty({ description: 'Agent code' })
    agentCode: string;

    @ApiProperty({ description: 'Estimated delivery time' })
    estimatedDeliveryTime: Date;

    @ApiProperty({ description: 'Actual delivery time' })
    actualDeliveryTime: Date;

    @ApiProperty({ description: 'Delay in minutes' })
    delayMinutes: number;
}

export class SLAComplianceSummaryDto {
    @ApiProperty({ type: SLAPeriodDto, description: 'Time period covered' })
    period: SLAPeriodDto;

    @ApiProperty({ type: OverallSLADto, description: 'Overall SLA compliance metrics' })
    overall: OverallSLADto;

    @ApiProperty({ type: [AgentSLADto], description: 'SLA metrics per agent' })
    byAgent: AgentSLADto[];

    @ApiProperty({ type: [CriticalDelayDto], description: 'Critical delays (> 120 minutes)' })
    criticalDelays: CriticalDelayDto[];

    @ApiProperty({ description: 'Timestamp when summary was calculated' })
    calculatedAt: Date;
}
