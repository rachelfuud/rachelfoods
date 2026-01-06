/**
 * SPRINT 20 – PHASE 2: External Verifiability & Third-Party Audit Artifacts
 * Governance Evidence Export Controller
 *
 * PURPOSE:
 * Provide READ-ONLY API endpoint for exporting governance evidence
 * verification packages to third-party auditors, regulators, and legal reviewers.
 *
 * DESIGN PRINCIPLES:
 * - READ-ONLY (no state changes)
 * - PLATFORM_ADMIN only (RBAC enforcement)
 * - Deterministic output (same ledger → identical ZIP)
 * - Stream response (memory-efficient)
 * - Comprehensive OpenAPI documentation
 *
 * ENDPOINT:
 * GET /api/admin/governance/evidence-ledger/export
 *
 * RBAC:
 * PLATFORM_ADMIN (highest governance access)
 *
 * RESPONSE:
 * application/zip (deterministic verification package)
 */

import {
    Controller,
    Get,
    Query,
    Res,
    UseGuards,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiBearerAuth,
    ApiProduces,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GovernanceEvidenceExportService } from './governance-evidence-export.service';

/**
 * ExportQueryParams: Query parameters for export endpoint
 */
class ExportQueryParams {
    /**
     * Export format (future-proofed for additional formats)
     * @default 'zip'
     */
    format?: 'zip' = 'zip';

    /**
     * Include verification manifest in package
     * @default true
     */
    includeManifest?: boolean = true;
}

/**
 * GovernanceEvidenceExportController
 *
 * PURPOSE:
 * Expose READ-ONLY endpoint for downloading governance evidence
 * verification packages.
 *
 * SECURITY:
 * - PLATFORM_ADMIN role required (highest governance access)
 * - JWT authentication enforced
 * - Rate limiting recommended (external middleware)
 *
 * THIRD-PARTY WORKFLOW:
 * 1. PLATFORM_ADMIN downloads ZIP via API
 * 2. Share ZIP with third-party auditor/regulator
 * 3. Third party extracts locally
 * 4. Third party follows verification-manifest.json instructions
 * 5. Third party uses standard CLI tools (shasum, certutil, openssl)
 * 6. Third party verifies integrityHash matches computed hash
 */
@ApiTags('Admin - Governance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller('api/admin/governance/evidence-ledger')
export class GovernanceEvidenceExportController {
    private readonly logger = new Logger(GovernanceEvidenceExportController.name);

    constructor(
        private readonly exportService: GovernanceEvidenceExportService,
    ) { }

    /**
     * Export governance evidence verification package
     *
     * PURPOSE:
     * Generate and download deterministic ZIP package containing:
     * - evidence-ledger.json: Complete ledger with all records
     * - evidence-checksums.txt: Ordered SHA-256 checksums
     * - verification-manifest.json: Self-contained verification instructions
     *
     * THIRD-PARTY VERIFICATION WORKFLOW:
     * After downloading, third parties can independently verify using standard tools:
     *
     * LINUX/MACOS:
     * ```bash
     * # Extract package
     * unzip governance_evidence_ledger_bundle.zip -d verification/
     * cd verification/
     *
     * # Extract checksums from ledger
     * jq -r '.records[].checksum' evidence-ledger.json > computed-checksums.txt
     *
     * # Verify checksums match provided file
     * diff computed-checksums.txt evidence-checksums.txt
     *
     * # Concatenate checksums with pipe separator
     * checksums=$(cat evidence-checksums.txt | tr '\n' '|' | sed 's/|$//')
     *
     * # Compute integrity hash
     * computed_hash=$(echo -n "$checksums" | shasum -a 256 | awk '{print $1}')
     *
     * # Extract expected hash from manifest
     * expected_hash=$(jq -r '.integrityHash' verification-manifest.json)
     *
     * # Compare hashes
     * if [ "$computed_hash" == "$expected_hash" ]; then
     *   echo "✅ VERIFIED: Evidence is complete and untampered"
     * else
     *   echo "❌ FAILED: Evidence may be tampered or incomplete"
     * fi
     * ```
     *
     * WINDOWS (PowerShell):
     * ```powershell
     * # Extract package
     * Expand-Archive governance_evidence_ledger_bundle.zip -DestinationPath verification/
     * cd verification/
     *
     * # Load ledger and extract checksums
     * $ledger = Get-Content evidence-ledger.json | ConvertFrom-Json
     * $checksums = $ledger.records | ForEach-Object { $_.checksum }
     * $concatenated = $checksums -join "|"
     *
     * # Compute integrity hash
     * $stream = [System.IO.MemoryStream]::new([System.Text.Encoding]::UTF8.GetBytes($concatenated))
     * $computed_hash = (Get-FileHash -InputStream $stream -Algorithm SHA256).Hash.ToLower()
     *
     * # Load manifest and compare
     * $manifest = Get-Content verification-manifest.json | ConvertFrom-Json
     * $expected_hash = $manifest.integrityHash
     *
     * if ($computed_hash -eq $expected_hash) {
     *   Write-Host "✅ VERIFIED: Evidence is complete and untampered"
     * } else {
     *   Write-Host "❌ FAILED: Evidence may be tampered or incomplete"
     * }
     * ```
     *
     * THREAT MODEL:
     * ✅ PROTECTS AGAINST:
     * - Single artifact tampering (checksum mismatch)
     * - Artifact deletion (totalRecords mismatch)
     * - Artifact reordering (integrityHash mismatch)
     * - Partial ledger export (record count validation)
     *
     * ❌ DOES NOT PROTECT:
     * - Package substitution (no external signature)
     * - Generation timestamp manipulation (hour truncation only)
     * - Malicious package generation (requires PLATFORM_ADMIN trust)
     * - Historical tampering before export (no persistent audit trail)
     *
     * REQUIRES EXTERNAL CONTROLS:
     * - Version control (Git) for historical integrity
     * - Access controls (RBAC) for generation authorization
     * - Audit logs for generation tracking
     *
     * ADVISORY POSITIONING:
     * This verification package provides cryptographic proof of INTERNAL
     * CONSISTENCY at generation time. It does NOT constitute:
     * - External validation or third-party certification
     * - Legal guarantee or court-admissible evidence
     * - Notarization or timestamping authority
     * - Blockchain or distributed ledger
     * - Tamper-proof storage system
     *
     * INTENDED USE:
     * - Internal governance verification
     * - Regulator dialogue and evidence presentation
     * - Audit support and compliance reporting
     * - Legal discovery (evidence preservation)
     * - Executive certification and board reporting
     *
     * NOT INTENDED FOR:
     * - Standalone legal proof (requires legal review)
     * - Automated compliance certification
     * - External validation without internal context
     * - Tamper-proof audit trail (requires persistence layer)
     *
     * @param query - Query parameters (format, includeManifest)
     * @param currentUser - Authenticated platform admin
     * @param res - Express response object (for streaming ZIP)
     * @returns ZIP file stream
     */
    @Get('export')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Export governance evidence verification package',
        description: `
Generate deterministic ZIP package with complete governance evidence ledger,
checksums, and self-contained verification instructions for third-party audit.

**VERIFICATION WORKFLOW:**
1. Download ZIP package (requires PLATFORM_ADMIN auth)
2. Extract files to local directory
3. Follow platform-specific verification steps in manifest
4. Use standard CLI tools (shasum, certutil, openssl)
5. Compare computed integrityHash to manifest.integrityHash

**PACKAGE CONTENTS:**
- evidence-ledger.json: Complete ledger with all records
- evidence-checksums.txt: Ordered SHA-256 checksums
- verification-manifest.json: Self-contained verification instructions

**THREAT MODEL:**
✅ Protects against: artifact tampering, deletion, reordering, partial export
❌ Does not protect: package substitution, historical tampering, malicious generation

**ADVISORY:**
This provides cryptographic proof of internal consistency at generation time.
It does NOT constitute external validation, legal guarantee, or tamper-proof storage.
    `.trim(),
    })
    @ApiQuery({
        name: 'format',
        required: false,
        enum: ['zip'],
        description: 'Export format (currently only ZIP supported)',
        example: 'zip',
    })
    @ApiQuery({
        name: 'includeManifest',
        required: false,
        type: Boolean,
        description: 'Include verification manifest in package',
        example: true,
    })
    @ApiProduces('application/zip')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Verification package generated successfully',
        content: {
            'application/zip': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
                example: {
                    filename: 'governance_evidence_ledger_bundle_20260106_14.zip',
                    size: '512KB',
                    contents: [
                        'evidence-checksums.txt',
                        'evidence-ledger.json',
                        'verification-manifest.json',
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication required',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'PLATFORM_ADMIN role required',
    })
    @ApiResponse({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'Failed to generate verification package',
    })
    async exportVerificationPackage(
        @Query() query: ExportQueryParams,
        @CurrentUser() currentUser: { id: number; username: string; role: string },
        @Res() res: Response,
    ): Promise<void> {
        try {
            this.logger.log(
                `Export verification package requested by user ${currentUser.username} (ID: ${currentUser.id})`,
            );

            // Validate query parameters
            const format = query.format || 'zip';
            const includeManifest = query.includeManifest !== false; // Default true

            if (format !== 'zip') {
                res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Only ZIP format is currently supported',
                    error: 'Bad Request',
                });
                return;
            }

            if (!includeManifest) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Manifest must be included (cannot be disabled)',
                    error: 'Bad Request',
                });
                return;
            }

            // Generate verification package
            const zipBuffer = await this.exportService.generateExportPackage(
                currentUser.username,
            );

            // Generate deterministic filename
            const generatedAt = this.exportService['truncateToHour'](new Date());
            const filename = this.exportService.generateExportFilename(generatedAt);

            // Generate metadata for logging
            const metadata = this.exportService.generateExportMetadata(
                zipBuffer,
                currentUser.username,
            );

            this.logger.log(
                `Export package generated: ${filename}, ` +
                `${metadata.totalSizeBytes} bytes, ` +
                `${metadata.fileCount} files`,
            );

            // Set response headers
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', zipBuffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            // Stream ZIP buffer to response
            res.status(HttpStatus.OK).send(zipBuffer);

            this.logger.log(
                `Export package downloaded successfully by user ${currentUser.username}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to generate export package for user ${currentUser.username}`,
                error.stack,
            );

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to generate verification package',
                error: error.message || 'Internal Server Error',
            });
        }
    }
}
