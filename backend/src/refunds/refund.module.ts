import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, WalletModule, AuthModule],
    controllers: [RefundController],
    providers: [RefundService],
    exports: [RefundService],
})
export class RefundModule { }
