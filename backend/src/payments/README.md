# Payments & Refunds Module

## Overview

The Payments & Refunds module is a production-grade financial transaction system built on **double-entry bookkeeping** principles. It provides payment processing, wallet management, and refund workflows for the RachelFoods platform.

## Core Architecture

### Design Principles

1. **Ledger-First Architecture**: All financial operations flow through an immutable ledger
2. **Derived Balances**: Wallet balances are computed from ledger entries, never stored directly
3. **Atomic Transactions**: All ledger entries within a transaction are recorded atomically
4. **Idempotency**: Every operation can be safely retried using idempotency keys
5. **Invariant Enforcement**: Sum of ledger entries per transaction MUST equal zero

### Service Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    Controllers (Thin)                       │
│              (PaymentController, RefundController)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Orchestration Services                        │
│  ┌─────────────────┐      ┌──────────────────┐             │
│  │ PaymentService  │      │  RefundService   │             │
│  └────────┬────────┘      └────────┬─────────┘             │
│           │                        │                        │
│           └────────────┬───────────┘                        │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Core Financial Services                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ LedgerService│  │ WalletService │  │PlatformFeeService│ │
│  │ (Immutable)  │  │ (Read-Only)   │  │ (Calculation)   │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
                    PostgreSQL
              (Prisma + Row-Level Locking)
```

### Key Services

| Service                       | Responsibility                  | Mutates Ledger?  |
| ----------------------------- | ------------------------------- | ---------------- |
| **LedgerService**             | Immutable transaction log       | ✅ (append-only) |
| **WalletService**             | Balance computation, validation | ❌ (read-only)   |
| **PlatformFeeService**        | Fee calculation                 | ❌ (calculation) |
| **PaymentService**            | Payment lifecycle orchestration | ✅ (via Ledger)  |
| **RefundService**             | Refund workflow orchestration   | ✅ (via Ledger)  |
| **PlatformWalletInitializer** | Bootstrap platform wallets      | ✅ (one-time)    |

## Payment Lifecycle

### State Machine

```
┌──────────────┐
│  INITIATED   │ ◄──── Payment created, awaiting capture
└──────┬───────┘
       │
       ├─────► AUTHORIZED ──┐ (PREPAID/CHECKOUT only)
       │                    │
       └────────────────────┴──► CAPTURED ──► (Payment complete)
                                     │
                                     └──► REFUNDED (if refund processed)

Alternative paths:
INITIATED ──► CANCELLED (before capture)
INITIATED ──► FAILED (gateway rejection)
```

### Payment Methods

#### 1. COD (Cash on Delivery)

**Flow:**

```
1. Order confirmed
2. Payment INITIATED (no funds held)
3. Order shipped
4. Delivery agent delivers + collects cash
5. Delivery agent confirms via app
6. Payment CAPTURED
   - Ledger entries recorded
   - Buyer wallet DEBIT
   - Seller wallet CREDIT (amount - platform fee)
   - Platform wallet CREDIT (platform fee)
```

**Key Points:**

- Capture requires `confirmedBy` (delivery agent ID)
- Capture timestamp = delivery confirmation time
- No gateway involved

**Endpoint:**

```typescript
POST /payments/:id/capture
{
  "confirmedBy": "agent-uuid",
  "confirmedAt": "2026-01-01T10:30:00Z"
}
```

#### 2. PREPAID (Payment Gateway)

**Flow:**

```
1. Order confirmed
2. Payment INITIATED
3. Gateway authorization call
4. Payment AUTHORIZED (funds held by gateway)
5. Order fulfilled
6. Payment CAPTURED
   - Gateway capture call
   - Ledger entries recorded
   - Same wallet movements as COD
```

**Key Points:**

- Gateway handles fund holding
- Capture includes `gatewayTransactionId` and `gatewayResponse`
- Authorization ≠ Capture (funds not in ledger until CAPTURED)

**Endpoint:**

```typescript
POST /payments/:id/capture
{
  "gatewayTransactionId": "gw-txn-12345",
  "gatewayResponse": "{\"status\":\"success\",...}"
}
```

#### 3. CHECKOUT

**Status:** Similar to PREPAID (gateway-based)
**Implementation:** ⚠️ Not fully implemented - follows PREPAID pattern

### Ledger Entries on Capture

For a $1000 payment with 5% platform fee ($50):

```
Entry 1: Buyer Wallet    DEBIT   -$1000.00
Entry 2: Seller Wallet   CREDIT  +$ 950.00
Entry 3: Platform Wallet CREDIT  +$  50.00
────────────────────────────────────────────
         SUM (MUST = 0):          $   0.00 ✓
```

**Invariant:** `SUM(amount) WHERE transactionId = 'payment-{id}' = 0`

This enforces conservation of money - every debit has an equal credit.

## Refund Lifecycle

### State Machine

```
┌─────────┐
│ PENDING │ ◄──── Buyer initiates refund
└────┬────┘
     │
     ├──► APPROVED ──┐ (Admin approval)
     │               │
     │               ▼
     │          PROCESSING ──► COMPLETED
     │               │
     │               └──► FAILED (ledger error)
     │
     └──► REJECTED (Admin rejection)

Terminal States: COMPLETED, FAILED, REJECTED
```

### Refund Workflow

**Step 1: Initiation (Buyer)**

```typescript
POST /refunds
{
  "paymentId": "payment-uuid",
  "amount": "500.00",
  "reason": "Product defective",
  "description": "Screen cracked on arrival",
  "evidence": ["https://s3.../photo1.jpg"],
  "refundPlatformFee": false
}
```

**Step 2: Approval (Admin)**

```typescript
POST /refunds/:id/approve
// No body required - admin context from JWT
```

**Step 3: Processing (System)**

```typescript
POST /refunds/:id/process
// Executes ledger entries atomically
```

### Ledger Entries on Refund

**Scenario A: Refund WITHOUT Platform Fee**

Buyer paid $1000, platform fee was $50, seller received $950.
Buyer requests $1000 refund, `refundPlatformFee: false`.

```
Entry 1: Seller Wallet   DEBIT   -$1000.00  (seller pays full refund)
Entry 2: Buyer Wallet    CREDIT  +$1000.00
────────────────────────────────────────────
         SUM:                     $   0.00 ✓
```

**Platform keeps the $50 fee** (default behavior).

**Scenario B: Refund WITH Platform Fee**

Same scenario, but `refundPlatformFee: true`.

```
Entry 1: Seller Wallet   DEBIT   -$ 950.00  (seller refunds what they received)
Entry 2: Platform Wallet DEBIT   -$  50.00  (platform refunds fee)
Entry 3: Buyer Wallet    CREDIT  +$1000.00
────────────────────────────────────────────
         SUM:                     $   0.00 ✓
```

**Platform refunds the $50 fee** (exceptional cases only).

### Partial Refunds

Multiple partial refunds are allowed until total refunded = payment amount.

**Example:**

- Original payment: $1000
- Refund 1: $300 (COMPLETED)
- Refund 2: $400 (COMPLETED)
- Refund 3: $300 (COMPLETED) ✓
- Refund 4: $100 ❌ **REJECTED** - exceeds payment amount

When total refunded reaches payment amount, payment lifecycle updates to `REFUNDED`.

## Wallet System

### Wallet Types

| Type         | Description                        | User Association |
| ------------ | ---------------------------------- | ---------------- |
| **USER**     | Personal wallet for buyers/sellers | Required         |
| **PLATFORM** | Rachel Foods revenue               | No user (system) |
| **ESCROW**   | Temporary holding                  | No user (system) |

### Wallet Status

| Status        | Meaning            | Operations Allowed  |
| ------------- | ------------------ | ------------------- |
| **ACTIVE**    | Normal operation   | CREDIT ✓, DEBIT ✓   |
| **SUSPENDED** | Under review       | CREDIT ✓, DEBIT ❌  |
| **FROZEN**    | Security hold      | CREDIT ❌, DEBIT ❌ |
| **CLOSED**    | Permanently closed | CREDIT ❌, DEBIT ❌ |

### Balance Computation

Wallets do NOT store balances. Balances are computed on-demand:

```sql
SELECT SUM(amount)
FROM ledger_entries
WHERE wallet_id = :walletId
```

This ensures:

- No balance drift
- Single source of truth (ledger)
- Automatic balance updates from ledger entries

## Platform Fee Calculation

**Formula:**

```
platformFee = orderAmount * feePercent / 100
```

**Default Fee:** Configurable per category via `platform_fee_config` table.

**Fallback:** If no category config exists, uses global default (typically 5%).

**Fee Timing:**

- Fee calculated at payment initiation
- Fee stored with payment record
- Fee deducted at capture time

## Idempotency

### Strategy

Every ledger operation uses an `idempotencyKey` to prevent duplicate entries.

**Format:** `{operation}-{entityId}-{timestamp}`

**Examples:**

- `payment-initiate-order123-1735725600000`
- `payment-capture-payment456-1735725650000`
- `refund-process-refund789-1735725700000`

### Behavior

If duplicate operation detected:

1. Query existing ledger entries by `idempotencyKey`
2. Return existing entries (no error)
3. Log: "Idempotent operation detected"

**Result:** Safe to retry any operation without creating duplicates.

## Security Model

### Permission-Based Access Control

All endpoints protected by:

1. `JwtAuthGuard` - Validates JWT token
2. `PermissionsGuard` - Checks required permissions

### Permission Matrix

| Action            | Permission          | Roles                              |
| ----------------- | ------------------- | ---------------------------------- |
| Create payment    | `payment.create`    | buyer                              |
| Capture payment   | `payment.capture`   | delivery-agent, platform-admin     |
| Cancel payment    | `payment.cancel`    | buyer, platform-admin              |
| Read own payments | `payment.read_self` | buyer, store-owner, delivery-agent |
| Read all payments | `payment.read_any`  | platform-admin                     |
| Create refund     | `refund.create`     | buyer                              |
| Approve refund    | `refund.approve`    | platform-admin                     |
| Reject refund     | `refund.reject`     | platform-admin                     |
| Process refund    | `refund.process`    | platform-admin                     |
| Read own refunds  | `refund.read_self`  | buyer, store-owner                 |
| Read all refunds  | `refund.read_any`   | platform-admin                     |

**Super-Admin Override:** Users with `platform-admin` role bypass all permission checks.

## Not Implemented (Future Enhancements)

The following features are **NOT currently implemented**:

1. **Withdrawal System**: Sellers cannot withdraw funds from wallets to bank accounts
2. **Wallet Top-Up**: Buyers cannot add funds to wallets directly
3. **Payment Disputes**: No dispute resolution workflow
4. **Chargeback Handling**: No integration with payment gateway chargebacks
5. **Wallet-to-Wallet Transfers**: Cannot transfer between user wallets
6. **Scheduled Payments**: No recurring/subscription payments
7. **Split Payments**: Cannot split single order across multiple payment methods
8. **Payment Holds**: Cannot hold funds in escrow automatically
9. **Refund Deadlines**: No time-based refund eligibility rules
10. **Gateway Integration**: Gateway calls stubbed (needs actual integration)

## Testing

Integration tests located in: `test/payments-refunds.integration.spec.ts`

**Test Coverage:**

- ✅ 15 integration tests
- ✅ Payment lifecycle (COD, PREPAID, cancel)
- ✅ Refund lifecycle (approve, reject, partial)
- ✅ Idempotency verification
- ✅ Security & abuse prevention
- ✅ Ledger invariant verification

**Run tests:**

```bash
npm test                    # Run all tests
npm run test:cov           # With coverage report
npm run test:watch         # Watch mode
```

## Monitoring & Observability

### Structured Logging

All services emit structured JSON logs with context:

```json
{
  "message": "Payment captured - ledger entries recorded",
  "paymentId": "uuid",
  "orderId": "uuid",
  "transactionId": "payment-uuid",
  "amount": "1000.00",
  "platformFee": "50.00",
  "paymentMethod": "PREPAID",
  "confirmedBy": "agent-uuid"
}
```

**Key Log Events:**

- Payment initiated
- Payment captured
- Payment cancelled
- Payment failed
- Refund initiated
- Refund approved
- Refund rejected
- Refund completed
- Ledger entries recorded
- Ledger invariant violation

### Health Checks

⚠️ **Not Implemented:** No health check endpoint for ledger consistency.

**Recommended:** Add daily cron job to verify ledger invariants across all transactions.

## Database Schema

**Tables:**

- `payments` - Payment records with lifecycle state
- `refunds` - Refund records with approval workflow
- `wallets` - Wallet metadata (no balances stored)
- `ledger_entries` - Immutable transaction log (append-only)
- `platform_fee_config` - Fee percentage by category

**See:** `backend/prisma/migrations/20260101163500_add_payments_wallets_module` for full schema.

## Related Documentation

- [LEDGER_RULES.md](./LEDGER_RULES.md) - Ledger invariants and enforcement
- [REFUND_RULES.md](./REFUND_RULES.md) - Refund policies and workflows
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Handling production incidents
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Developer guidelines

## Quick Start

### Initialize Platform Wallets

**One-time bootstrap:**

```bash
npm run seed:platform-wallets
```

This creates:

- `PLATFORM_MAIN` (revenue wallet)
- `PLATFORM_ESCROW` (future use)

### Verify RBAC Permissions

```bash
npm run seed:payments-rbac    # Seed permissions
npm run view:payments-rbac    # View configuration
```

### Process a Payment (COD)

1. **Create payment:**

   ```typescript
   POST /payments
   {
     "orderId": "order-uuid",
     "paymentMethod": "COD",
     "amount": "1500.00",
     "payeeUserId": "seller-uuid"
   }
   ```

2. **Capture after delivery:**

   ```typescript
   POST /payments/{id}/capture
   {
     "confirmedBy": "agent-uuid",
     "confirmedAt": "2026-01-01T14:30:00Z"
   }
   ```

3. **Verify ledger:**
   ```sql
   SELECT * FROM ledger_entries WHERE payment_id = '{id}';
   -- Should see 3 entries summing to 0
   ```

### Process a Refund

1. **Buyer initiates:**

   ```typescript
   POST /refunds
   {
     "paymentId": "payment-uuid",
     "amount": "1500.00",
     "reason": "Damaged goods"
   }
   ```

2. **Admin approves:**

   ```typescript
   POST / refunds / { id } / approve;
   ```

3. **System processes:**

   ```typescript
   POST / refunds / { id } / process;
   ```

4. **Verify ledger:**
   ```sql
   SELECT * FROM ledger_entries WHERE refund_id = '{id}';
   -- Should see 2-3 entries summing to 0
   ```

## Support

For questions or issues:

1. Check [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for common problems
2. Review [RUNBOOK.md](./RUNBOOK.md) for operational procedures
3. Consult [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
