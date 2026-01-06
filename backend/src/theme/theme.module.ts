import { Module } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { ThemeController } from './theme.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ThemeController],
    providers: [ThemeService],
    exports: [ThemeService],
})
export class ThemeModule { }
