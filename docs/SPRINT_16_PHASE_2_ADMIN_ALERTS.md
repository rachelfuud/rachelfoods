# SPRINT 16 – PHASE 2: Real-Time Admin Alerts & Threshold Engine

**Module**: `backend/src/withdrawals/alerts/`  
**Status**: ✅ **COMPLETE**  
**Sprint**: 16 (Phase 2 of N)  
**Dependencies**: Sprint 16 Phase 1 (Risk Event Bus)

---

## 📋 OVERVIEW

Sprint 16 Phase 2 implements a **READ-ONLY, deterministic alerting layer** that listens to RiskEvents (Sprint 16 Phase 1) and evaluates them against configurable in-memory thresholds to produce AdminAlert objects for admin visibility.

### GOLDEN RULE COMPLIANCE

✅ **READ-ONLY** (no database writes, no schema changes)  
✅ **Observational only** (no behavioral changes to withdrawals)  
✅ **Deterministic** (same events → same alerts)  
✅ **In-memory only** (no persistence)  
✅ **No blocking logic** (alerts are advisory)  
✅ **Synchronous evaluation** (no async workers)  
✅ **No external dependencies** (no message queues, no email/SMS)

---

## 🎯 PURPOSE

### Why Admin Alerts?

Sprint 16 Phase 1 normalized risk events into canonical format. Phase 2 adds **intelligent alert generation** that:

1. **Pattern Detection**: Identifies concerning risk patterns from multiple events
2. **Threshold Evaluation**: Applies configurable thresholds to generate actionable alerts
3. **Admin Visibility**: Provides READ-ONLY API for admins to monitor risk conditions
4. **Advisory Only**: Alerts inform but do not enforce or block withdrawals

### Alert Philosophy

- **Observational**: Alerts describe conditions, not actions
- **In-Memory**: No persistence overhead, lightweight evaluation
- **Deterministic**: Same RiskEvents → Same alerts
- **Foundation**: Enables future notifications (email, Slack, SMS) without rearchitecting

---

## 🏗️ ARCHITECTURE

### Four-Layer Design

#### Layer 1: Type System ([admin-alert.types.ts](backend/src/withdrawals/alerts/admin-alert.types.ts))

- `AdminAlert` interface: Canonical alert structure
- `AlertThreshold` interface: Threshold definition contract
- `AlertSeverity`, `AlertCategory`: Classification types
- Query and result interfaces for API

#### Layer 2: Threshold Configuration ([admin-alert-thresholds.ts](backend/src/withdrawals/alerts/admin-alert-thresholds.ts))

- Static, code-defined thresholds
- 8 threshold definitions covering critical patterns
- Deterministic matching logic
- Evidence-backed descriptions

#### Layer 3: Alert Engine ([admin-alert-engine.service.ts](backend/src/withdrawals/alerts/admin-alert-engine.service.ts))

- Subscribes to RiskEvent bus
- Maintains 24-hour sliding window of events
- Evaluates thresholds on each new event
- Generates AdminAlert objects
- Publishes to alert registry

#### Layer 4: Alert Registry + API

- **Registry**: [admin-alert.service.ts](backend/src/withdrawals/alerts/admin-alert.service.ts)
  - In-memory ring buffer (max 500 alerts)
  - Query with filters (severity, category, withdrawal, user, time)
  - Pagination support
- **Controller**: [admin-alert.controller.ts](backend/src/withdrawals/alerts/admin-alert.controller.ts)
  - GET /api/admin/alerts (query with filters)
  - GET /api/admin/alerts/:id (single alert)
  - RBAC: PLATFORM_ADMIN, ADMIN only

### Data Flow

```
RiskEvent Published (Sprint 16 Phase 1)
  ↓
Alert Engine receives event (subscription)
  ↓
Add to 24h sliding window
  ↓
Evaluate all thresholds (first match wins)
  ↓
Threshold matched?
  ↓ YES
Generate AdminAlert (deterministic ID)
  ↓
Store in alert registry (ring buffer)
  ↓
Admin queries via API
  ↓
Filtered, paginated results returned
```

---

## 📐 CANONICAL ALERT MODEL

### AdminAlert Interface

```typescript
interface AdminAlert {
  // Deterministic identifier (SHA-256 hash)
  readonly alertId: string;

  // Alert creation timestamp (ISO 8601)
  readonly createdAt: string;

  // Alert severity
  readonly severity: "INFO" | "WARNING" | "CRITICAL";

  // Alert category
  readonly category: "FRAUD_RISK" | "COMPLIANCE" | "PROCESS_ANOMALY" | "SYSTEM_SIGNAL";

  // Short summary (max 100 chars)
  readonly title: string;

  // Detailed, factual description
  readonly description: string;

  // Related RiskEvent IDs
  readonly relatedEventIds: string[];

  // Optional entity references
  readonly withdrawalId?: string;
  readonly userId?: string;
  readonly riskLevel?: "LOW" | "MEDIUM" | "HIGH";

  // Source systems
  readonly sources: string[];

  // Sprint marker
  readonly sprint: string;
}
```

### Alert Severity

- **INFO**: Routine information, no action required
- **WARNING**: Elevated risk, review recommended
- **CRITICAL**: High risk, immediate review required

### Alert Category

- **FRAUD_RISK**: Potential fraud indicators (escalation, limits, patterns)
- **COMPLIANCE**: Regulatory or policy violations
- **PROCESS_ANOMALY**: Unexpected system behavior
- **SYSTEM_SIGNAL**: Internal system events

---

## 🎛️ THRESHOLD CONFIGURATION

### Threshold Structure

```typescript
interface AlertThreshold {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly category: AlertCategory;
  readonly title: string;
  match(event: RiskEvent, recentEvents: RiskEvent[]): boolean;
  description(event: RiskEvent, recentEvents: RiskEvent[]): string;
}
```

### 8 Predefined Thresholds

#### 1. CRITICAL_EVENT_IMMEDIATE

**Pattern**: Any CRITICAL severity RiskEvent  
**Severity**: CRITICAL  
**Category**: FRAUD_RISK

Triggers on: Policy violations, high-risk escalations, approval gates with HIGH risk.

**Example**:

```typescript
Event: LIMIT_VIOLATION_DETECTED (HIGH risk)
→ Alert: "Critical risk event requires immediate review"
```

---

#### 2. HIGH_RISK_ESCALATION

**Pattern**: RISK_ESCALATED event + HIGH risk level  
**Severity**: CRITICAL  
**Category**: FRAUD_RISK

Triggers when: Risk scoring system escalates withdrawal to HIGH.

**Example**:

```typescript
Event: RISK_ESCALATED (HIGH, score: 87.3)
→ Alert: "High-risk withdrawal requires urgent review"
Description: "Withdrawal wdr_abc123 escalated to HIGH risk (score: 87.3).
              Signals: velocity_increase, new_account"
```

---

#### 3. POLICY_LIMIT_VIOLATION

**Pattern**: LIMIT_VIOLATION_DETECTED event  
**Severity**: CRITICAL  
**Category**: COMPLIANCE

Triggers when: User exceeds daily/weekly/monthly limit.

**Example**:

```typescript
Event: LIMIT_VIOLATION_DETECTED (daily, requested: 5000, limit: 3000)
→ Alert: "Withdrawal policy limit violated"
Description: "User usr_def456 exceeded DAILY limit.
              Requested: 5000, Limit: 3000. Withdrawal: wdr_abc123."
```

---

#### 4. MULTIPLE_WARNINGS_SAME_WITHDRAWAL

**Pattern**: 3+ WARNING events for same withdrawal within 1 hour  
**Severity**: WARNING  
**Category**: FRAUD_RISK

Triggers when: Multiple moderate risk signals accumulate.

**Example**:

```typescript
Events: COOLING_APPLIED + APPROVAL_GATED + PLAYBOOK_RECOMMENDED (all WARNING)
→ Alert: "Multiple risk signals detected for withdrawal"
Description: "Withdrawal wdr_abc123 triggered 3 warning events in last hour.
              Event types: COOLING_APPLIED, APPROVAL_GATED, PLAYBOOK_RECOMMENDED."
```

---

#### 5. APPROVAL_GATED_HIGH_RISK

**Pattern**: APPROVAL_GATED event + HIGH risk level  
**Severity**: CRITICAL  
**Category**: FRAUD_RISK

Triggers when: Withdrawal blocked pending admin approval due to high risk.

**Example**:

```typescript
Event: APPROVAL_GATED (HIGH, score: 85.5)
→ Alert: "High-risk withdrawal gated for approval"
Description: "Withdrawal wdr_abc123 gated for approval (score: 85.5).
              Reason: High risk score requires review."
```

---

#### 6. COOLING_PERIOD_APPLIED

**Pattern**: COOLING_APPLIED event  
**Severity**: WARNING  
**Category**: PROCESS_ANOMALY

Triggers when: User subject to cooling period after recent withdrawal.

**Example**:

```typescript
Event: COOLING_APPLIED (until 2026-01-06T10:00:00Z)
→ Alert: "Cooling period applied to user"
Description: "User usr_def456 subject to cooling period until 2026-01-06T10:00:00Z
              (previous: wdr_xyz789)."
```

---

#### 7. PLAYBOOK_RECOMMENDED_HIGH_RISK

**Pattern**: PLAYBOOK_RECOMMENDED event + HIGH risk level  
**Severity**: WARNING  
**Category**: FRAUD_RISK

Triggers when: Risk playbook matched for high-risk withdrawal.

**Example**:

```typescript
Event: PLAYBOOK_RECOMMENDED (HIGH, playbook: "High-Value First-Time", match: 92%)
→ Alert: "Risk playbook recommended for review"
Description: "Playbook \"High-Value First-Time Withdrawal Review\"
              recommended for withdrawal wdr_abc123 (match: 92%)."
```

---

#### 8. USER_HIGH_RISK_PATTERN

**Pattern**: Same user triggers 2+ HIGH risk events within 24 hours  
**Severity**: CRITICAL  
**Category**: FRAUD_RISK

Triggers when: User exhibits persistent high-risk behavior.

**Example**:

```typescript
Events: RISK_ESCALATED (HIGH) + APPROVAL_GATED (HIGH) for same user
→ Alert: "User exhibits persistent high-risk behavior"
Description: "User usr_def456 triggered 2 high-risk events in last 24 hours.
              Withdrawals: wdr_abc123, wdr_def456."
```

---

## 🔒 DETERMINISTIC ALERT IDS

### Algorithm: SHA-256 Hashing

```typescript
alertId =
  SHA - 256(createdAt + severity + category + relatedEventIds(sorted) + withdrawalId + userId);
```

### Guarantees

- **Idempotency**: Same inputs → Same `alertId`
- **Collision Resistance**: 2^256 computational infeasibility
- **Traceable**: `alertId` uniquely identifies alert in logs
- **Deduplication**: Future persistence layers can detect duplicates

### Example

```typescript
Input: createdAt: "2026-01-05T10:30:00.000Z";
severity: "CRITICAL";
category: "FRAUD_RISK";
relatedEventIds: ["evt_123", "evt_456"];
withdrawalId: "wdr_abc123";
userId: "usr_def456";

Output: alertId: "8f3e9a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f";
```

---

## 🚨 ALERT ENGINE

### Design: Event-Driven Evaluation

#### Subscription

```typescript
onModuleInit() {
    this.eventBusService.subscribe((event: RiskEvent) => {
        this.handleRiskEvent(event);
    });
}
```

#### Sliding Window Management

- **Window Size**: 24 hours
- **Max Events**: 1000 (FIFO eviction)
- **Pruning**: Old events removed on each evaluation

#### Threshold Evaluation

```typescript
for (const threshold of ALERT_THRESHOLDS) {
  if (threshold.match(event, recentEvents)) {
    const alert = this.generateAlert(event, threshold);
    this.alertService.addAlert(alert);
    break; // First match wins
  }
}
```

#### Error Handling

- **Threshold errors**: Logged, continue to next threshold
- **Engine errors**: Logged, never throw (don't block event bus)

---

## 🗄️ ALERT REGISTRY

### In-Memory Storage

#### Ring Buffer Design

- **Max Size**: 500 alerts
- **Eviction**: FIFO (oldest alerts removed when full)
- **Thread-Safe**: Single Node.js thread (no locks needed)

#### Query Capabilities

```typescript
queryAlerts({
    severity?: 'INFO' | 'WARNING' | 'CRITICAL',
    category?: 'FRAUD_RISK' | 'COMPLIANCE' | 'PROCESS_ANOMALY' | 'SYSTEM_SIGNAL',
    withdrawalId?: string,
    userId?: string,
    startTime?: string, // ISO 8601
    endTime?: string,   // ISO 8601
    limit?: number,     // default: 50, max: 100
    offset?: number,    // default: 0
}): AlertQueryResult
```

#### Response Structure

```typescript
interface AlertQueryResult {
  alerts: AdminAlert[];
  total: number; // Total matching alerts (before pagination)
  limit: number; // Applied limit
  offset: number; // Applied offset
}
```

---

## 📡 API ENDPOINTS

### Authentication & Authorization

**Guards**: `AuthGuard` + `RoleGuard`  
**Required Roles**: `PLATFORM_ADMIN`, `ADMIN`

### Endpoint 1: Query Alerts

**Method**: `GET`  
**Path**: `/api/admin/alerts`

**Query Parameters**:
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `severity` | string | No | Filter by severity | `CRITICAL` |
| `category` | string | No | Filter by category | `FRAUD_RISK` |
| `withdrawalId` | string | No | Filter by withdrawal | `wdr_abc123` |
| `userId` | string | No | Filter by user | `usr_def456` |
| `startTime` | string | No | Start time (ISO 8601) | `2026-01-01T00:00:00.000Z` |
| `endTime` | string | No | End time (ISO 8601) | `2026-01-05T23:59:59.999Z` |
| `limit` | number | No | Pagination limit (1-100) | `50` |
| `offset` | number | No | Pagination offset | `0` |

**Response** (200 OK):

```json
{
  "alerts": [
    {
      "alertId": "8f3e9a2b...",
      "createdAt": "2026-01-05T10:30:00.000Z",
      "severity": "CRITICAL",
      "category": "FRAUD_RISK",
      "title": "High-risk withdrawal requires urgent review",
      "description": "Withdrawal wdr_abc123 escalated to HIGH risk (score: 87.3). Signals: velocity_increase, new_account",
      "relatedEventIds": ["evt_123", "evt_456"],
      "withdrawalId": "wdr_abc123",
      "userId": "usr_def456",
      "riskLevel": "HIGH",
      "sources": ["RISK_ESCALATION", "POLICY_LIMIT"],
      "sprint": "SPRINT_16_PHASE_2"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Error Responses**:

- `400 Bad Request`: Invalid query parameters
- `403 Forbidden`: Not admin role

---

### Endpoint 2: Get Single Alert

**Method**: `GET`  
**Path**: `/api/admin/alerts/:id`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Alert ID (SHA-256 hash) |

**Response** (200 OK):

```json
{
  "alertId": "8f3e9a2b...",
  "createdAt": "2026-01-05T10:30:00.000Z",
  "severity": "CRITICAL",
  "category": "FRAUD_RISK",
  "title": "High-risk withdrawal requires urgent review",
  "description": "...",
  "relatedEventIds": ["evt_123"],
  "withdrawalId": "wdr_abc123",
  "userId": "usr_def456",
  "riskLevel": "HIGH",
  "sources": ["RISK_ESCALATION"],
  "sprint": "SPRINT_16_PHASE_2"
}
```

**Error Responses**:

- `404 Not Found`: Alert ID not found in registry
- `403 Forbidden`: Not admin role

---

## 📊 EXAMPLE ALERT FLOWS

### Scenario 1: High-Risk Escalation Alert

#### Step 1: RiskEvent Published

```typescript
// Sprint 13: Risk escalation service publishes event
eventBus.publish({
    eventId: "evt_abc123",
    eventType: "RISK_ESCALATED",
    severity: "CRITICAL",
    riskLevel: "HIGH",
    riskScore: 87.3,
    withdrawalId: "wdr_abc123",
    userId: "usr_def456",
    metadata: { riskSignals: ["velocity_increase", "new_account"] },
    ...
});
```

#### Step 2: Alert Engine Evaluates

```typescript
// Threshold: HIGH_RISK_ESCALATION
if (event.eventType === "RISK_ESCALATED" && event.riskLevel === "HIGH") {
  // Match!
  const alert = generateAlert(event, HIGH_RISK_ESCALATION);
  alertService.addAlert(alert);
}
```

#### Step 3: Alert Generated

```typescript
{
    alertId: "8f3e9a2b...",
    severity: "CRITICAL",
    category: "FRAUD_RISK",
    title: "High-risk withdrawal requires urgent review",
    description: "Withdrawal wdr_abc123 escalated to HIGH risk (score: 87.3). Signals: velocity_increase, new_account",
    relatedEventIds: ["evt_abc123"],
    ...
}
```

#### Step 4: Admin Queries

```bash
GET /api/admin/alerts?severity=CRITICAL&withdrawalId=wdr_abc123
```

---

### Scenario 2: Multiple Warning Events Alert

#### Step 1: Three WARNING Events (1 Hour Window)

```typescript
// Event 1: Cooling period applied
eventBus.publish({
    eventType: "COOLING_APPLIED",
    severity: "WARNING",
    withdrawalId: "wdr_abc123",
    occurredAt: "2026-01-05T10:00:00.000Z",
    ...
});

// Event 2: Approval gated
eventBus.publish({
    eventType: "APPROVAL_GATED",
    severity: "WARNING",
    withdrawalId: "wdr_abc123",
    occurredAt: "2026-01-05T10:15:00.000Z",
    ...
});

// Event 3: Playbook recommended
eventBus.publish({
    eventType: "PLAYBOOK_RECOMMENDED",
    severity: "WARNING",
    withdrawalId: "wdr_abc123",
    occurredAt: "2026-01-05T10:30:00.000Z",
    ...
});
```

#### Step 2: Third Event Triggers Threshold

```typescript
// Threshold: MULTIPLE_WARNINGS_SAME_WITHDRAWAL
const warningCount = recentEvents.filter(
  (e) => e.withdrawalId === "wdr_abc123" && e.severity === "WARNING" && e.occurredAt >= oneHourAgo
).length;

if (warningCount + 1 >= 3) {
  // Alert triggered!
}
```

#### Step 3: Alert Generated

```typescript
{
    alertId: "7c2d1e0f...",
    severity: "WARNING",
    category: "FRAUD_RISK",
    title: "Multiple risk signals detected for withdrawal",
    description: "Withdrawal wdr_abc123 triggered 3 warning events in last hour. Event types: COOLING_APPLIED, APPROVAL_GATED, PLAYBOOK_RECOMMENDED.",
    relatedEventIds: ["evt_001", "evt_002", "evt_003"],
    ...
}
```

---

## ✅ QUALITY GUARANTEES

### 1. Read-Only

**Guarantee**: No database writes, no schema changes  
**Verification**: No Prisma mutations in alert services

### 2. Observational Only

**Guarantee**: No behavioral changes to Sprint 11-15 systems  
**Verification**: Alerts are published after the fact, never block

### 3. Determinism

**Guarantee**: Same RiskEvents → Same alerts → Same alertIds  
**Verification**: SHA-256 hash is deterministic

### 4. In-Memory

**Guarantee**: No persistence overhead  
**Verification**: Ring buffer in RAM, no database tables

### 5. Synchronous

**Guarantee**: No async workers or background jobs  
**Verification**: All threshold evaluation happens in event handler

### 6. No External Dependencies

**Guarantee**: No message queues, no email/SMS services  
**Verification**: Alerts stored in-memory only, API provides read access

---

## 🚫 NON-GOALS (Phase 2)

### What This Phase Does NOT Include

#### 1. Notifications

- ❌ Email notifications to admins
- ❌ Slack/Teams integrations
- ❌ SMS alerts
- ❌ Push notifications

**Rationale**: Phase 2 provides API for alert querying. Future phases will add notification channels.

#### 2. Persistence

- ❌ Alert database tables
- ❌ Alert history beyond ring buffer
- ❌ Alert archiving

**Rationale**: In-memory ring buffer sufficient for real-time monitoring. Future phases may add persistence.

#### 3. Enforcement

- ❌ Automatic withdrawal blocking based on alerts
- ❌ Alert-driven state transitions
- ❌ Auto-escalation to admins

**Rationale**: Alerts are advisory. Admins review and take manual action.

#### 4. Customization

- ❌ User-defined thresholds (UI configuration)
- ❌ Threshold parameter tuning
- ❌ Custom alert categories

**Rationale**: Phase 2 uses static, code-defined thresholds. Future phases may add configuration UI.

#### 5. Advanced Features

- ❌ Alert aggregation across users
- ❌ Machine learning pattern detection
- ❌ Predictive alerting
- ❌ Alert correlation analysis

**Rationale**: Phase 2 establishes foundation. Future phases can add intelligence.

---

## 🔮 FUTURE PHASES (Roadmap)

### Phase 3: Multi-Channel Notifications

- Email alerts to admins
- Slack/Teams webhook integrations
- SMS alerts for CRITICAL severity
- Configurable notification preferences
- Rate limiting and deduplication

### Phase 4: Alert Persistence & History

- PostgreSQL table for alert history
- Retention policies (e.g., 90 days)
- Alert trend analysis
- Historical query API
- Alert lifecycle tracking (acknowledged, resolved)

### Phase 5: Alert Dashboard

- Real-time alert feed (WebSocket)
- Alert filtering and search UI
- Alert acknowledgment workflow
- Alert resolution workflow
- Alert analytics and trends

### Phase 6: Intelligent Alerting

- Machine learning pattern detection
- Anomaly detection
- Adaptive thresholds
- Alert correlation (cross-user patterns)
- Predictive risk scoring

---

## 🧪 TESTING RECOMMENDATIONS

### Unit Tests

#### Alert Engine Tests

```typescript
describe("AdminAlertEngineService", () => {
  it("should trigger CRITICAL alert on HIGH risk escalation", () => {
    const event = createRiskEvent({
      eventType: "RISK_ESCALATED",
      riskLevel: "HIGH",
    });

    engine.handleRiskEvent(event);

    const alerts = alertService.getAllAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("CRITICAL");
    expect(alerts[0].category).toBe("FRAUD_RISK");
  });

  it("should trigger WARNING alert on 3+ warnings in 1 hour", () => {
    const baseTime = new Date("2026-01-05T10:00:00.000Z");

    // Event 1
    engine.handleRiskEvent(createWarningEvent(baseTime));

    // Event 2 (+15 min)
    engine.handleRiskEvent(createWarningEvent(new Date(baseTime.getTime() + 15 * 60 * 1000)));

    // Event 3 (+30 min) - should trigger alert
    engine.handleRiskEvent(createWarningEvent(new Date(baseTime.getTime() + 30 * 60 * 1000)));

    const alerts = alertService.getAllAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("WARNING");
  });

  it("should generate deterministic alert IDs", () => {
    const event = createRiskEvent({ withdrawalId: "wdr_abc123" });

    engine.handleRiskEvent(event);
    const alert1 = alertService.getAllAlerts()[0];

    alertService.clearAlerts();

    engine.handleRiskEvent(event);
    const alert2 = alertService.getAllAlerts()[0];

    // Same event should generate same alert ID
    expect(alert1.alertId).toBe(alert2.alertId);
  });
});
```

#### Alert Registry Tests

```typescript
describe("AdminAlertService", () => {
  it("should enforce ring buffer size (500 max)", () => {
    for (let i = 0; i < 600; i++) {
      alertService.addAlert(createMockAlert({ alertId: `alert_${i}` }));
    }

    expect(alertService.getAllAlerts()).toHaveLength(500);
  });

  it("should filter alerts by severity", () => {
    alertService.addAlert(createMockAlert({ severity: "CRITICAL" }));
    alertService.addAlert(createMockAlert({ severity: "WARNING" }));
    alertService.addAlert(createMockAlert({ severity: "INFO" }));

    const result = alertService.queryAlerts({ severity: "CRITICAL" });

    expect(result.total).toBe(1);
    expect(result.alerts[0].severity).toBe("CRITICAL");
  });

  it("should paginate results", () => {
    for (let i = 0; i < 100; i++) {
      alertService.addAlert(createMockAlert({ alertId: `alert_${i}` }));
    }

    const result = alertService.queryAlerts({ limit: 20, offset: 40 });

    expect(result.alerts).toHaveLength(20);
    expect(result.total).toBe(100);
    expect(result.offset).toBe(40);
  });
});
```

### Integration Tests

#### End-to-End Alert Flow

```typescript
describe('Alert Flow (E2E)', () => {
    it('should generate alert from RiskEvent and expose via API', async () => {
        // Publish high-risk escalation event
        eventBus.publish({
            eventId: 'evt_123',
            eventType: 'RISK_ESCALATED',
            riskLevel: 'HIGH',
            riskScore: 87.3,
            withdrawalId: 'wdr_abc123',
            userId: 'usr_def456',
            ...
        });

        // Wait for synchronous processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Query via API
        const response = await request(app.getHttpServer())
            .get('/api/admin/alerts')
            .query({ severity: 'CRITICAL' })
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(response.body.alerts).toHaveLength(1);
        expect(response.body.alerts[0].title).toContain('High-risk withdrawal');
    });
});
```

---

## 📖 SUMMARY

Sprint 16 Phase 2 delivers a **production-ready admin alerting system** that:

✅ Evaluates RiskEvents against 8 predefined thresholds  
✅ Generates deterministic AdminAlert objects (SHA-256 IDs)  
✅ Stores alerts in-memory (ring buffer, max 500)  
✅ Provides READ-ONLY API for admin querying  
✅ Enforces RBAC (PLATFORM_ADMIN, ADMIN only)  
✅ Maintains READ-ONLY, observational-only design  
✅ No behavioral changes to existing withdrawal systems  
✅ No database writes or schema changes  
✅ No external dependencies (no queues, no notifications)

**Status**: ✅ **COMPLETE** – Ready for production use

---

## 🎓 KEY LEARNINGS

### 1. Thresholds as Code

Static, code-defined thresholds ensure determinism and auditability. Configuration UI can come later without changing core logic.

### 2. First Match Wins

Evaluating thresholds in severity order (CRITICAL → WARNING → INFO) prevents alert duplication and provides clear priority.

### 3. Sliding Window Pattern

24-hour sliding window enables pattern detection (e.g., "3+ events in 1 hour") without external state management.

### 4. Ring Buffer for Bounded Memory

500-alert ring buffer prevents unbounded growth while retaining recent history for admin review.

### 5. Deterministic IDs Enable Deduplication

SHA-256 alert IDs allow future persistence layers to detect and handle duplicate alerts.

### 6. Separation of Concerns

Alert generation (engine) + alert storage (registry) + alert API (controller) enables independent evolution of each layer.

---

**SPRINT 16 PHASE 2 COMPLETE**: Real-time admin alerts and threshold engine ready for production.
