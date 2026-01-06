/**
 * SPRINT 16 PHASE 4: Dashboard Metrics & SIEM Export
 * 
 * Dashboard Metrics Type System
 * 
 * Purpose: Provide READ-ONLY aggregation of operational intelligence across:
 * - RiskEvents (Phase 1)
 * - AdminAlerts (Phase 2)
 * - AlertIncidents (Phase 3)
 * 
 * Characteristics:
 * - READ-ONLY: No state mutations
 * - Deterministic: Same data → same metrics
 * - In-memory: No persistence
 * - Aggregation windows: 1h, 6h, 24h
 * 
 * Non-Goals:
 * - No caching (recomputed per request)
 * - No background jobs
 * - No push notifications
 * - No persistence
 */

/**
 * Aggregation time windows for dashboard metrics
 */
export type AggregationWindow = 1 | 6 | 24;

/**
 * Risk event summary statistics
 */
export interface EventMetrics {
    readonly total: number;
    readonly byType: Record<string, number>;
    readonly bySeverity: Record<string, number>;
}

/**
 * Admin alert summary statistics
 */
export interface AlertMetrics {
    readonly total: number;
    readonly bySeverity: Record<string, number>;
    readonly byCategory: Record<string, number>;
    readonly activeLastHour: number;
}

/**
 * Alert incident summary statistics
 */
export interface IncidentMetrics {
    readonly total: number;
    readonly open: number;
    readonly stale: number;
    readonly byCategory: Record<string, number>;
    readonly bySeverity: Record<string, number>;
}

/**
 * Top risk user summary
 */
export interface TopRiskUser {
    readonly userId: string;
    readonly alertCount: number;
    readonly incidentCount: number;
    readonly highestSeverity: 'INFO' | 'WARNING' | 'CRITICAL';
}

/**
 * Complete dashboard metrics snapshot
 * 
 * Generated on-demand, not cached
 * Aggregates data within specified time window
 */
export interface DashboardMetrics {
    readonly generatedAt: string;     // ISO 8601 timestamp
    readonly windowHours: number;     // 1, 6, or 24
    readonly events: EventMetrics;
    readonly alerts: AlertMetrics;
    readonly incidents: IncidentMetrics;
    readonly topRiskUsers: readonly TopRiskUser[];
    readonly sprint: 'SPRINT_16_PHASE_4';
}

/**
 * Query parameters for dashboard metrics endpoint
 */
export interface DashboardMetricsQuery {
    readonly windowHours?: AggregationWindow;
}
