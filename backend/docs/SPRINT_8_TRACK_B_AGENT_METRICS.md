# Sprint 8 - Track B: Agent Operations & Metrics

## Document Status

**Phase:** Design & Specification  
**Status:** DRAFT - Awaiting Approval  
**Date:** 2026-01-02  
**NO CODE IMPLEMENTATION YET**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Read-Only Contract](#read-only-contract)
4. [Metrics & Analytics](#metrics--analytics)
5. [Service Architecture](#service-architecture)
6. [API Endpoints](#api-endpoints)
7. [Caching Strategy](#caching-strategy)
8. [Performance Optimization](#performance-optimization)
9. [RBAC & Security](#rbac--security)
10. [Out of Scope](#out-of-scope)

---

## Overview

Track B introduces **read-only analytics and performance tracking** for delivery agents, enabling administrators to monitor agent efficiency, SLA compliance, and operational metrics without modifying core shipping data.

### Primary Goals

1. **Agent Performance Dashboard**: Aggregated metrics per agent (success rate, avg delivery time, total deliveries)
2. **SLA Monitoring**: Track on-time delivery rates, missed deadlines, avg delays
3. **Workload Distribution**: View active assignments, agent availability, geographic coverage
4. **Historical Analytics**: Time-series data for trends and forecasting
5. **Admin-Only Access**: Restrict to ADMIN and PLATFORM_ADMIN roles

### Non-Goals

- ❌ Modify agent assignments or status
- ❌ Update delivery agent profiles
- ❌ Write to any core tables (DeliveryAgent, ShippingAssignment, ShippingLog)
- ❌ Real-time streaming (polling/refresh acceptable)
- ❌ Agent-facing analytics (admin only)

---

## Core Principles

### 1. Read-Only Service

```typescript
// ✅ ALLOWED - Read queries only
const metrics = await prisma.shippingAssignment.groupBy({
  by: ['agentId'],
  where: { status: 'DELIVERED' },
  _count: { id: true },
  _avg: { actualDeliveryTime: true },
});

// ❌ FORBIDDEN - No writes
await prisma.deliveryAgent.update({ ... });
await prisma.shippingAssignment.update({ ... });
```

### 2. Aggregation Over Iteration

Use database aggregation functions instead of fetching + processing in application:

```typescript
// ✅ GOOD - Database aggregation
SELECT
  agent_id,
  COUNT(*) as total_deliveries,
  COUNT(*) FILTER (WHERE status = 'DELIVERED') as successful,
  AVG(EXTRACT(EPOCH FROM (delivered_at - picked_up_at))) as avg_delivery_time_seconds
FROM shipping_assignments
WHERE status IN ('DELIVERED', 'FAILED')
GROUP BY agent_id;

// ❌ BAD - Application-level aggregation
const assignments = await prisma.shippingAssignment.findMany();
const grouped = assignments.reduce(...); // Expensive!
```

### 3. Caching for Expensive Queries

- Cache aggregated metrics for 5-15 minutes
- Invalidate on relevant events (optional optimization)
- Use in-memory cache (NestJS Cache Manager)
- Document cache TTLs in code

### 4. Admin-Only Access

All endpoints restricted to:

- `PLATFORM_ADMIN` role (full access)
- `ADMIN` role (read-only metrics)
- NO access for agents, sellers, buyers

---

## Read-Only Contract

### Absolute Prohibitions

This service MUST NEVER:

1. ❌ Write to `delivery_agents` table
2. ❌ Write to `shipping_assignments` table
3. ❌ Write to `shipping_logs` table
4. ❌ Modify any shipping status or lifecycle
5. ❌ Update agent availability or assignment
6. ❌ Trigger side effects (webhooks, notifications, etc.)

### Allowed Operations

1. ✅ SELECT queries with WHERE, JOIN, GROUP BY, aggregation functions
2. ✅ Read from `delivery_agents`, `shipping_assignments`, `shipping_logs`, `orders`
3. ✅ Compute derived metrics in-memory (after fetching)
4. ✅ Cache results temporarily (no persistent cache writes)

---

## Metrics & Analytics

### 1. Agent Performance Metrics

**Endpoint:** `GET /api/admin/agents/metrics/:agentId`

**Metrics:**

```typescript
interface AgentPerformanceMetrics {
  agentId: string;
  agentCode: string;
  agentName: string; // From User relation

  // Delivery Stats
  totalAssignments: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  cancelledAssignments: number;
  successRate: number; // successfulDeliveries / totalDeliveries * 100

  // Time-based Metrics
  avgPickupTime: number; // Minutes from ASSIGNED to PICKED_UP
  avgTransitTime: number; // Minutes from PICKED_UP to DELIVERED
  avgTotalDeliveryTime: number; // Minutes from ASSIGNED to DELIVERED

  // SLA Compliance
  onTimeDeliveries: number; // delivered_at <= estimated_delivery_time
  lateDeliveries: number; // delivered_at > estimated_delivery_time
  onTimeRate: number; // onTimeDeliveries / totalDeliveries * 100
  avgDelayMinutes: number; // For late deliveries only

  // Current Status
  currentAssignments: number; // status IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  isAvailable: boolean;
  status: DeliveryAgentStatus;

  // Period
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}
```

**Query Strategy:**

```sql
-- Performance metrics aggregation
SELECT
  da.id as agent_id,
  da.agent_code,
  u.first_name || ' ' || u.last_name as agent_name,

  -- Delivery stats
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE sa.status = 'DELIVERED') as total_deliveries,
  COUNT(*) FILTER (WHERE sa.status = 'DELIVERED') as successful_deliveries,
  COUNT(*) FILTER (WHERE sa.status = 'FAILED') as failed_deliveries,
  COUNT(*) FILTER (WHERE sa.status = 'CANCELLED') as cancelled_assignments,

  -- Time-based metrics (in minutes)
  AVG(EXTRACT(EPOCH FROM (sa.picked_up_at - sa.assigned_at)) / 60)
    FILTER (WHERE sa.picked_up_at IS NOT NULL) as avg_pickup_time,
  AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.picked_up_at)) / 60)
    FILTER (WHERE sa.delivered_at IS NOT NULL) as avg_transit_time,
  AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.assigned_at)) / 60)
    FILTER (WHERE sa.delivered_at IS NOT NULL) as avg_total_delivery_time,

  -- SLA compliance
  COUNT(*) FILTER (WHERE sa.status = 'DELIVERED' AND sa.delivered_at <= sa.estimated_delivery_time) as on_time_deliveries,
  COUNT(*) FILTER (WHERE sa.status = 'DELIVERED' AND sa.delivered_at > sa.estimated_delivery_time) as late_deliveries,
  AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.estimated_delivery_time)) / 60)
    FILTER (WHERE sa.delivered_at > sa.estimated_delivery_time) as avg_delay_minutes,

  -- Current workload
  COUNT(*) FILTER (WHERE sa.status IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')) as current_assignments,

  da.is_available,
  da.status

FROM delivery_agents da
INNER JOIN users u ON da.user_id = u.id
LEFT JOIN shipping_assignments sa ON da.id = sa.agent_id
  AND sa.assigned_at >= $1 -- periodStart
  AND sa.assigned_at < $2   -- periodEnd
WHERE da.id = $3
GROUP BY da.id, da.agent_code, u.first_name, u.last_name, da.is_available, da.status;
```

**Caching:** 10 minutes TTL

---

### 2. Agent Leaderboard

**Endpoint:** `GET /api/admin/agents/leaderboard`

**Query Params:**

- `period`: `today` | `week` | `month` | `quarter` | `year`
- `sortBy`: `successRate` | `totalDeliveries` | `onTimeRate` | `avgDeliveryTime`
- `order`: `asc` | `desc`
- `limit`: number (default 50, max 500)

**Response:**

```typescript
interface AgentLeaderboardEntry {
  rank: number;
  agentId: string;
  agentCode: string;
  agentName: string;
  totalDeliveries: number;
  successRate: number;
  onTimeRate: number;
  avgDeliveryTimeMinutes: number;
}

interface AgentLeaderboard {
  entries: AgentLeaderboardEntry[];
  period: {
    start: Date;
    end: Date;
    label: string; // e.g., "Today", "This Week"
  };
  sortedBy: string;
  total: number;
}
```

**Caching:** 15 minutes TTL

---

### 3. Geographic Coverage Report

**Endpoint:** `GET /api/admin/agents/geographic-coverage`

**Response:**

```typescript
interface GeographicCoverageReport {
  zipCodes: Array<{
    zipCode: string;
    activeAgents: number;
    availableAgents: number;
    totalDeliveriesThisMonth: number;
    avgDeliveryTimeMinutes: number;
  }>;
  underservedZipCodes: string[]; // Zip codes with < 2 active agents
  calculatedAt: Date;
}
```

**Query:**

```sql
SELECT
  zip.zip_code,
  COUNT(DISTINCT da.id) as active_agents,
  COUNT(DISTINCT da.id) FILTER (WHERE da.is_available = true) as available_agents,
  COUNT(sa.id) FILTER (WHERE sa.delivered_at >= date_trunc('month', CURRENT_DATE)) as total_deliveries_this_month,
  AVG(EXTRACT(EPOCH FROM (sa.delivered_at - sa.assigned_at)) / 60) as avg_delivery_time_minutes
FROM (
  SELECT DISTINCT unnest(service_zip_codes) as zip_code
  FROM delivery_agents
) zip
LEFT JOIN delivery_agents da ON zip.zip_code = ANY(da.service_zip_codes)
  AND da.status = 'ACTIVE'
LEFT JOIN shipping_assignments sa ON da.id = sa.agent_id
  AND sa.status = 'DELIVERED'
GROUP BY zip.zip_code
ORDER BY active_agents ASC, total_deliveries_this_month ASC;
```

**Caching:** 30 minutes TTL

---

### 4. SLA Compliance Summary

**Endpoint:** `GET /api/admin/agents/sla-summary`

**Query Params:**

- `period`: `today` | `week` | `month` | `quarter`
- `agentId`: optional (all agents if omitted)

**Response:**

```typescript
interface SLAComplianceSummary {
  period: {
    start: Date;
    end: Date;
    label: string;
  };

  overall: {
    totalDeliveries: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    onTimeRate: number; // percentage
    avgDelayMinutes: number; // for late deliveries
  };

  byAgent: Array<{
    agentId: string;
    agentCode: string;
    agentName: string;
    totalDeliveries: number;
    onTimeDeliveries: number;
    onTimeRate: number;
    avgDelayMinutes: number;
  }>;

  criticalDelays: Array<{
    assignmentId: string;
    orderNumber: string;
    agentCode: string;
    estimatedDeliveryTime: Date;
    actualDeliveryTime: Date;
    delayMinutes: number;
  }>; // Delays > 120 minutes

  calculatedAt: Date;
}
```

**Caching:** 10 minutes TTL

---

### 5. Agent Activity Timeline

**Endpoint:** `GET /api/admin/agents/:agentId/activity`

**Query Params:**

- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `limit`: number (default 100, max 1000)
- `offset`: number (pagination)

**Response:**

```typescript
interface AgentActivityTimeline {
  agentId: string;
  agentCode: string;

  activities: Array<{
    timestamp: Date;
    event:
      | 'assignment_accepted'
      | 'pickup_confirmed'
      | 'transit_started'
      | 'delivery_confirmed'
      | 'delivery_failed'
      | 'assignment_cancelled';
    assignmentId: string;
    orderNumber: string;
    fromStatus: ShippingStatus | null;
    toStatus: ShippingStatus;
    notes?: string;
  }>;

  total: number;
  hasMore: boolean;
}
```

**Source:** `shipping_logs` table

**Caching:** None (real-time log data)

---

## Service Architecture

### AgentMetricsService

```typescript
@Injectable()
export class AgentMetricsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private logger: Logger,
  ) {}

  // Agent-specific metrics
  async getAgentPerformanceMetrics(
    agentId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<AgentPerformanceMetrics> {
    const cacheKey = `agent_metrics:${agentId}:${periodStart.getTime()}:${periodEnd.getTime()}`;
    const cached = await this.cacheManager.get<AgentPerformanceMetrics>(cacheKey);

    if (cached) {
      this.logger.log({ event: 'cache_hit', cacheKey });
      return cached;
    }

    // Execute aggregation query (see SQL above)
    const result = await this.executeAgentMetricsQuery(agentId, periodStart, periodEnd);

    // Cache for 10 minutes
    await this.cacheManager.set(cacheKey, result, 600000);

    return result;
  }

  // Leaderboard
  async getAgentLeaderboard(
    period: 'today' | 'week' | 'month' | 'quarter' | 'year',
    sortBy: 'successRate' | 'totalDeliveries' | 'onTimeRate' | 'avgDeliveryTime',
    order: 'asc' | 'desc',
    limit: number,
  ): Promise<AgentLeaderboard> {
    // Implementation with caching
  }

  // Geographic coverage
  async getGeographicCoverage(): Promise<GeographicCoverageReport> {
    // Implementation with caching
  }

  // SLA summary
  async getSLAComplianceSummary(
    period: 'today' | 'week' | 'month' | 'quarter',
    agentId?: string,
  ): Promise<SLAComplianceSummary> {
    // Implementation with caching
  }

  // Activity timeline
  async getAgentActivityTimeline(
    agentId: string,
    startDate: Date,
    endDate: Date,
    limit: number,
    offset: number,
  ): Promise<AgentActivityTimeline> {
    // No caching - real-time logs
  }

  // Helper: Execute raw SQL for complex aggregations
  private async executeAgentMetricsQuery(
    agentId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<AgentPerformanceMetrics> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT ...
      FROM delivery_agents da
      ...
    `;

    // Transform and calculate derived metrics
    return this.transformToAgentMetrics(result[0]);
  }
}
```

---

## API Endpoints

### Admin Agent Metrics Controller

```typescript
@Controller('api/admin/agents')
@UseGuards(AuthGuard, RoleGuard)
@Roles('ADMIN', 'PLATFORM_ADMIN')
export class AdminAgentMetricsController {
  constructor(private agentMetricsService: AgentMetricsService) {}

  @Get('metrics/:agentId')
  async getAgentMetrics(
    @Param('agentId') agentId: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    const start = periodStart ? new Date(periodStart) : startOfMonth(new Date());
    const end = periodEnd ? new Date(periodEnd) : new Date();

    return this.agentMetricsService.getAgentPerformanceMetrics(agentId, start, end);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('period') period: string = 'month',
    @Query('sortBy') sortBy: string = 'successRate',
    @Query('order') order: string = 'desc',
    @Query('limit') limit: number = 50,
  ) {
    return this.agentMetricsService.getAgentLeaderboard(
      period as any,
      sortBy as any,
      order as any,
      Math.min(limit, 500),
    );
  }

  @Get('geographic-coverage')
  async getGeographicCoverage() {
    return this.agentMetricsService.getGeographicCoverage();
  }

  @Get('sla-summary')
  async getSLASummary(
    @Query('period') period: string = 'month',
    @Query('agentId') agentId?: string,
  ) {
    return this.agentMetricsService.getSLAComplianceSummary(period as any, agentId);
  }

  @Get(':agentId/activity')
  async getAgentActivity(
    @Param('agentId') agentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ) {
    return this.agentMetricsService.getAgentActivityTimeline(
      agentId,
      new Date(startDate),
      new Date(endDate),
      Math.min(limit, 1000),
      offset,
    );
  }
}
```

---

## Caching Strategy

### Cache Keys

Format: `{prefix}:{entity}:{params hash}`

Examples:

- `agent_metrics:abc123:1704067200000:1706745600000`
- `leaderboard:month:successRate:desc:50`
- `geo_coverage:all`
- `sla_summary:week:all`

### TTL Configuration

| Metric Type               | TTL      | Rationale                              |
| ------------------------- | -------- | -------------------------------------- |
| Agent Performance Metrics | 10 min   | Balance freshness with query cost      |
| Leaderboard               | 15 min   | Competitive data can be slightly stale |
| Geographic Coverage       | 30 min   | Changes slowly, expensive aggregation  |
| SLA Summary               | 10 min   | Important for admin decisions          |
| Activity Timeline         | No cache | Real-time log data                     |

### Cache Implementation

Use **NestJS Cache Manager** with in-memory store:

```typescript
// app.module.ts
CacheModule.register({
  isGlobal: true,
  ttl: 600, // Default 10 minutes
  max: 1000, // Max 1000 entries
});
```

### Cache Invalidation (Optional Optimization)

- Cache invalidation NOT required in v1 (TTL-based expiry sufficient)
- Future optimization: Invalidate on relevant events (e.g., delivery confirmed)
- Use event-driven cache invalidation in Track C (webhooks)

---

## Performance Optimization

### 1. Database Indexing

Verify these indexes exist (from Sprint 7):

```sql
-- Existing indexes (should already exist)
CREATE INDEX idx_shipping_assignments_agent_id ON shipping_assignments(agent_id);
CREATE INDEX idx_shipping_assignments_status ON shipping_assignments(status);
CREATE INDEX idx_shipping_assignments_assigned_at ON shipping_assignments(assigned_at);
CREATE INDEX idx_delivery_agents_status ON delivery_agents(status);
CREATE INDEX idx_delivery_agents_is_available ON delivery_agents(is_available);
```

**Additional composite indexes** for metrics queries:

```sql
-- Composite index for agent + period + status queries
CREATE INDEX idx_shipping_assignments_agent_period_status
  ON shipping_assignments(agent_id, assigned_at, status);

-- Composite index for SLA queries (on-time delivery)
CREATE INDEX idx_shipping_assignments_delivered_sla
  ON shipping_assignments(status, delivered_at, estimated_delivery_time)
  WHERE status = 'DELIVERED';

-- Index for geographic coverage queries
CREATE INDEX idx_delivery_agents_zip_codes
  ON delivery_agents USING GIN (service_zip_codes);
```

### 2. Query Optimization

- Use `$queryRaw` for complex aggregations (Prisma ORM overhead avoided)
- Leverage PostgreSQL `FILTER` clause for conditional aggregations
- Use `date_trunc()` for period grouping
- Limit result sets aggressively (default limits + max caps)

### 3. Pagination

- All list endpoints support `limit` and `offset`
- Default limits: 50-100 items
- Max limits: 500-1000 items
- Return `total` count for UI pagination

### 4. Monitoring

Log slow queries (> 500ms) with structured logging:

```typescript
const startTime = Date.now();
const result = await this.executeAgentMetricsQuery(...);
const duration = Date.now() - startTime;

if (duration > 500) {
  this.logger.warn({
    event: 'slow_query',
    method: 'getAgentPerformanceMetrics',
    agentId,
    durationMs: duration,
  });
}
```

---

## RBAC & Security

### Access Control

All endpoints restricted to:

- **PLATFORM_ADMIN**: Full read access
- **ADMIN**: Full read access
- **Other roles**: 403 Forbidden

### Authorization Decorator

```typescript
@Roles('ADMIN', 'PLATFORM_ADMIN')
@UseGuards(AuthGuard, RoleGuard)
```

### Data Privacy

- Agent metrics do NOT expose sensitive payment data
- PII limited to agent code and name (from User table)
- No buyer/seller contact information
- Order numbers included for traceability (admin only)

### Rate Limiting (Future)

- Consider rate limiting for expensive queries (geographic coverage, leaderboard)
- Not implemented in Sprint 8 (add in future hardening sprint)

---

## Out of Scope

### Not Included in Sprint 8

1. ❌ **Agent-facing dashboard**: Analytics are admin-only
2. ❌ **Real-time streaming**: Polling/refresh model sufficient
3. ❌ **Forecasting/ML**: Simple aggregations only
4. ❌ **Alerts/notifications**: Pure read service
5. ❌ **Exporting to CSV/PDF**: API-only responses
6. ❌ **Multi-tenancy**: Single platform instance
7. ❌ **Historical snapshots**: Live aggregation only

### Future Enhancements

1. **Agent self-service dashboard**: Read-only view of own metrics
2. **Automated SLA violation alerts**: Integration with Track C webhooks
3. **Predictive analytics**: ML-based delivery time estimation
4. **Data export**: CSV/Excel download endpoints
5. **Comparison tools**: Agent vs. agent benchmarking

---

## Implementation Checklist

### Phase 1: Service Implementation

- [ ] Create `AgentMetricsService` with read-only queries
- [ ] Implement agent performance metrics calculation
- [ ] Implement leaderboard with sorting/filtering
- [ ] Implement geographic coverage report
- [ ] Implement SLA compliance summary
- [ ] Implement activity timeline (log-based)

### Phase 2: Controller & RBAC

- [ ] Create `AdminAgentMetricsController`
- [ ] Add RBAC guards (ADMIN, PLATFORM_ADMIN only)
- [ ] Implement query param validation
- [ ] Add pagination support
- [ ] Implement caching layer

### Phase 3: Performance & Indexing

- [ ] Verify existing indexes (Sprint 7)
- [ ] Add new composite indexes
- [ ] Test query performance with realistic data
- [ ] Optimize slow queries (> 500ms)
- [ ] Add slow query logging

### Phase 4: Testing

- [ ] Unit tests for `AgentMetricsService`
- [ ] Integration tests for aggregation queries
- [ ] End-to-end tests for admin endpoints
- [ ] Load test with 10k+ assignments
- [ ] Cache hit/miss validation

### Phase 5: Documentation

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Caching strategy runbook
- [ ] Performance tuning guide
- [ ] RBAC permission matrix update

---

## Success Criteria

1. ✅ All metrics endpoints return accurate aggregations
2. ✅ Query performance < 500ms for 95th percentile
3. ✅ Cache hit rate > 70% for cached endpoints
4. ✅ Zero writes to core tables (enforced by service contract)
5. ✅ RBAC correctly restricts to admin roles
6. ✅ All endpoints return structured, typed responses
7. ✅ Integration tests pass with realistic data

---

## Approval Required

**Before implementation begins:**

1. Review NO-GO areas (no writes to core tables)
2. Approve SQL aggregation queries
3. Confirm caching strategy and TTLs
4. Verify RBAC roles and permissions
5. Approve API endpoint structure

**Design approved by:** _[Awaiting approval]_  
**Date:** _[Pending]_
