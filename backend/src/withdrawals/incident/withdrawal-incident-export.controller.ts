import { Controller, Get, Param, Query, UseGuards, Req, StreamableFile, Header } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalIncidentReconstructionService } from '../risk/withdrawal-incident-reconstruction.service';
import { WithdrawalComplianceNarrativeService } from './withdrawal-compliance-narrative.service';
import { WithdrawalIncidentExportService, IncidentExportOptions } from './withdrawal-incident-export.service';

/**
 * SPRINT 15 PHASE 3: Incident Export Controller
 * 
 * PURPOSE: REST endpoint for exporting withdrawal incidents in regulator-ready formats
 * 
 * GOLDEN RULES:
 * - READ-ONLY (no database writes)
 * - Deterministic exports (same input → same file)
 * - NO inference or speculation
 * - Evidence-backed exports only
 * - RBAC enforced (ADMIN/PLATFORM_ADMIN)
 * 
 * ENDPOINT:
 * GET /api/admin/withdrawals/risk/:id/incident-export
 * 
 * Query Params:
 *   format=JSON|CSV|PDF (required)
 *   includeNarrative=true|false (default: true)
 * 
 * Response:
 *   Content-Disposition: attachment
 *   Streams file directly to client
 * 
 * PROCESS:
 * 1. Reconstruct incident (Phase 1)
 * 2. Generate narrative (Phase 2, if requested)
 * 3. Export using Phase 3 service
 * 4. Stream file with appropriate headers
 * 
 * USE CASES:
 * - Regulator requests: Export complete incident documentation
 * - Audit submissions: Provide timeline in standard formats
 * - Compliance reporting: Generate professional PDF reports
 * - Data portability: Enable external analysis with JSON/CSV exports
 */
@Controller('admin/withdrawals/risk')
@UseGuards(AuthGuard, RoleGuard)
export class WithdrawalIncidentExportController {
    constructor(
        private readonly reconstructionService: WithdrawalIncidentReconstructionService,
        private readonly narrativeService: WithdrawalComplianceNarrativeService,
        private readonly exportService: WithdrawalIncidentExportService,
    ) { }

    /**
     * SPRINT 15 – PHASE 3: Export withdrawal incident in requested format
     * 
     * This endpoint orchestrates three phases:
     * 1. Phase 1: Reconstruct incident timeline from Sprint 12-14 data
     * 2. Phase 2: Generate compliance narrative (optional)
     * 3. Phase 3: Export in requested format (JSON/CSV/PDF)
     * 
     * RBAC: PLATFORM_ADMIN, ADMIN
     * 
     * EXPORT FORMATS:
     * - JSON: Canonical representation with incident + narrative + metadata
     * - CSV: Timeline events table (one row per event)
     * - PDF: Structured compliance report with sections
     * 
     * DETERMINISM GUARANTEE:
     * Same withdrawalId + same query params → same file content
     * 
     * AUDIT LOGGING:
     * All export requests are logged with SPRINT_15_PHASE_3 marker
     * 
     * @param withdrawalId - Withdrawal to export
     * @param format - Export format (JSON/CSV/PDF)
     * @param includeNarrative - Whether to include Phase 2 narrative (default: true)
     * @returns StreamableFile with appropriate Content-Disposition header
     */
    @Get(':id/incident-export')
    @Roles('PLATFORM_ADMIN', 'ADMIN')
    @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
    async exportIncident(
        @Param('id') withdrawalId: string,
        @Query('format') format: 'JSON' | 'CSV' | 'PDF',
        @Query('includeNarrative') includeNarrativeParam: string,
        @Req() req: any,
    ): Promise<StreamableFile> {
        const adminId = req.user.id;
        const includeNarrative = includeNarrativeParam !== 'false'; // default true

        // Validate format
        if (!['JSON', 'CSV', 'PDF'].includes(format)) {
            throw new Error(`Invalid export format: ${format}. Must be JSON, CSV, or PDF.`);
        }

        // Step 1: Reconstruct incident (Phase 1)
        const incident = await this.reconstructionService.reconstructIncident(withdrawalId, adminId);

        // Step 2: Generate narrative (Phase 2, if requested)
        let narrative = null;
        if (includeNarrative) {
            narrative = await this.narrativeService.generateNarrative(incident, adminId);
        }

        // Step 3: Export (Phase 3)
        const exportOptions: IncidentExportOptions = {
            format,
            includeNarrative,
            includeTimeline: true,
            includeMetadata: true,
        };

        const exportResult = await this.exportService.exportIncident(
            incident,
            narrative,
            exportOptions,
            adminId,
        );

        // Return streamable file with Content-Disposition header
        return new StreamableFile(exportResult.buffer, {
            type: exportResult.mimeType,
            disposition: `attachment; filename="${exportResult.fileName}"`,
        });
    }
}
