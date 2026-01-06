import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsEnum } from 'class-validator';

export class UpdateDeliveryAgentDto {
    @IsString()
    @IsOptional()
    vehicleType?: string;

    @IsString()
    @IsOptional()
    vehicleNumber?: string;

    @IsString()
    @IsOptional()
    licenseNumber?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    serviceZipCodes?: string[];

    @IsNumber()
    @IsOptional()
    maxDeliveryDistance?: number;

    @IsBoolean()
    @IsOptional()
    isAvailable?: boolean;

    @IsString()
    @IsOptional()
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}
