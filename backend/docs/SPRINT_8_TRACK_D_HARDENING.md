# Sprint 8 - Track D: Hardening & Scale

## Document Status

**Phase:** Design & Specification  
**Status:** DRAFT - Awaiting Approval  
**Date:** 2026-01-02  
**NO CODE IMPLEMENTATION YET**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Concurrency & Isolation](#concurrency--isolation)
4. [Observability & Monitoring](#observability--monitoring)
5. [Structured Error Handling](#structured-error-handling)
6. [Hot Path Optimization](#hot-path-optimization)
7. [Load Assumptions](#load-assumptions)
8. [Database Indexing](#database-indexing)
9. [Connection Pooling](#connection-pooling)
10. [Out of Scope](#out-of-scope)

---

## Overview

Track D focuses on **production readiness** by adding concurrency safeguards, improving observability, standardizing error handling, and optimizing performance bottlenecks identified during Sprint 7 implementation.

### Primary Goals

1. **Concurrency Safety**: Identify and protect critical sections from race conditions
2. **Observability**: Comprehensive structured logging and error tracking
3. **Error Standardization**: Consistent error response formats across modules
4. **Hot Path Optimization**: Index and optimize frequently-executed queries
5. **Load Documentation**: Explicit capacity assumptions and bottlenecks

### Non-Goals

- ❌ Premature optimization (no speculative performance work)
- ❌ Distributed tracing (single-instance deployment)
- ❌ Horizontal scaling (vertical scaling sufficient for now)
- ❌ Complex caching layers (in-memory cache only)
- ❌ Load balancing (single-instance deployment)

---

## Core Principles

### 1. Optimize After Measurement

```typescript
// ❌ FORBIDDEN - Premature optimization
const cachedResult = await this.cache.get(key);
if (cachedResult) return cachedResult; // Before knowing it's slow

// ✅ CORRECT - Measure first, optimize hot paths
const startTime = Date.now();
const result = await this.prisma.order.findMany({ ... });
const duration = Date.now() - startTime;

if (duration > 500) {
  this.logger.warn({ event: 'slow_query', duration, method: 'findOrders' });
}
```

### 2. Fail Fast, Log Everything

```typescript
// ❌ BAD - Silent failure
try {
  await this.notificationService.send(...);
} catch (error) {
  // Swallowed error
}

// ✅ GOOD - Log and re-throw or handle explicitly
try {
  await this.notificationService.send(...);
} catch (error) {
  this.logger.error({
    event: 'notification_send_failed',
    orderId,
    error: error.message,
    stack: error.stack,
  });
  // Decide: re-throw or continue?
}
```

### 3. Pessimistic Concurrency Where Justified

Only use row-level locking for actual contention scenarios:

```typescript
// ✅ JUSTIFIED - Multiple agents might accept same assignment
const assignment = await prisma.$transaction(async (tx) => {
  const current = await tx.shippingAssignment.findUnique({
    where: { id: assignmentId },
    // FOR UPDATE lock
  });

  if (current.agentId !== null) {
    throw new ConflictException('Assignment already taken');
  }

  return tx.shippingAssignment.update({
    where: { id: assignmentId },
    data: { agentId, status: 'ASSIGNED' },
  });
});
```

### 4. Document Load Assumptions

Every service MUST document its expected load profile:

```typescript
/**
 * PaymentService
 *
 * Load Assumptions:
 * - Peak: 500 payments/hour (8.3/min)
 * - Average: 100 payments/hour (1.67/min)
 * - P99 response time: < 1s for capture
 * - Concurrent captures: < 10 per second
 *
 * Bottlenecks:
 * - LedgerService writes (3-5 entries per payment)
 * - Wallet balance queries (serializable transactions)
 */
```

---

## Concurrency & Isolation

### Identified Race Conditions

#### 1. Wallet Balance Updates (Already Protected)

**Scenario:** Multiple concurrent payments deducting from same wallet

**Current Protection:** Serializable transaction isolation

```typescript
// In PaymentService.capturePayment()
await this.prisma.$transaction(
  async (tx) => {
    // 1. Check wallet balance
    const balance = await this.walletService.getBalance(payerWalletId, tx);

    // 2. Validate sufficient funds
    if (balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient funds');
    }

    // 3. Create ledger entries (atomic)
    await this.ledgerService.recordEntries([...], tx);
  },
  {
    isolationLevel: 'Serializable', // Already implemented
  }
);
```

**Status:** ✅ Already protected (Sprint 6A)

---

#### 2. Agent Assignment Acceptance

**Scenario:** Two agents simultaneously accepting the same assignment

**Current Risk:** Optimistic concurrency (last write wins)

**Mitigation:** Add row-level lock

```typescript
// BEFORE (Sprint 7)
const assignment = await this.prisma.shippingAssignment.findUnique({
  where: { id: assignmentId },
});

if (assignment.agentId && assignment.agentId !== agentId) {
  throw new BadRequestException('Assignment taken by another agent');
}

await this.prisma.shippingAssignment.update({
  where: { id: assignmentId },
  data: { status: 'ACCEPTED', acceptedAt: new Date() },
});

// AFTER (Sprint 8 Track D)
const assignment = await this.prisma.$transaction(async (tx) => {
  // SELECT FOR UPDATE (row-level lock)
  const current = await tx.$queryRaw`
    SELECT * FROM shipping_assignments
    WHERE id = ${assignmentId}
    FOR UPDATE;
  `;

  if (current[0].agent_id && current[0].agent_id !== agentId) {
    throw new ConflictException('Assignment already accepted');
  }

  return tx.shippingAssignment.update({
    where: { id: assignmentId },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });
});
```

**Status:** 🔄 Needs implementation

---

#### 3. Platform Wallet Concurrent Writes

**Scenario:** Multiple payments simultaneously crediting platform wallet (fee collection)

**Current Risk:** Potential ledger entry conflicts

**Mitigation:** Already using idempotency keys

```typescript
// In LedgerService.recordEntries()
const entries = [
  {
    walletId: platformWalletId,
    amount: platformFee,
    entryType: 'PLATFORM_FEE_CREDIT',
    idempotencyKey: `payment_${paymentId}_platform_fee`, // Unique per payment
  },
];

// Unique constraint on idempotencyKey prevents duplicates
```

**Status:** ✅ Already protected (idempotency keys)

---

#### 4. Order Status Transitions

**Scenario:** Concurrent status updates (e.g., seller confirms + buyer cancels simultaneously)

**Current Risk:** State machine violation

**Mitigation:** Optimistic locking with version check

```typescript
// BEFORE
await this.prisma.order.update({
  where: { id: orderId },
  data: { status: 'CONFIRMED' },
});

// AFTER (with optimistic lock)
const updated = await this.prisma.order.updateMany({
  where: {
    id: orderId,
    status: 'PENDING', // Explicitly check current status
  },
  data: { status: 'CONFIRMED' },
});

if (updated.count === 0) {
  throw new ConflictException('Order status changed - refresh and retry');
}
```

**Status:** 🔄 Needs implementation (Order module)

---

### Concurrency Decision Matrix

| Scenario                    | Risk Level | Mitigation                     | Sprint 8 Action                   |
| --------------------------- | ---------- | ------------------------------ | --------------------------------- |
| Wallet balance updates      | HIGH       | Serializable transactions      | ✅ Already implemented (Sprint 6) |
| Platform wallet writes      | MEDIUM     | Idempotency keys               | ✅ Already implemented (Sprint 6) |
| Agent assignment acceptance | MEDIUM     | Row-level lock (FOR UPDATE)    | 🔄 Implement in Track D           |
| Order status transitions    | MEDIUM     | Optimistic locking             | 🔄 Implement in Track D           |
| Refund approval             | LOW        | Single admin action (unlikely) | ⏸️ No action needed               |
| Delivery confirmation       | LOW        | Single agent action            | ⏸️ No action needed               |

---

## Observability & Monitoring

### Structured Logging Standards

All logs MUST follow this format:

```typescript
interface LogEntry {
  event: string; // Kebab-case event name
  timestamp?: string; // ISO 8601 (auto-added by logger)
  level?: 'log' | 'warn' | 'error' | 'debug'; // Auto-detected

  // Context
  userId?: string;
  orderId?: string;
  paymentId?: string;
  assignmentId?: string;

  // Metrics
  duration?: number; // Milliseconds

  // Error details (if error level)
  error?: string; // Error message
  stack?: string; // Stack trace (errors only)

  // Custom fields per event
  [key: string]: any;
}
```

### Event Naming Convention

Format: `{domain}_{action}_{status}`

Examples:

- `payment_capture_started`
- `payment_capture_completed`
- `payment_capture_failed`
- `shipping_assignment_accepted`
- `webhook_delivery_failed`

### Critical Events to Log

| Event                          | Level | Required Fields                        |
| ------------------------------ | ----- | -------------------------------------- |
| `payment_capture_started`      | log   | paymentId, orderId, amount, method     |
| `payment_capture_completed`    | log   | paymentId, orderId, duration           |
| `payment_capture_failed`       | error | paymentId, orderId, error, stack       |
| `ledger_invariant_violated`    | error | paymentId, sumActual, sumExpected      |
| `shipping_assignment_conflict` | warn  | assignmentId, agentId, conflict reason |
| `webhook_delivery_failed`      | warn  | deliveryId, eventType, attempt, error  |
| `slow_query`                   | warn  | method, duration, query (sanitized)    |
| `cache_hit`                    | debug | cacheKey                               |
| `cache_miss`                   | debug | cacheKey                               |

### Performance Metrics

Track these metrics in logs for analysis:

```typescript
// In performance-critical methods
async capturePayment(dto: CapturePaymentDto) {
  const startTime = Date.now();

  try {
    const result = await this.executeCaptureLogic(dto);

    const duration = Date.now() - startTime;
    this.logger.log({
      event: 'payment_capture_completed',
      paymentId: result.id,
      orderId: dto.orderId,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error({
      event: 'payment_capture_failed',
      paymentId: dto.paymentId,
      orderId: dto.orderId,
      duration,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
```

### Alerting Thresholds (Documentation Only)

Define thresholds for future alerting:

| Metric                        | Threshold | Alert Level |
| ----------------------------- | --------- | ----------- |
| Payment capture P95 latency   | > 1000ms  | WARNING     |
| Payment capture error rate    | > 5%      | CRITICAL    |
| Ledger invariant violations   | > 0       | CRITICAL    |
| Webhook delivery failure rate | > 20%     | WARNING     |
| Database connection pool full | > 90%     | WARNING     |
| Slow queries (> 500ms)        | > 10/min  | WARNING     |

---

## Structured Error Handling

### Error Response Format

All API errors MUST return this structure:

```typescript
interface ErrorResponse {
  statusCode: number; // HTTP status code
  error: string; // Error type (e.g., 'BadRequestException')
  message: string; // Human-readable message
  timestamp: string; // ISO 8601
  path: string; // Request path

  // Optional fields
  details?: any; // Additional context
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### Global Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerErrorException';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = (exceptionResponse as any).details;
      }

      error = exception.constructor.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      status = HttpStatus.BAD_REQUEST;
      message = this.parsePrismaError(exception);
      error = 'DatabaseException';
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.constructor.name;
    }

    // Log error
    this.logger.error({
      event: 'http_exception',
      statusCode: status,
      error,
      message,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.id,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Send response
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    });
  }

  private parsePrismaError(error: Prisma.PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2003':
        return 'Foreign key constraint violation';
      case 'P2025':
        return 'Record not found';
      default:
        return 'Database error';
    }
  }
}
```

### Business Exception Classes

```typescript
// Custom exception for business rule violations
export class BusinessRuleException extends BadRequestException {
  constructor(
    message: string,
    public readonly ruleViolated: string,
    public readonly context?: any,
  ) {
    super({
      message,
      details: {
        ruleViolated,
        context,
      },
    });
  }
}

// Usage
throw new BusinessRuleException(
  'Order cannot be cancelled after shipment',
  'ORDER_CANCELLATION_WINDOW_EXPIRED',
  { orderId, currentStatus: 'SHIPPING' },
);
```

---

## Hot Path Optimization

### Identified Hot Paths

Based on Sprint 7 implementation, these are the most frequently-executed queries:

#### 1. Order Retrieval with Relations

**Query:**

```typescript
await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    payment: true,
    shippingAssignments: true,
  },
});
```

**Optimization:**

```sql
-- Ensure indexes exist
CREATE INDEX idx_orders_id ON orders(id); -- Already exists (primary key)
CREATE INDEX idx_payments_order_id ON payments(order_id); -- Should exist
CREATE INDEX idx_shipping_assignments_order_id ON shipping_assignments(order_id); -- Should exist
```

**Measurement:** Log queries > 100ms

---

#### 2. Wallet Balance Calculation

**Query:**

```sql
SELECT SUM(amount) as balance
FROM ledger_entries
WHERE wallet_id = $1;
```

**Current Issue:** Full table scan of ledger entries per wallet

**Optimization:** Add composite index

```sql
CREATE INDEX idx_ledger_entries_wallet_amount
  ON ledger_entries(wallet_id, amount);
```

**Alternative:** Materialized wallet balance (future optimization, not Sprint 8)

---

#### 3. Agent Assignments by Status

**Query:**

```typescript
await prisma.shippingAssignment.findMany({
  where: {
    agentId: agentId,
    status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
  },
});
```

**Optimization:**

```sql
CREATE INDEX idx_shipping_assignments_agent_status
  ON shipping_assignments(agent_id, status);
```

**Already exists** from Sprint 7

---

#### 4. Payment Lookup by Order

**Query:**

```typescript
await prisma.payment.findFirst({
  where: { orderId: orderId },
});
```

**Optimization:**

```sql
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

**Verify index exists**

---

### Slow Query Detection

Add interceptor to log slow Prisma queries:

```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Log slow queries
    (this as any).$on('query', (e: any) => {
      if (e.duration > 100) {
        // 100ms threshold
        this.logger.warn({
          event: 'slow_query',
          duration: e.duration,
          query: e.query.substring(0, 200), // Truncate long queries
          params: e.params,
        });
      }
    });
  }
}
```

---

## Load Assumptions

### Expected Traffic (Initial Launch)

| Metric                     | Average  | Peak   | Daily Total |
| -------------------------- | -------- | ------ | ----------- |
| Orders created             | 50/hour  | 200/hr | 1,200       |
| Payments initiated         | 50/hour  | 200/hr | 1,200       |
| Payments captured          | 30/hour  | 120/hr | 720         |
| Deliveries confirmed       | 20/hour  | 80/hr  | 480         |
| Agent assignments          | 40/hour  | 150/hr | 960         |
| Webhook deliveries         | 100/hour | 400/hr | 2,400       |
| Admin metrics API requests | 10/hour  | 50/hr  | 240         |

### Database Capacity

**Connection Pool:**

```typescript
// Prisma connection pool configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // connection_limit = 10 (default)
}
```

**Recommended Pool Size:** 10-20 connections

**Calculation:**

- Average concurrent requests: 5-10
- Transaction duration: 50-200ms
- Connection utilization: 50-70%

**Monitor:** Log when pool is > 80% utilized

---

### Scaling Triggers

When to consider vertical scaling (increase server resources):

1. Database connection pool consistently > 80% utilized
2. P95 response time > 1s for critical endpoints
3. CPU utilization > 70% sustained
4. Memory usage > 80%
5. Webhook delivery backlog > 1000 pending

**Current capacity sufficient for:**

- ~50-100 concurrent users
- ~5,000 orders/day
- ~10,000 webhooks/day

---

## Database Indexing

### Index Audit

Verify these indexes exist from previous sprints:

```sql
-- Orders
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_lifecycle ON payments(lifecycle);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);

-- Ledger Entries
CREATE INDEX idx_ledger_entries_wallet_id ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_entries_payment_id ON ledger_entries(payment_id);
CREATE INDEX idx_ledger_entries_idempotency_key ON ledger_entries(idempotency_key);

-- Shipping Assignments
CREATE INDEX idx_shipping_assignments_order_id ON shipping_assignments(order_id);
CREATE INDEX idx_shipping_assignments_agent_id ON shipping_assignments(agent_id);
CREATE INDEX idx_shipping_assignments_status ON shipping_assignments(status);

-- Delivery Agents
CREATE INDEX idx_delivery_agents_user_id ON delivery_agents(user_id);
CREATE INDEX idx_delivery_agents_status ON delivery_agents(status);
CREATE INDEX idx_delivery_agents_is_available ON delivery_agents(is_available);
```

### New Indexes for Sprint 8

```sql
-- Composite index for wallet balance queries
CREATE INDEX idx_ledger_entries_wallet_amount
  ON ledger_entries(wallet_id, amount);

-- Composite index for agent active assignments
CREATE INDEX idx_shipping_assignments_agent_status
  ON shipping_assignments(agent_id, status);

-- Composite index for SLA queries (Track B)
CREATE INDEX idx_shipping_assignments_delivered_sla
  ON shipping_assignments(status, delivered_at, estimated_delivery_time)
  WHERE status = 'DELIVERED';

-- GIN index for zip code queries (Track B)
CREATE INDEX idx_delivery_agents_zip_codes
  ON delivery_agents USING GIN (service_zip_codes);

-- Webhook outbox queries (Track C)
CREATE INDEX idx_webhook_deliveries_status_retry
  ON webhook_deliveries(status, next_retry_at);
CREATE INDEX idx_webhook_deliveries_subscription
  ON webhook_deliveries(webhook_subscription_id, status);
```

### Index Maintenance

Add to monthly maintenance runbook:

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Unused indexes (0 scans)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexname NOT LIKE 'pg_%';

-- Rebuild fragmented indexes
REINDEX TABLE orders;
REINDEX TABLE payments;
REINDEX TABLE ledger_entries;
```

---

## Connection Pooling

### Prisma Configuration

```typescript
// Recommended DATABASE_URL format
DATABASE_URL =
  'postgresql://user:password@localhost:5432/rachelfoods?schema=public&connection_limit=15&pool_timeout=20';
```

### Connection Pool Monitoring

Add health check endpoint:

```typescript
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('db')
  async checkDatabase() {
    const startTime = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - startTime;

      return {
        status: 'healthy',
        latency: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('pool')
  async checkPoolStats() {
    // Requires pg-pool package
    const pool = (this.prisma as any)._engine._connectionPool;

    return {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
      utilization: ((pool.totalCount - pool.idleCount) / pool.totalCount) * 100,
    };
  }
}
```

---

## Out of Scope

### Not Included in Sprint 8

1. ❌ **Distributed tracing**: Single-instance deployment
2. ❌ **APM tools**: Datadog, New Relic, etc. (future integration)
3. ❌ **Horizontal scaling**: Load balancing, multi-instance deployment
4. ❌ **Redis caching**: In-memory cache sufficient
5. ❌ **Read replicas**: Single PostgreSQL instance
6. ❌ **CDN integration**: Static asset optimization
7. ❌ **Rate limiting**: Basic throttling only (future)

### Future Enhancements

1. **APM Integration**: Datadog or New Relic for distributed tracing
2. **Redis caching**: Externalized cache for multi-instance deployments
3. **Database read replicas**: Separate read/write traffic
4. **Load balancing**: Nginx or AWS ALB for multiple instances
5. **Circuit breakers**: Resilience4j or similar for external dependencies

---

## Implementation Checklist

### Phase 1: Concurrency Safeguards

- [ ] Add row-level lock for agent assignment acceptance
- [ ] Add optimistic locking for order status transitions
- [ ] Test concurrent assignment acceptance (stress test)
- [ ] Test concurrent order status updates (stress test)

### Phase 2: Observability

- [ ] Implement global exception filter
- [ ] Add structured logging to all services
- [ ] Add slow query logging (Prisma interceptor)
- [ ] Add performance metrics logging
- [ ] Add health check endpoints

### Phase 3: Error Handling

- [ ] Create `BusinessRuleException` class
- [ ] Standardize error responses across modules
- [ ] Add Prisma error parsing
- [ ] Test error responses for all endpoints

### Phase 4: Indexing

- [ ] Audit existing indexes (verify from previous sprints)
- [ ] Create new composite indexes for Sprint 8 queries
- [ ] Test query performance before/after indexing
- [ ] Document index maintenance procedures

### Phase 5: Load Testing

- [ ] Create load test scripts (K6, Artillery, or similar)
- [ ] Test peak load scenarios (200 orders/hour)
- [ ] Measure P95/P99 latencies under load
- [ ] Identify bottlenecks and document capacity limits

### Phase 6: Documentation

- [ ] Document load assumptions and scaling triggers
- [ ] Create observability runbook (log event reference)
- [ ] Create database maintenance runbook
- [ ] Update deployment guide with connection pool config

---

## Success Criteria

1. ✅ Zero race conditions in critical sections (tested with concurrent requests)
2. ✅ All services emit structured logs with consistent format
3. ✅ All API errors return standardized error responses
4. ✅ P95 latency < 500ms for core endpoints under expected load
5. ✅ Slow queries (> 100ms) logged with context
6. ✅ Health check endpoints return accurate status
7. ✅ All new indexes created and verified
8. ✅ Load assumptions documented with clear scaling triggers

---

## Approval Required

**Before implementation begins:**

1. Approve concurrency safeguards (row locks, optimistic locking)
2. Confirm structured logging format and event naming
3. Verify error response format
4. Approve new database indexes
5. Confirm load assumptions and capacity targets

**Design approved by:** _[Awaiting approval]_  
**Date:** _[Pending]_
