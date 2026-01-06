---

# 📄 `/docs/payments/PAYMENT_FAILURE_MATRIX.md`

```md
# Payment Failure Matrix

## Purpose
This document defines **expected system behavior** for every payment failure scenario.

No failure should leave:
- Partial ledger entries
- Inconsistent wallet balances
- Ambiguous payment states

---

## Failure Categories

### 1. Gateway Failures (Prepaid)

| Scenario             | Payment Status | Ledger | Action        |
| -------------------- | -------------- | ------ | ------------- |
| Authorization failed | FAILED         | None   | Retry allowed |
| Capture failed       | FAILED         | None   | Retry allowed |
| Webhook timeout      | AUTHORIZED     | None   | Await webhook |
| Duplicate webhook    | CAPTURED       | None   | Ignored       |

---

### 2. COD Failures

| Scenario                         | Payment Status | Ledger | Action           |
| -------------------------------- | -------------- | ------ | ---------------- |
| Delivery agent no-show           | INITIATED      | None   | Admin resolve    |
| Cash collected but not confirmed | INITIATED      | None   | Block completion |
| Duplicate confirmation           | CAPTURED       | None   | Idempotent       |
| Agent fraud suspected            | INITIATED      | None   | Suspend agent    |

---

### 3. Ledger Failures

| Scenario                 | Result                  |
| ------------------------ | ----------------------- |
| Invariant violation      | Transaction rolled back |
| Partial entry write      | Rolled back             |
| Duplicate idempotencyKey | Rejected                |

Ledger failures **always abort** the business operation.

---

### 4. Refund Failures

| Scenario                     | Refund Status | Ledger             |
| ---------------------------- | ------------- | ------------------ |
| Gateway refund fails         | FAILED        | None               |
| Seller wallet insufficient   | FAILED        | None               |
| Platform fee refund disabled | COMPLETED     | Platform untouched |

---

## Order State Interaction

| Order Status | Payment Failure Allowed |
| ------------ | ----------------------- |
| PENDING      | ✅                      |
| CONFIRMED    | ✅                      |
| PAID         | ❌                      |
| PREPARING    | ❌                      |
| SHIPPING     | ❌                      |
| DELIVERED    | ❌                      |

---

## System Guarantees

✔ Payments fail cleanly  
✔ Ledger is never half-written  
✔ Wallet balances never drift  
✔ Orders never complete unpaid

---

## Incident Response Rule

If money state is unclear:

> **Freeze progression, not ledger**

Ledger integrity > order flow > UX

---

## Summary

Failure is expected.  
Corruption is not.
