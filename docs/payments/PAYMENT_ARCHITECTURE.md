---

# 📄 `/docs/payments/PAYMENT_ARCHITECTURE.md`

```md
# Payment Architecture

## Overview
The Rachel Foods payment system is a **wallet-to-wallet, ledger-backed architecture** designed for correctness, extensibility, and auditability.

Payments do not directly modify balances.  
They generate **ledger transactions** which determine balances.

---

## Key Components

### 1. Wallet

Represents an entity capable of holding value.

Wallet Types:

- USER — Buyer or Seller
- PLATFORM — Platform commission wallet
- ESCROW — Temporary holding (future use)

Wallet balance is **computed**, never stored.

---

### 2. Payment

Represents the **intent and lifecycle** of a payment.

Payment responsibilities:

- Track payer and payee wallets
- Store payment metadata (method, gateway, status)
- Link to order
- Coordinate ledger writes

Payment does NOT:

- Store balances
- Represent money movement by itself

---

### 3. LedgerEntry

Represents actual money movement.

Every payment:

- Produces ≥2 ledger entries
- Shares a common `transactionId`
- Must satisfy the zero-sum invariant

---

## Payment Lifecycle

```text
INITIATED
  ↓
AUTHORIZED (Prepaid only)
  ↓
CAPTURED
  ↓
REFUNDED (optional)
```
