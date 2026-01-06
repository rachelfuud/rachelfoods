import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookService } from './webhook.service';
import { WebhookDispatcher } from './webhook-dispatcher.service';
import { WebhookSubscriptionsController } from './webhook-subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot({
            // Configure event emitter
            wildcard: true,
            delimiter: '.',
            newListener: false,
            removeListener: false,
            maxListeners: 10,
            verboseMemoryLeak: false,
            ignoreErrors: false,
        }),
    ],
    controllers: [WebhookSubscriptionsController],
    providers: [WebhookService, WebhookDispatcher],
    exports: [WebhookService],
})
export class WebhooksModule { }
