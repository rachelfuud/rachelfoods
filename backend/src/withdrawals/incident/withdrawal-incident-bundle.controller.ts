import { Controller, Get, Param, Query, UseGuards, Req, StreamableFile, Header } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WithdrawalIncidentBundleService, IncidentBundleOptions } from './withdrawal-incident-bundle.service';

/**
 * SPRINT 15 PHASE 4: Forensic Bundle Controller
 * 
 * PURPOSE: REST endpoint for generating forensic incident bundles with integrity verification
 * 
 * GOLDEN RULES:
 * - READ-ONLY (no database writes)
 * - Deterministic bundles (same input → same bundle + hashes)
 * - NO inference or speculation
 * - Cryptographic integrity only (SHA-256)
 * - RBAC enforced (ADMIN/PLATFORM_ADMIN)
 * 
 * ENDPOINT:
 * GET /api/admin/withdrawals/risk/:id/incident-bundle
 * 
 * Query Params:
 *   includeJson=true|false (default: true)
 *   includeCsv=true|false (default: true)
 *   includePdf=true|false (default: true)
 *   includeNarrative=true|false (default: true)
 * 
 * Response:
 *   Content-Type: application/zip
 *   Content-Disposition: attachment; filename="forensic_bundle_wdr_abc123_<timestamp>.zip"
 *   Body: ZIP file with incident.json, incident.csv, incident.pdf, manifest.json
 * 
 * BUNDLE STRUCTURE:
 * forensic_bundle_wdr_abc123.zip
 *   ├── incident.json          (Phase 3 JSON export)
 *   ├── incident.csv           (Phase 3 CSV export)
 *   ├── incident.pdf           (Phase 3 PDF export)
 *   └── manifest.json          (SHA-256 hashes + metadata)
 * 
 * INTEGRITY VERIFICATION:
 * Extract manifest.json and verify each artifact's SHA-256 hash:
 *   shasum -a 256 incident.json    (macOS/Linux)
 *   certutil -hashfile incident.json SHA256    (Windows)
 * 
 * USE CASES:
 * - Legal discovery: Complete chain-of-custody package
 * - Regulator submissions: Integrity-verified incident documentation
 * - Forensic analysis: All artifacts with tamper detection
 * - Compliance archival: Long-term storage with hash verification
 */
@Controller('api/admin/withdrawals/risk')
@UseGuards(AuthGuard, RoleGuard)
export class WithdrawalIncidentBundleController {
    constructor(
        private readonly bundleService: WithdrawalIncidentBundleService,
    ) { }

    /**
     * SPRINT 15 – PHASE 4: Generate forensic incident bundle
     * 
     * This endpoint orchestrates all four phases:
     * 1. Phase 1: Reconstruct incident timeline from Sprint 12-14 data
     * 2. Phase 2: Generate compliance narrative (optional)
     * 3. Phase 3: Export in multiple formats (JSON/CSV/PDF)
     * 4. Phase 4: Bundle all artifacts with SHA-256 hashes into ZIP
     * 
     * RBAC: PLATFORM_ADMIN, ADMIN
     * 
     * BUNDLE CONTENTS:
     * - incident.json: Complete incident + narrative (if included)
     * - incident.csv: Timeline events table
     * - incident.pdf: Professional compliance report
     * - manifest.json: SHA-256 hashes for integrity verification
     * 
     * INTEGRITY GUARANTEE:
     * Every artifact has SHA-256 hash in manifest.json
     * Verify integrity: shasum -a 256 <filename> and compare to manifest
     * 
     * DETERMINISM GUARANTEE:
     * Same withdrawalId + same query params → same bundle + same hashes
     * 
     * AUDIT LOGGING:
     * All bundle generation requests logged with SPRINT_15_PHASE_4 marker
     * 
     * CHAIN-OF-CUSTODY:
     * - Generated timestamp recorded
     * - Admin ID recorded
     * - Artifact hashes recorded
     * - Determinism guarantee documented
     * 
     * @param withdrawalId - Withdrawal to bundle
     * @param includeJsonParam - Include JSON export (default: true)
     * @param includeCsvParam - Include CSV export (default: true)
     * @param includePdfParam - Include PDF export (default: true)
     * @param includeNarrativeParam - Include Phase 2 narrative (default: true)
     * @returns StreamableFile ZIP bundle with all artifacts + manifest
     */
    @Get(':id/incident-bundle')
    @Roles('PLATFORM_ADMIN')
    @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
    async generateForensicBundle(
        @Param('id') withdrawalId: string,
        @Query('includeJson') includeJsonParam: string,
        @Query('includeCsv') includeCsvParam: string,
        @Query('includePdf') includePdfParam: string,
        @Query('includeNarrative') includeNarrativeParam: string,
        @Req() req: any,
    ): Promise<StreamableFile> {
        const adminId = req.user.id;

        // Parse query params (default: true for all)
        const options: IncidentBundleOptions = {
            includeJsonExport: includeJsonParam !== 'false',
            includeCsvExport: includeCsvParam !== 'false',
            includePdfExport: includePdfParam !== 'false',
            includeNarrative: includeNarrativeParam !== 'false',
        };

        // Validate at least one export format selected
        if (!options.includeJsonExport && !options.includeCsvExport && !options.includePdfExport) {
            throw new Error('At least one export format must be included in bundle (JSON, CSV, or PDF)');
        }

        // Generate forensic bundle (Phase 4)
        const bundleResult = await this.bundleService.generateForensicBundle(
            withdrawalId,
            options,
            adminId,
        );

        // Return streamable ZIP file
        return new StreamableFile(bundleResult.buffer, {
            type: bundleResult.mimeType,
            disposition: `attachment; filename="${bundleResult.fileName}"`,
        });
    }
}
