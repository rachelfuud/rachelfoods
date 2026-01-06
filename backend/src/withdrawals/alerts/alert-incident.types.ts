/**
 * SPRINT 16 – PHASE 3
 * Alert Incident Type Definitions
 *
 * PURPOSE
 * -------
 * Canonical type system for alert incidents - logical groupings of
 * related AdminAlerts (Phase 2) and RiskEvents (Phase 1).
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Deterministic incident IDs (SHA-256 hash)
 * - Immutable incident objects (readonly properties)
 * - Evidence-backed correlation only
 * - Derived status (OPEN/STALE) based on time
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY (incidents are observations, not commands)
 * - Deterministic (same alerts → same incident grouping)
 * - In-memory only (no persistence in Phase 3)
 */

import type { AdminAlert } from './admin-alert.types';

/**
 * AlertIncident
 * -------------
 * Logical grouping of related AdminAlerts that share:
 * - Same withdrawal
 * - Same user + category + time window
 * - Shared RiskEvent IDs
 *
 * Incidents provide situational awareness by answering:
 * "Which alerts belong to the same underlying issue?"
 */
export interface AlertIncident {
    /**
     * Deterministic identifier
     * SHA-256(alertIds sorted + withdrawalId + userId + category + firstSeenAt)
     */
    readonly incidentId: string;

    /**
     * Incident creation timestamp (ISO 8601)
     * Same as firstSeenAt
     */
    readonly createdAt: string;

    /**
     * Incident severity (max of contained alerts)
     * Escalates automatically when higher-severity alert added
     */
    readonly severity: IncidentSeverity;

    /**
     * Incident status (derived, not mutable)
     * - OPEN: Recent alert activity within correlation window
     * - STALE: No new alerts within correlation window
     */
    readonly status: IncidentStatus;

    /**
     * Incident category (primary category from alerts)
     */
    readonly category: IncidentCategory;

    /**
     * Short incident title (derived from alerts)
     * Example: "High-risk withdrawal incident for wdr_abc123"
     */
    readonly title: string;

    /**
     * Factual summary of incident
     * Example: "3 CRITICAL alerts for withdrawal wdr_abc123: limit violation, high-risk escalation, approval gated"
     */
    readonly summary: string;

    /**
     * Alert IDs contained in this incident
     */
    readonly alertIds: string[];

    /**
     * Related RiskEvent IDs (union of alert.relatedEventIds)
     */
    readonly relatedEventIds: string[];

    /**
     * Withdrawal ID if incident is withdrawal-specific
     */
    readonly withdrawalId?: string;

    /**
     * User ID if incident is user-specific
     */
    readonly userId?: string;

    /**
     * Risk level (max across contained alerts)
     */
    readonly riskLevel?: RiskLevel;

    /**
     * Timestamp of first alert in incident
     */
    readonly firstSeenAt: string;

    /**
     * Timestamp of most recent alert in incident
     */
    readonly lastSeenAt: string;

    /**
     * Number of alerts in this incident
     */
    readonly alertCount: number;

    /**
     * Source systems (union of alert sources)
     */
    readonly sources: string[];

    /**
     * Sprint marker for traceability
     */
    readonly sprint: string;
}

/**
 * IncidentSeverity
 * ----------------
 * Same as AlertSeverity for consistency
 */
export type IncidentSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * IncidentStatus
 * --------------
 * Derived status based on alert activity
 */
export type IncidentStatus =
    | 'OPEN'   // Active: new alert within correlation window
    | 'STALE'; // Inactive: no new alerts within correlation window

/**
 * IncidentCategory
 * ----------------
 * Same as AlertCategory for consistency
 */
export type IncidentCategory =
    | 'FRAUD_RISK'
    | 'COMPLIANCE'
    | 'PROCESS_ANOMALY'
    | 'SYSTEM_SIGNAL';

/**
 * RiskLevel
 * ---------
 * Matches AlertIncident.riskLevel
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * CorrelationRule
 * ---------------
 * Defines logic for grouping alerts into incidents.
 *
 * Each rule:
 * - Evaluates if two alerts should be in same incident
 * - Returns correlation key for deterministic grouping
 * - Must be pure and deterministic
 */
export interface CorrelationRule {
    /**
     * Rule identifier
     */
    readonly id: string;

    /**
     * Rule description
     */
    readonly description: string;

    /**
     * Evaluate if alert should correlate with existing incident
     * @param alert - Alert to evaluate
     * @param incident - Existing incident
     * @returns true if alert belongs to incident
     */
    shouldCorrelate(alert: AdminAlert, incident: AlertIncident): boolean;

    /**
     * Generate correlation key for alert grouping
     * Alerts with same key are grouped into same incident.
     * @param alert - Alert to generate key for
     * @returns Correlation key
     */
    getCorrelationKey(alert: AdminAlert): string;
}

/**
 * IncidentQueryFilters
 * --------------------
 * Filters for querying incidents from in-memory registry.
 */
export interface IncidentQueryFilters {
    /**
     * Filter by severity
     */
    severity?: IncidentSeverity;

    /**
     * Filter by status
     */
    status?: IncidentStatus;

    /**
     * Filter by category
     */
    category?: IncidentCategory;

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
 * IncidentQueryResult
 * -------------------
 * Paginated incident query response.
 */
export interface IncidentQueryResult {
    incidents: AlertIncident[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * IncidentWithAlerts
 * ------------------
 * Incident with full alert details included.
 * Used for detailed incident view.
 */
export interface IncidentWithAlerts extends AlertIncident {
    /**
     * Full alert objects (not just IDs)
     */
    alerts: AdminAlert[];
}

/**
 * CorrelationStatistics
 * ---------------------
 * Metrics about correlation engine performance.
 */
export interface CorrelationStatistics {
    /**
     * Total incidents in registry
     */
    totalIncidents: number;

    /**
     * Open incidents
     */
    openIncidents: number;

    /**
     * Stale incidents
     */
    staleIncidents: number;

    /**
     * Average alerts per incident
     */
    avgAlertsPerIncident: number;

    /**
     * Correlation window size (ms)
     */
    correlationWindowMs: number;

    /**
     * Staleness threshold (ms)
     */
    stalenessThresholdMs: number;
}
