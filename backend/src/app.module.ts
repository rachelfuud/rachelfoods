import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './common/logging/logger.config';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrderModule } from './orders/order.module';
import { ShippingModule } from './shipping/shipping.module';
import { ReviewModule } from './reviews/review.module';
import { ReferralModule } from './referrals/referral.module';
import { HealthModule } from './health/health.module';
import { AgentMetricsModule } from './agent-metrics/agent-metrics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WithdrawalModule } from './withdrawals/withdrawal.module';
import { FinancialOpsModule } from './financial-ops/financial-ops.module';
import { ThemeModule } from './theme/theme.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        // Global rate limiting: 100 requests per 60 seconds per IP
        ThrottlerModule.forRoot([
            {
                ttl: 60000,  // 60 seconds
                limit: 100,  // 100 requests
            },
        ]),
        // Structured logging with Winston
        WinstonModule.forRoot(loggerConfig),
        PrismaModule,
        AuthModule,
        ProfileModule,
        CatalogModule,
        OrderModule,
        ShippingModule,
        ReviewModule,
        ReferralModule,
        HealthModule,
        AgentMetricsModule,
        WebhooksModule,
        WithdrawalModule,
        FinancialOpsModule,
        ThemeModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Apply throttler guard globally
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        // Apply logging interceptor globally
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
    ],
})
export class AppModule { }
