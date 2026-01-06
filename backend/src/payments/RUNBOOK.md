# Operations Runbook - Payments & Refunds

## Overview

This runbook provides standard operating procedures (SOPs) for common operational tasks in the payments and refunds system.

**Audience:** Platform engineers, operations team, on-call engineers

**Prerequisites:**

- Access to production database (read-only for queries, write for emergency fixes)
- Access to application logs
- Admin JWT token for API calls
- Understanding of ledger invariants (see [LEDGER_RULES.md](./LEDGER_RULES.md))

---

## Table of Contents

1. [Safe Retry Procedures](#safe-retry-procedures)
2. [Idempotency Key Management](#idempotency-key-management)
3. [Manual Payment Capture](#manual-payment-capture)
4. [Manual Refund Processing](#manual-refund-processing)
5. [Wallet Balance Verification](#wallet-balance-verification)
6. [Daily Health Checks](#daily-health-checks)
7. [Platform Wallet Monitoring](#platform-wallet-monitoring)
8. [Emergency Procedures](#emergency-procedures)

---

## Safe Retry Procedures

### When to Retry

✅ **SAFE to retry:**

- Payment capture (idempotent via `paymentId`)
- Refund processing (once, if status = APPROVED)
- Ledger queries (always read-only)

❌ **UNSAFE to retry:**

- Payment initiation (creates duplicate payments)
- Refund initiation (creates duplicate refunds)
- Refund processing (if status = COMPLETED or PROCESSING)

### Retry Checklist

Before retrying any operation:

1. **Check current state:**

   ```sql
   -- For payment
   SELECT lifecycle, captured_at, idempotency_key
   FROM payments WHERE id = :payment_id;

   -- For refund
   SELECT status, processed_at, completed_at
   FROM refunds WHERE id = :refund_id;
   ```

2. **Check for ledger entries:**

   ```sql
   SELECT COUNT(*), SUM(amount)
   FROM ledger_entries
   WHERE payment_id = :payment_id OR refund_id = :refund_id;
   ```

3. **Verify idempotency key:**

   ```sql
   SELECT idempotency_key, COUNT(*)
   FROM ledger_entries
   WHERE idempotency_key = :key
   GROUP BY idempotency_key;
   ```

4. **If all clear, retry via API:**
   ```bash
   curl -X POST "https://api.rachelfoods.com/payments/:id/capture" \
     -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "gatewayTransactionId": "retry-txn-123",
       "gatewayResponse": "{\"status\":\"success\"}"
     }'
   ```

### Retry Decision Matrix

| Operation       | Current State | Action                          |
| --------------- | ------------- | ------------------------------- |
| Payment Capture | INITIATED     | ✅ Retry                        |
| Payment Capture | CAPTURED      | ℹ️ Already done (idempotent)    |
| Payment Capture | FAILED        | ❌ Don't retry - investigate    |
| Refund Process  | APPROVED      | ✅ Retry (once)                 |
| Refund Process  | PROCESSING    | ⏳ Wait 1 min, then investigate |
| Refund Process  | COMPLETED     | ℹ️ Already done                 |
| Refund Process  | FAILED        | ❌ Don't retry - investigate    |

---

## Idempotency Key Management

### Generate Idempotency Key

For manual operations, generate keys following this format:

```bash
# Payment capture
KEY="payment-capture-${PAYMENT_ID}-$(date +%s%3N)"

# Refund process
KEY="refund-process-${REFUND_ID}-$(date +%s%3N)"

echo $KEY
# Example: payment-capture-550e8400-e29b-41d4-a716-446655440000-1735725600123
```

### Check If Key Already Used

```sql
SELECT
  le.id,
  le.transaction_id,
  le.amount,
  le.created_at
FROM ledger_entries le
WHERE le.idempotency_key = :key;
```

**Expected:**

- 0 rows = Key available (safe to use)
- 1+ rows = Key already used (operation already performed)

### Clean Up Old Keys (Optional Maintenance)

**Note:** Never delete ledger entries. This is for analytics only.

```sql
-- Count old idempotency keys (older than 90 days)
SELECT COUNT(DISTINCT idempotency_key)
FROM ledger_entries
WHERE idempotency_key IS NOT NULL
  AND created_at < NOW() - INTERVAL '90 days';

-- Archive old keys to separate table (if needed for compliance)
-- DO NOT DELETE FROM ledger_entries
```

---

## Manual Payment Capture

### Use Case

- COD payment not auto-captured after delivery
- Gateway authorized but capture webhook failed
- Emergency recovery after system outage

### Procedure

**Step 1: Verify Payment Eligibility**

```sql
SELECT
  p.id,
  p.order_id,
  p.lifecycle,
  p.payment_method,
  p.amount,
  p.initiated_at,
  o.status as order_status,
  o.delivered_at
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.id = :payment_id;
```

**Checklist:**

- ✅ Payment lifecycle = INITIATED or AUTHORIZED
- ✅ Order status = DELIVERED (COD) or SHIPPED (PREPAID)
- ✅ No existing ledger entries
- ✅ No duplicate capture attempts in last 10 minutes

**Step 2: Determine Capture Method**

**For COD:**

```bash
curl -X POST "https://api.rachelfoods.com/payments/${PAYMENT_ID}/capture" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmedBy": "delivery-agent-uuid-or-system-admin",
    "confirmedAt": "2026-01-01T14:30:00Z"
  }'
```

**For PREPAID:**

```bash
curl -X POST "https://api.rachelfoods.com/payments/${PAYMENT_ID}/capture" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "gatewayTransactionId": "gw-txn-12345",
    "gatewayResponse": "{\"status\":\"success\",\"amount\":1000}"
  }'
```

**Step 3: Verify Capture**

```sql
-- Check payment status
SELECT lifecycle, captured_at, confirmed_by
FROM payments WHERE id = :payment_id;
-- Expected: lifecycle = 'CAPTURED', captured_at = current timestamp

-- Check ledger entries
SELECT
  wallet_id,
  amount,
  entry_type,
  description
FROM ledger_entries
WHERE payment_id = :payment_id
ORDER BY created_at ASC;
-- Expected: 3 entries (buyer debit, seller credit, platform credit)

-- Verify invariant
SELECT SUM(amount) as sum_check
FROM ledger_entries
WHERE payment_id = :payment_id;
-- Expected: 0.00
```

**Step 4: Notify Stakeholders**

- Update order status if needed
- Email buyer (payment confirmation)
- Email seller (payment received)
- Log incident ticket number in payment notes

---

## Manual Refund Processing

### Use Case

- Approved refund stuck in APPROVED state
- Refund failed due to transient error (DB connection)
- Emergency refund without normal approval flow

### Procedure

**Step 1: Verify Refund Status**

```sql
SELECT
  r.id,
  r.payment_id,
  r.amount,
  r.status,
  r.refund_platform_fee,
  r.requested_at,
  r.approved_at,
  r.approved_by,
  p.amount as payment_amount,
  p.lifecycle as payment_lifecycle
FROM refunds r
JOIN payments p ON p.id = r.payment_id
WHERE r.id = :refund_id;
```

**Checklist:**

- ✅ Refund status = APPROVED (or PENDING if emergency)
- ✅ Payment lifecycle = CAPTURED
- ✅ Seller wallet has sufficient balance
- ✅ No existing ledger entries for this refund

**Step 2: Check Wallet Balances**

```sql
-- Seller balance
SELECT
  w.wallet_code,
  COALESCE(SUM(le.amount), 0) as balance
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.id = (
  SELECT payee_wallet_id FROM payments WHERE id = :payment_id
)
GROUP BY w.id, w.wallet_code;
-- Must be >= refund amount (or adjusted if platform refunds fee)

-- Platform balance (if refunding fee)
SELECT
  w.wallet_code,
  COALESCE(SUM(le.amount), 0) as balance
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.wallet_code = 'PLATFORM_MAIN'
GROUP BY w.id, w.wallet_code;
```

**Step 3: Process Refund**

**Normal Flow (Status = APPROVED):**

```bash
curl -X POST "https://api.rachelfoods.com/refunds/${REFUND_ID}/process" \
  -H "Authorization: Bearer $ADMIN_JWT"
```

**Emergency Flow (Status = PENDING, requires approval first):**

```bash
# Step 3a: Approve
curl -X POST "https://api.rachelfoods.com/refunds/${REFUND_ID}/approve" \
  -H "Authorization: Bearer $ADMIN_JWT"

# Step 3b: Process
curl -X POST "https://api.rachelfoods.com/refunds/${REFUND_ID}/process" \
  -H "Authorization: Bearer $ADMIN_JWT"
```

**Step 4: Verify Processing**

```sql
-- Check refund status
SELECT status, processed_at, completed_at
FROM refunds WHERE id = :refund_id;
-- Expected: status = 'COMPLETED'

-- Check ledger entries
SELECT
  wallet_id,
  amount,
  entry_type,
  description
FROM ledger_entries
WHERE refund_id = :refund_id
ORDER BY created_at ASC;
-- Expected: 2-3 entries depending on platform fee refund

-- Verify invariant
SELECT SUM(amount) as sum_check
FROM ledger_entries
WHERE refund_id = :refund_id;
-- Expected: 0.00

-- Check payment status
SELECT lifecycle FROM payments WHERE id = :payment_id;
-- Expected: 'REFUNDED' if total refunded = payment amount
```

**Step 5: Verify Wallet Balances Updated**

```sql
-- Buyer balance should increase
SELECT
  w.wallet_code,
  COALESCE(SUM(le.amount), 0) as balance
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.id = (
  SELECT payer_wallet_id FROM payments WHERE id = :payment_id
)
GROUP BY w.id, w.wallet_code;

-- Seller balance should decrease
SELECT
  w.wallet_code,
  COALESCE(SUM(le.amount), 0) as balance
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.id = (
  SELECT payee_wallet_id FROM payments WHERE id = :payment_id
)
GROUP BY w.id, w.wallet_code;
```

---

## Wallet Balance Verification

### Quick Balance Check

```sql
-- Single wallet
SELECT
  w.wallet_code,
  w.wallet_type,
  w.user_id,
  COALESCE(SUM(le.amount), 0) as balance,
  COUNT(le.id) as entry_count
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.id = :wallet_id
GROUP BY w.id, w.wallet_code, w.wallet_type, w.user_id;
```

### Balance Audit (All Wallets)

```sql
-- Run weekly or after major incident
SELECT
  w.wallet_code,
  w.wallet_type,
  w.wallet_status,
  COALESCE(SUM(le.amount), 0) as balance,
  COUNT(le.id) as entry_count,
  MIN(le.created_at) as first_entry,
  MAX(le.created_at) as last_entry
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
GROUP BY w.id, w.wallet_code, w.wallet_type, w.wallet_status
ORDER BY balance DESC;
```

### Export Balance Report

```sql
-- CSV export for reconciliation
COPY (
  SELECT
    w.wallet_code,
    w.wallet_type,
    u.email,
    COALESCE(SUM(le.amount), 0) as balance
  FROM wallets w
  LEFT JOIN users u ON u.id = w.user_id
  LEFT JOIN ledger_entries le ON le.wallet_id = w.id
  GROUP BY w.id, w.wallet_code, w.wallet_type, u.email
  ORDER BY balance DESC
) TO '/tmp/wallet_balances_2026-01-01.csv' WITH CSV HEADER;
```

---

## Daily Health Checks

Run these queries every morning (automate via cron):

### Check 1: Ledger Invariant

```sql
-- Should return 0 rows
SELECT
  transaction_id,
  SUM(amount) as sum_violation,
  COUNT(*) as entry_count
FROM ledger_entries
WHERE transaction_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY transaction_id
HAVING SUM(amount) != 0;
```

### Check 2: Stuck Payments

```sql
-- Payments initiated > 24 hours ago
SELECT
  p.id,
  p.order_id,
  p.lifecycle,
  p.initiated_at,
  o.status as order_status
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.lifecycle = 'INITIATED'
  AND p.initiated_at < NOW() - INTERVAL '24 hours';
```

### Check 3: Stuck Refunds

```sql
-- Refunds in PROCESSING > 5 minutes
SELECT
  id,
  payment_id,
  status,
  processed_at
FROM refunds
WHERE status = 'PROCESSING'
  AND processed_at < NOW() - INTERVAL '5 minutes';
```

### Check 4: Failed Operations

```sql
-- Payments failed in last 24 hours
SELECT
  COUNT(*) as failed_payments,
  payment_method
FROM payments
WHERE lifecycle = 'FAILED'
  AND updated_at > NOW() - INTERVAL '24 hours'
GROUP BY payment_method;

-- Refunds failed in last 24 hours
SELECT
  COUNT(*) as failed_refunds,
  failure_reason
FROM refunds
WHERE status = 'FAILED'
  AND updated_at > NOW() - INTERVAL '24 hours'
GROUP BY failure_reason;
```

### Check 5: Orphaned Ledger Entries

```sql
-- Should return 0 rows
SELECT COUNT(*)
FROM ledger_entries
WHERE transaction_id IS NULL
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## Platform Wallet Monitoring

### Check Platform Revenue

```sql
-- Platform wallet balance (cumulative revenue)
SELECT
  w.wallet_code,
  COALESCE(SUM(le.amount), 0) as balance,
  COUNT(le.id) as entry_count
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id
WHERE w.wallet_code = 'PLATFORM_MAIN'
GROUP BY w.id, w.wallet_code;
```

### Platform Fee Breakdown (Last 30 Days)

```sql
SELECT
  DATE(le.created_at) as date,
  COUNT(*) as fee_count,
  SUM(le.amount) as daily_revenue
FROM ledger_entries le
JOIN wallets w ON w.id = le.wallet_id
WHERE w.wallet_code = 'PLATFORM_MAIN'
  AND le.entry_type = 'PLATFORM_FEE_CREDIT'
  AND le.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(le.created_at)
ORDER BY date DESC;
```

### Platform Fee Refunds (Last 30 Days)

```sql
SELECT
  DATE(le.created_at) as date,
  COUNT(*) as refund_count,
  ABS(SUM(le.amount)) as daily_refunded
FROM ledger_entries le
JOIN wallets w ON w.id = le.wallet_id
WHERE w.wallet_code = 'PLATFORM_MAIN'
  AND le.entry_type = 'REFUND_DEBIT'
  AND le.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(le.created_at)
ORDER BY date DESC;
```

---

## Emergency Procedures

### Emergency: Stop All Payment Processing

**When:** Ledger invariant violations detected system-wide

**Action:**

1. Deploy feature flag to disable payment/refund endpoints:

   ```bash
   # Set in environment or config service
   PAYMENTS_ENABLED=false
   REFUNDS_ENABLED=false
   ```

2. Return maintenance mode response:

   ```json
   {
     "error": "PaymentMaintenanceMode",
     "message": "Payment system temporarily unavailable",
     "retryAfter": "2026-01-01T18:00:00Z"
   }
   ```

3. Investigate root cause (see [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md))

### Emergency: Manual Wallet Freeze

**When:** Suspicious activity, fraud detected, legal hold

**Action:**

```sql
UPDATE wallets
SET wallet_status = 'FROZEN'
WHERE id = :wallet_id;
```

**Effect:**

- ❌ No new debits allowed
- ❌ No new credits allowed
- ✅ Existing ledger entries preserved
- ✅ Balance still queryable

**Unfreeze:**

```sql
UPDATE wallets
SET wallet_status = 'ACTIVE'
WHERE id = :wallet_id;
```

### Emergency: Create Compensating Transaction

**When:** Ledger invariant violated, missing entry detected

**See:** [INCIDENT_RESPONSE.md - Strategy A](./INCIDENT_RESPONSE.md#strategy-a-missing-entry-most-common)

**Template:**

```typescript
await prisma.ledgerEntry.create({
  data: {
    walletId: targetWalletId,
    amount: compensatingAmount, // Makes sum = 0
    entryType: 'ADJUSTMENT_CREDIT', // or ADJUSTMENT_DEBIT
    description: 'COMPENSATING ENTRY - Incident #${ticketId}',
    transactionId: originalTransactionId, // SAME as violated transaction
    createdBy: 'system-admin',
  },
});
```

**Verify:**

```sql
SELECT SUM(amount) FROM ledger_entries WHERE transaction_id = :id;
-- Must return 0.00
```

---

## Monitoring & Alerting Setup

### Critical Alerts

Configure these alerts in your monitoring system:

**Alert 1: Ledger Invariant Violation**

```
Query: SELECT COUNT(*) FROM (
  SELECT transaction_id
  FROM ledger_entries
  WHERE created_at > NOW() - INTERVAL '5 minutes'
  GROUP BY transaction_id
  HAVING SUM(amount) != 0
) violations;

Condition: count > 0
Severity: CRITICAL
Action: Page on-call immediately
```

**Alert 2: Stuck Payments**

```
Query: SELECT COUNT(*) FROM payments
       WHERE lifecycle = 'INITIATED'
       AND initiated_at < NOW() - INTERVAL '24 hours';

Condition: count > 10
Severity: HIGH
Action: Create incident ticket
```

**Alert 3: Failed Refunds**

```
Query: SELECT COUNT(*) FROM refunds
       WHERE status = 'FAILED'
       AND updated_at > NOW() - INTERVAL '1 hour';

Condition: count > 5
Severity: MEDIUM
Action: Notify payment team
```

---

## Related Documentation

- [README.md](./README.md) - Architecture overview
- [LEDGER_RULES.md](./LEDGER_RULES.md) - Invariant enforcement
- [REFUND_RULES.md](./REFUND_RULES.md) - Refund policies
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident handling
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
