import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import { WithdrawalWebhookService } from './withdrawal-webhook.service';
import { WithdrawalLimitEvaluatorService } from './policy/withdrawal-limit-evaluator.service';
import { WithdrawalApprovalContextService } from './approval/withdrawal-approval-context.service';
import { WithdrawalCoolingPeriodService } from './cooling/withdrawal-cooling-period.service';
import { InitiateWithdrawalDto } from './dto/initiate-withdrawal.dto';
import { BusinessRuleException } from '../common/exceptions/business-rule.exception';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus } from '@prisma/client';

@Injectable()
export class WithdrawalService {
    private readonly logger = new Logger(WithdrawalService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policyService: WithdrawalPolicyService,
        private readonly webhookService: WithdrawalWebhookService,
        private readonly limitEvaluator: WithdrawalLimitEvaluatorService,
        private readonly approvalContext: WithdrawalApprovalContextService,
        private readonly coolingPeriod: WithdrawalCoolingPeriodService,
    ) { }

    async initiateWithdrawal(dto: InitiateWithdrawalDto, userId: string, userRole: string) {
        const wallet = await this.prisma.wallets.findUnique({
            where: { id: dto.walletId },
        });

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        if (wallet.userId !== userId) {
            throw new BusinessRuleException(
                'Cannot withdraw from wallet that does not belong to you',
                'WALLET_OWNERSHIP_VIOLATION',
            );
        }

        if (wallet.walletStatus !== 'ACTIVE') {
            throw new BusinessRuleException(
                'Cannot withdraw from non-active wallet',
                'WALLET_STATUS_INVALID',
                { status: wallet.walletStatus },
            );
        }

        const policy = this.policyService.resolvePolicy(userRole);
        const requestedAmount = new Decimal(dto.requestedAmount);
        const feeSnapshot = this.policyService.computeFeeSnapshot(requestedAmount, policy);

        // SPRINT 12 PHASE 1: Evaluate approval context (READ-ONLY risk assessment)
        const approvalContextResult = await this.approvalContext.computeApprovalContext(userId);

        this.logger.log({
            event: 'withdrawal_approval_context_evaluated',
            userId,
            riskLevel: approvalContextResult.riskLevel,
            approvalMode: approvalContextResult.approvalMode,
            requiresReviewReason: approvalContextResult.requiresReviewReason,
            riskScore: approvalContextResult.riskScore,
            activeSignalsCount: approvalContextResult.activeSignals.length,
            sprint: 'SPRINT_12_PHASE_1',
        });

        // ENFORCEMENT POINT: Evaluate withdrawal limits BEFORE creating withdrawal
        // SPRINT 12 PHASE 2: Pass risk context for adaptive limit adjustments
        const limitEvaluation = await this.limitEvaluator.evaluateWithdrawalRequest(
            userId,
            dto.walletId,
            feeSnapshot.netAmount, // Use net amount for limit checking
            wallet.currency,
            userRole,
            approvalContextResult, // Pass risk context for adaptive limits
        );

        if (!limitEvaluation.allowed) {
            const violationMessages = limitEvaluation.violations
                .map((v) => v.message)
                .join('; ');

            throw new BusinessRuleException(
                `Withdrawal request violates policy limits: ${violationMessages}`,
                'WITHDRAWAL_LIMIT_EXCEEDED',
                {
                    violations: limitEvaluation.violations,
                    policyId: limitEvaluation.policyApplied?.policyId,
                    metrics: limitEvaluation.metrics,
                },
            );
        }

        // SPRINT 12 PHASE 3: Evaluate cooling period (time-based restriction)
        const coolingEvaluation = await this.coolingPeriod.evaluateCoolingPeriod(
            userId,
            approvalContextResult,
        );

        if (coolingEvaluation.coolingRequired) {
            // SPRINT 12 PHASE 4: Check for admin cooling bypass
            if (dto.bypassCooling === true) {
                // Validate admin role (only ADMIN or PLATFORM_ADMIN can bypass)
                const isAdmin = userRole === 'ADMIN' || userRole === 'PLATFORM_ADMIN';
                if (!isAdmin) {
                    throw new BusinessRuleException(
                        'Only administrators can bypass cooling periods',
                        'COOLING_BYPASS_UNAUTHORIZED',
                        {
                            requiredRole: 'ADMIN or PLATFORM_ADMIN',
                            currentRole: userRole || 'NONE',
                        },
                    );
                }

                // Validate bypass reason is provided
                if (!dto.bypassReason || dto.bypassReason.trim().length < 10) {
                    throw new BusinessRuleException(
                        'Bypass reason is required and must be at least 10 characters when bypassing cooling period',
                        'COOLING_BYPASS_REASON_REQUIRED',
                        {
                            providedLength: dto.bypassReason?.length || 0,
                            requiredLength: 10,
                        },
                    );
                }

                // CRITICAL AUDIT LOG: Record cooling period bypass
                this.logger.warn({
                    event: 'cooling_period_bypassed',
                    adminRole: userRole,
                    userId,
                    riskLevel: approvalContextResult.riskLevel,
                    riskScore: approvalContextResult.riskScore,
                    coolingEndsAt: coolingEvaluation.coolingEndsAt?.toISOString(),
                    remainingMinutes: coolingEvaluation.remainingMinutes,
                    ruleApplied: coolingEvaluation.ruleApplied,
                    bypassReason: dto.bypassReason,
                    lastWithdrawalAt: coolingEvaluation.lastWithdrawalAt?.toISOString(),
                    activeSignals: approvalContextResult.activeSignals.map((s) => s.signalType),
                    timestamp: new Date().toISOString(),
                    sprint: 'SPRINT_12_PHASE_4',
                    feature: 'cooling-override',
                });

                this.logger.log({
                    event: 'cooling_period_bypass_approved',
                    adminRole: userRole,
                    userId,
                    bypassReason: dto.bypassReason,
                    sprint: 'SPRINT_12_PHASE_4',
                    feature: 'cooling-override',
                });

                // Allow withdrawal to proceed (bypass active cooling)
            } else {
                // No bypass requested - enforce cooling period
                const coolingMessage = this.coolingPeriod.formatCoolingMessage(coolingEvaluation);

                this.logger.warn({
                    event: 'withdrawal_rejected_cooling_period',
                    userId,
                    riskLevel: approvalContextResult.riskLevel,
                    riskScore: approvalContextResult.riskScore,
                    coolingEndsAt: coolingEvaluation.coolingEndsAt?.toISOString(),
                    remainingMinutes: coolingEvaluation.remainingMinutes,
                    ruleApplied: coolingEvaluation.ruleApplied,
                    sprint: 'SPRINT_12_PHASE_3',
                    feature: 'cooling-period',
                });

                throw new BusinessRuleException(
                    coolingMessage,
                    'WITHDRAWAL_COOLING_PERIOD_ACTIVE',
                    {
                        coolingEndsAt: coolingEvaluation.coolingEndsAt,
                        remainingMinutes: coolingEvaluation.remainingMinutes,
                        riskLevel: approvalContextResult.riskLevel,
                        riskScore: approvalContextResult.riskScore,
                        ruleApplied: coolingEvaluation.ruleApplied,
                        lastWithdrawalAt: coolingEvaluation.lastWithdrawalAt,
                    },
                );
            }
        }

        const withdrawal = await this.prisma.withdrawals.create({
            data: {
                id: `withdrawal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                userId,
                walletId: dto.walletId,
                requestedAmount: feeSnapshot.requestedAmount,
                feeAmount: feeSnapshot.feeAmount,
                netAmount: feeSnapshot.netAmount,
                policyType: feeSnapshot.policyType,
                feePercentage: feeSnapshot.percentage,
                flatFee: feeSnapshot.flatFee,
                maxCap: feeSnapshot.maxCap,
                status: WithdrawalStatus.REQUESTED,
                bankAccount: dto.bankAccount,
                accountHolder: dto.accountHolder,
                bankName: dto.bankName,
                ifscCode: dto.ifscCode,
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_requested',
            withdrawalId: withdrawal.id,
            statusFrom: null,
            statusTo: WithdrawalStatus.REQUESTED,
            actorType: 'USER',
            actorId: userId,
            requestedAmount: withdrawal.requestedAmount.toString(),
            feeAmount: withdrawal.feeAmount.toString(),
            netAmount: withdrawal.netAmount.toString(),
        });

        await this.webhookService.emitWithdrawalRequested(withdrawal, userId);

        return withdrawal;
    }

    async approveWithdrawal(withdrawalId: string, adminUserId: string, reason?: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
            throw new BusinessRuleException(
                `Cannot approve withdrawal in status ${withdrawal.status}`,
                'INVALID_STATE_TRANSITION',
                { currentStatus: withdrawal.status, attemptedTransition: 'APPROVED' },
            );
        }

        // SPRINT 12 PHASE 1: Evaluate approval context for risk-aware validation
        const approvalContextResult = await this.approvalContext.computeApprovalContext(
            withdrawal.userId,
        );

        // Validate that reason is provided if required by risk level
        try {
            this.approvalContext.validateApprovalRequest(approvalContextResult, reason);
        } catch (error) {
            throw new BusinessRuleException(
                error.message,
                'APPROVAL_REASON_REQUIRED',
                {
                    riskLevel: approvalContextResult.riskLevel,
                    riskScore: approvalContextResult.riskScore,
                    activeSignals: approvalContextResult.activeSignals.map(s => s.signalType),
                },
            );
        }

        const updated = await this.prisma.withdrawals.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.APPROVED,
                approvedAt: new Date(),
                approvedBy: adminUserId,
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_approved',
            withdrawalId: updated.id,
            statusFrom: WithdrawalStatus.REQUESTED,
            statusTo: WithdrawalStatus.APPROVED,
            actorType: 'ADMIN',
            actorId: adminUserId,
            riskLevel: approvalContextResult.riskLevel,
            riskScore: approvalContextResult.riskScore,
            approvalMode: approvalContextResult.approvalMode,
            reasonProvided: !!reason,
            sprint: 'SPRINT_12_PHASE_1',
        });

        await this.webhookService.emitWithdrawalApproved(updated, adminUserId);

        return updated;
    }

    async rejectWithdrawal(withdrawalId: string, adminUserId: string, reason: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
            throw new BusinessRuleException(
                `Cannot reject withdrawal in status ${withdrawal.status}`,
                'INVALID_STATE_TRANSITION',
                { currentStatus: withdrawal.status, attemptedTransition: 'REJECTED' },
            );
        }

        const updated = await this.prisma.withdrawals.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.REJECTED,
                rejectedAt: new Date(),
                rejectedBy: adminUserId,
                rejectionReason: reason,
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_rejected',
            withdrawalId: updated.id,
            statusFrom: WithdrawalStatus.REQUESTED,
            statusTo: WithdrawalStatus.REJECTED,
            actorType: 'ADMIN',
            actorId: adminUserId,
            rejectionReason: reason,
        });

        await this.webhookService.emitWithdrawalRejected(updated, adminUserId);

        return updated;
    }

    async cancelWithdrawal(withdrawalId: string, userId: string, reason: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        if (withdrawal.userId !== userId) {
            throw new BusinessRuleException(
                'Cannot cancel withdrawal that does not belong to you',
                'WITHDRAWAL_OWNERSHIP_VIOLATION',
            );
        }

        if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
            throw new BusinessRuleException(
                `Cannot cancel withdrawal in status ${withdrawal.status}`,
                'INVALID_STATE_TRANSITION',
                { currentStatus: withdrawal.status, attemptedTransition: 'CANCELLED' },
            );
        }

        const updated = await this.prisma.withdrawals.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.CANCELLED,
                cancelledAt: new Date(),
                cancelledBy: userId,
                cancellationReason: reason,
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'withdrawal_cancelled',
            withdrawalId: updated.id,
            statusFrom: WithdrawalStatus.REQUESTED,
            statusTo: WithdrawalStatus.CANCELLED,
            actorType: 'USER',
            actorId: userId,
            cancellationReason: reason,
        });

        await this.webhookService.emitWithdrawalCancelled(updated, userId);

        return updated;
    }

    async getWithdrawal(withdrawalId: string) {
        const withdrawal = await this.prisma.withdrawals.findUnique({
            where: { id: withdrawalId },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                wallets: {
                    select: {
                        id: true,
                        walletCode: true,
                        walletType: true,
                        currency: true,
                    },
                },
            },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal not found');
        }

        return withdrawal;
    }

    async getUserWithdrawals(userId: string, status?: WithdrawalStatus) {
        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        return this.prisma.withdrawals.findMany({
            where,
            include: {
                wallets: {
                    select: {
                        id: true,
                        walletCode: true,
                        walletType: true,
                    },
                },
            },
            orderBy: { requestedAt: 'desc' },
        });
    }

    async getAllWithdrawals(status?: WithdrawalStatus) {
        const where: any = {};
        if (status) {
            where.status = status;
        }

        return this.prisma.withdrawals.findMany({
            where,
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                wallets: {
                    select: {
                        id: true,
                        walletCode: true,
                        walletType: true,
                    },
                },
            },
            orderBy: { requestedAt: 'desc' },
        });
    }
}
