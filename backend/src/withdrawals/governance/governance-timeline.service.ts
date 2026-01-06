import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    GovernanceTimeline,
    GovernanceTimelineEvent,
    GovernanceTimelineEventCategory,
    GovernanceEventSeverity,
    calculateTimelineSummary,
    sortEventsByTimestamp,
} from './governance-timeline.types';

/**
 * SPRINT 19 – PHASE 1: Governance Timeline Builder Service
 * 
 * RESPONSIBILITIES:
 * - Aggregate governance capabilities from Sprints 11–18
 * - Convert capabilities into deterministic timeline events
 * - Order events chronologically
 * - Generate governance evolution narrative
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no persistence)
 * - DETERMINISTIC (SHA-256 event IDs)
 * - EVIDENCE-BACKED (delivered capabilities only)
 * - NO INFERENCE (no predicted events)
 * 
 * QUALITY STANDARD:
 * Regulator-grade timeline suitable for audits and board reporting.
 */
@Injectable()
export class GovernanceTimelineService {
    private readonly logger = new Logger(GovernanceTimelineService.name);

    /**
     * Generate complete governance timeline
     * 
     * Aggregates all governance milestones from Sprints 11–18.
     * 
     * DETERMINISM GUARANTEE:
     * Events are hardcoded based on delivered capabilities.
     * Same codebase → same timeline.
     */
    async generateGovernanceTimeline(): Promise<GovernanceTimeline> {
        this.logger.log('[SPRINT_19_PHASE_1] Generating governance timeline...');

        // Aggregate all governance events from delivered sprints
        const events = this.buildTimelineEvents();

        // Sort chronologically (oldest first)
        const sortedEvents = sortEventsByTimestamp(events);

        // Calculate summary statistics
        const summary = calculateTimelineSummary(sortedEvents);

        const timeline: GovernanceTimeline = {
            generatedAt: new Date().toISOString(),
            events: sortedEvents,
            summary,
        };

        this.logger.log(
            `[SPRINT_19_PHASE_1] Timeline generated: ${timeline.summary.totalEvents} events, ` +
            `${timeline.summary.bySeverity.CRITICAL} critical`
        );

        return timeline;
    }

    /**
     * Build timeline events from Sprint 11–18 capabilities
     * 
     * EVIDENCE SOURCING:
     * Each event maps to a delivered Sprint capability with documentation reference.
     * 
     * NO INFERENCE:
     * Events reflect what was delivered, not what might happen.
     */
    private buildTimelineEvents(): GovernanceTimelineEvent[] {
        const events: GovernanceTimelineEvent[] = [];

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SPRINT 11: TRANSACTION RECONSTRUCTION FOUNDATION
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        events.push(
            this.createEvent({
                category: 'CAPABILITY_INTRODUCED',
                sourceSprint: 11,
                title: 'Transaction Reconstruction Capability Delivered',
                description:
                    'Introduced deterministic transaction reconstruction engine. ' +
                    'Enables forensic analysis of financial operations via append-only journal. ' +
                    'Establishes foundation for incident response and audit evidence generation.',
                evidenceRefs: ['SPRINT_11_TRANSACTION_RECONSTRUCTION.md'],
                severity: 'INFO',
                // Approximate timestamp for Sprint 11 delivery (historical)
                timestamp: '2025-09-15T14:00:00.000Z',
            })
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SPRINT 15: INCIDENT RECONSTRUCTION & OBSERVABILITY
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        events.push(
            this.createEvent({
                category: 'CAPABILITY_INTRODUCED',
                sourceSprint: 15,
                title: 'Incident Reconstruction Capability Delivered',
                description:
                    'Introduced READ-ONLY incident reconstruction engine linking incidents to governance signals. ' +
                    'Enables post-incident forensic analysis without modifying operational state. ' +
                    'Supports regulator evidence generation and control effectiveness assessment.',
                evidenceRefs: ['SPRINT_15_PHASE_2_INCIDENT_RECONSTRUCTION.md'],
                severity: 'WARNING',
                timestamp: '2025-10-20T10:00:00.000Z',
            })
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SPRINT 16: OBSERVABILITY, ALERTS & SIEM
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        events.push(
            this.createEvent({
                category: 'GOVERNANCE_SIGNAL',
                sourceSprint: 16,
                title: 'Observability Infrastructure Established',
                description:
                    'Deployed structured logging, metrics collection, and distributed tracing. ' +
                    'Provides observable governance signals for control effectiveness monitoring. ' +
                    'Enables real-time detection of governance-relevant events.',
                evidenceRefs: ['SPRINT_16_OBSERVABILITY.md'],
                severity: 'INFO',
                timestamp: '2025-11-05T09:00:00.000Z',
            }),

            this.createEvent({
                category: 'GOVERNANCE_SIGNAL',
                sourceSprint: 16,
                title: 'Alert System & SIEM Integration Delivered',
                description:
                    'Introduced deterministic alert evaluation engine with SIEM integration. ' +
                    'Enables automated detection of governance-relevant events (unusual withdrawals, control violations). ' +
                    'Provides audit trail for regulator evidence.',
                evidenceRefs: ['SPRINT_16_ALERTS_SIEM.md'],
                severity: 'WARNING',
                timestamp: '2025-11-12T11:00:00.000Z',
            })
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SPRINT 17: GOVERNANCE READINESS & ATTESTATION
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        events.push(
            this.createEvent({
                category: 'CAPABILITY_INTRODUCED',
                sourceSprint: 17,
                title: 'Governance Readiness Assessment Delivered',
                description:
                    'Introduced deterministic governance readiness scoring across 5 pillars. ' +
                    'Provides executive-grade visibility into governance capability maturity. ' +
                    'Establishes baseline for regulatory self-assessment.',
                evidenceRefs: ['SPRINT_17_PHASE_1_GOVERNANCE_READINESS.md'],
                severity: 'WARNING',
                timestamp: '2025-11-25T10:00:00.000Z',
            }),

            this.createEvent({
                category: 'GOVERNANCE_SIGNAL',
                sourceSprint: 17,
                title: 'Control Gap Detection Capability Delivered',
                description:
                    'Introduced deterministic control gap analysis across 6 control domains. ' +
                    'Identifies governance deficiencies requiring remediation. ' +
                    'Provides evidence-backed gap prioritization for executive review.',
                evidenceRefs: ['SPRINT_17_PHASE_2_CONTROL_GAPS.md'],
                severity: 'WARNING',
                timestamp: '2025-12-02T14:00:00.000Z',
            }),

            this.createEvent({
                category: 'CAPABILITY_INTRODUCED',
                sourceSprint: 17,
                title: 'Automation Readiness Assessment Delivered',
                description:
                    'Introduced READ-ONLY automation safety assessment. ' +
                    'Evaluates governance readiness for approval workflow automation. ' +
                    'Mandatory disclaimer: assessment does NOT authorize automation.',
                evidenceRefs: ['SPRINT_17_PHASE_3_AUTOMATION_READINESS.md'],
                severity: 'WARNING',
                timestamp: '2025-12-09T13:00:00.000Z',
            }),

            this.createEvent({
                category: 'ATTESTATION',
                sourceSprint: 17,
                title: 'Executive Governance Attestation System Delivered',
                description:
                    'Introduced regulator-grade executive certification snapshots. ' +
                    '4 attestation roles (CISO, CTO, COMPLIANCE_OFFICER, RISK_OFFICER). ' +
                    'Deterministic snapshot IDs with mandatory non-approval disclaimer. ' +
                    'Aggregates Phases 1–3 into executive-ready governance summary.',
                evidenceRefs: ['SPRINT_17_PHASE_4_EXECUTIVE_ATTESTATION.md'],
                severity: 'CRITICAL',
                timestamp: '2025-12-16T15:00:00.000Z',
            })
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // SPRINT 18: POLICY-AS-CODE & DRIFT DETECTION
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        events.push(
            this.createEvent({
                category: 'POLICY_EVALUATION',
                sourceSprint: 18,
                title: 'Policy-as-Code Evaluation System Delivered',
                description:
                    'Introduced deterministic policy evaluation engine with 8 declarative policies. ' +
                    '4 policy categories: GOVERNANCE, RISK, COMPLIANCE, AUTOMATION. ' +
                    'Advisory-only evaluation (no enforcement, no automation). ' +
                    'Formalizes governance reasoning for regulator review.',
                evidenceRefs: ['SPRINT_18_PHASE_1_POLICY_EVALUATION.md'],
                severity: 'CRITICAL',
                timestamp: '2025-12-23T12:00:00.000Z',
            }),

            this.createEvent({
                category: 'POLICY_DRIFT',
                sourceSprint: 18,
                title: 'Policy Drift Detection System Delivered',
                description:
                    'Introduced deterministic policy drift detection with historical comparison. ' +
                    'Classifies governance posture changes (IMPROVEMENT / REGRESSION / NO_CHANGE). ' +
                    'Enables governance trend analysis over time (1h to 1 year comparisons). ' +
                    'Simulation constraint: no persistence layer (Phase 2 design).',
                evidenceRefs: ['SPRINT_18_PHASE_2_POLICY_DRIFT.md'],
                severity: 'CRITICAL',
                timestamp: '2025-12-30T16:00:00.000Z',
            })
        );

        return events;
    }

    /**
     * Create timeline event with deterministic ID
     * 
     * DETERMINISM FORMULA:
     * eventId = SHA-256(category + sourceSprint + title)
     * 
     * Same inputs → same eventId
     */
    private createEvent(params: {
        category: GovernanceTimelineEventCategory;
        sourceSprint: number;
        title: string;
        description: string;
        evidenceRefs: string[];
        severity: GovernanceEventSeverity;
        timestamp: string;
    }): GovernanceTimelineEvent {
        // Generate deterministic event ID
        const eventId = this.generateEventId(
            params.category,
            params.sourceSprint,
            params.title
        );

        return {
            eventId,
            timestamp: params.timestamp,
            category: params.category,
            sourceSprint: params.sourceSprint,
            title: params.title,
            description: params.description,
            evidenceRefs: params.evidenceRefs,
            severity: params.severity,
        };
    }

    /**
     * Generate deterministic event ID
     * 
     * FORMULA: SHA-256(category + sourceSprint + title)
     * 
     * RATIONALE:
     * - category: Ensures different event types get different IDs
     * - sourceSprint: Distinguishes events from different sprints
     * - title: Uniquely identifies specific capability
     * 
     * GUARANTEE:
     * Same category + sprint + title → same eventId
     */
    private generateEventId(
        category: GovernanceTimelineEventCategory,
        sourceSprint: number,
        title: string
    ): string {
        const hash = createHash('sha256');

        hash.update(JSON.stringify({
            category,
            sourceSprint,
            title,
        }));

        return hash.digest('hex');
    }
}
