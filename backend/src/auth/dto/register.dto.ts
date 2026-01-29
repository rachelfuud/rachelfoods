import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        example: 'Password123!',
        description: 'User password',
        minLength: 6,
    })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @ApiPropertyOptional({
        example: 'John',
        description: 'User first name',
    })
    @IsString({ message: 'First name must be a string' })
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({
        example: 'Doe',
        description: 'User last name',
    })
    @IsString({ message: 'Last name must be a string' })
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({
        example: '+12345678900',
        description: 'User phone number',
    })
    @IsString({ message: 'Phone must be a string' })
    @IsOptional()
    phone?: string;
}
