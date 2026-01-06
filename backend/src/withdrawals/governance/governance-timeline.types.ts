/**
 * SPRINT 19 – PHASE 1: Governance Timeline & Maturity Progression
 * 
 * PURPOSE:
 * Unified chronological view of governance capability evolution across Sprints 11–18.
 * 
 * CRITICAL CONSTRAINTS:
 * - READ-ONLY (no enforcement, no automation)
 * - DETERMINISTIC (event IDs via SHA-256)
 * - EVIDENCE-BACKED (maps to delivered capabilities only)
 * - ADVISORY-ONLY (no compliance claims)
 * 
 * QUALITY STANDARD:
 * Regulator-grade governance narrative suitable for audits, board reviews, and compliance reporting.
 */

/**
 * Timeline Event Category
 * 
 * Classifies governance events by their nature:
 * - CAPABILITY_INTRODUCED: New governance capability delivered (e.g., incident reconstruction)
 * - GOVERNANCE_SIGNAL: Observable governance indicator (e.g., SIEM integration)
 * - POLICY_EVALUATION: Policy-as-code evaluation performed
 * - POLICY_DRIFT: Policy compliance change detected
 * - ATTESTATION: Executive certification snapshot created
 */
export type GovernanceTimelineEventCategory =
    | 'CAPABILITY_INTRODUCED'
    | 'GOVERNANCE_SIGNAL'
    | 'POLICY_EVALUATION'
    | 'POLICY_DRIFT'
    | 'ATTESTATION';

/**
 * Governance Event Severity
 * 
 * Indicates relative importance for executive reporting:
 * - INFO: Informational milestone (e.g., observability added)
 * - WARNING: Significant governance capability (e.g., policy evaluation)
 * - CRITICAL: High-impact governance milestone (e.g., attestation, policy drift)
 */
export type GovernanceEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Governance Maturity Stage
 * 
 * Rule-based classification of governance capability evolution:
 * - FOUNDATIONAL: Basic signals present (reconstruction, observability)
 * - STRUCTURED: Policies and alerts established
 * - GOVERNED: Attestation and gap analysis in place
 * - AUDIT_READY: Policy drift detection and evidence chains complete
 */
export type GovernanceMaturityStage =
    | 'FOUNDATIONAL'
    | 'STRUCTURED'
    | 'GOVERNED'
    | 'AUDIT_READY';

/**
 * Governance Timeline Event
 * 
 * Immutable record of a governance capability milestone.
 * 
 * DETERMINISM GUARANTEE:
 * eventId = SHA-256(category + sourceSprint + title)
 * Same inputs → same eventId
 * 
 * EVIDENCE REQUIREMENT:
 * All events must map to delivered capabilities documented in Sprint docs.
 */
export interface GovernanceTimelineEvent {
    /**
     * Deterministic event identifier
     * Formula: SHA-256(category + sourceSprint + title)
     */
    readonly eventId: string;

    /**
     * Event timestamp (ISO 8601, hour precision for determinism)
     * Format: YYYY-MM-DDTHH:00:00.000Z
     */
    readonly timestamp: string;

    /**
     * Event category
     */
    readonly category: GovernanceTimelineEventCategory;

    /**
     * Source sprint number (11–19)
     */
    readonly sourceSprint: number;

    /**
     * Short, factual event title
     * Example: "Incident Reconstruction Capability Delivered"
     */
    readonly title: string;

    /**
     * Evidence-backed description (neutral language)
     * Must reference delivered capabilities only
     */
    readonly description: string;

    /**
     * References to supporting documentation
     * Example: ['SPRINT_15_PHASE_2_INCIDENT_RECONSTRUCTION.md']
     */
    readonly evidenceRefs: readonly string[];

    /**
     * Event severity for executive reporting
     */
    readonly severity: GovernanceEventSeverity;
}

/**
 * Governance Timeline Summary
 * 
 * Aggregated statistics about governance evolution.
 */
export interface GovernanceTimelineSummary {
    /**
     * Total number of governance events
     */
    readonly totalEvents: number;

    /**
     * Events grouped by category
     */
    readonly byCategory: {
        readonly CAPABILITY_INTRODUCED: number;
        readonly GOVERNANCE_SIGNAL: number;
        readonly POLICY_EVALUATION: number;
        readonly POLICY_DRIFT: number;
        readonly ATTESTATION: number;
    };

    /**
     * Events grouped by severity
     */
    readonly bySeverity: {
        readonly INFO: number;
        readonly WARNING: number;
        readonly CRITICAL: number;
    };
}

/**
 * Governance Timeline
 * 
 * Complete chronological view of governance capability evolution.
 * 
 * USAGE:
 * - Executive board reporting
 * - Regulator audits
 * - Compliance evidence
 * - Governance narrative documentation
 */
export interface GovernanceTimeline {
    /**
     * Timeline generation timestamp (ISO 8601)
     */
    readonly generatedAt: string;

    /**
     * Chronologically ordered governance events
     * Sorted by timestamp (oldest first)
     */
    readonly events: readonly GovernanceTimelineEvent[];

    /**
     * Aggregated timeline statistics
     */
    readonly summary: GovernanceTimelineSummary;
}

/**
 * Governance Maturity Assessment
 * 
 * Rule-based classification of governance capability maturity.
 * 
 * DETERMINISM GUARANTEE:
 * Same timeline events → same maturity stage
 * 
 * NON-GOAL:
 * This is NOT a compliance certification or scoring system.
 */
export interface GovernanceMaturityAssessment {
    /**
     * Current maturity stage based on timeline density
     */
    readonly currentStage: GovernanceMaturityStage;

    /**
     * Rationale for maturity classification
     * Bullet list of evidence-backed reasons
     */
    readonly rationale: readonly string[];

    /**
     * Timeline event count used for classification
     */
    readonly totalEvents: number;

    /**
     * Breakdown of events by category (for transparency)
     */
    readonly eventsByCategory: GovernanceTimelineSummary['byCategory'];
}

/**
 * Governance Timeline Report
 * 
 * Complete governance evolution narrative including timeline and maturity assessment.
 * 
 * ADVISORY POSITIONING:
 * This report reflects governance capability evolution only.
 * It does NOT certify compliance or authorize automation.
 */
export interface GovernanceTimelineReport {
    /**
     * Complete governance timeline
     */
    readonly timeline: GovernanceTimeline;

    /**
     * Maturity assessment based on timeline
     */
    readonly maturityAssessment: GovernanceMaturityAssessment;

    /**
     * Mandatory advisory disclaimer
     */
    readonly disclaimer: string;
}

/**
 * Mandatory Advisory Disclaimer
 * 
 * LEGAL POSITIONING:
 * Timeline reflects capability evolution only — not compliance certification.
 */
export const GOVERNANCE_TIMELINE_DISCLAIMER =
    'This timeline reflects governance capability evolution only. ' +
    'It does NOT certify compliance, authorize automation, or replace human governance judgment. ' +
    'Use this report for audit evidence, board reporting, and regulator narratives only.';

/**
 * Maturity Stage Descriptions
 * 
 * Human-readable definitions for each maturity stage.
 */
export const MATURITY_STAGE_DESCRIPTIONS: Record<GovernanceMaturityStage, string> = {
    FOUNDATIONAL:
        'Basic governance signals present (transaction reconstruction, observability). ' +
        'No formal policy evaluation or attestation.',

    STRUCTURED:
        'Policies and alerts established. ' +
        'Observable governance indicators with some formalization.',

    GOVERNED:
        'Attestation and gap analysis in place. ' +
        'Executive certification and control gap detection active.',

    AUDIT_READY:
        'Policy drift detection and evidence chains complete. ' +
        'Full governance evolution tracking with historical comparison.',
};

/**
 * Helper: Format event category for display
 */
export function formatEventCategory(category: GovernanceTimelineEventCategory): string {
    return category
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Helper: Format maturity stage for display
 */
export function formatMaturityStage(stage: GovernanceMaturityStage): string {
    return stage
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Helper: Check if event is critical
 */
export function isCriticalEvent(event: GovernanceTimelineEvent): boolean {
    return event.severity === 'CRITICAL';
}

/**
 * Helper: Sort events chronologically (oldest first)
 */
export function sortEventsByTimestamp(
    events: readonly GovernanceTimelineEvent[]
): GovernanceTimelineEvent[] {
    return [...events].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}

/**
 * Helper: Group events by sprint
 */
export function groupEventsBySprint(
    events: readonly GovernanceTimelineEvent[]
): Record<number, GovernanceTimelineEvent[]> {
    const grouped: Record<number, GovernanceTimelineEvent[]> = {};

    for (const event of events) {
        if (!grouped[event.sourceSprint]) {
            grouped[event.sourceSprint] = [];
        }
        grouped[event.sourceSprint].push(event);
    }

    return grouped;
}

/**
 * Helper: Calculate timeline summary statistics
 */
export function calculateTimelineSummary(
    events: readonly GovernanceTimelineEvent[]
): GovernanceTimelineSummary {
    const summary = {
        totalEvents: events.length,
        byCategory: {
            CAPABILITY_INTRODUCED: 0,
            GOVERNANCE_SIGNAL: 0,
            POLICY_EVALUATION: 0,
            POLICY_DRIFT: 0,
            ATTESTATION: 0,
        },
        bySeverity: {
            INFO: 0,
            WARNING: 0,
            CRITICAL: 0,
        },
    };

    for (const event of events) {
        summary.byCategory[event.category]++;
        summary.bySeverity[event.severity]++;
    }

    return summary;
}
