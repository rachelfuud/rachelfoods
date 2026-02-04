import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './common/logging/logger.config';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedController } from './seed.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
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
import { AdminModule } from './admin/admin.module';
import { RefillModule } from './refill/refill.module';
import { AddressModule } from './address/address.module';
import { EmailModule } from './email/email.module';
import { NotificationModule } from './notifications/notification.module';
import { PromotionModule } from './promotion/promotion.module';
import { WalletModule } from './wallet/wallet.module';
import { RefundModule } from './refunds/refund.module';
import { AuditModule } from './audit/audit.module';
import { CmsModule } from './cms/cms.module';
import { ContactModule } from './contact/contact.module';

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
        CacheModule, // PHASE 6A: Global cache module
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
        AdminModule,
        RefillModule,
        AddressModule,
        EmailModule,
        NotificationModule,
        PromotionModule, // PHASE 5B: Coupon management
        WalletModule, // PHASE 5C: Store credit & loyalty wallet
        RefundModule, // PHASE 5C: Refund processing
        AuditModule, // PHASE 8: Audit logging for compliance
        CmsModule, // PHASE 9: Content Management System
        ContactModule, // Contact form submissions
    ],
    controllers: [AppController, SeedController],
    providers: [
        AppService,
        // Apply user-based throttler guard globally (ENTERPRISE HARDENING)
        {
            provide: APP_GUARD,
            useClass: UserThrottlerGuard,
        },
        // Apply logging interceptor globally
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply correlation ID middleware globally for request tracing (ENTERPRISE HARDENING)
        consumer
            .apply(CorrelationIdMiddleware)
            .forRoutes('*');
    }
}
