import { Module } from '@nestjs/common';
import { DeliveryAgentService } from './delivery-agent.service';
import { ShippingService } from './shipping.service';
import { DeliveryAgentController } from './delivery-agent.controller';
// import { ShippingController } from './shipping.controller'; // Phase 5
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../orders/order.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [PrismaModule, OrderModule, PaymentsModule],
    // Controllers temporarily disabled until Phase 5
    // controllers: [DeliveryAgentController, ShippingController],
    controllers: [DeliveryAgentController], // Only DeliveryAgentController active for now
    providers: [DeliveryAgentService, ShippingService],
    exports: [DeliveryAgentService, ShippingService],
})
export class ShippingModule { }
