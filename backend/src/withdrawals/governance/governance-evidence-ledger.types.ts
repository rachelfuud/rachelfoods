/**
 * SPRINT 20 – PHASE 1: Governance Evidence Ledger & Immutable Proof Chain
 *
 * PURPOSE:
 * Introduce an immutable, READ-ONLY GOVERNANCE EVIDENCE LEDGER that
 * cryptographically links all governance artifacts produced so far
 * (Sprints 11–19) into a verifiable proof chain suitable for regulators,
 * auditors, and legal discovery.
 *
 * This module answers the question:
 * → "How can we *prove* that our governance artifacts are complete,
 *    untampered, internally consistent, and historically traceable?"
 *
 * QUALITY GATES:
 * - READ-ONLY (no persistence, no mutation)
 * - Deterministic output (same inputs → identical hash)
 * - SHA-256 everywhere (recordId, checksum, integrityHash)
 * - Canonical JSON serialization (sorted keys, stable ordering)
 * - Mandatory disclaimers (cryptographic proof, not legal guarantee)
 * - PLATFORM_ADMIN RBAC (API access control)
 *
 * NON-GOALS (Explicit):
 * - ❌ No blockchain / distributed ledger
 * - ❌ No notarization / timestamping authority
 * - ❌ No persistence / database storage
 * - ❌ No enforcement / remediation
 * - ❌ No external API integration
 *
 * REGULATORY POSITIONING:
 * This ledger provides *cryptographic proof of internal consistency*
 * and *artifact completeness*. It does NOT provide legal guarantees,
 * external validation, or tamper-proof storage. Actual tamper resistance
 * requires external controls (backups, audit logs, access controls).
 */

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT TYPE TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ArtifactType: Enumeration of all governance artifacts collected in ledger
 *
 * INITIAL SET (Sprints 11-19):
 * - TIMELINE_EVENT: Governance capability delivered in specific sprint
 * - CONTROL_GAP: Identified governance control weakness
 * - GAP_ATTRIBUTION: Root cause mapping for control gaps
 * - REMEDIATION_ACTION: Proposed improvement action
 * - GOVERNANCE_ROADMAP: Phased improvement sequence
 * - POLICY_EVALUATION: Policy-as-code evaluation result
 * - POLICY_DRIFT: Policy deviation from baseline
 * - ATTESTATION_SNAPSHOT: Executive governance certification
 *
 * EXTENSIBILITY:
 * Future sprints may add additional artifact types (e.g., INCIDENT_REPORT,
 * DECISION_RECORD, ESCALATION_LOG). Each new type requires:
 * 1. Addition to this enum
 * 2. Artifact priority assignment in ARTIFACT_TYPE_PRIORITY
 * 3. Canonical serialization logic in ledger service
 */
export enum GovernanceArtifactType {
    // Sprint 19 Phase 1: Timeline & Maturity
    TIMELINE_EVENT = 'TIMELINE_EVENT',

    // Sprint 17 Phase 2: Control Gaps
    CONTROL_GAP = 'CONTROL_GAP',

    // Sprint 19 Phase 2: Gap Attribution
    GAP_ATTRIBUTION = 'GAP_ATTRIBUTION',

    // Sprint 19 Phase 3: Remediation Forecast
    REMEDIATION_ACTION = 'REMEDIATION_ACTION',

    // Sprint 19 Phase 4: Roadmap Synthesis
    GOVERNANCE_ROADMAP = 'GOVERNANCE_ROADMAP',

    // Sprint 18 Phase 1: Policy Engine
    POLICY_EVALUATION = 'POLICY_EVALUATION',

    // Sprint 18 Phase 2: Policy Drift
    POLICY_DRIFT = 'POLICY_DRIFT',

    // Sprint 17 Phase 4: Attestation
    ATTESTATION_SNAPSHOT = 'ATTESTATION_SNAPSHOT',
}

/**
 * ARTIFACT_TYPE_PRIORITY: Deterministic ordering for artifact types
 *
 * PURPOSE:
 * When sorting evidence records, artifact type serves as secondary sort key
 * (after source sprint). This priority ensures consistent ordering across
 * ledger generations.
 *
 * PRIORITY RATIONALE:
 * 1. TIMELINE_EVENT: Foundational (defines what was built)
 * 2. CONTROL_GAP: Gaps reference timeline capabilities
 * 3. GAP_ATTRIBUTION: Attributions reference gaps
 * 4. REMEDIATION_ACTION: Actions reference attributions
 * 5. GOVERNANCE_ROADMAP: Roadmap references actions
 * 6. POLICY_EVALUATION: Policy evaluations standalone
 * 7. POLICY_DRIFT: Drift references evaluations
 * 8. ATTESTATION_SNAPSHOT: Attestations reference all above
 */
export const ARTIFACT_TYPE_PRIORITY: Record<GovernanceArtifactType, number> = {
    [GovernanceArtifactType.TIMELINE_EVENT]: 1,
    [GovernanceArtifactType.CONTROL_GAP]: 2,
    [GovernanceArtifactType.GAP_ATTRIBUTION]: 3,
    [GovernanceArtifactType.REMEDIATION_ACTION]: 4,
    [GovernanceArtifactType.GOVERNANCE_ROADMAP]: 5,
    [GovernanceArtifactType.POLICY_EVALUATION]: 6,
    [GovernanceArtifactType.POLICY_DRIFT]: 7,
    [GovernanceArtifactType.ATTESTATION_SNAPSHOT]: 8,
};

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE RECORD MODEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GovernanceEvidenceRecord: Single entry in the immutable evidence ledger
 *
 * DETERMINISTIC RECORD ID:
 * recordId = SHA-256(artifactType + artifactId + sourceSprint + hour_truncated_timestamp)
 *
 * CHECKSUM COMPUTATION:
 * checksum = SHA-256(canonical_json_of_artifact_content)
 * - Canonical JSON: Sorted keys, no whitespace, stable serialization
 * - Includes all artifact fields (not metadata like recordId)
 *
 * PARENT-CHILD LINKAGE:
 * - parentEvidenceIds: Array of recordIds that this record logically depends on
 * - Examples:
 *   * GAP_ATTRIBUTION depends on CONTROL_GAP
 *   * REMEDIATION_ACTION depends on GAP_ATTRIBUTION
 *   * GOVERNANCE_ROADMAP depends on REMEDIATION_ACTION
 * - Empty array for foundational artifacts (TIMELINE_EVENT, CONTROL_GAP)
 *
 * HOUR TRUNCATION:
 * - generatedAt truncated to hour boundary (e.g., 2026-01-06T14:00:00.000Z)
 * - Ensures ledger stability within 1-hour window
 * - Same governance state → Same recordId (within 1 hour)
 *
 * ADVISORY POSITIONING:
 * - mandatoryDisclaimer: "This evidence record provides cryptographic proof of
 *   internal consistency at generation time. It does NOT provide legal guarantees,
 *   external validation, notarization, or tamper-proof storage."
 */
export interface GovernanceEvidenceRecord {
    /**
     * Deterministic record identifier
     * SHA-256(artifactType + artifactId + sourceSprint + hour_truncated_timestamp)
     */
    readonly recordId: string;

    /**
     * Type of governance artifact (ENUM)
     */
    readonly artifactType: GovernanceArtifactType;

    /**
     * Original artifact identifier from source system
     * (e.g., gapId, actionId, roadmapId, eventId)
     */
    readonly artifactId: string;

    /**
     * Sprint number where artifact was generated
     * (e.g., 17 for Control Gaps, 19 for Roadmap)
     */
    readonly sourceSprint: number;

    /**
     * Generation timestamp (hour-truncated for stability)
     * ISO 8601 format: 2026-01-06T14:00:00.000Z
     */
    readonly generatedAt: string;

    /**
     * SHA-256 checksum of canonical JSON artifact content
     * Enables independent verification of artifact integrity
     */
    readonly checksum: string;

    /**
     * Array of parent evidence record IDs (logical dependencies)
     * Empty array for foundational artifacts
     */
    readonly parentEvidenceIds: readonly string[];

    /**
     * Human-readable description of artifact
     * Plain English summary for executive/regulator review
     */
    readonly description: string;

    /**
     * Mandatory advisory disclaimer
     * Positioned as cryptographic proof, not legal guarantee
     */
    readonly mandatoryDisclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE LEDGER MODEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GovernanceEvidenceLedger: Complete immutable ledger of all governance artifacts
 *
 * DETERMINISTIC LEDGER ID:
 * ledgerId = SHA-256(total_records + hour_truncated_timestamp + sorted_record_ids)
 *
 * INTEGRITY HASH (Merkle-Root-Style):
 * integrityHash = SHA-256(concatenated_checksums_in_ledger_order)
 * - Provides single hash representing entire ledger state
 * - Any change to any artifact → different integrityHash
 * - Regulator can verify: recompute hash from records, compare to integrityHash
 *
 * DETERMINISTIC ORDERING:
 * Records ordered by:
 * 1. sourceSprint (ascending)
 * 2. artifactType (ARTIFACT_TYPE_PRIORITY)
 * 3. artifactId (lexical ascending)
 *
 * VERIFICATION INSTRUCTIONS:
 * - CLI commands for independent hash verification
 * - JSON export for offline validation
 * - Regulator can reproduce ledger from source artifacts
 *
 * ADVISORY POSITIONING:
 * - Cryptographic proof of internal consistency
 * - NOT: Legal guarantee, external validation, tamper-proof storage
 */
export interface GovernanceEvidenceLedger {
    /**
     * Deterministic ledger identifier
     * SHA-256(total_records + hour_truncated_timestamp + sorted_record_ids)
     */
    readonly ledgerId: string;

    /**
     * Ledger generation timestamp (hour-truncated)
     * ISO 8601 format: 2026-01-06T14:00:00.000Z
     */
    readonly generatedAt: string;

    /**
     * Total number of evidence records in ledger
     */
    readonly totalRecords: number;

    /**
     * Ordered array of evidence records
     * Sorted by: sourceSprint → artifactType priority → artifactId
     */
    readonly records: readonly GovernanceEvidenceRecord[];

    /**
     * Merkle-root-style integrity hash
     * SHA-256(concatenated_checksums_in_ledger_order)
     */
    readonly integrityHash: string;

    /**
     * Verification instructions for regulators/auditors
     * CLI commands and procedures for independent validation
     */
    readonly verificationInstructions: readonly string[];

    /**
     * Mandatory advisory disclaimer
     * Positioned as cryptographic proof, not legal guarantee
     */
    readonly mandatoryDisclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL SERIALIZATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * canonicalJSON: Serialize object to deterministic JSON string
 *
 * PURPOSE:
 * Ensures identical objects always produce identical JSON bytes, which is
 * critical for deterministic hash computation.
 *
 * RULES:
 * - Sort all object keys alphabetically (recursively)
 * - No whitespace (compact representation)
 * - Stable serialization of primitives, arrays, objects
 * - Null handling: serialize as null (not omit)
 *
 * USAGE:
 * const artifact = { gapId: "gap_001", severity: "HIGH", title: "..." };
 * const canonical = canonicalJSON(artifact);
 * const checksum = SHA256(canonical);
 *
 * @param obj - Object to serialize
 * @returns Canonical JSON string (sorted keys, no whitespace)
 */
export function canonicalJSON(obj: any): string {
    if (obj === null || obj === undefined) {
        return JSON.stringify(null);
    }

    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
        const elements = obj.map((item) => canonicalJSON(item));
        return `[${elements.join(',')}]`;
    }

    // Object: sort keys alphabetically
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map((key) => {
        const value = canonicalJSON(obj[key]);
        return `"${key}":${value}`;
    });

    return `{${pairs.join(',')}}`;
}

/**
 * computeSHA256: Compute SHA-256 hash of input string
 *
 * PURPOSE:
 * Deterministic hash computation for recordId, checksum, integrityHash.
 *
 * USAGE:
 * const checksum = computeSHA256(canonicalJSON(artifact));
 * const recordId = computeSHA256(artifactType + artifactId + sourceSprint + timestamp);
 *
 * @param input - String to hash
 * @returns SHA-256 hash (64-character hex string)
 */
export function computeSHA256(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * truncateToHour: Truncate ISO 8601 timestamp to hour boundary
 *
 * PURPOSE:
 * Ensures ledger stability within 1-hour window. Same governance state
 * within the same hour → identical recordId and ledgerId.
 *
 * USAGE:
 * const now = new Date();
 * const hourTruncated = truncateToHour(now); // e.g., 2026-01-06T14:00:00.000Z
 *
 * @param date - Date to truncate
 * @returns ISO 8601 timestamp truncated to hour (e.g., 2026-01-06T14:00:00.000Z)
 */
export function truncateToHour(date: Date): string {
    const truncated = new Date(date);
    truncated.setMinutes(0, 0, 0);
    return truncated.toISOString();
}

/**
 * generateRecordId: Generate deterministic record ID for evidence record
 *
 * PURPOSE:
 * Ensures same artifact always produces same recordId (within 1 hour).
 *
 * FORMULA:
 * recordId = SHA-256(artifactType + artifactId + sourceSprint + hour_truncated_timestamp)
 *
 * USAGE:
 * const recordId = generateRecordId('CONTROL_GAP', 'gap_001', 17, new Date());
 *
 * @param artifactType - Type of artifact
 * @param artifactId - Original artifact ID
 * @param sourceSprint - Sprint number
 * @param timestamp - Generation timestamp
 * @returns Deterministic record ID (SHA-256 hex string)
 */
export function generateRecordId(
    artifactType: GovernanceArtifactType,
    artifactId: string,
    sourceSprint: number,
    timestamp: Date,
): string {
    const hourTruncated = truncateToHour(timestamp);
    const input = `${artifactType}|${artifactId}|${sourceSprint}|${hourTruncated}`;
    return computeSHA256(input);
}

/**
 * generateLedgerId: Generate deterministic ledger ID
 *
 * PURPOSE:
 * Ensures same ledger state always produces same ledgerId (within 1 hour).
 *
 * FORMULA:
 * ledgerId = SHA-256(total_records + hour_truncated_timestamp + sorted_record_ids)
 *
 * USAGE:
 * const ledgerId = generateLedgerId(42, new Date(), recordIds);
 *
 * @param totalRecords - Total number of records
 * @param timestamp - Generation timestamp
 * @param recordIds - Array of record IDs (will be sorted)
 * @returns Deterministic ledger ID (SHA-256 hex string)
 */
export function generateLedgerId(
    totalRecords: number,
    timestamp: Date,
    recordIds: string[],
): string {
    const hourTruncated = truncateToHour(timestamp);
    const sortedIds = [...recordIds].sort().join('|');
    const input = `${totalRecords}|${hourTruncated}|${sortedIds}`;
    return computeSHA256(input);
}

/**
 * computeIntegrityHash: Compute Merkle-root-style integrity hash for ledger
 *
 * PURPOSE:
 * Single hash representing entire ledger state. Any change to any artifact
 * produces different integrityHash.
 *
 * FORMULA:
 * integrityHash = SHA-256(concatenated_checksums_in_ledger_order)
 *
 * USAGE:
 * const checksums = records.map(r => r.checksum);
 * const integrityHash = computeIntegrityHash(checksums);
 *
 * @param checksums - Array of artifact checksums in ledger order
 * @returns Integrity hash (SHA-256 hex string)
 */
export function computeIntegrityHash(checksums: string[]): string {
    const concatenated = checksums.join('|');
    return computeSHA256(concatenated);
}

// ═══════════════════════════════════════════════════════════════════════════
// MANDATORY DISCLAIMERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GOVERNANCE_EVIDENCE_RECORD_DISCLAIMER: Advisory language for evidence records
 *
 * PURPOSE:
 * Position evidence ledger as cryptographic proof of internal consistency,
 * NOT as legal guarantee, external validation, or tamper-proof storage.
 *
 * KEY POINTS:
 * - Cryptographic proof at generation time
 * - No legal guarantees
 * - No external validation / notarization
 * - No tamper-proof storage (requires external controls)
 * - Advisory-only positioning
 */
export const GOVERNANCE_EVIDENCE_RECORD_DISCLAIMER = `
This evidence record provides cryptographic proof of internal consistency at generation time.
It does NOT provide legal guarantees, external validation, notarization, or tamper-proof storage.
Actual tamper resistance requires external controls (backups, audit logs, access controls, version control).
This record is for internal governance verification, regulator dialogue, and audit support only.
`.trim();

/**
 * GOVERNANCE_EVIDENCE_LEDGER_DISCLAIMER: Advisory language for complete ledger
 *
 * PURPOSE:
 * Position evidence ledger as cryptographic proof chain, NOT as blockchain,
 * legal guarantee, or external validation system.
 *
 * KEY POINTS:
 * - Cryptographic proof of completeness and consistency
 * - No blockchain / distributed ledger
 * - No notarization / timestamping authority
 * - No persistence / database (ephemeral READ-ONLY generation)
 * - No enforcement / remediation
 * - Advisory-only positioning
 */
export const GOVERNANCE_EVIDENCE_LEDGER_DISCLAIMER = `
This evidence ledger provides cryptographic proof of governance artifact completeness and internal consistency at generation time.
It does NOT constitute a blockchain, legal guarantee, external validation, notarization, or tamper-proof storage system.
The ledger is ephemeral (generated on-demand, not persisted). Actual tamper resistance requires external controls:
backup systems, audit logs, access controls, version control, and organizational policies.
This ledger is for internal governance verification, regulator dialogue, audit support, and legal discovery only.
It does NOT mandate execution, authorize remediation, or provide operational guarantees.
`.trim();

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LEDGER_VERIFICATION_INSTRUCTIONS: CLI commands for independent validation
 *
 * PURPOSE:
 * Allow regulators, auditors, and legal teams to independently verify
 * ledger integrity without trusting the API response.
 *
 * VERIFICATION WORKFLOW:
 * 1. Export ledger JSON via API
 * 2. Extract individual record checksums
 * 3. Recompute integrityHash from checksums
 * 4. Compare recomputed hash to ledger.integrityHash
 * 5. If match → ledger is internally consistent
 * 6. If mismatch → ledger has been tampered or corrupted
 *
 * EXAMPLE VERIFICATION (using jq + shasum):
 * ```bash
 * # 1. Fetch ledger
 * curl -H "Authorization: Bearer $TOKEN" \
 *      https://api.example.com/api/admin/governance/evidence-ledger > ledger.json
 *
 * # 2. Extract checksums in order
 * jq -r '.records[].checksum' ledger.json > checksums.txt
 *
 * # 3. Concatenate checksums with | separator
 * checksums=$(cat checksums.txt | tr '\n' '|' | sed 's/|$//')
 *
 * # 4. Compute integrity hash
 * computed_hash=$(echo -n "$checksums" | shasum -a 256 | awk '{print $1}')
 *
 * # 5. Compare to ledger.integrityHash
 * ledger_hash=$(jq -r '.integrityHash' ledger.json)
 *
 * if [ "$computed_hash" == "$ledger_hash" ]; then
 *   echo "✅ Ledger integrity VERIFIED"
 * else
 *   echo "❌ Ledger integrity FAILED"
 * fi
 * ```
 */
export const LEDGER_VERIFICATION_INSTRUCTIONS: readonly string[] = [
    '1. Fetch ledger JSON via API: GET /api/admin/governance/evidence-ledger',
    '2. Extract checksums in ledger order: jq -r ".records[].checksum" ledger.json',
    '3. Concatenate checksums with | separator (no trailing pipe)',
    '4. Compute SHA-256 of concatenated checksums: echo -n "$checksums" | shasum -a 256',
    '5. Compare computed hash to ledger.integrityHash',
    '6. If match → ledger is internally consistent and untampered',
    '7. If mismatch → ledger has been corrupted or tampered (investigate immediately)',
    '8. For individual record verification: recompute checksum from canonical JSON of artifact content',
];
