import { Injectable, Logger } from '@nestjs/common';
import { EffectivePolicy } from '../policy/dto/withdrawal-policy.dto';
import { ApprovalContext } from '../approval/withdrawal-approval-context.service';
import { RiskSeverity } from '../risk/dto/withdrawal-risk.dto';
import { Decimal } from '@prisma/client/runtime/library';

export interface AdaptiveLimitAdjustment {
    appliedRule: string;
    riskLevel: RiskSeverity;
    adjustmentFactor: number;
    reason: string;
}

export interface AdaptivePolicy extends EffectivePolicy {
    isAdapted: boolean;
    originalLimits: {
        dailyAmountLimit: number | null;
        weeklyAmountLimit: number | null;
        monthlyAmountLimit: number | null;
        dailyCountLimit: number | null;
        weeklyCountLimit: number | null;
        monthlyCountLimit: number | null;
        maxSingleWithdrawal: number | null;
        minSingleWithdrawal: number | null;
    };
    adjustments: AdaptiveLimitAdjustment[];
}

@Injectable()
export class AdaptiveWithdrawalLimitService {
    private readonly logger = new Logger(AdaptiveWithdrawalLimitService.name);

    // Adjustment factors by risk level
    private readonly RISK_ADJUSTMENTS = {
        [RiskSeverity.HIGH]: {
            maxSingleWithdrawalFactor: 0.5, // 50% of original
            dailyAmountLimitFactor: 0.6, // 60% of original
            weeklyAmountLimitFactor: 0.7, // 70% of original
            monthlyAmountLimitFactor: 0.8, // 80% of original
            dailyCountReduction: 1, // Reduce by 1
            weeklyCountReduction: 2, // Reduce by 2
            monthlyCountReduction: 3, // Reduce by 3
        },
        [RiskSeverity.MEDIUM]: {
            maxSingleWithdrawalFactor: 0.75, // 75% of original
            dailyAmountLimitFactor: 0.8, // 80% of original
            weeklyAmountLimitFactor: 0.85, // 85% of original
            monthlyAmountLimitFactor: 0.9, // 90% of original
            dailyCountReduction: 0, // No reduction
            weeklyCountReduction: 1, // Reduce by 1
            monthlyCountReduction: 1, // Reduce by 1
        },
        [RiskSeverity.LOW]: {
            // No adjustments for low risk
            maxSingleWithdrawalFactor: 1.0,
            dailyAmountLimitFactor: 1.0,
            weeklyAmountLimitFactor: 1.0,
            monthlyAmountLimitFactor: 1.0,
            dailyCountReduction: 0,
            weeklyCountReduction: 0,
            monthlyCountReduction: 0,
        },
    };

    /**
     * Apply adaptive limit adjustments based on risk context
     * SPRINT 12 PHASE 2: In-memory only, no database changes
     * 
     * @param basePolicy - Original policy from database
     * @param riskContext - Risk assessment from ApprovalContextService
     * @returns AdaptivePolicy with adjusted limits (in-memory only)
     */
    applyAdaptiveLimits(
        basePolicy: EffectivePolicy,
        riskContext: ApprovalContext,
    ): AdaptivePolicy {
        const startTime = Date.now();

        this.logger.log({
            event: 'adaptive_limits_application_started',
            riskLevel: riskContext.riskLevel,
            riskScore: riskContext.riskScore,
            policyId: basePolicy.policyId,
            sprint: 'SPRINT_12_PHASE_2',
            feature: 'adaptive-limits',
        });

        // Store original limits for auditability
        const originalLimits = {
            dailyAmountLimit: basePolicy.dailyAmountLimit,
            weeklyAmountLimit: basePolicy.weeklyAmountLimit,
            monthlyAmountLimit: basePolicy.monthlyAmountLimit,
            dailyCountLimit: basePolicy.dailyCountLimit,
            weeklyCountLimit: basePolicy.weeklyCountLimit,
            monthlyCountLimit: basePolicy.monthlyCountLimit,
            maxSingleWithdrawal: basePolicy.maxSingleWithdrawal,
            minSingleWithdrawal: basePolicy.minSingleWithdrawal,
        };

        // For LOW risk, return policy as-is
        if (riskContext.riskLevel === RiskSeverity.LOW) {
            const durationMs = Date.now() - startTime;

            this.logger.log({
                event: 'adaptive_limits_applied',
                riskLevel: riskContext.riskLevel,
                adjustmentsApplied: 0,
                isAdapted: false,
                durationMs,
                sprint: 'SPRINT_12_PHASE_2',
                feature: 'adaptive-limits',
            });

            return {
                ...basePolicy,
                isAdapted: false,
                originalLimits,
                adjustments: [],
            };
        }

        // Apply risk-based adjustments (MEDIUM or HIGH)
        const adjustments: AdaptiveLimitAdjustment[] = [];
        const riskAdjustments = this.RISK_ADJUSTMENTS[riskContext.riskLevel];

        // Adjust max single withdrawal
        let adjustedMaxSingle = basePolicy.maxSingleWithdrawal;
        if (adjustedMaxSingle !== null && riskAdjustments.maxSingleWithdrawalFactor < 1.0) {
            adjustedMaxSingle = Math.floor(
                adjustedMaxSingle * riskAdjustments.maxSingleWithdrawalFactor,
            );
            adjustments.push({
                appliedRule: 'MAX_SINGLE_WITHDRAWAL_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.maxSingleWithdrawalFactor,
                reason: `Reduced max single withdrawal to ${(riskAdjustments.maxSingleWithdrawalFactor * 100).toFixed(0)}% due to ${riskContext.riskLevel} risk`,
            });
        }

        // Adjust daily amount limit
        let adjustedDailyAmount = basePolicy.dailyAmountLimit;
        if (adjustedDailyAmount !== null && riskAdjustments.dailyAmountLimitFactor < 1.0) {
            adjustedDailyAmount = Math.floor(
                adjustedDailyAmount * riskAdjustments.dailyAmountLimitFactor,
            );
            adjustments.push({
                appliedRule: 'DAILY_AMOUNT_LIMIT_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.dailyAmountLimitFactor,
                reason: `Reduced daily amount limit to ${(riskAdjustments.dailyAmountLimitFactor * 100).toFixed(0)}% due to ${riskContext.riskLevel} risk`,
            });
        }

        // Adjust weekly amount limit
        let adjustedWeeklyAmount = basePolicy.weeklyAmountLimit;
        if (adjustedWeeklyAmount !== null && riskAdjustments.weeklyAmountLimitFactor < 1.0) {
            adjustedWeeklyAmount = Math.floor(
                adjustedWeeklyAmount * riskAdjustments.weeklyAmountLimitFactor,
            );
            adjustments.push({
                appliedRule: 'WEEKLY_AMOUNT_LIMIT_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.weeklyAmountLimitFactor,
                reason: `Reduced weekly amount limit to ${(riskAdjustments.weeklyAmountLimitFactor * 100).toFixed(0)}% due to ${riskContext.riskLevel} risk`,
            });
        }

        // Adjust monthly amount limit
        let adjustedMonthlyAmount = basePolicy.monthlyAmountLimit;
        if (adjustedMonthlyAmount !== null && riskAdjustments.monthlyAmountLimitFactor < 1.0) {
            adjustedMonthlyAmount = Math.floor(
                adjustedMonthlyAmount * riskAdjustments.monthlyAmountLimitFactor,
            );
            adjustments.push({
                appliedRule: 'MONTHLY_AMOUNT_LIMIT_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.monthlyAmountLimitFactor,
                reason: `Reduced monthly amount limit to ${(riskAdjustments.monthlyAmountLimitFactor * 100).toFixed(0)}% due to ${riskContext.riskLevel} risk`,
            });
        }

        // Adjust daily count limit
        let adjustedDailyCount = basePolicy.dailyCountLimit;
        if (
            adjustedDailyCount !== null &&
            riskAdjustments.dailyCountReduction > 0 &&
            adjustedDailyCount > riskAdjustments.dailyCountReduction
        ) {
            adjustedDailyCount = adjustedDailyCount - riskAdjustments.dailyCountReduction;
            adjustments.push({
                appliedRule: 'DAILY_COUNT_LIMIT_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.dailyCountReduction,
                reason: `Reduced daily count limit by ${riskAdjustments.dailyCountReduction} due to ${riskContext.riskLevel} risk`,
            });
        }

        // Adjust weekly count limit
        let adjustedWeeklyCount = basePolicy.weeklyCountLimit;
        if (
            adjustedWeeklyCount !== null &&
            riskAdjustments.weeklyCountReduction > 0 &&
            adjustedWeeklyCount > riskAdjustments.weeklyCountReduction
        ) {
            adjustedWeeklyCount = adjustedWeeklyCount - riskAdjustments.weeklyCountReduction;
            adjustments.push({
                appliedRule: 'WEEKLY_COUNT_LIMIT_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.weeklyCountReduction,
                reason: `Reduced weekly count limit by ${riskAdjustments.weeklyCountReduction} due to ${riskContext.riskLevel} risk`,
            });
        }

        // Adjust monthly count limit
        let adjustedMonthlyCount = basePolicy.monthlyCountLimit;
        if (
            adjustedMonthlyCount !== null &&
            riskAdjustments.monthlyCountReduction > 0 &&
            adjustedMonthlyCount > riskAdjustments.monthlyCountReduction
        ) {
            adjustedMonthlyCount = adjustedMonthlyCount - riskAdjustments.monthlyCountReduction;
            adjustments.push({
                appliedRule: 'MONTHLY_COUNT_LIMIT_REDUCTION',
                riskLevel: riskContext.riskLevel,
                adjustmentFactor: riskAdjustments.monthlyCountReduction,
                reason: `Reduced monthly count limit by ${riskAdjustments.monthlyCountReduction} due to ${riskContext.riskLevel} risk`,
            });
        }

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'adaptive_limits_applied',
            riskLevel: riskContext.riskLevel,
            riskScore: riskContext.riskScore,
            adjustmentsApplied: adjustments.length,
            isAdapted: true,
            adjustmentRules: adjustments.map((a) => a.appliedRule),
            originalLimits: {
                maxSingle: originalLimits.maxSingleWithdrawal,
                dailyAmount: originalLimits.dailyAmountLimit,
                dailyCount: originalLimits.dailyCountLimit,
            },
            adjustedLimits: {
                maxSingle: adjustedMaxSingle,
                dailyAmount: adjustedDailyAmount,
                dailyCount: adjustedDailyCount,
            },
            durationMs,
            sprint: 'SPRINT_12_PHASE_2',
            feature: 'adaptive-limits',
        });

        return {
            ...basePolicy,
            dailyAmountLimit: adjustedDailyAmount,
            weeklyAmountLimit: adjustedWeeklyAmount,
            monthlyAmountLimit: adjustedMonthlyAmount,
            dailyCountLimit: adjustedDailyCount,
            weeklyCountLimit: adjustedWeeklyCount,
            monthlyCountLimit: adjustedMonthlyCount,
            maxSingleWithdrawal: adjustedMaxSingle,
            minSingleWithdrawal: basePolicy.minSingleWithdrawal, // Never adjust minimum
            isAdapted: true,
            originalLimits,
            adjustments,
        };
    }

    /**
     * Get adjustment explanation for user-facing messages
     * SPRINT 12 PHASE 2: Explainability for limit violations
     */
    getAdjustmentExplanation(adaptivePolicy: AdaptivePolicy): string | null {
        if (!adaptivePolicy.isAdapted || adaptivePolicy.adjustments.length === 0) {
            return null;
        }

        const reasons = adaptivePolicy.adjustments.map((adj) => adj.reason);
        return `Limits adjusted due to risk assessment: ${reasons.join('; ')}`;
    }
}
