# Refund Rules & Policies

## Overview

This document defines the rules, policies, and technical implementation details for refunds in the RachelFoods platform.

## Refund Eligibility

### Prerequisites

A payment can be refunded if and only if:

1. ✅ Payment lifecycle = `CAPTURED`
2. ✅ Refund amount ≤ original payment amount
3. ✅ Total refunds (completed + processing) ≤ payment amount
4. ✅ Seller wallet has sufficient balance
5. ✅ (If refunding platform fee) Platform wallet has sufficient balance

### Ineligible Payments

❌ **Cannot refund:**

- Payments in `INITIATED` state (not captured yet)
- Payments in `CANCELLED` state (never captured)
- Payments in `FAILED` state (never completed)
- Payments already fully refunded

## Refund Lifecycle

### State Diagram

```
                     Buyer initiates
                           │
                           ▼
                    ┌─────────────┐
                    │   PENDING   │ ◄── Awaiting admin review
                    └──────┬──────┘
                           │
                ┌──────────┴──────────┐
                │                     │
         Admin rejects         Admin approves
                │                     │
                ▼                     ▼
         ┌──────────┐          ┌──────────┐
         │ REJECTED │          │ APPROVED │
         └──────────┘          └────┬─────┘
          (Terminal)                │
                              System processes
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                  Success             Failure (ledger error)
                         │                     │
                         ▼                     ▼
                  ┌───────────┐         ┌─────────┐
                  │ COMPLETED │         │ FAILED  │
                  └───────────┘         └─────────┘
                   (Terminal)            (Terminal)
```

### Terminal States

Once a refund reaches these states, no further state transitions are possible:

- **REJECTED** - Admin denied the refund
- **COMPLETED** - Refund successfully processed
- **FAILED** - Ledger operation failed (requires manual intervention)

## Refund Types

### Full Refund

**Definition:** Refund amount = original payment amount

**Example:**

```
Payment: $1000
Refund:  $1000 (100%)
```

**Effect on Payment:**

- Payment lifecycle → `REFUNDED`
- No further refunds allowed on this payment

### Partial Refund

**Definition:** Refund amount < original payment amount

**Example:**

```
Payment:    $1000
Refund 1:   $ 300 (30%)
Refund 2:   $ 400 (40%)
Remaining:  $ 300 (can still refund up to this)
```

**Rules:**

- Multiple partial refunds allowed
- Sum of all refunds cannot exceed payment amount
- When total refunds = payment amount, payment → `REFUNDED`

### Platform Fee Handling

The **key decision** in refunds: Does the platform refund its fee?

#### Option A: Platform Keeps Fee (Default)

**Field:** `refundPlatformFee: false` (or omitted)

**Policy:** Platform keeps the fee as service charge, seller refunds full amount.

**Example:**

```
Original Payment:
  Buyer paid:       $1000
  Seller received:  $ 950
  Platform fee:     $  50

Refund Process:
  Seller pays:      -$1000  (seller covers full refund)
  Buyer receives:   +$1000
  Platform keeps:   $   50  (no ledger entry)

Ledger Entries:
  1. Seller DEBIT:  -$1000
  2. Buyer CREDIT:  +$1000
  ────────────────────────
     SUM:            $    0 ✓
```

**When to use:**

- Product quality issue (seller's responsibility)
- Seller error (wrong item shipped)
- Buyer changed mind (seller policy allows)
- Default behavior for most refunds

#### Option B: Platform Refunds Fee (Exceptional)

**Field:** `refundPlatformFee: true`

**Policy:** Platform participates in refund by returning its fee.

**Example:**

```
Original Payment:
  Buyer paid:       $1000
  Seller received:  $ 950
  Platform fee:     $  50

Refund Process:
  Seller pays:      -$ 950  (what they received)
  Platform pays:    -$  50  (their fee)
  Buyer receives:   +$1000

Ledger Entries:
  1. Seller DEBIT:   -$950
  2. Platform DEBIT: -$ 50
  3. Buyer CREDIT:   +$1000
  ─────────────────────────
     SUM:             $   0 ✓
```

**When to use:**

- Platform error (payment gateway issue)
- Service outage (platform's fault)
- Exceptional cases at platform discretion
- Goodwill gestures

**Important:** Platform admins control this flag during approval. Buyers cannot force platform fee refunds.

## Approval Workflow

### Who Can Approve?

**Required permission:** `refund.approve`

**Default roles:**

- `platform-admin` ✅

**Rationale:**

- Financial impact review
- Fraud prevention
- Policy compliance verification

### Approval Criteria (Guidelines)

Admins should consider:

1. **Validity:** Is the refund reason legitimate?
2. **Evidence:** Did buyer provide supporting evidence (photos, etc.)?
3. **Policy:** Does it align with refund policy?
4. **History:** Is this buyer/seller flagged for abuse?
5. **Amount:** Is partial refund more appropriate?

**Note:** These are guidelines, not enforced by code.

### Rejection Reasons

Common rejection reasons:

- Outside refund window (policy-dependent)
- Insufficient evidence
- Buyer misuse (e.g., "changed mind" outside policy)
- Seller already provided remedy
- Fraudulent claim

Rejection reason is **required** and stored for audit trail.

## Processing Rules

### Timing

Refunds are processed in **3 distinct steps**:

1. **Initiation (Immediate):** Buyer creates refund in `PENDING` state
2. **Approval (Manual):** Admin reviews and approves/rejects
3. **Processing (Immediate):** System executes ledger entries atomically

**No automatic processing** - admin approval required for every refund.

### Balance Validation

Before processing, system validates:

**Seller Balance Check:**

```
Required balance = refundPlatformFee ?
                   (refundAmount - platformFeeOriginal) :
                   refundAmount

if (sellerBalance < requiredBalance) {
  throw InsufficientBalanceException
}
```

**Platform Balance Check (if refunding fee):**

```
if (refundPlatformFee && platformBalance < platformFeeOriginal) {
  throw InsufficientBalanceException
}
```

**Effect:** Refund moves to `FAILED` state, admin must resolve manually.

### Idempotency

**Idempotency Key Format:**

```
refund-process-{refundId}
```

**Behavior:**

- First `processRefund()` call → Creates ledger entries
- Subsequent calls → Throws error: "Cannot process refund in COMPLETED state"

**Note:** Unlike payment capture, refund processing is NOT idempotent after completion. Once `COMPLETED`, cannot be called again.

## Ledger Entry Patterns

### Pattern 1: Simple Refund (No Fee Refund)

**Scenario:** $500 refund from $1000 payment (5% fee = $50)

```typescript
const entries = [
  {
    walletId: sellerWalletId,
    amount: new Decimal('-500.00'),
    entryType: 'REFUND_DEBIT',
    description: 'Refund to buyer',
    refundId: refundId,
    paymentId: paymentId,
  },
  {
    walletId: buyerWalletId,
    amount: new Decimal('500.00'),
    entryType: 'REFUND_CREDIT',
    description: 'Refund received',
    refundId: refundId,
    paymentId: paymentId,
  },
];
// Sum: -500 + 500 = 0 ✓
```

### Pattern 2: Refund with Platform Fee

**Scenario:** Same $500 refund, but platform refunds proportional fee

```typescript
// Original: $1000 payment, $50 fee (5%)
// Refunding: $500 (50% of payment)
// Platform refunds: $25 (50% of fee)

const platformFeeRefund = new Decimal('25.00');
const sellerPortion = new Decimal('500.00').sub(platformFeeRefund); // $475

const entries = [
  {
    walletId: sellerWalletId,
    amount: sellerPortion.neg(), // -$475
    entryType: 'REFUND_DEBIT',
    description: 'Refund seller portion',
    refundId: refundId,
    paymentId: paymentId,
  },
  {
    walletId: platformWalletId,
    amount: platformFeeRefund.neg(), // -$25
    entryType: 'REFUND_DEBIT',
    description: 'Refund platform fee',
    refundId: refundId,
    paymentId: paymentId,
  },
  {
    walletId: buyerWalletId,
    amount: new Decimal('500.00'), // +$500
    entryType: 'REFUND_CREDIT',
    description: 'Refund received',
    refundId: refundId,
    paymentId: paymentId,
  },
];
// Sum: -475 + -25 + 500 = 0 ✓
```

## Edge Cases

### Case 1: Multiple Partial Refunds

**Scenario:**

```
Payment: $1000
Refund 1: $300 (COMPLETED)
Refund 2: $400 (COMPLETED)
Refund 3: $300 (COMPLETED)
Refund 4: $100 (Attempt)
```

**Result:** Refund 4 REJECTED at initiation

**Error:**

```
ConflictException: Total refund amount $1100 would exceed payment amount $1000.
Already refunded: $700
```

**Check performed at:**

- Refund initiation (before entering PENDING state)
- Counts all refunds in: APPROVED, PROCESSING, COMPLETED states
- Does NOT count PENDING, REJECTED, FAILED refunds

### Case 2: Race Condition on Refund Limit

**Scenario:**

```
Payment: $1000
Refund 1: $600 (PENDING)
Refund 2: $600 (PENDING, submitted simultaneously)
```

**Resolution:**

1. Both refunds created in PENDING (no check at this stage in current implementation)
2. Admin approves Refund 1 → moves to APPROVED
3. Admin approves Refund 2 → moves to APPROVED
4. Processing Refund 1 → SUCCESS, payment remains CAPTURED
5. Processing Refund 2 → FAILURE at balance check (only $400 left)

**Note:** Current implementation allows over-submission at PENDING stage. Processing stage handles the race condition via balance validation.

### Case 3: Seller Insufficient Balance

**Scenario:**

```
Payment: $1000 (seller received $950)
Seller withdraws $800 (hypothetically, if withdrawal implemented)
Seller balance: $150
Buyer requests refund: $1000
```

**Flow:**

1. Refund initiated → PENDING
2. Admin approves → APPROVED
3. System processes → Balance check fails
4. Refund → FAILED
5. Error stored: "Insufficient balance in seller wallet. Required: $1000, Available: $150"

**Resolution:** Admin must:

- Contact seller to fund wallet
- OR adjust refund amount to $150
- OR reject refund and handle offline

### Case 4: Payment Fully Refunded Mid-Process

**Scenario:**

```
Payment: $1000
Refund 1: $700 (being processed)
Refund 2: $300 (admin just approved)
```

**Flow:**

1. Refund 1 completes → Payment still CAPTURED ($300 remaining)
2. Refund 2 processes → Payment → REFUNDED (total = $1000)
3. Payment lifecycle updated in Refund 2 processing

**Check:**

```typescript
const totalRefunded = await getTotalRefunded(paymentId);
if (totalRefunded >= payment.amount) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { lifecycle: 'REFUNDED' },
  });
}
```

## Refund History & Tracking

### Query Refunds by Payment

```sql
SELECT
  r.id,
  r.amount,
  r.status,
  r.reason,
  r.requested_at,
  r.requested_by,
  r.approved_at,
  r.approved_by,
  r.completed_at
FROM refunds r
WHERE r.payment_id = :paymentId
ORDER BY r.requested_at DESC;
```

### Calculate Total Refunded

```sql
SELECT
  p.id as payment_id,
  p.amount as payment_amount,
  COALESCE(SUM(r.amount), 0) as total_refunded,
  p.amount - COALESCE(SUM(r.amount), 0) as remaining_refundable
FROM payments p
LEFT JOIN refunds r
  ON r.payment_id = p.id
  AND r.status IN ('COMPLETED')
WHERE p.id = :paymentId
GROUP BY p.id, p.amount;
```

## API Reference

### Initiate Refund

```http
POST /refunds
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "paymentId": "uuid",
  "amount": "500.00",
  "reason": "Product defective",
  "description": "Screen cracked on arrival, unable to use",
  "evidence": [
    "https://s3.amazonaws.com/bucket/photo1.jpg",
    "https://s3.amazonaws.com/bucket/photo2.jpg"
  ],
  "refundPlatformFee": false
}
```

**Response:**

```json
{
  "id": "refund-uuid",
  "paymentId": "payment-uuid",
  "orderId": "order-uuid",
  "amount": "500.00",
  "status": "PENDING",
  "reason": "Product defective",
  "requestedBy": "buyer-uuid",
  "requestedAt": "2026-01-01T10:30:00Z"
}
```

### Approve Refund

```http
POST /refunds/:id/approve
Authorization: Bearer <admin_jwt_token>
```

**Response:**

```json
{
  "id": "refund-uuid",
  "status": "APPROVED",
  "approvedBy": "admin-uuid",
  "approvedAt": "2026-01-01T11:00:00Z"
}
```

### Reject Refund

```http
POST /refunds/:id/reject
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "reason": "Refund policy expired. Order delivered >30 days ago."
}
```

**Response:**

```json
{
  "id": "refund-uuid",
  "status": "REJECTED",
  "rejectedBy": "admin-uuid",
  "rejectedAt": "2026-01-01T11:00:00Z",
  "rejectionReason": "Refund policy expired..."
}
```

### Process Refund

```http
POST /refunds/:id/process
Authorization: Bearer <admin_jwt_token>
```

**Response (Success):**

```json
{
  "id": "refund-uuid",
  "status": "COMPLETED",
  "processedAt": "2026-01-01T11:05:00Z",
  "completedAt": "2026-01-01T11:05:00Z"
}
```

**Response (Failure):**

```json
{
  "id": "refund-uuid",
  "status": "FAILED",
  "failureReason": "Insufficient balance in seller wallet..."
}
```

## Testing Refunds

### Test Case 1: Happy Path

```typescript
// 1. Create and capture payment
const payment = await paymentService.initiatePayment({
  orderId: 'test-order',
  paymentMethod: 'PREPAID',
  amount: new Decimal('1000'),
  payerUserId: buyerId,
  payeeUserId: sellerId,
});

await paymentService.capturePayment({
  paymentId: payment.id,
  gatewayTransactionId: 'test-txn-123',
});

// 2. Initiate refund
const refund = await refundService.initiateRefund({
  paymentId: payment.id,
  amount: new Decimal('1000'),
  reason: 'Test refund',
  requestedBy: buyerId,
});

expect(refund.status).toBe('PENDING');

// 3. Approve refund
const approved = await refundService.approveRefund(refund.id, adminId);
expect(approved.status).toBe('APPROVED');

// 4. Process refund
const completed = await refundService.processRefund(refund.id);
expect(completed.status).toBe('COMPLETED');

// 5. Verify payment fully refunded
const updatedPayment = await prisma.payment.findUnique({
  where: { id: payment.id },
});
expect(updatedPayment.lifecycle).toBe('REFUNDED');
```

### Test Case 2: Insufficient Balance

```typescript
// 1. Create payment and capture
// 2. Drain seller wallet
await prisma.ledgerEntry.create({
  data: {
    walletId: sellerWalletId,
    amount: new Decimal('-10000'), // Drain all funds
    entryType: 'ADJUSTMENT_DEBIT',
    transactionId: 'drain-test',
  },
});

// 3. Try to process refund
await expect(refundService.processRefund(refundId)).rejects.toThrow(/insufficient balance/i);

// 4. Verify refund status
const failedRefund = await prisma.refund.findUnique({
  where: { id: refundId },
});
expect(failedRefund.status).toBe('FAILED');
```

## Limitations & Future Enhancements

### Current Limitations

1. **No automatic approval** - All refunds require manual admin review
2. **No refund deadlines** - No time-based eligibility rules
3. **No partial approval** - Admin cannot reduce requested amount during approval
4. **No batch processing** - Cannot process multiple refunds at once
5. **No refund on failed payments** - Can only refund CAPTURED payments

### Planned Enhancements

- **Automatic approval rules** - Auto-approve refunds under certain conditions
- **Refund policies per seller** - Sellers configure their own refund windows
- **Buyer refund credits** - Issue store credit instead of cash refund
- **Dispute resolution** - Integration with dispute/arbitration workflow

## Related Documentation

- [README.md](./README.md) - Overall architecture
- [LEDGER_RULES.md](./LEDGER_RULES.md) - Ledger invariants
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Handling failed refunds
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
