# SPRINT 19 – PHASE 2: Governance Gap-to-Timeline Attribution

## Overview

**Purpose**: Deterministic mapping between control gaps and governance timeline events.

**Core Question**: "Where are remaining governance weaknesses, and exactly where do they originate in the governance timeline?"

**Key Insight**: While Sprint 19 Phase 1 answered "How did governance capabilities evolve?" (timeline), Phase 2 answers "Why do gaps still exist?" (attribution).

**Critical Positioning**: This is a READ-ONLY, rule-based gap explainability system — NOT remediation automation or compliance certification.

---

## Architecture

### Components

1. **GovernanceGapAttribution**: Deterministic mapping from gap to timeline events with root cause
2. **GovernanceAttributionService**: Rule-based attribution engine
3. **GovernanceAttributionController**: READ-ONLY API (GET /attribution)
4. **GovernanceAttributionReport**: Complete gap attribution analysis with summary

### Root Cause Categories (6 Total)

| Root Cause                       | Description                                    | Example                             |
| -------------------------------- | ---------------------------------------------- | ----------------------------------- |
| **SIGNAL_COVERAGE**              | Missing/incomplete governance signal detection | Risk signals not captured           |
| **ESCALATION_VISIBILITY**        | Insufficient escalation routing/monitoring     | Escalation paths unclear            |
| **DECISION_TRACEABILITY**        | Inadequate decision capture/audit trail        | Decision documentation lacking      |
| **POLICY_DEFINITION**            | Missing/incomplete policy definitions          | Policies undefined                  |
| **POLICY_ENFORCEMENT_GUARDRAIL** | Weak policy enforcement/guardrails             | Enforcement mechanisms insufficient |
| **OBSERVABILITY_SATURATION**     | Insufficient observability/alert coverage      | Monitoring depth/breadth lacking    |

---

## Gap Attribution Structure

```typescript
interface GovernanceGapAttribution {
  // Deterministic identifier: SHA-256(gapId + rootCauseCategory + sorted_eventIds)
  attributionId: string;

  // Control gap ID (from Sprint 17 Phase 2)
  gapId: string;

  // Governance dimension affected
  dimension: GovernanceDimension;

  // Gap severity
  severity: 'HIGH' | 'MEDIUM' | 'LOW';

  // Timeline events explaining gap origin (chronological)
  linkedTimelineEvents: LinkedTimelineEventRef[];

  // Root cause category (single highest-priority)
  rootCauseCategory: GovernanceGapRootCause;

  // Factual, evidence-backed explanation (MUST reference timeline events)
  explanation: string;

  // Non-prescriptive remediation context (advisory only)
  remediationContext: string;
}
```

### Attribution ID Determinism Formula

```
attributionId = SHA-256(gapId + rootCauseCategory + sorted_eventIds)
```

**Guarantee**: Same gap + root cause + events → same attributionId

**Rationale**:

- **gapId**: Uniquely identifies control gap
- **rootCauseCategory**: Classifies why gap exists
- **sorted_eventIds**: Deterministically orders timeline event references

---

## ATTRIBUTION RULES (Static, Mandatory)

### Rule 1: RISK_COVERAGE → SIGNAL_COVERAGE

**Gap Dimension**: RISK_COVERAGE

**Root Cause**: SIGNAL_COVERAGE

**Linked Events**:

- Sprint 11: Transaction Reconstruction
- Sprint 15: Incident Reconstruction
- Sprint 16: Observability Infrastructure

**Rationale**:
Risk coverage gaps exist because signal detection infrastructure is incomplete. Transaction reconstruction (Sprint 11) provided foundational forensics. Incident reconstruction (Sprint 15) added post-incident analysis. Observability (Sprint 16) established runtime monitoring. Gaps persist where signal coverage remains incomplete.

**Remediation Context**:
Consider expanding signal detection coverage in areas where risk visibility is insufficient. Review Sprint 16 observability capabilities to identify blind spots. Advisory only: no automated remediation.

---

### Rule 2: ESCALATION_VISIBILITY → ESCALATION_VISIBILITY

**Gap Dimension**: ESCALATION_VISIBILITY

**Root Cause**: ESCALATION_VISIBILITY

**Linked Events**:

- Sprint 16: Alert System & SIEM Integration
- Sprint 17: Control Gap Detection

**Rationale**:
Escalation visibility gaps exist because escalation routing lacks monitoring. Alert system (Sprint 16) established automated alerting but escalation paths require clearer monitoring. Control gap detection (Sprint 17) identified escalation deficiencies. Gaps persist where escalation routing lacks visibility.

**Remediation Context**:
Consider enhancing escalation path monitoring and documentation. Review Sprint 17 control gap findings for specific escalation deficiencies. Advisory only: no automated remediation.

---

### Rule 3: ADMIN_DECISION_TRACEABILITY → DECISION_TRACEABILITY

**Gap Dimension**: ADMIN_DECISION_TRACEABILITY

**Root Cause**: DECISION_TRACEABILITY

**Linked Events**:

- Sprint 17: Executive Governance Attestation

**Rationale**:
Decision traceability gaps exist because admin decision capture is incomplete. Executive attestation (Sprint 17) established certification snapshots but operational decision capture requires enhancement. Gaps persist where decision documentation lacks sufficient audit trail.

**Remediation Context**:
Consider expanding decision capture mechanisms for operational scenarios. Review Sprint 17 attestation framework for decision documentation patterns. Advisory only: no automated remediation.

---

### Rule 4: INCIDENT_RESPONSE_CAPABILITY → SIGNAL_COVERAGE

**Gap Dimension**: INCIDENT_RESPONSE_CAPABILITY

**Root Cause**: SIGNAL_COVERAGE

**Linked Events**:

- Sprint 15: Incident Reconstruction
- Sprint 16: Alert Correlation

**Rationale**:
Incident response gaps exist because signal coverage during incidents is incomplete. Incident reconstruction (Sprint 15) provided post-incident forensics. Alert correlation (Sprint 16) linked alerts to incidents in real-time. Gaps persist where incident detection or response coverage is insufficient.

**Remediation Context**:
Consider enhancing incident signal detection and correlation. Review Sprint 15 and 16 capabilities for incident response blind spots. Advisory only: no automated remediation.

---

### Rule 5: POLICY_SIMULATION → POLICY_DEFINITION

**Gap Dimension**: POLICY_SIMULATION

**Root Cause**: POLICY_DEFINITION

**Linked Events**:

- Sprint 17: Policy Simulation Capability
- Sprint 18: Policy-as-Code Evaluation

**Rationale**:
Policy simulation gaps exist because policy definitions are incomplete. Policy simulation (Sprint 17) enabled "what-if" testing but requires comprehensive policy definitions. Policy-as-code evaluation (Sprint 18) formalized compliance checks. Gaps persist where policies remain undefined or under-specified.

**Remediation Context**:
Consider expanding policy definitions to cover identified gaps. Review Sprint 18 policy-as-code framework for policy formalization patterns. Advisory only: no automated remediation.

---

### Rule 6: AUTOMATION_SAFETY_GUARDRAILS → POLICY_ENFORCEMENT_GUARDRAIL

**Gap Dimension**: AUTOMATION_SAFETY_GUARDRAILS

**Root Cause**: POLICY_ENFORCEMENT_GUARDRAIL

**Linked Events**:

- Sprint 17: Automation Readiness Assessment
- Sprint 18: Policy Drift Detection

**Rationale**:
Automation guardrail gaps exist because policy enforcement mechanisms are weak. Automation readiness (Sprint 17) assessed automation safety but did NOT authorize automation. Policy drift detection (Sprint 18) tracks compliance posture changes. Gaps persist where policy enforcement or guardrails are insufficient.

**Remediation Context**:
Consider strengthening policy enforcement guardrails before automation. Review Sprint 17 automation readiness constraints and Sprint 18 policy drift monitoring. CRITICAL: Automation requires explicit authorization beyond gap closure. Advisory only: no automated remediation.

---

## API Endpoint

### GET /api/admin/governance/attribution

**Purpose**: Retrieve governance gap attribution report

**RBAC**: `PLATFORM_ADMIN` only (gap attribution contains sensitive governance information)

**Response Structure**:

```json
{
  "generatedAt": "2026-01-06T16:00:00.000Z",
  "maturityStage": "AUDIT_READY",
  "attributions": [
    {
      "attributionId": "a1b2c3d4e5f6...",
      "gapId": "gap-risk-coverage-001",
      "dimension": "RISK_COVERAGE",
      "severity": "HIGH",
      "linkedTimelineEvents": [
        {
          "eventId": "evt123...",
          "sourceSprint": 11,
          "title": "Transaction Reconstruction Capability Delivered",
          "relationshipExplanation": "Sprint 11 introduced capability addressing this gap dimension"
        },
        {
          "eventId": "evt456...",
          "sourceSprint": 16,
          "title": "Observability Infrastructure Established",
          "relationshipExplanation": "Sprint 16 established governance signal related to this gap"
        }
      ],
      "rootCauseCategory": "SIGNAL_COVERAGE",
      "explanation": "Risk coverage gap exists due to incomplete signal detection infrastructure. Transaction reconstruction (Sprint 11) provided foundational forensics. Observability (Sprint 16) established runtime monitoring. Gap persists where signal coverage remains incomplete.",
      "remediationContext": "Consider expanding signal detection coverage in areas where risk visibility is insufficient. Review Sprint 16 observability capabilities to identify blind spots. Advisory only: no automated remediation."
    }
  ],
  "summary": {
    "totalGaps": 6,
    "gapsBySeverity": {
      "HIGH": 3,
      "MEDIUM": 2,
      "LOW": 1
    },
    "gapsByRootCause": {
      "SIGNAL_COVERAGE": 2,
      "ESCALATION_VISIBILITY": 1,
      "DECISION_TRACEABILITY": 1,
      "POLICY_DEFINITION": 1,
      "POLICY_ENFORCEMENT_GUARDRAIL": 1,
      "OBSERVABILITY_SATURATION": 0
    },
    "gapsByDimension": {
      "RISK_COVERAGE": 1,
      "ESCALATION_VISIBILITY": 1,
      "ADMIN_DECISION_TRACEABILITY": 1,
      "INCIDENT_RESPONSE_CAPABILITY": 1,
      "POLICY_SIMULATION": 1,
      "AUTOMATION_SAFETY_GUARDRAILS": 1
    }
  },
  "disclaimer": "Attributions are explanatory mappings only and do NOT constitute findings, enforcement actions, or compliance determinations. This report provides context for gap remediation planning and does NOT authorize automation or certify compliance. Use for audit evidence, executive reporting, and governance planning only."
}
```

---

## Determinism Guarantees

### Attribution ID Determinism

**Formula**: `SHA-256(gapId + rootCauseCategory + sorted_eventIds)`

**Guarantee**: Same inputs → same attributionId

**Implication**: Attributions are reproducible across environments

### Rule-Based Mapping

**Formula**: Static rules map each gap dimension to specific timeline events

**Guarantee**: Same gaps + same timeline → same attributions

**Rationale**: All attribution rules are hardcoded (no inference, no ML)

---

## Mandatory Disclaimer

```
Attributions are explanatory mappings only and do NOT constitute findings, enforcement actions, or compliance determinations.
This report provides context for gap remediation planning and does NOT authorize automation or certify compliance.
Use for audit evidence, executive reporting, and governance planning only.
```

**Legal Positioning**: Attributions explain gap origins — NOT compliance certification or remediation mandates.

**Regulatory Interpretation**: Attributions provide audit context — do NOT trigger enforcement or automation.

---

## Use Cases

### 1. Executive Gap Understanding

**Question**: "Why do we have this control gap?"

**Answer**: Attribution links gap to specific timeline events showing capability evolution.

**Executive Action**: Board understands gap origin and can justify remediation investment.

**Attribution Insight**: Gap exists because Sprint X capability addresses 80% of dimension but 20% gap persists.

---

### 2. Regulator Audit Explainability

**Question**: "Provide evidence of gap origin and remediation planning."

**Answer**: Attribution report documents gap-to-timeline mappings with evidence references.

**Regulator Review**: Audit confirms systematic governance evolution with explicit gap awareness.

**Evidence Chain**: Gap → Timeline events → Sprint documentation → Capability delivery dates.

---

### 3. Remediation Planning Context

**Question**: "What capabilities address this gap?"

**Answer**: Linked timeline events show which Sprints delivered related capabilities.

**Remediation Planning**: Gaps linked to older Sprints may require capability expansion; newer gaps may require time for capability maturation.

**Advisory Context**: Remediation context provides non-prescriptive guidance (not automation).

---

### 4. Board Reporting

**Question**: "What are root causes of remaining governance weaknesses?"

**Answer**: Root cause summary shows distribution across 6 categories (SIGNAL_COVERAGE, ESCALATION_VISIBILITY, etc.).

**Board Insight**: Strategic governance investment priorities become clear (e.g., if most gaps are SIGNAL_COVERAGE, invest in observability expansion).

**Governance Roadmap**: Board approves future Sprint priorities based on root cause distribution.

---

### 5. Gap Trend Analysis

**Question**: "How have gaps evolved as capabilities were delivered?"

**Answer**: Compare attributions over time to see if gaps decrease as timeline events accumulate.

**Trend Validation**: Maturity progression should correlate with gap reduction (FOUNDATIONAL → AUDIT_READY = fewer high-severity gaps).

**Quality Check**: If maturity advances but high-severity gaps persist, investigate capability effectiveness.

---

## Relationship to Other Sprints

### Sprint 17 Phase 2: Control Gap Detection (Gap Inputs)

**Sprint 17 Output**: Control gaps identified across 6 dimensions

**Sprint 19 Phase 2 Input**: Takes control gaps as attribution input

**Integration**: Gaps (Sprint 17) + Timeline events (Sprint 19 Phase 1) → Attributions (Sprint 19 Phase 2)

---

### Sprint 18 Phase 1-2: Policy Evaluation + Drift (Policy Gap Context)

**Sprint 18 Output**: Policy compliance status and drift detection

**Sprint 19 Phase 2 Integration**: Policy failures inform POLICY_DEFINITION and POLICY_ENFORCEMENT_GUARDRAIL attributions

**Complementarity**: Policy drift shows "what changed"; attribution shows "why gap exists"

---

### Sprint 19 Phase 1: Governance Timeline (Event Source)

**Sprint 19 Phase 1 Output**: Chronological governance capability evolution

**Sprint 19 Phase 2 Input**: Timeline events used as attribution evidence

**Integration**: Timeline (Phase 1) provides "what happened"; Attribution (Phase 2) provides "why gaps exist"

---

## Non-Goals (Critical Constraints)

### NOT Remediation Automation

Attribution provides context for gap remediation — does NOT trigger automated remediation.

**Implication**: Humans must plan and execute gap remediation based on attribution insights.

**Positioning**: Attribution is advisory guidance — not enforcement or automation trigger.

---

### NOT Compliance Certification

Attribution explains gap origins — does NOT certify compliance or authorize operations.

**Implication**: Attribution report is audit evidence — not compliance certificate.

**Positioning**: Use for regulator explanations — not compliance claims.

---

### NOT Scoring Replacement

Attribution complements Sprint 17 governance readiness scoring — does NOT replace it.

**Difference**:

- **Readiness Score** (Sprint 17): Quantitative assessment of current governance quality
- **Attribution** (Sprint 19): Qualitative explanation of gap origins

**Use Together**: Score shows "how ready"; attribution shows "why gaps exist"

---

### NOT Inference or ML

All attribution rules are static and rule-based — no machine learning or inference.

**Guarantee**: Attributions are deterministic and explainable to regulators.

**Rationale**: Regulator-safe attributions require transparent, auditable rules.

---

## Testing Strategies

### Unit Tests

1. **Attribution ID Determinism**: Same inputs → same SHA-256 attributionId
2. **Rule Application**: Each gap dimension maps to correct root cause category
3. **Event Matching**: Timeline events correctly filtered by sprint + keywords
4. **Summary Calculation**: Correct counts by severity, root cause, dimension

### Integration Tests

1. **Complete Attribution Report**: Full report with all gap-to-timeline mappings
2. **Gap Coverage**: All control gaps from Sprint 17 Phase 2 have attributions
3. **Timeline Integration**: Attributions reference actual Sprint 19 Phase 1 events
4. **API Response**: Valid GovernanceAttributionReport structure

### Determinism Tests

1. **Idempotency**: Multiple calls return identical attributions
2. **Cross-Environment**: Same attributions across dev/staging/production
3. **Rule Stability**: Attribution rules remain constant across code versions

---

## Deliverables

### Code Components

- ✅ `governance-attribution.types.ts`: Type definitions (attributions, root causes, 400+ lines)
- ✅ `governance-attribution.service.ts`: Attribution engine (6 static rules, 500+ lines)
- ✅ `governance-attribution.controller.ts`: READ-ONLY API (GET /attribution, 300+ lines)

### Documentation

- ✅ `SPRINT_19_PHASE_2_GOVERNANCE_ATTRIBUTION.md`: Comprehensive documentation (this file)
- ✅ `MODULE_INDEX.md`: Updated with Sprint 19 Phase 2 capability reference

### Quality Assurance

- ✅ Build verification: `npm run build` passes
- ✅ Module integration: Added to `withdrawal.module.ts`
- ✅ RBAC enforcement: `PLATFORM_ADMIN` only
- ✅ Determinism verification: Attribution IDs stable across generations
- ✅ Disclaimer inclusion: Mandatory advisory positioning

---

## Future Enhancements

### Sprint 19 Phase 3+ Possibilities

1. **Gap Remediation Tracking**: Track gap closure over time with attribution history
2. **Attribution Visualization**: Interactive gap-to-timeline visualization
3. **Custom Attribution Rules**: Allow platform admins to define custom attribution logic
4. **Gap Prioritization Scoring**: Score gaps by remediation urgency based on attributions
5. **Attribution Comparison**: Compare attributions across multiple environments
6. **Gap Trend Alerts**: Notify executives when high-severity gaps persist
7. **Attribution Export**: PDF/CSV export for board presentations and compliance filings

**Constraint**: All enhancements MUST maintain READ-ONLY, evidence-backed, advisory-only positioning.

---

## Summary

**Sprint 19 Phase 2** delivers a **regulator-grade gap attribution system** answering "Why do governance gaps exist?"

**Key Achievements**:

- ✅ 6 static attribution rules mapping gaps to timeline events
- ✅ 6 root cause categories (SIGNAL_COVERAGE, ESCALATION_VISIBILITY, etc.)
- ✅ Deterministic attribution IDs (SHA-256)
- ✅ Evidence-backed explanations with Sprint doc references
- ✅ Non-prescriptive remediation context (advisory only)
- ✅ READ-ONLY API with mandatory advisory disclaimer

**Attribution Pattern**:

1. Control Gap (Sprint 17 Phase 2) → What governance weakness exists?
2. Timeline Events (Sprint 19 Phase 1) → What capabilities were delivered?
3. Attribution Rules (Sprint 19 Phase 2) → Why does gap persist despite capabilities?
4. Root Cause Category → What type of deficiency explains the gap?
5. Remediation Context → What advisory guidance helps close the gap?

**Integration Story**:

- **Sprint 17**: Identified control gaps
- **Sprint 18**: Formalized policy evaluation
- **Sprint 19 Phase 1**: Documented capability evolution
- **Sprint 19 Phase 2**: Explained gap origins ← CURRENT

**Pattern**: Sprint 19 Phase 2 closes the governance explainability loop: Timeline shows "what happened" → Attribution shows "why gaps exist" → Executives/regulators understand governance posture.

**Quality**: READ-ONLY, rule-based, evidence-backed, deterministic, advisory-only, regulator-safe.
