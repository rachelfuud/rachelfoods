import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    RiskEvent,
    RiskEventType,
    RiskEventSource,
    RiskLevel,
    EventSeverity,
} from './risk-event.types';

/**
 * SPRINT 16 PHASE 1: Risk Event Normalizer
 * 
 * PURPOSE: Convert Sprint 11-15 risk actions into canonical RiskEvent objects
 * 
 * GOLDEN RULES:
 * - Pure functions only (no side effects)
 * - NO database queries
 * - NO event emission (that's the bus's job)
 * - Deterministic eventId generation
 * - Evidence-backed metadata only
 * - NO inference or speculation
 * 
 * PATTERN:
 * - One normalization method per source system
 * - Each method is pure: same input → same RiskEvent
 * - eventId = SHA-256(stable inputs) for idempotency
 * 
 * USE CASES:
 * - Convert policy violations to events
 * - Convert escalations to events
 * - Convert playbook matches to events
 * - Convert admin decisions to events
 */

@Injectable()
export class WithdrawalRiskEventNormalizerService {
    /**
     * Normalize policy limit violation to RiskEvent
     * 
     * Source: Sprint 11 withdrawal policy limits
     * Trigger: User exceeds daily/weekly/monthly limit
     */
    normalizePolicyViolation(input: {
        withdrawalId: string;
        userId: string;
        violatedLimitType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
        requestedAmount: number;
        limitAmount: number;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.LIMIT_VIOLATION_DETECTED,
                occurredAtISO,
                'POLICY_LIMIT',
            ),
            eventType: RiskEventType.LIMIT_VIOLATION_DETECTED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: 'HIGH', // Policy violations are high severity
            source: 'POLICY_LIMIT',
            severity: 'CRITICAL',
            summary: `${input.violatedLimitType} limit exceeded: requested $${input.requestedAmount.toFixed(2)}, limit $${input.limitAmount.toFixed(2)}`,
            metadata: {
                violatedLimitType: input.violatedLimitType,
                requestedAmount: input.requestedAmount,
                limitAmount: input.limitAmount,
                excessAmount: input.requestedAmount - input.limitAmount,
            },
            sprint: 'SPRINT_11_POLICY_LIMITS',
        };
    }

    /**
     * Normalize cooling period application to RiskEvent
     * 
     * Source: Sprint 11 cooling period service
     * Trigger: Cooling period applied after recent withdrawal
     */
    normalizeCoolingPeriodApplied(input: {
        withdrawalId: string;
        userId: string;
        coolingEndTime: Date;
        previousWithdrawalId: string;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.COOLING_APPLIED,
                occurredAtISO,
                'COOLING_PERIOD',
            ),
            eventType: RiskEventType.COOLING_APPLIED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: 'MEDIUM',
            source: 'COOLING_PERIOD',
            severity: 'WARNING',
            summary: `Cooling period applied until ${input.coolingEndTime.toISOString()}`,
            metadata: {
                coolingEndTime: input.coolingEndTime.toISOString(),
                previousWithdrawalId: input.previousWithdrawalId,
            },
            sprint: 'SPRINT_11_COOLING_PERIOD',
        };
    }

    /**
     * Normalize approval gate to RiskEvent
     * 
     * Source: Sprint 12 approval context service
     * Trigger: Withdrawal requires admin approval
     */
    normalizeApprovalGated(input: {
        withdrawalId: string;
        userId: string;
        riskLevel: RiskLevel;
        riskScore?: number;
        gatingReason: string;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.APPROVAL_GATED,
                occurredAtISO,
                'APPROVAL_CONTEXT',
            ),
            eventType: RiskEventType.APPROVAL_GATED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: input.riskLevel,
            riskScore: input.riskScore,
            source: 'APPROVAL_CONTEXT',
            severity: input.riskLevel === 'HIGH' ? 'CRITICAL' : 'WARNING',
            summary: `Approval required: ${input.gatingReason}`,
            metadata: {
                gatingReason: input.gatingReason,
            },
            sprint: 'SPRINT_12_APPROVAL_CONTEXT',
        };
    }

    /**
     * Normalize state transition gate to RiskEvent
     * 
     * Source: Sprint 11 transition guard service
     * Trigger: State transition blocked by guard rules
     */
    normalizeTransitionGated(input: {
        withdrawalId: string;
        userId: string;
        fromStatus: string;
        toStatus: string;
        blockReason: string;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.TRANSITION_GATED,
                occurredAtISO,
                'TRANSITION_GUARD',
            ),
            eventType: RiskEventType.TRANSITION_GATED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: 'MEDIUM',
            source: 'TRANSITION_GUARD',
            severity: 'WARNING',
            summary: `Transition blocked: ${input.fromStatus} → ${input.toStatus} (${input.blockReason})`,
            metadata: {
                fromStatus: input.fromStatus,
                toStatus: input.toStatus,
                blockReason: input.blockReason,
            },
            sprint: 'SPRINT_11_TRANSITION_GUARD',
        };
    }

    /**
     * Normalize risk escalation to RiskEvent
     * 
     * Source: Sprint 13 risk escalation service
     * Trigger: Risk level escalated to MEDIUM or HIGH
     */
    normalizeRiskEscalation(input: {
        withdrawalId: string;
        userId: string;
        escalationSeverity: 'MEDIUM' | 'HIGH';
        riskScore: number;
        riskSignals: string[];
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.RISK_ESCALATED,
                occurredAtISO,
                'RISK_ESCALATION',
            ),
            eventType: RiskEventType.RISK_ESCALATED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: input.escalationSeverity,
            riskScore: input.riskScore,
            source: 'RISK_ESCALATION',
            severity: input.escalationSeverity === 'HIGH' ? 'CRITICAL' : 'WARNING',
            summary: `Risk escalated to ${input.escalationSeverity} (score: ${input.riskScore})`,
            metadata: {
                escalationSeverity: input.escalationSeverity,
                riskSignals: input.riskSignals,
            },
            sprint: 'SPRINT_13_RISK_ESCALATION',
        };
    }

    /**
     * Normalize playbook recommendation to RiskEvent
     * 
     * Source: Sprint 14 Phase 1-2 playbook matching
     * Trigger: Playbook matched and recommended
     */
    normalizePlaybookRecommendation(input: {
        withdrawalId: string;
        userId: string;
        playbookId: string;
        playbookTitle: string;
        matchScore: number;
        riskLevel: RiskLevel;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.PLAYBOOK_RECOMMENDED,
                occurredAtISO,
                'PLAYBOOK',
            ),
            eventType: RiskEventType.PLAYBOOK_RECOMMENDED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: input.riskLevel,
            source: 'PLAYBOOK',
            severity: 'INFO',
            summary: `Playbook recommended: ${input.playbookTitle} (match: ${input.matchScore})`,
            metadata: {
                playbookId: input.playbookId,
                playbookTitle: input.playbookTitle,
                matchScore: input.matchScore,
            },
            sprint: 'SPRINT_14_PHASE_1_PLAYBOOKS',
        };
    }

    /**
     * Normalize admin decision to RiskEvent
     * 
     * Source: Sprint 14 Phase 3 admin decision capture
     * Trigger: Admin makes approve/reject/request-more-info decision
     */
    normalizeAdminDecision(input: {
        withdrawalId: string;
        userId: string;
        adminId: string;
        decision: 'APPROVED' | 'REJECTED' | 'REQUEST_MORE_INFO';
        rationale?: string;
        riskLevel: RiskLevel;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.ADMIN_DECISION_CAPTURED,
                occurredAtISO,
                'ADMIN_DECISION',
            ),
            eventType: RiskEventType.ADMIN_DECISION_CAPTURED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: input.riskLevel,
            source: 'ADMIN_DECISION',
            severity: 'INFO',
            summary: `Admin decision: ${input.decision}${input.rationale ? ` - ${input.rationale}` : ''}`,
            metadata: {
                adminId: input.adminId,
                decision: input.decision,
                rationale: input.rationale,
            },
            sprint: 'SPRINT_14_PHASE_3_DECISION_CAPTURE',
        };
    }

    /**
     * Normalize incident reconstruction to RiskEvent
     * 
     * Source: Sprint 15 Phase 1 incident reconstruction
     * Trigger: Complete incident timeline reconstructed
     */
    normalizeIncidentReconstruction(input: {
        withdrawalId: string;
        userId: string;
        adminId: string;
        timelineEventCount: number;
        riskLevel: RiskLevel;
        occurredAt: Date;
    }): RiskEvent {
        const occurredAtISO = input.occurredAt.toISOString();

        return {
            eventId: this.generateEventId(
                input.withdrawalId,
                RiskEventType.INCIDENT_RECONSTRUCTED,
                occurredAtISO,
                'INCIDENT_RECONSTRUCTION',
            ),
            eventType: RiskEventType.INCIDENT_RECONSTRUCTED,
            occurredAt: occurredAtISO,
            withdrawalId: input.withdrawalId,
            userId: input.userId,
            riskLevel: input.riskLevel,
            source: 'INCIDENT_RECONSTRUCTION',
            severity: 'INFO',
            summary: `Incident reconstructed with ${input.timelineEventCount} timeline events`,
            metadata: {
                adminId: input.adminId,
                timelineEventCount: input.timelineEventCount,
            },
            sprint: 'SPRINT_15_PHASE_1_INCIDENT_RECONSTRUCTION',
        };
    }

    /**
     * Generate deterministic event ID
     * 
     * Algorithm: SHA-256(withdrawalId + eventType + occurredAt + source)
     * 
     * Guarantees:
     * - Same inputs → Same eventId
     * - Idempotent event processing
     * - Collision resistance (2^256)
     */
    private generateEventId(
        withdrawalId: string,
        eventType: RiskEventType,
        occurredAt: string,
        source: RiskEventSource,
    ): string {
        const input = `${withdrawalId}:${eventType}:${occurredAt}:${source}`;
        const hash = createHash('sha256');
        hash.update(input);
        return hash.digest('hex');
    }
}
