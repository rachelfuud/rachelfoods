import { Module } from '@nestjs/common';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { SystemMetricsController } from './system-metrics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [
        AdminProductController,
        AdminOrderController,
        SystemMetricsController, // PHASE 6A
    ],
    providers: [AdminProductService, AdminOrderService],
    exports: [AdminProductService, AdminOrderService],
})
export class AdminModule { }
