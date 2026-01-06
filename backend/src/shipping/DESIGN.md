# Sprint 7 - Shipping Module Design

## Document Status

**Phase:** Phase 1 - Design & State Machine  
**Status:** DRAFT - Awaiting Approval  
**Date:** 2026-01-02  
**NO CODE IMPLEMENTATION YET**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Domain Boundaries](#domain-boundaries)
4. [Shipment State Machine](#shipment-state-machine)
5. [Entity Relationships](#entity-relationships)
6. [Business Rules](#business-rules)
7. [Integration Points](#integration-points)
8. [RBAC Permissions](#rbac-permissions)
9. [Non-Functional Requirements](#non-functional-requirements)
10. [Out of Scope](#out-of-scope)

---

## Overview

The Shipping module manages the **fulfillment and delivery** lifecycle of orders after seller confirmation. It orchestrates delivery assignment, tracking, and status transitions while maintaining strict separation from payment and financial operations.

### Primary Responsibilities

1. **Shipment Lifecycle Management**: Track orders from shipment initiation to delivery confirmation
2. **Delivery Assignment**: Assign orders to delivery agents or shipping providers
3. **Status Tracking**: Real-time updates on shipment progress with audit trail
4. **COD Integration**: Trigger payment capture when delivery is confirmed (via PaymentService)
5. **Delivery Confirmation**: Record delivery proof and update order status

### What Shipping Does NOT Do

- ❌ Calculate or modify shipping costs (already set during order creation)
- ❌ Create or modify payments (delegates to PaymentService)
- ❌ Write to ledger or wallets (financial operations are isolated)
- ❌ Approve or confirm orders (seller responsibility in OrderService)
- ❌ Create refunds (delegates to RefundService if needed)

---

## Core Principles

### 1. Golden Rule: NO Money Logic

```typescript
// ❌ FORBIDDEN - Never do this in shipping module
await prisma.ledgerEntry.create({ ... });
await prisma.wallet.update({ ... });
await prisma.payment.update({ lifecycle: 'CAPTURED' });

// ✅ CORRECT - Delegate to existing services
await this.paymentService.capturePayment(paymentId, {
  confirmedBy: agentId,
  confirmedAt: new Date(),
});
```

### 2. Explicit State Transitions

Every shipment status change must be:

- **Validated**: Only allowed transitions are permitted
- **Audited**: Logged in `shipping_logs` table
- **Reversible**: Where business rules allow (e.g., ACCEPTED → PENDING)
- **Atomic**: Status + related fields updated in transaction

### 3. Order Status Synchronization

Shipment status changes MAY trigger Order status updates:

| Shipment Status      | Order Status Update                       |
| -------------------- | ----------------------------------------- |
| ASSIGNED → PICKED_UP | Order.status = SHIPPING                   |
| DELIVERED            | Order.status = DELIVERED                  |
| FAILED               | No automatic change (manual intervention) |

### 4. Idempotency

All state-changing operations must be idempotent:

- Accepting an already-accepted assignment: no-op, return success
- Confirming an already-delivered shipment: no-op, return existing result
- Cancelling an already-cancelled assignment: no-op, return success

### 5. Audit Trail

Every status change MUST create a `ShippingLog` entry with:

- Previous status (nullable for initial creation)
- New status
- Changed by (user ID or 'system')
- Timestamp
- Optional: notes, location, metadata

---

## Domain Boundaries

### What Shipping OWNS

- `ShippingAssignment` lifecycle
- `ShippingLog` creation
- Delivery agent assignment and tracking
- Delivery proof recording (photos, signatures)

### What Shipping COORDINATES

- Order status updates (via OrderService)
- Payment capture for COD (via PaymentService)
- Notification triggers (via NotificationService - future)

### What Shipping CONSUMES

- Order data (read-only)
- DeliveryAgent data (read-only)
- Payment status (to determine COD vs PREPAID)

---

## Shipment State Machine

### States

```
┌────────────┐
│  PENDING   │  Initial state when assignment created
└─────┬──────┘
      │
      ├──────► ASSIGNED ──────┐  Agent assigned but not accepted
      │                       │
      └───────────────────────┴──► ACCEPTED ──► Agent accepted the assignment
                                        │
                                        ▼
                                   PICKED_UP ──► Agent picked up order from seller
                                        │
                                        ▼
                                   IN_TRANSIT ──► Order en route to buyer
                                        │
                                        ▼
                                    DELIVERED ──► Successfully delivered
                                        │
                                        └──► (Triggers COD payment capture if applicable)

Alternative Paths:
PENDING/ASSIGNED/ACCEPTED ──► CANCELLED (before pickup)
IN_TRANSIT ──► FAILED (delivery attempt failed)
```

### State Transition Matrix

| From       | To         | Allowed? | Trigger                    | Business Rule                    |
| ---------- | ---------- | -------- | -------------------------- | -------------------------------- |
| PENDING    | ASSIGNED   | ✅       | Admin/System assigns agent | Agent must be ACTIVE & available |
| PENDING    | CANCELLED  | ✅       | Admin/Seller               | Before agent acceptance          |
| ASSIGNED   | ACCEPTED   | ✅       | Agent accepts              | Agent must own assignment        |
| ASSIGNED   | CANCELLED  | ✅       | Admin/Seller               | Before agent acceptance          |
| ASSIGNED   | PENDING    | ✅       | Admin reassigns            | Unassign agent, back to pool     |
| ACCEPTED   | PICKED_UP  | ✅       | Agent confirms pickup      | Agent at seller location         |
| ACCEPTED   | CANCELLED  | ❌       | Not allowed                | Too late - agent committed       |
| PICKED_UP  | IN_TRANSIT | ✅       | Agent starts delivery      | Automatic or manual trigger      |
| IN_TRANSIT | DELIVERED  | ✅       | Agent confirms delivery    | Requires delivery proof          |
| IN_TRANSIT | FAILED     | ✅       | Delivery failed            | Requires failure reason          |
| DELIVERED  | _any_      | ❌       | Terminal state             | Cannot change after delivery     |
| FAILED     | PENDING    | ✅       | Admin reschedules          | Create new assignment            |
| CANCELLED  | _any_      | ❌       | Terminal state             | Cannot reactivate                |

### Status Semantics

**PENDING**: Assignment created, no agent assigned yet. Order is confirmed but not yet assigned to delivery agent.

**ASSIGNED**: Agent assigned by admin/system, but agent has not accepted. Agent can still reject.

**ACCEPTED**: Agent explicitly accepted the assignment. Commitment made.

**PICKED_UP**: Agent physically collected the order from seller/warehouse. Order.status → SHIPPING.

**IN_TRANSIT**: Agent en route to buyer. Active tracking possible.

**DELIVERED**: Order delivered to buyer, proof recorded. Order.status → DELIVERED. **Triggers COD payment capture** if payment method is COD.

**FAILED**: Delivery attempt failed (buyer unavailable, wrong address, etc.). Requires manual intervention.

**CANCELLED**: Assignment cancelled before delivery. Order may be reassigned to different agent.

---

## Entity Relationships

### Core Entities (Already Exist in Schema)

```
Order (1) ───► (0..N) ShippingAssignment
DeliveryAgent (1) ───► (0..N) ShippingAssignment
ShippingAssignment (1) ───► (0..N) ShippingLog
```

### Data Flow

```
1. Order confirmed by seller (OrderService)
   ↓
2. ShippingAssignment created (status = PENDING)
   ↓
3. Admin/System assigns agent (status = ASSIGNED)
   ↓
4. Agent accepts via mobile app (status = ACCEPTED)
   ↓
5. Agent picks up order (status = PICKED_UP, Order.status = SHIPPING)
   ↓
6. Agent delivers order (status = DELIVERED, Order.status = DELIVERED)
   ↓
7. IF payment method = COD:
     ShippingService.confirmDelivery()
       → PaymentService.capturePayment()
       → Ledger entries created
       → Buyer/Seller wallets updated
```

---

## Business Rules

### Rule 1: Assignment Creation

**Trigger:** Order status changes to CONFIRMED (seller confirms order)

**Conditions:**

- Order.status = CONFIRMED
- Order has delivery address
- No existing ACTIVE assignment (statuses other than CANCELLED/FAILED)

**Action:**

```typescript
// Create initial assignment
ShippingAssignment {
  orderId: order.id,
  agentId: null, // Unassigned initially
  status: PENDING,
  assignedBy: 'system',
  estimatedDeliveryTime: calculateEstimatedTime(order)
}
```

### Rule 2: Agent Assignment

**Trigger:** Admin selects agent OR auto-assignment algorithm

**Conditions:**

- Assignment status = PENDING
- Agent status = ACTIVE
- Agent isAvailable = true
- Agent serviceZipCodes includes order delivery zip code

**Action:**

```typescript
// Update assignment
{
  agentId: selectedAgent.id,
  status: ASSIGNED,
  assignedBy: adminUserId,
  assignedAt: now()
}
```

### Rule 3: Agent Acceptance

**Trigger:** Agent clicks "Accept" in mobile app

**Conditions:**

- Assignment status = ASSIGNED
- Agent owns this assignment
- Agent is still ACTIVE

**Action:**

```typescript
{
  status: ACCEPTED,
  acceptedAt: now()
}
```

### Rule 4: Pickup Confirmation

**Trigger:** Agent confirms pickup at seller location

**Conditions:**

- Assignment status = ACCEPTED
- Agent owns this assignment

**Actions:**

1. Update assignment: `status = PICKED_UP, pickedUpAt = now()`
2. Update order: `Order.status = SHIPPING, shippedAt = now()`
3. Create shipping log

### Rule 5: Delivery Confirmation

**Trigger:** Agent confirms delivery at buyer location

**Conditions:**

- Assignment status = IN_TRANSIT (or PICKED_UP if skipped)
- Agent owns this assignment
- Delivery proof provided (photo OR signature OR both)

**Actions:**

1. Update assignment: `status = DELIVERED, deliveredAt = now(), actualDeliveryTime = now(), deliveryProof = proofUrl`
2. Update order: `Order.status = DELIVERED, deliveredAt = now(), actualDeliveryDate = now()`
3. **IF Order.paymentMethod = COD:**
   - Call `PaymentService.capturePayment(payment.id, { confirmedBy: agent.userId, confirmedAt: now() })`
   - This creates ledger entries and updates wallets (via existing Payment module logic)
4. Create shipping log

### Rule 6: Delivery Failure

**Trigger:** Agent reports delivery failure

**Conditions:**

- Assignment status = IN_TRANSIT
- Failure reason provided

**Actions:**

1. Update assignment: `status = FAILED, failureReason = reason`
2. Create shipping log
3. **DO NOT** update order status automatically (manual intervention required)

### Rule 7: Assignment Cancellation

**Trigger:** Admin/Seller cancels assignment

**Conditions:**

- Assignment status IN (PENDING, ASSIGNED)
- NOT in (ACCEPTED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED)

**Actions:**

1. Update assignment: `status = CANCELLED`
2. Create shipping log
3. Order remains in current status (can be reassigned)

---

## Integration Points

### 1. OrderService (Read/Write)

**Read:**

- `Order.id, status, paymentMethod, deliveryAddress, etc.`
- To validate assignment creation
- To check if order is ready for shipping

**Write:**

- `Order.status = SHIPPING` (when picked up)
- `Order.status = DELIVERED` (when delivered)
- `Order.shippedAt, deliveredAt, actualDeliveryDate`

**Interface:**

```typescript
interface IOrderService {
  // Called by ShippingService
  updateOrderStatusToShipping(orderId: string, shippedAt: Date): Promise<Order>;
  updateOrderStatusToDelivered(orderId: string, deliveredAt: Date): Promise<Order>;
}
```

### 2. PaymentService (Read/Write)

**Read:**

- `Payment.id, paymentMethod, lifecycle`
- To determine if COD payment capture needed

**Write:**

- `PaymentService.capturePayment()` (when COD order delivered)

**Interface:**

```typescript
interface IPaymentService {
  // EXISTING METHOD - reuse it
  capturePayment(
    paymentId: string,
    captureData: {
      confirmedBy?: string; // Delivery agent user ID
      confirmedAt?: Date; // Delivery timestamp
      gatewayTransactionId?: string;
      gatewayResponse?: string;
    },
  ): Promise<Payment>;
}
```

**Critical:** ShippingService MUST call this existing method, NOT create its own payment capture logic.

### 3. DeliveryAgent (Read-Only)

**Read:**

- `DeliveryAgent.id, userId, status, isAvailable, serviceZipCodes`
- For assignment validation
- For agent selection

**Write:**

- Optional: Update `DeliveryAgent.totalDeliveries, successfulDeliveries` after DELIVERED (statistics)

### 4. NotificationService (Future)

**Trigger notifications:**

- Agent assigned → notify agent
- Order picked up → notify buyer
- Order in transit → notify buyer with tracking link
- Order delivered → notify buyer & seller

**Not implemented in Sprint 7, but design should allow future integration.**

---

## RBAC Permissions

### Required Permissions (New)

Follow existing permission pattern: `action:resource`

| Permission                 | Description                       | Roles                         |
| -------------------------- | --------------------------------- | ----------------------------- |
| `shipping:create`          | Create shipping assignment        | platform-admin, seller        |
| `shipping:view`            | View shipping assignments         | platform-admin, seller, buyer |
| `shipping:assign`          | Assign agent to shipment          | platform-admin, seller        |
| `shipping:accept`          | Accept assignment (agent only)    | delivery-agent                |
| `shipping:pickup`          | Confirm pickup                    | delivery-agent                |
| `shipping:deliver`         | Confirm delivery                  | delivery-agent                |
| `shipping:fail`            | Report delivery failure           | delivery-agent                |
| `shipping:cancel`          | Cancel assignment                 | platform-admin, seller        |
| `shipping:view-logs`       | View shipping audit logs          | platform-admin, seller        |
| `shipping:override-status` | Manually override shipment status | platform-admin                |

### Role Assignments

**platform-admin:**

- ALL shipping permissions (super-admin)

**seller:**

- `shipping:create, shipping:view, shipping:assign, shipping:cancel, shipping:view-logs`
- Can manage shipments for their own orders

**buyer:**

- `shipping:view` (own orders only)
- Can track delivery status

**delivery-agent:**

- `shipping:view, shipping:accept, shipping:pickup, shipping:deliver, shipping:fail`
- Can only act on assignments assigned to them

### Permission Enforcement

Follow existing pattern from Payment module:

```typescript
// Controller
@Post(':id/assign-agent')
@RequirePermissions('shipping:assign')
async assignAgent(
  @Param('id') assignmentId: string,
  @Body() dto: AssignAgentDto,
  @CurrentUser() user: User,
) {
  return this.shippingService.assignAgent(assignmentId, dto.agentId, user.id);
}
```

---

## Non-Functional Requirements

### 1. Performance

- Assignment creation: < 200ms
- Status updates: < 100ms
- Delivery confirmation + COD capture: < 500ms (most time in PaymentService)
- Agent availability query: < 50ms (indexed on status, isAvailable)

### 2. Reliability

- All status transitions wrapped in Prisma transactions
- Idempotent status updates (repeat = no-op)
- COD payment capture must use existing PaymentService (already tested and reliable)

### 3. Auditability

- Every status change logs:
  - Previous status
  - New status
  - Changed by (user ID)
  - Timestamp
  - Optional: notes, location
- Logs are append-only, never deleted

### 4. Scalability

- Assignments indexed by: orderId, agentId, status, assignedAt
- ShippingLogs indexed by: assignmentId, toStatus, createdAt
- No N+1 queries: always include related data with `include`

### 5. Security

- Agents can ONLY act on assignments assigned to them
- Sellers can ONLY manage shipments for their own orders
- Buyers can ONLY view shipments for their own orders
- All mutations require authentication + permission checks

---

## Out of Scope (Sprint 7)

### Not Implementing

1. **Shipping Cost Calculation**: Already handled during order creation
2. **3PL Provider Integration**: Internal delivery agents only for Sprint 7
3. **GPS Tracking**: Delivery location is freeform text, not real-time GPS
4. **Route Optimization**: Manual agent assignment or simple auto-assignment
5. **Delivery Time Windows**: `estimatedDeliveryTime` is single timestamp, not range
6. **Multi-Package Shipments**: One assignment per order
7. **Partial Deliveries**: All items delivered together
8. **Return Shipments**: Not covered (future sprint)
9. **Delivery Ratings**: Agent performance metrics updated but no rating workflow
10. **Push Notifications**: Notification service integration deferred
11. **External Gateway**: All operations via internal API, no webhook handling

### Explicitly Deferred

- **Chargeback Handling**: Payment module limitation (documented)
- **Refund Triggering**: Shipping module does not initiate refunds (manual process)
- **Inventory Deduction**: Handled by separate inventory module (future)

---

## Open Questions for Approval

1. **Auto-Assignment Logic**: Should Sprint 7 include automatic agent selection based on zip code + availability? Or manual-only?

2. **IN_TRANSIT Trigger**: Should status change from PICKED_UP → IN_TRANSIT automatically after X minutes, or require explicit agent action?

3. **Failed Delivery Retry**: Should FAILED status allow automatic reassignment, or require admin intervention?

4. **Agent Statistics Update**: Should `DeliveryAgent.totalDeliveries` be updated synchronously (in same transaction as DELIVERED) or asynchronously (background job)?

5. **Delivery Proof Requirement**: Should delivery proof (photo/signature) be REQUIRED or optional for DELIVERED status?

6. **Order Status Rollback**: If COD payment capture fails during delivery confirmation, should shipment status roll back to IN_TRANSIT?

---

## Next Steps (Phase 2)

After approval of this design:

1. Propose Prisma schema changes (if any needed beyond existing tables)
2. Define DTOs and validation rules
3. Design service interfaces and method signatures
4. Plan integration test scenarios

**NO CODE IMPLEMENTATION until Phase 3 approval.**

---

## References

- [Payment Module README](../payments/README.md) - For COD capture integration
- [Payment Module LEDGER_RULES](../payments/LEDGER_RULES.md) - Golden Rule reminder
- [Prisma Schema](../../prisma/schema.prisma) - Existing ShippingAssignment model
- [MODULE_SHIPPING.md](../../../docs/MODULE_SHIPPING.md) - Original module spec
