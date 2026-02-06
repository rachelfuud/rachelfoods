import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductMediaController } from './product-media.controller';
import { ProductMediaService } from './product-media.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [AuthModule, PrismaModule],
    controllers: [ProductsController, ProductMediaController],
    providers: [ProductMediaService],
    exports: [ProductMediaService],
})
export class ProductsModule { }
