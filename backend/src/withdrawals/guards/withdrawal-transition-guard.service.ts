import { Injectable, Logger } from '@nestjs/common';
import { WithdrawalRiskService } from '../risk/withdrawal-risk.service';
import { RiskSeverity } from '../risk/dto/withdrawal-risk.dto';
import { WithdrawalStatus } from '@prisma/client';

export interface TransitionGuardDecision {
    allowed: boolean;
    requiresAdminConfirmation: boolean;
    reason: string | null;
    riskLevel: RiskSeverity;
    riskScore: number;
    activeSignals: string[];
    guardRule: string | null;
}

export interface TransitionContext {
    withdrawalId: string;
    userId: string;
    fromStatus: WithdrawalStatus;
    toStatus: WithdrawalStatus;
    adminId?: string;
    confirmationReason?: string;
}

@Injectable()
export class WithdrawalTransitionGuardService {
    private readonly logger = new Logger(WithdrawalTransitionGuardService.name);

    constructor(private readonly riskService: WithdrawalRiskService) { }

    /**
     * Evaluate if a withdrawal state transition is allowed based on risk context
     * SPRINT 13 PHASE 1: Risk-aware guardrails for state transitions
     * 
     * @param context - Transition context (withdrawal ID, user, from/to status, admin info)
     * @returns TransitionGuardDecision with allowed status and requirements
     */
    async evaluateTransition(context: TransitionContext): Promise<TransitionGuardDecision> {
        const startTime = Date.now();

        this.logger.log({
            event: 'transition_guard_evaluation_started',
            withdrawalId: context.withdrawalId,
            userId: context.userId,
            fromStatus: context.fromStatus,
            toStatus: context.toStatus,
            sprint: 'SPRINT_13_PHASE_1',
            feature: 'transition-guards',
        });

        // Evaluate current user risk profile
        const riskProfile = await this.riskService.computeUserRiskProfile(context.userId);

        const activeSignals = riskProfile.activeSignals.map((s) => s.signalType);

        // Determine guard rule based on transition and risk level
        const decision = this.applyGuardRules(
            context.fromStatus,
            context.toStatus,
            riskProfile.riskLevel,
            riskProfile.overallScore,
            activeSignals,
            context.adminId,
            context.confirmationReason,
        );

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'transition_guard_evaluation_completed',
            withdrawalId: context.withdrawalId,
            userId: context.userId,
            fromStatus: context.fromStatus,
            toStatus: context.toStatus,
            riskLevel: riskProfile.riskLevel,
            riskScore: riskProfile.overallScore,
            allowed: decision.allowed,
            requiresAdminConfirmation: decision.requiresAdminConfirmation,
            guardRule: decision.guardRule,
            activeSignalsCount: activeSignals.length,
            durationMs,
            sprint: 'SPRINT_13_PHASE_1',
            feature: 'transition-guards',
        });

        // Log gated transitions with warning level
        if (!decision.allowed) {
            this.logger.warn({
                event: 'transition_gated',
                withdrawalId: context.withdrawalId,
                userId: context.userId,
                fromStatus: context.fromStatus,
                toStatus: context.toStatus,
                riskLevel: riskProfile.riskLevel,
                riskScore: riskProfile.overallScore,
                reason: decision.reason,
                guardRule: decision.guardRule,
                activeSignals,
                sprint: 'SPRINT_13_PHASE_1',
                feature: 'transition-guards',
            });
        }

        return decision;
    }

    /**
     * Apply guard rules based on transition type and risk level
     * SPRINT 13 PHASE 1: Deterministic guard logic
     */
    private applyGuardRules(
        fromStatus: WithdrawalStatus,
        toStatus: WithdrawalStatus,
        riskLevel: RiskSeverity,
        riskScore: number,
        activeSignals: string[],
        adminId?: string,
        confirmationReason?: string,
    ): TransitionGuardDecision {
        // Guard 1: APPROVED → PROCESSING transition
        if (fromStatus === WithdrawalStatus.APPROVED && toStatus === WithdrawalStatus.PROCESSING) {
            return this.guardApprovedToProcessing(
                riskLevel,
                riskScore,
                activeSignals,
                adminId,
                confirmationReason,
            );
        }

        // Guard 2: PROCESSING → COMPLETED transition
        if (fromStatus === WithdrawalStatus.PROCESSING && toStatus === WithdrawalStatus.COMPLETED) {
            return this.guardProcessingToCompleted(
                riskLevel,
                riskScore,
                activeSignals,
                adminId,
                confirmationReason,
            );
        }

        // Default: Allow unguarded transitions
        return {
            allowed: true,
            requiresAdminConfirmation: false,
            reason: null,
            riskLevel,
            riskScore,
            activeSignals,
            guardRule: null,
        };
    }

    /**
     * Guard: APPROVED → PROCESSING
     * SPRINT 13 PHASE 1: Risk-based friction before payout initiation
     */
    private guardApprovedToProcessing(
        riskLevel: RiskSeverity,
        riskScore: number,
        activeSignals: string[],
        adminId?: string,
        confirmationReason?: string,
    ): TransitionGuardDecision {
        // LOW risk: Allow automatic processing
        if (riskLevel === RiskSeverity.LOW) {
            return {
                allowed: true,
                requiresAdminConfirmation: false,
                reason: null,
                riskLevel,
                riskScore,
                activeSignals,
                guardRule: 'LOW_RISK_AUTO_PROCESSING',
            };
        }

        // MEDIUM risk: Allow with warning (no hard gate)
        if (riskLevel === RiskSeverity.MEDIUM) {
            return {
                allowed: true,
                requiresAdminConfirmation: false,
                reason: 'MEDIUM risk withdrawal proceeding to processing. Monitor closely.',
                riskLevel,
                riskScore,
                activeSignals,
                guardRule: 'MEDIUM_RISK_MONITORED_PROCESSING',
            };
        }

        // HIGH risk: Require admin confirmation with reason
        if (riskLevel === RiskSeverity.HIGH) {
            // Check if admin confirmation provided
            if (!adminId) {
                return {
                    allowed: false,
                    requiresAdminConfirmation: true,
                    reason: 'HIGH risk withdrawal requires explicit admin confirmation to proceed to processing',
                    riskLevel,
                    riskScore,
                    activeSignals,
                    guardRule: 'HIGH_RISK_PROCESSING_GATE',
                };
            }

            // Check if confirmation reason provided
            if (!confirmationReason || confirmationReason.trim().length < 10) {
                return {
                    allowed: false,
                    requiresAdminConfirmation: true,
                    reason: 'Admin confirmation reason required (minimum 10 characters) for HIGH risk withdrawal processing',
                    riskLevel,
                    riskScore,
                    activeSignals,
                    guardRule: 'HIGH_RISK_PROCESSING_GATE',
                };
            }

            // Admin confirmation provided - allow transition
            return {
                allowed: true,
                requiresAdminConfirmation: false,
                reason: `HIGH risk processing confirmed by admin: ${confirmationReason}`,
                riskLevel,
                riskScore,
                activeSignals,
                guardRule: 'HIGH_RISK_PROCESSING_CONFIRMED',
            };
        }

        // Fallback: Conservative approach (require confirmation)
        return {
            allowed: false,
            requiresAdminConfirmation: true,
            reason: 'Unknown risk level - requires admin review',
            riskLevel,
            riskScore,
            activeSignals,
            guardRule: 'FALLBACK_GATE',
        };
    }

    /**
     * Guard: PROCESSING → COMPLETED
     * SPRINT 13 PHASE 1: Risk-based verification before final completion
     */
    private guardProcessingToCompleted(
        riskLevel: RiskSeverity,
        riskScore: number,
        activeSignals: string[],
        adminId?: string,
        confirmationReason?: string,
    ): TransitionGuardDecision {
        // LOW risk: Allow automatic completion
        if (riskLevel === RiskSeverity.LOW) {
            return {
                allowed: true,
                requiresAdminConfirmation: false,
                reason: null,
                riskLevel,
                riskScore,
                activeSignals,
                guardRule: 'LOW_RISK_AUTO_COMPLETION',
            };
        }

        // MEDIUM risk: Require admin confirmation (soft gate)
        if (riskLevel === RiskSeverity.MEDIUM) {
            // Check if admin confirmation provided
            if (!adminId || !confirmationReason || confirmationReason.trim().length < 10) {
                return {
                    allowed: false,
                    requiresAdminConfirmation: true,
                    reason: 'MEDIUM risk withdrawal requires admin confirmation with reason (min 10 characters) before completion',
                    riskLevel,
                    riskScore,
                    activeSignals,
                    guardRule: 'MEDIUM_RISK_COMPLETION_GATE',
                };
            }

            // Admin confirmation provided - allow transition
            return {
                allowed: true,
                requiresAdminConfirmation: false,
                reason: `MEDIUM risk completion confirmed by admin: ${confirmationReason}`,
                riskLevel,
                riskScore,
                activeSignals,
                guardRule: 'MEDIUM_RISK_COMPLETION_CONFIRMED',
            };
        }

        // HIGH risk: Require admin confirmation with strict validation
        if (riskLevel === RiskSeverity.HIGH) {
            // Check if admin confirmation provided
            if (!adminId) {
                return {
                    allowed: false,
                    requiresAdminConfirmation: true,
                    reason: 'HIGH risk withdrawal requires explicit admin confirmation to complete',
                    riskLevel,
                    riskScore,
                    activeSignals,
                    guardRule: 'HIGH_RISK_COMPLETION_GATE',
                };
            }

            // Check if confirmation reason provided with sufficient detail
            if (!confirmationReason || confirmationReason.trim().length < 20) {
                return {
                    allowed: false,
                    requiresAdminConfirmation: true,
                    reason: 'Admin confirmation reason required (minimum 20 characters) for HIGH risk withdrawal completion',
                    riskLevel,
                    riskScore,
                    activeSignals,
                    guardRule: 'HIGH_RISK_COMPLETION_GATE',
                };
            }

            // Admin confirmation provided with sufficient detail - allow transition
            return {
                allowed: true,
                requiresAdminConfirmation: false,
                reason: `HIGH risk completion confirmed by admin: ${confirmationReason}`,
                riskLevel,
                riskScore,
                activeSignals,
                guardRule: 'HIGH_RISK_COMPLETION_CONFIRMED',
            };
        }

        // Fallback: Conservative approach (require confirmation)
        return {
            allowed: false,
            requiresAdminConfirmation: true,
            reason: 'Unknown risk level - requires admin review before completion',
            riskLevel,
            riskScore,
            activeSignals,
            guardRule: 'FALLBACK_GATE',
        };
    }

    /**
     * Get human-readable explanation of guard decision
     * SPRINT 13 PHASE 1: Explainability for error responses
     */
    formatGuardMessage(decision: TransitionGuardDecision, context: TransitionContext): string {
        if (decision.allowed) {
            return decision.reason || 'Transition allowed';
        }

        let message = `Transition from ${context.fromStatus} to ${context.toStatus} gated: ${decision.reason}`;

        if (decision.requiresAdminConfirmation) {
            message += '. Admin confirmation required.';
        }

        if (decision.activeSignals.length > 0) {
            message += ` Active risk signals: ${decision.activeSignals.join(', ')}`;
        }

        return message;
    }
}
