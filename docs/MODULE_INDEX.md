# MODULE INDEX

This document defines the authoritative list of backend modules, their responsibilities,
and their allowed dependency directions. It is the architectural contract for the system.

No module may violate the boundaries defined here.

---

## Core Business Modules

### ORDER

- Owns the customer order lifecycle
- Coordinates products, payments, and fulfillment
- Source of truth for order state

Documentation:

- MODULE_ORDER.md

---

### PAYMENT

- Handles all monetary transactions
- External payment gateway integration
- Financial audit boundary

Documentation:

- MODULE_PAYMENT.md

---

### PRODUCT

- Product catalog, pricing, and availability
- Read-heavy, low mutation frequency

Documentation:

- MODULE_PRODUCT.md

---

### CATEGORY

- Product classification and hierarchy
- Discovery and navigation support

Documentation:

- MODULE_CATEGORY.md

---

## Supporting & Cross-Cutting Modules

### NOTIFICATION

- User and admin messaging
- Event-driven delivery only

Documentation:

- MODULE_NOTIFICATION.md

---

### REFERRAL

- Referral tracking and reward qualification
- Fraud-sensitive domain

Documentation:

- MODULE_REFERRAL.md

---

## Domain-Specific / Internal Modules

### KITCHEN_REFILL

- Internal operational workflows
- No customer-facing impact

Documentation:

- MODULE_KITCHEN_REFILL.md

---

## UI / Presentation Modules

### THEME

- Branding and visual configuration
- No business logic

Documentation:

- MODULE_THEME.md

---

## Risk & Compliance (Cross-Cutting)

### WITHDRAWALS (Risk System)

- Risk evaluation
- Policy enforcement
- Cooling periods
- Escalation monitoring
- Compliance exports
- Risk response playbooks (advisory)
- Contextual playbook resolution with relevance scoring
- Admin decision capture for audit and analysis
- Playbook effectiveness metrics and outcome correlation
- Incident reconstruction (evidence-based timeline aggregation)
- Risk event normalization (unified event taxonomy)
- Admin alerts with deterministic thresholds (observational intelligence)
- Alert correlation and incident linking (real-time pattern recognition)
- Dashboard metrics and SIEM exports (operational visibility and compliance)
- Governance readiness assessment (policy preparedness)
- Control gap detection and policy simulation (governance planning)
- Automation readiness signals and guardrails (human-in-the-loop protection)
- Governance attestation and executive certification (regulator-grade snapshots)
- Policy-as-code evaluation engine (declarative governance compliance)
- Policy drift detection and historical comparison (governance trend analysis)
- Governance timeline and maturity progression (capability evolution narrative)
- Governance gap-to-timeline attribution (explainable gap root cause analysis)
- Governance remediation readiness and impact forecast (what-if remediation planning)
- Governance roadmap synthesis and executive action framing (logical improvement sequencing)
- Governance evidence ledger and immutable proof chain (cryptographic artifact verification)
- External verifiability and third-party audit artifacts (portable offline verification packages)

Characteristics:

- READ-ONLY where explicitly stated
- Deterministic
- Fully auditable
- Advisory recommendations, not enforcement
- Explainable relevance scoring
- Observational intelligence (decision capture)
- Analytics and effectiveness measurement
- Evidence-based reconstruction (no inference)
- Rule-based sequencing (no ML, no prioritization mandates)
- Cryptographic proof mechanisms (SHA-256 checksums, Merkle-root integrityHash)

Related Sprint Documentation:

- SPRINT_11_COMPLETE.md
- SPRINT_12_COMPLETE.md
- SPRINT_13_COMPLETE.md
- SPRINT_14_PHASE_1_RISK_PLAYBOOKS.md
- SPRINT_14_PHASE_2_CONTEXTUAL_RESOLUTION.md
- SPRINT_14_PHASE_3_ADMIN_DECISION_CAPTURE.md
- SPRINT_14_PHASE_4_EFFECTIVENESS_METRICS.md
- SPRINT_15_PHASE_1_INCIDENT_RECONSTRUCTION.md
- SPRINT_15_PHASE_2_COMPLIANCE_NARRATIVE.md
- SPRINT_15_PHASE_3_INCIDENT_EXPORTS.md
- SPRINT_15_PHASE_4_FORENSIC_BUNDLES.md
- SPRINT_16_PHASE_1_RISK_EVENT_BUS.md
- SPRINT_16_PHASE_2_ADMIN_ALERTS.md
- SPRINT_16_PHASE_3_ALERT_CORRELATION.md
- SPRINT_16_PHASE_4_DASHBOARD_SIEM.md
- SPRINT_17_PHASE_1_GOVERNANCE_READINESS.md
- SPRINT_17_PHASE_2_CONTROL_GAPS_SIMULATION.md
- SPRINT_17_PHASE_3_AUTOMATION_READINESS.md
- SPRINT_17_PHASE_4_GOVERNANCE_ATTESTATION.md
- SPRINT_18_PHASE_1_POLICY_ENGINE.md
- SPRINT_18_PHASE_2_POLICY_DRIFT.md
- SPRINT_19_PHASE_1_GOVERNANCE_TIMELINE.md
- SPRINT_19_PHASE_2_GOVERNANCE_ATTRIBUTION.md
- SPRINT_19_PHASE_3_GOVERNANCE_REMEDIATION.md
- SPRINT_19_PHASE_4_GOVERNANCE_ROADMAP.md
- SPRINT_20_PHASE_1_EVIDENCE_LEDGER.md
- SPRINT_20_PHASE_2_EXTERNAL_VERIFICATION.md

---

## Dependency Rules (STRICT)

- ORDER may read PRODUCT and PAYMENT
- PAYMENT may read ORDER
- PRODUCT has no upstream dependencies
- NOTIFICATION subscribes to events only
- REFERRAL may read ORDER and PAYMENT
- RISK / WITHDRAWAL modules may READ from any domain but MUST NOT mutate
- UI modules MUST NOT depend on business logic modules

Violations of these rules are architectural defects.

---

## Change Control

Any new module requires:

1. Addition to MODULE_INDEX.md
2. Dedicated MODULE\_<NAME>.md
3. Explicit dependency declaration

No exceptions.
