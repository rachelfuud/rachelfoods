# Sprint 8 - NO-GO AREAS (Mandatory Review)

## Document Status

**Phase:** Design & Specification  
**Status:** FINAL - Must Be Approved Before Any Code  
**Date:** 2026-01-02  
**Severity:** CRITICAL

---

## Overview

This document defines **absolute prohibitions** for Sprint 8 implementation. Violating any item in this list requires explicit design review and approval from the product owner.

---

## Golden Rule Violations

### ❌ FORBIDDEN: Money Logic Outside Payment Services

**What:** Direct writes to financial tables outside PaymentService, LedgerService, WalletService

**Examples:**

```typescript
// ❌ FORBIDDEN - ShippingService writing to ledger
await prisma.ledgerEntry.create({
  walletId: agentWalletId,
  amount: deliveryFee,
  entryType: 'DELIVERY_FEE_CREDIT',
});

// ❌ FORBIDDEN - OrderService updating wallet balance
await prisma.wallet.update({
  where: { id: buyerWalletId },
  data: { balance: { decrement: orderTotal } },
});

// ❌ FORBIDDEN - Any service directly updating payment lifecycle
await prisma.payment.update({
  where: { id: paymentId },
  data: { lifecycle: 'CAPTURED' },
});
```

**Why:** Financial integrity depends on centralized control of money flows.

**Allowed:** Delegating to existing services

```typescript
// ✅ ALLOWED - Delegation
await this.paymentService.capturePayment({ ... });
await this.refundService.processRefund({ ... });
```

---

## Schema Modifications

### ❌ FORBIDDEN: Schema Changes Without Approval

**What:** Adding, removing, or modifying tables, columns, enums, or constraints

**Requires Approval:**

- Adding new tables
- Adding new columns to existing tables
- Modifying column types
- Adding/removing enums
- Changing foreign key constraints
- Dropping tables or columns

**Examples:**

```prisma
// ❌ FORBIDDEN without approval
model Order {
  // Adding new column
  estimatedProfit Decimal? @db.Decimal(10, 2)
}

// ❌ FORBIDDEN without approval
enum PaymentLifecycle {
  INITIATED
  AUTHORIZED
  CAPTURED
  PENDING_SETTLEMENT // New enum value - requires approval
}
```

**Exception:** Track C webhook tables (pre-approved in design)

```prisma
// ✅ PRE-APPROVED for Track C
model WebhookSubscription { ... }
model WebhookDelivery { ... }
```

---

## Lifecycle & State Machine Changes

### ❌ FORBIDDEN: Modifying State Transitions

**What:** Adding, removing, or changing allowed state transitions

**Examples:**

```typescript
// ❌ FORBIDDEN - Adding new transition
// ShippingStatus: DELIVERED → PENDING (rollback not allowed)

// ❌ FORBIDDEN - Changing transition rules
// PaymentLifecycle: CAPTURED → REFUNDED without refund record

// ❌ FORBIDDEN - Bypassing state machine
await prisma.shippingAssignment.update({
  where: { id },
  data: { status: 'DELIVERED' }, // Without going through confirmDelivery()
});
```

**Why:** State machines encode critical business rules.

**Allowed:** Following existing transitions via service methods

```typescript
// ✅ ALLOWED - Using existing transitions
await this.shippingService.confirmDelivery(assignmentId, ...);
await this.paymentService.capturePayment(paymentId, ...);
```

---

## Idempotency Behavior

### ❌ FORBIDDEN: Breaking Idempotency Guarantees

**What:** Modifying idempotency logic or keys

**Examples:**

```typescript
// ❌ FORBIDDEN - Removing idempotency check
async capturePayment(dto: CapturePaymentDto) {
  // Missing check for already-captured payment
  await this.prisma.$transaction([...]);
}

// ❌ FORBIDDEN - Changing idempotency key format
const idempotencyKey = `payment_${paymentId}`; // Too generic, might collide

// ❌ FORBIDDEN - Allowing duplicate operations
await prisma.ledgerEntry.create({
  // No idempotencyKey field - duplicates possible
});
```

**Why:** Idempotency prevents duplicate financial transactions.

**Allowed:** Maintaining existing idempotency patterns

```typescript
// ✅ ALLOWED - Existing idempotency pattern
if (payment.lifecycle === PaymentLifecycle.CAPTURED) {
  return payment; // Idempotent return
}
```

---

## Core Table Writes

### ❌ FORBIDDEN: Direct Writes to Core Tables (Outside Owners)

**Tables with Restricted Write Access:**

| Table                  | Owner Service(s)     | Track B | Track C | Track D                   |
| ---------------------- | -------------------- | ------- | ------- | ------------------------- |
| `wallets`              | WalletService        | ❌      | ❌      | ❌                        |
| `ledger_entries`       | LedgerService        | ❌      | ❌      | ❌                        |
| `payments`             | PaymentService       | ❌      | ❌      | ❌                        |
| `refunds`              | RefundService        | ❌      | ❌      | ❌                        |
| `orders`               | OrderService         | ❌      | ❌      | ⚠️ (optimistic lock only) |
| `shipping_assignments` | ShippingService      | ❌      | ❌      | ⚠️ (row lock only)        |
| `delivery_agents`      | DeliveryAgentService | ❌      | ❌      | ❌                        |

**Legend:**

- ❌ Absolutely forbidden
- ⚠️ Only approved concurrency safeguards (no business logic changes)

**Examples:**

```typescript
// ❌ FORBIDDEN - Track B writing to core tables
await prisma.deliveryAgent.update({
  where: { id: agentId },
  data: { totalDeliveries: { increment: 1 } },
});

// ❌ FORBIDDEN - Track C writing to core tables
await prisma.order.update({
  where: { id: orderId },
  data: { status: 'CONFIRMED' },
});

// ✅ ALLOWED - Track C appending to outbox
await prisma.webhookDelivery.create({ ... }); // Append-only, non-core table
```

---

## Business Logic Changes

### ❌ FORBIDDEN: Altering Business Rules

**What:** Changing calculations, validations, or workflows

**Examples:**

```typescript
// ❌ FORBIDDEN - Changing platform fee calculation
const platformFee = amount.mul(0.05); // Changed from existing logic

// ❌ FORBIDDEN - Skipping delivery proof requirement
if (!deliveryProof) {
  // Continue anyway - violates business rule
}

// ❌ FORBIDDEN - Auto-retrying failed deliveries
if (status === 'FAILED') {
  await this.reassignToNewAgent(assignmentId); // Not approved
}
```

**Why:** Business rules are product decisions, not engineering decisions.

**Allowed:** Implementing approved business rules from design docs

---

## Synchronous External Calls

### ❌ FORBIDDEN: Synchronous Webhook Delivery

**What:** Blocking business operations on external HTTP calls

**Examples:**

```typescript
// ❌ FORBIDDEN - Synchronous webhook in transaction
await prisma.$transaction(async (tx) => {
  await tx.order.update({ ... });

  // ❌ Blocking on external HTTP call
  await axios.post('https://external.com/webhook', { ... });
});

// ❌ FORBIDDEN - Throwing on webhook failure
await confirmOrder(orderId);
await this.webhookService.send('order.confirmed', payload); // ❌ Throws if fails
```

**Why:** External systems should not block internal operations.

**Allowed:** Asynchronous webhook delivery via outbox

```typescript
// ✅ ALLOWED - Async via outbox
await confirmOrder(orderId);

// Enqueue webhook (non-blocking)
this.eventEmitter.emit('order.confirmed', { orderId });
```

---

## Premature Optimization

### ❌ FORBIDDEN: Optimization Without Measurement

**What:** Adding complexity without proven performance issues

**Examples:**

```typescript
// ❌ FORBIDDEN - Speculative caching
@Cacheable({ ttl: 300 })
async getOrder(orderId: string) {
  // No evidence this is slow
}

// ❌ FORBIDDEN - Denormalization without justification
model Order {
  // Adding redundant field for "performance"
  cachedSellerName String?
}

// ❌ FORBIDDEN - Complex query optimization
// Before measuring if simple query is slow
```

**Why:** Complexity has a cost - only pay it when necessary.

**Allowed:** Optimizing measured hot paths

```typescript
// ✅ ALLOWED - After measuring
if (duration > 500) {
  this.logger.warn({ event: 'slow_query', duration });
  // NOW optimize if it's a hot path
}
```

---

## Event Emission Inside Transactions

### ❌ FORBIDDEN: Emitting Events Before Commit

**What:** Triggering side effects before transaction commits

**Examples:**

```typescript
// ❌ FORBIDDEN - Event inside transaction
await prisma.$transaction(async (tx) => {
  await tx.order.update({ ... });

  // ❌ Event emitted before commit
  this.eventEmitter.emit('order.confirmed', { orderId });
});

// ❌ FORBIDDEN - Webhook enqueue inside transaction
await prisma.$transaction(async (tx) => {
  await tx.payment.update({ ... });

  // ❌ Writing to outbox inside same transaction
  await tx.webhookDelivery.create({ ... });
});
```

**Why:** Transaction might rollback, but event already sent.

**Allowed:** Post-commit event emission

```typescript
// ✅ ALLOWED - Event after commit
await prisma.$transaction([...]);

// Transaction committed - safe to emit
this.eventEmitter.emit('order.confirmed', { orderId });
```

---

## Testing Anti-Patterns

### ❌ FORBIDDEN: Tests That Modify Production Data

**What:** Tests that depend on or modify shared state

**Examples:**

```typescript
// ❌ FORBIDDEN - Using production database
const payment = await prisma.payment.findFirst(); // Production data

// ❌ FORBIDDEN - Not cleaning up test data
it('should create order', async () => {
  await prisma.order.create({ ... });
  // ❌ No cleanup - pollutes database
});

// ❌ FORBIDDEN - Mocking core services in integration tests
jest.mock('../payment.service'); // ❌ Integration tests use real services
```

**Allowed:** Isolated test data with cleanup

```typescript
// ✅ ALLOWED - Test-specific data
beforeEach(async () => {
  testOrderId = await createTestOrder();
});

afterEach(async () => {
  await cleanupTestOrder(testOrderId);
});
```

---

## Security & Auth Bypasses

### ❌ FORBIDDEN: Skipping RBAC Checks

**What:** Bypassing role-based access control

**Examples:**

```typescript
// ❌ FORBIDDEN - No RBAC guard
@Controller('admin/metrics')
export class MetricsController {
  // ❌ Missing @Roles() decorator
  @Get()
  getMetrics() { ... }
}

// ❌ FORBIDDEN - Hardcoded user check
if (userId === 'admin123') {
  // Allow access - ❌ Not role-based
}
```

**Allowed:** Consistent RBAC guards

```typescript
// ✅ ALLOWED - RBAC enforced
@Controller('admin/metrics')
@UseGuards(AuthGuard, RoleGuard)
@Roles('ADMIN', 'PLATFORM_ADMIN')
export class MetricsController { ... }
```

---

## Summary: Quick Reference

| Area                       | Allowed in Track B | Allowed in Track C | Allowed in Track D |
| -------------------------- | ------------------ | ------------------ | ------------------ |
| Read core tables           | ✅                 | ✅                 | ✅                 |
| Write core tables          | ❌                 | ❌                 | ⚠️ (locks only)    |
| Add new tables             | ❌                 | ✅ (webhooks only) | ❌                 |
| Modify state machines      | ❌                 | ❌                 | ❌                 |
| Change business rules      | ❌                 | ❌                 | ❌                 |
| Emit events (post-commit)  | ❌                 | ✅                 | ❌                 |
| Add observability          | ✅                 | ✅                 | ✅                 |
| Add concurrency safeguards | ❌                 | ❌                 | ✅                 |
| Add database indexes       | ✅                 | ✅                 | ✅                 |
| Direct money logic         | ❌                 | ❌                 | ❌                 |

---

## Approval Process

### Before Writing ANY Code:

1. ✅ Design documents reviewed (Tracks B, C, D)
2. ✅ NO-GO areas reviewed and acknowledged
3. ✅ Implementation plan approved
4. ✅ Schema changes approved (Track C only)

### During Implementation:

- **Pause immediately** if you encounter a NO-GO scenario
- Document the issue and request design review
- Do NOT implement workarounds without approval

### Red Flags (Halt Implementation):

- "Let's just skip the idempotency check for now"
- "I'll add a quick write to the ledger table"
- "We can modify the state machine to allow this"
- "The webhook can block the transaction briefly"

---

## Consequences of Violations

| Violation                    | Impact                         | Recovery Cost                |
| ---------------------------- | ------------------------------ | ---------------------------- |
| Money logic outside services | Financial data corruption      | HIGH - Audit required        |
| State machine changes        | Business rule violations       | HIGH - Rollback needed       |
| Idempotency broken           | Duplicate transactions         | HIGH - Manual fixes          |
| Schema changes unapproved    | Migration conflicts, data loss | MEDIUM - Coordination needed |
| Synchronous webhooks         | Cascading failures, timeouts   | MEDIUM - Hotfix required     |
| RBAC bypassed                | Security vulnerability         | HIGH - Incident response     |

---

## Acknowledgment

By proceeding with Sprint 8 implementation, you acknowledge:

1. ✅ I have read and understood all NO-GO areas
2. ✅ I will request approval before ANY schema changes
3. ✅ I will NOT modify money logic, state machines, or business rules
4. ✅ I will use existing service methods for core operations
5. ✅ I will emit events post-commit only
6. ✅ I will maintain idempotency guarantees
7. ✅ I will enforce RBAC on all new endpoints

**Acknowledged by:** _[Developer Name]_  
**Date:** _[Date]_

---

## Contact for Approvals

**Design Questions:** Product Owner  
**Schema Changes:** Database Lead + Product Owner  
**Business Rule Changes:** Product Owner  
**Security Concerns:** Security Lead
