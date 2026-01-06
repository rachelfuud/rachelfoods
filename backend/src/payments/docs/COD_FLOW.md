# COD (Cash on Delivery) Payment Flow - Detailed Specification

## Overview

The **Cash on Delivery (COD)** flow enables buyers to pay in cash upon receiving their order. Unlike PREPAID payments, COD payments are **NOT captured immediately** at checkout. Instead, payment capture occurs AFTER the delivery agent physically collects cash and confirms receipt.

---

## Key Characteristics

| Characteristic            | COD                         | PREPAID                  |
| ------------------------- | --------------------------- | ------------------------ |
| **Payment Method**        | Cash at delivery            | Online (card/UPI/wallet) |
| **Capture Timing**        | After delivery confirmation | At checkout              |
| **Confirmation Required** | Delivery agent              | Payment gateway          |
| **Refund Complexity**     | Lower (not yet captured)    | Higher (reverse payment) |
| **Buyer Risk**            | Low (inspect before paying) | Higher (paid upfront)    |
| **Seller Risk**           | Higher (order rejection)    | Lower (payment secured)  |
| **Platform Fee**          | Deducted after capture      | Deducted at capture      |

---

## Payment Lifecycle States

COD payments follow this lifecycle:

```
INITIATED → (delivery) → CAPTURED → (refund) → REFUNDED
    ↓
CANCELLED (if order cancelled before delivery)
```

**State Descriptions**:

| State         | Description                        | Order Status       | Wallet Debited?     |
| ------------- | ---------------------------------- | ------------------ | ------------------- |
| **INITIATED** | Payment created, awaiting delivery | CONFIRMED/SHIPPED  | No                  |
| **CAPTURED**  | Cash collected, payment recorded   | DELIVERED          | Yes                 |
| **REFUNDED**  | Payment reversed (partial/full)    | CANCELLED/RETURNED | Reversed            |
| **CANCELLED** | Payment cancelled before capture   | CANCELLED          | No (never captured) |

---

## Step-by-Step Flow

### Phase 1: Order Creation & Payment Initiation

**Actors**: Buyer, System

**Steps**:

1. **Buyer submits order** with `paymentMethod = COD`

   ```typescript
   const orderData = {
     items: [...],
     deliveryAddress: {...},
     paymentMethod: 'COD', // Key indicator
   };
   ```

2. **System validates COD eligibility**

   ```typescript
   // Check if COD is allowed
   if (!product.allowCOD) {
     throw new BadRequestException('COD not available for this product');
   }

   // Check delivery area supports COD
   if (!shippingProvider.supportsCOD(deliveryAddress)) {
     throw new BadRequestException('COD not available in this area');
   }
   ```

3. **System creates Order** with status = PENDING

   ```typescript
   const order = await prisma.order.create({
     data: {
       orderNumber: generateOrderNumber(),
       userId: buyer.id,
       items: { create: items },
       totalAmount: calculateTotal(items),
       paymentMethod: 'COD',
       orderStatus: OrderStatus.PENDING,
     },
   });
   ```

4. **System creates Payment** with lifecycle = INITIATED

   ```typescript
   const payment = await prisma.payment.create({
     data: {
       orderId: order.id,
       amount: order.totalAmount,
       paymentMethod: 'COD',
       lifecycle: PaymentLifecycle.INITIATED,
       payerWalletId: buyerWallet.id,
       payeeWalletId: sellerWallet.id,

       // COD-specific fields (null initially)
       confirmedBy: null, // Set later by delivery agent
       confirmedAt: null,
     },
   });
   ```

5. **System calculates platform fee** (stored, not yet deducted)

   ```typescript
   const feeConfig = await platformFeeService.calculateFee({
     orderAmount: order.totalAmount,
     productCategory: product.categoryId,
     sellerId: seller.id,
   });

   await prisma.payment.update({
     where: { id: payment.id },
     data: {
       platformFeeAmount: feeConfig.amount,
       platformFeePercent: feeConfig.percent,
     },
   });
   ```

6. **Order status changes**: PENDING → CONFIRMED
   ```typescript
   await orderService.confirmOrder(order.id);
   ```

**Result**:

- ✅ Order created with `orderStatus = CONFIRMED`
- ✅ Payment created with `lifecycle = INITIATED`
- ✅ Platform fee calculated (not yet deducted)
- ✅ No ledger entries yet (payment not captured)

---

### Phase 2: Order Processing & Shipment

**Actors**: Seller, Shipping Provider, Delivery Agent

**Steps**:

1. **Seller confirms order** (kitchen prepares food)

   ```typescript
   await orderService.updateOrderStatus(order.id, OrderStatus.CONFIRMED);
   ```

2. **Seller marks order as SHIPPED**

   ```typescript
   await orderService.updateOrderStatus(order.id, OrderStatus.SHIPPED);
   ```

3. **System assigns delivery agent**

   ```typescript
   const assignment = await shippingService.assignDeliveryAgent({
     orderId: order.id,
     shippingProvider: order.shippingProvider,
     deliveryAddress: order.deliveryAddress,
   });
   ```

4. **Delivery agent picks up order**

   ```typescript
   await shippingService.updateShippingStatus(assignment.id, ShippingStatus.PICKED_UP);
   ```

5. **Delivery agent delivers order**
   - Agent travels to delivery address
   - Agent hands over order to buyer
   - **Buyer inspects order** (critical for COD)
   - **Buyer pays cash** (physical transaction)

**Result**:

- ✅ Order physically delivered to buyer
- ✅ Cash collected by delivery agent
- ⏳ Payment NOT yet captured (agent must confirm)

---

### Phase 3: Payment Capture (Critical Step)

**Actors**: Delivery Agent, System

**Steps**:

1. **Delivery agent confirms cash collection** via mobile app

   ```typescript
   // Agent clicks "Cash Collected" button
   await shippingService.confirmCashCollection({
     assignmentId: assignment.id,
     orderId: order.id,
     amountCollected: order.totalAmount,
     collectionProof: photoUrl, // Optional
   });
   ```

2. **System validates confirmation**

   ```typescript
   // Check agent is authorized
   if (assignment.deliveryAgentId !== currentAgent.id) {
     throw new ForbiddenException('Not assigned to this order');
   }

   // Check order status
   if (order.orderStatus !== OrderStatus.SHIPPED) {
     throw new BadRequestException('Order not in SHIPPED status');
   }

   // Check payment status
   if (payment.lifecycle !== PaymentLifecycle.INITIATED) {
     throw new BadRequestException('Payment already captured or cancelled');
   }
   ```

3. **System captures payment** (PaymentService.capturePayment)

   ```typescript
   const capturedPayment = await paymentService.capturePayment({
     paymentId: payment.id,
     confirmedBy: deliveryAgent.id,
     confirmedAt: new Date(),
   });
   ```

4. **System creates ledger entries** (inside capturePayment)

   ```typescript
   const transactionId = `cod-capture-${payment.id}-${Date.now()}`;

   // Entry 1: Debit buyer wallet (virtual, for consistency)
   await prisma.ledgerEntry.create({
     data: {
       walletId: payment.payerWalletId,
       amount: payment.amount.neg(), // Negative (debit)
       entryType: LedgerEntryType.PAYMENT_DEBIT,
       description: `COD payment for order ${order.orderNumber}`,
       transactionId,
       paymentId: payment.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-buyer-debit`,
     },
   });

   // Entry 2: Credit seller wallet (after platform fee)
   const sellerAmount = payment.amount.minus(payment.platformFeeAmount);
   await prisma.ledgerEntry.create({
     data: {
       walletId: payment.payeeWalletId,
       amount: sellerAmount, // Positive (credit)
       entryType: LedgerEntryType.PAYMENT_CREDIT,
       description: `COD payment for order ${order.orderNumber}`,
       transactionId,
       paymentId: payment.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-seller-credit`,
     },
   });

   // Entry 3: Credit platform wallet (platform fee)
   const platformWallet = await walletService.getPlatformWallet();
   await prisma.ledgerEntry.create({
     data: {
       walletId: platformWallet.id,
       amount: payment.platformFeeAmount, // Positive (credit)
       entryType: LedgerEntryType.PLATFORM_FEE_CREDIT,
       description: `Platform fee for order ${order.orderNumber}`,
       transactionId,
       paymentId: payment.id,
       orderId: order.id,
       idempotencyKey: `${transactionId}-platform-fee`,
     },
   });

   // Verify invariant: sum = 0
   // -1000 + 975 + 25 = 0 ✅
   await ledgerService.verifyTransactionBalance(transactionId);
   ```

5. **System updates payment status**

   ```typescript
   await prisma.payment.update({
     where: { id: payment.id },
     data: {
       lifecycle: PaymentLifecycle.CAPTURED,
       confirmedBy: deliveryAgent.id,
       confirmedAt: new Date(),
       capturedAt: new Date(),
     },
   });
   ```

6. **System updates order status**: SHIPPED → DELIVERED

   ```typescript
   await orderService.updateOrderStatus(order.id, OrderStatus.DELIVERED);
   ```

7. **System updates shipping assignment**

   ```typescript
   await shippingService.updateShippingStatus(assignment.id, ShippingStatus.DELIVERED);
   ```

8. **System sends notifications**

   ```typescript
   // Notify buyer
   await notificationService.send({
     userId: buyer.id,
     type: 'ORDER_DELIVERED',
     message: `Your order ${order.orderNumber} has been delivered!`,
   });

   // Notify seller
   await notificationService.send({
     userId: seller.id,
     type: 'ORDER_COMPLETED',
     message: `Order ${order.orderNumber} completed. ₹${sellerAmount} credited.`,
   });
   ```

**Result**:

- ✅ Payment captured with `lifecycle = CAPTURED`
- ✅ Ledger entries created (3 entries, sum = 0)
- ✅ Buyer wallet debited (virtual)
- ✅ Seller wallet credited (after fee)
- ✅ Platform wallet credited (fee)
- ✅ Order status = DELIVERED
- ✅ Shipping status = DELIVERED

---

### Phase 4: Order Cancellation (Before Delivery)

**Actors**: Buyer, Seller, Admin, System

**Scenario**: Order cancelled BEFORE delivery agent confirms cash collection.

**Steps**:

1. **Cancellation trigger** (buyer/seller/admin)

   ```typescript
   await orderService.cancelOrder({
     orderId: order.id,
     reason: 'Buyer requested cancellation',
     cancelledBy: buyer.id,
   });
   ```

2. **System validates cancellation**

   ```typescript
   // Check payment status
   if (payment.lifecycle === PaymentLifecycle.CAPTURED) {
     throw new BadRequestException('Payment already captured - use refund flow');
   }

   // Check order status
   if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.orderStatus)) {
     throw new BadRequestException('Order cannot be cancelled');
   }
   ```

3. **System updates payment status**: INITIATED → CANCELLED

   ```typescript
   await prisma.payment.update({
     where: { id: payment.id },
     data: { lifecycle: PaymentLifecycle.CANCELLED },
   });
   ```

4. **System updates order status**: \* → CANCELLED

   ```typescript
   await orderService.updateOrderStatus(order.id, OrderStatus.CANCELLED);
   ```

5. **System sends notifications**
   ```typescript
   await notificationService.send({
     userId: buyer.id,
     type: 'ORDER_CANCELLED',
     message: `Order ${order.orderNumber} has been cancelled.`,
   });
   ```

**Result**:

- ✅ Payment lifecycle = CANCELLED
- ✅ Order status = CANCELLED
- ✅ NO ledger entries (payment never captured)
- ✅ NO refund needed (money never collected)

---

### Phase 5: Refund (After Delivery)

**Actors**: Buyer, Seller, Admin, System

**Scenario**: Order delivered, payment captured, but buyer returns order or requests refund.

**Steps**:

1. **Refund request initiated**

   ```typescript
   const refund = await refundService.initiateRefund({
     orderId: order.id,
     paymentId: payment.id,
     reason: 'Product damaged',
     requestedBy: buyer.id,
   });
   ```

2. **System validates refund**

   ```typescript
   // Check payment is captured
   if (payment.lifecycle !== PaymentLifecycle.CAPTURED) {
     throw new BadRequestException('Payment not captured - cannot refund');
   }

   // Check refund eligibility
   const daysSinceDelivery = daysBetween(payment.capturedAt, new Date());
   if (daysSinceDelivery > 7) {
     throw new BadRequestException('Refund window expired (7 days)');
   }
   ```

3. **Admin reviews and approves** (optional workflow)

   ```typescript
   await refundService.approveRefund({
     refundId: refund.id,
     approvedBy: admin.id,
   });
   ```

4. **System processes refund**

   ```typescript
   await refundService.processRefund({
     refundId: refund.id,
     refundPlatformFee: false, // Platform keeps fee by default
   });
   ```

5. **System creates reverse ledger entries**

   ```typescript
   const transactionId = `cod-refund-${refund.id}-${Date.now()}`;

   // Entry 1: Debit seller wallet (refund amount)
   await prisma.ledgerEntry.create({
     data: {
       walletId: payment.payeeWalletId,
       amount: payment.amount.minus(payment.platformFeeAmount).neg(),
       entryType: LedgerEntryType.REFUND_DEBIT,
       description: `Refund for order ${order.orderNumber}`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
     },
   });

   // Entry 2: Credit buyer wallet (refund amount)
   await prisma.ledgerEntry.create({
     data: {
       walletId: payment.payerWalletId,
       amount: payment.amount, // Full amount (if fee not refunded)
       entryType: LedgerEntryType.REFUND_CREDIT,
       description: `Refund for order ${order.orderNumber}`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
     },
   });

   // Note: Platform keeps fee (no entry for platform)
   // Invariant: -975 + 1000 ≠ 0 ❌
   // Wait... this violates the invariant!

   // CORRECTION: If platform keeps fee, buyer gets partial refund
   // Entry 2 (corrected): Credit buyer partial amount
   const refundAmount = payment.amount.minus(payment.platformFeeAmount);
   await prisma.ledgerEntry.create({
     data: {
       walletId: payment.payerWalletId,
       amount: refundAmount, // 975 (not 1000)
       entryType: LedgerEntryType.REFUND_CREDIT,
       description: `Refund for order ${order.orderNumber} (platform fee retained)`,
       transactionId,
       refundId: refund.id,
       orderId: order.id,
     },
   });

   // Now: -975 + 975 = 0 ✅
   ```

6. **System updates payment lifecycle**: CAPTURED → REFUNDED

   ```typescript
   await prisma.payment.update({
     where: { id: payment.id },
     data: { lifecycle: PaymentLifecycle.REFUNDED },
   });
   ```

7. **System updates order status**: DELIVERED → RETURNED
   ```typescript
   await orderService.updateOrderStatus(order.id, OrderStatus.RETURNED);
   ```

**Result**:

- ✅ Refund processed with status = COMPLETED
- ✅ Ledger entries created (2 entries, sum = 0)
- ✅ Seller wallet debited (refund amount)
- ✅ Buyer wallet credited (refund amount)
- ✅ Platform keeps fee (no platform entry)
- ✅ Payment lifecycle = REFUNDED
- ✅ Order status = RETURNED

---

## Data Model Changes

### Payment Model (COD-specific fields)

```prisma
model Payment {
  // ... other fields ...

  // COD confirmation
  confirmedBy  String?   // Delivery agent user ID
  confirmedAt  DateTime? // When agent confirmed cash collection

  // If confirmedBy is set, must be a valid DeliveryAgent
  // If lifecycle = CAPTURED and paymentMethod = COD, these MUST be set
}
```

### Order Model (COD indicator)

```prisma
model Order {
  // ... other fields ...

  paymentMethod String // 'COD' or 'PREPAID' or 'CHECKOUT'
}
```

### ShippingAssignment Model (Cash collection)

```prisma
model ShippingAssignment {
  // ... other fields ...

  cashCollected Boolean @default(false) // COD cash collected?
  collectionProof String? // Photo/signature URL
}
```

---

## Business Rules

### 1. COD Eligibility

**Product-level**:

- Product must have `allowCOD = true`
- Custom orders may restrict COD

**Location-level**:

- Shipping provider must support COD in delivery area
- Remote areas may not allow COD

**User-level** (future):

- New users may have COD limits (₹1000 first order)
- Users with high cancellation rate may be restricted

### 2. Payment Capture Rules

**Capture Conditions**:

- ✅ Order status = SHIPPED
- ✅ Payment lifecycle = INITIATED
- ✅ Delivery agent assigned to order
- ✅ Agent confirms cash collection
- ✅ Amount matches order total

**Capture Restrictions**:

- ❌ Cannot capture if order CANCELLED
- ❌ Cannot capture twice (idempotency)
- ❌ Cannot capture partial amount (Sprint 6A)

### 3. Platform Fee Deduction

**Timing**: Platform fee deducted ONLY when payment is captured.

**Example**:

- Order total: ₹1000
- Platform fee: 2.5% = ₹25
- Seller receives: ₹975 (at capture time)

**Cancellation Scenario**:

- Order cancelled before delivery: NO fee charged
- Order cancelled after delivery: Fee NOT refunded by default

### 4. Refund Eligibility

**Time Window**:

- Within 7 days of delivery
- Configurable per category/seller

**Amount**:

- Full refund: ₹1000 (buyer gets back what they paid)
- Partial refund: Based on damage/issue
- Platform fee: NOT refunded by default (admin can override)

---

## Integration Points

### 1. Order Module

```typescript
// OrderService calls PaymentService
async confirmOrder(orderId: string): Promise<Order> {
  // ... order confirmation logic ...

  if (order.paymentMethod === 'COD') {
    // Just create INITIATED payment, don't capture
    await paymentService.initiatePayment({
      orderId: order.id,
      paymentMethod: 'COD',
    });
  }

  return order;
}
```

### 2. Shipping Module

```typescript
// ShippingService calls PaymentService
async confirmCashCollection(
  assignmentId: string,
  orderId: string,
): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payment: true },
  });

  // Capture COD payment
  if (order.paymentMethod === 'COD') {
    await paymentService.capturePayment({
      paymentId: order.payment.id,
      confirmedBy: currentAgent.id,
      confirmedAt: new Date(),
    });
  }

  // Update shipping status
  await this.updateShippingStatus(assignmentId, ShippingStatus.DELIVERED);
}
```

### 3. Notification Module

```typescript
// Send confirmation to buyer
await notificationService.send({
  userId: buyer.id,
  type: 'COD_PAYMENT_CAPTURED',
  message: `Your payment of ₹${payment.amount} has been recorded.`,
});

// Send confirmation to seller
await notificationService.send({
  userId: seller.id,
  type: 'COD_PAYMENT_RECEIVED',
  message: `Payment of ₹${sellerAmount} credited for order ${order.orderNumber}.`,
});
```

---

## RBAC Permissions

### Buyer Permissions

- ✅ Create COD order
- ✅ View payment status
- ✅ Request refund
- ❌ Confirm payment (delivery agent only)

### Seller Permissions

- ✅ View payment status
- ✅ View ledger entries
- ❌ Capture payment (delivery agent only)
- ❌ Initiate refund (buyer/admin only)

### Delivery Agent Permissions

- ✅ Confirm cash collection (CRITICAL)
- ✅ View order payment details
- ❌ View ledger entries
- ❌ Initiate refund

### Admin Permissions

- ✅ View all payments
- ✅ Capture payment manually (override)
- ✅ Approve refunds
- ✅ View full ledger audit trail

---

## Error Scenarios

### 1. Agent Confirms Wrong Amount

**Scenario**: Agent collects ₹900 but order total is ₹1000.

**Handling**:

```typescript
if (amountCollected.lt(order.totalAmount)) {
  throw new BadRequestException(
    `Amount collected (${amountCollected}) < Order total (${order.totalAmount})`,
  );
}
```

**Resolution**:

- Agent must collect full amount
- Or admin adjusts order total (with approval)

### 2. Agent Confirms Without Delivery

**Scenario**: Agent clicks "Cash Collected" but hasn't delivered.

**Handling**:

```typescript
// Require GPS verification (future)
if (!isNearDeliveryAddress(agent.location, order.deliveryAddress)) {
  throw new BadRequestException('Must be at delivery location');
}

// Require photo proof
if (!collectionProof) {
  throw new BadRequestException('Photo proof required');
}
```

### 3. Duplicate Capture Attempts

**Scenario**: Agent clicks "Cash Collected" twice.

**Handling**:

```typescript
// Idempotency check
if (payment.lifecycle === PaymentLifecycle.CAPTURED) {
  return { message: 'Payment already captured', payment };
}
```

### 4. Payment Captured After Cancellation

**Scenario**: Order cancelled but agent still tries to capture.

**Handling**:

```typescript
if (order.orderStatus === OrderStatus.CANCELLED) {
  throw new BadRequestException('Order cancelled - cannot capture payment');
}
```

---

## Testing Scenarios

### Happy Path

1. Buyer creates COD order → Payment INITIATED
2. Seller confirms order → Order CONFIRMED
3. Order shipped → Order SHIPPED
4. Agent delivers → Agent confirms cash collection
5. System captures payment → Payment CAPTURED, ledger entries created
6. Order marked DELIVERED

### Cancellation Before Delivery

1. Buyer creates COD order → Payment INITIATED
2. Buyer cancels order → Payment CANCELLED
3. No ledger entries created
4. No refund needed

### Refund After Delivery

1. Order delivered, payment CAPTURED
2. Buyer requests refund → Refund PENDING
3. Admin approves → Refund APPROVED
4. System processes → Refund COMPLETED
5. Reverse ledger entries created
6. Payment lifecycle → REFUNDED

### Edge Cases

- Multiple refunds (partial refunds not supported in Sprint 6A)
- Agent confirms at wrong location
- Amount mismatch
- Concurrent capture attempts
- Payment capture timeout (24 hours after delivery)

---

## Performance Considerations

### Database Indexes

```prisma
@@index([orderId]) // Fast order → payment lookup
@@index([lifecycle]) // Filter by payment status
@@index([confirmedBy]) // Agent activity tracking
@@index([paymentMethod]) // COD vs PREPAID analysis
```

### Caching

```typescript
// Cache platform wallet (rarely changes)
const platformWallet = await redis.get('platform-wallet');

// Cache delivery agent assignments
const agentAssignment = await redis.get(`assignment:${orderId}`);
```

---

## Monitoring & Alerts

### Key Metrics

- **COD Capture Rate**: % of INITIATED payments that become CAPTURED
- **Average Capture Time**: Time from order creation to payment capture
- **COD Cancellation Rate**: % of COD orders cancelled before delivery
- **Platform Fee Collection**: Total fees from COD orders

### Alerts

```typescript
// Alert if payment not captured within 24 hours
if (payment.lifecycle === 'INITIATED' && hoursElapsed > 24) {
  await alertService.notify({
    type: 'COD_CAPTURE_DELAYED',
    orderId: payment.orderId,
    paymentId: payment.id,
  });
}

// Alert on high COD cancellation rate
if (codCancellationRate > 0.3) {
  // 30%
  await alertService.notify({
    type: 'HIGH_COD_CANCELLATION',
    rate: codCancellationRate,
  });
}
```

---

## Future Enhancements (Phase 2)

### Partial Payments

- Buyer pays ₹500 now, ₹500 on delivery
- Multiple ledger entries per order

### COD Limits

- ₹1000 limit for first-time buyers
- Increase limit based on successful orders

### COD Escrow

- Hold funds in escrow wallet until confirmation
- Reduces seller risk

### Agent Performance Tracking

- Track agent capture rate
- Identify fraudulent agents

---

**Last Updated**: January 1, 2026  
**Flow Version**: Sprint 6A  
**Critical**: Payment capture MUST be confirmed by delivery agent
