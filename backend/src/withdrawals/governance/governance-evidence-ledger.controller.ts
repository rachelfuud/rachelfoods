/**
 * SPRINT 20 – PHASE 1: Governance Evidence Ledger Controller
 *
 * PURPOSE:
 * Provide READ-ONLY API for generating governance evidence ledger.
 * Returns cryptographically verifiable proof chain of all governance
 * artifacts (Sprints 11-19) for regulator dialogue, audit support,
 * and legal discovery.
 *
 * ENDPOINT:
 * GET /api/admin/governance/evidence-ledger
 *
 * RBAC:
 * PLATFORM_ADMIN only (highest governance access level)
 *
 * QUALITY GATES:
 * - READ-ONLY (no state changes, no persistence)
 * - Deterministic (same governance state → identical hash)
 * - Comprehensive API documentation (use cases, verification workflow)
 * - Advisory positioning (cryptographic proof, not legal guarantee)
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { GovernanceEvidenceLedgerService } from './governance-evidence-ledger.service';
import { GovernanceEvidenceLedger } from './governance-evidence-ledger.types';

@ApiTags('Governance Evidence Ledger (READ-ONLY)')
@Controller('api/admin/governance')
export class GovernanceEvidenceLedgerController {
    constructor(
        private readonly evidenceLedgerService: GovernanceEvidenceLedgerService,
    ) { }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET EVIDENCE LEDGER
    // ═══════════════════════════════════════════════════════════════════════════

    @Get('evidence-ledger')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Get governance evidence ledger (cryptographic proof chain)',
        description: `
**PURPOSE**:
Generate immutable, READ-ONLY governance evidence ledger that cryptographically
links all governance artifacts from Sprints 11-19 into a verifiable proof chain
suitable for regulators, auditors, and legal discovery.

This endpoint answers the question:
→ "How can we *prove* that our governance artifacts are complete, untampered,
   internally consistent, and historically traceable?"

---

**USE CASES**:

1. **Regulator Dialogue**:
   - Question: "Can you prove your governance artifacts are complete and untampered?"
   - Answer: Evidence ledger with integrityHash for independent verification

2. **Audit Support**:
   - Question: "How do we validate governance artifact consistency?"
   - Answer: Recompute checksums from canonical JSON, compare to ledger

3. **Legal Discovery**:
   - Question: "What governance controls existed at time T?"
   - Answer: Hour-truncated evidence records with deterministic IDs

4. **Internal Verification**:
   - Question: "Has any governance artifact been modified since generation?"
   - Answer: Compare current checksums to ledger checksums

5. **Compliance Reporting**:
   - Question: "What is the complete inventory of governance capabilities?"
   - Answer: Evidence records covering timeline, gaps, attributions, remediation, roadmap

---

**ARTIFACT COVERAGE** (Sprints 11-19):

| **Artifact Type**       | **Source Sprint** | **Source Service**                  | **Count** |
|-------------------------|-------------------|-------------------------------------|-----------|
| TIMELINE_EVENT          | 19                | GovernanceTimelineService           | ~10       |
| CONTROL_GAP             | 17                | ControlGapService                   | ~6        |
| GAP_ATTRIBUTION         | 19                | GovernanceAttributionService        | ~6        |
| REMEDIATION_ACTION      | 19                | GovernanceRemediationService        | ~6        |
| GOVERNANCE_ROADMAP      | 19                | GovernanceRoadmapService            | ~3        |
| POLICY_EVALUATION       | 18                | PolicyEngineService                 | ~1        |
| POLICY_DRIFT            | 18                | PolicyDriftService                  | ~1        |
| ATTESTATION_SNAPSHOT    | 17                | GovernanceAttestationService        | ~1        |

**Total Records**: ~34 evidence records

---

**CRYPTOGRAPHIC PROOF MECHANISM**:

1. **Per-Record Checksum**:
   - Canonical JSON serialization (sorted keys, no whitespace)
   - SHA-256 hash of canonical artifact content
   - recordId = SHA-256(artifactType + artifactId + sourceSprint + hour_timestamp)

2. **Parent-Child Linkage**:
   - Each record references parent recordIds (logical dependencies)
   - Examples:
     * GAP_ATTRIBUTION → CONTROL_GAP
     * REMEDIATION_ACTION → GAP_ATTRIBUTION
     * GOVERNANCE_ROADMAP → REMEDIATION_ACTION

3. **Integrity Hash** (Merkle-Root-Style):
   - integrityHash = SHA-256(concatenated_checksums_in_ledger_order)
   - Single hash representing entire ledger state
   - Any change to any artifact → different integrityHash

4. **Deterministic Ordering**:
   - Records sorted by: sourceSprint → artifactType priority → artifactId
   - Same governance state → identical ledger order → identical integrityHash

---

**VERIFICATION WORKFLOW** (Independent Validation):

\`\`\`bash
# Step 1: Fetch ledger JSON
curl -H "Authorization: Bearer $TOKEN" \\
     https://api.example.com/api/admin/governance/evidence-ledger > ledger.json

# Step 2: Extract checksums in ledger order
jq -r '.records[].checksum' ledger.json > checksums.txt

# Step 3: Concatenate checksums with | separator
checksums=$(cat checksums.txt | tr '\\n' '|' | sed 's/|$//')

# Step 4: Compute integrity hash
computed_hash=$(echo -n "$checksums" | shasum -a 256 | awk '{print $1}')

# Step 5: Extract ledger integrityHash
ledger_hash=$(jq -r '.integrityHash' ledger.json)

# Step 6: Compare
if [ "$computed_hash" == "$ledger_hash" ]; then
  echo "✅ Ledger integrity VERIFIED"
else
  echo "❌ Ledger integrity FAILED - investigate immediately"
fi
\`\`\`

**Per-Record Verification**:
\`\`\`bash
# Extract individual record
jq '.records[0]' ledger.json > record.json

# Fetch original artifact from source service
curl -H "Authorization: Bearer $TOKEN" \\
     https://api.example.com/api/admin/governance/timeline > timeline.json

# Extract specific artifact
jq '.events[] | select(.eventId == "event_001")' timeline.json > artifact.json

# Canonicalize (sort keys, no whitespace)
canonical=$(jq -S -c '.' artifact.json)

# Compute checksum
computed_checksum=$(echo -n "$canonical" | shasum -a 256 | awk '{print $1}')

# Compare to record checksum
record_checksum=$(jq -r '.checksum' record.json)

if [ "$computed_checksum" == "$record_checksum" ]; then
  echo "✅ Record checksum VERIFIED"
else
  echo "❌ Record checksum MISMATCH - artifact may be tampered"
fi
\`\`\`

---

**MANDATORY DISCLAIMER**:

This evidence ledger provides **cryptographic proof of governance artifact
completeness and internal consistency at generation time**.

It does NOT constitute:
- ❌ Blockchain / distributed ledger
- ❌ Legal guarantee / notarization
- ❌ External validation / timestamping authority
- ❌ Tamper-proof storage system
- ❌ Persistent database / audit trail

**Tamper Resistance Requirements**:
Actual tamper resistance requires external controls:
- Version control systems (Git)
- Backup systems (immutable backups)
- Audit logs (access tracking)
- Access controls (RBAC enforcement)
- Organizational policies (change management)

**Intended Use**:
- Internal governance verification
- Regulator dialogue and evidence presentation
- Audit support and compliance reporting
- Legal discovery and evidence preservation
- Executive certification and board reporting

**NOT Intended For**:
- Legal proof of compliance (requires external validation)
- Tamper-proof audit trail (requires persistent storage)
- Blockchain-style immutability (no distributed consensus)
- Automated enforcement (advisory-only positioning)

---

**EXAMPLE RESPONSE**:

\`\`\`json
{
  "ledgerId": "8f3e9d2a1b4c5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
  "generatedAt": "2026-01-06T14:00:00.000Z",
  "totalRecords": 34,
  "records": [
    {
      "recordId": "rec_001_timeline_event",
      "artifactType": "TIMELINE_EVENT",
      "artifactId": "event_001",
      "sourceSprint": 19,
      "generatedAt": "2026-01-06T14:00:00.000Z",
      "checksum": "a1b2c3d4e5f6...",
      "parentEvidenceIds": [],
      "description": "Timeline event: Geo-Policy CRUD (Sprint 14)",
      "mandatoryDisclaimer": "This evidence record provides cryptographic proof..."
    },
    {
      "recordId": "rec_002_control_gap",
      "artifactType": "CONTROL_GAP",
      "artifactId": "gap_001",
      "sourceSprint": 17,
      "generatedAt": "2026-01-06T14:00:00.000Z",
      "checksum": "b2c3d4e5f6a7...",
      "parentEvidenceIds": [],
      "description": "Control gap: Withdrawal Velocity Monitoring (Severity: HIGH)",
      "mandatoryDisclaimer": "This evidence record provides cryptographic proof..."
    },
    {
      "recordId": "rec_003_gap_attribution",
      "artifactType": "GAP_ATTRIBUTION",
      "artifactId": "attribution_001",
      "sourceSprint": 19,
      "generatedAt": "2026-01-06T14:00:00.000Z",
      "checksum": "c3d4e5f6a7b8...",
      "parentEvidenceIds": ["rec_002_control_gap"],
      "description": "Gap attribution: SIGNAL_GAP (2 gaps)",
      "mandatoryDisclaimer": "This evidence record provides cryptographic proof..."
    }
  ],
  "integrityHash": "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
  "verificationInstructions": [
    "1. Fetch ledger JSON via API: GET /api/admin/governance/evidence-ledger",
    "2. Extract checksums in ledger order: jq -r '.records[].checksum' ledger.json",
    "3. Concatenate checksums with | separator (no trailing pipe)",
    "4. Compute SHA-256 of concatenated checksums: echo -n \\"$checksums\\" | shasum -a 256",
    "5. Compare computed hash to ledger.integrityHash",
    "6. If match → ledger is internally consistent and untampered",
    "7. If mismatch → ledger has been corrupted or tampered (investigate immediately)",
    "8. For individual record verification: recompute checksum from canonical JSON of artifact content"
  ],
  "mandatoryDisclaimer": "This evidence ledger provides cryptographic proof of governance artifact completeness and internal consistency at generation time. It does NOT constitute a blockchain, legal guarantee, external validation, notarization, or tamper-proof storage system..."
}
\`\`\`

---

**NON-GOALS** (What This API Does NOT Do):

| **Non-Goal** | **Why Excluded** | **Alternative** |
|--------------|------------------|-----------------|
| ❌ Persistence | Ledger is ephemeral (generated on-demand) | Export to backup system |
| ❌ Blockchain | No distributed consensus or immutability | Use Git for version control |
| ❌ Notarization | No external timestamping authority | Use third-party notary if needed |
| ❌ Enforcement | No remediation or execution mandates | Use Sprint 19 roadmap for planning |
| ❌ Legal Guarantee | No external validation or legal standing | Consult legal counsel for compliance |

---

**REGULATORY POSITIONING**:

This ledger provides **internal proof of governance artifact consistency**
for regulator dialogue, audit support, and legal discovery.

It is NOT:
- A substitute for external audit (requires independent auditor review)
- A legal guarantee of compliance (requires legal counsel validation)
- A tamper-proof system (requires organizational controls)
- An enforcement mechanism (advisory-only positioning)

**Regulator Question → Ledger Answer**:
- "Can you prove governance artifacts are complete?" → Yes (34 records covering Sprints 11-19)
- "Can you prove artifacts are untampered?" → Yes (integrityHash + verification workflow)
- "Can you prove internal consistency?" → Yes (parent-child linkages + checksums)
- "Can you prove historical traceability?" → Yes (sourceSprint + hour-truncated timestamps)

**What Regulator CANNOT Conclude from Ledger Alone**:
- Legal compliance (requires legal review)
- Operational effectiveness (requires outcome analysis)
- External validation (requires third-party audit)
- Tamper-proof storage (requires organizational controls)
`,
    })
    @ApiResponse({
        status: 200,
        description: 'Evidence ledger generated successfully',
        type: Object,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - PLATFORM_ADMIN role required',
    })
    async getEvidenceLedger(): Promise<GovernanceEvidenceLedger> {
        return this.evidenceLedgerService.generateEvidenceLedger();
    }
}
