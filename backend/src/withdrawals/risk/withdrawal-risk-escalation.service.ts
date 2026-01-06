import { Injectable, Logger } from '@nestjs/common';
import { WithdrawalRiskService } from './withdrawal-risk.service';
import { RiskSeverity, RiskSignalType } from './dto/withdrawal-risk.dto';

/**
 * SPRINT_13_PHASE_2: Risk Escalation Hooks
 * 
 * Detects risk escalation AFTER withdrawal creation but BEFORE completion.
 * 
 * CRITICAL CONSTRAINTS:
 * - ❌ DO NOT block withdrawals
 * - ❌ DO NOT change states or transitions
 * - ❌ DO NOT introduce new approvals
 * - ✅ READ-ONLY risk evaluation only
 * - ✅ Visibility and auditability only
 * 
 * Escalation Rules:
 * - LOW → MEDIUM or HIGH
 * - MEDIUM → HIGH
 * - Risk score increase ≥ +20
 * - New HIGH-severity signal appears
 */

export interface RiskEscalationDecision {
    escalated: boolean;                      // Has risk escalated?
    fromRiskLevel: RiskSeverity;             // Original risk level
    toRiskLevel: RiskSeverity;               // Current risk level
    deltaScore: number;                      // Change in risk score
    newSignals: RiskSignalType[];            // Newly appeared signals
    escalationReason: string;                // Human-readable explanation
    escalationType: string;                  // Classification of escalation
}

export interface RiskSnapshot {
    riskLevel: RiskSeverity;
    riskScore: number;
    activeSignals: RiskSignalType[];
    snapshotAt: string;
}

@Injectable()
export class WithdrawalRiskEscalationService {
    private readonly logger = new Logger(WithdrawalRiskEscalationService.name);

    constructor(private readonly riskService: WithdrawalRiskService) { }

    /**
     * Check for risk escalation by comparing current risk profile against initial snapshot
     * 
     * CRITICAL: This is READ-ONLY and NEVER blocks withdrawals
     * 
     * @param userId - User ID to evaluate
     * @param initialSnapshot - Risk snapshot at withdrawal creation time
     * @param withdrawalId - Withdrawal ID for logging context
     * @param currentStatus - Current withdrawal status
     * @returns RiskEscalationDecision (informational only)
     */
    async checkEscalation(
        userId: string,
        initialSnapshot: RiskSnapshot,
        withdrawalId: string,
        currentStatus: string,
    ): Promise<RiskEscalationDecision> {
        const startTime = Date.now();

        this.logger.log({
            event: 'escalation_check_started',
            sprint: 'SPRINT_13_PHASE_2',
            withdrawalId,
            userId,
            currentStatus,
            initialRiskLevel: initialSnapshot.riskLevel,
            initialRiskScore: initialSnapshot.riskScore,
        });

        // Re-evaluate current risk profile (READ-ONLY)
        const currentProfile = await this.riskService.computeUserRiskProfile(userId);

        const deltaScore = currentProfile.overallScore - initialSnapshot.riskScore;
        const currentSignals = currentProfile.activeSignals.map((s) => s.signalType);
        const newSignals = currentSignals.filter(
            (signal) => !initialSnapshot.activeSignals.includes(signal),
        );

        // Determine if escalation occurred
        const escalationDecision = this.evaluateEscalation(
            initialSnapshot.riskLevel,
            currentProfile.riskLevel,
            deltaScore,
            currentProfile.activeSignals,
            newSignals,
        );

        const durationMs = Date.now() - startTime;

        // Log escalation check completion
        this.logger.log({
            event: 'escalation_check_completed',
            sprint: 'SPRINT_13_PHASE_2',
            withdrawalId,
            userId,
            currentStatus,
            fromRiskLevel: initialSnapshot.riskLevel,
            toRiskLevel: currentProfile.riskLevel,
            deltaScore,
            newSignalsCount: newSignals.length,
            escalated: escalationDecision.escalated,
            escalationType: escalationDecision.escalationType,
            durationMs,
        });

        // If escalation detected, emit warning/error log based on severity
        if (escalationDecision.escalated) {
            const logLevel = currentProfile.riskLevel === RiskSeverity.HIGH ? 'error' : 'warn';

            this.logger[logLevel]({
                event: 'withdrawal_risk_escalated',
                sprint: 'SPRINT_13_PHASE_2',
                withdrawalId,
                userId,
                currentStatus,
                fromRiskLevel: initialSnapshot.riskLevel,
                toRiskLevel: currentProfile.riskLevel,
                deltaScore,
                newSignals,
                escalationReason: escalationDecision.escalationReason,
                escalationType: escalationDecision.escalationType,
                initialSnapshot: {
                    riskLevel: initialSnapshot.riskLevel,
                    riskScore: initialSnapshot.riskScore,
                    signalsCount: initialSnapshot.activeSignals.length,
                    snapshotAt: initialSnapshot.snapshotAt,
                },
                currentProfile: {
                    riskLevel: currentProfile.riskLevel,
                    riskScore: currentProfile.overallScore,
                    signalsCount: currentSignals.length,
                },
            });
        }

        return {
            ...escalationDecision,
            fromRiskLevel: initialSnapshot.riskLevel,
            toRiskLevel: currentProfile.riskLevel,
            deltaScore,
            newSignals,
        };
    }

    /**
     * Evaluate escalation based on deterministic rules
     * 
     * Escalation Rules:
     * 1. Level escalation: LOW → MEDIUM/HIGH, MEDIUM → HIGH
     * 2. Score delta: Increase ≥ +20
     * 3. New HIGH-severity signals appear
     * 
     * @returns RiskEscalationDecision (informational only, never blocks)
     */
    private evaluateEscalation(
        fromLevel: RiskSeverity,
        toLevel: RiskSeverity,
        deltaScore: number,
        currentSignals: { signalType: RiskSignalType; severity: RiskSeverity }[],
        newSignals: RiskSignalType[],
    ): Pick<RiskEscalationDecision, 'escalated' | 'escalationReason' | 'escalationType'> {
        const escalations: string[] = [];
        let escalationType = 'NO_ESCALATION';

        // Rule 1: Level escalation
        const levelEscalated = this.checkLevelEscalation(fromLevel, toLevel);
        if (levelEscalated) {
            escalations.push(`Risk level escalated from ${fromLevel} to ${toLevel}`);
            escalationType = `LEVEL_ESCALATION_${fromLevel}_TO_${toLevel}`;
        }

        // Rule 2: Significant score increase
        if (deltaScore >= 20) {
            escalations.push(`Risk score increased by ${deltaScore} points (threshold: +20)`);
            if (escalationType === 'NO_ESCALATION') {
                escalationType = 'SCORE_DELTA_ESCALATION';
            } else {
                escalationType = `${escalationType}_AND_SCORE_DELTA`;
            }
        }

        // Rule 3: New HIGH-severity signals
        const newHighSignals = currentSignals.filter(
            (s) => s.severity === RiskSeverity.HIGH && newSignals.includes(s.signalType),
        );

        if (newHighSignals.length > 0) {
            const signalTypes = newHighSignals.map((s) => s.signalType).join(', ');
            escalations.push(`New HIGH-severity signals detected: ${signalTypes}`);
            if (escalationType === 'NO_ESCALATION') {
                escalationType = 'NEW_HIGH_SEVERITY_SIGNAL';
            } else {
                escalationType = `${escalationType}_AND_NEW_HIGH_SIGNAL`;
            }
        }

        const escalated = escalations.length > 0;
        const escalationReason = escalated
            ? escalations.join('. ')
            : 'No escalation detected';

        return {
            escalated,
            escalationReason,
            escalationType,
        };
    }

    /**
     * Check if risk level has escalated according to defined rules
     * 
     * Valid escalations:
     * - LOW → MEDIUM
     * - LOW → HIGH
     * - MEDIUM → HIGH
     * 
     * @returns true if level escalated, false otherwise
     */
    private checkLevelEscalation(fromLevel: RiskSeverity, toLevel: RiskSeverity): boolean {
        // Define escalation paths
        const escalationMatrix: Record<RiskSeverity, RiskSeverity[]> = {
            [RiskSeverity.LOW]: [RiskSeverity.MEDIUM, RiskSeverity.HIGH],
            [RiskSeverity.MEDIUM]: [RiskSeverity.HIGH],
            [RiskSeverity.HIGH]: [], // Already at highest level
        };

        return escalationMatrix[fromLevel]?.includes(toLevel) || false;
    }

    /**
     * Create a risk snapshot from current user profile
     * 
     * Used to capture initial risk state at withdrawal creation time
     * 
     * @param userId - User ID to snapshot
     * @returns RiskSnapshot for future comparison
     */
    async createSnapshot(userId: string): Promise<RiskSnapshot> {
        const profile = await this.riskService.computeUserRiskProfile(userId);

        return {
            riskLevel: profile.riskLevel,
            riskScore: profile.overallScore,
            activeSignals: profile.activeSignals.map((s) => s.signalType),
            snapshotAt: new Date().toISOString(),
        };
    }

    /**
     * Format escalation decision as human-readable message
     * 
     * Used for admin visibility and audit trails
     */
    formatEscalationMessage(decision: RiskEscalationDecision): string {
        if (!decision.escalated) {
            return 'No risk escalation detected';
        }

        const parts = [
            `Risk escalated from ${decision.fromRiskLevel} to ${decision.toRiskLevel}`,
            `(+${decision.deltaScore} points)`,
        ];

        if (decision.newSignals.length > 0) {
            parts.push(`New signals: ${decision.newSignals.join(', ')}`);
        }

        parts.push(`Reason: ${decision.escalationReason}`);

        return parts.join(' | ');
    }
}
