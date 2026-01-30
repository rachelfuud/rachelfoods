import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';

// DTOs
class CreditWalletDto {
    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsEnum(['REFUND', 'LOYALTY', 'ADMIN', 'PROMO'])
    source: 'REFUND' | 'LOYALTY' | 'ADMIN' | 'PROMO';

    @IsString()
    @IsOptional()
    reference?: string;

    @IsString()
    @IsOptional()
    reason?: string;
}

@Controller('api/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
    constructor(private walletService: WalletService) { }

    /**
     * Get current user's wallet balance
     * Accessible by: Any authenticated user
     */
    @Get('/balance')
    async getBalance(@Request() req) {
        const balance = await this.walletService.getBalance(req.user.id);
        return {
            balance,
            currency: 'USD',
        };
    }

    /**
     * Get current user's wallet details and recent transactions
     * Accessible by: Any authenticated user
     */
    @Get('/details')
    async getDetails(@Request() req) {
        return this.walletService.getWalletDetails(req.user.id);
    }

    /**
     * Get current user's wallet transaction history
     * Accessible by: Any authenticated user
     */
    @Get('/history')
    async getHistory(@Request() req) {
        return this.walletService.getWalletHistory(req.user.id);
    }

    /**
     * Admin: Credit wallet manually
     * Accessible by: Admins with wallet.manage permission
     */
    @Post('/admin/credit/:userId')
    @UseGuards(PermissionsGuard)
    @Permissions('wallet.manage')
    async creditWallet(
        @Param('userId') userId: string,
        @Body() dto: CreditWalletDto,
        @Request() req,
    ) {
        const result = await this.walletService.creditWallet(
            userId,
            dto.amount,
            dto.source,
            dto.reference,
            {
                adminId: req.user.id,
                adminEmail: req.user.email,
                reason: dto.reason,
            },
        );

        return {
            success: true,
            walletId: result.wallet.id,
            previousBalance: parseFloat(result.wallet.balance.toString()) - dto.amount,
            newBalance: result.newBalance,
            transactionId: result.transaction.id,
        };
    }

    /**
     * Admin: Get wallet for specific user
     * Accessible by: Admins with wallet.view permission
     */
    @Get('/admin/user/:userId')
    @UseGuards(PermissionsGuard)
    @Permissions('wallet.view')
    async getWalletByUserId(@Param('userId') userId: string) {
        return this.walletService.getWalletByUserId(userId);
    }

    /**
     * Admin: Get full transaction history for specific user
     * Accessible by: Admins with wallet.view permission
     */
    @Get('/admin/user/:userId/history')
    @UseGuards(PermissionsGuard)
    @Permissions('wallet.view')
    async getFullHistory(@Param('userId') userId: string) {
        return this.walletService.getFullHistory(userId);
    }
}
