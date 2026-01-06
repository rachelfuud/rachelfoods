# Ledger Reconciliation

## Purpose

This document defines **how ledger integrity is verified** and how discrepancies are handled.

Ledger reconciliation is an **admin-only** operation.

---

## Ledger Source of Truth

- Wallet balance = SUM(ledger.amount)
- Ledger entries are immutable
- Wallet table stores NO balance

---

## Reconciliation Rules

For every transactionId:

```text
SUM(amount) = 0
```
