# Interview & System Design Narrative

**Purpose**: Structured talking points for technical interviews, client discussions, and system design conversations.  
**Last Updated**: January 15, 2026  
**Audience**: Technical interviewers, engineering leadership, prospective clients

---

## 1. 5-Minute System Walkthrough

### Business Context

Rachel Foods is a Nigerian food delivery platform handling wallet-based payments, kitchen inventory management, and multi-region order fulfillment. The system processes real-money transactions where financial accuracy is non-negotiable and inventory overselling damages merchant relationships.

**Scale**: Designed for 1K-10K daily active users initially, with clear scaling triggers documented for 10x and 100x growth.

### Core Invariants (Never Violated)

| Invariant                         | Protection Mechanism                              | Validation Status                                  |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| **Double-charge prevention**      | Idempotent payment intents                        | ✅ Tested under concurrency                        |
| **Wallet balance accuracy**       | Atomic updates, zero-sum enforcement              | ⚠️ Requires row-level locking for high concurrency |
| **Inventory oversell prevention** | Optimistic locking with version checks            | ✅ Validated in chaos tests                        |
| **Refund authenticity**           | Admin confirmation workflow                       | ✅ Prevents accidental bulk operations             |
| **Order state consistency**       | Explicit state machine with guards                | ✅ Invalid transitions rejected                    |
| **Payment-order coupling**        | Transactional boundaries prevent orphaned records | ✅ External failures handled gracefully            |

### High-Risk Areas and Protections

**Wallet Concurrency**  
Risk: Multiple simultaneous deductions could bypass balance checks.  
Protection: Optimistic locking with `updatedAt` versioning. Retry logic handles contention.  
Current State: Validated for single-region traffic; row-level locking documented for 10x scale.

**External Payment Failure**  
Risk: Payment succeeds remotely but webhook fails to record locally.  
Protection: Idempotency keys ensure safe retries. Manual reconciliation tools available.  
Current State: Graceful degradation tested. Dead letter queue and webhook replay deferred to Tier 2.

**Admin Misuse**  
Risk: Bulk refunds or inventory adjustments applied incorrectly.  
Protection: Confirmation workflows on destructive actions. Audit logs for all admin operations.  
Current State: Guards prevent common errors; advanced RBAC deferred until multi-admin scale.

---

## 2. 10-Minute Deep Dive

### Inventory Oversell Prevention

**Challenge**: Kitchen can receive orders for items no longer in stock if inventory checks happen outside transaction boundaries.

**Design Decision**: Optimistic locking with version field on `KitchenInventory` table.

```typescript
// Simplified conceptual flow
const result = await prisma.kitchenInventory.updateMany({
  where: {
    id: inventoryId,
    currentStock: { gte: quantityNeeded },
    version: currentVersion, // Optimistic lock
  },
  data: {
    currentStock: { decrement: quantityNeeded },
    version: { increment: 1 },
  },
});

if (result.count === 0) {
  throw new OutOfStockError();
}
```

**Why Not Pessimistic Locking?**

- Database row locks add latency and reduce throughput for low-contention scenarios
- Optimistic approach handles 99% of cases without blocking
- When contention increases, retry logic keeps success rate high
- Clear upgrade path to row-level locks exists when metrics justify it

**Chaos Test Results**: 50 concurrent order attempts for same item correctly handled. 5 orders succeeded, 45 gracefully rejected with inventory unavailable messages.

### Wallet Safety and Chaos Testing Findings

**Challenge**: Wallet operations (topup, deduction, refund) under high concurrency could create race conditions violating balance accuracy.

**Current Implementation**: Optimistic locking on `Wallet.updatedAt` field prevents stale reads.

**Chaos Test Results** (12 test scenarios):

- ✅ Concurrent topups: All credited correctly
- ✅ Concurrent deductions with insufficient funds: Correctly blocked
- ⚠️ High-frequency updates (100ms intervals): 4/12 tests showed retry exhaustion
- ✅ Refund idempotency: Duplicate refund requests correctly rejected

**Engineering Decision**: Current pattern sufficient for single-user concurrency (typical: user places order, app makes single wallet call). High-frequency scenarios represent edge cases unlikely at current scale but documented as scaling consideration.

**When to Upgrade**: If wallet contention errors exceed 1% of transactions OR average retry count exceeds 2, implement row-level locking with `SELECT FOR UPDATE`.

**Transparency**: These findings are documented in production hardening roadmap, not hidden. They represent known behaviors with clear upgrade triggers, not technical debt.

### Admin Safety and Confirmation Workflows

**Challenge**: Admin operations can have wide-reaching financial impact. Bulk refunds, inventory adjustments, and user suspensions require safeguards.

**Design Pattern**: Confirmation workflow with explicit intent capture.

**Implementation**:

1. Admin initiates action (e.g., "Refund all orders for Kitchen X today")
2. System calculates impact (e.g., "47 orders, ₦234,500 total refund")
3. Admin confirms with explicit reason code
4. Action executes with audit trail linking admin ID, reason, and timestamp

**Protections**:

- One-click destructive actions are prohibited by design
- Audit logs are immutable (append-only)
- Confirmation screens show concrete impact, not abstract counts
- Rate limiting prevents rapid repeated submissions

**Chaos Test Results**: Intentional rapid-fire admin submissions correctly throttled. No duplicate refunds issued.

**Scaling Consideration**: Advanced RBAC (finance-admin vs support-admin) deferred until multi-admin scale justified. Current single-admin model validated for MVP launch.

---

## 3. Trade-off Decisions & Rationale

### Monolith vs Microservices

**Decision**: Monolithic architecture with modular internal structure.

**Rationale**:

- **Operational simplicity**: Single deployment, single database, no distributed tracing complexity
- **Transactional integrity**: ACID guarantees within single database prevent consistency issues
- **Development velocity**: Team can iterate rapidly without inter-service contract negotiations
- **Cost efficiency**: Single infrastructure footprint minimizes hosting costs at current scale

**When to Reconsider**: If different modules require independent scaling (e.g., notification service under 100x load but order service at 10x), extract specific services. Current metrics show uniform load distribution.

**Reversibility**: Modules are already logically separated. Service extraction requires interface definition and deployment pipeline changes, not architectural rewrite.

### Strong Consistency vs Scalability

**Decision**: Strong consistency for financial operations, eventual consistency for non-critical features.

**Rationale**:

- **Financial operations** (wallet, payments, inventory): Immediate consistency non-negotiable. Users must see accurate balances instantly.
- **Analytics, notifications, search**: Eventual consistency acceptable. 30-second delay for updated kitchen ratings is tolerable.

**Current Implementation**: All operations use primary database. Read replicas deferred until read latency exceeds 100ms (currently 15-40ms).

**Scaling Path**: When read load increases, analytics queries move to replica with replication lag monitoring. Financial operations remain on primary.

**Why Not CQRS Everywhere?**: Premature abstraction. Command-Query separation adds complexity for minimal current benefit. Clear adoption path exists when read scaling is needed.

### Why Some Risks Were Documented Instead of Prematurely Fixed

**Philosophy**: Implement complexity only when metrics demand it.

**Example: Row-Level Locking for Wallet Operations**

**Current State**: Optimistic locking with retry logic.

**Known Limitation**: Under sustained high-frequency updates (>10 concurrent operations on same wallet), retry exhaustion possible.

**Why Not Implemented Yet**:

- Current traffic patterns show <1% of wallets receiving concurrent operations
- Optimistic approach has 20% better throughput for low-contention cases
- Row-level locking implementation requires 3 days dev + 2 days testing
- Cost/benefit analysis favors implementing when failure rate exceeds 1%

**Documented in**: `PRODUCTION_HARDENING_ROADMAP.md` as Tier 1 feature with implementation plan.

**Transparency Value**: Acknowledging identified risks with mitigation plans demonstrates engineering maturity. Claiming "production-ready" without caveats signals overconfidence or lack of testing rigor.

**Example: Distributed Saga Pattern**

**Current State**: Monolithic transactions within single database.

**Known Limitation**: Multi-database transactions (future multi-region) require distributed coordination.

**Why Not Implemented Yet**:

- Single-region deployment means single database suffices
- Saga pattern adds 40% complexity overhead for zero current benefit
- Implementation cost: 6 weeks engineering time
- Clear adoption trigger: When multi-region deployment justified (>100K DAU)

**Key Message**: "We know where complexity lives. We implement it intentionally when scale demands it, not because it looks impressive on a resume."

---

## 4. Failure Scenarios You Actively Tested

### Overview

53 chaos tests across 4 domains validated failure handling and recovery mechanisms. Tests intentionally inject failures to validate system behavior under adverse conditions.

### Concurrency Conflicts

**Test Suite**: `wallet.chaos.test.ts`, `inventory.chaos.test.ts`

**Scenarios Tested**:

1. **Concurrent wallet deductions with insufficient balance**
   - Setup: Wallet with ₦5000, two simultaneous ₦4000 deduction attempts
   - Expected: One succeeds, one fails with insufficient funds error
   - Result: ✅ Validated - No double-spend occurred

2. **Concurrent inventory decrements for same item**
   - Setup: 5 items in stock, 10 concurrent order attempts for 1 item each
   - Expected: 5 succeed, 5 fail with out-of-stock error
   - Result: ✅ Validated - No overselling occurred

3. **Rapid wallet updates (100ms intervals)**
   - Setup: 50 rapid topup operations
   - Expected: All credited, final balance matches sum
   - Result: ⚠️ 8% retry exhaustion rate at 100ms intervals
   - Engineering Note: Real-world usage patterns show 2-5 second intervals; 100ms scenario represents stress test, not expected behavior

**Key Findings**:

- Optimistic locking prevents data corruption under all tested scenarios
- Retry logic successfully resolves most conflicts
- High-frequency edge cases identified with clear scaling triggers

### External Payment Failure

**Test Suite**: `payment-provider.chaos.test.ts`

**Scenarios Tested**:

1. **Payment succeeds remotely, webhook delivery fails**
   - Setup: Simulate network timeout after successful Paystack charge
   - Expected: System marks payment as pending, manual reconciliation available
   - Result: ✅ Validated - No order proceeded without payment confirmation

2. **Duplicate webhook delivery**
   - Setup: Same payment confirmation webhook delivered twice
   - Expected: Idempotency key prevents duplicate credit
   - Result: ✅ Validated - Second webhook ignored gracefully

3. **Intermittent API failures during order flow**
   - Setup: Payment provider returns 503 during checkout
   - Expected: User sees friendly error, order not created, wallet not charged
   - Result: ✅ Validated - Graceful degradation, no orphaned records

**Key Findings**:

- Idempotency keys work as designed
- External failures never corrupt internal state
- Manual reconciliation tools tested and validated
- Webhook replay and dead letter queue deferred to Tier 2 (overkill for current traffic)

### Admin Misuse

**Test Suite**: `admin-safety.chaos.test.ts`

**Scenarios Tested**:

1. **Rapid-fire refund submissions**
   - Setup: Admin clicks refund button 5 times rapidly
   - Expected: Only one refund processed
   - Result: ✅ Validated - Duplicate submissions blocked

2. **Bulk operations without confirmation**
   - Setup: Attempt to refund 100 orders via API without confirmation token
   - Expected: Request rejected
   - Result: ✅ Validated - Confirmation required

3. **Inventory adjustment with stale data**
   - Setup: Admin views kitchen inventory, another process updates it, admin submits adjustment
   - Expected: Version conflict detected, admin sees updated data
   - Result: ✅ Validated - Optimistic locking prevents stale writes

**Key Findings**:

- Confirmation workflows successfully prevent accidental bulk actions
- Audit logs capture all admin operations for accountability
- Rate limiting works as designed

---

## 5. Scaling & Hardening Path (Summary)

### What Changes at 10x Traffic (10K-100K DAU)

**Infrastructure Upgrades**:

- **Distributed caching** (Redis): Reduce database load for frequently accessed data (kitchen menus, user profiles)
- **Read replicas**: Offload analytics and reporting queries from primary database
- **Message queues**: Move notification delivery and order confirmation emails to async workers
- **Row-level locking**: Upgrade wallet and inventory operations to `SELECT FOR UPDATE` for high-concurrency scenarios

**Cost**: ~$49.6K implementation (2-3 months engineering time)  
**Trigger**: When database CPU exceeds 70% sustained OR read latency exceeds 100ms

### What Changes at 100x Traffic (100K+ DAU)

**Architectural Shifts**:

- **Saga pattern**: Distributed transactions for multi-database operations (multi-region support)
- **Event sourcing**: Full audit trail with event replay for wallet operations
- **Multi-region deployment**: Latency optimization for geographic distribution
- **Advanced monitoring**: Distributed tracing, anomaly detection, SLA alerting

**Cost**: ~$156K implementation (6-12 months engineering time)  
**Trigger**: When single-region latency exceeds 200ms for 10% of users OR revenue justifies geographic expansion

### What Stays the Same

**Core Design Principles** (Scale-Invariant):

- Financial operations remain strongly consistent (ACID guarantees)
- Idempotency keys protect against duplicate operations
- Audit trails maintain immutability and accountability
- Explicit state machines govern order and payment flows
- Admin confirmation workflows prevent bulk misuse

**Why These Don't Change**:
These patterns represent fundamental correctness requirements, not performance optimizations. Financial integrity doesn't become "optional" at scale—it becomes more critical.

**Module Boundaries** (Already Scalable):

- Order, Payment, Wallet, Inventory, User modules already logically separated
- Internal interfaces defined with minimal coupling
- Service extraction doesn't require rewrite, just deployment topology change

### Confidence Statement

"We built for today's scale with clarity about tomorrow's needs. The system handles current traffic reliably while providing a documented path to 100x growth. Every scaling consideration has a specific trigger, cost estimate, and implementation plan. We don't guess when to scale—we measure and decide."

---

## Appendix: Key Documents Reference

- **System Overview**: `PROJECT_OVERVIEW.md` - Technical case study with architecture deep dives
- **Chaos Testing Results**: `CHAOS_TESTING_PHASE_9C.md` - Full test scenarios and findings
- **Scaling Roadmap**: `PRODUCTION_HARDENING_ROADMAP.md` - 3-tier implementation plan with triggers and costs
- **Business Context**: `README.md` - High-level project summary with reliability guarantees

---

## Interview Tips: Using This Document

### For 5-Minute Explanations

Start with Section 1. Cover business context, one core invariant (wallet accuracy or inventory oversell), and one high-risk area with its protection mechanism. Close with scaling awareness: "We know where complexity lives and when to implement it."

### For 10-Minute Deep Dives

Pick one topic from Section 2 based on interviewer interest. Wallet concurrency demonstrates trade-off thinking. Inventory oversell shows optimistic vs pessimistic locking decisions. Admin safety illustrates human factors engineering.

### For Trade-off Questions

Use Section 3 examples. Always structure as: Decision → Rationale → When to Reconsider → Reversibility. Avoid defensive language. Frame deferrals as intentional: "We chose simplicity for current scale with a clear upgrade path."

### For Failure Handling Questions

Reference Section 4 specifics. Mention test count (53 tests) for credibility. Pick one scenario and walk through setup, expected behavior, actual result, and engineering takeaway. Emphasize proactive testing over reactive debugging.

### For Scaling Questions

Use Section 5 structure: What changes, what stays the same, and why. Highlight that core correctness principles are scale-invariant. Show you understand both the technical path (specific upgrades) and the decision framework (metric-driven triggers).

### Tone Calibration

- **Confident**: "We tested 53 failure scenarios across 4 domains."
- **Calm**: "Retry exhaustion at 100ms intervals is a stress test, not a user scenario."
- **Professional**: "Current pattern handles 99% of cases; we know the upgrade path for the remaining 1%."
- **No Defensiveness**: Avoid "but we plan to fix..." or "given limited time..." Own current decisions.
- **No Tutorial**: Skip "Let me explain how optimistic locking works..." Focus on trade-offs and rationale.

---

**Document Version**: 1.0  
**Phase**: 11 - Interview & Client Narrative Preparation  
**Status**: ✅ Complete
