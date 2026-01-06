import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferralDto {
    @ApiProperty({
        description: 'Email address of the person being referred',
        example: 'friend@example.com',
    })
    @IsEmail()
    referredEmail: string;
}
