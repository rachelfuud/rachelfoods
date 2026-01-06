import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AgentMetricsService } from './agent-metrics.service';
import { AdminAgentMetricsController } from './admin-agent-metrics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        // Cache configuration: 10 minute default TTL, max 1000 entries
        CacheModule.register({
            ttl: 600000, // 10 minutes in milliseconds
            max: 1000, // Maximum 1000 cache entries
        }),
    ],
    controllers: [AdminAgentMetricsController],
    providers: [AgentMetricsService],
    exports: [AgentMetricsService],
})
export class AgentMetricsModule { }
