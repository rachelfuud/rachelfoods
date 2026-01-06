# Sprint 17 Phase 2: Control Gap Detection & Policy Simulation

## Overview

Sprint 17 Phase 2 extends governance intelligence (Phase 1) with **READ-ONLY control gap detection** and **hypothetical policy simulation** capabilities—enabling proactive governance planning without enforcement.

This phase answers critical questions:

- **Where are controls insufficient?** (Gap detection)
- **What would improve readiness if policies changed?** (Simulation)
- **Which dimensions are bottlenecks?** (Impact analysis)

## Core Concepts

### Control Gap

A **control gap** is an identified weakness in a governance dimension where the current score falls below production readiness threshold (80).

**Gap Severity Classification**:

- **HIGH** (score < 50): Critical governance weakness requiring immediate attention
- **MEDIUM** (score 50-69): Moderate governance gap needing improvement
- **LOW** (score 70-79): Minor governance improvement area

**Deterministic Gap ID**: SHA-256 hash of `dimension:scoreObserved:scoreExpected` ensures trackable, reproducible gap identification.

### Policy Simulation

A **policy simulation** is a hypothetical "what-if" analysis predicting governance readiness impact if specific policy changes were implemented.

**Simulation is**:

- ✅ READ-ONLY (no enforcement)
- ✅ Deterministic (arithmetic rules)
- ✅ Hypothetical (no real changes)
- ✅ Advisory (insights only)

**Simulation is NOT**:

- ❌ Predictive ML
- ❌ Automated enforcement
- ❌ Real policy changes
- ❌ Persisted state

## Architecture

### Control Gap Detection

**Input**: Sprint 17 Phase 1 governance readiness snapshot

**Process**:

1. Identify dimensions scoring < 80 (production readiness threshold)
2. Generate deterministic gap IDs (SHA-256)
3. Classify severity (HIGH/MEDIUM/LOW)
4. Provide evidence and remediation hints
5. Create sorted gap report

**Output**: `ControlGapReport` with gaps, severity, and advisory guidance

### Policy Simulation

**Input**:

- Sprint 17 Phase 1 governance readiness snapshot (baseline)
- Hypothetical policy changes (boolean flags)

**Process**:

1. Get baseline dimension scores
2. Apply deterministic arithmetic deltas
3. Cap scores to 0-100 range
4. Recalculate overall score
5. Generate impact breakdown

**Output**: `PolicySimulationResult` with before/after scores, delta, and assumptions

## API Specification

### Endpoint 1: Control Gap Detection

```
GET /api/admin/governance/control-gaps
```

#### RBAC

- **Requires**: `PLATFORM_ADMIN` only

#### Response Schema

```typescript
{
  generatedAt: string;         // ISO 8601 timestamp
  windowHours: 24;             // Fixed for Phase 2
  gaps: [
    {
      id: string;              // SHA-256 hash
      dimension: GovernanceDimension;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      scoreObserved: number;   // Current score
      scoreExpected: number;   // Target score (80)
      description: string;     // Human-readable gap description
      evidence: string[];      // Supporting data
      remediationHints: string[]; // Advisory suggestions (NO enforcement)
    }
  ];
  gapSummary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  sprint: 'SPRINT_17_PHASE_2';
}
```

#### Example Request

```bash
curl -X GET "https://api.example.com/api/admin/governance/control-gaps" \
  -H "Authorization: Bearer <platform_admin_token>"
```

#### Example Response

```json
{
  "generatedAt": "2026-01-05T17:00:00.000Z",
  "windowHours": 24,
  "gaps": [
    {
      "id": "7f8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
      "dimension": "RISK_COVERAGE",
      "severity": "HIGH",
      "scoreObserved": 40,
      "scoreExpected": 80,
      "description": "Critical gap in Risk Coverage (score: 40/100, expected: 80/100)",
      "evidence": [
        "Sprint 16 Phase 2: Admin Alert System",
        "Sprint 16 Phase 1: Risk Event Bus",
        "Current alert count: 4",
        "Current score: 40/100",
        "Expected score: 80/100"
      ],
      "remediationHints": [
        "Review risk event generation in Sprint 16 Phase 1",
        "Verify alert threshold configuration in Sprint 16 Phase 2",
        "Investigate potential monitoring blind spots",
        "Consider expanding risk event taxonomy"
      ]
    },
    {
      "id": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      "dimension": "ALERT_SATURATION",
      "severity": "MEDIUM",
      "scoreObserved": 65,
      "scoreExpected": 80,
      "description": "Moderate gap in Alert Saturation (score: 65/100, expected: 80/100)",
      "evidence": [
        "Sprint 16 Phase 2: Admin Alert System",
        "Current rate: 65 alerts/hour",
        "Warning threshold: 50/hour",
        "Critical threshold: 100/hour",
        "Current score: 65/100",
        "Expected score: 80/100"
      ],
      "remediationHints": [
        "Review and adjust alert thresholds to reduce noise",
        "Consolidate low-priority alerts",
        "Implement alert aggregation strategies"
      ]
    },
    {
      "id": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
      "dimension": "ESCALATION_VISIBILITY",
      "severity": "LOW",
      "scoreObserved": 75,
      "scoreExpected": 80,
      "description": "Minor gap in Escalation Visibility (score: 75/100, expected: 80/100)",
      "evidence": [
        "Sprint 16 Phase 3: Alert Incident Correlation",
        "Linked alerts: 9/12",
        "Active incidents: 4",
        "Current score: 75/100",
        "Expected score: 80/100"
      ],
      "remediationHints": [
        "Increase linking of HIGH/CRITICAL alerts to incidents",
        "Review Sprint 16 Phase 3 alert correlation rules"
      ]
    }
  ],
  "gapSummary": {
    "total": 3,
    "high": 1,
    "medium": 1,
    "low": 1
  },
  "sprint": "SPRINT_17_PHASE_2"
}
```

### Endpoint 2: Policy Simulation

```
POST /api/admin/governance/policy-simulation
```

#### RBAC

- **Requires**: `PLATFORM_ADMIN` only

#### Request Body Schema

```typescript
{
  assumedChanges: {
    increaseAdminDecisionCapture?: boolean;  // +20 to ADMIN_DECISION_TRACEABILITY
    tightenAlertThresholds?: boolean;        // +10 ESCALATION_VISIBILITY, -5 ALERT_SATURATION
    forceEscalationLinking?: boolean;        // +15 to ESCALATION_VISIBILITY
    reduceAlertNoise?: boolean;              // +20 to ALERT_SATURATION
  };
}
```

#### Response Schema

```typescript
{
  simulatedAt: string;          // ISO 8601 timestamp
  baselineScore: number;        // Current overall score
  simulatedScore: number;       // Hypothetical overall score
  delta: number;                // simulatedScore - baselineScore
  impactedDimensions: [
    {
      dimension: GovernanceDimension;
      before: number;
      after: number;
      improvement: number;      // Can be negative if policy worsens score
    }
  ];
  assumptions: string[];        // Explains arithmetic rules applied
  warnings: string[];           // Simulation limitations
  sprint: 'SPRINT_17_PHASE_2';
}
```

#### Example Request

```bash
curl -X POST "https://api.example.com/api/admin/governance/policy-simulation" \
  -H "Authorization: Bearer <platform_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assumedChanges": {
      "increaseAdminDecisionCapture": true,
      "tightenAlertThresholds": false,
      "forceEscalationLinking": true,
      "reduceAlertNoise": true
    }
  }'
```

#### Example Response

```json
{
  "simulatedAt": "2026-01-05T17:05:00.000Z",
  "baselineScore": 78,
  "simulatedScore": 88,
  "delta": 10,
  "impactedDimensions": [
    {
      "dimension": "ADMIN_DECISION_TRACEABILITY",
      "before": 60,
      "after": 80,
      "improvement": 20
    },
    {
      "dimension": "ESCALATION_VISIBILITY",
      "before": 75,
      "after": 90,
      "improvement": 15
    },
    {
      "dimension": "ALERT_SATURATION",
      "before": 65,
      "after": 85,
      "improvement": 20
    }
  ],
  "assumptions": [
    "Increased admin decision capture coverage: +20 to ADMIN_DECISION_TRACEABILITY (capped at 100)",
    "Mandatory escalation linking for HIGH/CRITICAL alerts: +15 to ESCALATION_VISIBILITY (capped at 100)",
    "Alert noise reduction initiatives: +20 to ALERT_SATURATION (capped at 100)"
  ],
  "warnings": [
    "Simulation uses simplified arithmetic rules - Real-world impact may vary",
    "NO actual policy changes have been applied - This is hypothetical only"
  ],
  "sprint": "SPRINT_17_PHASE_2"
}
```

## Simulation Rules (Deterministic)

| Policy Change                    | Dimension Impact            | Delta | Cap | Rationale                             |
| -------------------------------- | --------------------------- | ----- | --- | ------------------------------------- |
| **increaseAdminDecisionCapture** | ADMIN_DECISION_TRACEABILITY | +20   | 100 | Broader decision logging coverage     |
| **tightenAlertThresholds**       | ESCALATION_VISIBILITY       | +10   | 100 | More alerts meet escalation criteria  |
| **tightenAlertThresholds**       | ALERT_SATURATION            | -5    | 0   | Tighter thresholds increase volume    |
| **forceEscalationLinking**       | ESCALATION_VISIBILITY       | +15   | 100 | Mandatory HIGH/CRITICAL alert linking |
| **reduceAlertNoise**             | ALERT_SATURATION            | +20   | 100 | Fewer low-priority alerts             |

**All scores capped to 0-100 range after delta application.**

## Remediation Hints by Dimension

### RISK_COVERAGE

**Hints for LOW/MEDIUM/HIGH gaps**:

1. Review risk event generation in Sprint 16 Phase 1
2. Verify alert threshold configuration in Sprint 16 Phase 2
3. Investigate potential monitoring blind spots
4. Consider expanding risk event taxonomy

### ESCALATION_VISIBILITY

**Hints for LOW/MEDIUM/HIGH gaps**:

1. Increase linking of HIGH/CRITICAL alerts to incidents
2. Review Sprint 16 Phase 3 alert correlation rules
3. Train admins on incident creation workflow
4. Audit unlinked high-severity alerts

### ADMIN_DECISION_TRACEABILITY

**Hints for LOW/MEDIUM/HIGH gaps**:

1. Enable Sprint 14 Phase 3 admin decision capture for all incidents
2. Review incident creation patterns
3. Train admins on decision logging best practices
4. Audit incident decision coverage

### ALERT_SATURATION

**Hints for LOW/MEDIUM/HIGH gaps**:

1. Review and adjust alert thresholds to reduce noise
2. Consolidate low-priority alerts
3. Implement alert aggregation strategies
4. Increase admin review capacity
5. Consider alert routing optimization

### INCIDENT_RECONSTRUCTABILITY

**Hints** (Infrastructure dimension):

1. Sprint 15 incident reconstruction service is operational
2. No action required - this dimension is infrastructure-based

### SIEM_EXPORT_READINESS

**Hints** (Infrastructure dimension):

1. Sprint 16 Phase 4 SIEM export service is operational
2. No action required - this dimension is infrastructure-based

**Note**: Hints are advisory only—NO automated enforcement.

## Use Cases

### Use Case 1: Pre-Audit Gap Assessment

**Scenario**: Compliance team preparing for SOC 2 audit

**Action**:

```bash
GET /api/admin/governance/control-gaps
```

**Analysis**:

- **Total Gaps: 3** (1 HIGH, 1 MEDIUM, 1 LOW)
- **HIGH Gap**: RISK_COVERAGE (score 40/100)
- **Remediation Priority**: Fix risk event generation before audit

**Outcome**: Identify critical gaps requiring immediate attention

### Use Case 2: Policy Impact Analysis

**Scenario**: Platform admin evaluating governance improvement strategies

**Action**:

```bash
POST /api/admin/governance/policy-simulation
Body: {
  "assumedChanges": {
    "increaseAdminDecisionCapture": true,
    "forceEscalationLinking": true,
    "reduceAlertNoise": true
  }
}
```

**Analysis**:

- **Baseline Score**: 78 (MEDIUM readiness)
- **Simulated Score**: 88 (HIGH readiness)
- **Delta**: +10 points
- **Impacted Dimensions**: 3 improvements (no degradations)

**Outcome**: Confirm policy changes would improve readiness

### Use Case 3: Gap Prioritization

**Scenario**: Limited resources, need to prioritize control improvements

**Action**:

```bash
GET /api/admin/governance/control-gaps
```

**Analysis**:

- **HIGH Severity Gaps**: 1 (RISK_COVERAGE)
- **MEDIUM Severity Gaps**: 1 (ALERT_SATURATION)
- **LOW Severity Gaps**: 1 (ESCALATION_VISIBILITY)

**Prioritization**:

1. Address HIGH gaps first (critical governance weakness)
2. Plan MEDIUM gaps for next sprint
3. Monitor LOW gaps (minor improvements)

**Outcome**: Resource-efficient gap remediation

### Use Case 4: Negative Impact Detection

**Scenario**: Evaluate policy change that might worsen some dimensions

**Action**:

```bash
POST /api/admin/governance/policy-simulation
Body: {
  "assumedChanges": {
    "tightenAlertThresholds": true
  }
}
```

**Analysis**:

- **ESCALATION_VISIBILITY**: +10 (improvement)
- **ALERT_SATURATION**: -5 (degradation)
- **Overall Delta**: +2 (minimal improvement)

**Warnings**:

- "ALERT_SATURATION would DECREASE by 5 points (65 → 60)"
- "Minimal overall improvement (2 points) - Consider additional policy changes"

**Outcome**: Understand trade-offs before implementing policy

## Determinism & Compliance

### Deterministic Gap Detection

✅ **Same Input → Same Output**: Gap IDs are SHA-256 hashes  
✅ **No ML**: Pure threshold-based classification  
✅ **Reproducible**: Same dimension scores always generate same gaps  
✅ **Auditable**: Clear evidence and rationale

### Deterministic Simulation

✅ **Arithmetic Only**: No probabilistic models  
✅ **Fixed Deltas**: Predefined score changes  
✅ **Capped Scores**: All scores bounded to 0-100  
✅ **Clear Assumptions**: Every delta explained

### Compliance Properties

✅ **READ-ONLY**: No enforcement, no mutations  
✅ **Advisory Only**: Provides insights, not actions  
✅ **Audit-Ready**: Full evidence and assumption trails  
✅ **RBAC**: Platform admin only  
✅ **Structured Logging**: SPRINT_17_PHASE_2 marker

## Non-Goals (Phase 2)

### ❌ No Automated Enforcement

- Gaps are **informational only**
- No automatic policy activation
- No withdrawal blocking
- No threshold enforcement

**Rationale**: Phase 2 provides **visibility**, not automation

### ❌ No Predictive ML

- No machine learning algorithms
- No probabilistic forecasting
- No behavior predictions
- No risk scoring

**Rationale**: Simulation is **deterministic arithmetic**, not predictive modeling

### ❌ No Real Policy Changes

- Simulation is **hypothetical only**
- No configuration mutations
- No system behavior changes
- No persisted state

**Rationale**: Simulation provides **safe "what-if" analysis** without risk

### ❌ No Historical Tracking

- No gap persistence
- No simulation history
- No trend analysis
- No degradation alerts

**Rationale**: Phase 2 is **on-demand computation**. Tracking deferred to Phase 3+.

### ❌ No External Integration

- No Slack/Teams notifications
- No Jira ticket creation
- No PagerDuty escalation
- No compliance platform sync

**Rationale**: Integration deferred to Phase 3+

## Monitoring & Logging

### Structured Logs

All operations logged with `SPRINT_17_PHASE_2` marker:

```typescript
logger.log('[SPRINT_17_PHASE_2] Generating control gap report');
logger.log('[SPRINT_17_PHASE_2] Detected 3 control gaps');
logger.log('[SPRINT_17_PHASE_2] Control gap report generated (total: 3, high: 1, medium: 1, low: 1)');
logger.log('[SPRINT_17_PHASE_2] Control gap detection requested');
logger.log('[SPRINT_17_PHASE_2] Control gap report returned (total: 3, high: 1, medium: 1, low: 1)');

logger.log('[SPRINT_17_PHASE_2] Starting policy simulation');
logger.log('[SPRINT_17_PHASE_2] Simulated admin decision capture: 60 → 80');
logger.log('[SPRINT_17_PHASE_2] Policy simulation complete (baseline: 78, simulated: 88, delta: 10)');
logger.log('[SPRINT_17_PHASE_2] Policy simulation requested', { assumedChanges: {...} });
logger.log('[SPRINT_17_PHASE_2] Policy simulation completed (baseline: 78, simulated: 88, delta: 10)');
```

### Metrics to Track

- **Gap detection requests per day**: Monitor usage frequency
- **Gap severity distribution**: Track HIGH/MEDIUM/LOW prevalence
- **Policy simulation requests per day**: Monitor analysis activity
- **Simulated delta distribution**: Understand predicted improvements
- **Most common policy combinations**: Identify popular scenarios

## Testing

### Unit Tests (Control Gap Service)

```typescript
describe("ControlGapService", () => {
  it("should detect gaps for dimensions scoring < 80", async () => {
    // Mock readiness snapshot with score 65
    const report = await service.generateControlGapReport();

    const gap = report.gaps[0];
    expect(gap.scoreObserved).toBe(65);
    expect(gap.scoreExpected).toBe(80);
    expect(gap.severity).toBe("MEDIUM");
  });

  it("should generate deterministic gap IDs", async () => {
    // Same dimension + scores should produce same ID
    const id1 = service["generateGapId"]("RISK_COVERAGE", 40, 80);
    const id2 = service["generateGapId"]("RISK_COVERAGE", 40, 80);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it("should classify gap severity correctly", () => {
    expect(determineGapSeverity(45)).toBe("HIGH");
    expect(determineGapSeverity(65)).toBe("MEDIUM");
    expect(determineGapSeverity(75)).toBe("LOW");
  });

  it("should sort gaps by severity (HIGH → MEDIUM → LOW)", async () => {
    const report = await service.generateControlGapReport();

    const severities = report.gaps.map((g) => g.severity);
    expect(severities).toEqual(["HIGH", "MEDIUM", "LOW"]);
  });
});
```

### Unit Tests (Policy Simulation Service)

```typescript
describe("PolicySimulationService", () => {
  it("should apply increaseAdminDecisionCapture simulation", async () => {
    const input: PolicySimulationInput = {
      assumedChanges: { increaseAdminDecisionCapture: true },
    };

    const result = await service.simulatePolicyChanges(input);

    const impact = result.impactedDimensions.find(
      (d) => d.dimension === "ADMIN_DECISION_TRACEABILITY"
    );
    expect(impact.improvement).toBe(20);
  });

  it("should cap scores at 100", async () => {
    // Mock baseline score of 95
    const input: PolicySimulationInput = {
      assumedChanges: { increaseAdminDecisionCapture: true },
    };

    const result = await service.simulatePolicyChanges(input);

    const impact = result.impactedDimensions.find(
      (d) => d.dimension === "ADMIN_DECISION_TRACEABILITY"
    );
    expect(impact.after).toBe(100); // 95 + 20 = 115 → capped to 100
  });

  it("should generate warnings for negative deltas", async () => {
    const input: PolicySimulationInput = {
      assumedChanges: { tightenAlertThresholds: true },
    };

    const result = await service.simulatePolicyChanges(input);

    const saturationWarning = result.warnings.find((w) =>
      w.includes("ALERT_SATURATION would DECREASE")
    );
    expect(saturationWarning).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe("ControlGapService (integration)", () => {
  it("should generate gap report from live readiness snapshot", async () => {
    const report = await service.generateControlGapReport();

    expect(report.gaps).toBeDefined();
    expect(report.gapSummary.total).toBeGreaterThanOrEqual(0);
    expect(report.sprint).toBe("SPRINT_17_PHASE_2");
  });
});

describe("PolicySimulationService (integration)", () => {
  it("should simulate multiple policy changes", async () => {
    const input: PolicySimulationInput = {
      assumedChanges: {
        increaseAdminDecisionCapture: true,
        forceEscalationLinking: true,
        reduceAlertNoise: true,
      },
    };

    const result = await service.simulatePolicyChanges(input);

    expect(result.impactedDimensions.length).toBe(3);
    expect(result.delta).toBeGreaterThan(0); // Overall improvement
  });
});
```

### E2E Tests

```typescript
describe("Governance Simulation API (e2e)", () => {
  it("GET /api/admin/governance/control-gaps should return gap report", () => {
    return request(app.getHttpServer())
      .get("/api/admin/governance/control-gaps")
      .set("Authorization", `Bearer ${platformAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("gaps");
        expect(res.body).toHaveProperty("gapSummary");
        expect(res.body.sprint).toBe("SPRINT_17_PHASE_2");
      });
  });

  it("POST /api/admin/governance/policy-simulation should return simulation result", () => {
    return request(app.getHttpServer())
      .post("/api/admin/governance/policy-simulation")
      .set("Authorization", `Bearer ${platformAdminToken}`)
      .send({
        assumedChanges: {
          increaseAdminDecisionCapture: true,
          forceEscalationLinking: true,
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("baselineScore");
        expect(res.body).toHaveProperty("simulatedScore");
        expect(res.body).toHaveProperty("delta");
        expect(res.body.sprint).toBe("SPRINT_17_PHASE_2");
      });
  });

  it("should reject non-platform-admins", () => {
    return request(app.getHttpServer())
      .get("/api/admin/governance/control-gaps")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(403);
  });
});
```

## Future Enhancements (Phase 3+)

### Phase 3: Historical Tracking

- Persist gap reports
- Track gap remediation progress
- Trend analysis (gap severity over time)
- Degradation alerts

### Phase 4: Advanced Simulation

- Multi-variable optimization
- Cost-benefit analysis
- Resource allocation modeling
- Regulatory compliance scoring

### Phase 5: External Integration

- Slack/Teams gap notifications
- Jira ticket creation for HIGH gaps
- PagerDuty escalation for critical gaps
- Compliance platform sync (Vanta, Drata)

### Phase 6: Automated Remediation

- Auto-adjusting alert thresholds (with approval)
- Intelligent escalation rules
- Self-healing controls (with guardrails)
- Policy recommendation engine

## Summary

Sprint 17 Phase 2 provides **deterministic control gap detection** and **hypothetical policy simulation** by:

✅ **Detecting Control Gaps**: Identify dimensions scoring < 80 with severity classification  
✅ **Deterministic Gap IDs**: SHA-256 hashing for trackable gaps  
✅ **Advisory Remediation Hints**: Guidance without enforcement  
✅ **Policy Simulation**: "What-if" analysis with arithmetic rules  
✅ **Impact Breakdown**: Per-dimension before/after scores  
✅ **Clear Assumptions**: Every simulation delta explained  
✅ **READ-ONLY**: No enforcement, no mutations, no risk  
✅ **Audit-Ready**: Full evidence and assumption trails  
✅ **RBAC**: Platform admin only

**Strategic Outcome**: Proactive governance planning with zero risk

**Next Phases**: Historical tracking, advanced optimization, external integration

---

**Related Documentation**:

- [Sprint 17 Phase 1: Governance Readiness](./SPRINT_17_PHASE_1_GOVERNANCE_READINESS.md)
- [Sprint 16 Phase 1: Risk Event Normalization](./SPRINT_16_PHASE_1_RISK_EVENT_BUS.md)
- [Sprint 16 Phase 2: Admin Alerts & Thresholds](./SPRINT_16_PHASE_2_ADMIN_ALERTS.md)
- [Sprint 16 Phase 3: Alert Correlation & Incident Linking](./SPRINT_16_PHASE_3_ALERT_CORRELATION.md)
- [Sprint 16 Phase 4: Dashboards & SIEM Export](./SPRINT_16_PHASE_4_DASHBOARD_SIEM.md)
- [Sprint 15: Incident Reconstruction](./SPRINT_15_PHASE_1_INCIDENT_RECONSTRUCTION.md)
- [Sprint 14 Phase 3: Admin Decision Capture](./SPRINT_14_PHASE_3_ADMIN_DECISION_CAPTURE.md)
