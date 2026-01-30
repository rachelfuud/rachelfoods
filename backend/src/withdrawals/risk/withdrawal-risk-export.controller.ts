import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Res,
    StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalRiskExportService, ExportFilters } from './withdrawal-risk-export.service';

/**
 * SPRINT_13_PHASE_4: Compliance Export & Forensic Read Mode
 * 
 * Enables compliance-grade exports and forensic review of withdrawal
 * risk escalation data.
 * 
 * CRITICAL: All endpoints are admin-only and READ-ONLY.
 * No mutations, no state changes, no approvals.
 */

@ApiTags('Admin - Risk Escalation Compliance Exports')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN', 'ADMIN')
@Controller('api/admin/withdrawals/risk')
export class WithdrawalRiskExportController {
    constructor(private readonly exportService: WithdrawalRiskExportService) { }

    /**
     * Export risk escalation data in CSV or JSON format
     * 
     * READ-ONLY: Generates compliance-grade export file
     * 
     * Query Parameters:
     * - startDate: ISO date string (optional) - max 90 days from endDate
     * - endDate: ISO date string (optional)
     * - severity: MEDIUM | HIGH (optional)
     * - format: csv | json (required)
     * - forensic: boolean (optional) - enable forensic mode with metadata
     * 
     * Forensic Mode:
     * - Includes metadata block with generation details
     * - Strict deterministic ordering
     * - Audit trail in export file
     * 
     * Limits:
     * - Max date range: 90 days
     * - Max records: 50,000
     */
    @Get('export')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Export escalation data (Admin only)',
        description:
            'Generates compliance-grade export of risk escalation data in CSV or JSON format. Supports forensic mode with metadata. READ-ONLY.',
    })
    @ApiResponse({
        status: 200,
        description: 'Export file generated successfully',
        content: {
            'text/csv': {
                schema: {
                    type: 'string',
                    example:
                        'withdrawalId,userId,requestedAt,approvedAt,escalationTimestamp,fromRiskLevel,toRiskLevel,deltaScore,escalationType,severity,newSignals\nwit_123,user_xyz,2026-01-01T10:00:00Z,2026-01-01T10:05:00Z,2026-01-01T10:15:00Z,LOW,HIGH,45,LEVEL_ESCALATION_LOW_TO_HIGH,HIGH,"FREQUENCY_ACCELERATION, AMOUNT_DEVIATION"',
                },
            },
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        records: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    withdrawalId: { type: 'string' },
                                    userId: { type: 'string' },
                                    requestedAt: { type: 'string' },
                                    approvedAt: { type: 'string', nullable: true },
                                    escalationTimestamp: { type: 'string' },
                                    fromRiskLevel: { type: 'string' },
                                    toRiskLevel: { type: 'string' },
                                    deltaScore: { type: 'number' },
                                    escalationType: { type: 'string' },
                                    severity: { type: 'string' },
                                    newSignals: { type: 'string' },
                                },
                            },
                        },
                        metadata: {
                            type: 'object',
                            description: 'Included only when forensic=true',
                            properties: {
                                generatedAt: { type: 'string' },
                                generatedByAdminId: { type: 'string' },
                                filters: { type: 'object' },
                                sprintVersion: { type: 'string' },
                                recordCount: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid filters or date range exceeds 90 days' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'ISO date string - start of date range',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'ISO date string - end of date range',
    })
    @ApiQuery({
        name: 'severity',
        required: false,
        enum: ['MEDIUM', 'HIGH'],
        description: 'Filter by escalation severity',
    })
    @ApiQuery({
        name: 'format',
        required: true,
        enum: ['csv', 'json'],
        description: 'Export file format',
    })
    @ApiQuery({
        name: 'forensic',
        required: false,
        type: Boolean,
        description: 'Enable forensic mode with metadata (default: false)',
    })
    async exportEscalations(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('severity') severity?: 'MEDIUM' | 'HIGH',
        @Query('format') format?: 'csv' | 'json',
        @Query('forensic') forensic?: string,
        @Request() req?: any,
        @Res({ passthrough: true }) res?: Response,
    ) {
        const adminId = req.user.id;

        // Validate required parameters
        if (!format) {
            throw new BadRequestException('format query parameter is required (csv or json)');
        }

        // Build filters
        const filters: ExportFilters = {
            format: format as 'csv' | 'json',
            forensic: forensic === 'true',
        };

        // Parse and validate dates
        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw new BadRequestException('Invalid startDate format. Use ISO date string.');
            }
            filters.startDate = parsedStartDate;
        }

        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw new BadRequestException('Invalid endDate format. Use ISO date string.');
            }
            filters.endDate = parsedEndDate;
        }

        // Validate severity
        if (severity) {
            if (!['MEDIUM', 'HIGH'].includes(severity)) {
                throw new BadRequestException('severity must be MEDIUM or HIGH');
            }
            filters.severity = severity;
        }

        // Validate filters (date range, format, etc.)
        try {
            this.exportService.validateExportFilters(filters);
        } catch (error) {
            throw new BadRequestException(error.message);
        }

        // Generate export
        const exportContent = await this.exportService.generateExport(filters, adminId);

        // Set response headers for file download
        const filename = this.exportService.getExportFilename(filters);
        const contentType = format === 'csv' ? 'text/csv' : 'application/json';

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        });

        return exportContent;
    }

    /**
     * Get export metadata (preview without generating full export)
     * 
     * READ-ONLY: Returns metadata about export without generating file
     * Useful for previewing record counts before full export
     */
    @Get('export/preview')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Preview export metadata (Admin only)',
        description:
            'Returns metadata about export without generating file. Useful for checking record counts. READ-ONLY.',
    })
    @ApiResponse({
        status: 200,
        description: 'Export metadata retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                estimatedRecordCount: { type: 'number' },
                dateRange: {
                    type: 'object',
                    properties: {
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        daysCovered: { type: 'number' },
                    },
                },
                filters: {
                    type: 'object',
                    properties: {
                        severity: { type: 'string', nullable: true },
                    },
                },
                maxRecordsLimit: { type: 'number' },
                maxDateRangeDays: { type: 'number' },
            },
        },
    })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'severity', required: false, enum: ['MEDIUM', 'HIGH'] })
    async previewExport(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('severity') severity?: 'MEDIUM' | 'HIGH',
        @Request() req?: any,
    ) {
        const adminId = req.user.id;

        // Parse dates
        const parsedStartDate = startDate ? new Date(startDate) : undefined;
        const parsedEndDate = endDate ? new Date(endDate) : undefined;

        // Validate dates
        if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
            throw new BadRequestException('Invalid startDate format');
        }
        if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
            throw new BadRequestException('Invalid endDate format');
        }

        // Calculate date range
        const daysCovered =
            parsedStartDate && parsedEndDate
                ? Math.floor(
                    (parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24),
                )
                : null;

        // Validate date range
        if (daysCovered && daysCovered > 90) {
            throw new BadRequestException('Date range exceeds maximum of 90 days');
        }

        // Note: For preview, we don't generate full export
        // This is a lightweight metadata response
        return {
            estimatedRecordCount: 'Run full export to get exact count',
            dateRange: {
                startDate: parsedStartDate?.toISOString(),
                endDate: parsedEndDate?.toISOString(),
                daysCovered,
            },
            filters: {
                severity: severity || null,
            },
            maxRecordsLimit: 50000,
            maxDateRangeDays: 90,
            note: 'Use GET /export to generate full export with exact record count',
        };
    }
}
