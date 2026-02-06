/**
 * SPRINT 16 – PHASE 3
 * Alert Incident Controller
 *
 * PURPOSE
 * -------
 * READ-ONLY API for querying alert incidents created by the
 * correlation engine.
 *
 * RESPONSIBILITIES
 * ----------------
 * - GET /api/admin/alert-incidents - Query incidents with filters
 * - GET /api/admin/alert-incidents/:id - Get single incident with alerts
 *
 * SECURITY
 * --------
 * - RBAC: PLATFORM_ADMIN, ADMIN only
 * - No mutation endpoints (READ-ONLY)
 * - Rate limiting via NestJS (if configured)
 *
 * GOLDEN RULES
 * ------------
 * - READ-ONLY (no mutations)
 * - No behavioral changes
 * - No database writes
 */

import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    DefaultValuePipe,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AlertIncidentService } from './alert-incident.service';
import type {
    IncidentSeverity,
    IncidentStatus,
    IncidentCategory,
    IncidentQueryResult,
    IncidentWithAlerts,
} from './alert-incident.types';

/**
 * AlertIncidentController
 * -----------------------
 * READ-ONLY endpoints for querying alert incidents.
 *
 * All endpoints require PLATFORM_ADMIN or ADMIN role.
 */
@ApiTags('Admin - Alert Incidents')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles('PLATFORM_ADMIN')
@Controller('api/admin/alert-incidents')
export class AlertIncidentController {
    constructor(private readonly incidentService: AlertIncidentService) { }

    /**
     * Query incidents with optional filters
     * GET /api/admin/alert-incidents
     *
     * Query Parameters:
     * - severity: Filter by incident severity (INFO, WARNING, CRITICAL)
     * - status: Filter by incident status (OPEN, STALE)
     * - category: Filter by incident category (FRAUD_RISK, COMPLIANCE, PROCESS_ANOMALY, SYSTEM_SIGNAL)
     * - withdrawalId: Filter by withdrawal ID
     * - userId: Filter by user ID
     * - startTime: Filter by start time (ISO 8601)
     * - endTime: Filter by end time (ISO 8601)
     * - limit: Pagination limit (default: 20, max: 50)
     * - offset: Pagination offset (default: 0)
     *
     * @returns Paginated incident results
     */
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Query alert incidents with filters',
        description:
            'Retrieve correlated alert incidents from in-memory registry with optional filters. ' +
            'Supports pagination and time-range filtering. Admin-only endpoint.',
    })
    @ApiResponse({
        status: 200,
        description: 'Incidents retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                incidents: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            incidentId: { type: 'string', example: '8f3e9a2b...' },
                            createdAt: { type: 'string', example: '2026-01-05T10:30:00.000Z' },
                            severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
                            status: { type: 'string', enum: ['OPEN', 'STALE'] },
                            category: {
                                type: 'string',
                                enum: ['FRAUD_RISK', 'COMPLIANCE', 'PROCESS_ANOMALY', 'SYSTEM_SIGNAL'],
                            },
                            title: { type: 'string', example: 'CRITICAL incident for withdrawal wdr_abc123' },
                            summary: { type: 'string', example: '2 CRITICAL, 1 WARNING alerts for withdrawal wdr_abc123' },
                            alertIds: { type: 'array', items: { type: 'string' } },
                            relatedEventIds: { type: 'array', items: { type: 'string' } },
                            withdrawalId: { type: 'string', example: 'wdr_abc123' },
                            userId: { type: 'string', example: 'usr_def456' },
                            riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                            firstSeenAt: { type: 'string', example: '2026-01-05T10:00:00.000Z' },
                            lastSeenAt: { type: 'string', example: '2026-01-05T10:45:00.000Z' },
                            alertCount: { type: 'number', example: 3 },
                            sources: { type: 'array', items: { type: 'string' } },
                            sprint: { type: 'string', example: 'SPRINT_16_PHASE_3' },
                        },
                    },
                },
                total: { type: 'number', example: 150 },
                limit: { type: 'number', example: 20 },
                offset: { type: 'number', example: 0 },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid query parameters' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiQuery({
        name: 'severity',
        required: false,
        enum: ['INFO', 'WARNING', 'CRITICAL'],
        description: 'Filter by incident severity',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['OPEN', 'STALE'],
        description: 'Filter by incident status',
    })
    @ApiQuery({
        name: 'category',
        required: false,
        enum: ['FRAUD_RISK', 'COMPLIANCE', 'PROCESS_ANOMALY', 'SYSTEM_SIGNAL'],
        description: 'Filter by incident category',
    })
    @ApiQuery({
        name: 'withdrawalId',
        required: false,
        type: String,
        description: 'Filter by withdrawal ID',
    })
    @ApiQuery({
        name: 'userId',
        required: false,
        type: String,
        description: 'Filter by user ID',
    })
    @ApiQuery({
        name: 'startTime',
        required: false,
        type: String,
        description: 'Filter by start time (ISO 8601)',
        example: '2026-01-01T00:00:00.000Z',
    })
    @ApiQuery({
        name: 'endTime',
        required: false,
        type: String,
        description: 'Filter by end time (ISO 8601)',
        example: '2026-01-05T23:59:59.999Z',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Pagination limit (default: 20, max: 50)',
        example: 20,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        type: Number,
        description: 'Pagination offset (default: 0)',
        example: 0,
    })
    async queryIncidents(
        @Query('severity') severity?: IncidentSeverity,
        @Query('status') status?: IncidentStatus,
        @Query('category') category?: IncidentCategory,
        @Query('withdrawalId') withdrawalId?: string,
        @Query('userId') userId?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    ): Promise<IncidentQueryResult> {
        // Validate time range if provided
        if (startTime && !this.isValidISO8601(startTime)) {
            throw new BadRequestException('startTime must be valid ISO 8601 timestamp');
        }

        if (endTime && !this.isValidISO8601(endTime)) {
            throw new BadRequestException('endTime must be valid ISO 8601 timestamp');
        }

        if (startTime && endTime && startTime > endTime) {
            throw new BadRequestException('startTime must be before endTime');
        }

        // Validate limit
        if (limit && (limit < 1 || limit > 50)) {
            throw new BadRequestException('limit must be between 1 and 50');
        }

        // Validate offset
        if (offset && offset < 0) {
            throw new BadRequestException('offset must be non-negative');
        }

        return this.incidentService.queryIncidents({
            severity,
            status,
            category,
            withdrawalId,
            userId,
            startTime,
            endTime,
            limit,
            offset,
        });
    }

    /**
     * Get single incident by ID with full alert details
     * GET /api/admin/alert-incidents/:id
     *
     * @param incidentId - Incident identifier (SHA-256 hash)
     * @returns Single incident with alerts included
     * @throws NotFoundException if incident not found
     */
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get single incident by ID with alerts',
        description:
            'Retrieve a specific alert incident by its ID (SHA-256 hash) with full alert details. ' +
            'Admin-only endpoint.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Incident ID (SHA-256 hash)',
        example: '8f3e9a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    })
    @ApiResponse({
        status: 200,
        description: 'Incident retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                incidentId: { type: 'string' },
                createdAt: { type: 'string' },
                severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
                status: { type: 'string', enum: ['OPEN', 'STALE'] },
                category: {
                    type: 'string',
                    enum: ['FRAUD_RISK', 'COMPLIANCE', 'PROCESS_ANOMALY', 'SYSTEM_SIGNAL'],
                },
                title: { type: 'string' },
                summary: { type: 'string' },
                alertIds: { type: 'array', items: { type: 'string' } },
                relatedEventIds: { type: 'array', items: { type: 'string' } },
                withdrawalId: { type: 'string' },
                userId: { type: 'string' },
                riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                firstSeenAt: { type: 'string' },
                lastSeenAt: { type: 'string' },
                alertCount: { type: 'number' },
                sources: { type: 'array', items: { type: 'string' } },
                sprint: { type: 'string' },
                alerts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        description: 'Full AdminAlert objects',
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Incident not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async getIncidentById(
        @Param('id') incidentId: string,
    ): Promise<IncidentWithAlerts> {
        return this.incidentService.getIncidentById(incidentId);
    }

    /**
     * Validate ISO 8601 timestamp
     */
    private isValidISO8601(timestamp: string): boolean {
        const date = new Date(timestamp);
        return !isNaN(date.getTime()) && date.toISOString() === timestamp;
    }
}
