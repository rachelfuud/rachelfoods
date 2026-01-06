# SPRINT 16 – PHASE 1: Risk Event Normalization & Internal Event Bus

**Module**: `backend/src/withdrawals/risk-events/`  
**Status**: ✅ **COMPLETE**  
**Sprint**: 16 (Phase 1 of N)  
**Dependencies**: Sprints 11-15 (observes existing risk systems)

---

## 📋 OVERVIEW

Sprint 16 Phase 1 implements a **READ-ONLY, in-memory risk event normalization layer** that converts existing risk-related actions from Sprints 11-15 into structured, canonical `RiskEvent` objects. This phase establishes the foundation for future live dashboards, alerting, streaming analytics, and SIEM integrations.

### GOLDEN RULE COMPLIANCE

✅ **READ-ONLY** (no database writes, no schema changes)  
✅ **Observational only** (no behavioral changes)  
✅ **No blocking logic** (pure observation)  
✅ **Deterministic** (same input = same event ID)  
✅ **In-memory only** (no persistence)  
✅ **Synchronous** (no async workers)  
✅ **No external dependencies** (no message queues)

---

## 🎯 PURPOSE

### Why Internal Event Bus?

Sprints 11-15 built comprehensive risk management systems, but each system operates independently. Sprint 16 Phase 1 adds an **observational layer** that:

1. **Normalizes Events**: Converts diverse risk actions into canonical `RiskEvent` format
2. **Centralizes Observability**: Single point for monitoring all risk-related activity
3. **Enables Future Phases**: Foundation for dashboards, alerts, and analytics
4. **Maintains Independence**: Does not alter existing system behavior

### Event Bus Philosophy

- **Observational Only**: Events describe what happened, not what should happen
- **In-Memory**: No persistence overhead, lightweight pub/sub
- **Synchronous**: Simple, deterministic dispatch to subscribers
- **Foundation**: Enables future real-time features without rearchitecting

---

## 🏗️ ARCHITECTURE

### Three-Layer Design

#### Layer 1: Type System ([risk-event.types.ts](backend/src/withdrawals/risk-events/risk-event.types.ts))

- `RiskEvent` interface: Canonical event structure
- `RiskEventType` enum: Event classifications
- `RiskEventSource`: Sprint 11-15 system identifiers
- `RiskEventHandler`: Subscriber function type

#### Layer 2: Normalizer ([risk-event-normalizer.service.ts](backend/src/withdrawals/risk-events/risk-event-normalizer.service.ts))

- Pure functions converting Sprint 11-15 outputs to `RiskEvent`
- One normalization method per source system
- Deterministic `eventId` generation (SHA-256)
- NO database queries, NO side effects

#### Layer 3: Event Bus ([risk-event-bus.service.ts](backend/src/withdrawals/risk-events/risk-event-bus.service.ts))

- In-memory pub/sub registry
- Synchronous event dispatch
- Internal logging subscriber (SPRINT_16_PHASE_1 marker)
- Unsubscribe support for cleanup

### Data Flow

```
Sprint 11-15 Risk Action
  ↓
Normalizer Service (pure function)
  ↓
RiskEvent object
  ↓
Event Bus (publish)
  ↓
Subscribers (synchronous handlers)
  ↓
Logging / Future: Dashboards, Alerts, SIEM
```

---

## 📐 CANONICAL EVENT MODEL

### RiskEvent Interface

```typescript
interface RiskEvent {
  // Deterministic identifier (SHA-256 hash)
  readonly eventId: string;

  // Event type classification
  readonly eventType: RiskEventType;

  // ISO 8601 timestamp
  readonly occurredAt: string;

  // Withdrawal identifier
  readonly withdrawalId: string;

  // User identifier
  readonly userId: string;

  // Risk level at time of event
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH";

  // Risk score (0-100) if applicable
  readonly riskScore?: number;

  // Sprint 11-15 system that generated event
  readonly source: RiskEventSource;

  // Event severity
  readonly severity: "INFO" | "WARNING" | "CRITICAL";

  // Human-readable summary (factual, no speculation)
  readonly summary: string;

  // Evidence-backed metadata only
  readonly metadata: Record<string, any>;

  // Sprint marker for traceability
  readonly sprint: string;
}
```

### RiskEventType Enum

```typescript
enum RiskEventType {
  LIMIT_VIOLATION_DETECTED, // Sprint 11: Policy violations
  COOLING_APPLIED, // Sprint 11: Cooling period
  APPROVAL_GATED, // Sprint 12: Approval required
  TRANSITION_GATED, // Sprint 11: State transition blocked
  RISK_ESCALATED, // Sprint 13: Risk escalation
  PLAYBOOK_RECOMMENDED, // Sprint 14: Playbook matched
  ADMIN_DECISION_CAPTURED, // Sprint 14: Admin decision
  INCIDENT_RECONSTRUCTED, // Sprint 15: Timeline reconstructed
}
```

### RiskEventSource Type

```typescript
type RiskEventSource =
  | "POLICY_LIMIT" // Sprint 11: Withdrawal policy limits
  | "COOLING_PERIOD" // Sprint 11: Cooling period service
  | "APPROVAL_CONTEXT" // Sprint 12: Approval context service
  | "TRANSITION_GUARD" // Sprint 11: State transition guards
  | "RISK_ESCALATION" // Sprint 13: Risk escalation service
  | "PLAYBOOK" // Sprint 14: Playbook matching
  | "ADMIN_DECISION" // Sprint 14: Admin decision capture
  | "INCIDENT_RECONSTRUCTION"; // Sprint 15: Incident reconstruction
```

---

## 🔧 NORMALIZER SERVICE

### Design Pattern: Pure Functions

Each normalization method is a pure function:

- **Input**: Sprint 11-15 system output
- **Output**: `RiskEvent` object
- **No side effects**: No database queries, no mutations
- **Deterministic**: Same input → Same `RiskEvent`

### Normalization Methods

#### 1. normalizePolicyViolation()

**Source**: Sprint 11 withdrawal policy limits  
**Trigger**: User exceeds daily/weekly/monthly limit  
**Event Type**: `LIMIT_VIOLATION_DETECTED`

```typescript
normalizePolicyViolation({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  violatedLimitType: "DAILY",
  requestedAmount: 5000.0,
  limitAmount: 3000.0,
  occurredAt: new Date(),
});
// → RiskEvent with HIGH risk, CRITICAL severity
```

#### 2. normalizeCoolingPeriodApplied()

**Source**: Sprint 11 cooling period service  
**Trigger**: Cooling period applied after recent withdrawal  
**Event Type**: `COOLING_APPLIED`

```typescript
normalizeCoolingPeriodApplied({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  coolingEndTime: new Date("2026-01-06T10:00:00Z"),
  previousWithdrawalId: "wdr_xyz789",
  occurredAt: new Date(),
});
// → RiskEvent with MEDIUM risk, WARNING severity
```

#### 3. normalizeApprovalGated()

**Source**: Sprint 12 approval context service  
**Trigger**: Withdrawal requires admin approval  
**Event Type**: `APPROVAL_GATED`

```typescript
normalizeApprovalGated({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  riskLevel: "HIGH",
  riskScore: 85.5,
  gatingReason: "High risk score requires review",
  occurredAt: new Date(),
});
// → RiskEvent with HIGH risk, CRITICAL severity
```

#### 4. normalizeTransitionGated()

**Source**: Sprint 11 transition guard service  
**Trigger**: State transition blocked by guard rules  
**Event Type**: `TRANSITION_GATED`

```typescript
normalizeTransitionGated({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  fromStatus: "PENDING",
  toStatus: "PROCESSING",
  blockReason: "Cooling period not expired",
  occurredAt: new Date(),
});
// → RiskEvent with MEDIUM risk, WARNING severity
```

#### 5. normalizeRiskEscalation()

**Source**: Sprint 13 risk escalation service  
**Trigger**: Risk level escalated to MEDIUM or HIGH  
**Event Type**: `RISK_ESCALATED`

```typescript
normalizeRiskEscalation({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  escalationSeverity: "HIGH",
  riskScore: 87.3,
  riskSignals: ["velocity_increase", "new_account", "amount_spike"],
  occurredAt: new Date(),
});
// → RiskEvent with HIGH risk, CRITICAL severity
```

#### 6. normalizePlaybookRecommendation()

**Source**: Sprint 14 Phase 1-2 playbook matching  
**Trigger**: Playbook matched and recommended  
**Event Type**: `PLAYBOOK_RECOMMENDED`

```typescript
normalizePlaybookRecommendation({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  playbookId: "pb_high_value",
  playbookTitle: "High-Value First-Time Withdrawal Review",
  matchScore: 0.92,
  riskLevel: "MEDIUM",
  occurredAt: new Date(),
});
// → RiskEvent with MEDIUM risk, INFO severity
```

#### 7. normalizeAdminDecision()

**Source**: Sprint 14 Phase 3 admin decision capture  
**Trigger**: Admin makes approve/reject/request-more-info decision  
**Event Type**: `ADMIN_DECISION_CAPTURED`

```typescript
normalizeAdminDecision({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  adminId: "adm_xyz789",
  decision: "APPROVED",
  rationale: "User verified, transaction legitimate",
  riskLevel: "MEDIUM",
  occurredAt: new Date(),
});
// → RiskEvent with MEDIUM risk, INFO severity
```

#### 8. normalizeIncidentReconstruction()

**Source**: Sprint 15 Phase 1 incident reconstruction  
**Trigger**: Complete incident timeline reconstructed  
**Event Type**: `INCIDENT_RECONSTRUCTED`

```typescript
normalizeIncidentReconstruction({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  adminId: "adm_xyz789",
  timelineEventCount: 15,
  riskLevel: "HIGH",
  occurredAt: new Date(),
});
// → RiskEvent with HIGH risk, INFO severity
```

---

## 🔒 DETERMINISTIC EVENT IDS

### Algorithm: SHA-256 Hashing

```typescript
eventId = SHA - 256(withdrawalId + eventType + occurredAt + source);
```

### Guarantees

- **Idempotency**: Same inputs → Same `eventId`
- **Collision Resistance**: 2^256 computational infeasibility
- **Traceable**: `eventId` uniquely identifies event in logs

### Example

```typescript
Input: withdrawalId: "wdr_abc123";
eventType: "RISK_ESCALATED";
occurredAt: "2026-01-05T10:30:00.000Z";
source: "RISK_ESCALATION";

Output: eventId: "a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789";
```

**Benefit**: Re-publishing same event produces same `eventId`, enabling deduplication in future phases.

---

## 🚌 EVENT BUS SERVICE

### Design: In-Memory Pub/Sub

#### Publish API

```typescript
eventBus.publish(event: RiskEvent): void
```

- Synchronous dispatch to all subscribers
- Handler errors logged but don't stop dispatch
- No buffering or queuing
- No retries

#### Subscribe API

```typescript
const unsubscribe = eventBus.subscribe((event: RiskEvent) => {
  console.log("Received:", event);
});

// Later...
unsubscribe();
```

- Returns unsubscribe function for cleanup
- Handlers called in registration order
- Synchronous execution

### Internal Logging Subscriber

Automatically registered on module initialization:

```typescript
eventBus.subscribe((event) => {
  logger.log({
    marker: "SPRINT_16_PHASE_1",
    action: "risk_event_published",
    eventId: event.eventId,
    eventType: event.eventType,
    withdrawalId: event.withdrawalId,
    userId: event.userId,
    riskLevel: event.riskLevel,
    source: event.source,
    severity: event.severity,
    summary: event.summary,
    occurredAt: event.occurredAt,
    sprint: event.sprint,
  });
});
```

**Purpose**: Structured logging for audit trails and debugging.

---

## 📊 EXAMPLE EVENT FLOW

### Scenario: High-Risk Withdrawal Escalation

#### Step 1: Risk Escalation (Sprint 13)

```typescript
// Existing Sprint 13 code detects high risk
const escalation = await riskEscalationService.escalate({
  withdrawalId: "wdr_abc123",
  severity: "HIGH",
  riskScore: 87.3,
  signals: ["velocity_increase", "new_account"],
});
```

#### Step 2: Normalize to RiskEvent (Sprint 16 Phase 1)

```typescript
// New Sprint 16 Phase 1 normalization
const event = normalizerService.normalizeRiskEscalation({
  withdrawalId: "wdr_abc123",
  userId: "usr_def456",
  escalationSeverity: "HIGH",
  riskScore: 87.3,
  riskSignals: ["velocity_increase", "new_account"],
  occurredAt: new Date(),
});
// event.eventId = "a1b2c3d4..."
// event.eventType = "RISK_ESCALATED"
// event.severity = "CRITICAL"
```

#### Step 3: Publish to Event Bus

```typescript
eventBusService.publish(event);
```

#### Step 4: Subscribers Notified (Synchronous)

```typescript
// Internal logging subscriber (Phase 1)
logger.log({
    marker: 'SPRINT_16_PHASE_1',
    action: 'risk_event_published',
    eventType: 'RISK_ESCALATED',
    withdrawalId: 'wdr_abc123',
    severity: 'CRITICAL',
    ...
});

// Future Phase 2: Dashboard subscriber
dashboardService.updateRiskLevel('wdr_abc123', 'HIGH');

// Future Phase 3: Alert subscriber
alertService.sendCriticalAlert(event);
```

---

## ✅ QUALITY GUARANTEES

### 1. Read-Only

**Guarantee**: No database writes, no schema changes  
**Verification**: No Prisma mutations in normalizer or event bus

### 2. Observational Only

**Guarantee**: No behavioral changes to Sprint 11-15 systems  
**Verification**: Event publication is fire-and-forget, errors logged only

### 3. Determinism

**Guarantee**: Same input → Same `eventId`  
**Verification**: SHA-256 hash deterministic

### 4. In-Memory

**Guarantee**: No persistence overhead  
**Verification**: No database tables, no files, no external queues

### 5. Synchronous

**Guarantee**: No async workers or background jobs  
**Verification**: All handlers called synchronously in `publish()`

---

## 🚫 NON-GOALS (Phase 1)

### What This Phase Does NOT Include

#### 1. Real-Time Enforcement

- ❌ Blocking withdrawals based on events
- ❌ Automatic state transitions
- ❌ Event-driven workflows

#### 2. Persistence

- ❌ Event database tables
- ❌ Event log files
- ❌ Event replay functionality

#### 3. External Integrations

- ❌ Message queues (RabbitMQ, Kafka, SQS)
- ❌ WebSockets for live updates
- ❌ SIEM system connections

#### 4. Async Processing

- ❌ Background workers
- ❌ Event queues with retry logic
- ❌ Circuit breakers

#### 5. Advanced Features

- ❌ Event sourcing
- ❌ Time-travel debugging
- ❌ Event replay from history

**Rationale**: Phase 1 establishes foundation. Future phases incrementally add features without rearchitecting.

---

## 🔮 FUTURE PHASES (Roadmap)

### Phase 2: Live Admin Dashboard

- Real-time risk event stream
- WebSocket push to admin UI
- Event filtering and search
- Risk level trend visualization

### Phase 3: Alerting Engine

- Configurable alert rules (e.g., "notify on CRITICAL events")
- Multi-channel notifications (email, Slack, SMS)
- Alert aggregation and deduplication
- On-call escalation

### Phase 4: SIEM Integration

- Forward events to external SIEM systems
- Splunk, Datadog, or custom integrations
- Event enrichment for security analytics
- Compliance log forwarding

### Phase 5: Streaming Analytics

- Real-time risk trend analysis
- Anomaly detection (ML-based)
- Predictive risk scoring
- Fraud pattern identification

---

## 🧪 TESTING RECOMMENDATIONS

### Unit Tests

```typescript
describe("WithdrawalRiskEventNormalizerService", () => {
  it("should generate deterministic event IDs", () => {
    const input = {
      withdrawalId: "wdr_abc123",
      userId: "usr_def456",
      escalationSeverity: "HIGH" as const,
      riskScore: 87.3,
      riskSignals: ["velocity_increase"],
      occurredAt: new Date("2026-01-05T10:30:00.000Z"),
    };

    const event1 = service.normalizeRiskEscalation(input);
    const event2 = service.normalizeRiskEscalation(input);

    expect(event1.eventId).toBe(event2.eventId);
  });

  it("should include evidence-backed metadata", () => {
    const event = service.normalizeRiskEscalation({
      withdrawalId: "wdr_abc123",
      userId: "usr_def456",
      escalationSeverity: "HIGH",
      riskScore: 87.3,
      riskSignals: ["velocity_increase", "new_account"],
      occurredAt: new Date(),
    });

    expect(event.metadata.escalationSeverity).toBe("HIGH");
    expect(event.metadata.riskSignals).toHaveLength(2);
  });
});

describe("WithdrawalRiskEventBusService", () => {
  it("should dispatch events to all subscribers", () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    eventBus.subscribe(handler1);
    eventBus.subscribe(handler2);

    const event = createMockEvent();
    eventBus.publish(event);

    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).toHaveBeenCalledWith(event);
  });

  it("should support unsubscribe", () => {
    const handler = jest.fn();
    const unsubscribe = eventBus.subscribe(handler);

    unsubscribe();

    const event = createMockEvent();
    eventBus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
```

---

## 📖 SUMMARY

Sprint 16 Phase 1 delivers a **production-ready risk event normalization layer** that:

✅ Converts Sprint 11-15 risk actions into canonical `RiskEvent` format  
✅ Provides in-memory pub/sub event bus  
✅ Maintains READ-ONLY, observational-only design  
✅ Generates deterministic event IDs (SHA-256)  
✅ Includes internal logging subscriber  
✅ Establishes foundation for future real-time features  
✅ No behavioral changes to existing systems  
✅ No database writes or schema changes

**Status**: ✅ **COMPLETE** – Ready for production use

---

## 🎓 KEY LEARNINGS

### 1. Observation ≠ Enforcement

Phase 1 observes risk events without altering system behavior. This separation enables safe deployment and incremental feature addition.

### 2. Deterministic IDs Enable Idempotency

SHA-256 event IDs allow future phases to deduplicate events without maintaining state, critical for distributed systems.

### 3. In-Memory Simplicity

Starting with in-memory pub/sub avoids over-engineering. Complexity (persistence, queues) added only when needed.

### 4. Pure Functions = Easy Testing

Normalizer service uses pure functions, making tests simple and deterministic.

### 5. Foundation for Growth

Phase 1's minimal design enables future phases (dashboards, alerts, SIEM) without rearchitecting core event model.

---

**SPRINT 16 PHASE 1 COMPLETE**: Risk event normalization and internal event bus ready for production.
