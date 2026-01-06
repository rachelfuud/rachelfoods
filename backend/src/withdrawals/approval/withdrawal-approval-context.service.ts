import { Injectable, Logger } from '@nestjs/common';
import { WithdrawalRiskService } from '../risk/withdrawal-risk.service';
import { RiskSeverity } from '../risk/dto/withdrawal-risk.dto';

export enum ApprovalMode {
    AUTO_APPROVE_ELIGIBLE = 'AUTO_APPROVE_ELIGIBLE',
    MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
}

export interface ApprovalContext {
    riskLevel: RiskSeverity;
    approvalMode: ApprovalMode;
    requiresReviewReason: boolean;
    riskScore: number;
    activeSignals: {
        signalType: string;
        severity: RiskSeverity;
        score: number;
        explanation: string;
    }[];
    evaluatedAt: string;
}

@Injectable()
export class WithdrawalApprovalContextService {
    private readonly logger = new Logger(WithdrawalApprovalContextService.name);

    constructor(private readonly riskService: WithdrawalRiskService) { }

    /**
     * Compute approval context for a withdrawal request
     * READ-ONLY: Uses existing risk signals to determine approval routing
     * 
     * SPRINT 12 PHASE 1: Risk-aware approval gating
     * - LOW risk: Eligible for auto-approval (if implemented)
     * - MEDIUM/HIGH risk: Requires manual review with reason
     */
    async computeApprovalContext(userId: string): Promise<ApprovalContext> {
        const startTime = Date.now();

        this.logger.log({
            event: 'approval_context_evaluation_started',
            userId,
            sprint: 'SPRINT_12_PHASE_1',
            evaluationMode: 'READ_ONLY',
        });

        try {
            // Use Sprint 11 Phase 3 risk service (READ-ONLY)
            const riskProfile = await this.riskService.computeUserRiskProfile(userId);

            // Determine approval mode based on risk level
            let approvalMode: ApprovalMode;
            let requiresReviewReason: boolean;

            if (riskProfile.riskLevel === RiskSeverity.LOW) {
                approvalMode = ApprovalMode.AUTO_APPROVE_ELIGIBLE;
                requiresReviewReason = false;
            } else {
                // MEDIUM or HIGH risk requires manual review
                approvalMode = ApprovalMode.MANUAL_REVIEW_REQUIRED;
                requiresReviewReason = true;
            }

            const context: ApprovalContext = {
                riskLevel: riskProfile.riskLevel,
                approvalMode,
                requiresReviewReason,
                riskScore: riskProfile.overallScore,
                activeSignals: riskProfile.activeSignals.map((signal) => ({
                    signalType: signal.signalType,
                    severity: signal.severity,
                    score: signal.score,
                    explanation: signal.explanation,
                })),
                evaluatedAt: new Date().toISOString(),
            };

            const durationMs = Date.now() - startTime;

            this.logger.log({
                event: 'approval_context_evaluated',
                userId,
                riskLevel: context.riskLevel,
                approvalMode: context.approvalMode,
                requiresReviewReason: context.requiresReviewReason,
                riskScore: context.riskScore,
                activeSignalsCount: context.activeSignals.length,
                durationMs,
                sprint: 'SPRINT_12_PHASE_1',
            });

            return context;
        } catch (error) {
            this.logger.error({
                event: 'approval_context_evaluation_failed',
                userId,
                error: error.message,
                sprint: 'SPRINT_12_PHASE_1',
            });

            // Fail-safe: On error, default to manual review
            return {
                riskLevel: RiskSeverity.MEDIUM,
                approvalMode: ApprovalMode.MANUAL_REVIEW_REQUIRED,
                requiresReviewReason: true,
                riskScore: 50,
                activeSignals: [],
                evaluatedAt: new Date().toISOString(),
            };
        }
    }

    /**
     * Validate admin approval request against risk context
     * READ-ONLY validation: Checks if reason is provided when required
     * 
     * SPRINT 12 PHASE 1: Enhanced approval validation
     * - No mutations, only validation logic
     * - Throws exception if validation fails
     */
    validateApprovalRequest(
        approvalContext: ApprovalContext,
        reason: string | undefined,
    ): void {
        if (approvalContext.requiresReviewReason && !reason) {
            this.logger.warn({
                event: 'approval_validation_failed',
                riskLevel: approvalContext.riskLevel,
                approvalMode: approvalContext.approvalMode,
                reasonProvided: false,
                sprint: 'SPRINT_12_PHASE_1',
            });

            throw new Error(
                `Approval reason is required for ${approvalContext.riskLevel} risk withdrawals. Active signals: ${approvalContext.activeSignals.map((s) => s.signalType).join(', ')}`,
            );
        }

        this.logger.log({
            event: 'approval_validation_passed',
            riskLevel: approvalContext.riskLevel,
            approvalMode: approvalContext.approvalMode,
            reasonProvided: !!reason,
            sprint: 'SPRINT_12_PHASE_1',
        });
    }
}
