/**
 * SPRINT 16 PHASE 1: Risk Event Types
 * 
 * PURPOSE: Canonical event model for normalizing risk-related actions
 * 
 * DESIGN PRINCIPLES:
 * - Observational only (no enforcement)
 * - Deterministic event IDs
 * - Evidence-backed metadata only
 * - NO inference or speculation
 * - Immutable event objects
 * 
 * USE CASES:
 * - Future live dashboards
 * - Future alerting engines
 * - Future streaming analytics
 * - Future SIEM integrations
 */

/**
 * Risk Event Types
 * 
 * Maps to Sprint 11-15 risk-related actions:
 * - LIMIT_VIOLATION_DETECTED: Sprint 11 policy violations
 * - COOLING_APPLIED: Sprint 11 cooling period enforcement
 * - APPROVAL_GATED: Sprint 12 approval context gating
 * - TRANSITION_GATED: Sprint 11 state transition guards
 * - RISK_ESCALATED: Sprint 13 escalation triggers
 * - PLAYBOOK_RECOMMENDED: Sprint 14 Phase 1-2 playbook matching
 * - ADMIN_DECISION_CAPTURED: Sprint 14 Phase 3 decision capture
 * - INCIDENT_RECONSTRUCTED: Sprint 15 Phase 1 timeline reconstruction
 */
export enum RiskEventType {
    LIMIT_VIOLATION_DETECTED = 'LIMIT_VIOLATION_DETECTED',
    COOLING_APPLIED = 'COOLING_APPLIED',
    APPROVAL_GATED = 'APPROVAL_GATED',
    TRANSITION_GATED = 'TRANSITION_GATED',
    RISK_ESCALATED = 'RISK_ESCALATED',
    PLAYBOOK_RECOMMENDED = 'PLAYBOOK_RECOMMENDED',
    ADMIN_DECISION_CAPTURED = 'ADMIN_DECISION_CAPTURED',
    INCIDENT_RECONSTRUCTED = 'INCIDENT_RECONSTRUCTED',
}

/**
 * Risk Event Source
 * 
 * Identifies which Sprint 11-15 system generated the event
 */
export type RiskEventSource =
    | 'POLICY_LIMIT'           // Sprint 11: Withdrawal policy limits
    | 'COOLING_PERIOD'         // Sprint 11: Cooling period service
    | 'APPROVAL_CONTEXT'       // Sprint 12: Approval context service
    | 'TRANSITION_GUARD'       // Sprint 11: State transition guards
    | 'RISK_ESCALATION'        // Sprint 13: Risk escalation service
    | 'PLAYBOOK'               // Sprint 14: Playbook matching
    | 'ADMIN_DECISION'         // Sprint 14: Admin decision capture
    | 'INCIDENT_RECONSTRUCTION'; // Sprint 15: Incident reconstruction

/**
 * Risk Level
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Event Severity
 */
export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Canonical Risk Event
 * 
 * Normalized representation of risk-related actions from Sprints 11-15
 * 
 * GOLDEN RULES:
 * - Immutable (readonly properties)
 * - Deterministic eventId (stable inputs → stable ID)
 * - Evidence-backed metadata only
 * - NO inference or speculation in summary/metadata
 * - Observational only (no enforcement)
 * 
 * DETERMINISM:
 * eventId = SHA-256(withdrawalId + eventType + occurredAt + source)
 * Same inputs → Same eventId → Idempotent event processing
 */
export interface RiskEvent {
    /**
     * Deterministic event identifier
     * Derived from: SHA-256(withdrawalId + eventType + occurredAt + source)
     */
    readonly eventId: string;

    /**
     * Event type classification
     */
    readonly eventType: RiskEventType;

    /**
     * When event occurred (ISO 8601)
     */
    readonly occurredAt: string;

    /**
     * Withdrawal identifier
     */
    readonly withdrawalId: string;

    /**
     * User identifier
     */
    readonly userId: string;

    /**
     * Risk level at time of event
     */
    readonly riskLevel: RiskLevel;

    /**
     * Risk score (0-100) if applicable
     */
    readonly riskScore?: number;

    /**
     * Which Sprint 11-15 system generated this event
     */
    readonly source: RiskEventSource;

    /**
     * Event severity
     */
    readonly severity: EventSeverity;

    /**
     * Human-readable summary (factual, no speculation)
     */
    readonly summary: string;

    /**
     * Evidence-backed metadata
     * NO inference, NO speculation
     * Only observable facts from source system
     */
    readonly metadata: Record<string, any>;

    /**
     * Sprint marker for traceability
     */
    readonly sprint: string;
}

/**
 * Event Bus Handler Function
 * 
 * Subscribers receive RiskEvents synchronously
 */
export type RiskEventHandler = (event: RiskEvent) => void;

/**
 * Unsubscribe Function
 * 
 * Call to remove event handler from bus
 */
export type UnsubscribeFn = () => void;
