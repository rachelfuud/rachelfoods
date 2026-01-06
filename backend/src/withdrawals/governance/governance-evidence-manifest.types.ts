/**
 * SPRINT 20 – PHASE 2: External Verifiability & Third-Party Audit Artifacts
 * Verification Manifest Type System
 *
 * PURPOSE:
 * Define type system for verification manifest that enables third-party
 * auditors, regulators, and legal reviewers to independently validate
 * governance evidence integrity WITHOUT access to internal services.
 *
 * DESIGN PRINCIPLES:
 * - Self-contained instructions (no external dependencies)
 * - Tool-agnostic verification steps (shasum, certutil, openssl)
 * - Platform-aware guidance (Linux/macOS/Windows)
 * - Explicit failure modes and interpretations
 * - Mandatory disclaimers (cryptographic proof ≠ legal guarantee)
 *
 * QUALITY GATES:
 * - Deterministic JSON serialization (sorted keys, stable formatting)
 * - No sub-hour timestamps (hour truncation for stability)
 * - SHA-256 everywhere
 * - Advisory positioning (internal proof, not external validation)
 */

/**
 * HashAlgorithm: Cryptographic hash algorithm used for checksums
 *
 * CURRENT: SHA-256 only
 * FUTURE: May extend to SHA-3, BLAKE3 if regulatory requirements change
 */
export type HashAlgorithm = 'SHA-256';

/**
 * VerificationTool: Standard tools available for independent verification
 *
 * PLATFORM SUPPORT:
 * - shasum: Linux/macOS (built-in)
 * - certutil: Windows (built-in)
 * - openssl: Linux/macOS (typically pre-installed)
 * - PowerShell: Windows (Get-FileHash cmdlet)
 */
export enum VerificationTool {
    SHASUM = 'shasum',
    CERTUTIL = 'certutil',
    OPENSSL = 'openssl',
    POWERSHELL = 'PowerShell (Get-FileHash)',
}

/**
 * VerificationStep: Single step in verification workflow
 *
 * PURPOSE:
 * Provide platform-specific instructions for third-party verifiers
 * to independently validate ledger integrity.
 *
 * STRUCTURE:
 * - stepNumber: Sequential order (1..N)
 * - description: Human-readable summary
 * - command: CLI command (platform-specific)
 * - expectedOutput: Expected result pattern
 * - failureInterpretation: What failure means
 */
export interface VerificationStep {
    /**
     * Sequential step number (1..N)
     */
    readonly stepNumber: number;

    /**
     * Human-readable step description
     * Plain English summary of what this step accomplishes
     */
    readonly description: string;

    /**
     * Platform-specific CLI command
     * Verifier executes this command in their terminal
     */
    readonly command: string;

    /**
     * Expected output pattern or success criteria
     * Verifier compares actual output to this
     */
    readonly expectedOutput: string;

    /**
     * Failure interpretation
     * What it means if this step fails
     */
    readonly failureInterpretation: string;
}

/**
 * PlatformVerificationGuide: Platform-specific verification instructions
 *
 * PURPOSE:
 * Separate verification steps by platform (Linux/macOS vs Windows)
 * to accommodate different tooling ecosystems.
 */
export interface PlatformVerificationGuide {
    /**
     * Platform identifier
     */
    readonly platform: 'Linux/macOS' | 'Windows';

    /**
     * Required tools for this platform
     */
    readonly requiredTools: readonly VerificationTool[];

    /**
     * Sequential verification steps
     */
    readonly steps: readonly VerificationStep[];
}

/**
 * VerificationManifest: Complete verification package metadata
 *
 * PURPOSE:
 * Self-contained verification instructions enabling third-party
 * auditors to independently validate governance evidence integrity.
 *
 * DETERMINISM:
 * manifestId = SHA-256(ledgerId + generatedAt + totalRecords + integrityHash)
 *
 * PACKAGE CONTENTS:
 * - evidence-ledger.json: Full ledger with all records
 * - evidence-checksums.txt: Ordered list of record checksums
 * - verification-manifest.json: This manifest (self-describing)
 *
 * VERIFICATION WORKFLOW:
 * 1. Extract package to temporary directory
 * 2. Follow platform-specific verification steps
 * 3. Compare computed integrityHash to manifest.integrityHash
 * 4. ✅ Match → Evidence is complete and untampered
 * 5. ❌ Mismatch → Evidence may be incomplete or tampered
 */
export interface VerificationManifest {
    /**
     * Deterministic manifest identifier
     * Formula: SHA-256(ledgerId + generatedAt + totalRecords + integrityHash)
     */
    readonly manifestId: string;

    /**
     * Manifest generation timestamp (hour-truncated for stability)
     * ISO 8601 format: 2026-01-06T14:00:00.000Z
     */
    readonly generatedAt: string;

    /**
     * Evidence ledger identifier (from Sprint 20 Phase 1)
     */
    readonly ledgerId: string;

    /**
     * Merkle-root-style integrity hash (from Sprint 20 Phase 1)
     * SHA-256(concatenated_checksums_in_ledger_order)
     */
    readonly integrityHash: string;

    /**
     * Total number of evidence records in ledger
     */
    readonly totalRecords: number;

    /**
     * Hash algorithm used for all checksums
     */
    readonly hashAlgorithm: HashAlgorithm;

    /**
     * Platform-specific verification guides
     */
    readonly verificationGuides: readonly PlatformVerificationGuide[];

    /**
     * Package contents inventory
     */
    readonly packageContents: readonly PackageFile[];

    /**
     * Threat model limitations
     * What this verification DOES and DOES NOT protect against
     */
    readonly threatModelLimitations: readonly string[];

    /**
     * Mandatory advisory disclaimer
     * Positions verification as internal proof, not external guarantee
     */
    readonly mandatoryDisclaimer: string;

    /**
     * Verification manifest schema version
     * For future compatibility tracking
     */
    readonly schemaVersion: string;
}

/**
 * PackageFile: Single file in verification package
 *
 * PURPOSE:
 * Inventory of files in ZIP package with checksums for integrity verification.
 */
export interface PackageFile {
    /**
     * Filename (relative to package root)
     */
    readonly filename: string;

    /**
     * File purpose description
     */
    readonly description: string;

    /**
     * SHA-256 checksum of file content
     * Enables verification of package integrity
     */
    readonly checksum: string;

    /**
     * File size in bytes
     */
    readonly sizeBytes: number;
}

/**
 * ExportPackageMetadata: Metadata for verification package generation
 *
 * PURPOSE:
 * Track package generation details for audit trail.
 */
export interface ExportPackageMetadata {
    /**
     * Package generation timestamp (hour-truncated)
     */
    readonly generatedAt: string;

    /**
     * Package format (always 'zip' for Phase 2)
     */
    readonly format: 'zip';

    /**
     * Total package size in bytes
     */
    readonly totalSizeBytes: number;

    /**
     * Number of files in package
     */
    readonly fileCount: number;

    /**
     * Platform admin who generated package
     * For audit trail purposes
     */
    readonly generatedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION MANIFEST CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * VERIFICATION_MANIFEST_SCHEMA_VERSION: Current schema version
 *
 * VERSION HISTORY:
 * - 1.0.0: Initial version (Sprint 20 Phase 2)
 */
export const VERIFICATION_MANIFEST_SCHEMA_VERSION = '1.0.0';

/**
 * VERIFICATION_MANIFEST_DISCLAIMER: Mandatory advisory language
 *
 * PURPOSE:
 * Position verification package as internal cryptographic proof,
 * NOT as external legal guarantee, blockchain, or notarization.
 *
 * KEY POINTS:
 * - Cryptographic proof of internal consistency
 * - No external validation / timestamping authority
 * - No legal guarantee / court admissibility
 * - No tamper-proof storage (requires organizational controls)
 * - Advisory-only positioning
 */
export const VERIFICATION_MANIFEST_DISCLAIMER = `
This verification package provides cryptographic proof of governance artifact
internal consistency at generation time. It does NOT constitute:
- External validation or third-party certification
- Legal guarantee or court-admissible evidence
- Notarization or timestamping authority
- Blockchain or distributed ledger
- Tamper-proof storage system

VERIFICATION SCOPE:
✅ Proves artifacts are internally consistent (checksums match)
✅ Proves artifacts are complete (all records present)
✅ Proves artifacts follow deterministic ordering
✅ Enables independent validation using standard tools

VERIFICATION DOES NOT PROVE:
❌ External validation (no third-party audit)
❌ Legal compliance (requires legal counsel review)
❌ Operational effectiveness (requires outcome analysis)
❌ Tamper resistance over time (requires organizational controls)

TAMPER RESISTANCE REQUIREMENTS:
Actual tamper resistance requires external controls:
- Version control systems (Git)
- Immutable backup systems (S3, WORM storage)
- Audit logs (access tracking)
- Access controls (RBAC enforcement)
- Organizational policies (change management)

INTENDED USE:
- Internal governance verification
- Regulator dialogue and evidence presentation
- Audit support and compliance reporting
- Legal discovery (evidence preservation)
- Executive certification and board reporting

NOT INTENDED FOR:
- Standalone legal proof (requires legal review)
- Automated compliance certification
- External validation without internal context
- Tamper-proof audit trail (requires persistence layer)
`.trim();

/**
 * THREAT_MODEL_LIMITATIONS: What verification protects against (and doesn't)
 *
 * PURPOSE:
 * Explicit threat model boundaries to prevent misinterpretation
 * of verification package capabilities.
 */
export const THREAT_MODEL_LIMITATIONS: readonly string[] = [
    '✅ PROTECTS AGAINST: Single artifact tampering (checksum mismatch)',
    '✅ PROTECTS AGAINST: Artifact deletion (totalRecords mismatch)',
    '✅ PROTECTS AGAINST: Artifact reordering (integrityHash mismatch)',
    '✅ PROTECTS AGAINST: Partial ledger export (record count validation)',
    '❌ DOES NOT PROTECT: Time-of-check-time-of-use attacks (no persistence)',
    '❌ DOES NOT PROTECT: Package substitution (no external signature)',
    '❌ DOES NOT PROTECT: Generation timestamp manipulation (hour truncation)',
    '❌ DOES NOT PROTECT: Malicious package generation (PLATFORM_ADMIN trust)',
    '❌ DOES NOT PROTECT: Historical tampering before export (no audit trail)',
    '⚠️  REQUIRES EXTERNAL: Version control for historical integrity',
    '⚠️  REQUIRES EXTERNAL: Access controls for generation authorization',
    '⚠️  REQUIRES EXTERNAL: Audit logs for generation tracking',
];

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION STEP GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * generateLinuxMacOSVerificationSteps: Create Linux/macOS verification guide
 *
 * PURPOSE:
 * Generate platform-specific verification steps using shasum and jq.
 *
 * TOOLS REQUIRED:
 * - shasum (built-in on Linux/macOS)
 * - jq (JSON processor, typically pre-installed or easily available)
 *
 * @param integrityHash - Expected integrity hash from ledger
 * @returns PlatformVerificationGuide for Linux/macOS
 */
export function generateLinuxMacOSVerificationSteps(
    integrityHash: string,
): PlatformVerificationGuide {
    return {
        platform: 'Linux/macOS',
        requiredTools: [VerificationTool.SHASUM],
        steps: [
            {
                stepNumber: 1,
                description: 'Extract verification package',
                command: 'unzip governance_evidence_ledger_bundle.zip -d verification/',
                expectedOutput: 'Archive extracted successfully',
                failureInterpretation: 'Package is corrupted or not a valid ZIP file',
            },
            {
                stepNumber: 2,
                description: 'Navigate to extracted directory',
                command: 'cd verification/',
                expectedOutput: 'Directory changed',
                failureInterpretation: 'Extraction failed in step 1',
            },
            {
                stepNumber: 3,
                description: 'Verify package contents',
                command: 'ls -1',
                expectedOutput:
                    'evidence-checksums.txt\nevidence-ledger.json\nverification-manifest.json',
                failureInterpretation: 'Package is incomplete - missing required files',
            },
            {
                stepNumber: 4,
                description: 'Extract checksums from ledger in order',
                command: "jq -r '.records[].checksum' evidence-ledger.json > computed-checksums.txt",
                expectedOutput: 'File computed-checksums.txt created',
                failureInterpretation: 'evidence-ledger.json is malformed or missing .records[] array',
            },
            {
                stepNumber: 5,
                description: 'Compare extracted checksums to provided checksums',
                command: 'diff computed-checksums.txt evidence-checksums.txt',
                expectedOutput: 'No output (files are identical)',
                failureInterpretation:
                    'Checksums do not match - ledger records may be incomplete or reordered',
            },
            {
                stepNumber: 6,
                description: 'Concatenate checksums with pipe separator',
                command: "checksums=$(cat evidence-checksums.txt | tr '\\n' '|' | sed 's/|$//')",
                expectedOutput: 'Variable set (no output)',
                failureInterpretation: 'Shell error - check bash syntax',
            },
            {
                stepNumber: 7,
                description: 'Compute integrity hash from concatenated checksums',
                command: 'computed_hash=$(echo -n "$checksums" | shasum -a 256 | awk \'{print $1}\')',
                expectedOutput: 'Variable set (no output)',
                failureInterpretation: 'shasum command failed - check tool availability',
            },
            {
                stepNumber: 8,
                description: 'Display computed integrity hash',
                command: 'echo "Computed: $computed_hash"',
                expectedOutput: `Computed: ${integrityHash}`,
                failureInterpretation: 'Hash mismatch - see step 9 for comparison',
            },
            {
                stepNumber: 9,
                description: 'Extract expected integrity hash from manifest',
                command: "expected_hash=$(jq -r '.integrityHash' verification-manifest.json)",
                expectedOutput: 'Variable set (no output)',
                failureInterpretation: 'verification-manifest.json is malformed',
            },
            {
                stepNumber: 10,
                description: 'Compare computed vs expected integrity hash',
                command: `if [ "$computed_hash" == "$expected_hash" ]; then echo "✅ VERIFIED"; else echo "❌ FAILED"; fi`,
                expectedOutput: '✅ VERIFIED',
                failureInterpretation:
                    '❌ FAILED indicates evidence tampering, incomplete records, or generation error',
            },
        ],
    };
}

/**
 * generateWindowsVerificationSteps: Create Windows PowerShell verification guide
 *
 * PURPOSE:
 * Generate platform-specific verification steps using PowerShell cmdlets.
 *
 * TOOLS REQUIRED:
 * - PowerShell 5.1+ (built-in on Windows 10+)
 * - Expand-Archive cmdlet (built-in)
 * - Get-FileHash cmdlet (built-in)
 *
 * @param integrityHash - Expected integrity hash from ledger
 * @returns PlatformVerificationGuide for Windows
 */
export function generateWindowsVerificationSteps(
    integrityHash: string,
): PlatformVerificationGuide {
    return {
        platform: 'Windows',
        requiredTools: [VerificationTool.POWERSHELL],
        steps: [
            {
                stepNumber: 1,
                description: 'Extract verification package',
                command:
                    'Expand-Archive -Path governance_evidence_ledger_bundle.zip -DestinationPath verification/',
                expectedOutput: 'Archive extracted successfully',
                failureInterpretation: 'Package is corrupted or not a valid ZIP file',
            },
            {
                stepNumber: 2,
                description: 'Navigate to extracted directory',
                command: 'cd verification/',
                expectedOutput: 'Directory changed',
                failureInterpretation: 'Extraction failed in step 1',
            },
            {
                stepNumber: 3,
                description: 'Verify package contents',
                command: 'Get-ChildItem | Select-Object Name',
                expectedOutput:
                    'evidence-checksums.txt, evidence-ledger.json, verification-manifest.json',
                failureInterpretation: 'Package is incomplete - missing required files',
            },
            {
                stepNumber: 4,
                description: 'Load ledger JSON',
                command: '$ledger = Get-Content evidence-ledger.json | ConvertFrom-Json',
                expectedOutput: 'JSON loaded (no output)',
                failureInterpretation: 'evidence-ledger.json is malformed or missing',
            },
            {
                stepNumber: 5,
                description: 'Extract checksums from ledger',
                command: '$checksums = $ledger.records | ForEach-Object { $_.checksum }',
                expectedOutput: 'Array populated (no output)',
                failureInterpretation: 'Ledger records are missing or malformed',
            },
            {
                stepNumber: 6,
                description: 'Concatenate checksums with pipe separator',
                command: '$concatenated = $checksums -join "|"',
                expectedOutput: 'String concatenated (no output)',
                failureInterpretation: 'PowerShell syntax error',
            },
            {
                stepNumber: 7,
                description: 'Compute integrity hash using SHA-256',
                command:
                    '$stream = [System.IO.MemoryStream]::new([System.Text.Encoding]::UTF8.GetBytes($concatenated)); $computed_hash = (Get-FileHash -InputStream $stream -Algorithm SHA256).Hash.ToLower()',
                expectedOutput: 'Hash computed (no output)',
                failureInterpretation: 'Get-FileHash cmdlet failed - check PowerShell version',
            },
            {
                stepNumber: 8,
                description: 'Display computed integrity hash',
                command: 'Write-Host "Computed: $computed_hash"',
                expectedOutput: `Computed: ${integrityHash}`,
                failureInterpretation: 'Hash mismatch - see step 10 for comparison',
            },
            {
                stepNumber: 9,
                description: 'Load manifest and extract expected hash',
                command:
                    '$manifest = Get-Content verification-manifest.json | ConvertFrom-Json; $expected_hash = $manifest.integrityHash',
                expectedOutput: 'Manifest loaded (no output)',
                failureInterpretation: 'verification-manifest.json is malformed',
            },
            {
                stepNumber: 10,
                description: 'Compare computed vs expected integrity hash',
                command:
                    'if ($computed_hash -eq $expected_hash) { Write-Host "✅ VERIFIED" } else { Write-Host "❌ FAILED" }',
                expectedOutput: '✅ VERIFIED',
                failureInterpretation:
                    '❌ FAILED indicates evidence tampering, incomplete records, or generation error',
            },
        ],
    };
}

/**
 * generateVerificationManifest: Create complete verification manifest
 *
 * PURPOSE:
 * Generate self-contained verification manifest with platform-specific
 * instructions for independent third-party validation.
 *
 * @param ledgerId - Ledger identifier from Phase 1
 * @param integrityHash - Merkle-root-style integrity hash from Phase 1
 * @param totalRecords - Total number of evidence records
 * @param generatedAt - Generation timestamp (hour-truncated)
 * @param packageContents - Inventory of files in package
 * @returns Complete VerificationManifest
 */
export function generateVerificationManifest(
    ledgerId: string,
    integrityHash: string,
    totalRecords: number,
    generatedAt: string,
    packageContents: PackageFile[],
): VerificationManifest {
    // Generate deterministic manifest ID
    const manifestId = require('crypto')
        .createHash('sha256')
        .update(`${ledgerId}|${generatedAt}|${totalRecords}|${integrityHash}`)
        .digest('hex');

    return {
        manifestId,
        generatedAt,
        ledgerId,
        integrityHash,
        totalRecords,
        hashAlgorithm: 'SHA-256',
        verificationGuides: [
            generateLinuxMacOSVerificationSteps(integrityHash),
            generateWindowsVerificationSteps(integrityHash),
        ],
        packageContents,
        threatModelLimitations: [...THREAT_MODEL_LIMITATIONS],
        mandatoryDisclaimer: VERIFICATION_MANIFEST_DISCLAIMER,
        schemaVersion: VERIFICATION_MANIFEST_SCHEMA_VERSION,
    };
}
