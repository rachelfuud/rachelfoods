/**
 * SPRINT 20 – PHASE 1: Governance Evidence Ledger Assembly Service
 *
 * PURPOSE:
 * Collect all governance artifacts from Sprints 11-19, canonicalize them,
 * compute checksums, establish parent-child linkages, and assemble into
 * an immutable, cryptographically verifiable evidence ledger.
 *
 * RESPONSIBILITIES:
 * - Collect evidence from Sprint 17 (readiness, gaps, automation, attestation)
 * - Collect evidence from Sprint 18 (policy evaluation, drift)
 * - Collect evidence from Sprint 19 (timeline, attribution, remediation, roadmap)
 * - Canonicalize each artifact (sorted keys, stable serialization)
 * - Compute per-record checksums (SHA-256 of canonical JSON)
 * - Establish parent-child linkages (logical dependency chain)
 * - Compute global integrityHash (Merkle-root-style SHA-256)
 * - Order records deterministically (sprint → type priority → artifact ID)
 *
 * QUALITY GATES:
 * - READ-ONLY (no persistence, no mutation)
 * - Deterministic (same inputs → identical ledger → identical hash)
 * - SHA-256 everywhere (recordId, checksum, integrityHash)
 * - Canonical JSON (sorted keys, no whitespace)
 * - No inference (only collect, canonicalize, hash)
 */

import { Injectable } from '@nestjs/common';
import {
    GovernanceEvidenceRecord,
    GovernanceEvidenceLedger,
    GovernanceArtifactType,
    ARTIFACT_TYPE_PRIORITY,
    canonicalJSON,
    computeSHA256,
    truncateToHour,
    generateRecordId,
    generateLedgerId,
    computeIntegrityHash,
    GOVERNANCE_EVIDENCE_RECORD_DISCLAIMER,
    GOVERNANCE_EVIDENCE_LEDGER_DISCLAIMER,
    LEDGER_VERIFICATION_INSTRUCTIONS,
} from './governance-evidence-ledger.types';
import { GovernanceTimelineService } from './governance-timeline.service';
import { ControlGapService } from './control-gap.service';
import { GovernanceAttributionService } from './governance-attribution.service';
import { GovernanceRemediationService } from './governance-remediation.service';
import { GovernanceRoadmapService } from './governance-roadmap.service';
import { PolicyEvaluationService } from './policy-evaluation.service';
import { PolicyDriftService } from './policy-drift.service';
import { GovernanceAttestationService } from './governance-attestation.service';

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT COLLECTION INTERFACES (Internal)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ArtifactCollectionContext: Metadata for artifact collection
 *
 * PURPOSE:
 * Provides context for collecting artifacts from source services.
 * Used internally by ledger assembly logic.
 */
interface ArtifactCollectionContext {
    readonly sourceSprint: number;
    readonly artifactType: GovernanceArtifactType;
    readonly timestamp: Date;
}

/**
 * CollectedArtifact: Raw artifact + metadata before evidence record creation
 *
 * PURPOSE:
 * Intermediate structure holding artifact content and metadata.
 * Used to construct GovernanceEvidenceRecord.
 */
interface CollectedArtifact {
    readonly artifactId: string;
    readonly artifactType: GovernanceArtifactType;
    readonly sourceSprint: number;
    readonly content: any; // Original artifact object
    readonly parentArtifactIds: readonly string[]; // Logical dependencies
    readonly description: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEDGER ASSEMBLY SERVICE
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class GovernanceEvidenceLedgerService {
    constructor(
        private readonly timelineService: GovernanceTimelineService,
        private readonly gapService: ControlGapService,
        private readonly attributionService: GovernanceAttributionService,
        private readonly remediationService: GovernanceRemediationService,
        private readonly roadmapService: GovernanceRoadmapService,
        private readonly policyEvaluationService: PolicyEvaluationService,
        private readonly policyDriftService: PolicyDriftService,
        private readonly attestationService: GovernanceAttestationService,
    ) { }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API: GENERATE EVIDENCE LEDGER
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * generateEvidenceLedger: Assemble complete governance evidence ledger
     *
     * PURPOSE:
     * Main entry point. Collects all governance artifacts from Sprints 11-19,
     * canonicalizes them, computes checksums, establishes linkages, and returns
     * immutable ledger with integrityHash.
     *
     * WORKFLOW:
     * 1. Collect artifacts from all source services (Timeline, Gaps, Attribution, etc.)
     * 2. For each artifact:
     *    - Canonicalize to stable JSON
     *    - Compute checksum (SHA-256)
     *    - Establish parent-child linkages
     *    - Generate evidence record
     * 3. Sort records deterministically (sprint → type → ID)
     * 4. Compute integrityHash (Merkle-root-style)
     * 5. Generate ledgerId
     * 6. Return complete ledger
     *
     * DETERMINISM:
     * Same governance state → identical ledger → identical integrityHash
     * (within 1-hour window due to hour truncation)
     *
     * @returns GovernanceEvidenceLedger - Complete immutable ledger
     */
    async generateEvidenceLedger(): Promise<GovernanceEvidenceLedger> {
        const timestamp = new Date();

        // Step 1: Collect all artifacts from source services
        const collectedArtifacts = await this.collectAllArtifacts(timestamp);

        // Step 2: Convert collected artifacts to evidence records
        const records = this.createEvidenceRecords(collectedArtifacts, timestamp);

        // Step 3: Sort records deterministically
        const sortedRecords = this.sortRecordsDeterministically(records);

        // Step 4: Compute integrityHash
        const checksums = sortedRecords.map((r) => r.checksum);
        const integrityHash = computeIntegrityHash(checksums);

        // Step 5: Generate ledgerId
        const recordIds = sortedRecords.map((r) => r.recordId);
        const ledgerId = generateLedgerId(sortedRecords.length, timestamp, recordIds);

        // Step 6: Assemble complete ledger
        const ledger: GovernanceEvidenceLedger = {
            ledgerId,
            generatedAt: truncateToHour(timestamp),
            totalRecords: sortedRecords.length,
            records: sortedRecords,
            integrityHash,
            verificationInstructions: [...LEDGER_VERIFICATION_INSTRUCTIONS],
            mandatoryDisclaimer: GOVERNANCE_EVIDENCE_LEDGER_DISCLAIMER,
        };

        return ledger;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ARTIFACT COLLECTION (FROM SOURCE SERVICES)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * collectAllArtifacts: Collect all governance artifacts from Sprints 11-19
     *
     * PURPOSE:
     * Query all source services to retrieve governance artifacts.
     *
     * ARTIFACT SOURCES:
     * - Sprint 19 Phase 1: Timeline events (Sprint 11-18 capabilities)
     * - Sprint 17 Phase 2: Control gaps
     * - Sprint 19 Phase 2: Gap attributions
     * - Sprint 19 Phase 3: Remediation actions
     * - Sprint 19 Phase 4: Governance roadmap
     * - Sprint 18 Phase 1: Policy evaluations
     * - Sprint 18 Phase 2: Policy drift
     * - Sprint 17 Phase 4: Attestation snapshots
     *
     * PARALLELIZATION:
     * All artifact collections run in parallel for performance.
     *
     * @param timestamp - Generation timestamp
     * @returns Array of CollectedArtifact
     */
    private async collectAllArtifacts(timestamp: Date): Promise<CollectedArtifact[]> {
        const [
            timelineEvents,
            controlGaps,
            gapAttributions,
            remediationActions,
            roadmapPhases,
            policyEvaluations,
            policyDrifts,
            attestations,
        ] = await Promise.all([
            this.collectTimelineEvents(timestamp),
            this.collectControlGaps(timestamp),
            this.collectGapAttributions(timestamp),
            this.collectRemediationActions(timestamp),
            this.collectRoadmapPhases(timestamp),
            this.collectPolicyEvaluations(timestamp),
            this.collectPolicyDrifts(timestamp),
            this.collectAttestations(timestamp),
        ]);

        return [
            ...timelineEvents,
            ...controlGaps,
            ...gapAttributions,
            ...remediationActions,
            ...roadmapPhases,
            ...policyEvaluations,
            ...policyDrifts,
            ...attestations,
        ];
    }

    /**
     * collectTimelineEvents: Collect timeline events from Sprint 19 Phase 1
     *
     * SOURCE: GovernanceTimelineService
     * ARTIFACT TYPE: TIMELINE_EVENT
     * SOURCE SPRINT: 19
     * PARENT ARTIFACTS: None (foundational)
     */
    private async collectTimelineEvents(timestamp: Date): Promise<CollectedArtifact[]> {
        const timeline = await this.timelineService.generateGovernanceTimeline();

        return timeline.events.map((event) => ({
            artifactId: event.eventId,
            artifactType: GovernanceArtifactType.TIMELINE_EVENT,
            sourceSprint: 19,
            content: event,
            parentArtifactIds: [],
            description: `Timeline event: ${event.title} (Sprint ${event.sourceSprint})`,
        }));
    }

    /**
     * collectControlGaps: Collect control gaps from Sprint 17 Phase 2
     *
     * SOURCE: ControlGapService
     * ARTIFACT TYPE: CONTROL_GAP
     * SOURCE SPRINT: 17
     * PARENT ARTIFACTS: None (foundational)
     */
    private async collectControlGaps(timestamp: Date): Promise<CollectedArtifact[]> {
        const gapReport = await this.gapService.generateControlGapReport();

        return gapReport.gaps.map((gap) => ({
            artifactId: gap.id,
            artifactType: GovernanceArtifactType.CONTROL_GAP,
            sourceSprint: 17,
            content: gap,
            parentArtifactIds: [],
            description: `Control gap: ${gap.description} (Severity: ${gap.severity})`,
        }));
    }

    /**
     * collectGapAttributions: Collect gap attributions from Sprint 19 Phase 2
     *
     * SOURCE: GovernanceAttributionService
     * ARTIFACT TYPE: GAP_ATTRIBUTION
     * SOURCE SPRINT: 19
     * PARENT ARTIFACTS: Control gaps (gapIds)
     */
    private async collectGapAttributions(timestamp: Date): Promise<CollectedArtifact[]> {
        const attributionReport = await this.attributionService.generateAttributionReport();

        return attributionReport.attributions.map((attribution) => ({
            artifactId: attribution.attributionId,
            artifactType: GovernanceArtifactType.GAP_ATTRIBUTION,
            sourceSprint: 19,
            content: attribution,
            parentArtifactIds: [attribution.gapId],
            description: `Gap attribution: ${attribution.rootCauseCategory} (Gap: ${attribution.gapId})`,
        }));
    }

    /**
     * collectRemediationActions: Collect remediation actions from Sprint 19 Phase 3
     *
     * SOURCE: GovernanceRemediationService
     * ARTIFACT TYPE: REMEDIATION_ACTION
     * SOURCE SPRINT: 19
     * PARENT ARTIFACTS: Gap attributions (attributionIds via gapIds)
     */
    private async collectRemediationActions(timestamp: Date): Promise<CollectedArtifact[]> {
        const forecast = await this.remediationService.generateRemediationForecast();

        // Extract actions from forecast
        const actions = forecast.actionsConsidered || [];

        return actions.map((action) => ({
            artifactId: action.actionId,
            artifactType: GovernanceArtifactType.REMEDIATION_ACTION,
            sourceSprint: 19,
            content: action,
            parentArtifactIds: [action.targetGapId],
            description: `Remediation action: ${action.description} (${action.actionCategory})`,
        }));
    }

    /**
     * collectRoadmapPhases: Collect roadmap phases from Sprint 19 Phase 4
     *
     * SOURCE: GovernanceRoadmapService
     * ARTIFACT TYPE: GOVERNANCE_ROADMAP
     * SOURCE SPRINT: 19
     * PARENT ARTIFACTS: Remediation actions (actionIds via phases)
     */
    private async collectRoadmapPhases(timestamp: Date): Promise<CollectedArtifact[]> {
        const roadmap = await this.roadmapService.generateGovernanceRoadmap();

        return roadmap.roadmapPhases.map((phase) => ({
            artifactId: phase.phaseId,
            artifactType: GovernanceArtifactType.GOVERNANCE_ROADMAP,
            sourceSprint: 19,
            content: phase,
            parentArtifactIds: phase.remediationActions.map((a) => a.actionId),
            description: `Roadmap phase ${phase.sequenceOrder}: ${phase.objective.title}`,
        }));
    }

    /**
     * collectPolicyEvaluations: Collect policy evaluations from Sprint 18 Phase 1
     *
     * SOURCE: PolicyEngineService
     * ARTIFACT TYPE: POLICY_EVALUATION
     * SOURCE SPRINT: 18
     * PARENT ARTIFACTS: None (standalone evaluations)
     */
    private async collectPolicyEvaluations(timestamp: Date): Promise<CollectedArtifact[]> {
        // NOTE: PolicyEvaluationService evaluates policies on-demand.
        // For ledger purposes, we collect a deterministic evaluation snapshot.
        // In production, this might query a cache or evaluation history.

        try {
            const evaluation = await this.policyEvaluationService.generatePolicyEvaluationReport();

            // Create a deterministic evaluation ID
            const evaluationId = computeSHA256(`policy_evaluation_${truncateToHour(timestamp)}`);

            return [
                {
                    artifactId: evaluationId,
                    artifactType: GovernanceArtifactType.POLICY_EVALUATION,
                    sourceSprint: 18,
                    content: evaluation,
                    parentArtifactIds: [],
                    description: `Policy evaluation: ${evaluation.results?.length || 0} policies evaluated`,
                },
            ];
        } catch (error) {
            // If policy evaluation fails, return empty array (non-blocking)
            console.warn('Failed to collect policy evaluations for ledger:', error);
            return [];
        }
    }

    /**
     * collectPolicyDrifts: Collect policy drift from Sprint 18 Phase 2
     *
     * SOURCE: PolicyDriftService
     * ARTIFACT TYPE: POLICY_DRIFT
     * SOURCE SPRINT: 18
     * PARENT ARTIFACTS: Policy evaluations (evaluationIds)
     */
    private async collectPolicyDrifts(timestamp: Date): Promise<CollectedArtifact[]> {
        try {
            const driftReport = await this.policyDriftService.generateDriftReport(24); // 24 hours lookback

            // Create deterministic drift report ID
            const driftReportId = computeSHA256(`policy_drift_${truncateToHour(timestamp)}`);

            return [
                {
                    artifactId: driftReportId,
                    artifactType: GovernanceArtifactType.POLICY_DRIFT,
                    sourceSprint: 18,
                    content: driftReport,
                    parentArtifactIds: [],
                    description: `Policy drift report: ${driftReport.drifts.length} drifts detected`,
                },
            ];
        } catch (error) {
            // If drift report fails, return empty array (non-blocking)
            console.warn('Failed to collect policy drift for ledger:', error);
            return [];
        }
    }

    /**
     * collectAttestations: Collect attestation snapshots from Sprint 17 Phase 4
     *
     * SOURCE: GovernanceAttestationService
     * ARTIFACT TYPE: ATTESTATION_SNAPSHOT
     * SOURCE SPRINT: 17
     * PARENT ARTIFACTS: All governance artifacts (attestation references everything)
     */
    private async collectAttestations(timestamp: Date): Promise<CollectedArtifact[]> {
        try {
            const attestation = await this.attestationService.generateAttestationSnapshot('CISO');

            // Create deterministic attestation ID
            const attestationId = computeSHA256(`attestation_${truncateToHour(timestamp)}`);

            return [
                {
                    artifactId: attestationId,
                    artifactType: GovernanceArtifactType.ATTESTATION_SNAPSHOT,
                    sourceSprint: 17,
                    content: attestation,
                    parentArtifactIds: [],
                    description: `Governance attestation: ${attestation.attestedByRole} certification snapshot`,
                },
            ];
        } catch (error) {
            // If attestation fails, return empty array (non-blocking)
            console.warn('Failed to collect attestation for ledger:', error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVIDENCE RECORD CREATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * createEvidenceRecords: Convert collected artifacts to evidence records
     *
     * PURPOSE:
     * For each collected artifact:
     * 1. Canonicalize content (sorted keys, stable JSON)
     * 2. Compute checksum (SHA-256 of canonical JSON)
     * 3. Generate recordId (deterministic)
     * 4. Establish parent-child linkages
     * 5. Create GovernanceEvidenceRecord
     *
     * @param artifacts - Collected artifacts
     * @param timestamp - Generation timestamp
     * @returns Array of GovernanceEvidenceRecord
     */
    private createEvidenceRecords(
        artifacts: CollectedArtifact[],
        timestamp: Date,
    ): GovernanceEvidenceRecord[] {
        // First pass: Create records (need all recordIds for parent linkage)
        const recordMap = new Map<string, GovernanceEvidenceRecord>();

        for (const artifact of artifacts) {
            const recordId = generateRecordId(
                artifact.artifactType,
                artifact.artifactId,
                artifact.sourceSprint,
                timestamp,
            );

            const canonical = canonicalJSON(artifact.content);
            const checksum = computeSHA256(canonical);

            const record: GovernanceEvidenceRecord = {
                recordId,
                artifactType: artifact.artifactType,
                artifactId: artifact.artifactId,
                sourceSprint: artifact.sourceSprint,
                generatedAt: truncateToHour(timestamp),
                checksum,
                parentEvidenceIds: [], // Will populate in second pass
                description: artifact.description,
                mandatoryDisclaimer: GOVERNANCE_EVIDENCE_RECORD_DISCLAIMER,
            };

            recordMap.set(artifact.artifactId, record);
        }

        // Second pass: Establish parent-child linkages
        // Map parent artifact IDs to parent record IDs
        const artifactIdToRecordId = new Map<string, string>();
        for (const [artifactId, record] of recordMap.entries()) {
            artifactIdToRecordId.set(artifactId, record.recordId);
        }

        const recordsWithLinkage: GovernanceEvidenceRecord[] = [];

        for (const artifact of artifacts) {
            const record = recordMap.get(artifact.artifactId);
            if (!record) continue;

            // Map parent artifact IDs to parent record IDs
            const parentEvidenceIds = artifact.parentArtifactIds
                .map((parentArtifactId) => artifactIdToRecordId.get(parentArtifactId))
                .filter((id): id is string => id !== undefined);

            recordsWithLinkage.push({
                ...record,
                parentEvidenceIds,
            });
        }

        return recordsWithLinkage;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETERMINISTIC RECORD SORTING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * sortRecordsDeterministically: Sort evidence records by deterministic rules
     *
     * PURPOSE:
     * Ensure identical ledger ordering across generations. Required for
     * deterministic integrityHash computation.
     *
     * SORT ORDER:
     * 1. sourceSprint (ascending)
     * 2. artifactType (ARTIFACT_TYPE_PRIORITY)
     * 3. artifactId (lexical ascending)
     *
     * @param records - Unsorted evidence records
     * @returns Sorted evidence records
     */
    private sortRecordsDeterministically(
        records: GovernanceEvidenceRecord[],
    ): GovernanceEvidenceRecord[] {
        return [...records].sort((a, b) => {
            // Primary: sourceSprint ascending
            if (a.sourceSprint !== b.sourceSprint) {
                return a.sourceSprint - b.sourceSprint;
            }

            // Secondary: artifactType priority
            const priorityA = ARTIFACT_TYPE_PRIORITY[a.artifactType];
            const priorityB = ARTIFACT_TYPE_PRIORITY[b.artifactType];
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // Tertiary: artifactId lexical
            return a.artifactId.localeCompare(b.artifactId);
        });
    }
}
