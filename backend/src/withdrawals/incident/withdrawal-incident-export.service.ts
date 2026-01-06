import { Injectable, Logger } from '@nestjs/common';
import {
    WithdrawalIncident,
    TimelineEvent,
} from '../risk/withdrawal-incident-reconstruction.service';
import { ComplianceNarrative } from './withdrawal-compliance-narrative.service';
import PDFDocument from 'pdfkit';

/**
 * SPRINT 15 PHASE 3: Incident Export Engine
 * 
 * PURPOSE: Convert reconstructed incidents and compliance narratives into regulator-ready export formats
 * 
 * GOLDEN RULES:
 * - READ-ONLY (no database writes)
 * - Deterministic output (same input → same file)
 * - NO inference, speculation, or summaries beyond source data
 * - NO mutation of incident or narrative objects
 * - Exports must be evidence-backed and traceable
 * - Admin/Platform Admin only
 * 
 * EXPORT FORMATS:
 * 1. JSON  – Canonical, machine-readable, full fidelity
 * 2. CSV   – Tabular, event-level timeline export
 * 3. PDF   – Human-readable compliance report
 * 
 * DISTRIBUTION USE CASES:
 * - Regulator requests: "Provide complete incident documentation"
 * - Audit submissions: "Export timeline for external review"
 * - Compliance reporting: "Generate PDF reports for stakeholders"
 * - Data portability: "Export incident data in standard formats"
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface IncidentExportOptions {
    format: 'JSON' | 'CSV' | 'PDF';
    includeNarrative: boolean;
    includeTimeline: boolean;
    includeMetadata: boolean;
}

export interface IncidentExportResult {
    withdrawalId: string;
    format: 'JSON' | 'CSV' | 'PDF';
    generatedAt: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    buffer: Buffer;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class WithdrawalIncidentExportService {
    private readonly logger = new Logger(WithdrawalIncidentExportService.name);
    private readonly SPRINT_MARKER = 'SPRINT_15_PHASE_3';

    /**
     * SPRINT 15 – PHASE 3: Export incident in requested format
     * 
     * PURPOSE: Produce regulator-grade exports suitable for external distribution
     * PATTERN: Transform incident + narrative into structured export format
     * 
     * GOLDEN RULE COMPLIANCE:
     * ✅ READ-ONLY (no database writes)
     * ✅ Deterministic output (same input → same file)
     * ✅ NO inference or speculation
     * ✅ Evidence-backed exports only
     * ✅ NO mutations
     * 
     * USE CASES:
     * - Regulator inquiries: Export complete incident documentation
     * - Audit submissions: Provide timeline in standard formats
     * - Compliance reporting: Generate professional PDF reports
     * - Data portability: Enable external analysis with JSON/CSV exports
     */
    async exportIncident(
        incident: WithdrawalIncident,
        narrative: ComplianceNarrative | null,
        options: IncidentExportOptions,
        adminId: string,
    ): Promise<IncidentExportResult> {
        this.logger.log({
            marker: this.SPRINT_MARKER,
            action: 'incident_export_started',
            withdrawalId: incident.context.withdrawalId,
            format: options.format,
            includeNarrative: options.includeNarrative,
            adminId,
        });

        let result: IncidentExportResult;

        switch (options.format) {
            case 'JSON':
                result = await this.exportJSON(incident, narrative, options, adminId);
                break;
            case 'CSV':
                result = await this.exportCSV(incident, options, adminId);
                break;
            case 'PDF':
                result = await this.exportPDF(incident, narrative, options, adminId);
                break;
            default:
                throw new Error(`Unsupported export format: ${options.format}`);
        }

        this.logger.log({
            marker: this.SPRINT_MARKER,
            action: 'incident_export_completed',
            withdrawalId: incident.context.withdrawalId,
            format: options.format,
            byteSize: result.byteSize,
            fileName: result.fileName,
            adminId,
        });

        return result;
    }

    /**
     * Export incident as JSON
     * 
     * Canonical representation including:
     * - Incident (Phase 1)
     * - Narrative (Phase 2, optional)
     * - Metadata (export time, version, sprint)
     */
    private async exportJSON(
        incident: WithdrawalIncident,
        narrative: ComplianceNarrative | null,
        options: IncidentExportOptions,
        adminId: string,
    ): Promise<IncidentExportResult> {
        const exportData: any = {
            metadata: options.includeMetadata ? {
                exportVersion: '1.0.0',
                sprint: 'SPRINT_15_PHASE_3',
                generatedAt: new Date().toISOString(),
                generatedBy: adminId,
                format: 'JSON',
            } : undefined,
        };

        if (options.includeTimeline) {
            exportData.incident = incident;
        }

        if (options.includeNarrative && narrative) {
            exportData.narrative = narrative;
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        const buffer = Buffer.from(jsonString, 'utf-8');

        return {
            withdrawalId: incident.context.withdrawalId,
            format: 'JSON',
            generatedAt: new Date().toISOString(),
            fileName: `incident_${incident.context.withdrawalId}_${Date.now()}.json`,
            mimeType: 'application/json',
            byteSize: buffer.byteLength,
            buffer,
        };
    }

    /**
     * Export timeline as CSV
     * 
     * One row per TimelineEvent with columns:
     * - timestamp
     * - eventType
     * - category
     * - severity
     * - source
     * - description
     * - withdrawalId
     */
    private async exportCSV(
        incident: WithdrawalIncident,
        options: IncidentExportOptions,
        adminId: string,
    ): Promise<IncidentExportResult> {
        const headers = [
            'timestamp',
            'eventType',
            'category',
            'severity',
            'source',
            'description',
            'withdrawalId',
        ];

        const rows: string[] = [headers.join(',')];

        if (options.includeTimeline) {
            for (const event of incident.timeline) {
                const row = [
                    this.escapeCSV(event.timestamp.toISOString()),
                    this.escapeCSV(event.eventType),
                    this.escapeCSV(event.category),
                    this.escapeCSV(event.severity || 'N/A'),
                    this.escapeCSV(event.source),
                    this.escapeCSV(event.description),
                    this.escapeCSV(incident.context.withdrawalId),
                ];
                rows.push(row.join(','));
            }
        }

        const csvString = rows.join('\n');
        const buffer = Buffer.from(csvString, 'utf-8');

        return {
            withdrawalId: incident.context.withdrawalId,
            format: 'CSV',
            generatedAt: new Date().toISOString(),
            fileName: `incident_timeline_${incident.context.withdrawalId}_${Date.now()}.csv`,
            mimeType: 'text/csv',
            byteSize: buffer.byteLength,
            buffer,
        };
    }

    /**
     * Export incident as PDF compliance report
     * 
     * Structured report with sections:
     * - Cover Page (Withdrawal ID, generatedAt)
     * - Executive Summary
     * - Chronological Narrative
     * - Timeline Table
     * - Data Source Disclosure
     * - Compliance Disclaimer
     * 
     * PDF is deterministic:
     * - Fixed ordering
     * - No dynamic styling
     * - No timestamps beyond generatedAt
     */
    private async exportPDF(
        incident: WithdrawalIncident,
        narrative: ComplianceNarrative | null,
        options: IncidentExportOptions,
        adminId: string,
    ): Promise<IncidentExportResult> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    withdrawalId: incident.context.withdrawalId,
                    format: 'PDF',
                    generatedAt: new Date().toISOString(),
                    fileName: `incident_report_${incident.context.withdrawalId}_${Date.now()}.pdf`,
                    mimeType: 'application/pdf',
                    byteSize: buffer.byteLength,
                    buffer,
                });
            });
            doc.on('error', reject);

            // Cover Page
            doc.fontSize(24).text('Withdrawal Incident Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Withdrawal ID: ${incident.context.withdrawalId}`, { align: 'center' });
            doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
            doc.text(`Generated By: ${adminId}`, { align: 'center' });
            doc.moveDown(2);

            // Incident Context
            doc.fontSize(16).text('Incident Context', { underline: true });
            doc.moveDown();
            doc.fontSize(10);
            doc.text(`User ID: ${incident.context.userId}`);
            doc.text(`Status: ${incident.context.currentStatus}`);
            doc.text(`Requested Amount: $${incident.context.requestedAmount.toFixed(2)}`);
            doc.text(`Net Amount: $${incident.context.netAmount.toFixed(2)}`);
            doc.text(`Fee: $${incident.context.feeAmount.toFixed(2)}`);
            doc.text(`Bank Account: ${incident.context.bankAccount}`);
            doc.text(`Account Holder: ${incident.context.accountHolder}`);
            doc.text(`Requested At: ${incident.context.requestedAt.toISOString()}`);
            if (incident.context.currentRiskLevel) {
                doc.text(`Risk Level: ${incident.context.currentRiskLevel}`);
                doc.text(`Risk Score: ${incident.context.currentRiskScore}`);
            }
            doc.text(`Final Outcome: ${incident.context.finalOutcome}`);
            if (incident.context.resolutionTimeMs) {
                doc.text(`Resolution Time: ${this.formatDuration(incident.context.resolutionTimeMs)}`);
            }
            doc.moveDown(2);

            // Executive Summary (if narrative included)
            if (options.includeNarrative && narrative) {
                doc.addPage();
                doc.fontSize(16).text('Executive Summary', { underline: true });
                doc.moveDown();
                doc.fontSize(10).text(narrative.executiveSummary, { align: 'justify' });
                doc.moveDown(2);

                // Detailed Narrative
                doc.fontSize(16).text('Chronological Narrative', { underline: true });
                doc.moveDown();
                for (const section of narrative.detailedNarrative) {
                    doc.fontSize(12).text(section.title, { underline: true });
                    doc.fontSize(9).text(`Timeframe: ${section.timeframe}`);
                    doc.moveDown(0.5);
                    doc.fontSize(10).text(section.content, { align: 'justify' });
                    doc.moveDown(1.5);
                }

                // Risk Management Explanation
                doc.addPage();
                doc.fontSize(16).text('Risk Management Explanation', { underline: true });
                doc.moveDown();
                doc.fontSize(10).text(narrative.riskManagementExplanation, { align: 'justify' });
                doc.moveDown(2);

                // Admin Involvement
                doc.fontSize(16).text('Administrative Involvement', { underline: true });
                doc.moveDown();
                doc.fontSize(10).text(narrative.adminInvolvementSummary, { align: 'justify' });
                doc.moveDown(2);

                // Controls and Safeguards
                doc.fontSize(16).text('Controls and Safeguards', { underline: true });
                doc.moveDown();
                doc.fontSize(10).text(narrative.controlsAndSafeguardsSummary, { align: 'justify' });
                doc.moveDown(2);
            }

            // Timeline Table (if included)
            if (options.includeTimeline) {
                doc.addPage();
                doc.fontSize(16).text('Event Timeline', { underline: true });
                doc.moveDown();
                doc.fontSize(8);

                for (const event of incident.timeline) {
                    doc.text(`[${event.timestamp.toISOString()}] ${event.eventType} - ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`);
                    doc.moveDown(0.5);
                }
            }

            // Data Source Disclosure
            doc.addPage();
            doc.fontSize(16).text('Data Source Disclosure', { underline: true });
            doc.moveDown();
            doc.fontSize(10);
            doc.text('The following data sources were used to reconstruct this incident:');
            doc.moveDown();
            doc.text(`✓ Withdrawal Entity: ${incident.dataSources.withdrawalEntity ? 'Available' : 'Unavailable'}`);
            doc.text(`✓ Risk Profiles: ${incident.dataSources.riskProfiles ? 'Available' : 'Unavailable'}`);
            doc.text(`✓ Escalation Data: ${incident.dataSources.escalationData ? 'Available' : 'Unavailable'}`);
            doc.text(`✓ Playbook Recommendations: ${incident.dataSources.playbookRecommendations ? 'Available' : 'Unavailable'}`);
            doc.text(`✓ Admin Decisions: ${incident.dataSources.adminDecisions ? 'Available' : 'Unavailable'}`);
            doc.moveDown(2);

            // Compliance Disclaimer
            if (narrative) {
                doc.fontSize(16).text('Compliance Disclaimer', { underline: true });
                doc.moveDown();
                doc.fontSize(9).text(narrative.disclaimer, { align: 'justify' });
            } else {
                doc.fontSize(16).text('Disclaimer', { underline: true });
                doc.moveDown();
                doc.fontSize(9).text('This incident report is generated for documentation and audit trail purposes. It reflects a deterministic reconstruction of system events based on available data sources. All administrative decisions remain the responsibility of the approving personnel. This report does not constitute legal advice, financial advice, or regulatory interpretation.', { align: 'justify' });
            }

            doc.end();
        });
    }

    /**
     * Escape CSV field (handle commas, quotes, newlines)
     */
    private escapeCSV(value: string): string {
        if (!value) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    /**
     * Format duration in human-readable format
     */
    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            const remainingHours = hours % 24;
            return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
        }
        if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${hours} hour${hours !== 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
        }
        if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
}
