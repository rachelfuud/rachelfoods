import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class CreateDeliveryAgentDto {
    @IsString()
    userId: string;

    @IsString()
    @IsOptional()
    vehicleType?: string; // bike, car, van, truck

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
}
