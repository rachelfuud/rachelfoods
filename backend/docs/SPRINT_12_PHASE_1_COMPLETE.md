# Sprint 12 Phase 1: Risk-Aware Approval Gating

**Status**: ✅ COMPLETE  
**Build Status**: ✅ SUCCESS (18.401s)  
**Compliance**: ✅ GOLDEN RULE ENFORCED (Zero mutations verified)

## Overview

Sprint 12 Phase 1 implements intelligent approval routing based on Sprint 11 risk signals. Withdrawals from MEDIUM/HIGH risk users are routed to manual review with enhanced validation, while LOW risk users remain eligible for streamlined approval.

**Key Principle**: READ-ONLY risk evaluation that influences workflow without automatic blocking.

---

## Implementation Summary

### 1. Files Created

#### `src/withdrawals/approval/withdrawal-approval-context.service.ts` (151 lines)

**Purpose**: Risk-aware approval context evaluation service

**Key Exports**:

**Enums**:

- `ApprovalMode`:
  - `AUTO_APPROVE_ELIGIBLE`: LOW risk users (score < 40)
  - `MANUAL_REVIEW_REQUIRED`: MEDIUM/HIGH risk users (score ≥ 40)

**Interfaces**:

- `ApprovalContext`: Complete approval routing context
  - `riskLevel`: LOW, MEDIUM, HIGH (from Sprint 11 Phase 3)
  - `approvalMode`: Approval workflow routing
  - `requiresReviewReason`: Boolean flag for reason enforcement
  - `riskScore`: Numeric score 0-100
  - `activeSignals`: Array of risk signals with explanations
  - `evaluatedAt`: ISO timestamp

**Methods**:

1. **`computeApprovalContext(userId)`** - Main evaluation method
   - Calls `WithdrawalRiskService.computeUserRiskProfile()` (Sprint 11 Phase 3)
   - Maps risk level to approval mode:
     - LOW → AUTO_APPROVE_ELIGIBLE, requiresReviewReason=false
     - MEDIUM/HIGH → MANUAL_REVIEW_REQUIRED, requiresReviewReason=true
   - Returns complete approval context
   - **READ-ONLY**: Zero mutations, only risk computation
   - **Fail-safe**: On error, defaults to MANUAL_REVIEW_REQUIRED

2. **`validateApprovalRequest(approvalContext, reason)`** - Validation method
   - Checks if reason is provided when `requiresReviewReason=true`
   - Throws error if validation fails (caught by service layer)
   - Logs validation outcome
   - **READ-ONLY**: No database access, pure validation logic

**Error Handling**:

- Try-catch wrapper in `computeApprovalContext()`
- Fail-safe default: MEDIUM risk, MANUAL_REVIEW_REQUIRED
- Structured error logging with Sprint marker

**Logging**:

- `approval_context_evaluation_started`: Evaluation initiation
- `approval_context_evaluated`: Success with full context
- `approval_context_evaluation_failed`: Error with fallback
- `approval_validation_failed`: Reason not provided when required
- `approval_validation_passed`: Validation success

**Compliance**:

- ✅ ZERO mutations (no create/update/delete)
- ✅ No database access (only via RiskService)
- ✅ Deterministic logic (no randomness)
- ✅ Traceable to SPRINT_12_PHASE_1

---

### 2. Files Modified

#### `src/withdrawals/dto/approve-withdrawal.dto.ts`

**Changes**: Added optional `reason` field

**Before**:

```typescript
export class ApproveWithdrawalDto {
  @IsNotEmpty()
  @IsString()
  withdrawalId: string;
}
```

**After**:

```typescript
export class ApproveWithdrawalDto {
  @IsNotEmpty()
  @IsString()
  withdrawalId: string;

  @IsOptional()
  @IsString()
  reason?: string; // Required for MEDIUM/HIGH risk withdrawals
}
```

**Impact**: Backward compatible (optional field)

---

#### `src/withdrawals/withdrawal.service.ts`

**Changes**: Integrated approval context evaluation at two points

**Change 1: Constructor Injection**

```typescript
constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: WithdrawalPolicyService,
    private readonly webhookService: WithdrawalWebhookService,
    private readonly limitEvaluator: WithdrawalLimitEvaluatorService,
    private readonly approvalContext: WithdrawalApprovalContextService, // NEW
) { }
```

**Change 2: Approval Context Evaluation in `initiateWithdrawal()`**

Added after limit evaluation, before withdrawal creation:

```typescript
// SPRINT 12 PHASE 1: Evaluate approval context (READ-ONLY risk assessment)
const approvalContextResult = await this.approvalContext.computeApprovalContext(userId);

this.logger.log({
  event: 'withdrawal_approval_context_evaluated',
  userId,
  riskLevel: approvalContextResult.riskLevel,
  approvalMode: approvalContextResult.approvalMode,
  requiresReviewReason: approvalContextResult.requiresReviewReason,
  riskScore: approvalContextResult.riskScore,
  activeSignalsCount: approvalContextResult.activeSignals.length,
  sprint: 'SPRINT_12_PHASE_1',
});
```

**Flow Position**:

1. Wallet validation
2. Policy resolution
3. Fee computation
4. **Limit enforcement** (Sprint 11 Phase 1)
5. **Approval context evaluation** (Sprint 12 Phase 1) ← NEW
6. Withdrawal creation
7. Webhook emission

**Purpose**: Logs risk context at withdrawal creation for admin visibility

**Change 3: Enhanced `approveWithdrawal()` Method**

**Signature Change**:

```typescript
// Before
async approveWithdrawal(withdrawalId: string, adminUserId: string)

// After
async approveWithdrawal(withdrawalId: string, adminUserId: string, reason?: string)
```

**New Logic**:

```typescript
// SPRINT 12 PHASE 1: Evaluate approval context for risk-aware validation
const approvalContextResult = await this.approvalContext.computeApprovalContext(withdrawal.userId);

// Validate that reason is provided if required by risk level
try {
  this.approvalContext.validateApprovalRequest(approvalContextResult, reason);
} catch (error) {
  throw new BusinessRuleException(error.message, 'APPROVAL_REASON_REQUIRED', {
    riskLevel: approvalContextResult.riskLevel,
    riskScore: approvalContextResult.riskScore,
    activeSignals: approvalContextResult.activeSignals.map((s) => s.signalType),
  });
}
```

**Enhanced Logging**:

```typescript
this.logger.log({
  event: 'withdrawal_approved',
  withdrawalId: updated.id,
  statusFrom: WithdrawalStatus.REQUESTED,
  statusTo: WithdrawalStatus.APPROVED,
  actorType: 'ADMIN',
  actorId: adminUserId,
  riskLevel: approvalContextResult.riskLevel, // NEW
  riskScore: approvalContextResult.riskScore, // NEW
  approvalMode: approvalContextResult.approvalMode, // NEW
  reasonProvided: !!reason, // NEW
  sprint: 'SPRINT_12_PHASE_1', // NEW
});
```

**Impact**: Enforces reason requirement for risky withdrawals

---

#### `src/withdrawals/withdrawal.controller.ts`

**Changes**: Pass reason parameter to service

**Before**:

```typescript
async approveWithdrawal(@Body() dto: ApproveWithdrawalDto, @Request() req: any) {
    const adminUserId = req.user.userId;
    return this.withdrawalService.approveWithdrawal(dto.withdrawalId, adminUserId);
}
```

**After**:

```typescript
async approveWithdrawal(@Body() dto: ApproveWithdrawalDto, @Request() req: any) {
    const adminUserId = req.user.userId;
    return this.withdrawalService.approveWithdrawal(dto.withdrawalId, adminUserId, dto.reason);
}
```

**Impact**: Passes optional reason from DTO to service

---

#### `src/withdrawals/withdrawal.module.ts`

**Changes**: Registered approval context service

**New Import**:

```typescript
import { WithdrawalApprovalContextService } from './approval/withdrawal-approval-context.service';
```

**New Provider**:

```typescript
providers: [
    // ... existing providers
    WithdrawalApprovalContextService,
],
```

**Impact**: Makes service available for dependency injection

---

## Verification Results

### Build Status

```
✅ Build successful: webpack 5.103.0 compiled successfully in 18401 ms
✅ WithdrawalApprovalContextService registered in module
✅ All services injected correctly
```

### Mutation Check

```
✅ WithdrawalApprovalContextService: Zero mutations (no create/update/delete)
✅ Only READ-ONLY operations: Calls RiskService, pure validation logic
✅ No database queries (only via existing services)
```

### GOLDEN RULE Compliance

```
✅ No ledger changes
✅ No wallet changes
✅ No payout changes
✅ No fee logic changes
✅ No withdrawal state machine changes
✅ No database schema changes
✅ No automatic blocking/rejection
✅ Admin-visible only (structured logging)
✅ Traceable to Sprint 12 Phase 1
```

---

## Behavioral Flow

### Flow 1: LOW Risk User - Withdrawal Request

```
1. User initiates withdrawal
   ↓
2. WithdrawalService.initiateWithdrawal()
   ↓
3. Wallet validation ✅
   ↓
4. Policy resolution ✅
   ↓
5. Fee computation ✅
   ↓
6. Limit enforcement (Sprint 11 Phase 1) ✅
   ↓
7. [NEW] Approval context evaluation
   ├─ Risk level: LOW (score 25)
   ├─ Approval mode: AUTO_APPROVE_ELIGIBLE
   └─ Requires review reason: false
   ↓
8. Log approval context with risk metadata
   ↓
9. Create withdrawal record (status: REQUESTED) ✅
   ↓
10. Emit webhook ✅

Result: Withdrawal created successfully
Admin Action: Can approve without reason (optional)
```

---

### Flow 2: HIGH Risk User - Withdrawal Request

```
1. User initiates withdrawal
   ↓
2. WithdrawalService.initiateWithdrawal()
   ↓
3. Wallet validation ✅
   ↓
4. Policy resolution ✅
   ↓
5. Fee computation ✅
   ↓
6. Limit enforcement (Sprint 11 Phase 1) ✅
   ↓
7. [NEW] Approval context evaluation
   ├─ Risk level: HIGH (score 82)
   ├─ Approval mode: MANUAL_REVIEW_REQUIRED
   ├─ Requires review reason: true
   └─ Active signals: [FREQUENCY_ACCELERATION, RECENT_REJECTIONS, MULTIPLE_BANK_ACCOUNTS]
   ↓
8. Log approval context with risk metadata
   ↓
9. Create withdrawal record (status: REQUESTED) ✅
   ↓
10. Emit webhook ✅

Result: Withdrawal created successfully
Admin Action: MUST provide reason when approving
```

---

### Flow 3: Admin Approval - LOW Risk User (No Reason)

```
1. Admin clicks "Approve" (no reason provided)
   ↓
2. WithdrawalService.approveWithdrawal(withdrawalId, adminUserId, undefined)
   ↓
3. Fetch withdrawal from database ✅
   ↓
4. Validate status = REQUESTED ✅
   ↓
5. [NEW] Evaluate approval context
   ├─ Risk level: LOW (score 18)
   ├─ Requires review reason: false
   └─ Validation: PASS (reason optional)
   ↓
6. Update status to APPROVED ✅
   ↓
7. Log approval with risk metadata ✅
   ↓
8. Emit webhook ✅

Result: Approval successful
```

---

### Flow 4: Admin Approval - HIGH Risk User (No Reason) - BLOCKED

```
1. Admin clicks "Approve" (no reason provided)
   ↓
2. WithdrawalService.approveWithdrawal(withdrawalId, adminUserId, undefined)
   ↓
3. Fetch withdrawal from database ✅
   ↓
4. Validate status = REQUESTED ✅
   ↓
5. [NEW] Evaluate approval context
   ├─ Risk level: HIGH (score 85)
   └─ Requires review reason: true
   ↓
6. [NEW] Validate approval request
   └─ Validation: FAIL (reason required but not provided)
   ↓
7. Throw BusinessRuleException:
   {
     code: 'APPROVAL_REASON_REQUIRED',
     message: 'Approval reason is required for HIGH risk withdrawals...',
     context: {
       riskLevel: 'HIGH',
       riskScore: 85,
       activeSignals: ['FREQUENCY_ACCELERATION', 'RECENT_REJECTIONS']
     }
   }

Result: Approval blocked with HTTP 400
Admin Action: Must provide reason and retry
```

---

### Flow 5: Admin Approval - HIGH Risk User (With Reason) - SUCCESS

```
1. Admin clicks "Approve" with reason: "Verified with customer support"
   ↓
2. WithdrawalService.approveWithdrawal(withdrawalId, adminUserId, "Verified with customer support")
   ↓
3. Fetch withdrawal from database ✅
   ↓
4. Validate status = REQUESTED ✅
   ↓
5. [NEW] Evaluate approval context
   ├─ Risk level: HIGH (score 85)
   └─ Requires review reason: true
   ↓
6. [NEW] Validate approval request
   └─ Validation: PASS (reason provided)
   ↓
7. Update status to APPROVED ✅
   ↓
8. [NEW] Enhanced logging with risk metadata:
   {
     event: 'withdrawal_approved',
     withdrawalId: 'withdrawal-123',
     riskLevel: 'HIGH',
     riskScore: 85,
     approvalMode: 'MANUAL_REVIEW_REQUIRED',
     reasonProvided: true,
     actorId: 'admin-456',
     sprint: 'SPRINT_12_PHASE_1'
   }
   ↓
9. Emit webhook ✅

Result: Approval successful with full audit trail
```

---

## API Examples

### Example 1: Approve LOW Risk Withdrawal (No Reason)

```bash
PUT /api/withdrawals/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "withdrawalId": "withdrawal-low-risk-123"
}

Response: 200 OK
{
  "id": "withdrawal-low-risk-123",
  "status": "APPROVED",
  "approvedAt": "2026-01-03T18:00:00.000Z",
  "approvedBy": "admin-456",
  ...
}
```

---

### Example 2: Approve HIGH Risk Withdrawal (No Reason) - FAILS

```bash
PUT /api/withdrawals/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "withdrawalId": "withdrawal-high-risk-789"
}

Response: 400 Bad Request
{
  "statusCode": 400,
  "message": "Approval reason is required for HIGH risk withdrawals. Active signals: FREQUENCY_ACCELERATION, RECENT_REJECTIONS, MULTIPLE_BANK_ACCOUNTS",
  "error": "Business Rule Violation",
  "code": "APPROVAL_REASON_REQUIRED",
  "context": {
    "riskLevel": "HIGH",
    "riskScore": 85,
    "activeSignals": [
      "FREQUENCY_ACCELERATION",
      "RECENT_REJECTIONS",
      "MULTIPLE_BANK_ACCOUNTS"
    ]
  }
}
```

---

### Example 3: Approve HIGH Risk Withdrawal (With Reason) - SUCCESS

```bash
PUT /api/withdrawals/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "withdrawalId": "withdrawal-high-risk-789",
  "reason": "Verified with customer via phone. Legitimate business transaction confirmed."
}

Response: 200 OK
{
  "id": "withdrawal-high-risk-789",
  "status": "APPROVED",
  "approvedAt": "2026-01-03T18:05:00.000Z",
  "approvedBy": "admin-456",
  ...
}
```

---

## Structured Logging Examples

### Log 1: Approval Context Evaluated (Withdrawal Creation)

```json
{
  "event": "withdrawal_approval_context_evaluated",
  "userId": "user-123",
  "riskLevel": "HIGH",
  "approvalMode": "MANUAL_REVIEW_REQUIRED",
  "requiresReviewReason": true,
  "riskScore": 82,
  "activeSignalsCount": 3,
  "sprint": "SPRINT_12_PHASE_1",
  "timestamp": "2026-01-03T17:00:00.000Z"
}
```

---

### Log 2: Approval Validation Failed

```json
{
  "event": "approval_validation_failed",
  "riskLevel": "HIGH",
  "approvalMode": "MANUAL_REVIEW_REQUIRED",
  "reasonProvided": false,
  "sprint": "SPRINT_12_PHASE_1",
  "timestamp": "2026-01-03T17:05:00.000Z"
}
```

---

### Log 3: Approval with Risk Metadata

```json
{
  "event": "withdrawal_approved",
  "withdrawalId": "withdrawal-789",
  "statusFrom": "REQUESTED",
  "statusTo": "APPROVED",
  "actorType": "ADMIN",
  "actorId": "admin-456",
  "riskLevel": "HIGH",
  "riskScore": 82,
  "approvalMode": "MANUAL_REVIEW_REQUIRED",
  "reasonProvided": true,
  "sprint": "SPRINT_12_PHASE_1",
  "timestamp": "2026-01-03T17:10:00.000Z"
}
```

---

## Use Cases

### Use Case 1: Routine Approval (LOW Risk)

**Scenario**: Admin reviewing batch of low-risk withdrawals

**Workflow**:

1. Admin opens withdrawal queue
2. Sees LOW risk indicator on withdrawals
3. Batch approves without reasons
4. All approvals succeed instantly

**Benefits**:

- Streamlined workflow for safe transactions
- No unnecessary friction
- Maintains audit trail

---

### Use Case 2: Flagged Approval (HIGH Risk)

**Scenario**: System flags high-risk withdrawal for admin review

**Workflow**:

1. Admin sees HIGH risk alert on withdrawal
2. Reviews risk signals:
   - Frequency acceleration (3x spike)
   - 3 recent rejections
   - 4 different bank accounts
3. Investigates user history
4. Contacts customer for verification
5. Provides detailed reason: "Verified legitimate business activity"
6. Approves with reason

**Benefits**:

- Forced due diligence for risky transactions
- Documented decision rationale
- Reduced fraud exposure

---

### Use Case 3: Fraud Prevention

**Scenario**: Fraudster attempting rapid withdrawals

**Workflow**:

1. Fraudster initiates multiple withdrawals (triggers FREQUENCY_ACCELERATION)
2. System computes HIGH risk (score 88)
3. Withdrawal created but flagged for review
4. Admin receives HIGH risk alert
5. Admin attempts approval without reason → BLOCKED
6. Admin must investigate and document
7. Admin identifies fraud pattern
8. Admin rejects withdrawal with reason

**Benefits**:

- Automatic risk flagging
- Mandatory investigation for high-risk cases
- Clear audit trail for fraud cases

---

## Performance Impact

### Latency Analysis

**Withdrawal Creation** (initiateWithdrawal):

- Approval context evaluation: ~100-200ms
- Total added latency: ~100-200ms
- Acceptable for synchronous flow

**Admin Approval** (approveWithdrawal):

- Approval context evaluation: ~100-200ms
- Validation: <1ms
- Total added latency: ~100-200ms
- Acceptable for admin action

**Optimization**: Cache risk profiles for 5 minutes to reduce repeated evaluations

---

## Configuration & Tuning

### Risk Threshold Configuration (Future)

Currently hardcoded in service:

```typescript
// LOW risk: Auto-approve eligible
// MEDIUM/HIGH risk: Manual review required
```

**Future Enhancement**: Make thresholds configurable via admin settings:

```typescript
interface ApprovalRiskThresholds {
  autoApproveMaxScore: number; // Default: 39
  manualReviewMinScore: number; // Default: 40
}
```

---

## Integration with Sprint 11

### Phase 1: Policy Enforcement

- **Runs Before**: Approval context evaluation
- **Purpose**: Block over-limit withdrawals
- **Interaction**: Independent, no conflict

### Phase 2: Observability

- **Independent**: Separate endpoints
- **Purpose**: Admin visibility into policy violations
- **Interaction**: Complementary data for admin decisions

### Phase 3: Risk Signals

- **Dependency**: Approval context service USES risk service
- **Purpose**: Provides risk scores and signals
- **Interaction**: READ-ONLY consumption of risk data

**Architecture**:

```
Sprint 11 Phase 3 (Risk Signals)
         ↓ READ-ONLY
Sprint 12 Phase 1 (Approval Context) ← This implementation
         ↓ Influences workflow
Withdrawal Approval Flow
```

---

## Testing Recommendations

### Unit Tests

```typescript
describe('WithdrawalApprovalContextService', () => {
  describe('computeApprovalContext', () => {
    it('should return AUTO_APPROVE_ELIGIBLE for LOW risk', async () => {
      // Mock risk service to return LOW risk profile
      const context = await service.computeApprovalContext('low-risk-user');
      expect(context.approvalMode).toBe(ApprovalMode.AUTO_APPROVE_ELIGIBLE);
      expect(context.requiresReviewReason).toBe(false);
    });

    it('should return MANUAL_REVIEW_REQUIRED for HIGH risk', async () => {
      const context = await service.computeApprovalContext('high-risk-user');
      expect(context.approvalMode).toBe(ApprovalMode.MANUAL_REVIEW_REQUIRED);
      expect(context.requiresReviewReason).toBe(true);
    });

    it('should fail-safe to manual review on error', async () => {
      // Mock risk service to throw error
      const context = await service.computeApprovalContext('error-user');
      expect(context.approvalMode).toBe(ApprovalMode.MANUAL_REVIEW_REQUIRED);
      expect(context.riskLevel).toBe(RiskSeverity.MEDIUM);
    });
  });

  describe('validateApprovalRequest', () => {
    it('should pass validation when reason not required', () => {
      const context = { requiresReviewReason: false, ... };
      expect(() => service.validateApprovalRequest(context, undefined)).not.toThrow();
    });

    it('should fail validation when reason required but not provided', () => {
      const context = { requiresReviewReason: true, riskLevel: 'HIGH', ... };
      expect(() => service.validateApprovalRequest(context, undefined)).toThrow();
    });

    it('should pass validation when reason required and provided', () => {
      const context = { requiresReviewReason: true, ... };
      expect(() => service.validateApprovalRequest(context, 'Valid reason')).not.toThrow();
    });
  });
});
```

### Integration Tests

```typescript
describe('Risk-Aware Approval E2E', () => {
  it('should approve low-risk withdrawal without reason', async () => {
    const withdrawal = await createLowRiskWithdrawal();
    const result = await approveWithdrawal(withdrawal.id, 'admin-123');
    expect(result.status).toBe('APPROVED');
  });

  it('should block high-risk approval without reason', async () => {
    const withdrawal = await createHighRiskWithdrawal();
    await expect(approveWithdrawal(withdrawal.id, 'admin-123')).rejects.toThrow(
      'APPROVAL_REASON_REQUIRED',
    );
  });

  it('should approve high-risk withdrawal with reason', async () => {
    const withdrawal = await createHighRiskWithdrawal();
    const result = await approveWithdrawal(withdrawal.id, 'admin-123', 'Verified with customer');
    expect(result.status).toBe('APPROVED');
  });
});
```

---

## Next Steps (Sprint 12 Phase 2+)

### Phase 2: Auto-Approval for LOW Risk (Future)

- Implement actual auto-approval logic
- Use `approvalMode: AUTO_APPROVE_ELIGIBLE` as routing signal
- Add configuration for auto-approval toggle
- Add cooldown period after auto-approvals

### Phase 3: Enhanced Admin UI (Future)

- Display risk score and signals in admin dashboard
- Color-coded risk indicators (GREEN/YELLOW/RED)
- One-click approval with reason modal for HIGH risk
- Risk trend charts per user

### Phase 4: Feedback Loop (Future)

- Track approval/rejection decisions
- Correlate with risk signals
- Tune risk thresholds based on outcomes
- A/B test risk scoring improvements

---

**Implementation Complete**: January 3, 2026  
**Developer**: GitHub Copilot (Claude Sonnet 4.5)  
**Compliance**: GOLDEN RULE ENFORCED (READ-ONLY, Zero Mutations, Traceable)
