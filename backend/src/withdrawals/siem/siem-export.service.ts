/**
 * SPRINT 16 PHASE 4: SIEM Export Service
 * 
 * Purpose: Convert internal objects to flat SIEM records for external consumption
 * 
 * Responsibilities:
 * - Fetch data from Phase 1, 2, 3 services
 * - Convert to flat SiemExportRecord structure
 * - Generate deterministic record IDs (SHA-256)
 * - Support multiple export formats (JSON, NDJSON)
 * 
 * Characteristics:
 * - READ-ONLY: No mutations
 * - Deterministic: Same data → same records
 * - On-demand: No caching, computed per request
 * - Time-windowed: 1h, 6h, 24h aggregation
 * 
 * Pattern:
 * - Pure transformation functions
 * - No persistence
 * - No side effects
 * - Structured logging with SPRINT_16_PHASE_4 marker
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { WithdrawalRiskEventBusService } from '../risk-events/risk-event-bus.service';
import { AdminAlertService } from '../alerts/admin-alert.service';
import { AlertIncidentService } from '../alerts/alert-incident.service';
import {
    SiemExportRecord,
    SiemExportSource,
    SiemExportStats,
} from './siem-export.types';
import { RiskEvent } from '../risk-events/risk-event.types';
import { AdminAlert } from '../alerts/admin-alert.types';
import { AlertIncident } from '../alerts/alert-incident.types';

@Injectable()
export class SiemExportService {
    private readonly logger = new Logger(SiemExportService.name);

    constructor(
        private readonly riskEventBus: WithdrawalRiskEventBusService,
        private readonly adminAlertService: AdminAlertService,
        private readonly alertIncidentService: AlertIncidentService,
    ) { }

    /**
     * Export all records (events + alerts + incidents) for specified time window
     * 
     * @param windowHours - Time window in hours (1, 6, or 24)
     * @returns Array of SIEM export records
     */
    async exportAll(windowHours: number): Promise<SiemExportRecord[]> {
        this.logger.log(`[SPRINT_16_PHASE_4] Exporting all SIEM records (window: ${windowHours}h)`);

        const windowStartTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);

        // Fetch all data (alerts and incidents only - RiskEventBus doesn't store events)
        const alerts = this.adminAlertService.getAllAlerts();
        const incidents = this.alertIncidentService.getAllIncidents();

        // Filter by window
        const windowedAlerts = alerts.filter((a) => new Date(a.createdAt) >= windowStartTime);
        const windowedIncidents = incidents.filter(
            (i) => new Date(i.createdAt) >= windowStartTime,
        );

        // Convert to SIEM records
        const alertRecords = windowedAlerts.map((a) => this.convertAlertToSiem(a));
        const incidentRecords = windowedIncidents.map((i) => this.convertIncidentToSiem(i));

        const allRecords = [...alertRecords, ...incidentRecords];

        // Sort by timestamp (oldest first)
        allRecords.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        this.logExportStats('all', windowHours, allRecords);

        return allRecords;
    }

    /**
     * Export only admin alerts
     */
    async exportAlerts(windowHours: number): Promise<SiemExportRecord[]> {
        this.logger.log(`[SPRINT_16_PHASE_4] Exporting admin alerts (window: ${windowHours}h)`);

        const windowStartTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const alerts = this.adminAlertService.getAllAlerts();
        const windowedAlerts = alerts.filter((a) => new Date(a.createdAt) >= windowStartTime);
        const records = windowedAlerts.map((a) => this.convertAlertToSiem(a));

        records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        this.logExportStats('alerts', windowHours, records);

        return records;
    }

    /**
     * Export only alert incidents
     */
    async exportIncidents(windowHours: number): Promise<SiemExportRecord[]> {
        this.logger.log(`[SPRINT_16_PHASE_4] Exporting alert incidents (window: ${windowHours}h)`);

        const windowStartTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const incidents = this.alertIncidentService.getAllIncidents();
        const windowedIncidents = incidents.filter(
            (i) => new Date(i.createdAt) >= windowStartTime,
        );
        const records = windowedIncidents.map((i) => this.convertIncidentToSiem(i));

        records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        this.logExportStats('incidents', windowHours, records);

        return records;
    }

    /**
     * Convert AdminAlert to SIEM record
     */
    private convertAlertToSiem(alert: AdminAlert): SiemExportRecord {
        const recordId = this.generateRecordId('ALERT', alert.alertId, alert.createdAt);

        return {
            recordId,
            timestamp: alert.createdAt,
            source: 'ALERT',
            severity: alert.severity,
            category: alert.category,
            message: `Admin alert: ${alert.title}`,
            withdrawalId: alert.withdrawalId,
            userId: alert.userId,
            metadata: {
                alertId: alert.alertId,
                title: alert.title,
                description: alert.description,
                relatedEventIds: alert.relatedEventIds,
                riskLevel: alert.riskLevel,
                sources: alert.sources,
            },
            sprint: 'SPRINT_16_PHASE_4',
        };
    }

    /**
     * Convert AlertIncident to SIEM record
     */
    private convertIncidentToSiem(incident: AlertIncident): SiemExportRecord {
        const recordId = this.generateRecordId('INCIDENT', incident.incidentId, incident.createdAt);

        return {
            recordId,
            timestamp: incident.createdAt,
            source: 'INCIDENT',
            severity: incident.severity,
            category: incident.category,
            message: incident.title,
            withdrawalId: incident.withdrawalId,
            userId: incident.userId,
            metadata: {
                incidentId: incident.incidentId,
                status: incident.status,
                title: incident.title,
                summary: incident.summary,
                alertIds: incident.alertIds,
                relatedEventIds: incident.relatedEventIds,
                riskLevel: incident.riskLevel,
                firstSeenAt: incident.firstSeenAt,
                lastSeenAt: incident.lastSeenAt,
                alertCount: incident.alertCount,
                sources: incident.sources,
            },
            sprint: 'SPRINT_16_PHASE_4',
        };
    }

    /**
     * Generate deterministic record ID
     * 
     * @param source - Record source type
     * @param sourceId - Original ID (eventId, alertId, incidentId)
     * @param timestamp - Record timestamp
     * @returns SHA-256 hash
     */
    private generateRecordId(
        source: SiemExportSource,
        sourceId: string,
        timestamp: string,
    ): string {
        const payload = JSON.stringify({ source, sourceId, timestamp });
        return createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Log export statistics
     */
    private logExportStats(
        sourceFilter: string,
        windowHours: number,
        records: SiemExportRecord[],
    ): void {
        const bySource: Record<SiemExportSource, number> = {
            ALERT: 0,
            INCIDENT: 0,
        };

        for (const record of records) {
            bySource[record.source]++;
        }

        const stats: SiemExportStats = {
            exportedAt: new Date().toISOString(),
            source: sourceFilter,
            format: 'json', // Default, controller may override
            windowHours,
            recordCount: records.length,
            bySource,
        };

        this.logger.log(
            `[SPRINT_16_PHASE_4] SIEM export completed (source: ${sourceFilter}, records: ${stats.recordCount}, alerts: ${stats.bySource.ALERT}, incidents: ${stats.bySource.INCIDENT})`,
        );
    }
}
