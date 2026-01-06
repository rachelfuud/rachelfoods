# Payments Module - Overview

## Purpose

The Payments Module provides a **ledger-first, double-entry accounting system** for managing financial transactions in the Rachel Foods Platform. It ensures:

- **Financial accuracy** through immutable ledger records
- **Auditability** with complete transaction history
- **Flexibility** supporting multiple payment methods (COD, PREPAID, CHECKOUT)
- **Integrity** via enforced ledger invariants
- **Scalability** for future payment features (escrow, multi-currency, etc.)

---

## Scope

### What This Module Handles

✅ **Wallet Management**

- User wallets (buyers, sellers)
- Platform commission wallet
- Escrow/holding wallets
- Balance calculation from ledger (no stored balance)

✅ **Payment Processing**

- Payment initiation and authorization
- Payment capture (fund settlement)
- COD payment confirmation by delivery agents
- PREPAID/CHECKOUT payment gateway integration
- Payment retry and failure handling

✅ **Ledger Accounting**

- Immutable, append-only transaction log
- Double-entry bookkeeping (sum per transaction = 0)
- Multi-leg transaction support
- Balance derivation from ledger entries

✅ **Refund Processing**

- Full and partial refunds
- Platform fee refund control
- Refund approval workflow
- Gateway refund integration

✅ **Platform Fee Management**

- Configurable fee rules (percentage or flat)
- Category/product-specific fees
- Order amount range-based fees
- Priority-based fee matching

### What This Module Does NOT Handle

❌ **Wallet Top-ups** - Not implemented in Sprint 6A
❌ **Partial Payments** - Not supported (single payment per order)
❌ **Withdrawals** - Future feature
❌ **Multi-currency** - Only INR supported currently
❌ **Subscription Billing** - Out of scope

---

## Architecture Principles

### 1. Ledger-First Design

**Every financial operation creates ledger entries BEFORE updating any state.**

```
Payment Capture:
1. Create ledger entries (buyer debit, seller credit, platform fee)
2. Update payment status to CAPTURED
3. Update order status to PAID

❌ NEVER: Update payment status first, then create ledger entries
✅ ALWAYS: Create ledger entries first, then update status
```

### 2. Immutable Ledger

Ledger entries are **append-only**. No updates or deletes allowed.

- Corrections are made via **new entries** (adjustments)
- Full audit trail preserved
- Regulatory compliance (financial records)

### 3. Balance Derivation

Wallet balances are **computed from ledger**, never stored.

```typescript
// ✅ Correct
balance = SUM(LedgerEntry.amount WHERE walletId = X)

// ❌ Wrong
balance = Wallet.balance // This field doesn't exist!
```

### 4. Ledger Invariant

**Critical Rule**: For any `transactionId`, the sum of all ledger entries MUST equal 0.

```typescript
// Example: Payment of ₹1000 with ₹25 platform fee
Entries for transactionId = "txn_123":
1. Buyer wallet:    -1000 (PAYMENT_DEBIT)
2. Seller wallet:   +975  (PAYMENT_CREDIT)
3. Platform wallet: +25   (PLATFORM_FEE_CREDIT)

Sum: -1000 + 975 + 25 = 0 ✅

// This allows multi-leg transactions (not just 2 entries)
```

### 5. Idempotency

All payment operations use **idempotency keys** to prevent duplicate charges.

```typescript
// Same idempotency key = same result (safe to retry)
await paymentService.capturePayment(paymentId, {
  idempotencyKey: `payment-capture-${paymentId}`,
});
```

---

## Core Models

### 1. Wallet

**Location**: `prisma/schema.prisma` → `model Wallet`

**Purpose**: Represents a financial account for users or the platform.

**Key Fields**:

- `userId` (optional) - Null for platform/escrow wallets
- `walletType` - USER, PLATFORM, ESCROW
- `walletCode` - Unique identifier for non-user wallets
- `status` - ACTIVE, SUSPENDED, FROZEN

**Balance Calculation**:

```typescript
balance = SUM(LedgerEntry.amount WHERE walletId = wallet.id)
```

---

### 2. LedgerEntry

**Location**: `prisma/schema.prisma` → `model LedgerEntry`

**Purpose**: Immutable record of every financial movement.

**Key Fields**:

- `amount` - Positive (credit) or negative (debit)
- `transactionId` - Groups related entries (must sum to 0)
- `entryType` - PAYMENT_DEBIT, PAYMENT_CREDIT, PLATFORM_FEE_CREDIT, etc.
- `idempotencyKey` - Prevents duplicate entries

**Invariants**:

```sql
-- Ledger integrity check
SELECT transactionId, SUM(amount) as total
FROM ledger_entries
GROUP BY transactionId
HAVING SUM(amount) != 0;
-- Result should be EMPTY
```

---

### 3. Payment

**Location**: `prisma/schema.prisma` → `model Payment`

**Purpose**: Represents a payment transaction between wallets.

**Key Fields**:

- `payerWalletId` / `payeeWalletId` - Wallet references
- `amount` - Total payment amount
- `platformFee` - Fee to platform
- `sellerAmount` - Amount to seller (amount - platformFee)
- `method` - COD, PREPAID, CHECKOUT
- `status` - INITIATED → AUTHORIZED → CAPTURED
- `confirmedBy` - Delivery agent (for COD)

**Lifecycle**:

```
INITIATED → AUTHORIZED (PREPAID) → CAPTURED
         → CAPTURED (COD after delivery agent confirms)
         → FAILED (retry or cancel)
```

---

### 4. Refund

**Location**: `prisma/schema.prisma` → `model Refund`

**Purpose**: Tracks refund transactions.

**Key Fields**:

- `paymentId` - Original payment being refunded
- `amount` - Refund amount (≤ original payment)
- `refundPlatformFee` - Whether to refund platform fee (default: false)
- `status` - INITIATED → PROCESSING → COMPLETED

---

### 5. PlatformFeeConfig

**Location**: `prisma/schema.prisma` → `model PlatformFeeConfig`

**Purpose**: Admin-configurable fee rules.

**Key Fields**:

- `feeType` - PERCENTAGE or FLAT
- `feeValue` - Fee amount (e.g., 2.5% or ₹50)
- `categoryId` / `productId` - Specific fee rules
- `minOrderAmount` / `maxOrderAmount` - Range-based fees
- `priority` - Lower number = higher priority

**Matching Logic**:

1. Find all active configs matching order criteria
2. Sort by priority (ascending)
3. Apply first matching rule
4. Default to 0% if no match

---

## Integration Points

### Order Module

- **Order Creation**: Initiate payment record
- **Order Confirmation**: Capture PREPAID payments
- **Order Delivery**: Trigger COD payment confirmation
- **Order Cancellation**: Initiate refund if payment captured

### Referral Module

- **Referral Discount**: Record ledger entries for reward application
- **Reward Credit**: Add funds to referrer wallet

### Review Module

- **Order Completion**: Ensure payment captured before allowing COMPLETED status

### Shipping Module

- **Delivery Agent**: Confirms COD payment after delivery

---

## Payment Flows

### COD (Cash on Delivery)

```
1. Buyer creates order → Payment INITIATED
2. Seller confirms order → Payment status unchanged
3. Order shipped → Payment status unchanged
4. Delivery agent delivers → Delivery agent confirms payment
5. DeliveryAgentService.confirmCODPayment() → Payment CAPTURED
6. LedgerService records entries → Order PAID
```

### PREPAID (Pay Before Delivery)

```
1. Buyer creates order → Payment INITIATED
2. Buyer pays via gateway → Payment AUTHORIZED
3. Seller confirms order → PaymentService.capturePayment()
4. LedgerService records entries → Payment CAPTURED, Order PAID
5. Order proceeds to PREPARING → SHIPPING → DELIVERED
```

### CHECKOUT (Pay at Checkout)

```
1. Buyer adds items to cart
2. Buyer proceeds to checkout → Payment INITIATED
3. Buyer pays via gateway → Payment AUTHORIZED
4. Order created → Payment CAPTURED, Order PAID
5. Seller confirms → Order PREPARING
```

---

## RBAC Permissions

### Buyer Permissions

- `wallet:view` - View own wallet balance and transactions
- `payment:view` - View own payment history
- `refund:view` - View own refunds

### Seller Permissions

- `wallet:view` - View own wallet
- `payment:view` - View payments for own orders
- `payment:confirm` - Confirm COD payments received
- `refund:initiate` - Request refund for order

### Delivery Agent Permissions

- `payment:confirm` - Confirm COD payment after delivery

### Admin Permissions

- `wallet:viewAll` - View all wallets
- `wallet:suspend` - Suspend user wallet
- `wallet:freeze` - Freeze user wallet
- `payment:viewAll` - View all payments
- `payment:retry` - Retry failed payments
- `refund:approve` - Approve refund requests
- `refund:process` - Process approved refunds
- `platform_fee:configure` - Configure fee rules
- `ledger:view` - View ledger entries
- `ledger:reconcile` - Run ledger reconciliation
- `ledger:adjust` - Manual ledger adjustment

---

## Error Handling

### Payment Failures

- **Insufficient Funds**: Not applicable (no wallet top-ups yet)
- **Gateway Timeout**: Retry with exponential backoff
- **Gateway Rejection**: Mark payment FAILED, notify buyer
- **Duplicate Payment**: Idempotency key prevents duplicate charges

### Ledger Violations

- **Sum ≠ 0**: Transaction rolled back, alert admin
- **Missing Entry**: Transaction rolled back
- **Negative Balance**: Allowed (no balance validation yet)

### Refund Failures

- **Amount > Original Payment**: Validation error
- **Payment Not Captured**: Cannot refund non-captured payment
- **Gateway Refund Failure**: Mark refund FAILED, retry or manual processing

---

## Performance Considerations

### Balance Calculation

Since balance is computed from ledger, optimize queries:

```typescript
// ✅ Use database aggregation (fast)
const { _sum } = await prisma.ledgerEntry.aggregate({
  where: { walletId },
  _sum: { amount: true },
});

// ❌ Don't fetch all entries and sum in JavaScript (slow)
const entries = await prisma.ledgerEntry.findMany({ where: { walletId } });
const balance = entries.reduce((sum, e) => sum + e.amount, 0);
```

### Ledger Queries

- Index on `walletId`, `transactionId`, `createdAt`
- Paginate transaction history queries
- Cache recent balance for read-heavy operations (if needed)

---

## Testing Strategy

### Unit Tests

- Ledger invariant enforcement
- Balance calculation accuracy
- Fee calculation logic
- Idempotency key handling

### Integration Tests

- Full payment capture flow (COD + PREPAID)
- Refund processing
- Order-payment integration
- Ledger reconciliation

### Edge Cases

- Concurrent payments from same wallet
- Payment retry after failure
- Partial refund scenarios
- Platform fee refund handling
- Wallet suspension mid-transaction

---

## Future Enhancements

### Phase 2 (Future Sprints)

- Wallet top-ups (add funds to wallet)
- Wallet withdrawals (transfer to bank account)
- Partial payments (pay in installments)
- Payment plans (subscription billing)
- Multi-currency support
- Escrow holds for disputed orders
- Automated reconciliation jobs
- Payment analytics dashboard

### Phase 3 (Advanced)

- Blockchain integration for audit trail
- Smart contract-based escrow
- Cryptocurrency payments
- Real-time settlement notifications

---

## Troubleshooting

### Common Issues

**Issue**: Wallet balance doesn't match expected value
**Solution**: Run ledger reconciliation to verify invariant

**Issue**: Payment stuck in INITIATED
**Solution**: Check gateway response, retry capture or mark failed

**Issue**: COD payment not confirmed
**Solution**: Delivery agent must confirm via API after delivery

**Issue**: Refund not processed
**Solution**: Check refund status, verify gateway refund ID

---

## Related Documentation

- `LEDGER_MODEL.md` - Detailed ledger entry types and invariants
- `WALLET_MODEL.md` - Wallet types and balance calculation
- `COD_FLOW.md` - Step-by-step COD payment flow
- `REFUND_FLOW.md` - Refund processing workflow
- `../orders/MODULE_ORDER_IMPLEMENTATION.md` - Order-payment integration

---

## Glossary

- **Ledger**: Immutable record of all financial transactions
- **Double-Entry Bookkeeping**: Every transaction has equal debit and credit
- **Idempotency**: Same operation with same key produces same result
- **Capture**: Final step to transfer funds (vs authorization)
- **Settlement**: Distribution of funds to seller and platform
- **Reconciliation**: Verification that ledger sum equals wallet balances
- **Gateway**: External payment processor (Razorpay, Stripe, etc.)

---

**Last Updated**: January 1, 2026  
**Module Version**: Sprint 6A  
**Status**: Implementation Ready
