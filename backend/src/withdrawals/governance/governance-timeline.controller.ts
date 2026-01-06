import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GovernanceTimelineService } from './governance-timeline.service';
import {
    GovernanceTimelineReport,
    GOVERNANCE_TIMELINE_DISCLAIMER,
} from './governance-timeline.types';
import { assessGovernanceMaturity } from './governance-maturity.util';

/**
 * SPRINT 19 – PHASE 1: Governance Timeline Controller
 * 
 * PURPOSE:
 * READ-ONLY API for governance capability evolution timeline and maturity assessment.
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no state changes)
 * - PLATFORM_ADMIN only
 * - DETERMINISTIC (same codebase → same timeline)
 * - ADVISORY-ONLY (no compliance certification)
 * 
 * USAGE:
 * - Executive board reporting
 * - Regulator audits
 * - Compliance evidence generation
 * - Governance narrative documentation
 * 
 * QUALITY STANDARD:
 * Regulator-grade timeline suitable for audit evidence and board presentations.
 */
@ApiTags('Governance')
@Controller('api/admin/governance/timeline')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class GovernanceTimelineController {
    private readonly logger = new Logger(GovernanceTimelineController.name);

    constructor(
        private readonly governanceTimelineService: GovernanceTimelineService
    ) { }

    /**
     * Get Governance Timeline & Maturity Assessment
     * 
     * Returns chronological view of governance capability evolution from Sprints 11–18.
     * 
     * TIMELINE EVENTS:
     * - CAPABILITY_INTRODUCED: New governance capability delivered
     * - GOVERNANCE_SIGNAL: Observable governance indicator
     * - POLICY_EVALUATION: Policy-as-code evaluation
     * - POLICY_DRIFT: Policy compliance change detection
     * - ATTESTATION: Executive certification
     * 
     * MATURITY STAGES (Rule-Based):
     * - FOUNDATIONAL: Basic signals (reconstruction, observability)
     * - STRUCTURED: Policies + alerts established
     * - GOVERNED: Attestation + gap analysis present
     * - AUDIT_READY: Policy drift + evidence chains complete
     * 
     * DETERMINISM GUARANTEE:
     * Same codebase → same timeline events → same maturity assessment
     * 
     * EVENT ID FORMULA:
     * eventId = SHA-256(category + sourceSprint + title)
     * 
     * USE CASES:
     * 1. Executive Board Reporting
     *    - "Show governance capability evolution over past 6 months"
     *    - Purpose: Board visibility into governance investment ROI
     * 
     * 2. Regulator Audits
     *    - "Provide evidence of governance capability progression"
     *    - Purpose: Demonstrate systematic governance maturity
     * 
     * 3. Compliance Evidence
     *    - "Document governance controls timeline for audit"
     *    - Purpose: Show when capabilities were delivered
     * 
     * 4. Governance Narrative
     *    - "Explain how system became governed"
     *    - Purpose: Provide governance evolution story
     * 
     * 5. Maturity Assessment
     *    - "What is our current governance maturity stage?"
     *    - Purpose: Validate governance investment sufficiency
     * 
     * MANDATORY DISCLAIMER:
     * Timeline reflects capability evolution only — NOT compliance certification.
     * 
     * RBAC:
     * PLATFORM_ADMIN only (governance timeline contains sensitive capability information)
     * 
     * ADVISORY POSITIONING:
     * This endpoint does NOT:
     * - Certify compliance
     * - Authorize automation
     * - Replace human governance judgment
     * - Score or rank governance quality
     * 
     * RELATIONSHIP TO SPRINT 17 ATTESTATION:
     * Timeline provides context for attestation snapshots.
     * Attestation = executive certification of current state
     * Timeline = how current state was achieved
     * 
     * RELATIONSHIP TO SPRINT 18 POLICY DRIFT:
     * Timeline shows capability evolution
     * Policy drift shows compliance posture changes
     * Together: complete governance evolution narrative
     */
    @Get()
    @Roles('PLATFORM_ADMIN')
    @ApiOperation({
        summary: 'Get governance timeline and maturity assessment',
        description: `
      Returns chronological view of governance capability evolution from Sprints 11–18 with maturity assessment.
      
      **Timeline Events:**
      - CAPABILITY_INTRODUCED: New governance capability delivered
      - GOVERNANCE_SIGNAL: Observable governance indicator  
      - POLICY_EVALUATION: Policy-as-code evaluation
      - POLICY_DRIFT: Policy compliance change detection
      - ATTESTATION: Executive certification
      
      **Maturity Stages (Rule-Based):**
      - FOUNDATIONAL: Basic signals (reconstruction, observability)
      - STRUCTURED: Policies + alerts established
      - GOVERNED: Attestation + gap analysis present
      - AUDIT_READY: Policy drift + evidence chains complete
      
      **Event Sourcing:**
      All events map to delivered Sprint capabilities (Sprints 11–18).
      No inference — events reflect what was delivered only.
      
      **Determinism:**
      eventId = SHA-256(category + sourceSprint + title)
      Same codebase → same timeline → same maturity assessment
      
      **Use Cases:**
      1. Executive board reporting (governance evolution narrative)
      2. Regulator audits (capability progression evidence)
      3. Compliance evidence (control timeline documentation)
      4. Governance narrative (how system became governed)
      5. Maturity assessment (governance readiness validation)
      
      **Mandatory Disclaimer:**
      Timeline reflects capability evolution only — NOT compliance certification.
      Does NOT authorize automation or certify regulatory compliance.
      
      **RBAC:** PLATFORM_ADMIN only
      
      **Response Structure:**
      - timeline: Complete chronological event list (oldest first)
      - maturityAssessment: Current stage + rationale + requirements
      - disclaimer: Mandatory advisory positioning
    `,
    })
    @ApiResponse({
        status: 200,
        description: 'Governance timeline and maturity assessment retrieved successfully',
        schema: {
            example: {
                timeline: {
                    generatedAt: '2026-01-06T15:30:00.000Z',
                    events: [
                        {
                            eventId: 'a1b2c3d4e5f6...',
                            timestamp: '2025-09-15T14:00:00.000Z',
                            category: 'CAPABILITY_INTRODUCED',
                            sourceSprint: 11,
                            title: 'Transaction Reconstruction Capability Delivered',
                            description: 'Introduced deterministic transaction reconstruction engine...',
                            evidenceRefs: ['SPRINT_11_TRANSACTION_RECONSTRUCTION.md'],
                            severity: 'INFO',
                        },
                        {
                            eventId: 'f6e5d4c3b2a1...',
                            timestamp: '2025-12-30T16:00:00.000Z',
                            category: 'POLICY_DRIFT',
                            sourceSprint: 18,
                            title: 'Policy Drift Detection System Delivered',
                            description: 'Introduced deterministic policy drift detection with historical comparison...',
                            evidenceRefs: ['SPRINT_18_PHASE_2_POLICY_DRIFT.md'],
                            severity: 'CRITICAL',
                        },
                    ],
                    summary: {
                        totalEvents: 10,
                        byCategory: {
                            CAPABILITY_INTRODUCED: 4,
                            GOVERNANCE_SIGNAL: 3,
                            POLICY_EVALUATION: 1,
                            POLICY_DRIFT: 1,
                            ATTESTATION: 1,
                        },
                        bySeverity: {
                            INFO: 2,
                            WARNING: 5,
                            CRITICAL: 3,
                        },
                    },
                },
                maturityAssessment: {
                    currentStage: 'AUDIT_READY',
                    rationale: [
                        'Policy drift detection system active (Sprint 18 Phase 2)',
                        'Executive attestation snapshots established (Sprint 17 Phase 4)',
                        'Policy-as-code evaluation engine operational (Sprint 18 Phase 1)',
                        'Complete governance evolution tracking with historical comparison',
                        'Full evidence chain from signals → policies → drift → attestation',
                    ],
                    totalEvents: 10,
                    eventsByCategory: {
                        CAPABILITY_INTRODUCED: 4,
                        GOVERNANCE_SIGNAL: 3,
                        POLICY_EVALUATION: 1,
                        POLICY_DRIFT: 1,
                        ATTESTATION: 1,
                    },
                },
                disclaimer: 'This timeline reflects governance capability evolution only. It does NOT certify compliance, authorize automation, or replace human governance judgment. Use this report for audit evidence, board reporting, and regulator narratives only.',
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Access denied - PLATFORM_ADMIN role required',
    })
    async getGovernanceTimeline(): Promise<GovernanceTimelineReport> {
        this.logger.log('[SPRINT_19_PHASE_1] Generating governance timeline report...');

        // Generate complete timeline from Sprint 11–18 capabilities
        const timeline = await this.governanceTimelineService.generateGovernanceTimeline();

        // Assess maturity based on timeline density and coverage
        const maturityAssessment = assessGovernanceMaturity(timeline);

        this.logger.log(
            `[SPRINT_19_PHASE_1] Timeline report generated: ` +
            `${timeline.summary.totalEvents} events, ` +
            `maturity stage: ${maturityAssessment.currentStage}`
        );

        // Return complete governance timeline report
        return {
            timeline,
            maturityAssessment,
            disclaimer: GOVERNANCE_TIMELINE_DISCLAIMER,
        };
    }
}
