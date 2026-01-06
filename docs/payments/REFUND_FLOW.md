---

# 📄 `/docs/payments/REFUND_FLOW.md`

```md
# Refund Flow

## Purpose
This document defines the **refund lifecycle**, constraints, and ledger behavior.

Refunds are **explicit actions**, never automatic side effects.

---

## Refund Eligibility Rules

A refund may be initiated only if:

- Payment.status = CAPTURED
- Refund amount ≤ remaining refundable amount
- Initiator has permission (admin or seller)

---

## Refund Lifecycle

```text
INITIATED
   ↓
PROCESSING
   ↓
COMPLETED | FAILED
```
