import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { KitchenRefillService } from './kitchen-refill.service';
import { OrderController } from './order.controller';
import { NotificationService } from './notification.service';
import { ShippingEngine } from './shipping/shipping.engine';
import { InternalShippingProvider } from './shipping/internal-shipping.provider';
import { ThirdPartyShippingProvider } from './shipping/third-party-shipping.provider';
import { CustomShippingProvider } from './shipping/custom-shipping.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewModule } from '../reviews/review.module';
import { ReviewService } from '../reviews/review.service';

@Module({
    imports: [PrismaModule, forwardRef(() => ReviewModule)],
    controllers: [OrderController],
    providers: [
        OrderService,
        KitchenRefillService,
        NotificationService,
        ShippingEngine,
        InternalShippingProvider,
        ThirdPartyShippingProvider,
        CustomShippingProvider,
    ],
    exports: [OrderService, KitchenRefillService, NotificationService],
})
export class OrderModule { }
