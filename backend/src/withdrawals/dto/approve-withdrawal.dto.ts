import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveWithdrawalDto {
    @ApiProperty({ description: 'Withdrawal ID to approve' })
    @IsNotEmpty()
    @IsString()
    withdrawalId: string;

    @ApiPropertyOptional({
        description: 'Approval reason (required for MEDIUM/HIGH risk withdrawals)',
    })
    @IsOptional()
    @IsString()
    reason?: string;
}
