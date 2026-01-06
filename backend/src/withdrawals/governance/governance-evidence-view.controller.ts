/**
 * SPRINT 21 – PHASE 1: Regulator/Auditor Evidence Consumption Layer
 * Evidence View Controller
 *
 * PURPOSE:
 * Provide READ-ONLY API endpoint for external reviewers to consume
 * governance evidence in audit-friendly format.
 *
 * DESIGN PRINCIPLES:
 * - READ-ONLY (no state changes)
 * - PLATFORM_ADMIN only (sensitive governance data)
 * - Audience-aware presentation (regulator vs auditor vs board)
 * - Full traceability to source ledger
 *
 * ENDPOINT:
 * GET /api/admin/governance/evidence-view
 *
 * RBAC:
 * PLATFORM_ADMIN (highest governance access)
 */

import { Controller, Get, Query, Logger, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GovernanceEvidenceViewService } from './governance-evidence-view.service';
import {
    EvidenceView,
    EvidenceAudience,
} from './governance-evidence-view.types';

/**
 * GovernanceEvidenceViewController
 *
 * PURPOSE:
 * Expose READ-ONLY endpoint for consuming governance evidence
 * in regulator/auditor/board-friendly format.
 *
 * SECURITY:
 * - PLATFORM_ADMIN role required (highest governance access)
 * - JWT authentication enforced
 * - Rate limiting recommended (external middleware)
 *
 * CONSUMPTION WORKFLOW:
 * 1. PLATFORM_ADMIN requests view for target audience
 * 2. Service assembles view from verified ledger (Sprint 20)
 * 3. Response includes:
 *    - Executive summary metrics
 *    - Section summaries with key findings
 *    - Traceability map (section → recordIds)
 *    - Mandatory disclaimers
 * 4. Reviewer consumes structured view
 * 5. Reviewer drills down to source artifacts via recordIds
 */
@ApiTags('Admin - Governance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller('api/admin/governance')
export class GovernanceEvidenceViewController {
    private readonly logger = new Logger(GovernanceEvidenceViewController.name);

    constructor(
        private readonly viewService: GovernanceEvidenceViewService,
    ) { }

    /**
     * Get governance evidence view
     *
     * PURPOSE:
     * Generate audience-specific presentation of governance evidence.
     *
     * AUDIENCE TYPES:
     * - REGULATOR: Emphasis on control gaps, policy compliance, drift history
     * - AUDITOR: Emphasis on attestations, evidence traceability, verification proof
     * - BOARD: Emphasis on executive summary, roadmap, strategic posture
     *
     * VIEW STRUCTURE:
     * 1. Executive Summary:
     *    - Total artifacts, critical findings, regressions, maturity
     *    - High-level posture without artifact detail
     *
     * 2. Section Summaries:
     *    - Governance Overview (timeline & maturity progression)
     *    - Control Gaps (deficiencies with severity)
     *    - Policy Compliance (evaluation results)
     *    - Drift History (policy changes & regressions)
     *    - Remediation Forecast (planned improvements)
     *    - Roadmap Summary (improvement sequencing)
     *    - Attestation (executive certifications)
     *
     * 3. Traceability Map:
     *    - Section → evidence recordIds mapping
     *    - Enables drill-down to source artifacts
     *    - Critical for audit defensibility
     *
     * CONSUMPTION WORKFLOW:
     * - Regulator reviews section summaries → identifies gaps → traces to artifacts
     * - Auditor reviews attestations → validates evidence → verifies cryptographic proof
     * - Board reviews executive summary → understands posture → reviews roadmap
     *
     * DETERMINISM:
     * Same ledger + same audience → Identical view structure
     *
     * TRACEABILITY:
     * All view content traces back to Sprint 20 evidence ledger:
     * - Each section links to specific recordIds
     * - Reviewers can verify source evidence via ledger API
     * - No view content without ledger backing
     *
     * MANDATORY DISCLAIMER:
     * View is presentation layer, NOT:
     * - Legal opinion or regulatory approval
     * - New analysis or risk assessment
     * - Compliance certification or audit stamp
     *
     * @param audience - Target audience (REGULATOR/AUDITOR/BOARD)
     * @returns Evidence view with section summaries and traceability
     */
    @Get('evidence-view')
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Get governance evidence view for external reviewers',
        description: `
Generate audience-specific presentation of governance evidence from verified ledger.

**PURPOSE:**
Transform cryptographically verified evidence (Sprint 20) into consumable format
for regulators, auditors, and boards WITHOUT creating new evidence or analysis.

**AUDIENCE TYPES:**

REGULATOR:
- Primary focus: Control gaps, policy compliance, drift history
- Secondary focus: Remediation, roadmap, attestation
- Use case: Compliance gap assessment and corrective action review

AUDITOR:
- Primary focus: Attestations, evidence traceability, verification proof
- Secondary focus: Control gaps, policy compliance, drift history
- Use case: Audit trail validation and evidence integrity verification

BOARD:
- Primary focus: Executive summary, roadmap, strategic posture
- Secondary focus: Control gaps, policy compliance, remediation
- Use case: Governance oversight and strategic planning

**VIEW STRUCTURE:**

1. Executive Summary Metrics:
   - Total artifacts, critical findings, regressions detected
   - Current maturity level (ABSENT → REACTIVE → PROACTIVE → PREDICTIVE → OPTIMIZED)
   - Control gaps, remediation actions, roadmap phases, attestations

2. Section Summaries (ordered by audience):
   - Governance Overview: Timeline events and maturity progression
   - Control Gaps: Identified deficiencies with severity classification
   - Policy Compliance: Policy evaluation results and compliance status
   - Drift History: Policy changes, trend analysis, regression detection
   - Remediation Forecast: Planned improvements and impact projections
   - Roadmap Summary: Improvement phases with logical sequencing
   - Attestation: Executive certifications and governance snapshots

3. Traceability Map:
   - Section → evidence recordIds mapping
   - Enables drill-down from summary to source artifacts
   - Critical for audit defensibility

**CONSUMPTION WORKFLOW:**

Step 1: Review Executive Summary
- Understand high-level governance posture
- Identify critical findings and regressions
- Assess current maturity level

Step 2: Navigate Section Summaries
- Jump to sections of interest (based on audience)
- Review key findings per section
- Note artifact counts and severity distribution

Step 3: Drill Down to Source Evidence
- Use traceability map to find specific recordIds
- Query evidence ledger API for artifact details
- Verify cryptographic integrity (Sprint 20 Phase 2)

Step 4: Cross-Reference and Validate
- Trace view claims back to ledger artifacts
- Confirm evidence completeness
- Validate no filtering or hiding

**TRACEABILITY:**
All view content traces to Sprint 20 Governance Evidence Ledger:
- Cryptographically verified (SHA-256 checksums)
- Merkle-root-style integrity hash
- READ-ONLY snapshot at generation time

**MANDATORY DISCLAIMER:**
This view is a PRESENTATION LAYER over verified artifacts.
It does NOT constitute:
- Legal opinion or regulatory approval
- New analysis or risk assessment
- Compliance certification or audit stamp
- Recommendation for action or inaction

**DETERMINISM:**
Same ledger + same audience → Identical view structure
(section ordering may vary, content identical)

**INTENDED USE:**
- Regulator review (compliance gap assessment)
- Auditor examination (evidence traceability)
- Board briefing (governance posture overview)
- Executive certification (attestation support)

**NOT INTENDED FOR:**
- Standalone compliance proof (requires regulatory review)
- Automated approval workflows (requires human judgment)
- Legal proceedings without counsel review
- Real-time operational decisions (snapshot-based)
    `.trim(),
    })
    @ApiQuery({
        name: 'audience',
        required: false,
        enum: EvidenceAudience,
        description: 'Target audience (REGULATOR/AUDITOR/BOARD)',
        example: EvidenceAudience.REGULATOR,
    })
    @ApiResponse({
        status: 200,
        description: 'Evidence view generated successfully',
        type: Object,
        schema: {
            example: {
                viewId: 'abc123...def',
                generatedAt: '2026-01-06T14:00:00.000Z',
                sourceLedgerId: 'def456...ghi',
                audience: 'REGULATOR',
                summaryMetrics: {
                    totalArtifacts: 34,
                    criticalFindings: 3,
                    regressionsDetected: 0,
                    currentMaturity: 'PROACTIVE',
                    totalControlGaps: 8,
                    totalRemediationActions: 5,
                    totalRoadmapPhases: 4,
                    totalAttestations: 2,
                },
                sections: [
                    {
                        section: 'GOVERNANCE_OVERVIEW',
                        title: 'Governance Overview',
                        description: 'Executive summary of governance maturity...',
                        artifactCount: 6,
                        evidenceRecordIds: ['record-1', 'record-2', '...'],
                        keyFindings: [
                            '6 governance timeline events recorded...',
                        ],
                    },
                    '... (more sections)',
                ],
                traceabilityMap: {
                    generatedAt: '2026-01-06T14:00:00.000Z',
                    sourceLedgerId: 'def456...ghi',
                    sectionMappings: {
                        GOVERNANCE_OVERVIEW: ['record-1', 'record-2', '...'],
                        CONTROL_GAPS: ['record-7', 'record-8', '...'],
                        '... (more mappings)': [],
                    },
                    totalArtifactsMapped: 34,
                    unmappedRecordIds: [],
                },
                mandatoryDisclaimer: 'This evidence view is a PRESENTATION LAYER...',
                schemaVersion: '1.0.0',
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Authentication required',
    })
    @ApiResponse({
        status: 403,
        description: 'PLATFORM_ADMIN role required',
    })
    @ApiResponse({
        status: 500,
        description: 'Failed to generate evidence view',
    })
    async getEvidenceView(
        @Query('audience') audience: EvidenceAudience = EvidenceAudience.REGULATOR,
    ): Promise<EvidenceView> {
        this.logger.log(`Evidence view requested for audience: ${audience}`);

        try {
            // Validate audience parameter
            if (
                !Object.values(EvidenceAudience).includes(audience as EvidenceAudience)
            ) {
                throw new Error(
                    `Invalid audience: ${audience}. Must be REGULATOR, AUDITOR, or BOARD`,
                );
            }

            // Generate evidence view
            const view = await this.viewService.generateEvidenceView(audience);

            this.logger.log(
                `Evidence view generated successfully: viewId=${view.viewId}, ` +
                `sections=${view.sections.length}, ` +
                `totalArtifacts=${view.summaryMetrics.totalArtifacts}`,
            );

            return view;
        } catch (error) {
            this.logger.error(
                `Failed to generate evidence view for audience ${audience}`,
                error.stack,
            );
            throw error;
        }
    }
}
