/**
 * SPRINT 21 – PHASE 1: Regulator/Auditor Evidence Consumption Layer
 * Evidence View Type System
 *
 * PURPOSE:
 * Define presentation layer types that map governance evidence into
 * regulator-friendly, audit-consumable sections WITHOUT creating new evidence.
 *
 * DESIGN PRINCIPLES:
 * - Views are PROJECTIONS ONLY (no new data, no new analysis)
 * - All fields trace back to evidence ledger recordIds (full traceability)
 * - Deterministic section ordering (same ledger → same view structure)
 * - Audience-aware emphasis (regulator vs auditor vs board)
 * - Mandatory disclaimers (view ≠ legal opinion, view ≠ approval)
 *
 * QUALITY GATES:
 * - READ-ONLY (no state changes)
 * - Zero new evidence generation
 * - Deterministic output
 * - Full traceability map (viewSection → evidenceRecordIds[])
 * - Mandatory disclaimers
 */

/**
 * EvidenceAudience: Target audience for evidence presentation
 *
 * REGULATOR:
 * - Emphasis on compliance gaps, drift history, remediation forecasts
 * - Focus on control effectiveness and policy adherence
 * - Expects regulatory language and standards references
 *
 * AUDITOR:
 * - Emphasis on attestations, evidence traceability, verification steps
 * - Focus on audit trail completeness and cryptographic proof
 * - Expects evidence lineage and artifact integrity
 *
 * BOARD:
 * - Emphasis on executive summary, maturity progression, roadmap
 * - Focus on high-level posture and strategic initiatives
 * - Expects business-friendly language and trend visualization
 */
export enum EvidenceAudience {
    REGULATOR = 'REGULATOR',
    AUDITOR = 'AUDITOR',
    BOARD = 'BOARD',
}

/**
 * EvidenceSection: Logical grouping of evidence artifacts
 *
 * ORDERING (deterministic):
 * 1. GOVERNANCE_OVERVIEW: Executive summary and maturity snapshot
 * 2. CONTROL_GAPS: Identified gaps with severity and timeline attribution
 * 3. POLICY_COMPLIANCE: Policy evaluation results and drift detection
 * 4. DRIFT_HISTORY: Historical policy changes and compliance trend
 * 5. REMEDIATION_FORECAST: Remediation readiness and impact projections
 * 6. ROADMAP_SUMMARY: Improvement phases and logical sequencing
 * 7. ATTESTATION: Executive certifications and governance snapshots
 */
export enum EvidenceSection {
    GOVERNANCE_OVERVIEW = 'GOVERNANCE_OVERVIEW',
    CONTROL_GAPS = 'CONTROL_GAPS',
    POLICY_COMPLIANCE = 'POLICY_COMPLIANCE',
    DRIFT_HISTORY = 'DRIFT_HISTORY',
    REMEDIATION_FORECAST = 'REMEDIATION_FORECAST',
    ROADMAP_SUMMARY = 'ROADMAP_SUMMARY',
    ATTESTATION = 'ATTESTATION',
}

/**
 * EvidenceSummaryMetrics: High-level metrics for executive consumption
 *
 * PURPOSE:
 * Provide at-a-glance governance posture WITHOUT manual artifact review.
 *
 * DERIVATION:
 * All metrics trace back to evidence ledger artifacts (no new scoring).
 */
export interface EvidenceSummaryMetrics {
    /**
     * Total number of artifacts in evidence ledger
     * Traced from: GovernanceEvidenceLedger.totalRecords
     */
    readonly totalArtifacts: number;

    /**
     * Number of critical findings (HIGH severity gaps)
     * Traced from: CONTROL_GAP artifacts with severity='HIGH'
     */
    readonly criticalFindings: number;

    /**
     * Number of compliance regressions detected
     * Traced from: POLICY_DRIFT artifacts with isRegression=true
     */
    readonly regressionsDetected: number;

    /**
     * Current governance maturity level
     * Traced from: TIMELINE_EVENT artifacts (latest maturity level)
     */
    readonly currentMaturity: 'ABSENT' | 'REACTIVE' | 'PROACTIVE' | 'PREDICTIVE' | 'OPTIMIZED';

    /**
     * Total control gaps identified
     * Traced from: CONTROL_GAP artifacts
     */
    readonly totalControlGaps: number;

    /**
     * Total remediation actions planned
     * Traced from: REMEDIATION_FORECAST artifacts
     */
    readonly totalRemediationActions: number;

    /**
     * Total roadmap phases defined
     * Traced from: ROADMAP_PHASE artifacts
     */
    readonly totalRoadmapPhases: number;

    /**
     * Total attestations recorded
     * Traced from: ATTESTATION artifacts
     */
    readonly totalAttestations: number;
}

/**
 * EvidenceSectionSummary: Summary of artifacts within a section
 *
 * PURPOSE:
 * Provide section-level overview before diving into individual artifacts.
 */
export interface EvidenceSectionSummary {
    /**
     * Section identifier
     */
    readonly section: EvidenceSection;

    /**
     * Human-readable section title
     */
    readonly title: string;

    /**
     * Section description for context
     */
    readonly description: string;

    /**
     * Number of artifacts in this section
     */
    readonly artifactCount: number;

    /**
     * Evidence record IDs that belong to this section
     * CRITICAL for audit traceability
     */
    readonly evidenceRecordIds: readonly string[];

    /**
     * Section-specific key findings (1-3 sentences max)
     * Derived from artifacts, NOT new analysis
     */
    readonly keyFindings: readonly string[];

    /**
     * Severity distribution (for gap-related sections)
     */
    readonly severityDistribution?: {
        readonly HIGH: number;
        readonly MEDIUM: number;
        readonly LOW: number;
    };
}

/**
 * EvidenceArtifactReference: Lightweight reference to ledger artifact
 *
 * PURPOSE:
 * Link view content back to source evidence without duplicating full artifact.
 */
export interface EvidenceArtifactReference {
    /**
     * Evidence record ID from ledger
     */
    readonly recordId: string;

    /**
     * Artifact type from ledger
     */
    readonly artifactType: string;

    /**
     * Artifact timestamp
     */
    readonly timestamp: string;

    /**
     * Brief summary (1 sentence)
     */
    readonly summary: string;

    /**
     * Severity/priority (if applicable)
     */
    readonly severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * TraceabilityMap: Mapping from view sections to evidence record IDs
 *
 * PURPOSE:
 * Enable auditors to trace any view content back to verified ledger artifacts.
 *
 * CRITICAL for audit defensibility:
 * - View claims must be provable via ledger lookup
 * - No view content without ledger backing
 * - Full audit trail from summary → section → artifact → ledger
 */
export interface TraceabilityMap {
    /**
     * View generation timestamp
     */
    readonly generatedAt: string;

    /**
     * Source ledger ID
     */
    readonly sourceLedgerId: string;

    /**
     * Mapping: section → evidence record IDs
     */
    readonly sectionMappings: ReadonlyMap<EvidenceSection, readonly string[]>;

    /**
     * Total artifacts mapped
     */
    readonly totalArtifactsMapped: number;

    /**
     * Unmapped artifacts (should be empty for complete views)
     */
    readonly unmappedRecordIds: readonly string[];
}

/**
 * EvidenceView: Top-level evidence presentation container
 *
 * PURPOSE:
 * Present governance evidence in regulator/auditor/board-consumable format
 * WITHOUT creating new evidence or analysis.
 *
 * STRUCTURE:
 * 1. Executive summary (metrics + high-level findings)
 * 2. Section summaries (organized by EvidenceSection)
 * 3. Traceability map (full audit trail)
 * 4. Mandatory disclaimers
 *
 * DETERMINISM:
 * Same ledger + same audience → Identical view structure
 */
export interface EvidenceView {
    /**
     * View identifier (SHA-256 of ledgerId + audience + generatedAt)
     */
    readonly viewId: string;

    /**
     * View generation timestamp (hour-truncated for stability)
     */
    readonly generatedAt: string;

    /**
     * Source evidence ledger ID (Sprint 20 Phase 1)
     */
    readonly sourceLedgerId: string;

    /**
     * Target audience for this view
     */
    readonly audience: EvidenceAudience;

    /**
     * Executive summary metrics
     */
    readonly summaryMetrics: EvidenceSummaryMetrics;

    /**
     * Section summaries (ordered by EvidenceSection enum)
     */
    readonly sections: readonly EvidenceSectionSummary[];

    /**
     * Traceability map (section → recordIds)
     */
    readonly traceabilityMap: TraceabilityMap;

    /**
     * Mandatory disclaimer text
     */
    readonly mandatoryDisclaimer: string;

    /**
     * View schema version
     */
    readonly schemaVersion: string;
}

/**
 * AudienceEmphasis: Audience-specific presentation emphasis
 *
 * PURPOSE:
 * Configure section ordering and detail level based on audience.
 * SAME DATA, different emphasis only.
 */
export interface AudienceEmphasis {
    /**
     * Target audience
     */
    readonly audience: EvidenceAudience;

    /**
     * Primary sections (top-level focus)
     */
    readonly primarySections: readonly EvidenceSection[];

    /**
     * Secondary sections (supporting context)
     */
    readonly secondarySections: readonly EvidenceSection[];

    /**
     * Section ordering (deterministic)
     */
    readonly sectionOrder: readonly EvidenceSection[];

    /**
     * Detail level (summary vs comprehensive)
     */
    readonly detailLevel: 'SUMMARY' | 'COMPREHENSIVE';
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE VIEW CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EVIDENCE_VIEW_SCHEMA_VERSION: Current view schema version
 *
 * VERSION HISTORY:
 * - 1.0.0: Initial version (Sprint 21 Phase 1)
 */
export const EVIDENCE_VIEW_SCHEMA_VERSION = '1.0.0';

/**
 * EVIDENCE_VIEW_DISCLAIMER: Mandatory advisory language
 *
 * PURPOSE:
 * Position evidence view as presentation layer, NOT:
 * - Legal opinion or regulatory approval
 * - New analysis or risk assessment
 * - Compliance certification or audit stamp
 *
 * REUSED FROM SPRINT 20:
 * Same disclaimer philosophy (internal proof, not external guarantee)
 */
export const EVIDENCE_VIEW_DISCLAIMER = `
This evidence view is a PRESENTATION LAYER over verified governance artifacts.
It does NOT constitute:
- Legal opinion or regulatory approval
- New analysis or risk assessment beyond source evidence
- Compliance certification or audit stamp
- Recommendation for action or inaction

VIEW SCOPE:
✅ Presents verified evidence in consumable format
✅ Groups artifacts by logical sections for review efficiency
✅ Provides traceability to source evidence ledger
✅ Enables cross-reference to cryptographically verified artifacts

VIEW DOES NOT:
❌ Create new evidence or analysis
❌ Modify source evidence content or scoring
❌ Filter or hide evidence from reviewers
❌ Provide legal advice or compliance opinions

EVIDENCE SOURCE:
All content traces back to Sprint 20 Governance Evidence Ledger:
- Cryptographically verified (SHA-256 checksums)
- Merkle-root-style integrity hash
- READ-ONLY snapshot at generation time

INTENDED USE:
- Regulator review (compliance gap assessment)
- Auditor examination (evidence traceability)
- Board briefing (governance posture overview)
- Executive certification (attestation support)

NOT INTENDED FOR:
- Standalone compliance proof (requires regulatory review)
- Automated approval workflows (requires human judgment)
- Legal proceedings without counsel review
- Real-time operational decisions (snapshot-based, not live)

AUDIENCE CUSTOMIZATION:
Views are tailored by audience (REGULATOR/AUDITOR/BOARD) through:
- Section ordering (primary vs secondary emphasis)
- Detail level (summary vs comprehensive)
- Language style (regulatory vs business-friendly)

SAME SOURCE DATA - Different presentation only.
`.trim();

/**
 * SECTION_METADATA: Human-readable section information
 *
 * PURPOSE:
 * Provide consistent titles and descriptions across all views.
 */
export const SECTION_METADATA: Record<EvidenceSection, { title: string; description: string }> = {
    [EvidenceSection.GOVERNANCE_OVERVIEW]: {
        title: 'Governance Overview',
        description: 'Executive summary of governance maturity, capability evolution, and current posture',
    },
    [EvidenceSection.CONTROL_GAPS]: {
        title: 'Control Gaps',
        description: 'Identified control deficiencies with severity classification and timeline attribution',
    },
    [EvidenceSection.POLICY_COMPLIANCE]: {
        title: 'Policy Compliance',
        description: 'Policy evaluation results, compliance status, and policy-as-code verification',
    },
    [EvidenceSection.DRIFT_HISTORY]: {
        title: 'Drift History',
        description: 'Historical policy changes, compliance trend analysis, and regression detection',
    },
    [EvidenceSection.REMEDIATION_FORECAST]: {
        title: 'Remediation Forecast',
        description: 'Remediation readiness assessment, impact projections, and implementation planning',
    },
    [EvidenceSection.ROADMAP_SUMMARY]: {
        title: 'Roadmap Summary',
        description: 'Governance improvement roadmap with logical phase sequencing and gap addressal',
    },
    [EvidenceSection.ATTESTATION]: {
        title: 'Attestation',
        description: 'Executive certifications, governance snapshots, and regulatory evidence packages',
    },
};

/**
 * AUDIENCE_EMPHASIS_PRESETS: Predefined emphasis configurations
 *
 * PURPOSE:
 * Configure section ordering and detail level for each audience type.
 *
 * REGULATOR:
 * - Primary: Control gaps, policy compliance, drift history
 * - Secondary: Remediation, roadmap, attestation
 * - Focus: Compliance deficiencies and corrective action
 *
 * AUDITOR:
 * - Primary: Attestation, control gaps, policy compliance
 * - Secondary: Drift history, remediation, roadmap
 * - Focus: Evidence traceability and verification proof
 *
 * BOARD:
 * - Primary: Governance overview, roadmap, attestation
 * - Secondary: Control gaps, policy compliance, remediation
 * - Focus: Strategic posture and improvement trajectory
 */
export const AUDIENCE_EMPHASIS_PRESETS: Record<EvidenceAudience, AudienceEmphasis> = {
    [EvidenceAudience.REGULATOR]: {
        audience: EvidenceAudience.REGULATOR,
        primarySections: [
            EvidenceSection.CONTROL_GAPS,
            EvidenceSection.POLICY_COMPLIANCE,
            EvidenceSection.DRIFT_HISTORY,
        ],
        secondarySections: [
            EvidenceSection.REMEDIATION_FORECAST,
            EvidenceSection.ROADMAP_SUMMARY,
            EvidenceSection.ATTESTATION,
        ],
        sectionOrder: [
            EvidenceSection.GOVERNANCE_OVERVIEW,
            EvidenceSection.CONTROL_GAPS,
            EvidenceSection.POLICY_COMPLIANCE,
            EvidenceSection.DRIFT_HISTORY,
            EvidenceSection.REMEDIATION_FORECAST,
            EvidenceSection.ROADMAP_SUMMARY,
            EvidenceSection.ATTESTATION,
        ],
        detailLevel: 'COMPREHENSIVE',
    },
    [EvidenceAudience.AUDITOR]: {
        audience: EvidenceAudience.AUDITOR,
        primarySections: [
            EvidenceSection.ATTESTATION,
            EvidenceSection.CONTROL_GAPS,
            EvidenceSection.POLICY_COMPLIANCE,
        ],
        secondarySections: [
            EvidenceSection.DRIFT_HISTORY,
            EvidenceSection.REMEDIATION_FORECAST,
            EvidenceSection.ROADMAP_SUMMARY,
        ],
        sectionOrder: [
            EvidenceSection.GOVERNANCE_OVERVIEW,
            EvidenceSection.ATTESTATION,
            EvidenceSection.CONTROL_GAPS,
            EvidenceSection.POLICY_COMPLIANCE,
            EvidenceSection.DRIFT_HISTORY,
            EvidenceSection.REMEDIATION_FORECAST,
            EvidenceSection.ROADMAP_SUMMARY,
        ],
        detailLevel: 'COMPREHENSIVE',
    },
    [EvidenceAudience.BOARD]: {
        audience: EvidenceAudience.BOARD,
        primarySections: [
            EvidenceSection.GOVERNANCE_OVERVIEW,
            EvidenceSection.ROADMAP_SUMMARY,
            EvidenceSection.ATTESTATION,
        ],
        secondarySections: [
            EvidenceSection.CONTROL_GAPS,
            EvidenceSection.POLICY_COMPLIANCE,
            EvidenceSection.REMEDIATION_FORECAST,
        ],
        sectionOrder: [
            EvidenceSection.GOVERNANCE_OVERVIEW,
            EvidenceSection.ROADMAP_SUMMARY,
            EvidenceSection.ATTESTATION,
            EvidenceSection.CONTROL_GAPS,
            EvidenceSection.POLICY_COMPLIANCE,
            EvidenceSection.REMEDIATION_FORECAST,
            EvidenceSection.DRIFT_HISTORY,
        ],
        detailLevel: 'SUMMARY',
    },
};

/**
 * ARTIFACT_TYPE_TO_SECTION_MAPPING: Map ledger artifact types to view sections
 *
 * PURPOSE:
 * Enable deterministic artifact classification into sections.
 *
 * CRITICAL:
 * This mapping is the ONLY way artifacts enter view sections.
 * No manual assignment, no inference.
 */
export const ARTIFACT_TYPE_TO_SECTION_MAPPING: Record<string, EvidenceSection> = {
    // Sprint 19 Phase 1: Governance Timeline
    TIMELINE_EVENT: EvidenceSection.GOVERNANCE_OVERVIEW,

    // Sprint 19 Phase 2: Gap Attribution
    CONTROL_GAP: EvidenceSection.CONTROL_GAPS,
    GAP_ATTRIBUTION: EvidenceSection.CONTROL_GAPS,

    // Sprint 18: Policy Engine & Drift
    POLICY_EVALUATION: EvidenceSection.POLICY_COMPLIANCE,
    POLICY_DRIFT: EvidenceSection.DRIFT_HISTORY,

    // Sprint 19 Phase 3: Remediation Forecast
    REMEDIATION_FORECAST: EvidenceSection.REMEDIATION_FORECAST,

    // Sprint 19 Phase 4: Roadmap
    ROADMAP_PHASE: EvidenceSection.ROADMAP_SUMMARY,

    // Sprint 17 Phase 4: Attestation
    ATTESTATION: EvidenceSection.ATTESTATION,
};
