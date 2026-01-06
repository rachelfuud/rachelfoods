/**
 * SPRINT 20 – PHASE 2: External Verifiability & Third-Party Audit Artifacts
 * Governance Evidence Export Service
 *
 * PURPOSE:
 * Generate exportable verification packages enabling third-party auditors,
 * regulators, and legal reviewers to independently validate governance
 * evidence integrity WITHOUT access to internal services.
 *
 * DESIGN PRINCIPLES:
 * - READ-ONLY (no state changes, no persistence)
 * - Deterministic output (same ledger → identical ZIP bytes)
 * - Tool-agnostic verification (shasum, certutil, openssl)
 * - Platform-aware guidance (Linux/macOS/Windows)
 * - Explicit threat model boundaries
 *
 * QUALITY GATES:
 * - Deterministic JSON serialization (sorted keys, 2-space indent)
 * - Hour-truncated timestamps (no sub-hour precision)
 * - No compression (STORE mode for byte-for-byte reproducibility)
 * - SHA-256 everywhere
 * - Advisory positioning (internal proof, not external guarantee)
 */

import { Injectable, Logger } from '@nestjs/common';
import JSZip from 'jszip';
import * as crypto from 'crypto';
import { GovernanceEvidenceLedgerService } from './governance-evidence-ledger.service';
import {
    VerificationManifest,
    ExportPackageMetadata,
    PackageFile,
    generateVerificationManifest,
} from './governance-evidence-manifest.types';
import { GovernanceEvidenceLedger } from './governance-evidence-ledger.types';

/**
 * GovernanceEvidenceExportService
 *
 * PURPOSE:
 * Generate exportable verification packages with deterministic structure:
 * - evidence-ledger.json: Complete ledger with all records
 * - evidence-checksums.txt: Ordered list of record checksums
 * - verification-manifest.json: Self-contained verification instructions
 *
 * DETERMINISM:
 * Same ledger → Identical ZIP bytes → Same ZIP checksum
 *
 * VERIFICATION WORKFLOW:
 * 1. Third party downloads ZIP via API (requires PLATFORM_ADMIN auth)
 * 2. Extract files to local directory
 * 3. Follow platform-specific verification steps in manifest
 * 4. Compare computed integrityHash to manifest.integrityHash
 * 5. ✅ Match → Evidence is complete and untampered
 * 6. ❌ Mismatch → Evidence may be incomplete or tampered
 */
@Injectable()
export class GovernanceEvidenceExportService {
    private readonly logger = new Logger(GovernanceEvidenceExportService.name);

    constructor(
        private readonly ledgerService: GovernanceEvidenceLedgerService,
    ) { }

    /**
     * generateExportPackage: Generate complete verification package
     *
     * PURPOSE:
     * Create deterministic ZIP package with ledger, checksums, and manifest.
     *
     * DETERMINISM:
     * - Sorted JSON keys (recursive alphabetical ordering)
     * - 2-space indentation (consistent formatting)
     * - Hour-truncated timestamps (no sub-hour precision)
     * - No compression (STORE mode)
     * - Alphabetical file ordering
     *
     * PACKAGE STRUCTURE:
     * governance_evidence_ledger_bundle_YYYYMMDD_HH.zip
     * ├── evidence-checksums.txt    (SHA-256 checksums, one per line)
     * ├── evidence-ledger.json      (Complete ledger, stable JSON)
     * └── verification-manifest.json (Verification instructions + metadata)
     *
     * @param generatedBy - Platform admin username (for audit trail)
     * @returns ZIP package as Buffer
     */
    async generateExportPackage(generatedBy: string): Promise<Buffer> {
        this.logger.log('Generating governance evidence export package');

        // 1. Fetch complete evidence ledger from Phase 1 service
        const ledger = await this.ledgerService.generateEvidenceLedger();

        // 2. Generate hour-truncated timestamp for determinism
        const generatedAt = this.truncateToHour(new Date());

        // 3. Generate checksums file (one checksum per line, in ledger order)
        const checksumsText = this.generateChecksumsFile(ledger);

        // 4. Serialize ledger to stable JSON (sorted keys, 2-space indent)
        const ledgerJSON = this.stableJSONStringify(ledger);

        // 5. Compute checksums for package files
        const packageContents = this.computePackageContents(
            ledgerJSON,
            checksumsText,
        );

        // 6. Generate verification manifest
        const manifest = generateVerificationManifest(
            ledger.ledgerId,
            ledger.integrityHash,
            ledger.totalRecords,
            generatedAt,
            packageContents,
        );

        // 7. Serialize manifest to stable JSON
        const manifestJSON = this.stableJSONStringify(manifest);

        // 8. Update package contents with manifest checksum
        const finalPackageContents = [
            ...packageContents,
            {
                filename: 'verification-manifest.json',
                description: 'Self-contained verification instructions and metadata',
                checksum: this.computeSHA256(manifestJSON),
                sizeBytes: Buffer.byteLength(manifestJSON, 'utf8'),
            },
        ];

        // 9. Create deterministic ZIP package
        const zipBuffer = await this.createDeterministicZip(
            ledgerJSON,
            checksumsText,
            manifestJSON,
            generatedAt,
        );

        this.logger.log(
            `Export package generated: ${zipBuffer.length} bytes, ` +
            `${finalPackageContents.length} files, ` +
            `${ledger.totalRecords} evidence records`,
        );

        return zipBuffer;
    }

    /**
     * generateChecksumsFile: Extract checksums from ledger
     *
     * PURPOSE:
     * Create plain-text file with SHA-256 checksums (one per line)
     * for CLI-based verification using shasum/certutil.
     *
     * FORMAT:
     * abc123...def (64-char hex)
     * 456789...ghi (64-char hex)
     * ...
     *
     * ORDERING:
     * Checksums appear in ledger.records order (stable ordering)
     *
     * @param ledger - Complete evidence ledger
     * @returns Plain-text checksums (newline-separated)
     */
    private generateChecksumsFile(ledger: GovernanceEvidenceLedger): string {
        return ledger.records.map((record) => record.checksum).join('\n');
    }

    /**
     * stableJSONStringify: Deterministic JSON serialization
     *
     * PURPOSE:
     * Ensure same object → identical JSON bytes for reproducibility.
     *
     * DETERMINISM:
     * - Recursive key sorting (alphabetical)
     * - 2-space indentation
     * - Trailing newline
     * - No circular references
     *
     * @param obj - Object to serialize
     * @returns Stable JSON string
     */
    private stableJSONStringify(obj: unknown): string {
        // Recursive key sorting
        const sortKeys = (value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.map(sortKeys);
            }
            if (value !== null && typeof value === 'object') {
                return Object.keys(value)
                    .sort() // Alphabetical key ordering
                    .reduce((sorted, key) => {
                        sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
                        return sorted;
                    }, {} as Record<string, unknown>);
            }
            return value;
        };

        const sorted = sortKeys(obj);
        return JSON.stringify(sorted, null, 2) + '\n'; // 2-space indent + trailing newline
    }

    /**
     * createDeterministicZip: Generate ZIP with stable byte output
     *
     * PURPOSE:
     * Create ZIP package with deterministic ordering and no compression
     * for byte-for-byte reproducibility.
     *
     * DETERMINISM:
     * - Alphabetical file ordering (checksums, ledger, manifest)
     * - No compression (STORE mode)
     * - Hour-truncated timestamps
     * - Fixed file permissions (if supported)
     *
     * @param ledgerJSON - Serialized ledger
     * @param checksumsText - Plain-text checksums
     * @param manifestJSON - Serialized manifest
     * @param generatedAt - Hour-truncated timestamp
     * @returns ZIP package as Buffer
     */
    private async createDeterministicZip(
        ledgerJSON: string,
        checksumsText: string,
        manifestJSON: string,
        generatedAt: string,
    ): Promise<Buffer> {
        const zip = new JSZip();
        const timestamp = new Date(generatedAt); // Use hour-truncated timestamp

        // Add files in alphabetical order for determinism
        const files = [
            { name: 'evidence-checksums.txt', content: checksumsText },
            { name: 'evidence-ledger.json', content: ledgerJSON },
            { name: 'verification-manifest.json', content: manifestJSON },
        ].sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical sorting

        for (const file of files) {
            zip.file(file.name, file.content, {
                compression: 'STORE', // No compression (byte-for-byte reproducibility)
                date: timestamp, // Hour-truncated timestamp
            });
        }

        // Generate ZIP buffer
        return await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'STORE', // No compression at package level
            compressionOptions: {
                level: 0, // No compression
            },
        });
    }

    /**
     * computePackageContents: Generate file inventory with checksums
     *
     * PURPOSE:
     * Create inventory of package files with checksums for integrity verification.
     *
     * @param ledgerJSON - Serialized ledger
     * @param checksumsText - Plain-text checksums
     * @returns PackageFile array (manifest excluded, added later)
     */
    private computePackageContents(
        ledgerJSON: string,
        checksumsText: string,
    ): PackageFile[] {
        return [
            {
                filename: 'evidence-ledger.json',
                description: 'Complete governance evidence ledger with all artifact records',
                checksum: this.computeSHA256(ledgerJSON),
                sizeBytes: Buffer.byteLength(ledgerJSON, 'utf8'),
            },
            {
                filename: 'evidence-checksums.txt',
                description: 'Ordered list of SHA-256 checksums (one per record)',
                checksum: this.computeSHA256(checksumsText),
                sizeBytes: Buffer.byteLength(checksumsText, 'utf8'),
            },
        ];
    }

    /**
     * computeSHA256: Compute SHA-256 checksum of string
     *
     * @param content - String content
     * @returns SHA-256 hex digest (64 chars)
     */
    private computeSHA256(content: string): string {
        return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }

    /**
     * truncateToHour: Truncate timestamp to hour precision
     *
     * PURPOSE:
     * Remove sub-hour precision (minutes, seconds, milliseconds)
     * for deterministic timestamps.
     *
     * EXAMPLE:
     * Input:  2026-01-06T14:37:42.123Z
     * Output: 2026-01-06T14:00:00.000Z
     *
     * @param date - Full-precision timestamp
     * @returns Hour-truncated ISO 8601 string
     */
    private truncateToHour(date: Date): string {
        const truncated = new Date(date);
        truncated.setMinutes(0, 0, 0); // Reset minutes, seconds, milliseconds to 0
        return truncated.toISOString();
    }

    /**
     * generateExportFilename: Generate deterministic export filename
     *
     * PURPOSE:
     * Create filename with timestamp for organizational purposes.
     *
     * FORMAT:
     * governance_evidence_ledger_bundle_YYYYMMDD_HH.zip
     *
     * EXAMPLE:
     * governance_evidence_ledger_bundle_20260106_14.zip
     *
     * @param generatedAt - Hour-truncated ISO 8601 timestamp
     * @returns Filename string
     */
    generateExportFilename(generatedAt: string): string {
        const date = new Date(generatedAt);
        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');
        const hh = String(date.getUTCHours()).padStart(2, '0');
        return `governance_evidence_ledger_bundle_${yyyy}${mm}${dd}_${hh}.zip`;
    }

    /**
     * generateExportMetadata: Create package metadata for audit trail
     *
     * PURPOSE:
     * Track package generation details for operational visibility.
     *
     * @param zipBuffer - Generated ZIP package
     * @param generatedBy - Platform admin username
     * @returns ExportPackageMetadata
     */
    generateExportMetadata(
        zipBuffer: Buffer,
        generatedBy: string,
    ): ExportPackageMetadata {
        const generatedAt = this.truncateToHour(new Date());

        return {
            generatedAt,
            format: 'zip',
            totalSizeBytes: zipBuffer.length,
            fileCount: 3, // ledger + checksums + manifest
            generatedBy,
        };
    }
}
