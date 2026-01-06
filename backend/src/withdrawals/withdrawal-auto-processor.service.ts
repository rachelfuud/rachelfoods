import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WithdrawalProcessingService } from './withdrawal-processing.service';
import { WithdrawalStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WithdrawalAutoProcessorService {
    private readonly logger = new Logger(WithdrawalAutoProcessorService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly processingService: WithdrawalProcessingService,
        private readonly configService: ConfigService,
    ) { }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async autoProcessApprovedWithdrawals() {
        const enabled = this.configService.get<string>('WITHDRAWAL_AUTO_APPROVE_ENABLED') === 'true';

        if (!enabled) {
            return;
        }

        const windowHours = parseInt(
            this.configService.get<string>('WITHDRAWAL_APPROVAL_WINDOW_HOURS') || '24',
            10,
        );

        const cutoffTime = new Date(Date.now() - windowHours * 3600 * 1000);

        this.logger.log({
            event: 'auto_process_check_started',
            cutoffTime: cutoffTime.toISOString(),
            windowHours,
        });

        try {
            const eligibleWithdrawals = await this.prisma.withdrawals.findMany({
                where: {
                    status: WithdrawalStatus.APPROVED,
                    approvedAt: { lt: cutoffTime },
                },
                take: 10, // Process max 10 per run to avoid overload
            });

            if (eligibleWithdrawals.length === 0) {
                this.logger.log('No eligible withdrawals for auto-processing');
                return;
            }

            this.logger.log({
                event: 'auto_process_batch_found',
                count: eligibleWithdrawals.length,
            });

            let successCount = 0;
            let failureCount = 0;

            for (const withdrawal of eligibleWithdrawals) {
                try {
                    await this.processingService.startProcessing(
                        withdrawal.id,
                        'SYSTEM_AUTO_PROCESS',
                    );
                    successCount++;
                    this.logger.log({
                        event: 'auto_process_success',
                        withdrawalId: withdrawal.id,
                    });
                } catch (error) {
                    failureCount++;
                    this.logger.error({
                        event: 'auto_process_failure',
                        withdrawalId: withdrawal.id,
                        error: error.message,
                    });
                }
            }

            this.logger.log({
                event: 'auto_process_batch_completed',
                total: eligibleWithdrawals.length,
                successCount,
                failureCount,
            });
        } catch (error) {
            this.logger.error(
                `Auto-process cron job failed: ${error.message}`,
                error.stack,
            );
        }
    }
}
