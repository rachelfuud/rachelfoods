# Refund Flow - Detailed Specification

## Overview

The **Refund Flow** handles the reversal of captured payments when buyers return products, cancel orders after delivery, or encounter issues requiring financial compensation. Refunds create reverse ledger entries to maintain the double-entry bookkeeping invariant.

---

## Key Characteristics

| Characteristic    | Value                                           |
| ----------------- | ----------------------------------------------- |
| **Trigger**       | Buyer request, seller-initiated, admin override |
| **Eligibility**   | Only CAPTURED payments can be refunded          |
| **Timing**        | Within configured window (e.g., 7 days)         |
| **Amount**        | Full or partial (Sprint 6A: full only)          |
| **Platform Fee**  | NOT refunded by default (admin can override)    |
| **Ledger Impact** | Reverse entries created (sum = 0)               |
| **Order Impact**  | Order status → RETURNED/CANCELLED               |

---

## Refund Lifecycle States

```
PENDING → APPROVED → PROCESSING → COMPLETED
   ↓
REJECTED
   ↓
FAILED (can retry)
```

**State Descriptions**:

| State          | Description                       | Action Required   |
| -------------- | --------------------------------- | ----------------- |
| **PENDING**    | Refund requested, awaiting review | Admin review      |
| **APPROVED**   | Admin approved refund             | System processing |
| **REJECTED**   | Admin denied refund               | Notify buyer      |
| **PROCESSING** | System creating ledger entries    | Automatic         |
| **COMPLETED**  | Refund successful, ledger updated | None              |
| **FAILED**     | Processing failed (retryable)     | Manual review     |

---

## Refund Types

### 1. Full Refund (Most Common)

**Scenario**: Buyer returns product, gets full amount back (minus platform fee by default).

**Example**:

- Original payment: ₹1000
- Platform fee: ₹25
- Seller received: ₹975
- **Refund to buyer**: ₹975 (platform keeps ₹25)
- **Debit from seller**: ₹975

**Ledger Entries**:

```typescript
// Entry 1: Debit seller
{ walletId: sellerWallet, amount: -975, entryType: 'REFUND_DEBIT' }

// Entry 2: Credit buyer
{ walletId: buyerWallet, amount: +975, entryType: 'REFUND_CREDIT' }

// Sum: -975 + 975 = 0 ✅
```

### 2. Full Refund with Platform Fee Refund

**Scenario**: Admin decides to refund platform fee as well (goodwill).

**Example**:

- Original payment: ₹1000
- Platform fee: ₹25
- **Refund to buyer**: ₹1000 (full)
- **Debit from seller**: ₹975
- **Debit from platform**: ₹25

**Ledger Entries**:

```typescript
// Entry 1: Debit seller
{ walletId: sellerWallet, amount: -975, entryType: 'REFUND_DEBIT' }

// Entry 2: Debit platform (refund fee)
{ walletId: platformWallet, amount: -25, entryType: 'PLATFORM_FEE_DEBIT' }

// Entry 3: Credit buyer
{ walletId: buyerWallet, amount: +1000, entryType: 'REFUND_CREDIT' }

// Sum: -975 + (-25) + 1000 = 0 ✅
```

### 3. Partial Refund (Future - Not in Sprint 6A)

**Scenario**: Product partially damaged, buyer gets 50% refund.

**Example**:

- Original payment: ₹1000
- Refund amount: ₹500
- Seller keeps: ₹475 (975 - 500)

**Note**: Sprint 6A does NOT support partial refunds.

---

## Step-by-Step Flow

### Phase 1: Refund Initiation

**Actors**: Buyer, Seller, Admin

**Steps**:

1. **Buyer submits refund request**

   ```typescript
   const refund = await refundService.initiateRefund({
     orderId: order.id,
     reason: 'Product arrived damaged',
     description: 'Package was torn, food container broken',
     evidence: ['photo1.jpg', 'photo2.jpg'], // Optional
   });
   ```

2. **System validates refund eligibility**

   ```typescript
   // Check payment exists and is captured
   const payment = await prisma.payment.findUnique({
     where: { orderId: order.id },
   });

   if (!payment || payment.lifecycle !== PaymentLifecycle.CAPTURED) {
     throw new BadRequestException('Payment not captured - cannot refund');
   }

   // Check refund window
   const daysSinceDelivery = daysBetween(order.deliveredAt, new Date());

   const refundWindow = await getRefundWindow(order.productCategory);

   if (daysSinceDelivery > refundWindow) {
     throw new BadRequestException(`Refund window expired (${refundWindow} days)`);
   }

   // Check no existing refund
   const existingRefund = await prisma.refund.findFirst({
     where: {
       paymentId: payment.id,
       status: { not: RefundStatus.REJECTED },
     },
   });

   if (existingRefund) {
     throw new BadRequestException('Refund already exists for this payment');
   }
   ```

3. **System creates Refund record**

   ```typescript
   const refund = await prisma.refund.create({
     data: {
       paymentId: payment.id,
       orderId: order.id,
       amount: payment.amount, // Full refund
       reason: dto.reason,
       description: dto.description,
       evidence: dto.evidence,
       status: RefundStatus.PENDING,
       requestedBy: currentUser.id,
       requestedAt: new Date(),

       // Wallet references
       issuerWalletId: payment.payeeWalletId, // Seller wallet
       recipientWalletId: payment.payerWalletId, // Buyer wallet

       // Platform fee refund decision (admin sets later)
       refundPlatformFee: false, // Default: keep fee
     },
   });
   ```

4. **System sends notification to seller**

   ```typescript
   await notificationService.send({
     userId: seller.id,
     type: 'REFUND_REQUESTED',
     message: `Refund requested for order ${order.orderNumber}`,
     actionUrl: `/orders/${order.id}/refund/${refund.id}`,
   });
   ```

5. **System sends notification to admin** (if manual review required)
   ```typescript
   await notificationService.send({
     role: 'ADMIN',
     type: 'REFUND_REVIEW_REQUIRED',
     message: `Refund review needed for order ${order.orderNumber}`,
     actionUrl: `/admin/refunds/${refund.id}`,
   });
   ```

**Result**:

- ✅ Refund created with status = PENDING
- ✅ Notifications sent to seller and admin
- ✅ Refund amount = original payment amount (default)
- ⏳ Awaiting admin review

---

### Phase 2: Admin Review & Approval

**Actors**: Admin

**Steps**:

1. **Admin reviews refund request**

   ```typescript
   const refund = await refundService.getRefundDetails(refundId);

   // Admin sees:
   // - Order details
   // - Payment history
   // - Buyer's reason and evidence
   // - Seller's response (if any)
   // - Ledger audit trail
   ```

2. **Admin decides on platform fee refund**

   ```typescript
   // If admin wants to refund platform fee as well
   await refundService.updateRefund(refundId, {
     refundPlatformFee: true, // Override default
   });
   ```

3. **Admin approves refund**

   ```typescript
   const approvedRefund = await refundService.approveRefund({
     refundId: refund.id,
     approvedBy: admin.id,
     approvalNotes: 'Valid return - product quality issue',
   });
   ```

   **Or rejects refund**:

   ```typescript
   const rejectedRefund = await refundService.rejectRefund({
     refundId: refund.id,
     rejectedBy: admin.id,
     rejectionReason: 'Return window expired',
   });
   ```

4. **System updates refund status**: PENDING → APPROVED

   ```typescript
   await prisma.refund.update({
     where: { id: refund.id },
     data: {
       status: RefundStatus.APPROVED,
       approvedBy: admin.id,
       approvedAt: new Date(),
     },
   });
   ```

5. **System sends notification to buyer**
   ```typescript
   await notificationService.send({
     userId: buyer.id,
     type: 'REFUND_APPROVED',
     message: `Your refund for order ${order.orderNumber} has been approved`,
   });
   ```

**Result**:

- ✅ Refund status = APPROVED (or REJECTED)
- ✅ `refundPlatformFee` flag set (true/false)
- ✅ Admin notes recorded
- ⏳ Ready for processing

---

### Phase 3: Refund Processing

**Actors**: System (Automated)

**Steps**:

1. **System initiates refund processing**

   ```typescript
   await refundService.processRefund(refundId);
   ```

2. **System updates refund status**: APPROVED → PROCESSING

   ```typescript
   await prisma.refund.update({
     where: { id: refund.id },
     data: {
       status: RefundStatus.PROCESSING,
       processedAt: new Date(),
     },
   });
   ```

3. **System validates wallet balances**

   ```typescript
   // Check seller has sufficient balance
   const sellerBalance = await walletService.getBalance(refund.issuerWalletId);

   const refundAmount = refund.refundPlatformFee
     ? refund.amount // Full refund (including fee)
     : refund.amount.minus(payment.platformFeeAmount); // Partial (no fee)

   // If seller balance insufficient, may need to debit from platform
   if (sellerBalance.lt(refundAmount)) {
     await this.handleInsufficientSellerBalance(refund);
   }
   ```

4. **System creates reverse ledger entries**

   **Scenario A: Platform keeps fee (default)**

   ```typescript
   const transactionId = `refund-${refund.id}-${Date.now()}`;

   // Entry 1: Debit seller wallet
   await prisma.ledgerEntry.create({
     data: {
       walletId: refund.issuerWalletId, // Seller
       amount: payment.amount.minus(payment.platformFeeAmount).neg(),
       entryType: LedgerEntryType.REFUND_DEBIT,
       description: `Refund for order ${order.orderNumber}`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-seller-debit`,
     },
   });

   // Entry 2: Credit buyer wallet
   await prisma.ledgerEntry.create({
     data: {
       walletId: refund.recipientWalletId, // Buyer
       amount: payment.amount.minus(payment.platformFeeAmount),
       entryType: LedgerEntryType.REFUND_CREDIT,
       description: `Refund for order ${order.orderNumber} (platform fee retained)`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-buyer-credit`,
     },
   });

   // Verification: -975 + 975 = 0 ✅
   await ledgerService.verifyTransactionBalance(transactionId);
   ```

   **Scenario B: Platform refunds fee**

   ```typescript
   const transactionId = `refund-${refund.id}-${Date.now()}`;

   // Entry 1: Debit seller wallet
   await prisma.ledgerEntry.create({
     data: {
       walletId: refund.issuerWalletId, // Seller
       amount: payment.amount.minus(payment.platformFeeAmount).neg(),
       entryType: LedgerEntryType.REFUND_DEBIT,
       description: `Refund for order ${order.orderNumber}`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-seller-debit`,
     },
   });

   // Entry 2: Debit platform wallet (refund fee)
   const platformWallet = await walletService.getPlatformWallet();
   await prisma.ledgerEntry.create({
     data: {
       walletId: platformWallet.id,
       amount: payment.platformFeeAmount.neg(),
       entryType: LedgerEntryType.PLATFORM_FEE_DEBIT,
       description: `Platform fee refund for order ${order.orderNumber}`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-platform-debit`,
     },
   });

   // Entry 3: Credit buyer wallet (full amount)
   await prisma.ledgerEntry.create({
     data: {
       walletId: refund.recipientWalletId, // Buyer
       amount: payment.amount, // Full refund
       entryType: LedgerEntryType.REFUND_CREDIT,
       description: `Full refund for order ${order.orderNumber}`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-buyer-credit`,
     },
   });

   // Verification: -975 + (-25) + 1000 = 0 ✅
   await ledgerService.verifyTransactionBalance(transactionId);
   ```

5. **System updates Payment lifecycle**: CAPTURED → REFUNDED

   ```typescript
   await prisma.payment.update({
     where: { id: payment.id },
     data: { lifecycle: PaymentLifecycle.REFUNDED },
   });
   ```

6. **System updates Refund status**: PROCESSING → COMPLETED

   ```typescript
   await prisma.refund.update({
     where: { id: refund.id },
     data: {
       status: RefundStatus.COMPLETED,
       completedAt: new Date(),
     },
   });
   ```

7. **System updates Order status**: DELIVERED → RETURNED

   ```typescript
   await orderService.updateOrderStatus(order.id, OrderStatus.RETURNED);
   ```

8. **System sends notifications**

   ```typescript
   // Notify buyer
   await notificationService.send({
     userId: buyer.id,
     type: 'REFUND_COMPLETED',
     message: `Refund of ₹${refundAmount} completed for order ${order.orderNumber}`,
   });

   // Notify seller
   await notificationService.send({
     userId: seller.id,
     type: 'REFUND_COMPLETED',
     message: `Refund processed for order ${order.orderNumber}. ₹${refundAmount} debited.`,
   });
   ```

**Result**:

- ✅ Refund status = COMPLETED
- ✅ Ledger entries created (2 or 3 entries, sum = 0)
- ✅ Payment lifecycle = REFUNDED
- ✅ Order status = RETURNED
- ✅ Wallet balances updated (ledger-derived)
- ✅ Notifications sent

---

### Phase 4: Refund Rejection

**Actors**: Admin

**Steps**:

1. **Admin rejects refund request**

   ```typescript
   await refundService.rejectRefund({
     refundId: refund.id,
     rejectedBy: admin.id,
     rejectionReason: 'Return window expired (14 days)',
   });
   ```

2. **System updates refund status**: PENDING → REJECTED

   ```typescript
   await prisma.refund.update({
     where: { id: refund.id },
     data: {
       status: RefundStatus.REJECTED,
       rejectedBy: admin.id,
       rejectedAt: new Date(),
       rejectionReason: dto.rejectionReason,
     },
   });
   ```

3. **System sends notification to buyer**
   ```typescript
   await notificationService.send({
     userId: buyer.id,
     type: 'REFUND_REJECTED',
     message: `Your refund request for order ${order.orderNumber} was rejected: ${dto.rejectionReason}`,
   });
   ```

**Result**:

- ✅ Refund status = REJECTED
- ✅ Rejection reason recorded
- ✅ No ledger entries created
- ✅ Payment remains CAPTURED
- ✅ Order status unchanged

---

### Phase 5: Refund Failure (Retry)

**Actors**: System, Admin

**Steps**:

1. **Processing fails** (e.g., database error, ledger invariant violation)

   ```typescript
   try {
     await this.createLedgerEntries(refund);
   } catch (error) {
     await prisma.refund.update({
       where: { id: refund.id },
       data: {
         status: RefundStatus.FAILED,
         failureReason: error.message,
       },
     });

     throw error;
   }
   ```

2. **System alerts admin**

   ```typescript
   await alertService.notify({
     type: 'REFUND_PROCESSING_FAILED',
     refundId: refund.id,
     error: error.message,
     severity: 'HIGH',
   });
   ```

3. **Admin investigates and retries**
   ```typescript
   // Admin checks logs, fixes issue (if any)
   await refundService.retryRefund(refundId);
   ```

**Result**:

- ⚠️ Refund status = FAILED
- ⚠️ Failure reason recorded
- ⏳ Awaiting manual intervention
- 🔄 Can be retried after fix

---

## Data Model

### Refund Model

```prisma
model Refund {
  id          String       @id @default(uuid())

  // Payment reference
  paymentId   String
  payment     Payment      @relation(fields: [paymentId], references: [id])

  orderId     String
  order       Order        @relation(fields: [orderId], references: [id])

  // Refund details
  amount      Decimal      @db.Decimal(15, 2) // Refund amount
  reason      String       // Refund reason (enum or free text)
  description String?      // Detailed explanation
  evidence    String[]     // Photos, documents (URLs)

  // Refund status
  status      RefundStatus @default(PENDING)

  // Platform fee handling
  refundPlatformFee Boolean @default(false) // If true, platform refunds fee too

  // Wallet references
  issuerWalletId    String  // Who pays refund (usually seller)
  issuerWallet      Wallet  @relation("RefundIssuerWallet", fields: [issuerWalletId], references: [id])

  recipientWalletId String  // Who receives refund (usually buyer)
  recipientWallet   Wallet  @relation("RefundRecipientWallet", fields: [recipientWalletId], references: [id])

  // Approval workflow
  requestedBy  String      // Buyer user ID
  requestedAt  DateTime    @default(now())

  approvedBy   String?     // Admin user ID
  approvedAt   DateTime?

  rejectedBy   String?     // Admin user ID
  rejectedAt   DateTime?
  rejectionReason String?

  // Processing
  processedAt  DateTime?   // When processing started
  completedAt  DateTime?   // When refund completed
  failureReason String?    // If status = FAILED

  // Relations
  ledgerEntries LedgerEntry[]

  // Audit
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([paymentId])
  @@index([orderId])
  @@index([status])
  @@index([requestedBy])
  @@map("refunds")
}

enum RefundStatus {
  PENDING    // Awaiting admin review
  APPROVED   // Admin approved, ready to process
  REJECTED   // Admin denied refund
  PROCESSING // Creating ledger entries
  COMPLETED  // Refund successful
  FAILED     // Processing failed (can retry)
}
```

---

## Business Rules

### 1. Refund Eligibility

**Payment Status**:

- ✅ Payment lifecycle = CAPTURED
- ❌ Payment lifecycle = INITIATED (cancel instead)
- ❌ Payment lifecycle = REFUNDED (already refunded)

**Time Window**:

- Configurable per category/seller (default: 7 days)
- Clock starts from delivery confirmation
- Window can be extended by admin

**Order Status**:

- ✅ Order status = DELIVERED
- ❌ Order status = CANCELLED (already handled)
- ❌ Order status = RETURNED (refund in progress)

### 2. Platform Fee Refund Policy

**Default**: Platform **KEEPS** fee (not refunded)

**Rationale**:

- Platform provided service (listing, transaction)
- Encourages quality (sellers reduce returns)
- Covers operational costs

**Admin Override**:

- Can enable `refundPlatformFee = true`
- Use for goodwill, platform errors, quality issues
- Logged and audited

### 3. Refund Amount Calculation

**Sprint 6A**: Only FULL refunds supported

```typescript
// Without platform fee refund (default)
const refundAmount = payment.amount.minus(payment.platformFeeAmount);

// With platform fee refund (admin override)
const refundAmount = payment.amount; // Full amount
```

**Future (Partial Refunds)**:

```typescript
// Example: 50% refund
const refundAmount = payment.amount.times(0.5);
```

### 4. Multiple Refunds

**Sprint 6A**: One refund per payment (no partial refunds)

```typescript
// Check no existing refund
const existingRefund = await prisma.refund.findFirst({
  where: {
    paymentId: payment.id,
    status: { not: RefundStatus.REJECTED },
  },
});

if (existingRefund) {
  throw new BadRequestException('Refund already exists');
}
```

**Future**: Support multiple partial refunds (sum ≤ original amount)

---

## Integration Points

### 1. Order Module

```typescript
// OrderService calls RefundService
async handleOrderReturn(orderId: string): Promise<void> {
  const order = await this.getOrder(orderId);

  // Initiate automatic refund
  await refundService.initiateRefund({
    orderId: order.id,
    reason: 'Customer return',
  });
}
```

### 2. Payment Module

```typescript
// RefundService updates PaymentService
async processRefund(refundId: string): Promise<void> {
  // ... create ledger entries ...

  // Update payment lifecycle
  await paymentService.updatePaymentLifecycle(
    refund.paymentId,
    PaymentLifecycle.REFUNDED,
  );
}
```

### 3. Notification Module

```typescript
// Send refund status updates
await notificationService.send({
  userId: buyer.id,
  type: 'REFUND_STATUS_CHANGED',
  message: `Refund status: ${refund.status}`,
});
```

### 4. Wallet Module

```typescript
// RefundService uses WalletService for balance checks
const sellerBalance = await walletService.getBalance(refund.issuerWalletId);

if (sellerBalance.lt(refundAmount)) {
  throw new BadRequestException('Insufficient seller balance');
}
```

---

## RBAC Permissions

### Buyer Permissions

- ✅ Initiate refund (for own orders)
- ✅ View refund status
- ✅ Provide evidence (photos, description)
- ❌ Approve refund (admin only)

### Seller Permissions

- ✅ View refund requests (for own orders)
- ✅ Respond to refund request
- ⚠️ Cannot approve/reject (admin only)
- ⚠️ Cannot prevent refund (admin decision)

### Admin Permissions

- ✅ View all refunds
- ✅ Approve refund
- ✅ Reject refund
- ✅ Override platform fee refund policy
- ✅ Retry failed refunds
- ✅ View full ledger audit trail

### Delivery Agent Permissions

- ❌ No refund permissions (order-level only)

---

## Error Scenarios

### 1. Insufficient Seller Balance

**Scenario**: Seller balance < refund amount (seller withdrew funds)

**Handling**:

```typescript
const sellerBalance = await walletService.getBalance(sellerWallet.id);

if (sellerBalance.lt(refundAmount)) {
  // Option A: Debit from platform (absorb cost)
  await this.debitFromPlatformWallet(refundAmount.minus(sellerBalance));

  // Option B: Suspend seller account
  await sellerService.suspendSeller(seller.id, 'Insufficient refund balance');

  // Option C: Fail refund (require seller to deposit)
  throw new BadRequestException('Seller has insufficient balance for refund');
}
```

### 2. Duplicate Refund Request

**Scenario**: Buyer submits refund twice for same order

**Handling**:

```typescript
const existingRefund = await prisma.refund.findFirst({
  where: {
    paymentId: payment.id,
    status: { not: RefundStatus.REJECTED },
  },
});

if (existingRefund) {
  throw new ConflictException('Refund already exists for this payment');
}
```

### 3. Refund After Window Expiry

**Scenario**: Buyer requests refund 30 days after delivery (window = 7 days)

**Handling**:

```typescript
const daysSinceDelivery = daysBetween(order.deliveredAt, new Date());

if (daysSinceDelivery > REFUND_WINDOW_DAYS) {
  throw new BadRequestException(`Refund window expired (${REFUND_WINDOW_DAYS} days)`);
}
```

**Admin Override**:

```typescript
// Admin can bypass window check
if (currentUser.role === 'ADMIN') {
  // Allow refund even after expiry
}
```

### 4. Ledger Invariant Violation

**Scenario**: Ledger entries don't sum to 0 (bug)

**Handling**:

```typescript
const sum = entries.reduce((acc, e) => acc.add(e.amount), new Decimal(0));

if (!sum.equals(0)) {
  // Roll back transaction
  await prisma.$rollback();

  // Alert admin
  await alertService.notify({
    type: 'LEDGER_INVARIANT_VIOLATION',
    refundId: refund.id,
    sum: sum.toString(),
  });

  throw new Error(`Ledger invariant violated: sum = ${sum}`);
}
```

---

## Query Patterns

### Get Refunds by Status

```typescript
const pendingRefunds = await prisma.refund.findMany({
  where: { status: RefundStatus.PENDING },
  include: {
    order: { select: { orderNumber: true } },
    payment: { select: { amount: true } },
  },
  orderBy: { requestedAt: 'asc' },
});
```

### Get Refunds for Order

```typescript
const orderRefunds = await prisma.refund.findMany({
  where: { orderId: order.id },
  include: { payment: true },
  orderBy: { createdAt: 'desc' },
});
```

### Get Buyer's Refund History

```typescript
const buyerRefunds = await prisma.refund.findMany({
  where: { requestedBy: buyer.id },
  include: {
    order: { select: { orderNumber: true } },
    payment: { select: { amount: true } },
  },
  orderBy: { requestedAt: 'desc' },
});
```

### Get Refunds Requiring Admin Review

```typescript
const reviewQueue = await prisma.refund.findMany({
  where: {
    status: RefundStatus.PENDING,
    requestedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // > 24h old
  },
  include: {
    order: true,
    payment: true,
  },
  orderBy: { requestedAt: 'asc' },
});
```

---

## Testing Scenarios

### Happy Path (Default Fee Policy)

1. Buyer requests refund → Refund PENDING
2. Admin approves → Refund APPROVED
3. System processes → Ledger entries created (2 entries)
4. Refund status → COMPLETED
5. Payment lifecycle → REFUNDED
6. Order status → RETURNED
7. Buyer balance increases by ₹975
8. Seller balance decreases by ₹975
9. Platform keeps ₹25 fee

### Happy Path (Fee Refund)

1. Buyer requests refund → Refund PENDING
2. Admin approves with `refundPlatformFee = true`
3. System processes → Ledger entries created (3 entries)
4. Buyer balance increases by ₹1000 (full)
5. Seller balance decreases by ₹975
6. Platform balance decreases by ₹25

### Rejection Path

1. Buyer requests refund → Refund PENDING
2. Admin rejects → Refund REJECTED
3. No ledger entries created
4. Payment remains CAPTURED
5. Order status unchanged

### Edge Cases

- Insufficient seller balance
- Duplicate refund request
- Refund after window expiry (admin override)
- Concurrent refund attempts (idempotency)
- Failed processing (retry)

---

## Performance Considerations

### Database Indexes

```prisma
@@index([paymentId])  // Fast payment → refund lookup
@@index([orderId])    // Fast order → refund lookup
@@index([status])     // Filter by refund status
@@index([requestedBy]) // User refund history
```

### Caching

```typescript
// Cache refund window per category
const refundWindow = await redis.get(`refund-window:${categoryId}`);

// Cache platform fee policy
const feePolicy = await redis.get('platform-fee-policy');
```

### Batch Processing

```typescript
// Process multiple refunds in batch (nightly job)
async function processPendingRefunds() {
  const refunds = await prisma.refund.findMany({
    where: { status: RefundStatus.APPROVED },
    take: 100, // Batch size
  });

  for (const refund of refunds) {
    await refundService.processRefund(refund.id);
  }
}
```

---

## Monitoring & Alerts

### Key Metrics

- **Refund Rate**: % of orders with refunds
- **Avg Approval Time**: Time from PENDING to APPROVED
- **Platform Fee Refund Rate**: % of refunds where platform refunds fee
- **Failed Refund Count**: Refunds in FAILED status

### Alerts

```typescript
// Alert on high refund rate
if (refundRate > 0.1) {
  // 10%
  await alertService.notify({
    type: 'HIGH_REFUND_RATE',
    rate: refundRate,
  });
}

// Alert on old pending refunds
const oldRefunds = await prisma.refund.count({
  where: {
    status: RefundStatus.PENDING,
    requestedAt: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  },
});

if (oldRefunds > 0) {
  await alertService.notify({
    type: 'OLD_PENDING_REFUNDS',
    count: oldRefunds,
  });
}
```

---

## Future Enhancements (Phase 2)

### Partial Refunds

- Support refunding part of order (e.g., 1 of 3 items)
- Multiple refunds per payment
- Track remaining refundable amount

### Automatic Refund Approval

- Auto-approve for small amounts (< ₹100)
- Auto-approve based on seller rating
- ML-based fraud detection

### Refund to Original Payment Method

- Refund to buyer's card/UPI (not wallet)
- Integrate with payment gateway refund API
- Support external refunds

### Buyer-Initiated Partial Returns

- Return only damaged items
- Refund proportional to returned items
- Complex ledger entries (multiple products)

---

**Last Updated**: January 1, 2026  
**Flow Version**: Sprint 6A  
**Critical**: Platform fee NOT refunded by default
