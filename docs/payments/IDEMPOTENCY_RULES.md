# Idempotency Rules – Payments & Ledger

## Purpose

This document defines **idempotency guarantees** across payments, refunds, and ledger operations to prevent:

- Double charges
- Duplicate ledger entries
- Race-condition corruption

Idempotency is **mandatory** for all financial writes.

---

## Core Principle

> Any operation that moves money MUST be safely retryable.

This is enforced using **idempotency keys** at the database level.

---

## Where Idempotency Is Enforced

| Component   | Field                            | Scope                  |
| ----------- | -------------------------------- | ---------------------- |
| Payment     | payment.idempotencyKey           | Per payment initiation |
| LedgerEntry | ledgerEntry.idempotencyKey       | Per ledger write       |
| Refund      | refund.idempotencyKey (implicit) | Per refund request     |

---

## Payment Idempotency

### Payment Creation

- Each payment has a **unique idempotencyKey**
- Retried payment initiation:
  - Returns existing payment
  - Does NOT create a new record

```text
Duplicate request → same payment.id
```
