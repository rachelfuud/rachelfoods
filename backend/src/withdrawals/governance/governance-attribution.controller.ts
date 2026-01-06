import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GovernanceAttributionService } from './governance-attribution.service';
import { GovernanceAttributionReport } from './governance-attribution.types';

/**
 * SPRINT 19 – PHASE 2: Governance Attribution Controller
 * 
 * PURPOSE:
 * READ-ONLY API for gap-to-timeline attribution analysis.
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no state changes)
 * - PLATFORM_ADMIN only
 * - DETERMINISTIC (same gaps → same attributions)
 * - ADVISORY-ONLY (no remediation automation)
 * 
 * USAGE:
 * - Executive understanding of gap origins
 * - Regulator audit explainability
 * - Board reporting on governance weaknesses
 * - Remediation planning context
 * 
 * QUALITY STANDARD:
 * Regulator-grade gap attribution suitable for audit evidence.
 */
@ApiTags('Governance')
@Controller('api/admin/governance/attribution')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class GovernanceAttributionController {
    private readonly logger = new Logger(GovernanceAttributionController.name);

    constructor(
        private readonly governanceAttributionService: GovernanceAttributionService
    ) { }

    /**
     * Get Governance Gap Attribution Report
     * 
     * Returns deterministic mapping from control gaps to timeline events.
     * 
     * GAP ATTRIBUTION:
     * Maps each control gap (Sprint 17 Phase 2) to:
     * - Relevant timeline events (Sprint 19 Phase 1)
     * - Root cause category (6 categories)
     * - Factual explanation
     * - Non-prescriptive remediation context
     * 
     * ROOT CAUSE CATEGORIES:
     * 1. SIGNAL_COVERAGE: Missing/incomplete governance signal detection
     * 2. ESCALATION_VISIBILITY: Insufficient escalation routing/monitoring
     * 3. DECISION_TRACEABILITY: Inadequate decision capture/audit trail
     * 4. POLICY_DEFINITION: Missing/incomplete policy definitions
     * 5. POLICY_ENFORCEMENT_GUARDRAIL: Weak policy enforcement/guardrails
     * 6. OBSERVABILITY_SATURATION: Insufficient observability/alert coverage
     * 
     * ATTRIBUTION RULES (Static, Explainable):
     * - RISK_COVERAGE gaps → SIGNAL_COVERAGE (Sprints 11, 15, 16)
     * - ESCALATION_VISIBILITY gaps → ESCALATION_VISIBILITY (Sprints 16, 17)
     * - ADMIN_DECISION_TRACEABILITY gaps → DECISION_TRACEABILITY (Sprint 17)
     * - INCIDENT_RESPONSE_CAPABILITY gaps → SIGNAL_COVERAGE (Sprints 15, 16)
     * - POLICY_SIMULATION gaps → POLICY_DEFINITION (Sprints 17, 18)
     * - AUTOMATION_SAFETY_GUARDRAILS gaps → POLICY_ENFORCEMENT_GUARDRAIL (Sprints 17, 18)
     * 
     * DETERMINISM GUARANTEE:
     * attributionId = SHA-256(gapId + rootCauseCategory + sorted_eventIds)
     * Same gaps + timeline → same attributions
     * 
     * USE CASES:
     * 1. Executive Gap Understanding
     *    - "Why do we have this gap?"
     *    - Purpose: Board-level governance weakness explainability
     * 
     * 2. Regulator Audit Explainability
     *    - "Show evidence of gap origin and remediation planning"
     *    - Purpose: Compliance audit evidence with timeline traceability
     * 
     * 3. Remediation Planning Context
     *    - "What capabilities address this gap?"
     *    - Purpose: Informed gap remediation prioritization
     * 
     * 4. Board Reporting
     *    - "What are root causes of remaining governance weaknesses?"
     *    - Purpose: Strategic governance investment justification
     * 
     * 5. Gap Trend Analysis
     *    - "How have gaps evolved as capabilities were delivered?"
     *    - Purpose: Validate governance maturity progression
     * 
     * MANDATORY DISCLAIMER:
     * Attributions are explanatory mappings only — NOT findings, enforcement, or compliance certification.
     * 
     * RBAC:
     * PLATFORM_ADMIN only (gap attribution contains sensitive governance information)
     * 
     * ADVISORY POSITIONING:
     * This endpoint does NOT:
     * - Certify compliance
     * - Authorize remediation automation
     * - Replace human governance judgment
     * - Trigger enforcement actions
     * 
     * RELATIONSHIP TO OTHER SPRINTS:
     * - Sprint 17 Phase 2: Control gap detection (gap inputs)
     * - Sprint 18 Phase 1-2: Policy evaluation + drift (policy gap context)
     * - Sprint 19 Phase 1: Governance timeline (event source)
     * - Sprint 19 Phase 2: Gap-to-timeline attribution (THIS PHASE)
     * 
     * INTEGRATION:
     * Gap attribution provides "why" for Sprint 17 control gaps.
     * Timeline (Phase 1) provides "what happened."
     * Attribution (Phase 2) provides "why gaps exist."
     * Together: complete governance explainability narrative.
     */
    @Get()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Get governance gap attribution report',
        description: `
      Returns deterministic mapping from control gaps to timeline events with root cause analysis.
      
      **Gap Attribution:**
      Maps each control gap (Sprint 17 Phase 2) to relevant timeline events (Sprint 19 Phase 1)
      with root cause category, explanation, and remediation context.
      
      **Root Cause Categories:**
      1. SIGNAL_COVERAGE: Missing/incomplete governance signal detection
      2. ESCALATION_VISIBILITY: Insufficient escalation routing/monitoring
      3. DECISION_TRACEABILITY: Inadequate decision capture/audit trail
      4. POLICY_DEFINITION: Missing/incomplete policy definitions
      5. POLICY_ENFORCEMENT_GUARDRAIL: Weak policy enforcement/guardrails
      6. OBSERVABILITY_SATURATION: Insufficient observability/alert coverage
      
      **Attribution Rules (Static):**
      - RISK_COVERAGE gaps → SIGNAL_COVERAGE (Sprints 11, 15, 16)
      - ESCALATION_VISIBILITY gaps → ESCALATION_VISIBILITY (Sprints 16, 17)
      - ADMIN_DECISION_TRACEABILITY gaps → DECISION_TRACEABILITY (Sprint 17)
      - INCIDENT_RESPONSE_CAPABILITY gaps → SIGNAL_COVERAGE (Sprints 15, 16)
      - POLICY_SIMULATION gaps → POLICY_DEFINITION (Sprints 17, 18)
      - AUTOMATION_SAFETY_GUARDRAILS gaps → POLICY_ENFORCEMENT_GUARDRAIL (Sprints 17, 18)
      
      **Determinism:**
      attributionId = SHA-256(gapId + rootCauseCategory + sorted_eventIds)
      Same gaps + timeline → same attributions
      
      **Use Cases:**
      1. Executive gap understanding ("Why do we have this gap?")
      2. Regulator audit explainability (compliance evidence)
      3. Remediation planning context (informed prioritization)
      4. Board reporting (root cause analysis)
      5. Gap trend analysis (maturity progression validation)
      
      **Mandatory Disclaimer:**
      Attributions are explanatory mappings only — NOT findings, enforcement, or compliance certification.
      
      **RBAC:** PLATFORM_ADMIN only
      
      **Response Structure:**
      - maturityStage: Current governance maturity (from Phase 1)
      - attributions[]: Gap-to-timeline mappings (sorted by severity)
      - summary: Aggregated attribution statistics
      - disclaimer: Mandatory advisory positioning
    `,
    })
    @ApiResponse({
        status: 200,
        description: 'Governance attribution report retrieved successfully',
        schema: {
            example: {
                generatedAt: '2026-01-06T16:00:00.000Z',
                maturityStage: 'AUDIT_READY',
                attributions: [
                    {
                        attributionId: 'a1b2c3d4e5f6...',
                        gapId: 'gap-risk-coverage-001',
                        dimension: 'RISK_COVERAGE',
                        severity: 'HIGH',
                        linkedTimelineEvents: [
                            {
                                eventId: 'evt123...',
                                sourceSprint: 11,
                                title: 'Transaction Reconstruction Capability Delivered',
                                relationshipExplanation: 'Sprint 11 introduced capability addressing this gap dimension',
                            },
                            {
                                eventId: 'evt456...',
                                sourceSprint: 16,
                                title: 'Observability Infrastructure Established',
                                relationshipExplanation: 'Sprint 16 established governance signal related to this gap',
                            },
                        ],
                        rootCauseCategory: 'SIGNAL_COVERAGE',
                        explanation: 'Risk coverage gap exists due to incomplete signal detection infrastructure...',
                        remediationContext: 'Consider expanding signal detection coverage in areas where risk visibility is insufficient...',
                    },
                ],
                summary: {
                    totalGaps: 6,
                    gapsBySeverity: {
                        HIGH: 3,
                        MEDIUM: 2,
                        LOW: 1,
                    },
                    gapsByRootCause: {
                        SIGNAL_COVERAGE: 2,
                        ESCALATION_VISIBILITY: 1,
                        DECISION_TRACEABILITY: 1,
                        POLICY_DEFINITION: 1,
                        POLICY_ENFORCEMENT_GUARDRAIL: 1,
                        OBSERVABILITY_SATURATION: 0,
                    },
                    gapsByDimension: {
                        RISK_COVERAGE: 1,
                        ESCALATION_VISIBILITY: 1,
                        ADMIN_DECISION_TRACEABILITY: 1,
                        INCIDENT_RESPONSE_CAPABILITY: 1,
                        POLICY_SIMULATION: 1,
                        AUTOMATION_SAFETY_GUARDRAILS: 1,
                    },
                },
                disclaimer: 'Attributions are explanatory mappings only and do NOT constitute findings, enforcement actions, or compliance determinations. This report provides context for gap remediation planning and does NOT authorize automation or certify compliance. Use for audit evidence, executive reporting, and governance planning only.',
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async getGovernanceAttribution(): Promise<GovernanceAttributionReport> {
        this.logger.log('[SPRINT_19_PHASE_2] Generating governance attribution report...');

        // Generate complete gap-to-timeline attribution report
        const report = await this.governanceAttributionService.generateAttributionReport();

        this.logger.log(
            `[SPRINT_19_PHASE_2] Attribution report generated: ` +
            `${report.summary.totalGaps} gaps attributed, ` +
            `${report.summary.gapsBySeverity.HIGH} high severity, ` +
            `maturity stage: ${report.maturityStage}`
        );

        return report;
    }
}
