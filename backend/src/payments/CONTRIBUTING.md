# Contributing to Payments & Refunds Module

## Overview

This guide helps developers safely contribute to the payments and refunds system. Financial systems require extreme caution—bugs can cause real money loss.

**Audience:** Backend developers, frontend developers integrating with payment APIs

**Prerequisites:**

- Read [README.md](./README.md) for architecture
- Read [LEDGER_RULES.md](./LEDGER_RULES.md) for invariants
- Understand double-entry bookkeeping basics

---

## Table of Contents

1. [Golden Rules](#golden-rules)
2. [Do's and Don'ts](#dos-and-donts)
3. [Common Mistakes](#common-mistakes)
4. [Adding a New Payment Method](#adding-a-new-payment-method)
5. [Modifying Ledger Logic](#modifying-ledger-logic)
6. [Testing Requirements](#testing-requirements)
7. [Code Review Checklist](#code-review-checklist)
8. [When to Escalate](#when-to-escalate)

---

## Golden Rules

### Rule 1: Ledger Invariant is SACRED

```typescript
// ✅ ALWAYS ensure this holds
SUM(ledger_entries.amount WHERE transaction_id = X) === 0

// ❌ NEVER create ledger entries that violate this
```

Every transaction MUST balance to zero. No exceptions.

### Rule 2: Ledger Entries are IMMUTABLE

```typescript
// ❌ NEVER do this
await prisma.ledgerEntry.update({ ... });
await prisma.ledgerEntry.delete({ ... });

// ✅ ALWAYS append new entries
await prisma.ledgerEntry.create({ ... });
```

Ledger is append-only. To fix errors, create compensating entries.

### Rule 3: Idempotency Keys are MANDATORY

```typescript
// ❌ BAD - Race condition possible
await prisma.ledgerEntry.create({
  data: { amount: 100, walletId: 'abc' },
});

// ✅ GOOD - Protected by unique constraint
await prisma.ledgerEntry.create({
  data: {
    amount: 100,
    walletId: 'abc',
    idempotencyKey: `payment-capture-${paymentId}-${Date.now()}`,
  },
});
```

### Rule 4: Wallet Balances are DERIVED

```typescript
// ❌ NEVER store balance as a field
// BAD: wallets.balance column

// ✅ ALWAYS compute from ledger
const balance = await prisma.ledgerEntry.aggregate({
  where: { walletId },
  _sum: { amount: true },
});
```

### Rule 5: Test Financial Logic with REAL Numbers

```typescript
// ❌ BAD - Hides rounding errors
expect(balance).toBeCloseTo(expected);

// ✅ GOOD - Exact decimal comparison
expect(balance.toFixed(2)).toBe(expected.toFixed(2));
```

---

## Do's and Don'ts

### ✅ DO

**DO use transactions for multi-step operations:**

```typescript
await prisma.$transaction(async (tx) => {
  // All or nothing
  await tx.payment.update({ ... });
  await tx.ledgerEntry.createMany({ ... });
});
```

**DO validate balances BEFORE creating ledger entries:**

```typescript
const sellerBalance = await this.walletService.getBalance(sellerId);
if (sellerBalance < refundAmount) {
  throw new InsufficientBalanceException();
}
```

**DO use Prisma's Decimal type for money:**

```typescript
import { Decimal } from '@prisma/client/runtime/library';

const platformFee = new Decimal(paymentAmount).mul(platformFeeRate);
```

**DO log ALL financial operations:**

```typescript
this.logger.log({
  event: 'payment_captured',
  paymentId,
  amount: payment.amount.toFixed(2),
  buyerId: payment.payerWalletId,
  sellerId: payment.payeeWalletId,
});
```

**DO write integration tests for new payment flows:**

```typescript
it('should capture PREPAID payment and create ledger entries', async () => {
  // Test with REAL services, NOT mocks
  const payment = await paymentService.initiatePayment({ ... });
  const captured = await paymentService.capturePayment(payment.id, { ... });

  // Verify ledger invariant
  const entries = await prisma.ledgerEntry.findMany({
    where: { paymentId: payment.id },
  });
  const sum = entries.reduce((acc, e) => acc + Number(e.amount), 0);
  expect(sum).toBe(0);
});
```

### ❌ DON'T

**DON'T bypass service layer:**

```typescript
// ❌ BAD - Violates business logic
await prisma.payment.update({
  where: { id: paymentId },
  data: { lifecycle: 'CAPTURED' },
});

// ✅ GOOD - Uses service with invariant enforcement
await this.paymentService.capturePayment(paymentId, captureData);
```

**DON'T use floating-point for money:**

```typescript
// ❌ BAD - Rounding errors
const fee = paymentAmount * 0.05;

// ✅ GOOD - Decimal precision
const fee = new Decimal(paymentAmount).mul(0.05);
```

**DON'T create ledger entries with NULL transaction_id:**

```typescript
// ❌ BAD - Orphaned entry
await prisma.ledgerEntry.create({
  data: { amount: 100, walletId: 'abc', transactionId: null },
});

// ✅ GOOD - Always link to transaction
await prisma.ledgerEntry.create({
  data: { amount: 100, walletId: 'abc', transactionId: txId },
});
```

**DON'T mock financial services in tests:**

```typescript
// ❌ BAD - Hides bugs
const mockLedgerService = { recordEntries: jest.fn() };

// ✅ GOOD - Test real implementation
const ledgerService = new LedgerService(prisma, logger);
```

**DON'T ignore Prisma errors:**

```typescript
// ❌ BAD - Swallows duplicate key errors
try {
  await prisma.ledgerEntry.create({ ... });
} catch (error) {
  // Silently continue
}

// ✅ GOOD - Handle idempotency explicitly
try {
  await prisma.ledgerEntry.create({ ... });
} catch (error) {
  if (error.code === 'P2002') {
    // Duplicate idempotency key - operation already performed
    return existingResult;
  }
  throw error;
}
```

---

## Common Mistakes

### Mistake 1: Forgetting Platform Fee Entry

**Symptom:** Ledger invariant violation (sum != 0)

**Example:**

```typescript
// ❌ WRONG - Only 2 entries, sum = 1000
await prisma.ledgerEntry.createMany({
  data: [
    { walletId: buyerId, amount: -1000, entryType: 'PAYMENT_DEBIT' },
    { walletId: sellerId, amount: 950, entryType: 'PAYMENT_CREDIT' },
    // Missing platform fee entry (+50)
  ],
});
```

**Fix:**

```typescript
// ✅ CORRECT - 3 entries, sum = 0
await prisma.ledgerEntry.createMany({
  data: [
    { walletId: buyerId, amount: -1000, entryType: 'PAYMENT_DEBIT' },
    { walletId: sellerId, amount: 950, entryType: 'PAYMENT_CREDIT' },
    { walletId: platformId, amount: 50, entryType: 'PLATFORM_FEE_CREDIT' },
  ],
});
```

### Mistake 2: Incorrect Refund Amount with Platform Fee

**Symptom:** Buyer receives wrong refund amount

**Example:**

```typescript
// ❌ WRONG - Buyer gets only $950, but paid $1000
await prisma.ledgerEntry.createMany({
  data: [
    { walletId: sellerId, amount: -950, entryType: 'REFUND_DEBIT' },
    { walletId: buyerId, amount: 950, entryType: 'REFUND_CREDIT' },
  ],
});
```

**Fix (Option A - Platform Keeps Fee):**

```typescript
// ✅ CORRECT - Buyer gets full $1000
await prisma.ledgerEntry.createMany({
  data: [
    { walletId: sellerId, amount: -1000, entryType: 'REFUND_DEBIT' },
    { walletId: buyerId, amount: 1000, entryType: 'REFUND_CREDIT' },
  ],
});
```

**Fix (Option B - Platform Refunds Fee):**

```typescript
// ✅ CORRECT - Platform pays back $50
await prisma.ledgerEntry.createMany({
  data: [
    { walletId: sellerId, amount: -950, entryType: 'REFUND_DEBIT' },
    { walletId: platformId, amount: -50, entryType: 'REFUND_DEBIT' },
    { walletId: buyerId, amount: 1000, entryType: 'REFUND_CREDIT' },
  ],
});
```

### Mistake 3: Idempotency Key Collision

**Symptom:** P2002 error on high-frequency operations

**Example:**

```typescript
// ❌ BAD - Same key for all captures today
const key = `payment-capture-${paymentId}-${new Date().toDateString()}`;
```

**Fix:**

```typescript
// ✅ GOOD - Unique per operation
const key = `payment-capture-${paymentId}-${Date.now()}`;
```

### Mistake 4: Missing Balance Check Before Debit

**Symptom:** Negative wallet balances

**Example:**

```typescript
// ❌ BAD - No validation
await prisma.ledgerEntry.create({
  data: { walletId: sellerId, amount: -1000, entryType: 'REFUND_DEBIT' },
});
```

**Fix:**

```typescript
// ✅ GOOD - Validate first
const balance = await this.walletService.getBalance(sellerId);
if (balance < 1000) {
  throw new InsufficientBalanceException();
}
await prisma.ledgerEntry.create({ ... });
```

### Mistake 5: Using Payment Amount Instead of Refund Amount

**Symptom:** Partial refunds fail or create wrong entries

**Example:**

```typescript
// ❌ BAD - Uses payment.amount for partial refund
const refundAmount = payment.amount; // Wrong!
await this.ledgerService.recordEntries([
  { walletId: sellerId, amount: -refundAmount, ... },
]);
```

**Fix:**

```typescript
// ✅ GOOD - Uses refund.amount
const refundAmount = refund.amount; // Correct!
await this.ledgerService.recordEntries([
  { walletId: sellerId, amount: -refundAmount, ... },
]);
```

### Mistake 6: Race Condition on Concurrent Refunds

**Symptom:** Multiple refunds exceed payment amount

**Example:**

```typescript
// ❌ BAD - No locking, check-then-act race
const totalRefunded = await this.getTotalRefunded(paymentId);
if (totalRefunded + refundAmount > payment.amount) {
  throw new Error('Exceeds payment');
}
// Another request can pass the check here before we create refund
await prisma.refund.create({ ... });
```

**Fix:**

```typescript
// ✅ GOOD - Use transaction with SELECT FOR UPDATE
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: { refunds: true },
  });

  const totalRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
  if (totalRefunded + refundAmount > payment.amount) {
    throw new Error('Exceeds payment');
  }

  await tx.refund.create({ ... });
});
```

---

## Adding a New Payment Method

**Example:** Adding "Bank Transfer" payment method

### Step 1: Update Schema (if needed)

```prisma
// schema.prisma
enum PaymentMethod {
  COD
  PREPAID
  CHECKOUT
  BANK_TRANSFER // New
}
```

Run migration:

```bash
npm run prisma:migrate -- --name add_bank_transfer_method
```

### Step 2: Add to PaymentService

```typescript
// payment.service.ts

async captureBankTransferPayment(
  paymentId: string,
  bankTransactionId: string,
  verifiedBy: string,
): Promise<Payment> {
  // Validate payment
  const payment = await this.prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true, payerWallet: true, payeeWallet: true },
  });

  if (!payment) throw new NotFoundException('Payment not found');
  if (payment.paymentMethod !== 'BANK_TRANSFER') {
    throw new BadRequestException('Not a bank transfer payment');
  }
  if (payment.lifecycle !== 'INITIATED') {
    throw new BadRequestException('Payment already captured or failed');
  }

  // Calculate platform fee
  const platformFee = await this.platformFeeService.calculatePlatformFee({
    paymentAmount: payment.amount,
    paymentMethod: 'BANK_TRANSFER',
    orderDetails: payment.order,
  });

  // Create ledger entries (CRITICAL: must sum to 0)
  const entries = [
    {
      walletId: payment.payerWalletId,
      amount: payment.amount.mul(-1), // Debit buyer
      entryType: LedgerEntryType.PAYMENT_DEBIT,
      description: `Payment for order ${payment.orderId} via bank transfer`,
    },
    {
      walletId: payment.payeeWalletId,
      amount: payment.amount.minus(platformFee), // Credit seller (minus fee)
      entryType: LedgerEntryType.PAYMENT_CREDIT,
      description: `Payment received for order ${payment.orderId}`,
    },
    {
      walletId: this.platformWalletId,
      amount: platformFee, // Credit platform
      entryType: LedgerEntryType.PLATFORM_FEE_CREDIT,
      description: `Platform fee for order ${payment.orderId}`,
    },
  ];

  // Record in transaction
  const result = await this.prisma.$transaction(async (tx) => {
    await this.ledgerService.recordEntries(
      entries,
      `payment-${payment.id}`,
      `payment-capture-${payment.id}-${Date.now()}`,
      payment.id,
      null,
      tx,
    );

    return await tx.payment.update({
      where: { id: paymentId },
      data: {
        lifecycle: 'CAPTURED',
        capturedAt: new Date(),
        gatewayTransactionId: bankTransactionId,
        gatewayResponse: JSON.stringify({ verifiedBy }),
      },
    });
  });

  this.logger.log({
    event: 'bank_transfer_captured',
    paymentId,
    amount: payment.amount.toFixed(2),
    platformFee: platformFee.toFixed(2),
    bankTransactionId,
  });

  return result;
}
```

### Step 3: Add Controller Endpoint

```typescript
// payment.controller.ts

@Post(':id/capture-bank-transfer')
@RequirePermissions('payment:capture')
async captureBankTransfer(
  @Param('id') paymentId: string,
  @Body() dto: CaptureBankTransferDto,
  @CurrentUser() user: User,
): Promise<Payment> {
  return this.paymentService.captureBankTransferPayment(
    paymentId,
    dto.bankTransactionId,
    user.id,
  );
}
```

### Step 4: Create DTO

```typescript
// dto/capture-bank-transfer.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class CaptureBankTransferDto {
  @IsString()
  @IsNotEmpty()
  bankTransactionId: string;
}
```

### Step 5: Write Integration Test

```typescript
// test/payments-refunds.integration.spec.ts

describe('Bank Transfer Payments', () => {
  it('should capture bank transfer payment and create ledger entries', async () => {
    // Setup
    const buyer = await createTestUser('buyer@example.com');
    const seller = await createTestUser('seller@example.com');
    const order = await createTestOrder(buyer.id, seller.id);

    // Initiate payment
    const payment = await paymentService.initiatePayment({
      orderId: order.id,
      amount: new Decimal(2000),
      paymentMethod: 'BANK_TRANSFER',
    });

    // Capture
    const captured = await paymentService.captureBankTransferPayment(
      payment.id,
      'bank-txn-12345',
      'admin-user-id',
    );

    // Assertions
    expect(captured.lifecycle).toBe('CAPTURED');
    expect(captured.gatewayTransactionId).toBe('bank-txn-12345');

    // Verify ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where: { paymentId: payment.id },
    });

    expect(entries).toHaveLength(3);

    // Verify invariant
    const sum = entries.reduce((acc, e) => acc + Number(e.amount), 0);
    expect(sum).toBe(0);

    // Verify buyer debited
    const buyerEntry = entries.find((e) => e.walletId === buyer.wallets[0].id);
    expect(buyerEntry.amount).toBe('-2000.00');

    // Verify seller credited (minus fee)
    const sellerEntry = entries.find((e) => e.walletId === seller.wallets[0].id);
    expect(Number(sellerEntry.amount)).toBeLessThan(2000);

    // Verify platform credited (fee)
    const platformEntry = entries.find((e) => e.entryType === 'PLATFORM_FEE_CREDIT');
    expect(Number(platformEntry.amount)).toBeGreaterThan(0);
  });
});
```

### Step 6: Update Documentation

Add to [README.md](./README.md):

````markdown
### Bank Transfer (BANK_TRANSFER)

**Lifecycle:** INITIATED → CAPTURED

**Capture Trigger:** Admin verifies bank transaction ID

**Platform Fee:** Charged at capture (deducted from seller)

**Example:**

```bash
POST /payments/:id/capture-bank-transfer
{
  "bankTransactionId": "bank-txn-12345"
}
```
````

````

### Step 7: Code Review Checklist

Before submitting PR:
- [ ] Ledger entries sum to 0 in ALL code paths
- [ ] Idempotency key used in recordEntries call
- [ ] Platform fee calculated and credited
- [ ] Transaction wraps ledger + payment update
- [ ] Integration test verifies ledger invariant
- [ ] Logs include paymentId and amount
- [ ] Error handling for invalid states
- [ ] Documentation updated (README.md)
- [ ] Migration tested on dev environment

---

## Modifying Ledger Logic

### When You Need To

- Adding new entry types
- Changing fee calculation
- Adding ledger validation rules

### Critical Checks

**Before:**
1. Understand current invariant enforcement (3 layers)
2. Review ALL places that create ledger entries
3. Check if change affects existing entries

**During:**
1. Run ALL tests after EVERY change
2. Verify ledger invariant in EVERY test
3. Use Decimal type for ALL calculations

**After:**
1. Run full integration test suite
2. Manually verify ledger queries return 0 sum
3. Check logs for any Prisma errors

### Example: Adding Adjustment Entry Type

**Step 1: Update Schema**
```prisma
enum LedgerEntryType {
  // Existing...
  MANUAL_ADJUSTMENT_DEBIT // New
  MANUAL_ADJUSTMENT_CREDIT // New
}
````

**Step 2: Update LedgerService**

```typescript
// ledger.service.ts

async createManualAdjustment(
  walletId: string,
  amount: Decimal,
  reason: string,
  approvedBy: string,
): Promise<void> {
  // Manual adjustments MUST be paired (sum = 0)
  // Usually debit user, credit platform (or vice versa)

  const transactionId = `manual-adjustment-${Date.now()}`;
  const idempotencyKey = `adjustment-${walletId}-${Date.now()}`;

  await this.recordEntries(
    [
      {
        walletId: walletId,
        amount: amount.mul(-1), // Debit user
        entryType: LedgerEntryType.MANUAL_ADJUSTMENT_DEBIT,
        description: `Manual adjustment: ${reason}`,
      },
      {
        walletId: this.platformWalletId,
        amount: amount, // Credit platform
        entryType: LedgerEntryType.MANUAL_ADJUSTMENT_CREDIT,
        description: `Manual adjustment: ${reason}`,
      },
    ],
    transactionId,
    idempotencyKey,
    null,
    null,
  );

  this.logger.warn({
    event: 'manual_adjustment_created',
    walletId,
    amount: amount.toFixed(2),
    reason,
    approvedBy,
  });
}
```

**Step 3: Test**

```typescript
it('should create manual adjustment and maintain invariant', async () => {
  const user = await createTestUser('test@example.com');
  const walletId = user.wallets[0].id;

  await ledgerService.createManualAdjustment(
    walletId,
    new Decimal(100),
    'Account correction per ticket #12345',
    'admin-user-id',
  );

  // Verify 2 entries created
  const entries = await prisma.ledgerEntry.findMany({
    where: { walletId },
  });
  expect(entries).toHaveLength(2);

  // Verify invariant
  const sum = entries.reduce((acc, e) => acc + Number(e.amount), 0);
  expect(sum).toBe(0);
});
```

---

## Testing Requirements

### Unit Tests (Optional)

We prefer integration tests, but if you write unit tests:

```typescript
// ❌ DON'T mock Prisma or financial services
const mockPrisma = { payment: { update: jest.fn() } };

// ✅ DO test pure business logic only
describe('calculatePlatformFee', () => {
  it('should calculate 5% fee for PREPAID', () => {
    const fee = calculatePlatformFee(new Decimal(1000), 'PREPAID');
    expect(fee.toFixed(2)).toBe('50.00');
  });
});
```

### Integration Tests (REQUIRED)

Every new payment flow MUST have integration tests.

**Template:**

```typescript
describe('MyNewPaymentFlow', () => {
  let paymentService: PaymentService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup real services
    const module = await Test.createTestingModule({
      imports: [PaymentsModule],
    }).compile();

    paymentService = module.get(PaymentService);
    prisma = module.get(PrismaClient);
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should complete full flow and maintain ledger invariant', async () => {
    // 1. Setup
    const buyer = await createTestUser('buyer@example.com');
    const seller = await createTestUser('seller@example.com');

    // 2. Execute operation
    const payment = await paymentService.initiatePayment({ ... });
    const captured = await paymentService.capturePayment(payment.id, { ... });

    // 3. Verify state
    expect(captured.lifecycle).toBe('CAPTURED');

    // 4. Verify ledger invariant (CRITICAL)
    await verifyLedgerInvariant(payment.id);

    // 5. Verify balances updated
    const buyerBalance = await getWalletBalance(buyer.wallets[0].id);
    const sellerBalance = await getWalletBalance(seller.wallets[0].id);
    expect(buyerBalance).toBe(expectedBuyerBalance);
    expect(sellerBalance).toBe(expectedSellerBalance);
  });
});
```

### Test Helpers

```typescript
// test/helpers.ts

export async function verifyLedgerInvariant(paymentId?: string, refundId?: string): Promise<void> {
  const where = paymentId ? { paymentId } : refundId ? { refundId } : {};

  const result = await prisma.ledgerEntry.groupBy({
    by: ['transactionId'],
    where,
    _sum: { amount: true },
  });

  for (const group of result) {
    const sum = Number(group._sum.amount);
    if (Math.abs(sum) > 0.01) {
      throw new Error(`Ledger invariant violated: transaction ${group.transactionId} sum = ${sum}`);
    }
  }
}

export async function fundWallet(walletId: string, amount: Decimal): Promise<void> {
  const platformWalletId = await getPlatformWalletId();

  await prisma.ledgerEntry.createMany({
    data: [
      {
        walletId: platformWalletId,
        amount: amount.mul(-1),
        entryType: 'ADJUSTMENT_DEBIT',
        transactionId: `fund-${walletId}-${Date.now()}`,
        idempotencyKey: `fund-${walletId}-${Date.now()}`,
        description: 'Test funding',
      },
      {
        walletId: walletId,
        amount: amount,
        entryType: 'ADJUSTMENT_CREDIT',
        transactionId: `fund-${walletId}-${Date.now()}`,
        idempotencyKey: `fund-${walletId}-credit-${Date.now()}`,
        description: 'Test funding',
      },
    ],
  });
}
```

---

## Code Review Checklist

Use this checklist for ALL PRs touching payments/refunds:

### Financial Logic

- [ ] Ledger entries sum to 0 in ALL code paths
- [ ] Idempotency keys used on ALL ledger operations
- [ ] Platform fee calculated and recorded
- [ ] Prisma Decimal type used for ALL money amounts
- [ ] NO floating-point arithmetic on money
- [ ] Balance validation BEFORE debit operations

### Transactions

- [ ] Prisma $transaction wraps multi-step operations
- [ ] NO partial commits possible
- [ ] Transaction isolation understood (READ COMMITTED)
- [ ] Row-level locking used for concurrent operations

### Error Handling

- [ ] P2002 (unique constraint) handled for idempotency
- [ ] Invalid state transitions caught and rejected
- [ ] Insufficient balance checked BEFORE operation
- [ ] User-friendly error messages (no internal IDs exposed)

### Logging

- [ ] Structured JSON logs for ALL financial operations
- [ ] paymentId/refundId included in log context
- [ ] amount logged as string with 2 decimal places
- [ ] NO sensitive data (passwords, tokens) in logs

### Testing

- [ ] Integration test covers happy path
- [ ] Integration test covers error paths
- [ ] Ledger invariant verified in EVERY test
- [ ] Balance changes verified in EVERY test
- [ ] Idempotency tested (repeat operation = same result)

### Security

- [ ] Permission checks on ALL endpoints
- [ ] User can only access their own wallets
- [ ] Admin-only operations protected
- [ ] Input validation with class-validator

### Documentation

- [ ] README.md updated if new payment method
- [ ] LEDGER_RULES.md updated if new entry type
- [ ] REFUND_RULES.md updated if refund policy changes
- [ ] Migration documented in commit message

---

## When to Escalate

### Escalate to Platform Team Lead

- Modifying core ledger logic (LedgerService.recordEntries)
- Changing platform fee calculation formula
- Adding new wallet types
- Modifying invariant enforcement layers
- Database schema changes affecting wallets or ledger

### Escalate to CTO

- Changing ledger entry immutability rules
- Modifying double-entry bookkeeping model
- Introducing new financial product (loans, credits, etc.)
- Changes affecting >$10,000 in daily transaction volume
- Security vulnerabilities in payment system

### Escalate to Legal

- Changing refund policies
- Adding chargeback functionality
- Modifying dispute resolution
- International payment methods
- Tax calculation changes

---

## Common Questions

### Q: Can I add a 'balance' column to wallets table?

**A: NO.** Balances are DERIVED from ledger entries. Storing balance as a column creates dual source of truth and will cause inconsistencies.

### Q: Can I delete a ledger entry to fix a mistake?

**A: NO.** Ledger is append-only. Create a compensating entry instead.

### Q: Can I bypass permission checks for admin operations?

**A: YES,** but use `@RequirePermissions('platform-admin')` instead of skipping guard.

### Q: Do I need to test with real Prisma or can I mock it?

**A: Real Prisma.** Mocking hides database-level bugs (constraints, transactions).

### Q: What if my test fails with "ledger invariant violated"?

**A: This is a CRITICAL bug.** Do not merge until fixed. Check your ledger entries sum to 0.

### Q: Can I use JavaScript `Number` type for money?

**A: NO.** Always use Prisma `Decimal` type. JavaScript Number has floating-point errors.

### Q: How do I handle partial refunds?

**A: See [REFUND_RULES.md](./REFUND_RULES.md)** - multiple partials allowed, sum ≤ payment amount.

### Q: What if buyer and seller are the same user?

**A: Current limitation:** Not supported. Payment requires distinct payer and payee wallets.

### Q: Can I add a "wallet transfer" feature?

**A: Ask platform team first.** This introduces new fraud risks and requires additional safeguards.

---

## Getting Help

### Before Asking

1. Read [README.md](./README.md) - Architecture overview
2. Read [LEDGER_RULES.md](./LEDGER_RULES.md) - Invariants and enforcement
3. Search existing tests for similar patterns
4. Check logs for error messages

### When Asking

Provide:

- What you're trying to do
- Code snippet (ledger entries)
- Error message (full stack trace)
- What you've tried

### Contacts

- **Platform Team Lead:** [Your Name]
- **On-Call Engineer:** PagerDuty
- **Slack:** #payments-support

---

## Related Documentation

- [README.md](./README.md) - Architecture overview
- [LEDGER_RULES.md](./LEDGER_RULES.md) - Invariants and enforcement
- [REFUND_RULES.md](./REFUND_RULES.md) - Refund policies
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident handling
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
