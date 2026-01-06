/**
 * SPRINT 16 – PHASE 2
 * Alert Threshold Configuration
 *
 * PURPOSE
 * -------
 * Static, in-memory threshold definitions for generating AdminAlerts
 * from RiskEvents.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Code-defined (no database, no environment variables)
 * - Deterministic matching logic
 * - Evidence-backed descriptions
 * - No speculation or inference
 *
 * THRESHOLD TYPES
 * ---------------
 * 1. Immediate: Single CRITICAL event triggers CRITICAL alert
 * 2. Frequency: Multiple events within time window
 * 3. Pattern: Specific event combinations (e.g., escalation + limit violation)
 * 4. Contextual: Event properties meet specific criteria
 */

import type { AlertThreshold } from './admin-alert.types';
import type { RiskEvent, RiskEventType } from '../risk-events/risk-event.types';

/**
 * THRESHOLD 1: Immediate Critical Event
 * --------------------------------------
 * Any CRITICAL severity RiskEvent immediately generates CRITICAL alert.
 *
 * Examples:
 * - Policy limit violation (HIGH risk)
 * - Risk escalated to HIGH
 * - Approval gated with HIGH risk
 */
const CRITICAL_EVENT_IMMEDIATE: AlertThreshold = {
    id: 'critical_event_immediate',
    severity: 'CRITICAL',
    category: 'FRAUD_RISK',
    title: 'Critical risk event requires immediate review',

    match(event: RiskEvent, _recentEvents: RiskEvent[]): boolean {
        return event.severity === 'CRITICAL';
    },

    description(event: RiskEvent, _recentEvents: RiskEvent[]): string {
        return `Critical risk event detected: ${event.summary}. Event type: ${event.eventType}, Risk level: ${event.riskLevel || 'N/A'}, Source: ${event.source}.`;
    },
};

/**
 * THRESHOLD 2: High-Risk Withdrawal Escalation
 * ---------------------------------------------
 * RISK_ESCALATED event with HIGH risk level triggers CRITICAL alert.
 *
 * Pattern: Risk scoring system escalated withdrawal to HIGH.
 */
const HIGH_RISK_ESCALATION: AlertThreshold = {
    id: 'high_risk_escalation',
    severity: 'CRITICAL',
    category: 'FRAUD_RISK',
    title: 'High-risk withdrawal requires urgent review',

    match(event: RiskEvent, _recentEvents: RiskEvent[]): boolean {
        return (
            event.eventType === 'RISK_ESCALATED' &&
            event.riskLevel === 'HIGH'
        );
    },

    description(event: RiskEvent, _recentEvents: RiskEvent[]): string {
        const riskScore = event.riskScore ? ` (score: ${event.riskScore})` : '';
        const signals = event.metadata?.riskSignals
            ? ` Signals: ${(event.metadata.riskSignals as string[]).join(', ')}`
            : '';
        return `Withdrawal ${event.withdrawalId} escalated to HIGH risk${riskScore}.${signals}`;
    },
};

/**
 * THRESHOLD 3: Policy Limit Violation
 * ------------------------------------
 * LIMIT_VIOLATION_DETECTED event triggers CRITICAL alert.
 *
 * Pattern: User exceeded daily/weekly/monthly withdrawal limit.
 */
const POLICY_LIMIT_VIOLATION: AlertThreshold = {
    id: 'policy_limit_violation',
    severity: 'CRITICAL',
    category: 'COMPLIANCE',
    title: 'Withdrawal policy limit violated',

    match(event: RiskEvent, _recentEvents: RiskEvent[]): boolean {
        return event.eventType === 'LIMIT_VIOLATION_DETECTED';
    },

    description(event: RiskEvent, _recentEvents: RiskEvent[]): string {
        const limitType = event.metadata?.violatedLimitType || 'Unknown';
        const requested = event.metadata?.requestedAmount || 'N/A';
        const limit = event.metadata?.limitAmount || 'N/A';
        return `User ${event.userId} exceeded ${limitType} limit. Requested: ${requested}, Limit: ${limit}. Withdrawal: ${event.withdrawalId}.`;
    },
};

/**
 * THRESHOLD 4: Multiple Warning Events in Time Window
 * ----------------------------------------------------
 * 3+ WARNING severity events for same withdrawal within 1 hour triggers WARNING alert.
 *
 * Pattern: Accumulation of moderate risk signals (velocity, cooling, etc.)
 */
const MULTIPLE_WARNINGS_SAME_WITHDRAWAL: AlertThreshold = {
    id: 'multiple_warnings_same_withdrawal',
    severity: 'WARNING',
    category: 'FRAUD_RISK',
    title: 'Multiple risk signals detected for withdrawal',

    match(event: RiskEvent, recentEvents: RiskEvent[]): boolean {
        if (event.severity !== 'WARNING') {
            return false;
        }

        if (!event.withdrawalId) {
            return false;
        }

        // Count WARNING events for same withdrawal in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const warningCount = recentEvents.filter(
            (e) =>
                e.withdrawalId === event.withdrawalId &&
                e.severity === 'WARNING' &&
                e.occurredAt >= oneHourAgo,
        ).length;

        // Including current event
        return warningCount + 1 >= 3;
    },

    description(event: RiskEvent, recentEvents: RiskEvent[]): string {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const relatedEvents = recentEvents.filter(
            (e) =>
                e.withdrawalId === event.withdrawalId &&
                e.severity === 'WARNING' &&
                e.occurredAt >= oneHourAgo,
        );

        const eventTypes = [
            ...new Set([event.eventType, ...relatedEvents.map((e) => e.eventType)]),
        ];

        return `Withdrawal ${event.withdrawalId} triggered ${relatedEvents.length + 1} warning events in last hour. Event types: ${eventTypes.join(', ')}.`;
    },
};

/**
 * THRESHOLD 5: Approval Gated with High Risk
 * -------------------------------------------
 * APPROVAL_GATED event with HIGH risk level triggers CRITICAL alert.
 *
 * Pattern: Withdrawal blocked pending admin approval due to high risk.
 */
const APPROVAL_GATED_HIGH_RISK: AlertThreshold = {
    id: 'approval_gated_high_risk',
    severity: 'CRITICAL',
    category: 'FRAUD_RISK',
    title: 'High-risk withdrawal gated for approval',

    match(event: RiskEvent, _recentEvents: RiskEvent[]): boolean {
        return (
            event.eventType === 'APPROVAL_GATED' &&
            event.riskLevel === 'HIGH'
        );
    },

    description(event: RiskEvent, _recentEvents: RiskEvent[]): string {
        const reason = event.metadata?.gatingReason || 'High risk score';
        const score = event.riskScore ? ` (score: ${event.riskScore})` : '';
        return `Withdrawal ${event.withdrawalId} gated for approval${score}. Reason: ${reason}.`;
    },
};

/**
 * THRESHOLD 6: Cooling Period Applied
 * ------------------------------------
 * COOLING_APPLIED event triggers WARNING alert.
 *
 * Pattern: User subject to cooling period after recent withdrawal.
 */
const COOLING_PERIOD_APPLIED: AlertThreshold = {
    id: 'cooling_period_applied',
    severity: 'WARNING',
    category: 'PROCESS_ANOMALY',
    title: 'Cooling period applied to user',

    match(event: RiskEvent, _recentEvents: RiskEvent[]): boolean {
        return event.eventType === 'COOLING_APPLIED';
    },

    description(event: RiskEvent, _recentEvents: RiskEvent[]): string {
        const endTime = event.metadata?.coolingEndTime
            ? ` until ${event.metadata.coolingEndTime}`
            : '';
        const previousWdr = event.metadata?.previousWithdrawalId
            ? ` (previous: ${event.metadata.previousWithdrawalId})`
            : '';
        return `User ${event.userId} subject to cooling period${endTime}${previousWdr}.`;
    },
};

/**
 * THRESHOLD 7: Playbook Recommended for High Risk
 * ------------------------------------------------
 * PLAYBOOK_RECOMMENDED event with HIGH risk triggers WARNING alert.
 *
 * Pattern: Risk playbook matched for high-risk withdrawal.
 */
const PLAYBOOK_RECOMMENDED_HIGH_RISK: AlertThreshold = {
    id: 'playbook_recommended_high_risk',
    severity: 'WARNING',
    category: 'FRAUD_RISK',
    title: 'Risk playbook recommended for review',

    match(event: RiskEvent, _recentEvents: RiskEvent[]): boolean {
        return (
            event.eventType === 'PLAYBOOK_RECOMMENDED' &&
            event.riskLevel === 'HIGH'
        );
    },

    description(event: RiskEvent, _recentEvents: RiskEvent[]): string {
        const title = event.metadata?.playbookTitle || 'Unknown playbook';
        const matchScore = event.metadata?.matchScore
            ? ` (match: ${(event.metadata.matchScore as number) * 100}%)`
            : '';
        return `Playbook "${title}" recommended for withdrawal ${event.withdrawalId}${matchScore}.`;
    },
};

/**
 * THRESHOLD 8: User High-Risk Pattern
 * ------------------------------------
 * Same user triggers 2+ HIGH risk events within 24 hours triggers CRITICAL alert.
 *
 * Pattern: User exhibits persistent high-risk behavior.
 */
const USER_HIGH_RISK_PATTERN: AlertThreshold = {
    id: 'user_high_risk_pattern',
    severity: 'CRITICAL',
    category: 'FRAUD_RISK',
    title: 'User exhibits persistent high-risk behavior',

    match(event: RiskEvent, recentEvents: RiskEvent[]): boolean {
        if (event.riskLevel !== 'HIGH') {
            return false;
        }

        if (!event.userId) {
            return false;
        }

        // Count HIGH risk events for same user in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const highRiskCount = recentEvents.filter(
            (e) =>
                e.userId === event.userId &&
                e.riskLevel === 'HIGH' &&
                e.occurredAt >= twentyFourHoursAgo,
        ).length;

        // Including current event
        return highRiskCount + 1 >= 2;
    },

    description(event: RiskEvent, recentEvents: RiskEvent[]): string {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const relatedEvents = recentEvents.filter(
            (e) =>
                e.userId === event.userId &&
                e.riskLevel === 'HIGH' &&
                e.occurredAt >= twentyFourHoursAgo,
        );

        const withdrawalIds = [
            ...new Set([
                event.withdrawalId,
                ...relatedEvents.map((e) => e.withdrawalId).filter(Boolean),
            ]),
        ].filter(Boolean);

        return `User ${event.userId} triggered ${relatedEvents.length + 1} high-risk events in last 24 hours. Withdrawals: ${withdrawalIds.join(', ')}.`;
    },
};

/**
 * ALERT_THRESHOLDS
 * ----------------
 * Master list of all alert thresholds evaluated by the alert engine.
 *
 * Thresholds are evaluated in order. First match wins.
 * Order by severity: CRITICAL thresholds first, then WARNING, then INFO.
 */
export const ALERT_THRESHOLDS: AlertThreshold[] = [
    // CRITICAL thresholds (highest priority)
    CRITICAL_EVENT_IMMEDIATE,
    HIGH_RISK_ESCALATION,
    POLICY_LIMIT_VIOLATION,
    APPROVAL_GATED_HIGH_RISK,
    USER_HIGH_RISK_PATTERN,

    // WARNING thresholds
    MULTIPLE_WARNINGS_SAME_WITHDRAWAL,
    COOLING_PERIOD_APPLIED,
    PLAYBOOK_RECOMMENDED_HIGH_RISK,
];
