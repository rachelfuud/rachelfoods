/**
 * SPRINT 16 – PHASE 2
 * Admin Alert Type Definitions
 *
 * PURPOSE
 * -------
 * Canonical type system for admin alerts generated from RiskEvents.
 * Alerts are OBSERVATIONAL and ADVISORY - they do not enforce or block.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Deterministic alert IDs (SHA-256 hash)
 * - Immutable alert objects (readonly properties)
 * - Evidence-backed only (no speculation)
 * - Traceable to source RiskEvents
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY (alerts are observations, not commands)
 * - Deterministic (same events → same alert)
 * - In-memory only (no persistence in Phase 2)
 */

import type { RiskEvent } from '../risk-events/risk-event.types';

/**
 * AdminAlert
 * ----------
 * Canonical alert model for notifying admins of risk conditions.
 *
 * Each alert is:
 * - Generated from one or more RiskEvents
 * - Deterministically identified by SHA-256 hash
 * - Tagged with severity, category, and related entities
 * - Immutable once created
 */
export interface AdminAlert {
    /**
     * Deterministic identifier
     * SHA-256(createdAt + severity + category + relatedEventIds + withdrawalId + userId)
     */
    readonly alertId: string;

    /**
     * Alert creation timestamp (ISO 8601)
     */
    readonly createdAt: string;

    /**
     * Alert severity level
     * - INFO: Routine information, no action required
     * - WARNING: Elevated risk, review recommended
     * - CRITICAL: High risk, immediate review required
     */
    readonly severity: AlertSeverity;

    /**
     * Alert category for classification
     */
    readonly category: AlertCategory;

    /**
     * Short, actionable summary (max 100 chars)
     * Example: "High-risk withdrawal requires review"
     */
    readonly title: string;

    /**
     * Detailed, factual description (no speculation)
     * Example: "Withdrawal wdr_abc123 escalated to HIGH risk (score: 87.3) with 3 risk signals"
     */
    readonly description: string;

    /**
     * Related RiskEvent IDs that triggered this alert
     */
    readonly relatedEventIds: string[];

    /**
     * Withdrawal ID if alert is withdrawal-specific
     */
    readonly withdrawalId?: string;

    /**
     * User ID if alert is user-specific
     */
    readonly userId?: string;

    /**
     * Risk level at time of alert generation
     */
    readonly riskLevel?: RiskLevel;

    /**
     * Source systems that contributed to this alert
     * Example: ['RISK_ESCALATION', 'POLICY_LIMIT']
     */
    readonly sources: string[];

    /**
     * Sprint marker for traceability
     */
    readonly sprint: string;
}

/**
 * AlertSeverity
 * -------------
 * Three-tier severity model for alert prioritization.
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * AlertCategory
 * -------------
 * Alert classification for filtering and routing.
 */
export type AlertCategory =
    | 'FRAUD_RISK'         // Potential fraud indicators
    | 'COMPLIANCE'         // Regulatory or policy violations
    | 'PROCESS_ANOMALY'    // Unexpected system behavior
    | 'SYSTEM_SIGNAL';     // Internal system events

/**
 * RiskLevel
 * ---------
 * Matches RiskEvent.riskLevel for consistency.
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * AlertThreshold
 * --------------
 * Defines conditions for generating alerts from RiskEvents.
 *
 * Each threshold:
 * - Has unique ID for identification
 * - Specifies target severity
 * - Implements match() to evaluate RiskEvents
 * - Generates human-readable title and description
 */
export interface AlertThreshold {
    /**
     * Unique threshold identifier
     * Example: "critical_event_immediate"
     */
    readonly id: string;

    /**
     * Target alert severity when threshold matches
     */
    readonly severity: AlertSeverity;

    /**
     * Category for generated alert
     */
    readonly category: AlertCategory;

    /**
     * Evaluate if threshold conditions are met
     * @param event - Current RiskEvent being evaluated
     * @param recentEvents - Recent RiskEvents in sliding window (e.g., last 24h)
     * @returns true if threshold matched, false otherwise
     */
    match(event: RiskEvent, recentEvents: RiskEvent[]): boolean;

    /**
     * Generate alert title when threshold matches
     */
    readonly title: string;

    /**
     * Generate alert description when threshold matches
     * @param event - Current RiskEvent
     * @param recentEvents - Recent RiskEvents
     * @returns Factual description with evidence
     */
    description(event: RiskEvent, recentEvents: RiskEvent[]): string;
}

/**
 * AlertQueryFilters
 * -----------------
 * Filters for querying alerts from in-memory registry.
 */
export interface AlertQueryFilters {
    /**
     * Filter by severity
     */
    severity?: AlertSeverity;

    /**
     * Filter by category
     */
    category?: AlertCategory;

    /**
     * Filter by withdrawal ID
     */
    withdrawalId?: string;

    /**
     * Filter by user ID
     */
    userId?: string;

    /**
     * Filter by time range (ISO 8601)
     */
    startTime?: string;
    endTime?: string;

    /**
     * Pagination
     */
    limit?: number;
    offset?: number;
}

/**
 * AlertQueryResult
 * ----------------
 * Paginated alert query response.
 */
export interface AlertQueryResult {
    alerts: AdminAlert[];
    total: number;
    limit: number;
    offset: number;
}
