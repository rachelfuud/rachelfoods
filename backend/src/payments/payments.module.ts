import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LedgerService } from './ledger.service';
import { WalletService } from './wallet.service';
import { PlatformFeeService } from './platform-fee.service';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { PlatformWalletInitializer } from './platform-wallet-initializer.service';
import { PaymentController } from './payment.controller';
import { RefundController } from './refund.controller';

@Module({
    imports: [PrismaModule],
    controllers: [PaymentController, RefundController],
    providers: [
        LedgerService,
        WalletService,
        PlatformFeeService,
        PaymentService,
        RefundService,
        PlatformWalletInitializer,
    ],
    exports: [
        LedgerService,
        WalletService,
        PlatformFeeService,
        PaymentService,
        RefundService,
        PlatformWalletInitializer,
    ],
})
export class PaymentsModule { }
