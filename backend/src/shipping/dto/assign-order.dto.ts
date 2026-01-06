import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignOrderDto {
    @IsString()
    orderId: string;

    @IsString()
    agentId: string;

    @IsDateString()
    @IsOptional()
    estimatedDeliveryTime?: string;

    @IsString()
    @IsOptional()
    deliveryNotes?: string;
}
