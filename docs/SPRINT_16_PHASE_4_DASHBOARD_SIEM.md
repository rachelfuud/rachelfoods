# Sprint 16 Phase 4: Dashboards, Snapshots & SIEM Export Adapters

## Overview

Sprint 16 Phase 4 introduces **READ-ONLY aggregation and export layers** that expose operational intelligence for:

- **Internal dashboards**: Executive summaries and admin UI
- **External SIEM platforms**: Splunk, Elastic Security, Azure Sentinel

This completes the Sprint 16 observability pipeline:

- **Phase 1**: Risk event normalization (canonical events)
- **Phase 2**: Alert generation (threshold-based alerting)
- **Phase 3**: Incident correlation (related alert grouping)
- **Phase 4**: Dashboards & SIEM exports (visibility & compliance) ← **CURRENT**

## Architecture

### Dashboard Metrics

**Purpose**: Aggregate operational statistics for admin dashboards

**Data Sources**:

- AdminAlerts (Phase 2)
- AlertIncidents (Phase 3)
- _Note_: RiskEventBus (Phase 1) doesn't store events (pub/sub only), so event metrics are placeholders

**Aggregation Windows**:

- 1 hour
- 6 hours
- 24 hours (default)

**Characteristics**:

- **On-demand**: Metrics recomputed per request (no caching)
- **Deterministic**: Same data → same metrics
- **READ-ONLY**: No state mutations
- **In-memory**: No persistence

### SIEM Export

**Purpose**: Convert internal objects to flat, normalized records for external security platforms

**Supported Platforms**:

- Splunk (HEC - HTTP Event Collector)
- Elastic Security (Bulk API)
- Azure Sentinel (Data Connector)
- Generic JSON log aggregators

**Export Sources**:

- AdminAlerts (Phase 2)
- AlertIncidents (Phase 3)
- _Note_: RiskEvents not exported (bus doesn't store them)

**Output Formats**:

- **JSON**: Standard JSON array
- **NDJSON**: Newline-delimited JSON (one record per line)

**Characteristics**:

- **Streaming**: Efficient for large datasets
- **Deterministic IDs**: SHA-256 hashing
- **Flat structure**: No nested objects (SIEM-friendly)
- **Time-windowed**: 1h, 6h, 24h

## Dashboard Metrics API

### Endpoint

```
GET /api/admin/dashboard/metrics
```

### RBAC

- Requires: `PLATFORM_ADMIN` or `ADMIN`

### Query Parameters

| Parameter     | Type           | Default | Description             |
| ------------- | -------------- | ------- | ----------------------- |
| `windowHours` | `1 \| 6 \| 24` | `24`    | Aggregation time window |

### Response Schema

```typescript
{
  generatedAt: string;        // ISO 8601 timestamp
  windowHours: number;        // 1, 6, or 24
  events: {                   // Placeholder (RiskEventBus doesn't store)
    total: 0,
    byType: {},
    bySeverity: {}
  },
  alerts: {
    total: number;
    bySeverity: {
      INFO: number;
      WARNING: number;
      CRITICAL: number;
    };
    byCategory: {
      FRAUD_RISK: number;
      COMPLIANCE: number;
      PROCESS_ANOMALY: number;
      SYSTEM_SIGNAL: number;
    };
    activeLastHour: number;   // Alerts in last 60 minutes
  },
  incidents: {
    total: number;
    open: number;             // OPEN status
    stale: number;            // STALE status
    byCategory: { ... };
    bySeverity: { ... };
  },
  topRiskUsers: [
    {
      userId: string;
      alertCount: number;
      incidentCount: number;
      highestSeverity: 'INFO' | 'WARNING' | 'CRITICAL';
    }
  ],
  sprint: 'SPRINT_16_PHASE_4'
}
```

### Example Request

```bash
curl -X GET "https://api.example.com/api/admin/dashboard/metrics?windowHours=6" \
  -H "Authorization: Bearer <admin_token>"
```

### Example Response

```json
{
  "generatedAt": "2026-01-05T15:30:00.000Z",
  "windowHours": 6,
  "events": {
    "total": 0,
    "byType": {},
    "bySeverity": {}
  },
  "alerts": {
    "total": 23,
    "bySeverity": {
      "INFO": 8,
      "WARNING": 10,
      "CRITICAL": 5
    },
    "byCategory": {
      "FRAUD_RISK": 12,
      "COMPLIANCE": 7,
      "PROCESS_ANOMALY": 4
    },
    "activeLastHour": 4
  },
  "incidents": {
    "total": 8,
    "open": 5,
    "stale": 3,
    "byCategory": {
      "FRAUD_RISK": 4,
      "COMPLIANCE": 3,
      "PROCESS_ANOMALY": 1
    },
    "bySeverity": {
      "CRITICAL": 3,
      "WARNING": 4,
      "INFO": 1
    }
  },
  "topRiskUsers": [
    {
      "userId": "user_789",
      "alertCount": 8,
      "incidentCount": 2,
      "highestSeverity": "CRITICAL"
    },
    {
      "userId": "user_456",
      "alertCount": 6,
      "incidentCount": 2,
      "highestSeverity": "WARNING"
    },
    {
      "userId": "user_123",
      "alertCount": 4,
      "incidentCount": 1,
      "highestSeverity": "WARNING"
    }
  ],
  "sprint": "SPRINT_16_PHASE_4"
}
```

### Dashboard Metrics Details

#### Top Risk Users

**Calculation**:

1. Count alerts per user
2. Count incidents per user
3. Determine highest severity across alerts/incidents
4. Sort by: severity (CRITICAL > WARNING > INFO), then alert count, then incident count
5. Return top 10

**Use Case**: Identify users requiring immediate review

#### Active Last Hour

**Definition**: Count of alerts with `createdAt` within last 60 minutes

**Use Case**: Real-time activity monitoring

## SIEM Export API

### Endpoint

```
GET /api/admin/siem-export
```

### RBAC

- Requires: `PLATFORM_ADMIN` only (stricter than dashboard)

### Query Parameters

| Parameter     | Type                               | Default  | Description           |
| ------------- | ---------------------------------- | -------- | --------------------- |
| `source`      | `'alerts' \| 'incidents' \| 'all'` | `'all'`  | Data source to export |
| `format`      | `'json' \| 'ndjson'`               | `'json'` | Output format         |
| `windowHours` | `1 \| 6 \| 24`                     | `24`     | Time window           |

### Response

- **Content-Type**: `application/json` (JSON) or `application/x-ndjson` (NDJSON)
- **Streaming**: Records streamed to client
- **Filename**: Auto-generated attachment name

### SIEM Record Schema

```typescript
{
  recordId: string;           // SHA-256(source + sourceId + timestamp)
  timestamp: string;          // ISO 8601
  source: 'ALERT' | 'INCIDENT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: string;           // Source-specific category
  message: string;            // Human-readable summary
  withdrawalId?: string;      // Optional withdrawal reference
  userId?: string;            // Optional user reference
  metadata: {                 // Flat key-value pairs
    // Source-specific fields
  };
  sprint: 'SPRINT_16_PHASE_4';
}
```

### Example Requests

#### Export All (JSON)

```bash
curl -X GET "https://api.example.com/api/admin/siem-export?source=all&format=json&windowHours=24" \
  -H "Authorization: Bearer <platform_admin_token>" \
  -o siem-export.json
```

#### Export Incidents (NDJSON)

```bash
curl -X GET "https://api.example.com/api/admin/siem-export?source=incidents&format=ndjson&windowHours=6" \
  -H "Authorization: Bearer <platform_admin_token>" \
  -o siem-export.ndjson
```

### Example SIEM Records

#### Alert Record

```json
{
  "recordId": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
  "timestamp": "2026-01-05T15:00:00.000Z",
  "source": "ALERT",
  "severity": "CRITICAL",
  "category": "FRAUD_RISK",
  "message": "Admin alert: High-risk withdrawal requires review",
  "withdrawalId": "wdr_abc123",
  "userId": "user_789",
  "metadata": {
    "alertId": "alert_xyz",
    "title": "High-risk withdrawal requires review",
    "description": "Withdrawal wdr_abc123 escalated to HIGH risk with 3 risk signals",
    "relatedEventIds": ["evt_001", "evt_002", "evt_003"],
    "riskLevel": "HIGH",
    "sources": ["RISK_ESCALATION", "POLICY_LIMIT"]
  },
  "sprint": "SPRINT_16_PHASE_4"
}
```

#### Incident Record

```json
{
  "recordId": "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  "timestamp": "2026-01-05T15:10:00.000Z",
  "source": "INCIDENT",
  "severity": "CRITICAL",
  "category": "FRAUD_RISK",
  "message": "Fraud Risk Incident for Withdrawal wdr_abc123",
  "withdrawalId": "wdr_abc123",
  "userId": "user_789",
  "metadata": {
    "incidentId": "incident_sha256",
    "status": "OPEN",
    "title": "Fraud Risk Incident for Withdrawal wdr_abc123",
    "summary": "3 CRITICAL alerts, 1 withdrawal (wdr_abc123), 5 related events",
    "alertIds": ["alert_xyz", "alert_uvw", "alert_rst"],
    "relatedEventIds": ["evt_001", "evt_002", "evt_003", "evt_004", "evt_005"],
    "riskLevel": "HIGH",
    "firstSeenAt": "2026-01-05T15:00:00.000Z",
    "lastSeenAt": "2026-01-05T15:10:00.000Z",
    "alertCount": 3,
    "sources": ["AdminAlertEngine"]
  },
  "sprint": "SPRINT_16_PHASE_4"
}
```

## SIEM Platform Integration

### Splunk

#### HTTP Event Collector (HEC)

```bash
# Export to NDJSON
curl -X GET "https://api.example.com/api/admin/siem-export?format=ndjson" \
  -H "Authorization: Bearer <token>" \
  -o siem-export.ndjson

# Send to Splunk HEC
cat siem-export.ndjson | while read line; do
  curl -X POST "https://splunk.example.com:8088/services/collector/event" \
    -H "Authorization: Splunk <splunk_hec_token>" \
    -H "Content-Type: application/json" \
    -d "{\"event\": $line}"
done
```

#### Splunk Search Queries

```spl
# Count alerts by severity
index=rachel_foods source=ALERT
| stats count by severity

# Top risk users
index=rachel_foods
| stats sum(alertCount) as totalAlerts sum(incidentCount) as totalIncidents by userId
| sort -totalAlerts

# Incident timeline
index=rachel_foods source=INCIDENT
| timechart count by severity
```

### Elastic Security

#### Bulk API Ingestion

```bash
# Export to NDJSON
curl -X GET "https://api.example.com/api/admin/siem-export?format=ndjson" \
  -H "Authorization: Bearer <token>" \
  -o siem-export.ndjson

# Transform to Elastic bulk format
cat siem-export.ndjson | awk '{print "{\"index\":{\"_index\":\"rachel-foods-siem\"}}"; print}' > elastic-bulk.ndjson

# Send to Elastic
curl -X POST "https://elastic.example.com:9200/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  -H "Authorization: ApiKey <elastic_api_key>" \
  --data-binary @elastic-bulk.ndjson
```

#### Elastic Search Queries

```json
GET /rachel-foods-siem/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "source": "ALERT" }},
        { "term": { "severity": "CRITICAL" }}
      ]
    }
  },
  "aggs": {
    "by_category": {
      "terms": { "field": "category" }
    }
  }
}
```

### Azure Sentinel

#### Data Connector (Custom Logs)

```powershell
# Export to JSON
$response = Invoke-RestMethod -Uri "https://api.example.com/api/admin/siem-export?format=json" `
  -Headers @{ Authorization = "Bearer <token>" } `
  -Method Get

# Send to Azure Log Analytics
$json = $response | ConvertTo-Json -Depth 10
Invoke-AzOperationalInsightsIngestion -WorkspaceId "<workspace_id>" `
  -SharedKey "<shared_key>" `
  -LogType "RachelFoodsSIEM" `
  -Body $json
```

#### KQL Queries (Kusto)

```kql
// Count alerts by severity
RachelFoodsSIEM_CL
| where source_s == "ALERT"
| summarize count() by severity_s

// Incident timeline
RachelFoodsSIEM_CL
| where source_s == "INCIDENT"
| summarize count() by bin(timestamp_t, 1h), severity_s
| render timechart
```

## Determinism & Compliance

### Deterministic Record IDs

```typescript
generateRecordId(source: 'ALERT' | 'INCIDENT', sourceId: string, timestamp: string): string {
  const payload = JSON.stringify({ source, sourceId, timestamp });
  return createHash('sha256').update(payload).digest('hex');
}
```

**Guarantees**:

- Same alert/incident → same record ID
- Collision resistant (SHA-256)
- Reproducible across exports

### Compliance Properties

✅ **READ-ONLY**: No database writes, no state mutations  
✅ **Audit-Ready**: Every export logged with `SPRINT_16_PHASE_4` marker  
✅ **Deterministic**: Same data → same output  
✅ **Flat Structure**: SIEM-friendly (no nested objects)  
✅ **Time-Windowed**: Bounded export sizes  
✅ **RBAC**: Platform admin only for SIEM exports

## Non-Goals (Phase 4)

### ❌ No Push

- No webhooks
- No streaming subscriptions
- No background jobs
- Pull-only via API

**Rationale**: Phase 4 focuses on **on-demand exports**. Push/streaming deferred to future phases.

### ❌ No Caching

- Metrics recomputed per request
- No Redis or in-memory cache
- Always fresh data

**Rationale**: Dashboard metrics are lightweight aggregations. Caching adds complexity without significant benefit.

### ❌ No Pagination

- SIEM exports bounded by time window
- No offset/limit parameters
- Single response per request

**Rationale**: Time windows (1h, 6h, 24h) provide natural bounds. If exports grow too large, reduce window size.

### ❌ No Event Storage

- RiskEventBus (Phase 1) is pub/sub only
- Events not persisted
- Event metrics are placeholders

**Rationale**: Phase 1 designed for real-time dispatch. Event storage deferred to persistence phase.

### ❌ No ML/Analytics

- Pure aggregation (counts, grouping)
- No trend analysis
- No anomaly detection

**Rationale**: Phase 4 provides **raw data** for SIEM platforms. Advanced analytics done externally.

## Monitoring & Logging

### Structured Logs

All operations logged with `SPRINT_16_PHASE_4` marker:

```typescript
logger.log(`[SPRINT_16_PHASE_4] Dashboard metrics requested (windowHours: 24)`);
logger.log(
  `[SPRINT_16_PHASE_4] Dashboard metrics generated (alerts: 23, incidents: 8, topUsers: 10)`
);
logger.log(`[SPRINT_16_PHASE_4] SIEM export requested (source: all, format: ndjson, window: 6h)`);
logger.log(
  `[SPRINT_16_PHASE_4] SIEM export completed (source: all, records: 31, alerts: 23, incidents: 8)`
);
```

### Metrics to Track

- **Dashboard requests per hour**: Monitor API load
- **SIEM export size**: Detect data growth
- **Top risk user count**: Track high-risk user population
- **Alert/incident ratio**: Correlation effectiveness

## Testing

### Unit Tests

```typescript
describe('DashboardMetricsService', () => {
  it('should aggregate alerts by severity', async () => {
    const alerts = [
      { severity: 'CRITICAL', ... },
      { severity: 'WARNING', ... },
      { severity: 'CRITICAL', ... },
    ];

    const metrics = await service.generateMetrics(24);

    expect(metrics.alerts.bySeverity.CRITICAL).toBe(2);
    expect(metrics.alerts.bySeverity.WARNING).toBe(1);
  });

  it('should calculate top risk users', async () => {
    // User A: 8 alerts, 2 incidents, CRITICAL
    // User B: 6 alerts, 1 incident, WARNING

    const metrics = await service.generateMetrics(24);

    expect(metrics.topRiskUsers[0].userId).toBe('userA');
    expect(metrics.topRiskUsers[1].userId).toBe('userB');
  });
});

describe('SiemExportService', () => {
  it('should generate deterministic record IDs', () => {
    const alert = { alertId: 'a1', createdAt: '2026-01-05T10:00:00Z', ... };

    const record1 = service.convertAlertToSiem(alert);
    const record2 = service.convertAlertToSiem(alert);

    expect(record1.recordId).toBe(record2.recordId);
  });

  it('should export only windowed records', async () => {
    // Alert 1: 1h ago
    // Alert 2: 25h ago (outside 24h window)

    const records = await service.exportAll(24);

    expect(records.length).toBe(1); // Only Alert 1
  });
});
```

### E2E Tests

```typescript
describe("Dashboard API (e2e)", () => {
  it("GET /api/admin/dashboard/metrics should return metrics", () => {
    return request(app.getHttpServer())
      .get("/api/admin/dashboard/metrics?windowHours=6")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("generatedAt");
        expect(res.body.windowHours).toBe(6);
        expect(res.body).toHaveProperty("alerts");
        expect(res.body).toHaveProperty("incidents");
      });
  });
});

describe("SIEM Export API (e2e)", () => {
  it("GET /api/admin/siem-export should stream JSON", () => {
    return request(app.getHttpServer())
      .get("/api/admin/siem-export?source=all&format=json")
      .set("Authorization", `Bearer ${platformAdminToken}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);
  });

  it("GET /api/admin/siem-export should stream NDJSON", () => {
    return request(app.getHttpServer())
      .get("/api/admin/siem-export?source=incidents&format=ndjson")
      .set("Authorization", `Bearer ${platformAdminToken}`)
      .expect(200)
      .expect("Content-Type", /application\/x-ndjson/);
  });
});
```

## Future Enhancements (Phase 5+)

### Phase 5: Real-Time Dashboards

- WebSocket push for live metrics
- Chart.js/D3.js visualizations
- Auto-refresh intervals

### Phase 6: Historical Storage

- Persist metrics to database
- Time-series analysis
- Trend dashboards (week-over-week, month-over-month)

### Phase 7: Advanced Analytics

- ML-powered anomaly detection
- Predictive risk scoring
- Automated insights generation

### Phase 8: External Integrations

- Slack/Teams notifications
- PagerDuty escalation
- Jira ticket creation

## Summary

Sprint 16 Phase 4 completes the observability pipeline by providing:

✅ **Dashboard Metrics**: Aggregated operational statistics for admins  
✅ **SIEM Exports**: Flat, normalized records for external security platforms  
✅ **READ-ONLY**: No mutations, no side effects  
✅ **Deterministic**: Same data → same output  
✅ **On-Demand**: No caching, always fresh  
✅ **RBAC**: Admin for dashboards, platform admin for SIEM

**Sprint 16 Complete**: Canonical events → Alerts → Incidents → Dashboards & SIEM

**Next Phases**: Persistence, real-time dashboards, ML intelligence, external integrations

---

**Related Documentation**:

- [Sprint 16 Phase 1: Risk Event Normalization](./SPRINT_16_PHASE_1_RISK_EVENT_BUS.md)
- [Sprint 16 Phase 2: Admin Alerts & Thresholds](./SPRINT_16_PHASE_2_ADMIN_ALERTS.md)
- [Sprint 16 Phase 3: Alert Correlation & Incident Linking](./SPRINT_16_PHASE_3_ALERT_CORRELATION.md)
