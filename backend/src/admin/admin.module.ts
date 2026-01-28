import { Module } from '@nestjs/common';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { SystemMetricsController } from './system-metrics.controller';
import { HeroSlidesController } from './hero-slides.controller';
import { HeroSlidesService } from './hero-slides.service';
import { ProductMediaController } from './product-media.controller';
import { ProductMediaService } from './product-media.service';
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
        ProductMediaController,
    ],
    providers: [AdminProductService, AdminOrderService, HeroSlidesService, ProductMediaService],
    exports: [AdminProductService, AdminOrderService, HeroSlidesService, ProductMediaService],
})
export class AdminModule { }
