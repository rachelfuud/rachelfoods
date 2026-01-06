import { Injectable, Logger } from '@nestjs/common';
import { WebhookService } from '../webhooks/webhook.service';

export interface WithdrawalWebhookPayload {
    withdrawal: {
        id: string;
        status: string;
        requestedAmount: string;
        feeAmount: string;
        netAmount: string;
        currency: string;
        walletId: string;
        userId: string;
        payoutProvider: string | null;
        payoutTransactionId: string | null;
        requestedAt: string;
        approvedAt: string | null;
        rejectedAt: string | null;
        cancelledAt: string | null;
        processingStartedAt: string | null;
        completedAt: string | null;
        failedAt: string | null;
    };
    actor: {
        type: 'USER' | 'ADMIN' | 'SYSTEM';
        id: string;
    };
}

@Injectable()
export class WithdrawalWebhookService {
    private readonly logger = new Logger(WithdrawalWebhookService.name);

    constructor(private readonly webhookService: WebhookService) { }

    /**
     * Emit withdrawal.requested event
     */
    async emitWithdrawalRequested(withdrawal: any, userId: string): Promise<void> {
        await this.emitWebhook('withdrawal.requested', withdrawal, 'USER', userId);
    }

    /**
     * Emit withdrawal.approved event
     */
    async emitWithdrawalApproved(withdrawal: any, adminUserId: string): Promise<void> {
        await this.emitWebhook('withdrawal.approved', withdrawal, 'ADMIN', adminUserId);
    }

    /**
     * Emit withdrawal.rejected event
     */
    async emitWithdrawalRejected(withdrawal: any, adminUserId: string): Promise<void> {
        await this.emitWebhook('withdrawal.rejected', withdrawal, 'ADMIN', adminUserId);
    }

    /**
     * Emit withdrawal.cancelled event
     */
    async emitWithdrawalCancelled(withdrawal: any, userId: string): Promise<void> {
        await this.emitWebhook('withdrawal.cancelled', withdrawal, 'USER', userId);
    }

    /**
     * Emit withdrawal.processing event
     */
    async emitWithdrawalProcessing(withdrawal: any, initiatorId: string): Promise<void> {
        const actorType = initiatorId === 'SYSTEM_AUTO_PROCESS' ? 'SYSTEM' : 'ADMIN';
        await this.emitWebhook('withdrawal.processing', withdrawal, actorType, initiatorId);
    }

    /**
     * Emit withdrawal.completed event
     */
    async emitWithdrawalCompleted(withdrawal: any, initiatorId: string): Promise<void> {
        const actorType = initiatorId === 'SYSTEM_AUTO_PROCESS' ? 'SYSTEM' : 'ADMIN';
        await this.emitWebhook('withdrawal.completed', withdrawal, actorType, initiatorId);
    }

    /**
     * Emit withdrawal.failed event
     */
    async emitWithdrawalFailed(withdrawal: any, initiatorId: string): Promise<void> {
        const actorType = initiatorId === 'SYSTEM_AUTO_PROCESS' ? 'SYSTEM' : 'ADMIN';
        await this.emitWebhook('withdrawal.failed', withdrawal, actorType, initiatorId);
    }

    /**
     * Emit withdrawal.retried event
     */
    async emitWithdrawalRetried(withdrawal: any, adminUserId: string): Promise<void> {
        await this.emitWebhook('withdrawal.retried', withdrawal, 'ADMIN', adminUserId);
    }

    /**
     * Internal method to emit webhook via WebhookService
     */
    private async emitWebhook(
        eventType: string,
        withdrawal: any,
        actorType: 'USER' | 'ADMIN' | 'SYSTEM',
        actorId: string,
    ): Promise<void> {
        try {
            const payload: WithdrawalWebhookPayload = {
                withdrawal: {
                    id: withdrawal.id,
                    status: withdrawal.status,
                    requestedAmount: withdrawal.requestedAmount.toString(),
                    feeAmount: withdrawal.feeAmount.toString(),
                    netAmount: withdrawal.netAmount.toString(),
                    currency: withdrawal.currency,
                    walletId: withdrawal.walletId,
                    userId: withdrawal.userId,
                    payoutProvider: withdrawal.payoutProvider,
                    payoutTransactionId: withdrawal.payoutTransactionId,
                    requestedAt: withdrawal.requestedAt?.toISOString(),
                    approvedAt: withdrawal.approvedAt?.toISOString() || null,
                    rejectedAt: withdrawal.rejectedAt?.toISOString() || null,
                    cancelledAt: withdrawal.cancelledAt?.toISOString() || null,
                    processingStartedAt: withdrawal.processingStartedAt?.toISOString() || null,
                    completedAt: withdrawal.completedAt?.toISOString() || null,
                    failedAt: withdrawal.failedAt?.toISOString() || null,
                },
                actor: {
                    type: actorType,
                    id: actorId,
                },
            };

            await this.webhookService.enqueueWebhook(eventType, payload);

            this.logger.debug({
                event: 'withdrawal_webhook_emitted',
                eventType,
                withdrawalId: withdrawal.id,
                actorType,
            });
        } catch (error) {
            // Log error but don't throw - webhook failures should NOT affect business operations
            this.logger.error({
                event: 'withdrawal_webhook_emission_failed',
                eventType,
                withdrawalId: withdrawal.id,
                error: error.message,
            });
        }
    }
}
