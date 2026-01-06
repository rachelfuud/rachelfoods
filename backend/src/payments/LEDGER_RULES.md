# Ledger Rules & Invariants

## The Golden Rule

**Every transaction MUST maintain the fundamental invariant:**

```
SUM(ledger_entry.amount) WHERE transactionId = X = 0
```

This is **non-negotiable**. Violating this invariant indicates:

- Data corruption
- Double-spending vulnerability
- Loss of financial integrity

## Why This Matters

The zero-sum invariant ensures **conservation of money**:

- Every debit has an equal and opposite credit
- Money cannot be created or destroyed
- All financial operations are balanced
- Audits can verify correctness by checking sums

## Enforcement Layers

The invariant is enforced at **THREE layers** for defense-in-depth:

### Layer 1: Pre-Transaction Validation

**Location:** `LedgerService.validateEntries()`

**When:** Before writing to database

**Check:**

```typescript
const sum = entries.reduce((acc, e) => acc.add(e.amount), new Decimal(0));
if (!sum.equals(0)) {
  throw new BadRequestException('Ledger invariant violated: sum != 0');
}
```

**Purpose:** Catch errors before they reach the database.

### Layer 2: Database Transaction Verification

**Location:** `LedgerService.verifyTransactionInvariant()`

**When:** After writing entries, before commit

**Check:**

```sql
SELECT SUM(amount)
FROM ledger_entries
WHERE transaction_id = :transactionId
```

**Purpose:** Verify actual database state before committing transaction.

### Layer 3: Post-Transaction Assertion

**Location:** Integration tests, operational monitors

**Check:** Query database directly and assert sum = 0

**Purpose:** Continuous verification in production.

## Idempotency Strategy

### Why Idempotency?

Network failures, timeouts, and retries are inevitable. Without idempotency:

- Retry → Duplicate ledger entries
- Duplicate entries → Invariant violation
- Invariant violation → Financial loss

### Implementation

Every ledger operation includes an `idempotencyKey`:

**Format:**

```
{operation}-{entityId}-{timestamp}
```

**Examples:**

```
payment-capture-550e8400-e29b-41d4-a716-446655440000-1735725600000
refund-process-660f9511-f30c-52e5-b827-557766551111-1735725650000
```

### Idempotency Check Flow

```
┌─────────────────────────────────────────────┐
│ 1. Check if idempotencyKey already exists  │
│    in ledger_entries table                  │
└──────────────┬──────────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Key exists?  │
        └──┬────────┬──┘
    YES    │        │    NO
           ▼        ▼
   ┌───────────────────────────────────┐
   │ Return existing entries           │
   │ Log: "Idempotent operation"       │
   │ HTTP 200 (not 409)                │
   └───────────────────────────────────┘
                │
                ▼
   ┌───────────────────────────────────┐
   │ Proceed with ledger write         │
   │ Store idempotencyKey with entries │
   └───────────────────────────────────┘
```

### Database Constraint

```sql
CREATE UNIQUE INDEX ledger_entries_idempotency_key_key
ON ledger_entries(idempotency_key)
WHERE idempotency_key IS NOT NULL;
```

**Race Condition Handling:**

If two requests arrive simultaneously:

1. First request acquires lock and writes
2. Second request hits unique constraint violation
3. Service detects `P2002` error code
4. Service queries existing entries by idempotencyKey
5. Service returns existing entries (idempotent)

## Transaction Isolation

**Isolation Level:** `READ COMMITTED` (Postgres default)

**Locking Strategy:**

- Prisma wraps ledger writes in `$transaction()`
- Row-level locks prevent concurrent writes to same wallet
- Invariant verified before commit

**Example:**

```typescript
await prisma.$transaction(async (tx) => {
  // Create all entries
  for (const entry of entries) {
    await tx.ledgerEntry.create({ data: entry });
  }

  // Verify invariant
  const sum = await tx.ledgerEntry.aggregate({
    where: { transactionId },
    _sum: { amount: true },
  });

  if (sum._sum.amount !== 0) {
    throw new Error('Invariant violation');
  }

  // Commit if sum = 0
});
```

## Immutability

Ledger entries are **APPEND-ONLY**:

❌ **NEVER:**

- `UPDATE ledger_entries`
- `DELETE ledger_entries`

✅ **ONLY:**

- `INSERT INTO ledger_entries`

**Why?**

- Audit trail preservation
- Regulatory compliance
- Prevents retroactive fraud
- Enables time-travel queries

## Ledger Entry Types

All entries use specific types from `LedgerEntryType` enum:

### Payment Entries

| Type                  | Usage                  | Amount Sign |
| --------------------- | ---------------------- | ----------- |
| `PAYMENT_DEBIT`       | Buyer pays             | Negative    |
| `PAYMENT_CREDIT`      | Seller receives        | Positive    |
| `PLATFORM_FEE_DEBIT`  | Seller's fee deduction | Negative    |
| `PLATFORM_FEE_CREDIT` | Platform receives fee  | Positive    |

### Refund Entries

| Type            | Usage                       | Amount Sign |
| --------------- | --------------------------- | ----------- |
| `REFUND_DEBIT`  | Seller/Platform pays refund | Negative    |
| `REFUND_CREDIT` | Buyer receives refund       | Positive    |

### Administrative Entries

| Type                | Usage                        | Amount Sign |
| ------------------- | ---------------------------- | ----------- |
| `ADJUSTMENT_CREDIT` | Manual correction (increase) | Positive    |
| `ADJUSTMENT_DEBIT`  | Manual correction (decrease) | Negative    |
| `REFERRAL_CREDIT`   | Referrer receives reward     | Positive    |
| `REFERRAL_DEBIT`    | Buyer uses referral discount | Negative    |

**Rule:** Always use the correct entry type. It enables:

- Filtered queries (e.g., "show all refunds")
- Audit reports by operation type
- Reconciliation processes

## Amount Precision

**Storage:** `DECIMAL(10, 2)`

- 10 total digits
- 2 decimal places
- Max value: $99,999,999.99

**Application:** Uses Prisma `Decimal` type

```typescript
import { Decimal } from '@prisma/client/runtime/library';

const amount = new Decimal('1500.00');
```

**Why `Decimal` not `number`?**

- Avoids floating-point errors (0.1 + 0.2 ≠ 0.3)
- Ensures exact penny-accurate calculations
- Required for financial applications

## Common Patterns

### Pattern 1: Simple Payment Capture

```typescript
const entries = [
  {
    walletId: buyerWalletId,
    amount: amount.neg(), // e.g., -1000.00
    entryType: 'PAYMENT_DEBIT',
    description: 'Payment for order ABC',
  },
  {
    walletId: sellerWalletId,
    amount: amount.sub(platformFee), // e.g., +950.00
    entryType: 'PAYMENT_CREDIT',
    description: 'Payment received (minus fee)',
  },
  {
    walletId: platformWalletId,
    amount: platformFee, // e.g., +50.00
    entryType: 'PLATFORM_FEE_CREDIT',
    description: 'Platform fee',
  },
];
// Sum: -1000 + 950 + 50 = 0 ✓
```

### Pattern 2: Full Refund (Platform Keeps Fee)

```typescript
const entries = [
  {
    walletId: sellerWalletId,
    amount: payment.amount.neg(), // e.g., -1000.00
    entryType: 'REFUND_DEBIT',
    description: 'Refund to buyer',
  },
  {
    walletId: buyerWalletId,
    amount: payment.amount, // e.g., +1000.00
    entryType: 'REFUND_CREDIT',
    description: 'Refund received',
  },
];
// Sum: -1000 + 1000 = 0 ✓
// Platform keeps the $50 fee (no ledger entry)
```

### Pattern 3: Full Refund (Platform Refunds Fee)

```typescript
const entries = [
  {
    walletId: sellerWalletId,
    amount: payment.amount.sub(platformFee).neg(), // e.g., -950.00
    entryType: 'REFUND_DEBIT',
    description: 'Refund seller portion',
  },
  {
    walletId: platformWalletId,
    amount: platformFee.neg(), // e.g., -50.00
    entryType: 'REFUND_DEBIT',
    description: 'Refund platform fee',
  },
  {
    walletId: buyerWalletId,
    amount: payment.amount, // e.g., +1000.00
    entryType: 'REFUND_CREDIT',
    description: 'Refund received',
  },
];
// Sum: -950 + -50 + 1000 = 0 ✓
```

## Verification Queries

### Check Transaction Invariant

```sql
-- Should return exactly 0.00
SELECT SUM(amount) as invariant_check
FROM ledger_entries
WHERE transaction_id = 'payment-550e8400-e29b-41d4-a716-446655440000'
GROUP BY transaction_id;
```

### Check ALL Transactions

```sql
-- Any row with non-zero sum is a violation
SELECT
  transaction_id,
  SUM(amount) as sum_check,
  COUNT(*) as entry_count
FROM ledger_entries
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING SUM(amount) != 0;
```

**Expected result:** 0 rows (empty set)

### Wallet Balance Calculation

```sql
-- Derived balance (always up-to-date)
SELECT
  w.wallet_code,
  w.wallet_type,
  COALESCE(SUM(le.amount), 0) as balance
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.id = :walletId
GROUP BY w.id, w.wallet_code, w.wallet_type;
```

## Error Scenarios

### Scenario 1: Sum ≠ 0

**Symptom:** Pre-transaction validation fails

**Error:**

```
BadRequestException: Ledger invariant violated: sum != 0
Expected: 0, Got: 50.00
```

**Cause:** Business logic error in entry calculation

**Action:**

1. DO NOT override the check
2. Review entry calculation logic
3. Fix the business logic
4. Ensure all debits have matching credits

### Scenario 2: Database Constraint Violation

**Symptom:** Unique constraint error on idempotencyKey

**Error:**

```
P2002: Unique constraint failed on the fields: (`idempotency_key`)
```

**Cause:** Duplicate idempotency key (retry scenario)

**Action:**

1. Service automatically queries existing entries
2. Returns existing entries (idempotent behavior)
3. No manual intervention needed

### Scenario 3: Transaction Rollback

**Symptom:** Database transaction rolled back during invariant check

**Error:**

```
InternalServerErrorException: Ledger transaction failed
```

**Cause:** Sum ≠ 0 detected in database verification layer

**Action:**

1. Check application logs for calculation error
2. Review PaymentService or RefundService logic
3. Fix entry calculation bug
4. Retry operation after fix

## Best Practices

### DO:

✅ Use `Decimal` for all amount calculations
✅ Verify sum = 0 before calling `recordEntries()`
✅ Include idempotencyKey for all operations
✅ Use correct `LedgerEntryType` for each entry
✅ Include descriptive `description` field
✅ Link entries to payment/refund/order via foreign keys

### DO NOT:

❌ Use JavaScript `number` for amounts
❌ Skip idempotency keys (risk duplicate entries)
❌ Update or delete ledger entries
❌ Store wallet balances directly
❌ Perform calculations in SQL (use application layer)
❌ Create ledger entries without verification

## Monitoring & Alerts

### Critical Alerts

**Alert 1: Ledger Invariant Violation**

```
Condition: SUM(amount) != 0 for any transaction_id
Severity: CRITICAL (P1)
Action: Page on-call engineer immediately
```

**Alert 2: Failed Ledger Write**

```
Condition: LedgerService.recordEntries() throws exception
Severity: HIGH (P2)
Action: Create incident ticket
```

**Alert 3: Idempotency Key Collision**

```
Condition: P2002 error rate > 1% of requests
Severity: MEDIUM (P3)
Action: Investigate idempotency key generation logic
```

### Daily Health Checks

Run these queries daily (automated):

```sql
-- 1. Check for invariant violations
SELECT transaction_id, SUM(amount)
FROM ledger_entries
GROUP BY transaction_id
HAVING SUM(amount) != 0;
-- Expect: 0 rows

-- 2. Check for orphaned entries
SELECT COUNT(*)
FROM ledger_entries
WHERE transaction_id IS NULL;
-- Expect: 0

-- 3. Check for duplicate idempotency keys
SELECT idempotency_key, COUNT(*)
FROM ledger_entries
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
-- Expect: 0 rows
```

## Related Documentation

- [README.md](./README.md) - Overall architecture
- [REFUND_RULES.md](./REFUND_RULES.md) - Refund-specific rules
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - What to do when things go wrong
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
