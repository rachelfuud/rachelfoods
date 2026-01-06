import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalPolicyResolverService } from './withdrawal-policy-resolver.service';
import {
    LimitEvaluationResult,
    LimitViolation,
    EffectivePolicy,
} from './dto/withdrawal-policy.dto';
import { AdaptiveWithdrawalLimitService, AdaptivePolicy } from '../adaptive/adaptive-withdrawal-limit.service';
import { ApprovalContext } from '../approval/withdrawal-approval-context.service';

@Injectable()
export class WithdrawalLimitEvaluatorService {
    private readonly logger = new Logger(WithdrawalLimitEvaluatorService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly policyResolver: WithdrawalPolicyResolverService,
        private readonly adaptiveLimitService: AdaptiveWithdrawalLimitService,
    ) { }

    /**
     * Evaluate if a withdrawal request complies with policy limits
     * READ-ONLY: No mutations, only queries and checks
     * Throws BusinessRuleException if limits are violated
     * SPRINT 12 PHASE 2: Applies adaptive limit adjustments based on risk context
     */
    async evaluateWithdrawalRequest(
        userId: string,
        walletId: string,
        requestedAmount: Decimal,
        currency: string,
        userRole: string | null = null,
        riskContext: ApprovalContext | null = null,
    ): Promise<LimitEvaluationResult> {
        const startTime = Date.now();

        // Resolve applicable policy
        let policy = await this.policyResolver.resolvePolicy(userRole, currency);
        let adaptivePolicy: AdaptivePolicy | null = null;

        // SPRINT 12 PHASE 2: Apply adaptive limits if risk context provided
        if (policy && riskContext) {
            adaptivePolicy = this.adaptiveLimitService.applyAdaptiveLimits(policy, riskContext);
            policy = adaptivePolicy; // Use adjusted policy for evaluation

            this.logger.log({
                event: 'adaptive_limits_evaluation_started',
                userId,
                walletId,
                riskLevel: riskContext.riskLevel,
                riskScore: riskContext.riskScore,
                isAdapted: adaptivePolicy.isAdapted,
                adjustmentsApplied: adaptivePolicy.adjustments.length,
                originalLimits: adaptivePolicy.originalLimits,
                adjustedLimits: {
                    maxSingleWithdrawal: policy.maxSingleWithdrawal,
                    dailyAmountLimit: policy.dailyAmountLimit,
                    dailyCountLimit: policy.dailyCountLimit,
                },
                sprint: 'SPRINT_12_PHASE_2',
                feature: 'adaptive-limits',
            });
        }

        // If no policy exists, allow the withdrawal
        if (!policy) {
            this.logger.debug({
                event: 'policy_evaluation_skipped',
                userId,
                walletId,
                reason: 'no_applicable_policy',
            });

            return {
                allowed: true,
                violations: [],
                policyApplied: null,
                metrics: {
                    dailyCount: 0,
                    weeklyCount: 0,
                    monthlyCount: 0,
                    dailyAmount: '0',
                    weeklyAmount: '0',
                    monthlyAmount: '0',
                },
            };
        }

        // Calculate time boundaries
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Fetch withdrawal history (REQUESTED, APPROVED, PROCESSING, COMPLETED)
        const [dailyWithdrawals, weeklyWithdrawals, monthlyWithdrawals] = await Promise.all([
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    requestedAt: { gte: oneDayAgo },
                    status: { in: ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED'] },
                },
                select: {
                    netAmount: true,
                },
            }),
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    requestedAt: { gte: oneWeekAgo },
                    status: { in: ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED'] },
                },
                select: {
                    netAmount: true,
                },
            }),
            this.prisma.withdrawals.findMany({
                where: {
                    userId,
                    requestedAt: { gte: oneMonthAgo },
                    status: { in: ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED'] },
                },
                select: {
                    netAmount: true,
                },
            }),
        ]);

        // Calculate metrics
        const dailyCount = dailyWithdrawals.length;
        const weeklyCount = weeklyWithdrawals.length;
        const monthlyCount = monthlyWithdrawals.length;

        const dailyAmount = dailyWithdrawals.reduce(
            (sum, w) => sum.add(w.netAmount),
            new Decimal(0),
        );
        const weeklyAmount = weeklyWithdrawals.reduce(
            (sum, w) => sum.add(w.netAmount),
            new Decimal(0),
        );
        const monthlyAmount = monthlyWithdrawals.reduce(
            (sum, w) => sum.add(w.netAmount),
            new Decimal(0),
        );

        // Check violations
        const violations: LimitViolation[] = [];

        // Check single withdrawal limits
        if (policy.minSingleWithdrawal !== null) {
            if (requestedAmount.lt(policy.minSingleWithdrawal)) {
                violations.push({
                    violationType: 'MIN_SINGLE_WITHDRAWAL',
                    message: `Withdrawal amount ${requestedAmount.toString()} is below minimum limit of ${policy.minSingleWithdrawal}`,
                    currentValue: requestedAmount.toString(),
                    limitValue: policy.minSingleWithdrawal.toString(),
                });
            }
        }

        if (policy.maxSingleWithdrawal !== null) {
            if (requestedAmount.gt(policy.maxSingleWithdrawal)) {
                let message = `Withdrawal amount ${requestedAmount.toString()} exceeds maximum limit of ${policy.maxSingleWithdrawal}`;

                // SPRINT 12 PHASE 2: Add explainability for adaptive adjustments
                if (adaptivePolicy && adaptivePolicy.isAdapted) {
                    const originalLimit = adaptivePolicy.originalLimits.maxSingleWithdrawal;
                    if (originalLimit && originalLimit !== policy.maxSingleWithdrawal) {
                        message += ` (adjusted from original ${originalLimit} due to ${riskContext?.riskLevel} risk)`;
                    }
                }

                violations.push({
                    violationType: 'MAX_SINGLE_WITHDRAWAL',
                    message,
                    currentValue: requestedAmount.toString(),
                    limitValue: policy.maxSingleWithdrawal.toString(),
                });
            }
        }

        // Check daily limits
        if (policy.dailyCountLimit !== null) {
            if (dailyCount >= policy.dailyCountLimit) {
                let message = `Daily withdrawal count (${dailyCount}) has reached limit of ${policy.dailyCountLimit}`;

                // SPRINT 12 PHASE 2: Add explainability for adaptive adjustments
                if (adaptivePolicy && adaptivePolicy.isAdapted) {
                    const originalLimit = adaptivePolicy.originalLimits.dailyCountLimit;
                    if (originalLimit && originalLimit !== policy.dailyCountLimit) {
                        message += ` (adjusted from original ${originalLimit} due to ${riskContext?.riskLevel} risk)`;
                    }
                }

                violations.push({
                    violationType: 'DAILY_COUNT_EXCEEDED',
                    message,
                    currentValue: dailyCount,
                    limitValue: policy.dailyCountLimit,
                });
            }
        }

        if (policy.dailyAmountLimit !== null) {
            const projectedDailyAmount = dailyAmount.add(requestedAmount);
            if (projectedDailyAmount.gt(policy.dailyAmountLimit)) {
                let message = `Daily withdrawal amount (${dailyAmount.toString()} + ${requestedAmount.toString()}) would exceed limit of ${policy.dailyAmountLimit}`;

                // SPRINT 12 PHASE 2: Add explainability for adaptive adjustments
                if (adaptivePolicy && adaptivePolicy.isAdapted) {
                    const originalLimit = adaptivePolicy.originalLimits.dailyAmountLimit;
                    if (originalLimit && originalLimit !== policy.dailyAmountLimit) {
                        message += ` (adjusted from original ${originalLimit} due to ${riskContext?.riskLevel} risk)`;
                    }
                }

                violations.push({
                    violationType: 'DAILY_AMOUNT_EXCEEDED',
                    message,
                    currentValue: projectedDailyAmount.toString(),
                    limitValue: policy.dailyAmountLimit.toString(),
                });
            }
        }

        // Check weekly limits
        if (policy.weeklyCountLimit !== null) {
            if (weeklyCount >= policy.weeklyCountLimit) {
                violations.push({
                    violationType: 'WEEKLY_COUNT_EXCEEDED',
                    message: `Weekly withdrawal count (${weeklyCount}) has reached limit of ${policy.weeklyCountLimit}`,
                    currentValue: weeklyCount,
                    limitValue: policy.weeklyCountLimit,
                });
            }
        }

        if (policy.weeklyAmountLimit !== null) {
            const projectedWeeklyAmount = weeklyAmount.add(requestedAmount);
            if (projectedWeeklyAmount.gt(policy.weeklyAmountLimit)) {
                violations.push({
                    violationType: 'WEEKLY_AMOUNT_EXCEEDED',
                    message: `Weekly withdrawal amount (${weeklyAmount.toString()} + ${requestedAmount.toString()}) would exceed limit of ${policy.weeklyAmountLimit}`,
                    currentValue: projectedWeeklyAmount.toString(),
                    limitValue: policy.weeklyAmountLimit.toString(),
                });
            }
        }

        // Check monthly limits
        if (policy.monthlyCountLimit !== null) {
            if (monthlyCount >= policy.monthlyCountLimit) {
                violations.push({
                    violationType: 'MONTHLY_COUNT_EXCEEDED',
                    message: `Monthly withdrawal count (${monthlyCount}) has reached limit of ${policy.monthlyCountLimit}`,
                    currentValue: monthlyCount,
                    limitValue: policy.monthlyCountLimit,
                });
            }
        }

        if (policy.monthlyAmountLimit !== null) {
            const projectedMonthlyAmount = monthlyAmount.add(requestedAmount);
            if (projectedMonthlyAmount.gt(policy.monthlyAmountLimit)) {
                violations.push({
                    violationType: 'MONTHLY_AMOUNT_EXCEEDED',
                    message: `Monthly withdrawal amount (${monthlyAmount.toString()} + ${requestedAmount.toString()}) would exceed limit of ${policy.monthlyAmountLimit}`,
                    currentValue: projectedMonthlyAmount.toString(),
                    limitValue: policy.monthlyAmountLimit.toString(),
                });
            }
        }

        const allowed = violations.length === 0;
        const durationMs = Date.now() - startTime;

        // Log evaluation result
        this.logger.log({
            event: 'policy_evaluation_completed',
            userId,
            walletId,
            policyId: policy.policyId,
            allowed,
            violationsCount: violations.length,
            requestedAmount: requestedAmount.toString(),
            durationMs,
        });

        // Log violations if any
        if (!allowed) {
            this.logger.warn({
                event: 'policy_violation_detected',
                userId,
                walletId,
                policyId: policy.policyId,
                violations: violations.map((v) => v.violationType),
                requestedAmount: requestedAmount.toString(),
            });
        }

        return {
            allowed,
            violations,
            policyApplied: policy,
            metrics: {
                dailyCount,
                weeklyCount,
                monthlyCount,
                dailyAmount: dailyAmount.toString(),
                weeklyAmount: weeklyAmount.toString(),
                monthlyAmount: monthlyAmount.toString(),
            },
        };
    }
}
