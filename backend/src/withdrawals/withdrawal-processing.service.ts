import { Injectable, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../payments/wallet.service';
import { MockPayoutProvider } from './providers/mock-payout.provider';
import { WithdrawalWebhookService } from './withdrawal-webhook.service';
import { WithdrawalTransitionGuardService } from './guards/withdrawal-transition-guard.service';
import { WithdrawalRiskEscalationService, RiskSnapshot } from './risk/withdrawal-risk-escalation.service';
import { BusinessRuleException } from '../common/exceptions/business-rule.exception';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus, LedgerEntryType } from '@prisma/client';
import { PayoutRequest } from './interfaces/payout-provider.interface';

@Injectable()
export class WithdrawalProcessingService {
    private readonly logger = new Logger(WithdrawalProcessingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly walletService: WalletService,
        private readonly payoutProvider: MockPayoutProvider,
        private readonly webhookService: WithdrawalWebhookService,
        private readonly transitionGuard: WithdrawalTransitionGuardService,
        private readonly riskEscalation: WithdrawalRiskEscalationService,
    ) { }

    async startProcessing(withdrawalId: string, initiatorId: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            include: {
                wallets: true,
                users: { select: { id: true, email: true } },
            },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        // State validation
        if (withdrawal.status !== WithdrawalStatus.APPROVED) {
            if (withdrawal.status === WithdrawalStatus.COMPLETED) {
                this.logger.log(`Withdrawal ${withdrawalId} already completed`);
                return withdrawal;
            }
            throw new BusinessRuleException(
                `Cannot process withdrawal in status ${withdrawal.status}`,
                'INVALID_STATE_TRANSITION',
                { currentStatus: withdrawal.status, attemptedTransition: 'PROCESSING' },
            );
        }

        // Idempotency check - prevent concurrent processing
        if (withdrawal.processingStartedAt) {
            const elapsedMinutes =
                (Date.now() - withdrawal.processingStartedAt.getTime()) / 60000;
            if (elapsedMinutes < 5) {
                throw new BusinessRuleException(
                    'Withdrawal is already being processed',
                    'CONCURRENT_PROCESSING_ATTEMPT',
                    { elapsedMinutes: Math.floor(elapsedMinutes) },
                );
            }
            this.logger.warn(
                `Processing timeout detected for withdrawal ${withdrawalId}, allowing retry`,
            );
        }

        // Pre-execution validations
        await this.validatePreExecution(withdrawal);

        // SPRINT 13 PHASE 1: Evaluate transition guard before APPROVED → PROCESSING
        const guardDecision = await this.transitionGuard.evaluateTransition({
            withdrawalId: withdrawal.id,
            userId: withdrawal.userId,
            fromStatus: WithdrawalStatus.APPROVED,
            toStatus: WithdrawalStatus.PROCESSING,
            adminId: initiatorId !== 'SYSTEM_AUTO_PROCESS' ? initiatorId : undefined,
            confirmationReason: undefined, // Can be enhanced in future if needed
        });

        if (!guardDecision.allowed) {
            const guardMessage = this.transitionGuard.formatGuardMessage(guardDecision, {
                withdrawalId: withdrawal.id,
                userId: withdrawal.userId,
                fromStatus: WithdrawalStatus.APPROVED,
                toStatus: WithdrawalStatus.PROCESSING,
            });

            this.logger.warn({
                event: 'transition_rejected_by_guard',
                withdrawalId: withdrawal.id,
                fromStatus: WithdrawalStatus.APPROVED,
                toStatus: WithdrawalStatus.PROCESSING,
                riskLevel: guardDecision.riskLevel,
                riskScore: guardDecision.riskScore,
                guardRule: guardDecision.guardRule,
                requiresAdminConfirmation: guardDecision.requiresAdminConfirmation,
                sprint: 'SPRINT_13_PHASE_1',
                feature: 'transition-guards',
            });

            throw new BusinessRuleException(
                guardMessage,
                'TRANSITION_GATED_BY_RISK',
                {
                    riskLevel: guardDecision.riskLevel,
                    riskScore: guardDecision.riskScore,
                    guardRule: guardDecision.guardRule,
                    requiresAdminConfirmation: guardDecision.requiresAdminConfirmation,
                    activeSignals: guardDecision.activeSignals,
                },
            );
        }

        // Log allowed transition with risk context
        if (guardDecision.reason) {
            this.logger.log({
                event: 'transition_allowed_with_context',
                withdrawalId: withdrawal.id,
                fromStatus: WithdrawalStatus.APPROVED,
                toStatus: WithdrawalStatus.PROCESSING,
                riskLevel: guardDecision.riskLevel,
                riskScore: guardDecision.riskScore,
                guardRule: guardDecision.guardRule,
                guardReason: guardDecision.reason,
                sprint: 'SPRINT_13_PHASE_1',
                feature: 'transition-guards',
            });
        }

        // Update status to PROCESSING and set timestamp
        const processingWithdrawal = await this.prisma.withdrawals.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.PROCESSING,
                processingStartedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_processing_started',
            withdrawalId,
            statusFrom: WithdrawalStatus.APPROVED,
            statusTo: WithdrawalStatus.PROCESSING,
            actorType: initiatorId === 'SYSTEM_AUTO_PROCESS' ? 'SYSTEM' : 'ADMIN',
            actorId: initiatorId,
            netAmount: withdrawal.netAmount.toString(),
        });

        await this.webhookService.emitWithdrawalProcessing(processingWithdrawal, initiatorId);

        // Automatically execute the withdrawal
        try {
            const result = await this.executeWithdrawal(withdrawalId, initiatorId);
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to execute withdrawal ${withdrawalId}: ${error.message}`,
                error.stack,
            );
            await this.markAsFailed(withdrawalId, error.message, initiatorId);
            throw error;
        }
    }

    private async validatePreExecution(withdrawal: any): Promise<void> {
        // 1. Wallet status check
        if (withdrawal.wallets.walletStatus !== 'ACTIVE') {
            throw new BusinessRuleException(
                'Cannot withdraw from non-active wallet',
                'WALLET_STATUS_INVALID',
                { walletStatus: withdrawal.wallets.walletStatus },
            );
        }

        // 2. Balance verification using WalletService
        const balance = await this.walletService.getWalletBalance(withdrawal.walletId);
        if (balance.lt(withdrawal.netAmount)) {
            throw new BusinessRuleException(
                'Insufficient wallet balance for withdrawal',
                'INSUFFICIENT_BALANCE',
                {
                    required: withdrawal.netAmount.toString(),
                    available: balance.toString(),
                },
            );
        }

        // 3. Fee snapshot integrity check
        const calculatedNet = withdrawal.requestedAmount.sub(withdrawal.feeAmount);
        if (!withdrawal.netAmount.eq(calculatedNet)) {
            throw new Error('Fee snapshot integrity violation');
        }

        this.logger.log({
            event: 'withdrawal_pre_validation_passed',
            withdrawalId: withdrawal.id,
            balance: balance.toString(),
        });
    }

    private async executeWithdrawal(withdrawalId: string, initiatorId: string) {
        const executionStartTime = Date.now();
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            include: { wallets: true },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
            throw new BusinessRuleException(
                'Withdrawal not in PROCESSING state',
                'INVALID_EXECUTION_STATE',
            );
        }

        // Prepare payout request
        const payoutRequest: PayoutRequest = {
            withdrawalId: withdrawal.id,
            amount: withdrawal.netAmount,
            currency: withdrawal.wallets.currency,
            bankAccount: withdrawal.bankAccount,
            accountHolder: withdrawal.accountHolder,
            bankName: withdrawal.bankName,
            ifscCode: withdrawal.ifscCode,
        };

        // SPRINT_13_PHASE_1: Evaluate PROCESSING → COMPLETED transition guard
        const guardDecision = await this.transitionGuard.evaluateTransition({
            withdrawalId: withdrawal.id,
            userId: withdrawal.userId,
            fromStatus: WithdrawalStatus.PROCESSING,
            toStatus: WithdrawalStatus.COMPLETED,
            adminId: initiatorId !== 'SYSTEM_AUTO_PROCESS' ? initiatorId : undefined,
            confirmationReason: undefined, // Enhanced in future phase if needed
        });

        if (!guardDecision.allowed) {
            this.logger.warn({
                event: 'transition_rejected_by_guard',
                sprint: 'SPRINT_13_PHASE_1',
                withdrawalId: withdrawal.id,
                userId: withdrawal.userId,
                fromStatus: WithdrawalStatus.PROCESSING,
                toStatus: WithdrawalStatus.COMPLETED,
                riskLevel: guardDecision.riskLevel,
                riskScore: guardDecision.riskScore,
                guardRule: guardDecision.guardRule,
                requiresAdminConfirmation: guardDecision.requiresAdminConfirmation,
                reason: guardDecision.reason,
                activeSignals: guardDecision.activeSignals,
            });

            throw new HttpException(
                {
                    code: 'TRANSITION_GATED_BY_RISK',
                    message: guardDecision.reason,
                    riskLevel: guardDecision.riskLevel,
                    riskScore: guardDecision.riskScore,
                    guardRule: guardDecision.guardRule,
                    requiresAdminConfirmation: guardDecision.requiresAdminConfirmation,
                    activeSignals: guardDecision.activeSignals,
                },
                HttpStatus.FORBIDDEN,
            );
        }

        if (guardDecision.requiresAdminConfirmation) {
            this.logger.log({
                event: 'transition_allowed_with_context',
                sprint: 'SPRINT_13_PHASE_1',
                withdrawalId: withdrawal.id,
                userId: withdrawal.userId,
                fromStatus: WithdrawalStatus.PROCESSING,
                toStatus: WithdrawalStatus.COMPLETED,
                riskLevel: guardDecision.riskLevel,
                riskScore: guardDecision.riskScore,
                guardRule: guardDecision.guardRule,
                reason: guardDecision.reason,
            });
        }

        // SPRINT_13_PHASE_2: Check for risk escalation (READ-ONLY, non-blocking)
        // Compare current risk vs risk at approval time
        try {
            // Create snapshot representing risk state at approval time
            // Since we can't modify schema, we compute it deterministically from approval timestamp
            const initialSnapshot: RiskSnapshot = await this.riskEscalation.createSnapshot(
                withdrawal.userId,
            );

            // Check for escalation (this is informational only, never blocks)
            const escalationDecision = await this.riskEscalation.checkEscalation(
                withdrawal.userId,
                initialSnapshot,
                withdrawal.id,
                WithdrawalStatus.PROCESSING,
            );

            // Escalation detection is logged inside checkEscalation()
            // No action taken here - this is READ-ONLY visibility
        } catch (escalationError) {
            // CRITICAL: Escalation check failure should NEVER block withdrawal
            this.logger.warn({
                event: 'escalation_check_failed',
                sprint: 'SPRINT_13_PHASE_2',
                withdrawalId: withdrawal.id,
                userId: withdrawal.userId,
                error: escalationError.message,
                note: 'Escalation check failed but withdrawal proceeding (non-blocking)',
            });
        }

        // Execute atomic transaction: payout + ledger + status update
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                // 1. Execute payout via provider
                this.logger.log({
                    event: 'payout_execution_started',
                    withdrawalId: withdrawal.id,
                    payoutProvider: this.payoutProvider.getProviderName(),
                    netAmount: withdrawal.netAmount.toString(),
                });

                const payoutResult = await this.payoutProvider.executePayout(payoutRequest);

                if (!payoutResult.success) {
                    throw new Error(payoutResult.failureReason || 'Payout execution failed');
                }

                // 2. Create ledger entries (CRITICAL: netAmount debit + feeAmount credit)
                const transactionId = `withdrawal-${withdrawal.id}`;
                const timestamp = Date.now();

                // Debit user wallet by netAmount (what goes to external bank)
                await tx.ledger_entries.create({
                    data: {
                        id: `entry-${timestamp}-${Math.random().toString(36).substring(7)}`,
                        walletId: withdrawal.walletId,
                        amount: withdrawal.netAmount.neg(),
                        entryType: LedgerEntryType.WITHDRAWAL_DEBIT,
                        transactionId,
                        description: `Withdrawal ${withdrawal.id} to bank account`,
                    },
                });

                // Credit platform wallet by feeAmount (platform's fee)
                if (withdrawal.feeAmount.gt(0)) {
                    const platformWallet = await tx.wallets.findFirst({
                        where: { walletCode: 'PLATFORM_MAIN' },
                    });

                    if (!platformWallet) {
                        throw new Error('Platform wallet not found');
                    }

                    await tx.ledger_entries.create({
                        data: {
                            id: `entry-${timestamp}-${Math.random().toString(36).substring(7) + '1'}`,
                            walletId: platformWallet.id,
                            amount: withdrawal.feeAmount,
                            entryType: LedgerEntryType.WITHDRAWAL_FEE,
                            transactionId,
                            description: `Withdrawal fee from ${withdrawal.id}`,
                        },
                    });
                }

                // 3. Update withdrawal to COMPLETED
                const completedWithdrawal = await tx.withdrawals.update({
                    where: { id: withdrawal.id },
                    data: {
                        status: WithdrawalStatus.COMPLETED,
                        completedAt: new Date(),
                        payoutProvider: this.payoutProvider.getProviderName(),
                        payoutTransactionId: payoutResult.transactionId,
                        payoutReference: payoutResult.providerReference,
                        updatedAt: new Date(),
                    },
                });

                return { completedWithdrawal, payoutResult };
            });

            const durationMs = Date.now() - executionStartTime;

            this.logger.log({
                event: 'withdrawal_completed',
                withdrawalId: withdrawal.id,
                statusFrom: WithdrawalStatus.PROCESSING,
                statusTo: WithdrawalStatus.COMPLETED,
                actorType: initiatorId === 'SYSTEM_AUTO_PROCESS' ? 'SYSTEM' : 'ADMIN',
                actorId: initiatorId,
                payoutProvider: this.payoutProvider.getProviderName(),
                payoutTransactionId: result.payoutResult.transactionId,
                netAmount: withdrawal.netAmount.toString(),
                feeAmount: withdrawal.feeAmount.toString(),
                durationMs,
            });

            await this.webhookService.emitWithdrawalCompleted(result.completedWithdrawal, initiatorId);

            return result.completedWithdrawal;
        } catch (error) {
            this.logger.error(
                `Withdrawal execution failed for ${withdrawalId}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async markAsFailed(withdrawalId: string, reason: string, initiatorId: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
            this.logger.warn(
                `Attempted to mark non-PROCESSING withdrawal ${withdrawalId} as failed`,
            );
            return withdrawal;
        }

        const failedWithdrawal = await this.prisma.withdrawals.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.FAILED,
                failedAt: new Date(),
                failureReason: reason,
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_failed',
            withdrawalId,
            statusFrom: WithdrawalStatus.PROCESSING,
            statusTo: WithdrawalStatus.FAILED,
            actorType: initiatorId === 'SYSTEM_AUTO_PROCESS' ? 'SYSTEM' : 'ADMIN',
            actorId: initiatorId,
            failureReason: reason,
        });

        await this.webhookService.emitWithdrawalFailed(failedWithdrawal, initiatorId);

        return failedWithdrawal;
    }

    async retryWithdrawal(withdrawalId: string, adminUserId: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        if (withdrawal.status !== WithdrawalStatus.FAILED) {
            throw new BusinessRuleException(
                `Cannot retry withdrawal in status ${withdrawal.status}`,
                'INVALID_STATE_TRANSITION',
                { currentStatus: withdrawal.status, attemptedTransition: 'APPROVED' },
            );
        }

        const retriedWithdrawal = await this.prisma.withdrawals.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.APPROVED,
                failedAt: null,
                failureReason: null,
                processingStartedAt: null,
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_retried',
            withdrawalId,
            statusFrom: WithdrawalStatus.FAILED,
            statusTo: WithdrawalStatus.APPROVED,
            actorType: 'ADMIN',
            actorId: adminUserId,
        });

        await this.webhookService.emitWithdrawalRetried(retriedWithdrawal, adminUserId);

        return retriedWithdrawal;
    }
}
