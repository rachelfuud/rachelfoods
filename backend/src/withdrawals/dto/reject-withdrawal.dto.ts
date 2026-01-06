import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectWithdrawalDto {
    @ApiProperty({ description: 'Withdrawal ID to reject' })
    @IsNotEmpty()
    @IsString()
    withdrawalId: string;

    @ApiProperty({ description: 'Reason for rejection' })
    @IsNotEmpty()
    @IsString()
    reason: string;
}
