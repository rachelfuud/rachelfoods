# Sprint 11 Phase 3: Withdrawal Risk Signals & Adaptive Context

**Status**: ✅ COMPLETE  
**Build Status**: ✅ SUCCESS (15.025s)  
**Compliance**: ✅ GOLDEN RULE ENFORCED (Zero mutations verified)

## Overview

Phase 3 adds a comprehensive READ-ONLY risk assessment layer that analyzes user withdrawal patterns and computes deterministic risk signals. Enables admins to identify high-risk behaviors for enhanced monitoring without automatic blocking.

---

## Implementation Summary

### 1. Files Created

#### `src/withdrawals/risk/dto/withdrawal-risk.dto.ts` (90 lines)

**Purpose**: Type definitions for risk assessment APIs

**Key Exports**:

**Enums**:

- `RiskSeverity`: LOW, MEDIUM, HIGH
- `RiskSignalType`:
  - `FREQUENCY_ACCELERATION`: Withdrawal rate increased vs historical
  - `HIGH_FAILURE_RATE`: High proportion of failed/rejected withdrawals
  - `AMOUNT_DEVIATION`: Recent amounts differ significantly from historical
  - `MULTIPLE_BANK_ACCOUNTS`: User has many different bank accounts
  - `RECENT_REJECTIONS`: Multiple rejections in last 30 days
  - `POLICY_VIOLATION_DENSITY`: High rate of policy violations

**Interfaces**:

- `RiskSignal`: Individual risk indicator with type, severity, score (0-100), explanation, metadata
- `UserRiskProfile`: Comprehensive user risk analysis with overall score, active signals, evaluation context
- `HighRiskUser`: Summary for high-risk user listings with top signals
- `RiskSignalsSummary`: Platform-wide risk metrics with distribution and top signals

**Query DTOs**:

- `HighRiskUsersQueryDto`: Filter params with minScore (default 70), limit (default 50)

**Pattern**: Clean interfaces with no business logic

---

#### `src/withdrawals/risk/withdrawal-risk.service.ts` (572 lines)

**Purpose**: Core risk assessment engine with deterministic signal computation

**Key Methods**:

1. **`computeUserRiskProfile(userId)`** - Main risk analysis method
   - Fetches user's complete withdrawal history (READ-ONLY)
   - Calculates time-based metrics (last 7/30 days vs all-time)
   - Computes 6 independent risk signals
   - Aggregates signals into overall risk score (weighted average)
   - Determines risk level: LOW (<40), MEDIUM (40-69), HIGH (≥70)
   - Returns comprehensive profile with context
   - **READ-ONLY**: Only findMany queries
   - **No side effects**: Pure computation

2. **`getHighRiskUsers(minScore, limit)`** - Platform-wide risk scanning
   - Gets all users with withdrawal history
   - Computes risk profile for each user
   - Filters by minimum score threshold
   - Sorts by score descending
   - Returns top N high-risk users with summary
   - **READ-ONLY**: Only queries, no mutations
   - **Performance**: Sequential analysis (optimizable with parallel batching)

3. **`getRiskSignalsSummary()`** - Aggregate risk metrics
   - Analyzes all users with withdrawals
   - Counts risk level distribution (LOW/MEDIUM/HIGH)
   - Tracks signal occurrences across platform
   - Calculates average severity per signal type
   - Returns platform-wide risk overview
   - **READ-ONLY**: Pure aggregation

**Risk Signal Computation Methods** (Private):

1. **`computeFrequencyAcceleration()`**
   - Compares recent (7 days) vs historical weekly rate
   - Triggers when acceleration ratio > 1.5x
   - Severity: LOW (1.5-2x), MEDIUM (2-3x), HIGH (≥3x)
   - Score: 20-100 based on acceleration ratio
   - Returns null if insufficient data (<10 historical withdrawals)

2. **`computeFailureRateSignal()`**
   - Calculates % of FAILED or REJECTED withdrawals
   - Triggers when failure rate ≥ 10% and count ≥ 2
   - Severity: LOW (10-20%), MEDIUM (20-40%), HIGH (≥40%)
   - Score: 20-100 based on failure rate
   - Returns null if < 2 failures

3. **`computeAmountDeviation()`**
   - Compares recent average (7 days) vs historical average
   - Triggers when deviation ratio outside 0.5-2.0x range
   - Severity: LOW (2x or 0.5x), MEDIUM (2-3x or 0.3-0.5x), HIGH (≥3x or ≤0.3x)
   - Score: 30-70 based on deviation magnitude
   - Returns null if insufficient data

4. **`computeMultipleBankAccounts()`**
   - Counts unique bank accounts used
   - Triggers when account count > 2
   - Severity: LOW (3 accounts), MEDIUM (4 accounts), HIGH (≥5 accounts)
   - Score: 30-100 based on account count
   - Returns null if ≤ 2 accounts

5. **`computeRecentRejections()`**
   - Counts REJECTED withdrawals in last 30 days
   - Triggers when rejection count ≥ 1
   - Severity: LOW (1-2 rejections), MEDIUM (3-4 rejections), HIGH (≥5 rejections)
   - Score: 35-80 based on rejection count and rate
   - Returns null if no rejections

6. **`computePolicyViolationDensity()`**
   - Counts rejections with policy-related reasons (limit/EXCEEDED/policy keywords)
   - Triggers when violation count ≥ 1 in last 30 days
   - Severity: LOW (1-2 violations), MEDIUM (3-4 violations), HIGH (≥5 violations)
   - Score: 30-75 based on violation count and rate
   - Returns null if no violations

**Aggregation Logic**:

- **`aggregateRiskScore()`**: Weighted average of signal scores
  - Weights: [1.0, 0.8, 0.6, 0.4, 0.3, 0.2] for top 6 signals
  - Diminishing returns for multiple signals
  - Sorts signals by score descending before weighting
  - Returns rounded overall score (0-100)

- **`determineRiskLevel()`**: Maps score to severity
  - HIGH: score ≥ 70
  - MEDIUM: score 40-69
  - LOW: score < 40

- **`calculateAverageSeverity()`**: Aggregates severity across multiple instances
  - Maps severities to values: HIGH=3, MEDIUM=2, LOW=1
  - Returns averaged severity tier

**Compliance**:

- ✅ ZERO mutations (no create/update/delete)
- ✅ Only findMany/findFirst queries
- ✅ Deterministic logic (no randomness, no ML)
- ✅ Structured logging with risk context
- ✅ No automatic blocking or enforcement
- ✅ No schema changes

---

#### `src/withdrawals/risk/withdrawal-risk.controller.ts` (77 lines)

**Purpose**: Admin-only REST API for risk analysis

**Endpoints**:

1. **GET `/api/admin/withdrawals/risk/user/:userId`**
   - Returns: `UserRiskProfile`
   - Description: Comprehensive risk analysis for specific user
   - Use case: Review user's risk signals before manual approval
   - RBAC: PLATFORM_ADMIN, ADMIN

2. **GET `/api/admin/withdrawals/risk/high-risk`**
   - Query params: `minScore` (default 70), `limit` (default 50)
   - Returns: `HighRiskUser[]`
   - Description: Platform-wide high-risk user identification
   - Use case: Proactive monitoring of risky users
   - RBAC: PLATFORM_ADMIN, ADMIN

3. **GET `/api/admin/withdrawals/risk/signals/summary`**
   - Returns: `RiskSignalsSummary`
   - Description: Aggregate risk metrics across all users
   - Use case: Platform health monitoring and trend analysis
   - RBAC: PLATFORM_ADMIN, ADMIN

**Pattern**: All endpoints marked READ-ONLY, no mutations possible

---

### 2. Files Modified

#### `src/withdrawals/withdrawal.module.ts`

**Changes**: Registered risk analysis services

**New Imports**:

- `WithdrawalRiskController`
- `WithdrawalRiskService`

**New Controller**:

- Added `WithdrawalRiskController` to controllers array

**New Provider**:

- Added `WithdrawalRiskService` to providers array

**Pattern**: No breaking changes, maintains existing exports

---

## Verification Results

### Build Status

```
✅ Build successful: webpack 5.103.0 compiled successfully in 15025 ms
✅ WithdrawalRiskController registered in module
✅ All 3 endpoints registered in compiled output
```

### Mutation Check

```
✅ WithdrawalRiskService: Zero mutations (no create/update/delete)
✅ Only READ-ONLY queries: findMany, findFirst
✅ No schema changes
✅ No enforcement logic changes
```

### GOLDEN RULE Compliance

```
✅ No automatic withdrawal blocking
✅ No policy enforcement modifications
✅ No money/ledger/wallet/fee changes
✅ No state machine changes
✅ No background mutations
✅ No ML or randomness
✅ Pure deterministic logic
```

---

## API Examples

### 1. Get User Risk Profile

```bash
GET /api/admin/withdrawals/risk/user/user-123
Authorization: Bearer <admin_token>

Response:
{
  "userId": "user-123",
  "riskLevel": "HIGH",
  "overallScore": 78,
  "activeSignals": [
    {
      "signalType": "FREQUENCY_ACCELERATION",
      "severity": "HIGH",
      "score": 85,
      "explanation": "Withdrawal frequency has increased 3.2x compared to historical average (12 per week vs 3.8 per week)",
      "metadata": {
        "recentPerWeek": 12,
        "historicalAvgPerWeek": 3.75,
        "accelerationRatio": 3.2
      }
    },
    {
      "signalType": "RECENT_REJECTIONS",
      "severity": "MEDIUM",
      "score": 55,
      "explanation": "3 withdrawals rejected in last 30 days (25.0% rejection rate)",
      "metadata": {
        "rejectionsLast30Days": 3,
        "rejectionRate": 25.0
      }
    },
    {
      "signalType": "MULTIPLE_BANK_ACCOUNTS",
      "severity": "MEDIUM",
      "score": 50,
      "explanation": "User has used 4 different bank accounts for withdrawals",
      "metadata": {
        "uniqueBankAccountCount": 4
      }
    }
  ],
  "lastEvaluatedAt": "2026-01-03T16:00:00.000Z",
  "evaluationContext": {
    "totalWithdrawals": 45,
    "last30DaysWithdrawals": 12,
    "last7DaysWithdrawals": 12,
    "successRate": 73.33,
    "failureRate": 6.67
  }
}
```

**Analysis**:

- Overall HIGH risk (score 78)
- 3 active signals detected
- Frequency spike is primary concern (3.2x acceleration)
- Recent rejections indicate possible policy testing
- Multiple bank accounts suggest rapid account switching

**Admin Action**:

- Review user's recent withdrawal patterns manually
- Consider temporary enhanced monitoring
- Check for fraud indicators in transaction history

---

### 2. Get High-Risk Users

```bash
GET /api/admin/withdrawals/risk/high-risk?minScore=70&limit=10
Authorization: Bearer <admin_token>

Response:
[
  {
    "userId": "user-456",
    "riskLevel": "HIGH",
    "overallScore": 82,
    "topSignals": [
      {
        "signalType": "POLICY_VIOLATION_DENSITY",
        "severity": "HIGH",
        "score": 75
      },
      {
        "signalType": "HIGH_FAILURE_RATE",
        "severity": "HIGH",
        "score": 80
      },
      {
        "signalType": "FREQUENCY_ACCELERATION",
        "severity": "MEDIUM",
        "score": 60
      }
    ],
    "lastWithdrawalAt": "2026-01-03T14:30:00.000Z",
    "totalWithdrawals": 67
  },
  {
    "userId": "user-789",
    "riskLevel": "HIGH",
    "overallScore": 75,
    "topSignals": [
      {
        "signalType": "AMOUNT_DEVIATION",
        "severity": "HIGH",
        "score": 70
      },
      {
        "signalType": "MULTIPLE_BANK_ACCOUNTS",
        "severity": "HIGH",
        "score": 85
      }
    ],
    "lastWithdrawalAt": "2026-01-03T12:15:00.000Z",
    "totalWithdrawals": 23
  }
]
```

**Use Cases**:

- Daily risk review: Check high-risk users list each morning
- Proactive monitoring: Set up alerts for new high-risk entries
- Fraud investigation: Export list for manual review

---

### 3. Get Platform Risk Summary

```bash
GET /api/admin/withdrawals/risk/signals/summary
Authorization: Bearer <admin_token>

Response:
{
  "totalUsersAnalyzed": 1543,
  "riskDistribution": {
    "low": 1245,
    "medium": 256,
    "high": 42
  },
  "topSignals": [
    {
      "signalType": "FREQUENCY_ACCELERATION",
      "occurrences": 178,
      "averageSeverity": "MEDIUM"
    },
    {
      "signalType": "RECENT_REJECTIONS",
      "occurrences": 123,
      "averageSeverity": "LOW"
    },
    {
      "signalType": "HIGH_FAILURE_RATE",
      "occurrences": 89,
      "averageSeverity": "MEDIUM"
    },
    {
      "signalType": "POLICY_VIOLATION_DENSITY",
      "occurrences": 67,
      "averageSeverity": "MEDIUM"
    }
  ],
  "highRiskUserCount": 42,
  "evaluatedAt": "2026-01-03T16:00:00.000Z"
}
```

**Insights**:

- 2.7% of users are HIGH risk (42/1543)
- Frequency acceleration is most common signal (11.5% of users)
- Most signals are LOW-MEDIUM severity
- Policy violations affect 4.3% of users

**Admin Actions**:

- Review if HIGH risk % is increasing over time
- Investigate why frequency acceleration is common
- Consider if policy limits need adjustment

---

## Risk Signal Details

### Signal Thresholds & Scoring

| Signal Type                  | Trigger Threshold       | LOW Severity               | MEDIUM Severity             | HIGH Severity              |
| ---------------------------- | ----------------------- | -------------------------- | --------------------------- | -------------------------- |
| **Frequency Acceleration**   | 1.5x historical         | 1.5-2x ratio (20-40 score) | 2-3x ratio (40-60 score)    | ≥3x ratio (60-100 score)   |
| **High Failure Rate**        | ≥10% failures, ≥2 count | 10-20% rate (20-40 score)  | 20-40% rate (40-60 score)   | ≥40% rate (60-100 score)   |
| **Amount Deviation**         | Outside 0.5-2x range    | 2x or 0.5x (30 score)      | 2-3x or 0.3-0.5x (50 score) | ≥3x or ≤0.3x (70 score)    |
| **Multiple Bank Accounts**   | >2 accounts             | 3 accounts (30 score)      | 4 accounts (50 score)       | ≥5 accounts (70-100 score) |
| **Recent Rejections**        | ≥1 rejection in 30d     | 1-2 rejections (35 score)  | 3-4 rejections (55 score)   | ≥5 rejections (80 score)   |
| **Policy Violation Density** | ≥1 violation in 30d     | 1-2 violations (30 score)  | 3-4 violations (50 score)   | ≥5 violations (75 score)   |

### Overall Risk Level Mapping

- **LOW**: Overall score < 40
  - Normal behavior
  - No immediate concern
  - Standard monitoring

- **MEDIUM**: Overall score 40-69
  - Elevated activity
  - Warrants attention
  - Enhanced monitoring recommended

- **HIGH**: Overall score ≥ 70
  - Concerning patterns
  - Manual review required
  - Consider temporary holds or enhanced verification

---

## Use Cases & Workflows

### 1. Pre-Approval Risk Check

**Scenario**: Admin reviewing pending withdrawal manually

**Workflow**:

1. Admin opens pending withdrawal request
2. System displays user ID
3. Admin calls: `GET /api/admin/withdrawals/risk/user/{userId}`
4. Reviews risk profile and active signals
5. Makes informed decision:
   - LOW risk: Approve
   - MEDIUM risk: Request additional verification
   - HIGH risk: Investigate before approval

**Benefits**:

- Informed decision-making
- Reduced fraud exposure
- Documented risk context

---

### 2. Daily High-Risk Review

**Scenario**: Risk team's daily monitoring routine

**Workflow**:

1. Every morning, team calls: `GET /api/admin/withdrawals/risk/high-risk?minScore=70&limit=50`
2. Reviews list of high-risk users
3. For each user:
   - Checks recent withdrawal activity
   - Reviews active signals
   - Investigates if patterns suggest fraud
4. Takes action:
   - Contact user for verification
   - Temporary account hold
   - Enhanced monitoring flag

**Benefits**:

- Proactive fraud prevention
- Early pattern detection
- Reduced financial losses

---

### 3. Platform Health Monitoring

**Scenario**: Risk manager analyzing overall platform trends

**Workflow**:

1. Weekly, manager calls: `GET /api/admin/withdrawals/risk/signals/summary`
2. Reviews risk distribution trends
3. Analyzes top signals:
   - Is frequency acceleration increasing?
   - Are policy violations trending up?
4. Identifies systemic issues:
   - If HIGH risk % > 5%, investigate
   - If specific signal spikes, analyze root cause
5. Adjusts policies or limits if needed

**Benefits**:

- Data-driven policy tuning
- Early identification of systemic issues
- Improved user experience

---

### 4. Fraud Investigation Support

**Scenario**: Suspected fraud case under investigation

**Workflow**:

1. Investigator gets user ID from report
2. Calls: `GET /api/admin/withdrawals/risk/user/{userId}`
3. Analyzes full risk profile:
   - Frequency patterns
   - Bank account changes
   - Rejection history
   - Amount deviations
4. Cross-references with transaction history
5. Builds case with risk evidence

**Benefits**:

- Quantified risk metrics
- Historical pattern analysis
- Evidence for decision-making

---

## Technical Notes

### Performance Considerations

**Current Implementation**:

- Sequential analysis in `getHighRiskUsers()` and `getRiskSignalsSummary()`
- Each user requires full history query
- Time complexity: O(n) where n = number of users

**Performance Estimates** (typical production):

- Single user profile: ~100-200ms
- 100 users: ~10-20 seconds
- 1000 users: ~100-200 seconds

**Optimization Strategies** (future):

1. **Parallel Processing**: Batch user analysis with `Promise.all()`
2. **Caching**: Redis cache for profiles (5-minute TTL)
3. **Incremental Updates**: Compute signals on withdrawal events, cache results
4. **Database Indexes**: Ensure `userId` and `requestedAt` are indexed
5. **Pre-computation**: Background job to compute profiles for active users

---

### Data Requirements

**Minimum Data for Signals**:

- Frequency Acceleration: ≥10 historical withdrawals
- Failure Rate: ≥2 failures
- Amount Deviation: ≥5 total withdrawals, ≥1 in last 7 days
- Multiple Bank Accounts: ≥3 unique accounts
- Recent Rejections: ≥1 rejection in last 30 days
- Policy Violations: ≥1 violation in last 30 days

**Edge Cases Handled**:

- New users with no history: Returns LOW risk (score 0, no signals)
- Users with 1-2 withdrawals: Most signals return null, minimal risk
- Inactive users: Historical patterns only, no recent signals

---

### Extensibility

**Adding New Signals**:

1. Add signal type to `RiskSignalType` enum
2. Implement `compute{SignalName}()` method in service
3. Call method in `computeUserRiskProfile()`
4. Update documentation with thresholds

**Example New Signal** (Velocity Spike):

```typescript
private computeVelocitySpike(recent24h: any[], recent7days: any[]): RiskSignal | null {
    if (recent24h.length < 5) return null;

    const velocity24h = recent24h.length / 1;
    const velocity7d = recent7days.length / 7;

    if (velocity24h <= velocity7d * 2) return null;

    return {
        signalType: RiskSignalType.VELOCITY_SPIKE,
        severity: RiskSeverity.HIGH,
        score: 85,
        explanation: `Unusual velocity spike: ${velocity24h} withdrawals in 24h vs avg ${velocity7d.toFixed(1)} per day`,
        metadata: { velocity24h, velocity7d },
    };
}
```

---

## Maintenance & Operations

### Monitoring Recommendations

**Key Metrics to Track**:

1. Average risk score across platform
2. % of users in each risk level
3. Most common signal types
4. High-risk user trend (daily/weekly)
5. Signal computation time (performance)

**Alerting Rules**:

- Alert if HIGH risk % > 5%
- Alert if average risk score increases >20% week-over-week
- Alert if specific signal occurrences spike >50%

**Dashboard Components**:

- Risk distribution pie chart (LOW/MEDIUM/HIGH)
- Top signals bar chart
- High-risk users table (sortable by score)
- Risk trend line chart (last 30 days)

---

### Logging & Debugging

**Structured Log Events**:

```typescript
{
  event: 'risk_profile_computed',
  userId: 'user-123',
  riskLevel: 'HIGH',
  overallScore: 78,
  activeSignals: 3,
  durationMs: 156,
  riskSignalsEvaluated: ['FREQUENCY_ACCELERATION', 'RECENT_REJECTIONS', 'MULTIPLE_BANK_ACCOUNTS'],
  riskLevelComputed: 'HIGH',
  evaluationContext: {
    totalWithdrawals: 45,
    last30DaysWithdrawals: 12,
    last7DaysWithdrawals: 12,
    successRate: '73.33',
    failureRate: '6.67'
  }
}
```

**Log Retention**:

- Keep risk evaluation logs for 90 days
- Archive high-risk user logs for 1 year
- Use for fraud investigations and audits

---

## Sprint 11 Complete Status

### Phase 1: Policy & Limits Engine ✅

- ✅ Configurable withdrawal policies (GLOBAL/ROLE)
- ✅ Enforcement point before withdrawal creation
- ✅ 6 admin CRUD endpoints

### Phase 2: Observability & Simulation ✅

- ✅ Policy violation insights (summary, by-policy, by-role)
- ✅ Withdrawal simulation for policy testing
- ✅ 4 admin observability endpoints

### Phase 3: Risk Signals & Context ✅

- ✅ 6 deterministic risk signals
- ✅ User risk profile computation
- ✅ High-risk user identification
- ✅ Platform-wide risk summary
- ✅ 3 admin risk analysis endpoints

### GOLDEN RULE Compliance ✅

- ✅ NO automatic blocking
- ✅ NO policy enforcement changes
- ✅ NO money/ledger/wallet/fee logic changes
- ✅ NO state machine changes
- ✅ NO schema changes
- ✅ NO ML or randomness
- ✅ All features are READ-ONLY
- ✅ Deterministic logic only

---

## Next Steps (Future Sprints)

### Immediate (Sprint 12)

1. Test risk endpoints with real data
2. Establish baseline risk metrics
3. Train admin team on risk signals
4. Set up monitoring dashboard

### Short-term (Sprint 13)

1. Implement caching for risk profiles
2. Add parallel processing for bulk analysis
3. Create admin UI for risk visualization
4. Set up automated alerting

### Long-term (Sprint 14+)

1. Machine learning risk scoring (as enhancement, not replacement)
2. Real-time risk updates on withdrawal events
3. Integration with fraud detection systems
4. A/B testing for signal thresholds
5. Historical risk trend analysis

---

## Testing Recommendations

### Unit Tests

```typescript
describe('WithdrawalRiskService', () => {
  describe('computeFrequencyAcceleration', () => {
    it('should return null for users with <10 withdrawals', () => {
      // Test minimum data requirement
    });

    it('should return HIGH severity for 3x acceleration', () => {
      // Test high threshold
    });

    it('should return MEDIUM severity for 2x acceleration', () => {
      // Test medium threshold
    });
  });

  describe('aggregateRiskScore', () => {
    it('should weight top signals more heavily', () => {
      // Test weighted average logic
    });

    it('should return 0 for no signals', () => {
      // Test edge case
    });
  });
});
```

### Integration Tests

```typescript
describe('Risk Analysis E2E', () => {
  it('should compute profile for user with normal behavior', async () => {
    const profile = await riskService.computeUserRiskProfile('normal-user');
    expect(profile.riskLevel).toBe('LOW');
    expect(profile.activeSignals.length).toBe(0);
  });

  it('should identify high-risk user with multiple signals', async () => {
    const profile = await riskService.computeUserRiskProfile('risky-user');
    expect(profile.riskLevel).toBe('HIGH');
    expect(profile.overallScore).toBeGreaterThan(70);
  });
});
```

---

**Implementation Complete**: January 3, 2026  
**Developer**: GitHub Copilot (Claude Sonnet 4.5)  
**Compliance**: GOLDEN RULE ENFORCED (READ-ONLY, Deterministic, No Mutations)
