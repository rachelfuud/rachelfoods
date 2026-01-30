import { IsString, IsOptional, IsEmail, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[1-9]\d{1,14}$/, {
        message: 'Phone must be a valid phone number format',
    })
    phone?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    currentPassword?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    newPassword?: string;
}
