import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    GovernanceGapAttribution,
    GovernanceAttributionReport,
    GovernanceGapRootCause,
    GapSeverity,
    GovernanceDimension,
    LinkedTimelineEventRef,
    calculateAttributionSummary,
    sortAttributionsBySeverity,
    GOVERNANCE_ATTRIBUTION_DISCLAIMER,
} from './governance-attribution.types';
import { GovernanceTimelineService } from './governance-timeline.service';
import { GovernanceTimelineEvent } from './governance-timeline.types';
import { ControlGapService } from './control-gap.service';
import { assessGovernanceMaturity } from './governance-maturity.util';

/**
 * SPRINT 19 – PHASE 2: Governance Attribution Service
 * 
 * RESPONSIBILITIES:
 * - Map control gaps (Sprint 17 Phase 2) to timeline events (Sprint 19 Phase 1)
 * - Classify gaps by root cause category
 * - Generate evidence-backed gap explanations
 * - Provide non-prescriptive remediation context
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no gap remediation automation)
 * - RULE-BASED (no inference, no ML)
 * - DETERMINISTIC (SHA-256 attribution IDs)
 * - EVIDENCE-BACKED (links to concrete timeline events)
 * 
 * QUALITY STANDARD:
 * Regulator-grade gap explainability suitable for audits.
 */
@Injectable()
export class GovernanceAttributionService {
    private readonly logger = new Logger(GovernanceAttributionService.name);

    constructor(
        private readonly governanceTimelineService: GovernanceTimelineService,
        private readonly controlGapService: ControlGapService
    ) { }

    /**
     * Generate complete governance attribution report
     * 
     * Maps all control gaps to timeline events with root cause analysis.
     * 
     * DETERMINISM GUARANTEE:
     * Same gaps + same timeline → same attributions
     */
    async generateAttributionReport(): Promise<GovernanceAttributionReport> {
        this.logger.log('[SPRINT_19_PHASE_2] Generating governance attribution report...');

        // Get governance timeline (Sprint 19 Phase 1)
        const timeline = await this.governanceTimelineService.generateGovernanceTimeline();

        // Get control gaps (Sprint 17 Phase 2)
        const gapReport = await this.controlGapService.generateControlGapReport();

        // Assess current maturity stage
        const maturityAssessment = assessGovernanceMaturity(timeline);

        // Generate attributions for each gap
        const attributions = this.generateAttributions(
            [...gapReport.gaps], // Convert readonly array to mutable
            timeline.events
        );

        // Sort by severity (HIGH → MEDIUM → LOW)
        const sortedAttributions = sortAttributionsBySeverity(attributions);

        // Calculate summary statistics
        const summary = calculateAttributionSummary(sortedAttributions);

        this.logger.log(
            `[SPRINT_19_PHASE_2] Attribution report generated: ` +
            `${summary.totalGaps} gaps attributed, ` +
            `${summary.gapsBySeverity.HIGH} high severity`
        );

        return {
            generatedAt: new Date().toISOString(),
            maturityStage: maturityAssessment.currentStage,
            attributions: sortedAttributions,
            summary,
            disclaimer: GOVERNANCE_ATTRIBUTION_DISCLAIMER,
        };
    }

    /**
     * Generate attributions for all gaps
     * 
     * Maps each gap to relevant timeline events using static attribution rules.
     * 
     * RULE-BASED MAPPING:
     * Each gap dimension has predefined rules linking it to specific timeline events.
     */
    private generateAttributions(
        gaps: any[],
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution[] {
        const attributions: GovernanceGapAttribution[] = [];

        for (const gap of gaps) {
            const attribution = this.attributeGap(gap, timelineEvents);
            if (attribution) {
                attributions.push(attribution);
            }
        }

        return attributions;
    }
    /**
     * STATIC ATTRIBUTION RULES (MANDATORY)
     * 
     * Each dimension has explicit rules mapping gaps to timeline events.
     * Rules are commented for regulator explainability.
     * 
     * RULE CATEGORIES:
     * 1. RISK_COVERAGE → SIGNAL_COVERAGE (Sprint 11, 15, 16 events)
     * 2. ESCALATION_VISIBILITY → ESCALATION_VISIBILITY (Sprint 16, 17 events)
     * 3. ADMIN_DECISION_TRACEABILITY → DECISION_TRACEABILITY (Sprint 14, 17 events)
     * 4. INCIDENT_RESPONSE_CAPABILITY → SIGNAL_COVERAGE (Sprint 15, 16 events)
     * 5. POLICY_SIMULATION → POLICY_DEFINITION (Sprint 17, 18 events)
     * 6. AUTOMATION_SAFETY_GUARDRAILS → POLICY_ENFORCEMENT_GUARDRAIL (Sprint 17, 18 events)
     */
    private attributeGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution | null {
        const dimension = gap.dimension as GovernanceDimension;

        // Apply dimension-specific attribution rules
        switch (dimension) {
            case 'RISK_COVERAGE':
                return this.attributeRiskCoverageGap(gap, timelineEvents);

            case 'ESCALATION_VISIBILITY':
                return this.attributeEscalationVisibilityGap(gap, timelineEvents);

            case 'ADMIN_DECISION_TRACEABILITY':
                return this.attributeDecisionTraceabilityGap(gap, timelineEvents);

            case 'INCIDENT_RESPONSE_CAPABILITY':
                return this.attributeIncidentResponseGap(gap, timelineEvents);

            case 'POLICY_SIMULATION':
                return this.attributePolicySimulationGap(gap, timelineEvents);

            case 'AUTOMATION_SAFETY_GUARDRAILS':
                return this.attributeAutomationGuardrailsGap(gap, timelineEvents);

            default:
                this.logger.warn(`[SPRINT_19_PHASE_2] Unknown gap dimension: ${dimension}`);
                return null;
        }
    }

    /**
     * ATTRIBUTION RULE 1: RISK_COVERAGE
     * 
     * ROOT CAUSE: SIGNAL_COVERAGE
     * LINKED EVENTS: Transaction reconstruction (Sprint 11), Incident reconstruction (Sprint 15), Observability (Sprint 16)
     * 
     * RATIONALE:
     * Risk coverage gaps exist because signal detection infrastructure is incomplete.
     * Early transaction reconstruction (Sprint 11) provided foundational forensics.
     * Incident reconstruction (Sprint 15) added post-incident analysis.
     * Observability (Sprint 16) established runtime monitoring.
     * Gaps persist where signal coverage remains incomplete.
     */
    private attributeRiskCoverageGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution {
        // Find relevant signal-related events
        const linkedEvents = this.findEventsBySprintsAndKeywords(
            timelineEvents,
            [11, 15, 16],
            ['reconstruction', 'observability', 'signal']
        );

        return {
            attributionId: this.generateAttributionId(gap.gapId, 'SIGNAL_COVERAGE', linkedEvents),
            gapId: gap.gapId,
            dimension: 'RISK_COVERAGE',
            severity: gap.severity || 'MEDIUM',
            linkedTimelineEvents: linkedEvents,
            rootCauseCategory: 'SIGNAL_COVERAGE',
            explanation:
                'Risk coverage gap exists due to incomplete signal detection infrastructure. ' +
                `Transaction reconstruction (Sprint 11) provided foundational forensics. ` +
                `Incident reconstruction (Sprint 15) added post-incident analysis. ` +
                `Observability (Sprint 16) established runtime monitoring. ` +
                `Gap persists where signal coverage remains incomplete for ${gap.description || 'this risk dimension'}.`,
            remediationContext:
                'Consider expanding signal detection coverage in areas where risk visibility is insufficient. ' +
                'Review Sprint 16 observability capabilities to identify blind spots. ' +
                'Advisory only: no automated remediation.',
        };
    }

    /**
     * ATTRIBUTION RULE 2: ESCALATION_VISIBILITY
     * 
     * ROOT CAUSE: ESCALATION_VISIBILITY
     * LINKED EVENTS: Alert system (Sprint 16), Control gap detection (Sprint 17)
     * 
     * RATIONALE:
     * Escalation visibility gaps exist because escalation routing lacks monitoring.
     * Alert system (Sprint 16) established automated alerting.
     * Control gap detection (Sprint 17) identified escalation deficiencies.
     * Gaps persist where escalation paths are unclear or unmonitored.
     */
    private attributeEscalationVisibilityGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution {
        const linkedEvents = this.findEventsBySprintsAndKeywords(
            timelineEvents,
            [16, 17],
            ['alert', 'escalation', 'gap']
        );

        return {
            attributionId: this.generateAttributionId(gap.gapId, 'ESCALATION_VISIBILITY', linkedEvents),
            gapId: gap.gapId,
            dimension: 'ESCALATION_VISIBILITY',
            severity: gap.severity || 'HIGH',
            linkedTimelineEvents: linkedEvents,
            rootCauseCategory: 'ESCALATION_VISIBILITY',
            explanation:
                'Escalation visibility gap exists due to insufficient escalation routing monitoring. ' +
                `Alert system (Sprint 16) established automated alerting but escalation paths require clearer monitoring. ` +
                `Control gap detection (Sprint 17) identified escalation deficiencies. ` +
                `Gap persists where escalation routing for ${gap.description || 'this scenario'} lacks visibility.`,
            remediationContext:
                'Consider enhancing escalation path monitoring and documentation. ' +
                'Review Sprint 17 control gap findings for specific escalation deficiencies. ' +
                'Advisory only: no automated remediation.',
        };
    }

    /**
     * ATTRIBUTION RULE 3: ADMIN_DECISION_TRACEABILITY
     * 
     * ROOT CAUSE: DECISION_TRACEABILITY
     * LINKED EVENTS: Decision capture (Sprint 14), Attestation (Sprint 17)
     * 
     * RATIONALE:
     * Decision traceability gaps exist because admin decision capture is incomplete.
     * Decision capture (Sprint 14) introduced playbook decision recording.
     * Executive attestation (Sprint 17) established certification snapshots.
     * Gaps persist where decision documentation or audit trails are insufficient.
     */
    private attributeDecisionTraceabilityGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution {
        const linkedEvents = this.findEventsBySprintsAndKeywords(
            timelineEvents,
            [17],
            ['attestation', 'decision', 'certification']
        );

        return {
            attributionId: this.generateAttributionId(gap.gapId, 'DECISION_TRACEABILITY', linkedEvents),
            gapId: gap.gapId,
            dimension: 'ADMIN_DECISION_TRACEABILITY',
            severity: gap.severity || 'HIGH',
            linkedTimelineEvents: linkedEvents,
            rootCauseCategory: 'DECISION_TRACEABILITY',
            explanation:
                'Decision traceability gap exists due to incomplete admin decision capture. ' +
                `Executive attestation (Sprint 17) established certification snapshots but operational decision capture requires enhancement. ` +
                `Gap persists where ${gap.description || 'decision documentation'} lacks sufficient audit trail.`,
            remediationContext:
                'Consider expanding decision capture mechanisms for operational scenarios. ' +
                'Review Sprint 17 attestation framework for decision documentation patterns. ' +
                'Advisory only: no automated remediation.',
        };
    }

    /**
     * ATTRIBUTION RULE 4: INCIDENT_RESPONSE_CAPABILITY
     * 
     * ROOT CAUSE: SIGNAL_COVERAGE
     * LINKED EVENTS: Incident reconstruction (Sprint 15), Alert correlation (Sprint 16)
     * 
     * RATIONALE:
     * Incident response gaps exist because signal coverage during incidents is incomplete.
     * Incident reconstruction (Sprint 15) provided post-incident forensics.
     * Alert correlation (Sprint 16) linked alerts to incidents in real-time.
     * Gaps persist where incident detection or response coverage is insufficient.
     */
    private attributeIncidentResponseGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution {
        const linkedEvents = this.findEventsBySprintsAndKeywords(
            timelineEvents,
            [15, 16],
            ['incident', 'reconstruction', 'alert', 'correlation']
        );

        return {
            attributionId: this.generateAttributionId(gap.gapId, 'SIGNAL_COVERAGE', linkedEvents),
            gapId: gap.gapId,
            dimension: 'INCIDENT_RESPONSE_CAPABILITY',
            severity: gap.severity || 'HIGH',
            linkedTimelineEvents: linkedEvents,
            rootCauseCategory: 'SIGNAL_COVERAGE',
            explanation:
                'Incident response gap exists due to incomplete signal coverage during incidents. ' +
                `Incident reconstruction (Sprint 15) provided post-incident forensics. ` +
                `Alert correlation (Sprint 16) linked alerts to incidents in real-time. ` +
                `Gap persists where ${gap.description || 'incident detection or response'} lacks sufficient signal coverage.`,
            remediationContext:
                'Consider enhancing incident signal detection and correlation. ' +
                'Review Sprint 15 and 16 capabilities for incident response blind spots. ' +
                'Advisory only: no automated remediation.',
        };
    }

    /**
     * ATTRIBUTION RULE 5: POLICY_SIMULATION
     * 
     * ROOT CAUSE: POLICY_DEFINITION
     * LINKED EVENTS: Policy simulation (Sprint 17), Policy evaluation (Sprint 18)
     * 
     * RATIONALE:
     * Policy simulation gaps exist because policy definitions are incomplete.
     * Policy simulation (Sprint 17) enabled "what-if" policy testing.
     * Policy-as-code evaluation (Sprint 18) formalized policy compliance checks.
     * Gaps persist where policies are undefined or under-specified.
     */
    private attributePolicySimulationGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution {
        const linkedEvents = this.findEventsBySprintsAndKeywords(
            timelineEvents,
            [17, 18],
            ['policy', 'simulation', 'evaluation']
        );

        return {
            attributionId: this.generateAttributionId(gap.gapId, 'POLICY_DEFINITION', linkedEvents),
            gapId: gap.gapId,
            dimension: 'POLICY_SIMULATION',
            severity: gap.severity || 'MEDIUM',
            linkedTimelineEvents: linkedEvents,
            rootCauseCategory: 'POLICY_DEFINITION',
            explanation:
                'Policy simulation gap exists due to incomplete policy definitions. ' +
                `Policy simulation (Sprint 17) enabled "what-if" testing but requires comprehensive policy definitions. ` +
                `Policy-as-code evaluation (Sprint 18) formalized compliance checks. ` +
                `Gap persists where ${gap.description || 'policies'} remain undefined or under-specified.`,
            remediationContext:
                'Consider expanding policy definitions to cover identified gaps. ' +
                'Review Sprint 18 policy-as-code framework for policy formalization patterns. ' +
                'Advisory only: no automated remediation.',
        };
    }

    /**
     * ATTRIBUTION RULE 6: AUTOMATION_SAFETY_GUARDRAILS
     * 
     * ROOT CAUSE: POLICY_ENFORCEMENT_GUARDRAIL
     * LINKED EVENTS: Automation readiness (Sprint 17), Policy drift (Sprint 18)
     * 
     * RATIONALE:
     * Automation guardrail gaps exist because policy enforcement mechanisms are weak.
     * Automation readiness (Sprint 17) assessed automation safety but did NOT authorize automation.
     * Policy drift detection (Sprint 18) tracks compliance posture changes.
     * Gaps persist where policy enforcement or guardrails are insufficient.
     */
    private attributeAutomationGuardrailsGap(
        gap: any,
        timelineEvents: readonly GovernanceTimelineEvent[]
    ): GovernanceGapAttribution {
        const linkedEvents = this.findEventsBySprintsAndKeywords(
            timelineEvents,
            [17, 18],
            ['automation', 'policy', 'drift', 'guardrail']
        );

        return {
            attributionId: this.generateAttributionId(gap.gapId, 'POLICY_ENFORCEMENT_GUARDRAIL', linkedEvents),
            gapId: gap.gapId,
            dimension: 'AUTOMATION_SAFETY_GUARDRAILS',
            severity: gap.severity || 'HIGH',
            linkedTimelineEvents: linkedEvents,
            rootCauseCategory: 'POLICY_ENFORCEMENT_GUARDRAIL',
            explanation:
                'Automation guardrail gap exists due to insufficient policy enforcement mechanisms. ' +
                `Automation readiness (Sprint 17) assessed safety but did NOT authorize automation. ` +
                `Policy drift detection (Sprint 18) tracks compliance changes but enforcement requires human-in-the-loop guardrails. ` +
                `Gap persists where ${gap.description || 'automation guardrails'} lack sufficient enforcement.`,
            remediationContext:
                'Consider strengthening policy enforcement guardrails before automation. ' +
                'Review Sprint 17 automation readiness constraints and Sprint 18 policy drift monitoring. ' +
                'CRITICAL: Automation requires explicit authorization beyond gap closure. ' +
                'Advisory only: no automated remediation.',
        };
    }

    /**
     * Find timeline events matching sprint numbers and keywords
     * 
     * LOGIC:
     * - Filter events by sprint number
     * - Filter by keyword match (case-insensitive) in title or description
     * - Sort chronologically (oldest first)
     * - Generate relationship explanations
     */
    private findEventsBySprintsAndKeywords(
        timelineEvents: readonly GovernanceTimelineEvent[],
        sprints: number[],
        keywords: string[]
    ): LinkedTimelineEventRef[] {
        const matchingEvents = timelineEvents.filter(event => {
            // Check sprint match
            if (!sprints.includes(event.sourceSprint)) {
                return false;
            }

            // Check keyword match (case-insensitive)
            const searchText = `${event.title} ${event.description}`.toLowerCase();
            return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
        });

        // Sort chronologically
        const sortedEvents = [...matchingEvents].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Convert to linked event references
        return sortedEvents.map(event => ({
            eventId: event.eventId,
            sourceSprint: event.sourceSprint,
            title: event.title,
            relationshipExplanation: this.generateRelationshipExplanation(event),
        }));
    }

    /**
     * Generate relationship explanation for timeline event
     * 
     * Explains how event relates to gap origin.
     */
    private generateRelationshipExplanation(event: GovernanceTimelineEvent): string {
        const sprintPhrase = `Sprint ${event.sourceSprint}`;

        if (event.category === 'CAPABILITY_INTRODUCED') {
            return `${sprintPhrase} introduced capability addressing this gap dimension`;
        } else if (event.category === 'GOVERNANCE_SIGNAL') {
            return `${sprintPhrase} established governance signal related to this gap`;
        } else if (event.category === 'POLICY_EVALUATION') {
            return `${sprintPhrase} formalized policy evaluation relevant to this gap`;
        } else if (event.category === 'POLICY_DRIFT') {
            return `${sprintPhrase} enabled drift detection for this gap dimension`;
        } else if (event.category === 'ATTESTATION') {
            return `${sprintPhrase} established attestation framework relevant to this gap`;
        }

        return `${sprintPhrase} delivered capability related to this gap`;
    }

    /**
     * Generate deterministic attribution ID
     * 
     * FORMULA: SHA-256(gapId + rootCauseCategory + sorted_eventIds)
     * 
     * GUARANTEE:
     * Same gap + root cause + events → same attributionId
     */
    private generateAttributionId(
        gapId: string,
        rootCauseCategory: GovernanceGapRootCause,
        linkedEvents: LinkedTimelineEventRef[]
    ): string {
        const hash = createHash('sha256');

        // Sort event IDs for determinism
        const sortedEventIds = linkedEvents
            .map(e => e.eventId)
            .sort()
            .join(',');

        hash.update(JSON.stringify({
            gapId,
            rootCauseCategory,
            eventIds: sortedEventIds,
        }));

        return hash.digest('hex');
    }
}
