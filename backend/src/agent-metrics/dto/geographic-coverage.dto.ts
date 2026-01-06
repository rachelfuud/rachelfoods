import { ApiProperty } from '@nestjs/swagger';

export class ZipCodeCoverageDto {
    @ApiProperty({ description: 'Zip code' })
    zipCode: string;

    @ApiProperty({ description: 'Number of active agents servicing this zip code' })
    activeAgents: number;

    @ApiProperty({ description: 'Number of available agents in this zip code' })
    availableAgents: number;

    @ApiProperty({ description: 'Total deliveries this month in this zip code' })
    totalDeliveriesThisMonth: number;

    @ApiProperty({ description: 'Average delivery time in minutes for this zip code' })
    avgDeliveryTimeMinutes: number;
}

export class GeographicCoverageReportDto {
    @ApiProperty({ type: [ZipCodeCoverageDto], description: 'Coverage data per zip code' })
    zipCodes: ZipCodeCoverageDto[];

    @ApiProperty({ type: [String], description: 'Zip codes with less than 2 active agents' })
    underservedZipCodes: string[];

    @ApiProperty({ description: 'Timestamp when report was calculated' })
    calculatedAt: Date;
}
