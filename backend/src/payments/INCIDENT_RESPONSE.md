# Incident Response Guide - Payments & Refunds

## Overview

This guide provides step-by-step procedures for handling production incidents related to payments and refunds.

**Critical Principle:** Never manually edit ledger entries. Always use application-layer operations or create compensating transactions.

## Severity Levels

| Level             | Description                            | Response Time            |
| ----------------- | -------------------------------------- | ------------------------ |
| **P1 - Critical** | Ledger invariant violation, money loss | Immediate (page on-call) |
| **P2 - High**     | Failed refunds, stuck payments         | < 1 hour                 |
| **P3 - Medium**   | Balance discrepancies, slow queries    | < 4 hours                |
| **P4 - Low**      | Logging issues, cosmetic bugs          | Next business day        |

## Incident 1: Ledger Invariant Violation

### Symptoms

- Structured log: `"Ledger invariant violated: sum != 0"`
- Database query returns non-zero sum for transaction
- Monitoring alert: "Ledger Invariant Check Failed"

### Severity: P1 - CRITICAL 🚨

### Immediate Actions (First 5 minutes)

1. **Stop all payment/refund operations:**

   ```sql
   -- Identify affected transaction
   SELECT
     transaction_id,
     SUM(amount) as sum_violation,
     COUNT(*) as entry_count,
     MAX(created_at) as last_entry
   FROM ledger_entries
   WHERE transaction_id = :reported_transaction_id
   GROUP BY transaction_id;
   ```

2. **Check for in-flight operations:**

   ```sql
   -- Find related payment/refund
   SELECT
     le.transaction_id,
     le.payment_id,
     le.refund_id,
     p.lifecycle as payment_lifecycle,
     r.status as refund_status
   FROM ledger_entries le
   LEFT JOIN payments p ON p.id = le.payment_id
   LEFT JOIN refunds r ON r.id = le.refund_id
   WHERE le.transaction_id = :transaction_id
   LIMIT 1;
   ```

3. **Isolate the problem:**
   - Is this a single transaction or widespread?
   - Check last 24 hours for other violations:
   ```sql
   SELECT
     transaction_id,
     SUM(amount) as sum_check,
     COUNT(*) as entry_count
   FROM ledger_entries
   WHERE created_at > NOW() - INTERVAL '24 hours'
     AND transaction_id IS NOT NULL
   GROUP BY transaction_id
   HAVING SUM(amount) != 0;
   ```

### Investigation (Next 15 minutes)

4. **Examine ledger entries:**

   ```sql
   SELECT
     id,
     wallet_id,
     amount,
     entry_type,
     description,
     payment_id,
     refund_id,
     created_at,
     idempotency_key
   FROM ledger_entries
   WHERE transaction_id = :transaction_id
   ORDER BY created_at ASC;
   ```

5. **Check for missing entries:**
   - Compare entry count to expected count:
     - Payment capture: 3 entries (buyer, seller, platform)
     - Refund (no fee): 2 entries (seller, buyer)
     - Refund (with fee): 3 entries (seller, platform, buyer)

6. **Review application logs:**

   ```bash
   # Search for transaction_id in logs
   grep "transactionId.*payment-{id}" /var/log/app.log

   # Look for error patterns
   grep -A 5 "Failed to record ledger entries" /var/log/app.log
   ```

### Resolution Strategies

#### Strategy A: Missing Entry (Most Common)

**Scenario:** Transaction has 2 entries instead of 3, sum ≠ 0

**Cause:** Database transaction partially rolled back or network error

**Fix:** Create compensating entry

```typescript
// Example: Payment capture missing platform fee entry
// Existing: Buyer -$1000, Seller +$950, Platform +$0 (MISSING)
// Sum: -1000 + 950 = -50 (should be 0)

// Create compensating entry
await prisma.ledgerEntry.create({
  data: {
    walletId: platformWalletId,
    amount: new Decimal('50.00'), // Makes sum = 0
    entryType: 'PLATFORM_FEE_CREDIT',
    description: 'COMPENSATING ENTRY - Incident #123',
    transactionId: 'payment-original-id', // SAME transaction ID
    paymentId: paymentId,
    createdBy: 'system-admin',
  },
});
```

**Verify:**

```sql
SELECT SUM(amount) FROM ledger_entries WHERE transaction_id = :id;
-- Should now return 0.00
```

#### Strategy B: Incorrect Amount

**Scenario:** All entries present, but amounts don't sum to 0

**Cause:** Calculation error in business logic

**Fix:** Create reverse entries + correct entries

```typescript
// Example: Platform fee calculated wrong ($40 instead of $50)
// Existing: Buyer -$1000, Seller +$960, Platform +$40
// Sum: -1000 + 960 + 40 = 0 ✓ (but seller should have received $950)

// Step 1: Reverse the incorrect entries (new transaction)
const reverseTransactionId = `reverse-${originalTransactionId}`;
await ledgerService.recordEntries([
  { walletId: buyerWalletId, amount: new Decimal('1000'), ... },
  { walletId: sellerWalletId, amount: new Decimal('-960'), ... },
  { walletId: platformWalletId, amount: new Decimal('-40'), ... },
], reverseTransactionId, `reverse-${Date.now()}`);

// Step 2: Create correct entries (new transaction)
const correctedTransactionId = `corrected-${originalTransactionId}`;
await ledgerService.recordEntries([
  { walletId: buyerWalletId, amount: new Decimal('-1000'), ... },
  { walletId: sellerWalletId, amount: new Decimal('950'), ... },
  { walletId: platformWalletId, amount: new Decimal('50'), ... },
], correctedTransactionId, `corrected-${Date.now()}`);
```

**Result:**

- Original transaction remains (audit trail)
- Reverse transaction cancels it out
- Corrected transaction has right amounts
- Net effect: Correct balances

### Post-Incident Actions

1. **Update incident ticket** with root cause analysis
2. **Add regression test** to prevent recurrence
3. **Review business logic** in PaymentService or RefundService
4. **Monitor for 48 hours** for similar issues
5. **Conduct post-mortem** within 72 hours

---

## Incident 2: Failed Refund Processing

### Symptoms

- Refund status = `FAILED`
- Error: "Insufficient balance in seller wallet"
- Structured log: `"Failed to process refund"`

### Severity: P2 - HIGH

### Investigation Steps

1. **Check refund status:**

   ```sql
   SELECT
     r.id,
     r.payment_id,
     r.amount,
     r.status,
     r.failure_reason,
     r.refund_platform_fee,
     p.amount as payment_amount
   FROM refunds r
   JOIN payments p ON p.id = r.payment_id
   WHERE r.id = :refund_id;
   ```

2. **Check wallet balances:**

   ```sql
   SELECT
     w.wallet_code,
     w.wallet_type,
     COALESCE(SUM(le.amount), 0) as balance
   FROM wallets w
   LEFT JOIN ledger_entries le ON le.wallet_id = w.id
   WHERE w.id IN (
     SELECT payee_wallet_id FROM payments WHERE id = :payment_id
   )
   GROUP BY w.id, w.wallet_code, w.wallet_type;
   ```

3. **Check for partial refunds:**
   ```sql
   SELECT
     COUNT(*) as refund_count,
     SUM(amount) as total_refunded
   FROM refunds
   WHERE payment_id = :payment_id
     AND status = 'COMPLETED';
   ```

### Resolution Options

#### Option A: Seller Insufficient Balance

**Scenario:** Seller wallet balance < refund amount

**Action:**

1. Contact seller to fund wallet
2. OR adjust refund amount (requires buyer agreement)
3. OR process as platform-funded refund (exceptional)

**Platform-Funded Refund (Last Resort):**

```typescript
// Create entries from platform wallet instead of seller
await ledgerService.recordEntries(
  [
    {
      walletId: platformWalletId,
      amount: refundAmount.neg(),
      entryType: 'REFUND_DEBIT',
      description: 'Platform-funded refund - Incident #456',
    },
    {
      walletId: buyerWalletId,
      amount: refundAmount,
      entryType: 'REFUND_CREDIT',
      description: 'Refund received',
    },
  ],
  transactionId,
  idempotencyKey,
);

// Update refund status manually
await prisma.refund.update({
  where: { id: refundId },
  data: {
    status: 'COMPLETED',
    completedAt: new Date(),
  },
});
```

#### Option B: Race Condition - Payment Already Fully Refunded

**Scenario:** Two refunds processed simultaneously, total > payment amount

**Action:**

1. Verify which refund failed
2. Check if payment now fully refunded
3. If yes, reject the failed refund:

```typescript
await prisma.refund.update({
  where: { id: refundId },
  data: {
    status: 'REJECTED',
    rejectedBy: 'system-admin',
    rejectedAt: new Date(),
    rejectionReason: 'Payment already fully refunded by concurrent refund',
  },
});
```

#### Option C: Database Connection Lost

**Scenario:** Refund status = PROCESSING, no ledger entries created

**Action:**

1. Check if ledger entries exist:

   ```sql
   SELECT * FROM ledger_entries WHERE refund_id = :refund_id;
   ```

2. If no entries found, retry processing:

   ```typescript
   // Update status back to APPROVED
   await prisma.refund.update({
     where: { id: refundId },
     data: { status: 'APPROVED' },
   });

   // Retry processing
   await refundService.processRefund(refundId);
   ```

---

## Incident 3: Stuck Payment (INITIATED for > 24 hours)

### Symptoms

- Payment lifecycle = `INITIATED` for extended period
- Order delivered but payment not captured
- Customer complaint: "Order delivered but not charged"

### Severity: P2 - HIGH (if order delivered), P3 (otherwise)

### Investigation

1. **Identify stuck payments:**

   ```sql
   SELECT
     p.id,
     p.order_id,
     p.payment_method,
     p.lifecycle,
     p.initiated_at,
     o.status as order_status,
     o.delivered_at
   FROM payments p
   JOIN orders o ON o.id = p.order_id
   WHERE p.lifecycle = 'INITIATED'
     AND p.initiated_at < NOW() - INTERVAL '24 hours'
   ORDER BY p.initiated_at DESC;
   ```

2. **Check order status:**
   - If order cancelled → Cancel payment
   - If order delivered (COD) → Capture payment
   - If order shipped (PREPAID) → Check gateway

### Resolution

#### Case A: COD - Delivered but Not Captured

**Action:** Manually capture payment

```typescript
await paymentService.capturePayment({
  paymentId: paymentId,
  confirmedBy: 'system-admin', // Or actual delivery agent
  confirmedAt: orderDeliveredAt,
});
```

**Verify:**

```sql
SELECT lifecycle, captured_at FROM payments WHERE id = :payment_id;
-- Should show 'CAPTURED' and timestamp
```

#### Case B: PREPAID - Gateway Authorized but Not Captured

**Action:** Check gateway status first

```bash
# Query payment gateway
curl -X GET "https://gateway.example.com/api/transactions/:gatewayTxnId" \
  -H "Authorization: Bearer $GATEWAY_API_KEY"
```

If gateway shows funds held:

```typescript
await paymentService.capturePayment({
  paymentId: paymentId,
  gatewayTransactionId: gatewayTxnId,
  gatewayResponse: gatewayResponseJson,
});
```

If gateway shows no hold (timeout):

```typescript
await paymentService.failPayment(paymentId, 'Gateway authorization expired after 24 hours');
```

#### Case C: Order Cancelled - Payment Never Captured

**Action:** Cancel payment

```typescript
await paymentService.cancelPayment(paymentId);
```

**Verify no ledger entries:**

```sql
SELECT COUNT(*) FROM ledger_entries WHERE payment_id = :payment_id;
-- Should be 0 (cancelled payments have no ledger entries)
```

---

## Incident 4: Wallet Balance Discrepancy

### Symptoms

- User reports incorrect wallet balance
- Balance computation seems slow
- Balance doesn't match expected value

### Severity: P3 - MEDIUM

### Investigation

1. **Recompute balance from ledger:**

   ```sql
   SELECT
     w.wallet_code,
     w.user_id,
     COALESCE(SUM(le.amount), 0) as computed_balance,
     COUNT(le.id) as entry_count
   FROM wallets w
   LEFT JOIN ledger_entries le ON le.wallet_id = w.id
   WHERE w.id = :wallet_id
   GROUP BY w.id, w.wallet_code, w.user_id;
   ```

2. **Check for missing or duplicate entries:**

   ```sql
   -- Check for duplicate idempotency keys
   SELECT
     idempotency_key,
     COUNT(*) as count
   FROM ledger_entries
   WHERE wallet_id = :wallet_id
     AND idempotency_key IS NOT NULL
   GROUP BY idempotency_key
   HAVING COUNT(*) > 1;
   ```

3. **Audit recent transactions:**
   ```sql
   SELECT
     le.amount,
     le.entry_type,
     le.description,
     le.created_at,
     p.payment_method,
     p.lifecycle
   FROM ledger_entries le
   LEFT JOIN payments p ON p.id = le.payment_id
   WHERE le.wallet_id = :wallet_id
   ORDER BY le.created_at DESC
   LIMIT 50;
   ```

### Resolution

**Most Common:** User misunderstanding - balance is actually correct

**Action:**

1. Explain to user how balance is computed
2. Walk through their recent transactions
3. Show ledger entries as proof

**If Genuine Discrepancy:**

1. Verify all related transactions sum to 0
2. Look for cancelled payments or failed refunds
3. Check if user has multiple wallets (shouldn't happen, but verify)

**Database Issue:**

```sql
-- Force recomputation (read-only, safe to run)
SELECT
  w.id,
  w.wallet_code,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM ledger_entries
    WHERE wallet_id = w.id
  ) as fresh_balance
FROM wallets w
WHERE w.id = :wallet_id;
```

---

## Incident 5: Idempotency Key Collision Rate Spike

### Symptoms

- Monitoring alert: "P2002 errors > 1% of requests"
- Logs show frequent idempotency key collisions
- Users report "payment already exists" errors

### Severity: P3 - MEDIUM

### Investigation

1. **Check recent collisions:**

   ```sql
   SELECT
     idempotency_key,
     COUNT(*) as count,
     MIN(created_at) as first_seen,
     MAX(created_at) as last_seen
   FROM ledger_entries
   WHERE idempotency_key IS NOT NULL
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY idempotency_key
   HAVING COUNT(*) > 1
   ORDER BY count DESC
   LIMIT 20;
   ```

2. **Check idempotency key format:**
   ```sql
   SELECT DISTINCT
     substring(idempotency_key from 1 for 20) as key_prefix,
     COUNT(*)
   FROM ledger_entries
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY key_prefix
   ORDER BY count DESC;
   ```

### Resolution

**Legitimate Retries:** If keys are identical and operations are retries, this is expected behavior (idempotency working correctly).

**Clock Skew:** If timestamps in keys are identical across servers:

```bash
# Check server clock synchronization
timedatectl status

# Verify NTP sync
ntpq -p
```

**Key Format Issue:** If keys lack sufficient entropy:

```typescript
// Bad (insufficient entropy)
const key = `payment-${orderId}-${Date.now()}`;

// Good (includes randomness)
const key = `payment-${orderId}-${Date.now()}-${Math.random()}`;

// Best (use UUID)
const key = `payment-${orderId}-${uuidv4()}`;
```

---

## General Debugging Queries

### Check System Health

```sql
-- Total transaction count by status
SELECT
  p.lifecycle,
  COUNT(*) as count
FROM payments p
WHERE p.created_at > NOW() - INTERVAL '24 hours'
GROUP BY p.lifecycle;

-- Refund status distribution
SELECT
  r.status,
  COUNT(*) as count
FROM refunds r
WHERE r.requested_at > NOW() - INTERVAL '24 hours'
GROUP BY r.status;

-- Ledger entry rate (per hour)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as entry_count
FROM ledger_entries
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Find Suspicious Transactions

```sql
-- Payments without ledger entries (should only be uncaptured)
SELECT
  p.id,
  p.lifecycle,
  p.initiated_at
FROM payments p
LEFT JOIN ledger_entries le ON le.payment_id = p.id
WHERE p.lifecycle = 'CAPTURED'
  AND le.id IS NULL;
-- Expected: 0 rows

-- Refunds in PROCESSING for > 1 minute
SELECT
  r.id,
  r.status,
  r.processed_at
FROM refunds r
WHERE r.status = 'PROCESSING'
  AND r.processed_at < NOW() - INTERVAL '1 minute';
-- Expected: 0 rows (processing should be fast)
```

---

## Escalation Matrix

| Incident Type              | On-Call Engineer  | Platform Lead    | CTO               |
| -------------------------- | ----------------- | ---------------- | ----------------- |
| Ledger invariant violation | ✅ Immediate      | ✅ Within 15 min | ✅ Within 1 hour  |
| Failed refund (< $1000)    | ✅ Within 1 hour  | ℹ️ FYI next day  | ❌                |
| Failed refund (> $1000)    | ✅ Immediate      | ✅ Within 1 hour | ℹ️ Within 4 hours |
| Stuck payment              | ✅ Within 2 hours | ℹ️ FYI next day  | ❌                |
| Balance discrepancy        | ✅ Within 4 hours | ℹ️ FYI next day  | ❌                |

---

## Contact Information

**On-Call Engineer:** Use PagerDuty rotation
**Platform Team:** Slack #payments-support
**Database Team:** Slack #db-support
**Gateway Support:** support@paymentgateway.com (24/7)

---

## Related Documentation

- [README.md](./README.md) - Architecture overview
- [LEDGER_RULES.md](./LEDGER_RULES.md) - Invariant details
- [REFUND_RULES.md](./REFUND_RULES.md) - Refund policies
- [RUNBOOK.md](./RUNBOOK.md) - Standard operating procedures
