# Ledger Invariants

## Purpose

This document defines the non-negotiable invariants governing the financial ledger system in the Rachel Foods Platform.  
These rules ensure **financial correctness, auditability, and regulatory safety**.

Violating any invariant is considered a **critical system bug**.

---

## Core Principles

### 1. Ledger Is the Source of Truth

- Wallet balances are **never stored**
- All balances are **computed as the sum of ledger entries**
- Ledger entries are **immutable and append-only**

---

### 2. Transaction Balance Invariant (CRITICAL)

> **Invariant:**  
> For any `transactionId`, the sum of `LedgerEntry.amount` **MUST equal 0**

```text
Σ LedgerEntry.amount WHERE transactionId = X === 0
```
