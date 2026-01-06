import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalContext } from '../approval/withdrawal-approval-context.service';
import { RiskSeverity } from '../risk/dto/withdrawal-risk.dto';

export interface CoolingPeriodConfig {
    enabled: boolean;
    durationMinutes: number;
    triggerCondition: string;
}

export interface CoolingPeriodEvaluation {
    coolingRequired: boolean;
    coolingEndsAt: Date | null;
    coolingReason: string | null;
    remainingMinutes: number | null;
    ruleApplied: string | null;
    lastWithdrawalAt: Date | null;
}

@Injectable()
export class WithdrawalCoolingPeriodService {
    private readonly logger = new Logger(WithdrawalCoolingPeriodService.name);

    // Cooling period configurations by risk level
    private readonly COOLING_CONFIGS: Record<RiskSeverity, CoolingPeriodConfig> = {
        [RiskSeverity.HIGH]: {
            enabled: true,
            durationMinutes: 720, // 12 hours
            triggerCondition: 'ANY_WITHDRAWAL_ATTEMPT',
        },
        [RiskSeverity.MEDIUM]: {
            enabled: true,
            durationMinutes: 120, // 2 hours
            triggerCondition: 'AFTER_2_WITHDRAWALS_IN_24H',
        },
        [RiskSeverity.LOW]: {
            enabled: false,
            durationMinutes: 0,
            triggerCondition: 'NONE',
        },
    };

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Evaluate if user is in a cooling period for withdrawal requests
     * SPRINT 12 PHASE 3: READ-ONLY time-based restriction analysis
     * 
     * @param userId - User requesting withdrawal
     * @param riskContext - Risk assessment from ApprovalContextService
     * @returns CoolingPeriodEvaluation with cooling status and retry info
     */
    async evaluateCoolingPeriod(
        userId: string,
        riskContext: ApprovalContext,
    ): Promise<CoolingPeriodEvaluation> {
        const startTime = Date.now();

        this.logger.log({
            event: 'cooling_period_evaluation_started',
            userId,
            riskLevel: riskContext.riskLevel,
            riskScore: riskContext.riskScore,
            sprint: 'SPRINT_12_PHASE_3',
            feature: 'cooling-period',
        });

        const config = this.COOLING_CONFIGS[riskContext.riskLevel];

        // LOW risk: No cooling period
        if (!config.enabled) {
            const durationMs = Date.now() - startTime;

            this.logger.log({
                event: 'cooling_period_evaluation_completed',
                userId,
                riskLevel: riskContext.riskLevel,
                coolingRequired: false,
                durationMs,
                sprint: 'SPRINT_12_PHASE_3',
                feature: 'cooling-period',
            });

            return {
                coolingRequired: false,
                coolingEndsAt: null,
                coolingReason: null,
                remainingMinutes: null,
                ruleApplied: null,
                lastWithdrawalAt: null,
            };
        }

        // Fetch recent withdrawal history (READ-ONLY query)
        const now = new Date();
        const lookbackPeriod = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours

        // Query all withdrawal attempts (including REQUESTED, REJECTED, APPROVED, etc.)
        // This captures the "last attempt" regardless of outcome
        const recentWithdrawals = await this.prisma.withdrawals.findMany({
            where: {
                userId,
                requestedAt: { gte: lookbackPeriod },
            },
            orderBy: {
                requestedAt: 'desc',
            },
            select: {
                id: true,
                requestedAt: true,
                status: true,
            },
        });

        this.logger.debug({
            event: 'recent_withdrawals_fetched',
            userId,
            count: recentWithdrawals.length,
            lookbackPeriod: lookbackPeriod.toISOString(),
            sprint: 'SPRINT_12_PHASE_3',
            feature: 'cooling-period',
        });

        // Determine if cooling applies based on risk level and trigger condition
        let coolingRequired = false;
        let coolingEndsAt: Date | null = null;
        let coolingReason: string | null = null;
        let ruleApplied: string | null = null;
        let lastWithdrawalAt: Date | null = null;

        if (recentWithdrawals.length > 0) {
            lastWithdrawalAt = recentWithdrawals[0].requestedAt;
            const timeSinceLastWithdrawal = now.getTime() - lastWithdrawalAt.getTime();
            const coolingDurationMs = config.durationMinutes * 60 * 1000;

            // HIGH risk: Cooling after ANY withdrawal
            if (riskContext.riskLevel === RiskSeverity.HIGH) {
                if (timeSinceLastWithdrawal < coolingDurationMs) {
                    coolingRequired = true;
                    coolingEndsAt = new Date(lastWithdrawalAt.getTime() + coolingDurationMs);
                    coolingReason = `HIGH risk users must wait ${config.durationMinutes} minutes between withdrawal attempts`;
                    ruleApplied = 'HIGH_RISK_MANDATORY_COOLDOWN';
                }
            }

            // MEDIUM risk: Cooling if ≥2 withdrawals in 24h
            if (riskContext.riskLevel === RiskSeverity.MEDIUM) {
                if (recentWithdrawals.length >= 2) {
                    // Check if we're still in cooling period from last withdrawal
                    if (timeSinceLastWithdrawal < coolingDurationMs) {
                        coolingRequired = true;
                        coolingEndsAt = new Date(lastWithdrawalAt.getTime() + coolingDurationMs);
                        coolingReason = `MEDIUM risk users must wait ${config.durationMinutes} minutes after making 2+ withdrawals in 24 hours`;
                        ruleApplied = 'MEDIUM_RISK_VELOCITY_COOLDOWN';
                    }
                }
            }
        }

        const remainingMinutes = coolingEndsAt
            ? Math.ceil((coolingEndsAt.getTime() - now.getTime()) / (60 * 1000))
            : null;

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'cooling_period_evaluation_completed',
            userId,
            riskLevel: riskContext.riskLevel,
            riskScore: riskContext.riskScore,
            coolingRequired,
            coolingEndsAt: coolingEndsAt?.toISOString(),
            remainingMinutes,
            ruleApplied,
            recentWithdrawalsCount: recentWithdrawals.length,
            lastWithdrawalAt: lastWithdrawalAt?.toISOString(),
            durationMs,
            sprint: 'SPRINT_12_PHASE_3',
            feature: 'cooling-period',
        });

        // Detailed log if cooling is active
        if (coolingRequired) {
            this.logger.warn({
                event: 'cooling_period_active',
                userId,
                riskLevel: riskContext.riskLevel,
                riskScore: riskContext.riskScore,
                coolingEndsAt: coolingEndsAt?.toISOString(),
                remainingMinutes,
                ruleApplied,
                coolingReason,
                lastWithdrawalAt: lastWithdrawalAt?.toISOString(),
                activeSignals: riskContext.activeSignals.map((s) => s.signalType),
                sprint: 'SPRINT_12_PHASE_3',
                feature: 'cooling-period',
            });
        }

        return {
            coolingRequired,
            coolingEndsAt,
            coolingReason,
            remainingMinutes,
            ruleApplied,
            lastWithdrawalAt,
        };
    }

    /**
     * Get cooling period configuration for a given risk level
     * SPRINT 12 PHASE 3: Read-only configuration access
     */
    getCoolingConfig(riskLevel: RiskSeverity): CoolingPeriodConfig {
        return this.COOLING_CONFIGS[riskLevel];
    }

    /**
     * Format user-friendly cooling period message
     * SPRINT 12 PHASE 3: Explainability for error responses
     */
    formatCoolingMessage(evaluation: CoolingPeriodEvaluation): string {
        if (!evaluation.coolingRequired) {
            return '';
        }

        const retryAfter = evaluation.coolingEndsAt
            ? evaluation.coolingEndsAt.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
            })
            : 'unknown';

        return `${evaluation.coolingReason}. Retry after ${retryAfter} (${evaluation.remainingMinutes} minutes remaining).`;
    }
}
