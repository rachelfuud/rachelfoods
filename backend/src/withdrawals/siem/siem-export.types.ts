/**
 * SPRINT 16 PHASE 4: SIEM Export Type System
 * 
 * Purpose: Define flat, normalized records for external SIEM ingestion
 * 
 * Supported SIEM Platforms:
 * - Splunk
 * - Elastic Security (SIEM)
 * - Azure Sentinel
 * - Generic JSON consumers
 * 
 * Characteristics:
 * - Flat structure (no nested objects beyond metadata)
 * - Deterministic record IDs (SHA-256)
 * - Common schema across event types
 * - ISO 8601 timestamps
 * 
 * Export Sources:
 * - RiskEvents (Phase 1)
 * - AdminAlerts (Phase 2)
 * - AlertIncidents (Phase 3)
 * 
 * Non-Goals:
 * - No push (pull-only via API)
 * - No webhooks
 * - No streaming subscriptions
 * - No background jobs
 */

/**
 * Source type for SIEM export
 * Note: RiskEventBus doesn't store events (pub/sub only), so only alerts and incidents are exportable
 */
export type SiemExportSource = 'ALERT' | 'INCIDENT';

/**
 * Output format for SIEM export
 */
export type SiemExportFormat = 'json' | 'ndjson';

/**
 * Severity levels (normalized across all sources)
 */
export type SiemSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Flat SIEM export record
 * 
 * Designed for:
 * - Splunk HEC (HTTP Event Collector)
 * - Elastic Bulk API
 * - Azure Sentinel Data Connector
 * - Generic JSON log aggregators
 * 
 * Structure:
 * - Top-level fields: Common attributes (timestamp, severity, etc.)
 * - metadata: Source-specific details (flat key-value pairs)
 */
export interface SiemExportRecord {
    readonly recordId: string;               // SHA-256(source + sourceId + timestamp)
    readonly timestamp: string;              // ISO 8601
    readonly source: SiemExportSource;       // RISK_EVENT | ALERT | INCIDENT
    readonly severity: SiemSeverity;         // INFO | WARNING | CRITICAL
    readonly category: string;               // Source-specific category
    readonly message: string;                // Human-readable summary
    readonly withdrawalId?: string;          // Optional withdrawal reference
    readonly userId?: string;                // Optional user reference
    readonly metadata: Record<string, unknown>; // Source-specific flat data
    readonly sprint: 'SPRINT_16_PHASE_4';
}

/**
 * Query parameters for SIEM export endpoint
 */
export interface SiemExportQuery {
    readonly source?: 'alerts' | 'incidents' | 'all';
    readonly format?: SiemExportFormat;
    readonly windowHours?: 1 | 6 | 24;
}

/**
 * SIEM export statistics (logged, not returned)
 */
export interface SiemExportStats {
    readonly exportedAt: string;
    readonly source: string;
    readonly format: SiemExportFormat;
    readonly windowHours: number;
    readonly recordCount: number;
    readonly bySource: Record<SiemExportSource, number>;
}
