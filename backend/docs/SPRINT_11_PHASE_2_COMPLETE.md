# Sprint 11 Phase 2: Withdrawal Policy Observability & Simulation

**Status**: ✅ COMPLETE  
**Build Status**: ✅ SUCCESS (14.969s)  
**Compliance**: ✅ GOLDEN RULE ENFORCED (Zero mutations verified)

## Overview

Phase 2 adds a comprehensive READ-ONLY observability and simulation layer on top of the Phase 1 policy enforcement engine. Enables admins to monitor policy effectiveness, identify trends, and test policy changes safely.

---

## Implementation Summary

### 1. Files Created

#### `src/withdrawals/policy/dto/policy-insights.dto.ts` (142 lines)

**Purpose**: Type definitions for observability and simulation APIs

**Key Exports**:

- `InsightsTimeWindow` enum: LAST_24H, LAST_7D, LAST_30D
- `PolicyInsightsQueryDto`: Query parameter with timeWindow filter
- `SimulateWithdrawalDto`: Simulation request with userId, walletId, amount, currency, optional userRole
- Response interfaces:
  - `ViolationMetrics`: Violation type analysis with counts and percentages
  - `PolicyViolationSummary`: Per-policy breakdown with affected users
  - `RoleViolationSummary`: Per-role analysis with top currencies
  - `InsightsSummary`: Overall metrics (attempts, block rate, top violations, top blocked users, policies triggered)
  - `SimulationResult`: Simulation output with allowed flag, violations, policy applied, user metrics, timestamp

**Pattern**: Comprehensive DTOs with validation decorators

---

#### `src/withdrawals/policy/withdrawal-policy-insights.service.ts` (303 lines)

**Purpose**: READ-ONLY aggregation service for policy violation analytics

**Key Methods**:

1. **`getInsightsSummary(timeWindow)`**
   - Aggregates total attempts, blocked count, block rate
   - Identifies top violation types with percentages
   - Lists top blocked users with violation counts
   - Shows policies triggered with trigger counts
   - Time window filtering: 24h/7d/30d
   - **READ-ONLY**: Only queries withdrawals table

2. **`getInsightsByPolicy(timeWindow)`**
   - Groups violations by policyId
   - Breakdown by violation type
   - Counts affected users per policy
   - **READ-ONLY**: Queries withdrawal_policies and withdrawals

3. **`getInsightsByRole(timeWindow)`**
   - Groups violations by user role
   - Shows top violation types per role
   - Identifies top currencies per role
   - **READ-ONLY**: Queries withdrawals table

**Private Helpers**:

- `getTimeWindowDates()`: Calculates date boundaries for time windows
- `extractViolationType()`: Parses rejection reasons to identify violation types

**Compliance**:

- ✅ ZERO mutations (no create/update/delete)
- ✅ Only findMany/count queries
- ✅ Structured logging for all operations

---

#### `src/withdrawals/policy/withdrawal-policy-simulation.service.ts` (203 lines)

**Purpose**: READ-ONLY simulation wrapper for testing policy enforcement

**Key Methods**:

1. **`simulateWithdrawal(dto)`**
   - Validates user and wallet existence (READ-ONLY)
   - Validates wallet ownership
   - Validates currency match
   - Uses provided role or defaults to SELLER
   - Calls `limitEvaluator.evaluateWithdrawalRequest()` (existing READ-ONLY service)
   - Calculates user metrics (current counts/amounts)
   - Returns simulation result with evaluationMode='SIMULATION'
   - **NO SIDE EFFECTS**: No withdrawals created, no webhooks emitted

2. **`calculateUserMetrics()` (private)**
   - Queries user's withdrawal history for 24h/7d/30d
   - Filters by userId and walletId only (withdrawals table has no currency field)
   - Aggregates counts and total amounts
   - Returns structured metrics: dailyCount, weeklyCount, monthlyCount, dailyAmount, weeklyAmount, monthlyAmount
   - **READ-ONLY**: Only findMany queries

**Compliance**:

- ✅ ZERO mutations (no create/update/delete)
- ✅ Only findUnique/findMany queries
- ✅ Reuses existing limit evaluator (no duplication)
- ✅ Structured logging with evaluationMode='SIMULATION'
- ✅ No webhook emissions
- ✅ No withdrawal creation

**Error Handling**:

- Throws NotFoundException for missing user/wallet
- Throws Error for wallet ownership mismatch
- Throws Error for currency mismatch

---

### 2. Files Modified

#### `src/withdrawals/policy/withdrawal-policy.controller.ts`

**Changes**: Added 4 new READ-ONLY endpoints

**New Endpoints**:

1. **GET `/api/admin/withdrawal-policies/insights/summary`**
   - Query param: `timeWindow` (default LAST_7D)
   - Returns: `InsightsSummary`
   - Description: Aggregated violation metrics
   - RBAC: PLATFORM_ADMIN, ADMIN

2. **GET `/api/admin/withdrawal-policies/insights/by-policy`**
   - Query param: `timeWindow` (default LAST_7D)
   - Returns: `PolicyViolationSummary[]`
   - Description: Violations grouped by policy
   - RBAC: PLATFORM_ADMIN, ADMIN

3. **GET `/api/admin/withdrawal-policies/insights/by-role`**
   - Query param: `timeWindow` (default LAST_7D)
   - Returns: `RoleViolationSummary[]`
   - Description: Violations grouped by role
   - RBAC: PLATFORM_ADMIN, ADMIN

4. **POST `/api/admin/withdrawal-policies/simulate`**
   - Body: `SimulateWithdrawalDto`
   - Returns: `SimulationResult`
   - Description: Test policy without creating withdrawal
   - RBAC: PLATFORM_ADMIN, ADMIN

**New Dependencies**:

- Injected `WithdrawalPolicyInsightsService`
- Injected `WithdrawalPolicySimulationService`

**Pattern**: All endpoints marked with READ-ONLY descriptions

---

#### `src/withdrawals/withdrawal.module.ts`

**Changes**: Registered new observability services

**New Providers**:

- `WithdrawalPolicyInsightsService`
- `WithdrawalPolicySimulationService`

**Pattern**: Maintains existing exports, no breaking changes

---

## Verification Results

### Build Status

```
✅ Build successful: webpack 5.103.0 compiled successfully in 14969 ms
✅ All endpoints registered in dist/main.js
✅ Route decorators confirmed: insights/summary, insights/by-policy, insights/by-role, simulate
```

### Mutation Check

```
✅ InsightsService: Zero mutations (no create/update/delete)
✅ SimulationService: Zero mutations (no create/update/delete)
✅ Only READ-ONLY queries: findUnique, findMany, count
```

### GOLDEN RULE Compliance

```
✅ No money logic changes
✅ No ledger logic changes
✅ No wallet logic changes
✅ No withdrawal lifecycle changes
✅ No fee computation changes
✅ No webhook emissions in observability layer
```

---

## API Examples

### 1. Get Insights Summary

```bash
GET /api/admin/withdrawal-policies/insights/summary?timeWindow=LAST_7D
Authorization: Bearer <admin_token>

Response:
{
  "timeWindow": "LAST_7D",
  "period": {
    "startDate": "2025-01-26T15:53:35.000Z",
    "endDate": "2025-02-02T15:53:35.000Z"
  },
  "totalAttempts": 150,
  "totalBlocked": 23,
  "blockRate": 15.33,
  "topViolationTypes": [
    {
      "violationType": "DAILY_AMOUNT_EXCEEDED",
      "count": 12,
      "percentage": 52.17
    },
    {
      "violationType": "DAILY_COUNT_EXCEEDED",
      "count": 8,
      "percentage": 34.78
    }
  ],
  "topBlockedUsers": [
    {
      "userId": "user-123",
      "violationCount": 5,
      "lastAttempt": "2025-02-02T10:30:00.000Z"
    }
  ],
  "policiesTriggered": [
    {
      "policyId": "policy-456",
      "scope": "ROLE",
      "triggerCount": 15
    }
  ]
}
```

### 2. Get Insights by Policy

```bash
GET /api/admin/withdrawal-policies/insights/by-policy?timeWindow=LAST_30D
Authorization: Bearer <admin_token>

Response:
[
  {
    "policyId": "policy-789",
    "policyScope": "ROLE",
    "role": "SELLER",
    "currency": "INR",
    "totalViolations": 45,
    "violationBreakdown": [
      {
        "violationType": "DAILY_AMOUNT_EXCEEDED",
        "count": 30,
        "percentage": 66.67
      }
    ],
    "affectedUserCount": 12
  }
]
```

### 3. Get Insights by Role

```bash
GET /api/admin/withdrawal-policies/insights/by-role?timeWindow=LAST_24H
Authorization: Bearer <admin_token>

Response:
[
  {
    "role": "SELLER",
    "totalViolations": 8,
    "violationTypes": [
      {
        "violationType": "DAILY_AMOUNT_EXCEEDED",
        "count": 5,
        "percentage": 62.5
      }
    ],
    "topCurrencies": [
      {
        "currency": "INR",
        "count": 8
      }
    ]
  }
]
```

### 4. Simulate Withdrawal

```bash
POST /api/admin/withdrawal-policies/simulate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user-abc",
  "walletId": "wallet-xyz",
  "amount": 50000,
  "currency": "INR",
  "userRole": "SELLER"
}

Response:
{
  "allowed": false,
  "evaluationMode": "SIMULATION",
  "violations": [
    {
      "violationType": "DAILY_AMOUNT_EXCEEDED",
      "message": "Daily amount limit exceeded: 75000.00 INR used + 50000.00 INR requested > 100000.00 INR limit",
      "currentValue": 75000,
      "limitValue": 100000
    }
  ],
  "policyApplied": {
    "policyId": "policy-123",
    "scopeType": "ROLE",
    "role": "SELLER",
    "currency": "INR"
  },
  "userMetrics": {
    "dailyCount": 3,
    "weeklyCount": 15,
    "monthlyCount": 45,
    "dailyAmount": "75000.00",
    "weeklyAmount": "350000.00",
    "monthlyAmount": "1250000.00"
  },
  "simulatedAt": "2025-02-02T15:53:35.000Z"
}
```

---

## Use Cases

### 1. Policy Effectiveness Monitoring

**Scenario**: Admin wants to understand if policies are too restrictive  
**Endpoint**: `GET /insights/summary?timeWindow=LAST_30D`  
**Analysis**:

- If `blockRate` > 50%, policies may be too strict
- Review `topViolationTypes` to identify most common violations
- Check `topBlockedUsers` for users hitting limits frequently

### 2. Policy-Specific Troubleshooting

**Scenario**: Admin suspects a specific policy is blocking legitimate withdrawals  
**Endpoint**: `GET /insights/by-policy?timeWindow=LAST_7D`  
**Analysis**:

- Identify policy with highest `totalViolations`
- Review `violationBreakdown` to see which limit is triggering
- Check `affectedUserCount` to assess impact

### 3. Role-Based Policy Tuning

**Scenario**: Admin wants to adjust limits for SELLER role  
**Endpoint**: `GET /insights/by-role?timeWindow=LAST_7D`  
**Analysis**:

- Compare violation rates across roles
- Identify if SELLER role has disproportionately high violations
- Review `topCurrencies` to see if issue is currency-specific

### 4. Safe Policy Testing

**Scenario**: Admin wants to test new daily limit before applying  
**Endpoint**: `POST /simulate`  
**Process**:

1. Call simulation with test parameters
2. Review `violations` and `policyApplied`
3. Check `userMetrics` to understand user's current state
4. If `allowed=false`, adjust policy limits
5. Re-simulate until desired outcome
6. Apply policy via existing CRUD endpoints

---

## Technical Notes

### Database Schema Considerations

1. **withdrawals table**: No `currency` field (filtered by walletId only)
2. **users table**: No `role` field yet (simulation defaults to SELLER or uses provided role)
3. **Violation tracking**: Currently parses rejectionReason field (production should use structured logs or dedicated violations table)

### Performance Considerations

1. **Time window queries**: Use indexed `requestedAt` field for efficient filtering
2. **Aggregations**: In-memory aggregation suitable for <10k records per window
3. **Parallel queries**: `calculateUserMetrics()` uses Promise.all for 3 time windows
4. **Caching**: Consider Redis caching for insights endpoints (1-minute TTL)

### Future Enhancements

1. **Structured violation logs**: Create `policy_violations` table for richer analytics
2. **User role field**: Add role to users table for accurate role-based insights
3. **Currency tracking**: Add currency to withdrawals table for currency-specific metrics
4. **Real-time metrics**: Stream violation events to time-series database
5. **Alerting**: Emit webhooks when block rate exceeds threshold
6. **Dashboard UI**: Build admin dashboard for visual insights

---

## Sprint 11 Complete Status

### Phase 1: Policy & Limits Engine ✅

- ✅ withdrawal_policies model and migration
- ✅ WithdrawalPolicyService (CRUD)
- ✅ WithdrawalPolicyResolverService (policy resolution)
- ✅ WithdrawalLimitEvaluatorService (limit checks)
- ✅ WithdrawalPolicyController (6 admin endpoints)
- ✅ Enforcement integration in WithdrawalService
- ✅ Build verification (15.155s)
- ✅ Zero mutations verified

### Phase 2: Observability & Simulation ✅

- ✅ policy-insights.dto.ts (DTOs)
- ✅ WithdrawalPolicyInsightsService (aggregations)
- ✅ WithdrawalPolicySimulationService (simulation)
- ✅ WithdrawalPolicyController updates (4 new endpoints)
- ✅ Module registration
- ✅ Build verification (14.969s)
- ✅ Zero mutations verified
- ✅ Endpoint registration confirmed

### GOLDEN RULE Compliance ✅

- ✅ NO money logic changes
- ✅ NO ledger logic changes
- ✅ NO wallet logic changes
- ✅ NO withdrawal lifecycle changes
- ✅ NO fee computation changes
- ✅ All observability features are READ-ONLY

---

## Next Steps (Future Sprints)

### Immediate (Sprint 12)

1. Test all 10 endpoints (6 CRUD + 4 observability) with real data
2. Seed initial policies for SELLER/AGENT roles
3. Monitor policy effectiveness in production

### Short-term (Sprint 13)

1. Add structured violation logging (policy_violations table)
2. Implement role field in users table
3. Add currency field to withdrawals table
4. Build admin dashboard UI

### Long-term (Sprint 14+)

1. Real-time alerting for high block rates
2. Machine learning for policy recommendations
3. Historical trend analysis
4. A/B testing for policy changes

---

## Maintenance Notes

### Adding New Violation Types

1. Update `extractViolationType()` in insights service
2. Update withdrawal rejection messages
3. Update admin documentation

### Changing Time Windows

1. Update `InsightsTimeWindow` enum
2. Update `getTimeWindowDates()` logic
3. Update API documentation

### Performance Tuning

1. Monitor query times for large datasets
2. Add database indexes if queries slow down
3. Implement caching for frequently accessed insights
4. Consider moving to time-series database for historical data

---

**Implementation Complete**: February 2, 2025  
**Developer**: GitHub Copilot (Claude Sonnet 4.5)  
**Compliance**: GOLDEN RULE ENFORCED (READ-ONLY)
