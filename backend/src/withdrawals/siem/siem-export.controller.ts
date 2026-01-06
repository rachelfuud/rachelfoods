/**
 * SPRINT 16 PHASE 4: SIEM Export Controller
 * 
 * Purpose: Expose SIEM-ready records for external security platforms
 * 
 * Endpoint:
 * - GET /api/admin/siem-export
 * 
 * RBAC:
 * - Requires: PLATFORM_ADMIN only (stricter than dashboard)
 * 
 * Characteristics:
 * - READ-ONLY: No mutations
 * - Streaming: Efficient for large datasets
 * - Time-windowed: 1h, 6h, 24h
 * - Deterministic: Same data → same records
 * - Multiple formats: JSON, NDJSON
 * 
 * Supported SIEM Platforms:
 * - Splunk (via HEC or file ingestion)
 * - Elastic Security
 * - Azure Sentinel
 * - Generic JSON consumers
 * 
 * Non-Goals:
 * - No push (pull-only)
 * - No webhooks
 * - No streaming subscriptions
 * - No pagination (bounded by window)
 */

import {
    Controller,
    Get,
    Query,
    UseGuards,
    Logger,
    BadRequestException,
    StreamableFile,
    Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Readable } from 'stream';
import { SiemExportService } from './siem-export.service';
import { SiemExportFormat } from './siem-export.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';

@ApiTags('Admin - SIEM Export')
@Controller('api/admin/siem-export')
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN') // STRICTER: Only PLATFORM_ADMIN (not ADMIN)
export class SiemExportController {
    private readonly logger = new Logger(SiemExportController.name);

    constructor(private readonly siemExportService: SiemExportService) { }

    /**
     * GET /api/admin/siem-export
     * 
     * Export SIEM-ready records for external security platforms.
     * 
     * Query Parameters:
     * - source: 'events' | 'alerts' | 'incidents' | 'all' (default: 'all')
     * - format: 'json' | 'ndjson' (default: 'json')
     * - windowHours: 1 | 6 | 24 (default: 24)
     * 
     * Output Formats:
     * - json: Standard JSON array
     * - ndjson: Newline-delimited JSON (one record per line)
     * 
     * RBAC: Requires PLATFORM_ADMIN role (stricter than dashboard)
     * 
     * Examples:
     * GET /api/admin/siem-export?source=all&format=ndjson&windowHours=6
     * GET /api/admin/siem-export?source=incidents&format=json&windowHours=24
     */
    @Get()
    @ApiOperation({
        summary: 'Export SIEM records',
        description:
            'Export flat, normalized records for external SIEM platforms (Splunk, Elastic, Sentinel). ' +
            'Supports multiple sources (events, alerts, incidents) and formats (JSON, NDJSON). ' +
            'Records are time-windowed (1h, 6h, 24h) and deterministically generated.',
    })
    @ApiQuery({
        name: 'source',
        required: false,
        enum: ['alerts', 'incidents', 'all'],
        description: 'Data source to export (default: all)',
        example: 'all',
    })
    @ApiQuery({
        name: 'format',
        required: false,
        enum: ['json', 'ndjson'],
        description: 'Output format (default: json)',
        example: 'json',
    })
    @ApiQuery({
        name: 'windowHours',
        required: false,
        type: Number,
        enum: [1, 6, 24],
        description: 'Time window in hours (default: 24)',
        example: 24,
    })
    @ApiResponse({
        status: 200,
        description: 'SIEM records exported successfully',
        content: {
            'application/json': {
                schema: {
                    example: [
                        {
                            recordId: 'sha256hash...',
                            timestamp: '2026-01-05T10:00:00.000Z',
                            source: 'RISK_EVENT',
                            severity: 'CRITICAL',
                            category: 'CRITICAL_AMOUNT_DETECTED',
                            message: 'Risk event: CRITICAL_AMOUNT_DETECTED - Amount exceeds critical threshold',
                            withdrawalId: 'w123',
                            userId: 'u456',
                            metadata: {
                                eventId: 'evt_123',
                                type: 'CRITICAL_AMOUNT_DETECTED',
                                description: 'Amount exceeds critical threshold',
                                riskLevel: 'HIGH',
                                actionTaken: 'PENDING_APPROVAL',
                                context: { amount: 50000 },
                                source: 'WithdrawalProcessingService',
                            },
                            sprint: 'SPRINT_16_PHASE_4',
                        },
                    ],
                },
            },
            'application/x-ndjson': {
                schema: {
                    example:
                        '{"recordId":"sha256hash...","timestamp":"2026-01-05T10:00:00.000Z","source":"RISK_EVENT","severity":"CRITICAL",...}\n' +
                        '{"recordId":"sha256hash...","timestamp":"2026-01-05T10:05:00.000Z","source":"ALERT","severity":"WARNING",...}\n',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid query parameters',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have PLATFORM_ADMIN role',
    })
    @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
    async export(
        @Query('source') source?: string,
        @Query('format') format?: string,
        @Query('windowHours') windowHours?: string,
    ): Promise<StreamableFile> {
        // Parse and validate parameters
        const parsedSource = this.parseSource(source);
        const parsedFormat = this.parseFormat(format);
        const parsedWindowHours = this.parseWindowHours(windowHours);

        this.logger.log(
            `[SPRINT_16_PHASE_4] SIEM export requested (source: ${parsedSource}, format: ${parsedFormat}, window: ${parsedWindowHours}h)`,
        );

        // Fetch records based on source
        let records;
        switch (parsedSource) {
            case 'alerts':
                records = await this.siemExportService.exportAlerts(parsedWindowHours);
                break;
            case 'incidents':
                records = await this.siemExportService.exportIncidents(parsedWindowHours);
                break;
            case 'all':
            default:
                records = await this.siemExportService.exportAll(parsedWindowHours);
                break;
        }

        // Format output
        let outputString: string;
        let contentType: string;

        if (parsedFormat === 'ndjson') {
            // Newline-delimited JSON (one record per line)
            outputString = records.map((record) => JSON.stringify(record)).join('\n');
            contentType = 'application/x-ndjson';
        } else {
            // Standard JSON array
            outputString = JSON.stringify(records, null, 2);
            contentType = 'application/json';
        }

        this.logger.log(
            `[SPRINT_16_PHASE_4] SIEM export completed (records: ${records.length}, format: ${parsedFormat})`,
        );

        // Create readable stream
        const stream = Readable.from([outputString]);

        return new StreamableFile(stream, {
            type: contentType,
            disposition: `attachment; filename="siem-export-${parsedSource}-${Date.now()}.${parsedFormat === 'ndjson' ? 'ndjson' : 'json'}"`,
        });
    }

    /**
     * Parse and validate source parameter
     */
    private parseSource(source?: string): 'alerts' | 'incidents' | 'all' {
        if (!source) {
            return 'all'; // Default
        }

        if (!['alerts', 'incidents', 'all'].includes(source)) {
            throw new BadRequestException(
                'Invalid source parameter. Must be: alerts, incidents, or all.',
            );
        }

        return source as 'alerts' | 'incidents' | 'all';
    }

    /**
     * Parse and validate format parameter
     */
    private parseFormat(format?: string): SiemExportFormat {
        if (!format) {
            return 'json'; // Default
        }

        if (!['json', 'ndjson'].includes(format)) {
            throw new BadRequestException('Invalid format parameter. Must be: json or ndjson.');
        }

        return format as SiemExportFormat;
    }

    /**
     * Parse and validate windowHours parameter
     */
    private parseWindowHours(windowHours?: string): 1 | 6 | 24 {
        if (!windowHours) {
            return 24; // Default
        }

        const parsed = parseInt(windowHours, 10);

        if (isNaN(parsed) || ![1, 6, 24].includes(parsed)) {
            throw new BadRequestException(
                'Invalid windowHours parameter. Must be 1, 6, or 24.',
            );
        }

        return parsed as 1 | 6 | 24;
    }
}
