import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WithdrawalRiskVisibilityService } from './withdrawal-risk-visibility.service';
import { WithdrawalStatus } from '@prisma/client';

/**
 * SPRINT_13_PHASE_4: Compliance Export & Forensic Read Mode
 * 
 * Enables compliance-grade exports and forensic review of withdrawal
 * risk escalation data without modifying system behavior.
 * 
 * CRITICAL CONSTRAINTS:
 * - ❌ DO NOT block withdrawals
 * - ❌ DO NOT alter state machines
 * - ❌ DO NOT introduce approvals or controls
 * - ❌ DO NOT mutate or persist new data
 * - ❌ DO NOT add schema changes
 * - ✅ READ-ONLY aggregation and export only
 */

export interface ExportFilters {
    startDate?: Date;
    endDate?: Date;
    severity?: 'MEDIUM' | 'HIGH';
    format: 'csv' | 'json';
    forensic?: boolean;
}

export interface ExportMetadata {
    generatedAt: string;
    generatedByAdminId: string;
    filters: {
        startDate?: string;
        endDate?: string;
        severity?: string;
    };
    sprintVersion: string;
    recordCount: number;
}

export interface EscalationExportRecord {
    withdrawalId: string;
    userId: string;
    requestedAt: string;
    approvedAt: string | null;
    escalationTimestamp: string;
    fromRiskLevel: string;
    toRiskLevel: string;
    deltaScore: number;
    escalationType: string;
    severity: string;
    newSignals: string;
}

@Injectable()
export class WithdrawalRiskExportService {
    private readonly logger = new Logger(WithdrawalRiskExportService.name);
    private readonly MAX_DATE_RANGE_DAYS = 90;
    private readonly MAX_RECORDS = 50000;

    constructor(
        private readonly prisma: PrismaService,
        private readonly visibilityService: WithdrawalRiskVisibilityService,
    ) { }

    /**
     * Generate compliance export of escalation data
     * 
     * READ-ONLY: Generates export file from escalation data
     * Supports CSV and JSON formats with deterministic ordering
     * 
     * @param filters - Export filters (dates, severity, format, forensic mode)
     * @param adminId - Admin user ID for audit logging
     * @returns Export content as string (CSV or JSON)
     */
    async generateExport(filters: ExportFilters, adminId: string): Promise<string> {
        const startTime = Date.now();

        this.logger.log({
            event: 'export_generation_started',
            sprint: 'SPRINT_13_PHASE_4',
            adminId,
            filters: {
                startDate: filters.startDate?.toISOString(),
                endDate: filters.endDate?.toISOString(),
                severity: filters.severity,
                format: filters.format,
                forensic: filters.forensic,
            },
        });

        // Validate date range (max 90 days)
        if (filters.startDate && filters.endDate) {
            const daysDiff = Math.floor(
                (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (daysDiff > this.MAX_DATE_RANGE_DAYS) {
                throw new Error(
                    `Date range exceeds maximum of ${this.MAX_DATE_RANGE_DAYS} days. Requested: ${daysDiff} days.`,
                );
            }
        }

        // Build where clause
        const whereClause: any = {
            status: {
                in: [
                    WithdrawalStatus.APPROVED,
                    WithdrawalStatus.PROCESSING,
                    WithdrawalStatus.COMPLETED,
                ],
            },
        };

        if (filters.startDate || filters.endDate) {
            whereClause.requestedAt = {};
            if (filters.startDate) {
                whereClause.requestedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                whereClause.requestedAt.lte = filters.endDate;
            }
        }

        // Fetch withdrawals (deterministic ordering)
        const withdrawals = await this.prisma.withdrawals.findMany({
            where: whereClause,
            orderBy: { requestedAt: 'asc' }, // Deterministic ordering
            take: this.MAX_RECORDS,
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
                approvedAt: true,
            },
        });

        // Compute escalation summaries
        const summariesPromises = withdrawals.map((w) =>
            this.visibilityService['computeEscalationSummary'](w),
        );
        const summaries = await Promise.all(summariesPromises);

        // Filter by severity if specified
        const filteredSummaries = filters.severity
            ? summaries.filter((s) => s.escalations.some((e) => e.severity === filters.severity))
            : summaries.filter((s) => s.escalations.length > 0); // Only include withdrawals with escalations

        // Flatten to export records
        const exportRecords = this.flattenToExportRecords(filteredSummaries);

        const durationMs = Date.now() - startTime;

        this.logger.log({
            event: 'export_generation_completed',
            sprint: 'SPRINT_13_PHASE_4',
            adminId,
            recordCount: exportRecords.length,
            format: filters.format,
            durationMs,
        });

        // Audit log
        this.logger.log({
            event: 'compliance_export_generated',
            sprint: 'SPRINT_13_PHASE_4',
            adminId,
            filters: {
                startDate: filters.startDate?.toISOString(),
                endDate: filters.endDate?.toISOString(),
                severity: filters.severity,
            },
            format: filters.format,
            recordCount: exportRecords.length,
            forensicMode: filters.forensic || false,
        });

        // Generate export based on format
        if (filters.format === 'csv') {
            return this.generateCsvExport(exportRecords, filters, adminId);
        } else {
            return this.generateJsonExport(exportRecords, filters, adminId);
        }
    }

    /**
     * Flatten escalation summaries to export records
     * 
     * Each escalation event becomes a separate record
     */
    private flattenToExportRecords(summaries: any[]): EscalationExportRecord[] {
        const records: EscalationExportRecord[] = [];

        for (const summary of summaries) {
            for (const escalation of summary.escalations) {
                records.push({
                    withdrawalId: summary.withdrawalId,
                    userId: summary.userId,
                    requestedAt: summary.requestedAt,
                    approvedAt: summary.approvedAt,
                    escalationTimestamp: escalation.timestamp,
                    fromRiskLevel: escalation.fromRiskLevel,
                    toRiskLevel: escalation.toRiskLevel,
                    deltaScore: escalation.deltaScore,
                    escalationType: escalation.escalationType,
                    severity: escalation.severity,
                    newSignals: escalation.newSignals.join(', '),
                });
            }
        }

        // Sort by escalation timestamp (deterministic ordering)
        records.sort((a, b) => a.escalationTimestamp.localeCompare(b.escalationTimestamp));

        return records;
    }

    /**
     * Generate CSV export
     * 
     * CSV format with headers and deterministic field ordering
     */
    private generateCsvExport(
        records: EscalationExportRecord[],
        filters: ExportFilters,
        adminId: string,
    ): string {
        const lines: string[] = [];

        // Forensic mode: Add metadata header
        if (filters.forensic) {
            lines.push('# FORENSIC EXPORT METADATA');
            lines.push(`# Generated At: ${new Date().toISOString()}`);
            lines.push(`# Generated By Admin ID: ${adminId}`);
            lines.push(`# Sprint Version: SPRINT_13_PHASE_4`);
            lines.push(`# Filters: ${JSON.stringify({ startDate: filters.startDate?.toISOString(), endDate: filters.endDate?.toISOString(), severity: filters.severity })}`);
            lines.push(`# Record Count: ${records.length}`);
            lines.push('');
        }

        // CSV header
        lines.push(
            'withdrawalId,userId,requestedAt,approvedAt,escalationTimestamp,fromRiskLevel,toRiskLevel,deltaScore,escalationType,severity,newSignals',
        );

        // CSV rows
        for (const record of records) {
            lines.push(
                [
                    this.escapeCsvField(record.withdrawalId),
                    this.escapeCsvField(record.userId),
                    this.escapeCsvField(record.requestedAt),
                    this.escapeCsvField(record.approvedAt || ''),
                    this.escapeCsvField(record.escalationTimestamp),
                    this.escapeCsvField(record.fromRiskLevel),
                    this.escapeCsvField(record.toRiskLevel),
                    record.deltaScore.toString(),
                    this.escapeCsvField(record.escalationType),
                    this.escapeCsvField(record.severity),
                    this.escapeCsvField(record.newSignals),
                ].join(','),
            );
        }

        return lines.join('\n');
    }

    /**
     * Generate JSON export
     * 
     * JSON format with optional forensic metadata block
     */
    private generateJsonExport(
        records: EscalationExportRecord[],
        filters: ExportFilters,
        adminId: string,
    ): string {
        const exportData: any = {
            records,
        };

        // Forensic mode: Add metadata block
        if (filters.forensic) {
            exportData.metadata = {
                generatedAt: new Date().toISOString(),
                generatedByAdminId: adminId,
                filters: {
                    startDate: filters.startDate?.toISOString(),
                    endDate: filters.endDate?.toISOString(),
                    severity: filters.severity,
                },
                sprintVersion: 'SPRINT_13_PHASE_4',
                recordCount: records.length,
            };
        }

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Escape CSV field to handle commas, quotes, and newlines
     */
    private escapeCsvField(field: string): string {
        if (!field) {
            return '';
        }

        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }

        return field;
    }

    /**
     * Get export filename based on filters
     * 
     * Format: escalations_YYYYMMDD_YYYYMMDD_severity.format
     */
    getExportFilename(filters: ExportFilters): string {
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const startDate = filters.startDate
            ? filters.startDate.toISOString().split('T')[0].replace(/-/g, '')
            : 'all';
        const endDate = filters.endDate
            ? filters.endDate.toISOString().split('T')[0].replace(/-/g, '')
            : 'all';
        const severity = filters.severity ? filters.severity.toLowerCase() : 'all';
        const forensic = filters.forensic ? '_forensic' : '';

        return `escalations_${startDate}_${endDate}_${severity}${forensic}.${filters.format}`;
    }

    /**
     * Validate export filters
     * 
     * Ensures filters meet compliance requirements
     */
    validateExportFilters(filters: ExportFilters): void {
        // Validate format
        if (!['csv', 'json'].includes(filters.format)) {
            throw new Error('Invalid format. Must be csv or json.');
        }

        // Validate severity
        if (filters.severity && !['MEDIUM', 'HIGH'].includes(filters.severity)) {
            throw new Error('Invalid severity. Must be MEDIUM or HIGH.');
        }

        // Validate date range
        if (filters.startDate && filters.endDate) {
            if (filters.startDate > filters.endDate) {
                throw new Error('startDate must be before endDate.');
            }

            const daysDiff = Math.floor(
                (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (daysDiff > this.MAX_DATE_RANGE_DAYS) {
                throw new Error(
                    `Date range exceeds maximum of ${this.MAX_DATE_RANGE_DAYS} days. Requested: ${daysDiff} days.`,
                );
            }
        }
    }
}
