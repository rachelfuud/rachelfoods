import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LedgerService } from './ledger.service';
import { WalletService } from './wallet.service';
import { PlatformFeeService } from './platform-fee.service';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { PlatformWalletInitializer } from './platform-wallet-initializer.service';
import { PaymentController } from './payment.controller';
import { RefundController } from './refund.controller';
import { StripePaymentService } from './stripe-payment.service';
import { StripePaymentController } from './stripe-payment.controller';
import { PayPalPaymentService } from './paypal-payment.service';
import { PayPalPaymentController } from './paypal-payment.controller';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../orders/order.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        forwardRef(() => OrderModule),
        NotificationModule,
    ],
    controllers: [
        PaymentController,
        RefundController,
        StripePaymentController,
        PayPalPaymentController,
    ],
    providers: [
        LedgerService,
        WalletService,
        PlatformFeeService,
        PaymentService,
        RefundService,
        PlatformWalletInitializer,
        StripePaymentService,
        PayPalPaymentService,
    ],
    exports: [
        LedgerService,
        WalletService,
        PlatformFeeService,
        PaymentService,
        RefundService,
        PlatformWalletInitializer,
        StripePaymentService,
        PayPalPaymentService,
    ],
})
export class PaymentsModule { }
