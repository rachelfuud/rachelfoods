/**
 * SPRINT 21 – PHASE 1: Regulator/Auditor Evidence Consumption Layer
 * Evidence View Assembly Service
 *
 * PURPOSE:
 * Assemble governance evidence ledger (Sprint 20) into regulator/auditor/board-consumable
 * views WITHOUT creating new evidence or analysis.
 *
 * DESIGN PRINCIPLES:
 * - Views are PROJECTIONS ONLY (no new data)
 * - All content traces back to ledger recordIds (full traceability)
 * - Deterministic section grouping (same ledger → same structure)
 * - Audience-aware ordering (regulator vs auditor vs board)
 * - Zero inference or scoring changes
 *
 * QUALITY GATES:
 * - READ-ONLY (no state changes)
 * - Zero new evidence generation
 * - Deterministic output (same inputs → identical view)
 * - Full traceability map
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { GovernanceEvidenceLedgerService } from './governance-evidence-ledger.service';
import {
    GovernanceEvidenceLedger,
    GovernanceEvidenceRecord,
} from './governance-evidence-ledger.types';
import {
    EvidenceView,
    EvidenceAudience,
    EvidenceSection,
    EvidenceSectionSummary,
    EvidenceSummaryMetrics,
    TraceabilityMap,
    AudienceEmphasis,
    EVIDENCE_VIEW_SCHEMA_VERSION,
    EVIDENCE_VIEW_DISCLAIMER,
    SECTION_METADATA,
    AUDIENCE_EMPHASIS_PRESETS,
    ARTIFACT_TYPE_TO_SECTION_MAPPING,
} from './governance-evidence-view.types';

/**
 * GovernanceEvidenceViewService
 *
 * PURPOSE:
 * Transform verified evidence ledger into consumable views for external reviewers.
 *
 * WORKFLOW:
 * 1. Fetch evidence ledger (Sprint 20 Phase 1)
 * 2. Group artifacts by section (deterministic mapping)
 * 3. Generate section summaries (key findings extraction)
 * 4. Compute summary metrics (aggregate counts)
 * 5. Build traceability map (section → recordIds)
 * 6. Apply audience emphasis (ordering and detail level)
 * 7. Return complete evidence view
 *
 * CRITICAL:
 * This is a LENS, not an analyzer. No new evidence. No new scoring.
 */
@Injectable()
export class GovernanceEvidenceViewService {
    private readonly logger = new Logger(GovernanceEvidenceViewService.name);

    constructor(
        private readonly ledgerService: GovernanceEvidenceLedgerService,
    ) { }

    /**
     * generateEvidenceView: Create evidence view for target audience
     *
     * PURPOSE:
     * Transform ledger into reviewer-consumable format.
     *
     * DETERMINISM:
     * Same ledger + same audience → Identical view structure
     *
     * @param audience - Target audience (REGULATOR/AUDITOR/BOARD)
     * @returns Complete evidence view with traceability
     */
    async generateEvidenceView(
        audience: EvidenceAudience = EvidenceAudience.REGULATOR,
    ): Promise<EvidenceView> {
        this.logger.log(`Generating evidence view for audience: ${audience}`);

        // 1. Fetch verified evidence ledger
        const ledger = await this.ledgerService.generateEvidenceLedger();

        // 2. Generate hour-truncated timestamp for stability
        const generatedAt = this.truncateToHour(new Date());

        // 3. Group artifacts by section
        const sectionGroupings = this.groupArtifactsBySection(ledger);

        // 4. Generate section summaries
        const sections = this.generateSectionSummaries(
            sectionGroupings,
            ledger,
            audience,
        );

        // 5. Compute summary metrics
        const summaryMetrics = this.computeSummaryMetrics(ledger, sectionGroupings);

        // 6. Build traceability map
        const traceabilityMap = this.buildTraceabilityMap(
            sectionGroupings,
            ledger,
            generatedAt,
        );

        // 7. Generate view ID
        const viewId = this.generateViewId(ledger.ledgerId, audience, generatedAt);

        // 8. Apply audience emphasis (section ordering)
        const orderedSections = this.applySectionOrdering(sections, audience);

        this.logger.log(
            `Evidence view generated: viewId=${viewId}, ` +
            `sections=${orderedSections.length}, ` +
            `totalArtifacts=${summaryMetrics.totalArtifacts}`,
        );

        return {
            viewId,
            generatedAt,
            sourceLedgerId: ledger.ledgerId,
            audience,
            summaryMetrics,
            sections: orderedSections,
            traceabilityMap,
            mandatoryDisclaimer: EVIDENCE_VIEW_DISCLAIMER,
            schemaVersion: EVIDENCE_VIEW_SCHEMA_VERSION,
        };
    }

    /**
     * groupArtifactsBySection: Map artifacts to sections
     *
     * PURPOSE:
     * Classify artifacts into logical sections using deterministic mapping.
     *
     * RULES:
     * - Use ARTIFACT_TYPE_TO_SECTION_MAPPING (no manual assignment)
     * - Unmapped artifacts logged as warning (should not happen)
     *
     * @param ledger - Complete evidence ledger
     * @returns Map of section → artifact records
     */
    private groupArtifactsBySection(
        ledger: GovernanceEvidenceLedger,
    ): Map<EvidenceSection, GovernanceEvidenceRecord[]> {
        const groupings = new Map<EvidenceSection, GovernanceEvidenceRecord[]>();

        // Initialize all sections with empty arrays
        Object.values(EvidenceSection).forEach((section) => {
            groupings.set(section, []);
        });

        // Classify artifacts by section
        for (const record of ledger.records) {
            const section = ARTIFACT_TYPE_TO_SECTION_MAPPING[record.artifactType];

            if (section) {
                const sectionRecords = groupings.get(section) || [];
                sectionRecords.push(record);
                groupings.set(section, sectionRecords);
            } else {
                this.logger.warn(
                    `Unmapped artifact type: ${record.artifactType} (recordId: ${record.recordId})`,
                );
            }
        }

        return groupings;
    }

    /**
     * generateSectionSummaries: Create section-level summaries
     *
     * PURPOSE:
     * Provide overview of each section before detailed artifact review.
     *
     * CONTENT:
     * - Artifact count per section
     * - Evidence record IDs (traceability)
     * - Key findings (extracted from artifacts, NOT new analysis)
     * - Severity distribution (for gap-related sections)
     *
     * @param groupings - Section → artifact records map
     * @param ledger - Complete evidence ledger
     * @param audience - Target audience
     * @returns Section summaries
     */
    private generateSectionSummaries(
        groupings: Map<EvidenceSection, GovernanceEvidenceRecord[]>,
        ledger: GovernanceEvidenceLedger,
        audience: EvidenceAudience,
    ): EvidenceSectionSummary[] {
        const summaries: EvidenceSectionSummary[] = [];

        for (const [section, records] of groupings.entries()) {
            const metadata = SECTION_METADATA[section];

            // Extract key findings from artifacts (no new analysis)
            const keyFindings = this.extractKeyFindings(section, records, audience);

            // Compute severity distribution (if applicable)
            const severityDistribution = this.computeSeverityDistribution(records);

            summaries.push({
                section,
                title: metadata.title,
                description: metadata.description,
                artifactCount: records.length,
                evidenceRecordIds: records.map((r) => r.recordId),
                keyFindings,
                severityDistribution: severityDistribution.total > 0 ? severityDistribution : undefined,
            });
        }

        return summaries;
    }

    /**
     * extractKeyFindings: Derive key findings from artifacts
     *
     * PURPOSE:
     * Surface important patterns WITHOUT creating new analysis.
     *
     * RULES:
     * - Findings must trace back to artifact content
     * - No new scoring or interpretation
     * - Maximum 3 findings per section
     *
     * @param section - Section identifier
     * @param records - Artifacts in section
     * @param audience - Target audience
     * @returns Key findings (1-3 sentences)
     */
    private extractKeyFindings(
        section: EvidenceSection,
        records: GovernanceEvidenceRecord[],
        audience: EvidenceAudience,
    ): string[] {
        const findings: string[] = [];

        if (records.length === 0) {
            return ['No artifacts in this section'];
        }

        switch (section) {
            case EvidenceSection.GOVERNANCE_OVERVIEW:
                findings.push(
                    `${records.length} governance timeline events recorded, tracking capability evolution from initial state to current maturity`,
                );
                break;

            case EvidenceSection.CONTROL_GAPS:
                const highSeverityGaps = records.filter((r) =>
                    r.description.includes('Severity: HIGH'),
                ).length;
                findings.push(
                    `${records.length} control gaps identified, including ${highSeverityGaps} high-severity deficiencies requiring immediate attention`,
                );
                break;

            case EvidenceSection.POLICY_COMPLIANCE:
                findings.push(
                    `${records.length} policy evaluation results recorded, capturing compliance status across governance policies`,
                );
                break;

            case EvidenceSection.DRIFT_HISTORY:
                const regressions = records.filter((r) =>
                    r.description.toLowerCase().includes('regression'),
                ).length;
                if (regressions > 0) {
                    findings.push(
                        `${records.length} drift events tracked, including ${regressions} compliance regressions requiring investigation`,
                    );
                } else {
                    findings.push(
                        `${records.length} drift events tracked, with no compliance regressions detected`,
                    );
                }
                break;

            case EvidenceSection.REMEDIATION_FORECAST:
                findings.push(
                    `${records.length} remediation forecasts generated, projecting impact of planned control improvements`,
                );
                break;

            case EvidenceSection.ROADMAP_SUMMARY:
                findings.push(
                    `${records.length} roadmap phases defined, sequencing governance improvements in logical order`,
                );
                break;

            case EvidenceSection.ATTESTATION:
                findings.push(
                    `${records.length} attestations recorded, providing executive certification of governance posture`,
                );
                break;
        }

        return findings;
    }

    /**
     * computeSeverityDistribution: Count artifacts by severity
     *
     * PURPOSE:
     * Provide severity breakdown for gap-related sections.
     *
     * @param records - Artifacts to analyze
     * @returns Severity counts (HIGH/MEDIUM/LOW)
     */
    private computeSeverityDistribution(
        records: GovernanceEvidenceRecord[],
    ): { HIGH: number; MEDIUM: number; LOW: number; total: number } {
        const distribution = { HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };

        for (const record of records) {
            // Parse severity from description (e.g., "Severity: HIGH")
            if (record.description.includes('Severity: HIGH')) {
                distribution.HIGH++;
                distribution.total++;
            } else if (record.description.includes('Severity: MEDIUM')) {
                distribution.MEDIUM++;
                distribution.total++;
            } else if (record.description.includes('Severity: LOW')) {
                distribution.LOW++;
                distribution.total++;
            }
        }

        return distribution;
    }

    /**
     * computeSummaryMetrics: Calculate high-level metrics
     *
     * PURPOSE:
     * Provide at-a-glance governance posture.
     *
     * DERIVATION:
     * All metrics trace back to ledger artifacts (no new scoring).
     *
     * @param ledger - Complete evidence ledger
     * @param groupings - Section → artifact records map
     * @returns Summary metrics
     */
    private computeSummaryMetrics(
        ledger: GovernanceEvidenceLedger,
        groupings: Map<EvidenceSection, GovernanceEvidenceRecord[]>,
    ): EvidenceSummaryMetrics {
        // Total artifacts
        const totalArtifacts = ledger.totalRecords;

        // Critical findings (HIGH severity gaps)
        const gapRecords = groupings.get(EvidenceSection.CONTROL_GAPS) || [];
        const criticalFindings = gapRecords.filter((r) =>
            r.description.includes('Severity: HIGH'),
        ).length;

        // Regressions detected
        const driftRecords = groupings.get(EvidenceSection.DRIFT_HISTORY) || [];
        const regressionsDetected = driftRecords.filter((r) =>
            r.description.toLowerCase().includes('regression'),
        ).length;

        // Current maturity (latest timeline event)
        const timelineRecords =
            groupings.get(EvidenceSection.GOVERNANCE_OVERVIEW) || [];
        const latestMaturity = this.extractLatestMaturity(timelineRecords);

        // Total control gaps
        const totalControlGaps = gapRecords.length;

        // Total remediation actions
        const remediationRecords =
            groupings.get(EvidenceSection.REMEDIATION_FORECAST) || [];
        const totalRemediationActions = remediationRecords.length;

        // Total roadmap phases
        const roadmapRecords = groupings.get(EvidenceSection.ROADMAP_SUMMARY) || [];
        const totalRoadmapPhases = roadmapRecords.length;

        // Total attestations
        const attestationRecords = groupings.get(EvidenceSection.ATTESTATION) || [];
        const totalAttestations = attestationRecords.length;

        return {
            totalArtifacts,
            criticalFindings,
            regressionsDetected,
            currentMaturity: latestMaturity,
            totalControlGaps,
            totalRemediationActions,
            totalRoadmapPhases,
            totalAttestations,
        };
    }

    /**
     * extractLatestMaturity: Get current maturity level from timeline
     *
     * PURPOSE:
     * Find most recent maturity level from timeline events.
     *
     * @param timelineRecords - Timeline event artifacts
     * @returns Latest maturity level
     */
    private extractLatestMaturity(
        timelineRecords: GovernanceEvidenceRecord[],
    ): 'ABSENT' | 'REACTIVE' | 'PROACTIVE' | 'PREDICTIVE' | 'OPTIMIZED' {
        if (timelineRecords.length === 0) {
            return 'ABSENT';
        }

        // Sort by generatedAt descending (most recent first)
        const sorted = [...timelineRecords].sort(
            (a, b) =>
                new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
        );

        // Extract maturity from latest event description
        const latestEvent = sorted[0];
        const description = latestEvent.description;

        // Parse maturity level from description
        // Description format: "Timeline event: <title> (Sprint <n>)"
        // We'll check for maturity keywords in the description
        if (description.toLowerCase().includes('optimized')) {
            return 'OPTIMIZED';
        } else if (description.toLowerCase().includes('predictive')) {
            return 'PREDICTIVE';
        } else if (description.toLowerCase().includes('proactive')) {
            return 'PROACTIVE';
        } else if (description.toLowerCase().includes('reactive')) {
            return 'REACTIVE';
        }

        // Default to REACTIVE if we have timeline events but can't determine maturity
        return 'REACTIVE';
    }

    /**
     * buildTraceabilityMap: Generate section to recordIds mapping
     *
     * PURPOSE:
     * Enable auditors to trace from summary back to specific evidence artifacts.
     *
     * CRITICAL for audit defensibility.
     *
     * @param groupings - Section to artifact records map
     * @param ledger - Complete evidence ledger
     * @returns Complete traceability map
     */
    private buildTraceabilityMap(
        groupings: Map<EvidenceSection, GovernanceEvidenceRecord[]>,
        ledger: GovernanceEvidenceLedger,
        generatedAt: string,
    ): TraceabilityMap {
        const sectionMappings = new Map<EvidenceSection, readonly string[]>();
        let totalArtifactsMapped = 0;

        for (const [section, records] of groupings.entries()) {
            const recordIds = records.map((r) => r.recordId);
            sectionMappings.set(section, recordIds);
            totalArtifactsMapped += recordIds.length;
        }

        // Check for unmapped artifacts
        const allMappedIds = new Set<string>();
        for (const recordIds of sectionMappings.values()) {
            recordIds.forEach((id) => allMappedIds.add(id));
        }

        const unmappedRecordIds = ledger.records
            .filter((r) => !allMappedIds.has(r.recordId))
            .map((r) => r.recordId);

        if (unmappedRecordIds.length > 0) {
            this.logger.warn(
                `${unmappedRecordIds.length} unmapped artifacts: ${unmappedRecordIds.join(', ')}`,
            );
        }

        return {
            generatedAt,
            sourceLedgerId: ledger.ledgerId,
            sectionMappings,
            totalArtifactsMapped,
            unmappedRecordIds,
        };
    }

    /**
     * applySectionOrdering: Order sections by audience emphasis
     *
     * PURPOSE:
     * Present sections in audience-appropriate order.
     * SAME SECTIONS, different ordering only.
     *
     * @param sections - All section summaries
     * @param audience - Target audience
     * @returns Ordered section summaries
     */
    private applySectionOrdering(
        sections: EvidenceSectionSummary[],
        audience: EvidenceAudience,
    ): EvidenceSectionSummary[] {
        const emphasis = AUDIENCE_EMPHASIS_PRESETS[audience];
        const sectionOrder = emphasis.sectionOrder;

        // Sort sections by audience-specific ordering
        return [...sections].sort((a, b) => {
            const aIndex = sectionOrder.indexOf(a.section);
            const bIndex = sectionOrder.indexOf(b.section);
            return aIndex - bIndex;
        });
    }

    /**
     * generateViewId: Create deterministic view identifier
     *
     * PURPOSE:
     * Unique identifier for view instance.
     *
     * FORMULA:
     * SHA-256(ledgerId + audience + generatedAt)
     *
     * @param ledgerId - Source ledger ID
     * @param audience - Target audience
     * @param generatedAt - Generation timestamp
     * @returns View ID (SHA-256 hex)
     */
    private generateViewId(
        ledgerId: string,
        audience: EvidenceAudience,
        generatedAt: string,
    ): string {
        const input = `${ledgerId}|${audience}|${generatedAt}`;
        return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
    }

    /**
     * truncateToHour: Truncate timestamp to hour precision
     *
     * PURPOSE:
     * Remove sub-hour precision for deterministic timestamps.
     *
     * @param date - Full-precision timestamp
     * @returns Hour-truncated ISO 8601 string
     */
    private truncateToHour(date: Date): string {
        const truncated = new Date(date);
        truncated.setMinutes(0, 0, 0);
        return truncated.toISOString();
    }
}
