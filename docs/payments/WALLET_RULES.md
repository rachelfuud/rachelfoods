# Wallet Rules

## Purpose

This document defines strict rules governing wallet creation, usage, and balance computation.

Wallets are **passive containers**.  
They do not own business logic — the ledger does.

---

## Wallet Types

### USER Wallet

- One per user (buyer or seller)
- Linked via `userId`
- Automatically created on user provisioning

### PLATFORM Wallet

- Owned by the system
- Identified via `walletCode` (e.g., PLATFORM_MAIN)
- No `userId`

### ESCROW Wallet

- Holds temporary funds
- Used for future workflows (disputes, holds)

---

## Balance Rules (CRITICAL)

❌ Wallet.balance column must NEVER exist  
✅ Balance is computed as:

```ts
SUM(LedgerEntry.amount WHERE walletId = X)
```
