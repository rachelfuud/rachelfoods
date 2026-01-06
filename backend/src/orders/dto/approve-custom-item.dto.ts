import { IsNumber, IsBoolean, IsOptional, IsString, Min } from 'class-validator';

export class ApproveCustomItemDto {
    @IsBoolean()
    approved: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    finalPrice?: number;

    @IsString()
    @IsOptional()
    rejectionReason?: string;

    @IsString()
    @IsOptional()
    sellerNotes?: string;
}
