import { Module } from '@nestjs/common';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { SystemMetricsController } from './system-metrics.controller';
import { HeroSlidesController } from './hero-slides.controller';
import { HeroSlidesService } from './hero-slides.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, AuthModule, AuditModule],
    controllers: [
        AdminProductController,
        AdminOrderController,
        SystemMetricsController,
        HeroSlidesController,
    ],
    providers: [AdminProductService, AdminOrderService, HeroSlidesService],
    exports: [AdminProductService, AdminOrderService, HeroSlidesService],
})
export class AdminModule { }
