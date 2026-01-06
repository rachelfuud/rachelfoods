# Sprint 8 - Track C: Webhooks & External Integrations

## Document Status

**Phase:** Design & Specification  
**Status:** DRAFT - Awaiting Approval  
**Date:** 2026-01-02  
**NO CODE IMPLEMENTATION YET**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Domain Events](#domain-events)
4. [Webhook Outbox Pattern](#webhook-outbox-pattern)
5. [Webhook Dispatcher](#webhook-dispatcher)
6. [Security & Signatures](#security--signatures)
7. [Retry Strategy](#retry-strategy)
8. [Event Schema](#event-schema)
9. [Integration Points](#integration-points)
10. [Out of Scope](#out-of-scope)

---

## Overview

Track C introduces **outbound webhook delivery** for key business events, enabling external systems to receive real-time notifications about orders, payments, and deliveries without polling the API.

### Primary Goals

1. **Domain Events**: Emit internal events for key business actions (post-commit only)
2. **Webhook Outbox**: Reliable append-only queue for webhook deliveries
3. **Dispatcher**: Background worker to deliver webhooks with retries and backoff
4. **Security**: HMAC signature verification for webhook authenticity
5. **Observability**: Comprehensive logging and delivery tracking

### Non-Goals

- ❌ Inbound webhooks (receiving from external systems)
- ❌ Synchronous webhook delivery (all async via outbox)
- ❌ Custom event transformations (fixed schema per event type)
- ❌ Webhook management UI (API-only configuration)
- ❌ Event replay/reprocessing (append-only, no updates)

---

## Core Principles

### 1. Post-Commit Only

Events MUST be emitted AFTER database transactions commit:

```typescript
// ✅ CORRECT - Emit after transaction commits
await prisma.$transaction([
  prisma.order.update({ ... }),
  prisma.payment.update({ ... }),
]);

// Transaction committed - now emit event
this.eventEmitter.emit('order.confirmed', { orderId });

// ❌ FORBIDDEN - Emitting inside transaction
await prisma.$transaction([
  prisma.order.update({ ... }),
  this.eventEmitter.emit('order.confirmed', { orderId }), // ❌ TOO EARLY
]);
```

### 2. Append-Only Outbox

The `webhook_deliveries` table is **append-only**:

```typescript
// ✅ ALLOWED - Insert new webhook delivery
await prisma.webhookDelivery.create({
  webhookSubscriptionId,
  eventType: 'order.confirmed',
  payload: { ... },
  status: 'PENDING',
});

// ❌ FORBIDDEN - Update or delete existing deliveries
await prisma.webhookDelivery.update({ ... }); // ❌ NO UPDATES
await prisma.webhookDelivery.delete({ ... }); // ❌ NO DELETES
```

**Exception:** Dispatcher can update `status`, `attempt_count`, `last_attempt_at`, `next_retry_at`, `delivered_at`, `error_message` for retry logic.

### 3. Side-Effect Free

Webhook delivery failures MUST NOT affect business operations:

```typescript
// ✅ CORRECT - Order confirmed regardless of webhook
await confirmOrder(orderId);

try {
  await this.webhookService.enqueueDelivery('order.confirmed', payload);
} catch (error) {
  // Log error but don't throw - order is still confirmed
  this.logger.error({ event: 'webhook_enqueue_failed', error });
}
```

### 4. Idempotency for Subscribers

Webhook payloads MUST include idempotency keys to help subscribers deduplicate:

```json
{
  "eventId": "evt_abc123",
  "eventType": "order.confirmed",
  "timestamp": "2026-01-02T10:30:00Z",
  "idempotencyKey": "order_confirmed_abc123_1704192600",
  "data": { ... }
}
```

### 5. No Business Logic in Dispatcher

Dispatcher is a **dumb delivery worker**:

- ✅ Fetch pending webhooks from outbox
- ✅ Send HTTP POST with signature
- ✅ Update delivery status based on response
- ✅ Schedule retries with exponential backoff
- ❌ NO validation of business rules
- ❌ NO modification of event payloads
- ❌ NO triggering of additional business logic

---

## Domain Events

### Event-Driven Architecture

```
┌─────────────────┐
│  Service Layer  │ (PaymentService, ShippingService, OrderService)
└────────┬────────┘
         │ emits event (post-commit)
         ▼
┌─────────────────┐
│  EventEmitter   │ (NestJS @nestjs/event-emitter)
└────────┬────────┘
         │ triggers listeners
         ▼
┌─────────────────┐
│ WebhookService  │ (Enqueues delivery in outbox)
└────────┬────────┘
         │ writes to
         ▼
┌─────────────────┐
│ webhook_outbox  │ (Append-only queue)
└─────────────────┘
         │ polled by
         ▼
┌─────────────────┐
│WebhookDispatcher│ (Background worker)
└────────┬────────┘
         │ sends HTTP POST
         ▼
┌─────────────────┐
│External System  │ (Subscriber endpoint)
└─────────────────┘
```

### Event Types

| Event Type            | Triggered By                      | Payload                                 |
| --------------------- | --------------------------------- | --------------------------------------- |
| `order.confirmed`     | OrderService.confirmOrder()       | Order ID, number, buyer, seller, total  |
| `order.cancelled`     | OrderService.cancelOrder()        | Order ID, number, cancellation reason   |
| `order.delivered`     | ShippingService.confirmDelivery() | Order ID, number, delivered_at          |
| `payment.captured`    | PaymentService.capturePayment()   | Payment ID, order ID, amount, method    |
| `payment.failed`      | PaymentService.capturePayment()   | Payment ID, order ID, error reason      |
| `refund.initiated`    | RefundService.initiateRefund()    | Refund ID, payment ID, amount, reason   |
| `refund.completed`    | RefundService.processRefund()     | Refund ID, payment ID, completed_at     |
| `shipment.assigned`   | ShippingService.assignAgent()     | Assignment ID, order ID, agent code     |
| `shipment.picked_up`  | ShippingService.confirmPickup()   | Assignment ID, order ID, picked_up_at   |
| `shipment.in_transit` | ShippingService.startTransit()    | Assignment ID, order ID, in_transit_at  |
| `shipment.failed`     | ShippingService.reportFailure()   | Assignment ID, order ID, failure_reason |

### Event Emission Pattern

```typescript
// In PaymentService.capturePayment()
async capturePayment(dto: CapturePaymentDto) {
  // Business logic and database transaction
  const payment = await this.prisma.$transaction(async (tx) => {
    // ... capture logic
  });

  // Transaction committed - emit event
  this.eventEmitter.emit('payment.captured', {
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    method: payment.paymentMethod,
    capturedAt: payment.capturedAt,
  });

  return payment;
}
```

---

## Webhook Outbox Pattern

### Schema: webhook_subscriptions

```prisma
model WebhookSubscription {
  id        String   @id @default(uuid())

  // Subscriber info
  url       String   // Endpoint to POST to
  eventTypes String[] // Array of subscribed event types (e.g., ['order.confirmed', 'payment.captured'])
  secret    String   // HMAC secret for signature verification

  // Status
  isActive  Boolean  @default(true)

  // Metadata
  description String?
  createdBy   String  // User ID who created subscription
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  deliveries WebhookDelivery[]

  @@index([isActive])
  @@map("webhook_subscriptions")
}
```

### Schema: webhook_deliveries (Outbox)

```prisma
model WebhookDelivery {
  id        String   @id @default(uuid())

  // Subscription
  webhookSubscriptionId String
  subscription          WebhookSubscription @relation(fields: [webhookSubscriptionId], references: [id], onDelete: Cascade)

  // Event details
  eventId       String   // Unique event ID (idempotency)
  eventType     String   // e.g., 'order.confirmed'
  payload       Json     // Event data

  // Delivery status
  status        WebhookDeliveryStatus @default(PENDING)
  attemptCount  Int      @default(0)
  maxRetries    Int      @default(5)

  // Timestamps
  createdAt     DateTime @default(now())
  lastAttemptAt DateTime?
  nextRetryAt   DateTime?
  deliveredAt   DateTime?

  // Response tracking
  responseStatus Int?     // HTTP status code
  responseBody   String?  // Response body (truncated to 1000 chars)
  errorMessage   String?  // Error message if delivery failed

  @@index([webhookSubscriptionId, status])
  @@index([status, nextRetryAt])
  @@index([eventType])
  @@index([createdAt])
  @@map("webhook_deliveries")
}

enum WebhookDeliveryStatus {
  PENDING   // Waiting to be sent
  SENDING   // Currently being sent
  DELIVERED // Successfully delivered (2xx response)
  FAILED    // Permanently failed (max retries exceeded)
  CANCELLED // Subscription was disabled
}
```

### NO-GO: Updating Existing Deliveries

```typescript
// ❌ FORBIDDEN - Don't update event payloads
await prisma.webhookDelivery.update({
  where: { id: deliveryId },
  data: { payload: newPayload }, // ❌ NEVER MODIFY PAYLOAD
});

// ✅ ALLOWED - Only dispatcher updates status/retry fields
await prisma.webhookDelivery.update({
  where: { id: deliveryId },
  data: {
    status: 'DELIVERED',
    attemptCount: { increment: 1 },
    lastAttemptAt: new Date(),
    deliveredAt: new Date(),
    responseStatus: 200,
  },
});
```

---

## Webhook Dispatcher

### Background Worker

```typescript
@Injectable()
export class WebhookDispatcher {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private logger: Logger,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds
  async processOutbox() {
    this.logger.log({ event: 'webhook_dispatch_started' });

    // Fetch pending/retry-ready webhooks (batch of 50)
    const pendingDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: ['PENDING', 'SENDING'] },
        OR: [
          { nextRetryAt: null }, // Never attempted
          { nextRetryAt: { lte: new Date() } }, // Retry time reached
        ],
      },
      include: { subscription: true },
      take: 50,
      orderBy: { createdAt: 'asc' }, // FIFO
    });

    this.logger.log({
      event: 'webhook_batch_fetched',
      count: pendingDeliveries.length,
    });

    // Process each delivery
    for (const delivery of pendingDeliveries) {
      await this.deliverWebhook(delivery);
    }
  }

  private async deliverWebhook(delivery: WebhookDelivery & { subscription: WebhookSubscription }) {
    const { id, subscription, payload, eventType, attemptCount, maxRetries } = delivery;

    // Skip if subscription is inactive
    if (!subscription.isActive) {
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: { status: 'CANCELLED', errorMessage: 'Subscription inactive' },
      });
      return;
    }

    // Check max retries
    if (attemptCount >= maxRetries) {
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: `Max retries (${maxRetries}) exceeded`,
        },
      });
      this.logger.error({
        event: 'webhook_delivery_failed_permanently',
        deliveryId: id,
        eventType,
        attemptCount,
      });
      return;
    }

    // Mark as SENDING
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: { status: 'SENDING', lastAttemptAt: new Date() },
    });

    try {
      // Generate HMAC signature
      const signature = this.generateSignature(payload, subscription.secret);

      // Send HTTP POST
      const response = await this.httpService.axiosRef.post(subscription.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event-Type': eventType,
          'X-Webhook-Delivery-ID': id,
        },
        timeout: 10000, // 10 second timeout
      });

      // Success (2xx response)
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          attemptCount: { increment: 1 },
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000),
        },
      });

      this.logger.log({
        event: 'webhook_delivered',
        deliveryId: id,
        eventType,
        attempt: attemptCount + 1,
        responseStatus: response.status,
      });
    } catch (error) {
      // Failure - schedule retry with exponential backoff
      const nextRetryAt = this.calculateNextRetry(attemptCount);

      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: 'PENDING', // Back to pending for retry
          attemptCount: { increment: 1 },
          nextRetryAt,
          errorMessage: error.message.substring(0, 500),
          responseStatus: error.response?.status,
        },
      });

      this.logger.warn({
        event: 'webhook_delivery_failed_retrying',
        deliveryId: id,
        eventType,
        attempt: attemptCount + 1,
        error: error.message,
        nextRetryAt,
      });
    }
  }

  private calculateNextRetry(attemptCount: number): Date {
    // Exponential backoff: 30s, 60s, 2min, 5min, 15min
    const delaySeconds = [30, 60, 120, 300, 900][attemptCount] || 900;
    return new Date(Date.now() + delaySeconds * 1000);
  }

  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }
}
```

### Dispatcher Lifecycle

```
PENDING (nextRetryAt = null)
   ↓
SENDING (attempt in progress)
   ↓
   ├─ Success (2xx) → DELIVERED (done)
   │
   └─ Failure
      ├─ attemptCount < maxRetries → PENDING (schedule retry)
      └─ attemptCount >= maxRetries → FAILED (permanent)
```

---

## Security & Signatures

### HMAC Signature Generation

```typescript
// Webhook payload
const payload = {
  eventId: 'evt_abc123',
  eventType: 'order.confirmed',
  timestamp: '2026-01-02T10:30:00Z',
  data: { orderId: 'order_123', ... },
};

// Generate signature
const secret = subscription.secret; // Random 32-byte secret
const hmac = crypto.createHmac('sha256', secret);
hmac.update(JSON.stringify(payload));
const signature = `sha256=${hmac.digest('hex')}`;

// Send in header
headers: {
  'X-Webhook-Signature': signature,
}
```

### Subscriber Verification (Documentation)

Subscribers MUST verify signatures:

```typescript
// Subscriber code (external system)
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// Express endpoint example
app.post('/webhooks/rachel-foods', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!verifyWebhookSignature(JSON.stringify(req.body), signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  // ...

  res.status(200).json({ received: true });
});
```

---

## Retry Strategy

### Retry Schedule

| Attempt | Delay | Cumulative Time |
| ------- | ----- | --------------- |
| 1       | 0s    | 0s              |
| 2       | 30s   | 30s             |
| 3       | 60s   | 90s             |
| 4       | 2min  | 3min 30s        |
| 5       | 5min  | 8min 30s        |
| 6       | 15min | 23min 30s       |

**Max retries:** 5 (total 6 attempts)

### Success Criteria

- HTTP 2xx response = success (DELIVERED)
- HTTP 4xx (except 408, 429) = permanent failure (FAILED)
- HTTP 5xx or network error = retry
- Timeout (10s) = retry

### Failure Handling

```typescript
if (response.status >= 200 && response.status < 300) {
  // Success
  status = 'DELIVERED';
} else if (response.status === 408 || response.status === 429 || response.status >= 500) {
  // Retry
  status = 'PENDING';
  nextRetryAt = calculateNextRetry(attemptCount);
} else {
  // Permanent failure (4xx other than 408/429)
  status = 'FAILED';
}
```

---

## Event Schema

### Base Event Structure

All webhook payloads follow this structure:

```typescript
interface WebhookEvent<T = any> {
  eventId: string; // Unique event ID (UUID)
  eventType: string; // e.g., 'order.confirmed'
  timestamp: string; // ISO 8601 timestamp
  idempotencyKey: string; // For subscriber deduplication
  data: T; // Event-specific payload
}
```

### Event Payloads

#### order.confirmed

```json
{
  "eventId": "evt_123",
  "eventType": "order.confirmed",
  "timestamp": "2026-01-02T10:30:00Z",
  "idempotencyKey": "order_confirmed_order123_1704192600",
  "data": {
    "orderId": "order_123",
    "orderNumber": "ORD-2026-001",
    "buyerId": "buyer_456",
    "sellerId": "seller_789",
    "totalAmount": 1050.0,
    "currency": "USD",
    "paymentMethod": "COD",
    "confirmedAt": "2026-01-02T10:30:00Z"
  }
}
```

#### payment.captured

```json
{
  "eventId": "evt_456",
  "eventType": "payment.captured",
  "timestamp": "2026-01-02T11:00:00Z",
  "idempotencyKey": "payment_captured_pay789_1704194400",
  "data": {
    "paymentId": "pay_789",
    "orderId": "order_123",
    "orderNumber": "ORD-2026-001",
    "amount": 1050.0,
    "currency": "USD",
    "paymentMethod": "COD",
    "capturedAt": "2026-01-02T11:00:00Z",
    "confirmedBy": "agent_001"
  }
}
```

#### shipment.delivered

```json
{
  "eventId": "evt_789",
  "eventType": "shipment.delivered",
  "timestamp": "2026-01-02T11:00:00Z",
  "idempotencyKey": "shipment_delivered_ship456_1704194400",
  "data": {
    "assignmentId": "ship_456",
    "orderId": "order_123",
    "orderNumber": "ORD-2026-001",
    "agentCode": "DA-001",
    "deliveredAt": "2026-01-02T11:00:00Z",
    "deliveryProof": "https://cdn.example.com/proof123.jpg"
  }
}
```

---

## Integration Points

### Emitting Events from Services

#### PaymentService

```typescript
// After successful payment capture
this.eventEmitter.emit('payment.captured', {
  paymentId: payment.id,
  orderId: payment.orderId,
  amount: payment.amount.toNumber(),
  method: payment.paymentMethod,
  capturedAt: payment.capturedAt,
});

// After payment failure
this.eventEmitter.emit('payment.failed', {
  paymentId: payment.id,
  orderId: payment.orderId,
  errorReason: error.message,
});
```

#### ShippingService

```typescript
// After delivery confirmation
this.eventEmitter.emit('shipment.delivered', {
  assignmentId: assignment.id,
  orderId: assignment.orderId,
  agentCode: assignment.agent.agentCode,
  deliveredAt: assignment.deliveredAt,
  deliveryProof: assignment.deliveryProof,
});
```

#### OrderService

```typescript
// After order confirmation
this.eventEmitter.emit('order.confirmed', {
  orderId: order.id,
  orderNumber: order.orderNumber,
  buyerId: order.buyerId,
  sellerId: order.sellerId,
  totalAmount: order.totalCost.toNumber(),
  paymentMethod: order.paymentMethod,
  confirmedAt: order.confirmedAt,
});
```

### WebhookService (Listener)

```typescript
@Injectable()
export class WebhookService {
  constructor(private prisma: PrismaService) {}

  @OnEvent('**', { async: true })
  async handleEvent(eventType: string, eventData: any) {
    // Find subscriptions for this event type
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        isActive: true,
        eventTypes: { has: eventType },
      },
    });

    if (subscriptions.length === 0) {
      return; // No subscribers
    }

    // Enqueue deliveries (append-only)
    const deliveries = subscriptions.map((sub) => ({
      webhookSubscriptionId: sub.id,
      eventId: `evt_${uuidv4()}`,
      eventType,
      payload: {
        eventId: `evt_${uuidv4()}`,
        eventType,
        timestamp: new Date().toISOString(),
        idempotencyKey: `${eventType}_${eventData.orderId || eventData.paymentId}_${Date.now()}`,
        data: eventData,
      },
      status: 'PENDING',
    }));

    await this.prisma.webhookDelivery.createMany({
      data: deliveries,
    });

    this.logger.log({
      event: 'webhooks_enqueued',
      eventType,
      count: deliveries.length,
    });
  }
}
```

---

## Out of Scope

### Not Included in Sprint 8

1. ❌ **Inbound webhooks**: No receiving webhooks from external systems
2. ❌ **Webhook management UI**: API-only subscription management
3. ❌ **Event replay**: No manual replay/reprocessing of failed webhooks
4. ❌ **Custom transformations**: Fixed event schema per type
5. ❌ **Webhooks for all events**: Limited to core business events (order, payment, shipment)
6. ❌ **Multi-tenant webhooks**: Single platform instance
7. ❌ **Webhook batching**: One HTTP POST per event

### Future Enhancements

1. **Webhook management UI**: Admin dashboard for subscriptions
2. **Manual retry**: Admin endpoint to retry failed webhooks
3. **Event filtering**: Conditional webhooks based on filters (e.g., only orders > $100)
4. **Batching**: Combine multiple events into single HTTP POST
5. **Dead letter queue**: Permanent storage for failed webhooks
6. **Webhook analytics**: Delivery success rates, latency metrics

---

## Implementation Checklist

### Phase 1: Schema & Models

- [ ] Create `webhook_subscriptions` table (via Prisma migration)
- [ ] Create `webhook_deliveries` outbox table
- [ ] Add `WebhookDeliveryStatus` enum
- [ ] Verify indexes on outbox table

### Phase 2: Event Emission

- [ ] Configure `@nestjs/event-emitter` module
- [ ] Add event emission to `PaymentService.capturePayment()`
- [ ] Add event emission to `ShippingService.confirmDelivery()`
- [ ] Add event emission to `OrderService.confirmOrder()`
- [ ] Add event emission for all defined event types

### Phase 3: Webhook Service

- [ ] Create `WebhookService` with event listeners
- [ ] Implement `enqueueDelivery()` method (append-only)
- [ ] Add structured logging for enqueue operations

### Phase 4: Webhook Dispatcher

- [ ] Create `WebhookDispatcher` background worker
- [ ] Implement cron job to poll outbox (every 30s)
- [ ] Implement HTTP POST with HMAC signatures
- [ ] Implement retry logic with exponential backoff
- [ ] Add status tracking and error handling

### Phase 5: Subscription Management API

- [ ] Create `WebhookSubscriptionsController` (admin only)
- [ ] Implement `POST /api/admin/webhooks/subscriptions`
- [ ] Implement `GET /api/admin/webhooks/subscriptions`
- [ ] Implement `GET /api/admin/webhooks/subscriptions/:id/deliveries`
- [ ] Add RBAC guards (PLATFORM_ADMIN only)

### Phase 6: Testing

- [ ] Unit tests for `WebhookService`
- [ ] Unit tests for `WebhookDispatcher`
- [ ] Integration tests for event emission
- [ ] End-to-end tests with mock webhook endpoint
- [ ] Test retry logic and exponential backoff
- [ ] Test HMAC signature verification

### Phase 7: Documentation

- [ ] Webhook subscriber guide (signature verification)
- [ ] Event schema documentation
- [ ] Retry policy documentation
- [ ] API documentation for subscription management

---

## Success Criteria

1. ✅ Events emitted post-commit for all defined event types
2. ✅ Webhooks enqueued in append-only outbox
3. ✅ Dispatcher delivers webhooks with retries
4. ✅ HMAC signatures generated correctly
5. ✅ Failed deliveries retry with exponential backoff
6. ✅ Max retries (5) enforced, permanent failures marked
7. ✅ Zero impact on core business operations if webhooks fail
8. ✅ All webhook operations logged with structured data

---

## Approval Required

**Before implementation begins:**

1. Approve schema for `webhook_subscriptions` and `webhook_deliveries` tables
2. Confirm event types and payload schemas
3. Verify retry strategy and max retries
4. Approve HMAC signature approach
5. Confirm dispatcher polling interval (30s)

**Design approved by:** _[Awaiting approval]_  
**Date:** _[Pending]_
