# Sprint 7 - Phase 2: Prisma Schema Proposal

## Document Status

**Phase:** Phase 2 - Schema Proposal  
**Status:** DRAFT - Awaiting Approval  
**Date:** 2026-01-02  
**NO MIGRATIONS, NO CODE IMPLEMENTATION**

---

## Executive Summary

After analyzing the existing Prisma schema, **NO SCHEMA CHANGES ARE REQUIRED** for Sprint 7 implementation.

The existing schema already contains:

- ✅ All required models: `DeliveryAgent`, `ShippingAssignment`, `ShippingLog`
- ✅ All required enums: `ShippingStatus` (8 states), `DeliveryAgentStatus` (3 states)
- ✅ All required fields for approved design decisions
- ✅ All required relationships and indexes

---

## Existing Schema Review

### 1. DeliveryAgent Model

**Location:** `schema.prisma` lines 438-473

**Assessment:** ✅ COMPLETE - No changes needed

**Key Fields:**

```prisma
model DeliveryAgent {
  id                   String              @id @default(uuid())
  userId               String              @unique
  agentCode            String              @unique
  vehicleType          String?
  vehicleNumber        String?
  licenseNumber        String?
  serviceZipCodes      String[]            // For manual assignment filtering
  maxDeliveryDistance  Decimal?            @db.Decimal(10, 2)
  isAvailable          Boolean             @default(true)
  status               DeliveryAgentStatus @default(ACTIVE)

  // SYNCHRONOUS STATISTICS (Decision #4)
  totalDeliveries      Int                 @default(0)
  successfulDeliveries Int                 @default(0)
  averageRating        Decimal?            @db.Decimal(3, 2)

  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  // Relationships
  assignments          ShippingAssignment[]
}
```

**Supports Approved Decisions:**

- ✅ Decision #1 (Manual Assignment): `serviceZipCodes` array for filtering
- ✅ Decision #4 (Synchronous Statistics): `totalDeliveries`, `successfulDeliveries` fields present

### 2. ShippingAssignment Model

**Location:** `schema.prisma` lines 477-508

**Assessment:** ✅ COMPLETE - No changes needed

**Key Fields:**

```prisma
model ShippingAssignment {
  id                    String         @id @default(uuid())
  orderId               String
  agentId               String?        // Nullable: supports PENDING state

  assignedAt            DateTime       @default(now())
  assignedBy            String?        // User ID who assigned

  // STATUS TIMESTAMPS (All transitions covered)
  status                ShippingStatus @default(PENDING)
  acceptedAt            DateTime?      // Decision #2: explicit acceptance
  pickedUpAt            DateTime?
  inTransitAt           DateTime?      // Decision #2: explicit IN_TRANSIT action
  deliveredAt           DateTime?

  // DELIVERY PROOF (Decision #5: REQUIRED)
  deliveryNotes         String?
  deliveryProof         String?        // Photo URL or signature - required for DELIVERED

  // FAILURE HANDLING (Decision #3: terminal state)
  failureReason         String?        // Required when status = FAILED

  // TIME TRACKING
  estimatedDeliveryTime DateTime?
  actualDeliveryTime    DateTime?

  // Relationships
  logs                  ShippingLog[]
}
```

**Supports Approved Decisions:**

- ✅ Decision #2 (IN_TRANSIT Explicit): `inTransitAt` timestamp field present
- ✅ Decision #3 (FAILED Terminal): `failureReason` field, no retry fields
- ✅ Decision #5 (Delivery Proof Required): `deliveryProof` field exists
- ✅ Decision #6 (No COD Rollback): No payment-related fields in shipping models

**Field Semantics:**

| Field           | Nullable? | Set When                       | Business Rule                                        |
| --------------- | --------- | ------------------------------ | ---------------------------------------------------- |
| `agentId`       | YES       | Status: PENDING → ASSIGNED     | Manual assignment by admin                           |
| `acceptedAt`    | YES       | Status: ASSIGNED → ACCEPTED    | Agent accepts via app                                |
| `pickedUpAt`    | YES       | Status: ACCEPTED → PICKED_UP   | Agent confirms pickup                                |
| `inTransitAt`   | YES       | Status: PICKED_UP → IN_TRANSIT | Agent explicitly starts delivery                     |
| `deliveredAt`   | YES       | Status: IN_TRANSIT → DELIVERED | Agent confirms delivery                              |
| `deliveryProof` | YES\*     | Status: IN_TRANSIT → DELIVERED | **REQUIRED** before DELIVERED (validated in service) |
| `failureReason` | YES\*     | Status: IN_TRANSIT → FAILED    | **REQUIRED** when FAILED (validated in service)      |

\*Schema allows NULL, but service layer will enforce requirement

### 3. ShippingLog Model

**Location:** `schema.prisma` lines 512-532

**Assessment:** ✅ COMPLETE - No changes needed

**Key Fields:**

```prisma
model ShippingLog {
  id           String          @id @default(uuid())
  assignmentId String

  // STATE TRANSITION TRACKING
  fromStatus   ShippingStatus? // Nullable: null for initial creation
  toStatus     ShippingStatus

  // AUDIT CONTEXT
  changedBy    String?         // User ID or 'system'
  notes        String?         // Additional context
  location     String?         // Delivery location or GPS

  createdAt    DateTime        @default(now())
}
```

**Supports:** Full audit trail for all state transitions

### 4. ShippingStatus Enum

**Location:** `schema.prisma` lines 554-562

**Assessment:** ✅ COMPLETE - Matches approved state machine exactly

```prisma
enum ShippingStatus {
  PENDING    // Initial: awaiting assignment
  ASSIGNED   // Agent assigned, not accepted
  ACCEPTED   // Agent accepted
  PICKED_UP  // Agent picked up from seller
  IN_TRANSIT // En route to buyer (explicit action)
  DELIVERED  // Successfully delivered (terminal)
  FAILED     // Delivery failed (terminal - Decision #3)
  CANCELLED  // Assignment cancelled (terminal)
}
```

**State Machine Coverage:**

| Approved State | Enum Value   | Present? |
| -------------- | ------------ | -------- |
| PENDING        | `PENDING`    | ✅       |
| ASSIGNED       | `ASSIGNED`   | ✅       |
| ACCEPTED       | `ACCEPTED`   | ✅       |
| PICKED_UP      | `PICKED_UP`  | ✅       |
| IN_TRANSIT     | `IN_TRANSIT` | ✅       |
| DELIVERED      | `DELIVERED`  | ✅       |
| FAILED         | `FAILED`     | ✅       |
| CANCELLED      | `CANCELLED`  | ✅       |

**All 8 states from approved design are present.**

### 5. DeliveryAgentStatus Enum

**Location:** `schema.prisma` lines 549-553

**Assessment:** ✅ COMPLETE - No changes needed

```prisma
enum DeliveryAgentStatus {
  ACTIVE     // Available for assignments
  INACTIVE   // Temporarily unavailable
  SUSPENDED  // Suspended due to issues
}
```

### 6. Related Models (Integration Points)

#### Order Model

**Location:** `schema.prisma` lines 241-318

**Key Fields for Shipping Integration:**

```prisma
model Order {
  // Delivery information (READ by shipping)
  deliveryAddress      String
  deliveryCity         String
  deliveryZipCode      String?
  deliveryPhone        String

  // Payment information (READ for COD check)
  paymentMethod        PaymentMethod

  // Order lifecycle (WRITTEN by shipping)
  status               OrderStatus
  shippedAt            DateTime?      // Set when PICKED_UP
  deliveredAt          DateTime?      // Set when DELIVERED
  actualDeliveryDate   DateTime?      // Set when DELIVERED

  // Relationships
  shippingAssignments  ShippingAssignment[]
  payment              Payment?       // For COD capture lookup
}
```

**Assessment:** ✅ All required fields present

**Shipping Service Actions:**

- READ: `deliveryAddress`, `deliveryZipCode`, `paymentMethod`, `payment.id`
- WRITE: `status`, `shippedAt`, `deliveredAt`, `actualDeliveryDate`

#### Payment Model (Read-Only Reference)

**Location:** `schema.prisma` lines 743-781 (Payment module)

**Key Fields Used by Shipping:**

```prisma
model Payment {
  id            String        @id @default(uuid())
  orderId       String        @unique
  paymentMethod PaymentMethod
  lifecycle     PaymentLifecycle
  // ... (other fields not accessed by shipping)
}
```

**Assessment:** ✅ No changes needed

**Shipping Service Actions:**

- READ: `payment.id`, `payment.paymentMethod`, `payment.lifecycle`
- WRITE: **NONE** (delegates to `PaymentService.capturePayment()`)

---

## Schema Changes Required

### NONE

**Reason:** The existing schema was designed with shipping functionality in mind and already contains:

1. ✅ All 8 approved states in `ShippingStatus` enum
2. ✅ All timestamp fields for explicit state transitions
3. ✅ `deliveryProof` field for Decision #5 (required proof)
4. ✅ `failureReason` field for Decision #3 (terminal FAILED state)
5. ✅ `inTransitAt` field for Decision #2 (explicit IN_TRANSIT action)
6. ✅ Agent statistics fields for Decision #4 (synchronous update)
7. ✅ No payment/ledger fields for Decision #7 (no money logic)
8. ✅ Full audit trail via `ShippingLog` model

---

## Validation Rules (Service Layer)

While the schema is complete, the **service layer** must enforce these constraints:

### 1. Delivery Proof Requirement (Decision #5)

```typescript
// VALIDATED IN SERVICE, NOT DATABASE CONSTRAINT
if (newStatus === ShippingStatus.DELIVERED && !deliveryProof) {
  throw new BadRequestException('Delivery proof is required to mark as delivered');
}
```

**Why not database constraint?**

- `deliveryProof` may be null in other states (PENDING, ASSIGNED, etc.)
- Status-dependent validation is better handled in application logic

### 2. Failure Reason Requirement (Decision #3)

```typescript
// VALIDATED IN SERVICE
if (newStatus === ShippingStatus.FAILED && !failureReason) {
  throw new BadRequestException('Failure reason is required when marking delivery as failed');
}
```

### 3. Agent Assignment Validation (Decision #1)

```typescript
// MANUAL ASSIGNMENT ONLY - validated in service
// No auto-assignment, no algorithm
if (agent.status !== DeliveryAgentStatus.ACTIVE) {
  throw new BadRequestException('Agent is not active');
}
if (!agent.isAvailable) {
  throw new BadRequestException('Agent is not available');
}
// Optional: check if deliveryZipCode is in agent.serviceZipCodes
```

### 4. State Transition Validation

```typescript
// Enforce state machine from DESIGN.md
const allowedTransitions: Record<ShippingStatus, ShippingStatus[]> = {
  PENDING: [ShippingStatus.ASSIGNED, ShippingStatus.CANCELLED],
  ASSIGNED: [ShippingStatus.ACCEPTED, ShippingStatus.PENDING, ShippingStatus.CANCELLED],
  ACCEPTED: [ShippingStatus.PICKED_UP],
  PICKED_UP: [ShippingStatus.IN_TRANSIT],
  IN_TRANSIT: [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
  DELIVERED: [], // Terminal
  FAILED: [], // Terminal (Decision #3)
  CANCELLED: [], // Terminal
};
```

---

## Index Coverage Analysis

### Existing Indexes

**DeliveryAgent:**

```prisma
@@index([userId])       // For user → agent lookup
@@index([agentCode])    // For agent search
@@index([isAvailable])  // For manual assignment filtering
@@index([status])       // For active agent queries
```

**Assessment:** ✅ Sufficient for manual assignment queries

**Example Query (Manual Assignment):**

```typescript
// Admin selects agent from filtered list
const availableAgents = await prisma.deliveryAgent.findMany({
  where: {
    status: 'ACTIVE',
    isAvailable: true,
    serviceZipCodes: { has: order.deliveryZipCode },
  },
});
```

**ShippingAssignment:**

```prisma
@@index([orderId])      // For order → assignment lookup
@@index([agentId])      // For agent → assignments lookup
@@index([status])       // For status filtering (dashboards)
@@index([assignedAt])   // For chronological queries
```

**Assessment:** ✅ Covers all query patterns

**ShippingLog:**

```prisma
@@index([assignmentId]) // For assignment → logs lookup
@@index([toStatus])     // For status change queries
@@index([createdAt])    // For chronological queries
```

**Assessment:** ✅ Sufficient for audit trail queries

### No Additional Indexes Needed

The existing indexes support:

- ✅ Manual agent selection queries (by status, availability, zip code)
- ✅ Order → assignment lookups (by orderId)
- ✅ Agent → assignments lookups (by agentId)
- ✅ Status filtering (by status)
- ✅ Audit trail queries (by assignmentId, timestamp)

---

## Migration Plan

### NO MIGRATION REQUIRED

**Reason:** Schema is already complete and production-ready for Sprint 7.

**Next Steps:**

1. ✅ Skip migration creation
2. ⏳ Proceed directly to Phase 3 (ShippingService implementation)

---

## Schema Compliance with Approved Decisions

| Decision # | Decision                   | Schema Support | Evidence                                                 |
| ---------- | -------------------------- | -------------- | -------------------------------------------------------- |
| 1          | Manual assignment only     | ✅             | No auto-assignment fields; `agentId` set manually        |
| 2          | IN_TRANSIT explicit action | ✅             | `inTransitAt` timestamp field exists                     |
| 3          | FAILED terminal (no retry) | ✅             | `failureReason` field; no retry/reassignment fields      |
| 4          | Agent stats synchronous    | ✅             | `totalDeliveries`, `successfulDeliveries` fields present |
| 5          | Delivery proof required    | ✅             | `deliveryProof` field exists (service validates)         |
| 6          | COD failure no rollback    | ✅             | No payment fields in shipping models                     |
| 7          | No money logic             | ✅             | Zero payment/ledger/wallet fields in shipping tables     |

**All 7 approved decisions are supported by existing schema.**

---

## Data Flow Verification

### Scenario: COD Order Delivery (Happy Path)

```
1. Order confirmed (OrderService)
   → ShippingAssignment created: status = PENDING, agentId = NULL

2. Admin assigns agent (ShippingService)
   → UPDATE: status = ASSIGNED, agentId = 'agent-123', assignedBy = 'admin-456'
   → ShippingLog: fromStatus = PENDING, toStatus = ASSIGNED

3. Agent accepts (ShippingService via mobile app)
   → UPDATE: status = ACCEPTED, acceptedAt = NOW()
   → ShippingLog: fromStatus = ASSIGNED, toStatus = ACCEPTED

4. Agent picks up (ShippingService)
   → UPDATE: status = PICKED_UP, pickedUpAt = NOW()
   → UPDATE Order: status = SHIPPING, shippedAt = NOW()
   → ShippingLog: fromStatus = ACCEPTED, toStatus = PICKED_UP

5. Agent starts delivery (ShippingService)
   → UPDATE: status = IN_TRANSIT, inTransitAt = NOW()
   → ShippingLog: fromStatus = PICKED_UP, toStatus = IN_TRANSIT

6. Agent delivers with proof (ShippingService)
   → UPDATE: status = DELIVERED, deliveredAt = NOW(), deliveryProof = 'url'
   → UPDATE Order: status = DELIVERED, deliveredAt = NOW()
   → UPDATE DeliveryAgent: totalDeliveries++, successfulDeliveries++
   → IF Order.paymentMethod = COD:
       CALL PaymentService.capturePayment(payment.id, { confirmedBy, confirmedAt })
         → (Payment module handles ledger/wallet updates)
   → ShippingLog: fromStatus = IN_TRANSIT, toStatus = DELIVERED
```

**Schema Fields Accessed:**

- READ: Order (deliveryAddress, paymentMethod, payment.id)
- WRITE: ShippingAssignment (all status fields)
- WRITE: Order (status, shippedAt, deliveredAt)
- WRITE: DeliveryAgent (statistics)
- CREATE: ShippingLog (audit trail)
- NO ACCESS: Payment, LedgerEntry, Wallet (delegated to PaymentService)

---

## Security Considerations

### Row-Level Security (Service Layer)

**Agent Access:**

```typescript
// Agent can ONLY act on assignments where agentId = agent.userId
const assignment = await prisma.shippingAssignment.findFirst({
  where: {
    id: assignmentId,
    agent: { userId: currentUser.id },
  },
});
```

**Seller Access:**

```typescript
// Seller can ONLY manage shipments for their own orders
// Requires Order → Seller relationship (via Product → Seller)
// Schema does NOT have direct Order.sellerId field
// Must join: Order → OrderItem → Product → User (seller)
```

**Buyer Access:**

```typescript
// Buyer can ONLY view shipments for their own orders
const assignment = await prisma.shippingAssignment.findFirst({
  where: {
    id: assignmentId,
    order: { buyerId: currentUser.id },
  },
});
```

**Schema Assessment:** ✅ Supports all access patterns via existing relationships

---

## Performance Considerations

### Query Patterns (Indexed)

**1. Get all assignments for an agent:**

```sql
SELECT * FROM shipping_assignments
WHERE agent_id = ?
ORDER BY assigned_at DESC;
-- Uses: @@index([agentId])
```

**2. Get assignment for an order:**

```sql
SELECT * FROM shipping_assignments
WHERE order_id = ?
ORDER BY assigned_at DESC
LIMIT 1;
-- Uses: @@index([orderId])
```

**3. Get all PENDING assignments:**

```sql
SELECT * FROM shipping_assignments
WHERE status = 'PENDING'
ORDER BY assigned_at ASC;
-- Uses: @@index([status])
```

**4. Get audit trail for assignment:**

```sql
SELECT * FROM shipping_logs
WHERE assignment_id = ?
ORDER BY created_at ASC;
-- Uses: @@index([assignmentId])
```

**All queries are indexed. No performance concerns.**

---

## Edge Cases (Service Layer Validation)

### 1. Multiple Assignments Per Order

**Schema:** Allows multiple `ShippingAssignment` per `orderId` (no UNIQUE constraint)

**Business Rule:** Only ONE active assignment (status NOT IN [CANCELLED, FAILED]) per order

**Validation:**

```typescript
// Service must check before creating new assignment
const existingActive = await prisma.shippingAssignment.findFirst({
  where: {
    orderId,
    status: { notIn: ['CANCELLED', 'FAILED'] },
  },
});
if (existingActive) {
  throw new ConflictException('Order already has an active shipping assignment');
}
```

### 2. Agent Deletion (Cascade Behavior)

**Schema:** `agent` relation has `onDelete: SetNull`

**Behavior:** If DeliveryAgent deleted → `ShippingAssignment.agentId = NULL`

**Assessment:** ✅ Correct - preserves assignment history, prevents orphaned records

### 3. Order Deletion (Cascade Behavior)

**Schema:** `order` relation has `onDelete: Cascade`

**Behavior:** If Order deleted → ShippingAssignment deleted → ShippingLog deleted

**Assessment:** ✅ Correct - no orphaned shipping data

---

## Recommendation

### ✅ APPROVE EXISTING SCHEMA

**No changes required. Proceed directly to Phase 3: ShippingService implementation.**

**Reasons:**

1. All 8 approved states present in `ShippingStatus` enum
2. All timestamp fields support explicit state transitions
3. All required fields for approved decisions exist
4. No payment/ledger/wallet fields (satisfies Decision #7)
5. All indexes cover expected query patterns
6. Cascade behaviors are correct
7. Full audit trail supported via `ShippingLog`

**Next Phase:**

- Phase 3: Implement `ShippingService` with state machine logic
- Enforce validation rules in service layer
- Integrate with `OrderService` and `PaymentService`

---

## References

- [Sprint 7 Design Document](./DESIGN.md) - Approved state machine and business rules
- [Prisma Schema](../../prisma/schema.prisma) - Lines 438-562 (shipping models)
- [Payment Module README](../payments/README.md) - COD capture integration
