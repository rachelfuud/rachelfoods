import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateContactDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsString()
    phone?: string;

    @IsNotEmpty()
    @IsString()
    subject: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(10)
    message: string;
}
