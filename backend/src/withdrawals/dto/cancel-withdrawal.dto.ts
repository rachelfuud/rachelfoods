import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelWithdrawalDto {
    @ApiProperty({ description: 'Withdrawal ID to cancel' })
    @IsNotEmpty()
    @IsString()
    withdrawalId: string;

    @ApiProperty({ description: 'Reason for cancellation' })
    @IsNotEmpty()
    @IsString()
    reason: string;
}
