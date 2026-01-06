import { ApiProperty } from '@nestjs/swagger';

export class AgentLeaderboardEntryDto {
    @ApiProperty({ description: 'Rank position in leaderboard' })
    rank: number;

    @ApiProperty({ description: 'Unique agent ID' })
    agentId: string;

    @ApiProperty({ description: 'Agent code identifier' })
    agentCode: string;

    @ApiProperty({ description: 'Full name of agent' })
    agentName: string;

    @ApiProperty({ description: 'Total number of deliveries' })
    totalDeliveries: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'On-time delivery rate percentage' })
    onTimeRate: number;

    @ApiProperty({ description: 'Average delivery time in minutes' })
    avgDeliveryTimeMinutes: number;
}

export class LeaderboardPeriodDto {
    @ApiProperty({ description: 'Period start date' })
    start: Date;

    @ApiProperty({ description: 'Period end date' })
    end: Date;

    @ApiProperty({ description: 'Human-readable period label', example: 'This Month' })
    label: string;
}

export class AgentLeaderboardDto {
    @ApiProperty({ type: [AgentLeaderboardEntryDto], description: 'Leaderboard entries' })
    entries: AgentLeaderboardEntryDto[];

    @ApiProperty({ type: LeaderboardPeriodDto, description: 'Time period covered' })
    period: LeaderboardPeriodDto;

    @ApiProperty({ description: 'Sort field used' })
    sortedBy: string;

    @ApiProperty({ description: 'Total number of agents' })
    total: number;
}
