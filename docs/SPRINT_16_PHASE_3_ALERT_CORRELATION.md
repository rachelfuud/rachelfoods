# Sprint 16 Phase 3: Alert Correlation & Incident Linking

## Overview

Sprint 16 Phase 3 implements a **READ-ONLY correlation layer** that groups related `AdminAlert` records into logical `AlertIncident` entities. This provides higher-level observational intelligence by answering the question: **"Which alerts belong to the same underlying issue?"**

The correlation engine operates entirely **in-memory**, uses **deterministic grouping rules**, and maintains a **pure READ-ONLY** posture with no database writes, no behavioral changes, and no enforcement actions.

## Architecture

### Type System

#### AlertIncident Interface

```typescript
interface AlertIncident {
  readonly incidentId: string; // SHA-256(alertIds + withdrawalId + userId + category + firstSeenAt)
  readonly createdAt: string; // ISO 8601 timestamp
  readonly severity: IncidentSeverity; // Max severity of all correlated alerts
  readonly status: IncidentStatus; // OPEN (active) or STALE (inactive 6h+)
  readonly category: IncidentCategory; // FRAUD_RISK | COMPLIANCE | PROCESS_ANOMALY | SYSTEM_SIGNAL
  readonly title: string; // Human-readable title
  readonly summary: string; // Factual summary with counts
  readonly alertIds: readonly string[]; // Alert IDs in incident
  readonly relatedEventIds: readonly string[]; // Union of RiskEvent IDs from alerts
  readonly withdrawalId?: string; // If correlated by withdrawal
  readonly userId?: string; // If correlated by user
  readonly riskLevel?: RiskLevel; // Max risk level across alerts
  readonly firstSeenAt: string; // Earliest alert timestamp
  readonly lastSeenAt: string; // Most recent alert timestamp
  readonly alertCount: number; // Number of alerts in incident
  readonly sources: readonly string[]; // Union of alert sources
  readonly sprint: string; // "SPRINT_16_PHASE_3"
}
```

#### CorrelationRule Interface

```typescript
interface CorrelationRule {
  readonly id: string;
  readonly description: string;
  shouldCorrelate(alert: AdminAlert, incident: AlertIncident): boolean;
  getCorrelationKey(alert: AdminAlert): string;
}
```

#### Incident Status Lifecycle

```typescript
type IncidentStatus = "OPEN" | "STALE";

// OPEN:  Recent alert activity (within 6h staleness threshold)
// STALE: No new alerts for 6h+ (automatically marked by updateStaleIncidents())
```

### Correlation Rules

The `AlertCorrelationEngine` evaluates 3 correlation rules **in priority order**:

#### Rule 1: Same Withdrawal (Highest Priority)

**Logic**: Alerts with identical `withdrawalId` are grouped together.

**Correlation Key**: `withdrawal:{withdrawalId}`

**Use Case**: All alerts related to a specific withdrawal belong to same incident.

**Example**:

```typescript
Alert A: { alertId: 'a1', withdrawalId: 'w123', category: 'FRAUD_RISK' }
Alert B: { alertId: 'a2', withdrawalId: 'w123', category: 'COMPLIANCE' }
// Result: Grouped into same incident (correlation key: 'withdrawal:w123')
```

#### Rule 2: Same User + Category + Time Window

**Logic**: Alerts for same `userId` + `category` within 24-hour window are grouped.

**Correlation Key**: `user_category:{userId}:{category}:{hourBucket}`

**Use Case**: Pattern of alerts for same user in same risk category.

**Example**:

```typescript
Alert A: { alertId: 'a1', userId: 'u456', category: 'FRAUD_RISK', triggeredAt: '2025-01-15T10:00:00Z' }
Alert B: { alertId: 'a2', userId: 'u456', category: 'FRAUD_RISK', triggeredAt: '2025-01-15T12:00:00Z' }
// Result: Grouped into same incident (correlation key: 'user_category:u456:FRAUD_RISK:2025-01-15T00')
```

#### Rule 3: Shared RiskEvent IDs

**Logic**: Alerts that share one or more `RiskEvent` IDs are grouped.

**Correlation Key**: `event:{eventId}` (first shared event ID)

**Use Case**: Alerts triggered by same underlying risk event.

**Example**:

```typescript
Alert A: { alertId: 'a1', relatedEventIds: ['e789', 'e790'] }
Alert B: { alertId: 'a2', relatedEventIds: ['e789', 'e791'] }
// Result: Grouped into same incident (correlation key: 'event:e789')
```

#### Fallback: No Correlation

If no rule matches, alert gets unique correlation key: `alert:{alertId}` (single-alert incident).

### Correlation Flow

```typescript
// 1. New alert arrives from AdminAlertEngine
correlateAlert(alert: AdminAlert) {
    // 2. Generate correlation key (tries 3 rules, returns first match)
    const correlationKey = correlationEngine.getCorrelationKey(alert);

    // 3. Check if incident exists with this key
    const existingIncident = incidents.get(correlationKey);

    if (existingIncident && correlationEngine.shouldCorrelate(alert, existingIncident)) {
        // 4a. Add alert to existing incident
        const allAlerts = getAlertsForIncident(existingIncident);
        allAlerts.push(alert);
        const updatedIncident = correlationEngine.updateIncident(
            existingIncident, alert, allAlerts
        );
        incidents.set(correlationKey, updatedIncident);
    } else {
        // 4b. Create new incident
        const newIncident = correlationEngine.createIncident([alert]);
        incidents.set(correlationKey, newIncident);
    }

    // 5. Update staleness and enforce limits
    updateStaleIncidents();  // Mark incidents STALE if 6h+ no activity
    enforceMaxIncidents();   // FIFO eviction if 1000 limit reached
}
```

### Incident Service

#### In-Memory Storage

```typescript
class AlertIncidentService {
  private incidents: Map<string, AlertIncident>; // correlationKey → incident
  private alertToIncidentMap: Map<string, string>; // alertId → incidentId
  private readonly MAX_INCIDENTS = 1000; // FIFO eviction
  private readonly STALENESS_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
}
```

#### Initialization

```typescript
async onModuleInit() {
    // Process existing alerts from AdminAlertService on startup
    const existingAlerts = adminAlertService.getAllAlerts();
    for (const alert of existingAlerts) {
        await correlateAlert(alert);
    }
}
```

#### Key Methods

- **correlateAlert(alert)**: Group alert using correlation engine
- **createNewIncident(alert, key)**: Create incident from single alert
- **updateStaleIncidents()**: Mark incidents STALE if 6h+ no activity
- **enforceMaxIncidents()**: FIFO eviction when limit reached
- **queryIncidents(filters)**: Filter and paginate incidents
- **getIncidentById(id)**: Retrieve single incident with full alerts
- **getStatistics()**: Correlation metrics

### API Endpoints

#### GET /api/admin/alert-incidents

**Purpose**: Query incidents with filters

**RBAC**: `PLATFORM_ADMIN` or `ADMIN`

**Query Parameters**:

- `severity?: 'INFO' | 'WARNING' | 'CRITICAL'`
- `status?: 'OPEN' | 'STALE'`
- `category?: 'FRAUD_RISK' | 'COMPLIANCE' | 'PROCESS_ANOMALY' | 'SYSTEM_SIGNAL'`
- `withdrawalId?: string`
- `userId?: string`
- `startTime?: string` (ISO 8601)
- `endTime?: string` (ISO 8601)
- `limit?: number` (default 20, max 50)
- `offset?: number` (default 0)

**Response**:

```typescript
{
    incidents: AlertIncident[];
    total: number;
    limit: number;
    offset: number;
}
```

**Example Request**:

```http
GET /api/admin/alert-incidents?severity=CRITICAL&status=OPEN&limit=10
```

**Example Response**:

```json
{
  "incidents": [
    {
      "incidentId": "sha256hash...",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "severity": "CRITICAL",
      "status": "OPEN",
      "category": "FRAUD_RISK",
      "title": "Fraud Risk Incident for Withdrawal w123",
      "summary": "3 CRITICAL alerts, 1 withdrawal (w123), 5 related events",
      "alertIds": ["a1", "a2", "a3"],
      "relatedEventIds": ["e789", "e790", "e791"],
      "withdrawalId": "w123",
      "userId": "u456",
      "riskLevel": "HIGH",
      "firstSeenAt": "2025-01-15T10:00:00.000Z",
      "lastSeenAt": "2025-01-15T12:30:00.000Z",
      "alertCount": 3,
      "sources": ["AdminAlertEngine"],
      "sprint": "SPRINT_16_PHASE_3"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

#### GET /api/admin/alert-incidents/:id

**Purpose**: Get single incident with full alert details

**RBAC**: `PLATFORM_ADMIN` or `ADMIN`

**Path Parameter**: `incidentId` (SHA-256 hash)

**Response**:

```typescript
{
    incident: AlertIncident;
    alerts: AdminAlert[];
}
```

**Example Request**:

```http
GET /api/admin/alert-incidents/sha256hash...
```

**Example Response**:

```json
{
    "incident": {
        "incidentId": "sha256hash...",
        "severity": "CRITICAL",
        "status": "OPEN",
        "category": "FRAUD_RISK",
        "title": "Fraud Risk Incident for Withdrawal w123",
        "alertIds": ["a1", "a2", "a3"],
        "alertCount": 3,
        ...
    },
    "alerts": [
        {
            "alertId": "a1",
            "triggeredAt": "2025-01-15T10:00:00.000Z",
            "severity": "CRITICAL",
            "category": "FRAUD_RISK",
            "thresholdId": "critical_events",
            "relatedEventIds": ["e789"],
            ...
        },
        {
            "alertId": "a2",
            "triggeredAt": "2025-01-15T11:00:00.000Z",
            "severity": "WARNING",
            "category": "COMPLIANCE",
            "thresholdId": "limit_violations",
            "relatedEventIds": ["e790"],
            ...
        },
        {
            "alertId": "a3",
            "triggeredAt": "2025-01-15T12:30:00.000Z",
            "severity": "CRITICAL",
            "category": "FRAUD_RISK",
            "thresholdId": "critical_events",
            "relatedEventIds": ["e791"],
            ...
        }
    ]
}
```

## Determinism Guarantees

### Pure Functions

All correlation logic resides in **pure functions** with no side effects:

```typescript
class AlertCorrelationEngine {
    // ✅ Pure: Same inputs → same outputs
    getCorrelationKey(alert: AdminAlert): string { ... }
    shouldCorrelate(alert: AdminAlert, incident: AlertIncident): boolean { ... }
    createIncident(alerts: AdminAlert[]): AlertIncident { ... }
    updateIncident(incident: AlertIncident, alert: AdminAlert, allAlerts: AdminAlert[]): AlertIncident { ... }
}
```

### Deterministic Grouping

- **Same alerts → same incident**: Correlation rules are deterministic
- **Rule priority**: Rules evaluated in fixed order (withdrawal > user+category+time > shared events)
- **Time-based**: 24h correlation window ensures consistent grouping

### SHA-256 Incident IDs

Incident IDs are **cryptographic hashes** of incident metadata:

```typescript
generateIncidentId(incident: Partial<AlertIncident>): string {
    const payload = JSON.stringify({
        alertIds: incident.alertIds,
        withdrawalId: incident.withdrawalId,
        userId: incident.userId,
        category: incident.category,
        firstSeenAt: incident.firstSeenAt,
    });
    return createHash('sha256').update(payload).digest('hex');
}
```

This ensures:

- **Collision resistance**: Different incidents have different IDs
- **Reproducibility**: Same incident metadata → same ID
- **Immutability**: ID doesn't change when alerts are added (uses sorted alertIds)

## Incident Lifecycle

### Status Transitions

```
NEW ALERT
    ↓
[OPEN] ←──────────────────┐
    ↓                      │
    │ (No alerts for 6h)   │ (New alert arrives)
    ↓                      │
[STALE] ───────────────────┘
```

#### OPEN Status

- **Condition**: Recent alert activity (within 6h staleness threshold)
- **Characteristics**:
  - `lastSeenAt` within 6 hours of current time
  - Actively receiving alerts
  - Requires admin attention

#### STALE Status

- **Condition**: No new alerts for 6h+
- **Characteristics**:
  - `lastSeenAt` more than 6 hours ago
  - No recent activity
  - Lower priority for review
- **Transition Back**: If new alert arrives for stale incident, status changes back to OPEN

### Staleness Detection

```typescript
updateStaleIncidents() {
    const now = Date.now();
    for (const [key, incident] of incidents.entries()) {
        if (incident.status === 'OPEN') {
            const timeSinceLastAlert = now - new Date(incident.lastSeenAt).getTime();
            if (timeSinceLastAlert > STALENESS_THRESHOLD_MS) {
                incidents.set(key, { ...incident, status: 'STALE' });
            }
        }
    }
}
```

**Called**: After every alert correlation

### Eviction Policy

When incident count exceeds 1000:

```typescript
enforceMaxIncidents() {
    if (incidents.size > MAX_INCIDENTS) {
        const sortedIncidents = Array.from(incidents.entries())
            .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));

        const toRemove = sortedIncidents.slice(0, incidents.size - MAX_INCIDENTS);
        for (const [key, incident] of toRemove) {
            incidents.delete(key);
            for (const alertId of incident.alertIds) {
                alertToIncidentMap.delete(alertId);
            }
        }
    }
}
```

**Policy**: FIFO (First In, First Out) - oldest incidents removed first

## Severity Calculation

Incident severity = **max(alert severities)**:

```typescript
calculateIncidentSeverity(alerts: AdminAlert[]): IncidentSeverity {
    const severities = alerts.map(a => a.severity);
    if (severities.includes('CRITICAL')) return 'CRITICAL';
    if (severities.includes('WARNING')) return 'WARNING';
    return 'INFO';
}
```

**Rationale**: Incident priority should match highest-priority alert within it.

## Relationship to Sprint 15 Incident Reconstruction

| Aspect         | Sprint 15 Incident Reconstruction         | Sprint 16 Phase 3 Alert Correlation  |
| -------------- | ----------------------------------------- | ------------------------------------ |
| **Purpose**    | Historical forensic analysis              | Real-time alert grouping             |
| **Input**      | Withdrawal state + actions + risk signals | AdminAlerts from Phase 2             |
| **Output**     | Detailed incident report with timeline    | Logical grouping of related alerts   |
| **Time Frame** | Historical (post-mortem)                  | Real-time (as alerts arrive)         |
| **Storage**    | In-memory (on-demand)                     | In-memory (persistent registry)      |
| **Grouping**   | Single withdrawal                         | Multiple withdrawals, users, events  |
| **Use Case**   | Compliance narrative, export              | Admin dashboard, pattern recognition |

**Key Difference**: Sprint 15 reconstructs **one withdrawal's incident history** for export. Sprint 16 Phase 3 groups **related alerts across withdrawals** for observability.

## Use Cases

### 1. Pattern Recognition

**Scenario**: Admin reviews dashboard and sees 15 alerts.

**Without Correlation**:

- Admin must manually review each alert
- Difficult to identify which alerts are related
- High cognitive load

**With Correlation**:

- 15 alerts grouped into 3 incidents:
  - Incident 1: 8 alerts for withdrawal w123 (CRITICAL)
  - Incident 2: 5 alerts for user u456 (WARNING)
  - Incident 3: 2 alerts for event e789 (INFO)
- Admin focuses on Incident 1 first (highest severity)

### 2. Noise Reduction

**Scenario**: Withdrawal w123 triggers 10 alerts as it progresses through states.

**Without Correlation**:

- 10 separate alerts clutter dashboard
- Admin must mentally group them

**With Correlation**:

- 10 alerts grouped into single incident
- Incident shows lifecycle: 10 alerts, first → last timestamps
- Single-pane-of-glass view

### 3. Priority Sorting

**Scenario**: Admin wants to focus on most urgent issues.

**Query**:

```http
GET /api/admin/alert-incidents?severity=CRITICAL&status=OPEN&limit=5
```

**Result**: Top 5 open critical incidents, ordered by creation time.

### 4. User-Centric View

**Scenario**: Admin investigates user u456 for suspicious activity.

**Query**:

```http
GET /api/admin/alert-incidents?userId=u456&status=OPEN
```

**Result**: All open incidents involving user u456, showing correlated alerts.

## Non-Goals (Phase 3)

### ❌ No Persistence

- Incidents stored **in-memory only**
- No database tables (no `AlertIncident` model in Prisma)
- On service restart, incidents regenerated from existing alerts

**Rationale**: Phase 3 focuses on **real-time observability**, not historical storage. Persistence deferred to future phase.

### ❌ No Notifications

- No emails, webhooks, or push notifications
- Admins must query API to view incidents

**Rationale**: Phase 3 is **READ-ONLY observability**. Notifications are enforcement/action, deferred to Phase 4+.

### ❌ No Automated Actions

- No auto-escalation
- No auto-approval/rejection
- No state transitions

**Rationale**: Phase 3 is **observational only**. Automation deferred to future phases.

### ❌ No Machine Learning

- No predictive correlation
- No anomaly detection
- No inferred relationships

**Rationale**: Phase 3 uses **deterministic rules only**. ML intelligence deferred to Phase 5+.

### ❌ No Background Jobs

- No scheduled tasks
- No async processing
- No queue workers

**Rationale**: Phase 3 operates **synchronously** in response to events. Background processing deferred to Phase 4+.

## Monitoring & Observability

### Correlation Statistics

```typescript
getStatistics(): CorrelationStatistics {
    const openIncidents = Array.from(incidents.values()).filter(i => i.status === 'OPEN').length;
    const staleIncidents = Array.from(incidents.values()).filter(i => i.status === 'STALE').length;
    const totalAlerts = Array.from(incidents.values()).reduce((sum, i) => sum + i.alertCount, 0);
    const avgAlertsPerIncident = incidents.size > 0 ? totalAlerts / incidents.size : 0;

    return {
        totalIncidents: incidents.size,
        openIncidents,
        staleIncidents,
        avgAlertsPerIncident,
    };
}
```

**Metrics**:

- `totalIncidents`: Current count
- `openIncidents`: Active incidents
- `staleIncidents`: Inactive incidents
- `avgAlertsPerIncident`: Correlation effectiveness (higher = better grouping)

### Logging

All operations log structured events with `SPRINT_16_PHASE_3` marker:

```typescript
logger.log(
  `[SPRINT_16_PHASE_3] Correlated alert ${alert.alertId} into incident ${incident.incidentId} (key: ${correlationKey})`
);
logger.log(
  `[SPRINT_16_PHASE_3] Created new incident ${incident.incidentId} (key: ${correlationKey})`
);
logger.log(`[SPRINT_16_PHASE_3] Marked ${staleCount} incidents as STALE`);
logger.log(`[SPRINT_16_PHASE_3] Evicted ${evictCount} oldest incidents (limit: ${MAX_INCIDENTS})`);
```

## Configuration

### Tunable Parameters

```typescript
// Correlation window: How far back to correlate alerts
const CORRELATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Staleness threshold: When to mark incident as STALE
const STALENESS_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

// Max incidents: FIFO eviction limit
const MAX_INCIDENTS = 1000;

// Query limits
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
```

**Why These Values**:

- **24h correlation window**: Balances grouping related alerts vs. creating stale incidents
- **6h staleness threshold**: Distinguishes active vs. inactive issues
- **1000 incidents**: Prevents unbounded memory growth
- **50 max results**: Prevents large API responses

### Future Tuning

Correlation rules can be extended:

```typescript
// Example: Rule 4 - Same IP Address + Category
{
    id: 'same_ip_category',
    description: 'Alerts from same IP + category',
    shouldCorrelate: (alert, incident) => { ... },
    getCorrelationKey: (alert) => `ip_category:${alert.ipAddress}:${alert.category}`,
}
```

**Extensibility**: Add new rules to `AlertCorrelationEngine` without changing service logic.

## Testing

### Unit Tests

```typescript
describe("AlertCorrelationEngine", () => {
  it("should group alerts with same withdrawalId", () => {
    const alert1 = { alertId: "a1", withdrawalId: "w123" };
    const alert2 = { alertId: "a2", withdrawalId: "w123" };

    const key1 = engine.getCorrelationKey(alert1);
    const key2 = engine.getCorrelationKey(alert2);

    expect(key1).toBe("withdrawal:w123");
    expect(key2).toBe("withdrawal:w123");
  });

  it("should calculate incident severity as max alert severity", () => {
    const alerts = [{ severity: "INFO" }, { severity: "CRITICAL" }, { severity: "WARNING" }];

    const severity = engine.calculateIncidentSeverity(alerts);

    expect(severity).toBe("CRITICAL");
  });
});
```

### Integration Tests

```typescript
describe("AlertIncidentService", () => {
  it("should correlate alert into existing incident", async () => {
    const alert1 = { alertId: "a1", withdrawalId: "w123", severity: "WARNING" };
    const alert2 = { alertId: "a2", withdrawalId: "w123", severity: "CRITICAL" };

    await service.correlateAlert(alert1);
    await service.correlateAlert(alert2);

    const stats = service.getStatistics();
    expect(stats.totalIncidents).toBe(1); // Both alerts in same incident

    const incident = Array.from(service["incidents"].values())[0];
    expect(incident.alertCount).toBe(2);
    expect(incident.severity).toBe("CRITICAL"); // Max severity
  });
});
```

### E2E Tests

```typescript
describe("AlertIncidentController (e2e)", () => {
  it("GET /api/admin/alert-incidents should return paginated incidents", () => {
    return request(app.getHttpServer())
      .get("/api/admin/alert-incidents?limit=10&offset=0")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("incidents");
        expect(res.body).toHaveProperty("total");
        expect(res.body.incidents.length).toBeLessThanOrEqual(10);
      });
  });
});
```

## Future Enhancements (Phase 4+)

### Phase 4: Multi-Channel Notifications

- Email/SMS alerts for critical incidents
- Webhook integration for external systems
- Push notifications for mobile apps

### Phase 5: Persistence & Analytics

- Database storage for historical incidents
- Time-series analysis
- Trend dashboards

### Phase 6: Machine Learning Intelligence

- Predictive correlation (infer relationships)
- Anomaly detection
- Risk scoring

### Phase 7: Automated Response

- Auto-escalation workflows
- Incident assignment
- Remediation playbooks

## Summary

Sprint 16 Phase 3 provides **real-time observational intelligence** by grouping related alerts into logical incidents. The implementation:

✅ **READ-ONLY**: No database writes, no state mutations  
✅ **Deterministic**: Pure functions, consistent grouping  
✅ **In-Memory**: No persistence, regenerates on restart  
✅ **Extensible**: Easy to add new correlation rules  
✅ **Observable**: Rich query API with RBAC  
✅ **Lifecycle-Aware**: OPEN → STALE status transitions  
✅ **Bounded**: FIFO eviction at 1000 incidents

**Next Phase**: Multi-channel notifications and persistence (Sprint 16 Phase 4+)

---

**Related Documentation**:

- [Sprint 16 Phase 1: Risk Event Normalization](./SPRINT_16_PHASE_1_RISK_EVENTS.md)
- [Sprint 16 Phase 2: Admin Alerts & Thresholds](./SPRINT_16_PHASE_2_ADMIN_ALERTS.md)
- [Sprint 15: Incident Reconstruction](./MODULE_INCIDENT_RECONSTRUCTION.md) (Historical forensics)
