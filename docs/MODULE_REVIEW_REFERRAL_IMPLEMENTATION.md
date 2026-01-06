# Reviews, Feedback & Referral System Implementation

## Module Overview
This document describes the implementation of the Reviews, Feedback & Referral System for Rachel Foods Platform. This module implements:

**Part A: Review & Feedback System**
- Forced review flow: Order DELIVERED → Review Required → Order COMPLETED
- One review per fulfilled order (one-to-one relationship)
- Immutable reviews after submission
- Admin moderation capabilities

**Part B: Referral System**
- Buyer-driven referral program with unique codes
- Qualification rules based on completed orders
- Admin-configurable reward settings
- Automatic discount application on next order

## Database Schema

### Review Model
```prisma
model Review {
  id String @id @default(uuid())
  orderId String @unique
  buyerId String
  
  // Ratings (1-5 scale except recommendation)
  productQualityRating Int // 1-5
  deliveryExperienceRating Int // 1-5
  overallSatisfactionRating Int // 1-5
  recommendationScore Int // 0-10 (NPS style)
  
  // Optional written feedback
  feedback String? @db.Text
  
  // Review status workflow
  status ReviewStatus @default(PENDING)
  submittedAt DateTime?
  
  // Moderation
  isFlagged Boolean @default(false)
  isHidden Boolean @default(false)
  moderationNotes String?
  moderatedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  order Order @relation(fields: [orderId], references: [id])
  buyer User @relation(fields: [buyerId], references: [id])
}

enum ReviewStatus {
  PENDING      // Auto-created when order is DELIVERED
  SUBMITTED    // Buyer has submitted review
  MODERATED    // Admin has moderated (flagged/hidden)
}
```

### Referral Model
```prisma
model Referral {
  id String @id @default(uuid())
  referrerId String
  referredUserId String?
  referredEmail String
  referralCode String @unique
  
  // Status workflow
  status ReferralStatus @default(PENDING)
  completedOrdersCount Int @default(0)
  qualifiedAt DateTime?
  
  // Reward details (set when qualified)
  rewardType String? // "PERCENTAGE" or "FLAT"
  rewardValue Decimal?
  rewardApplied Boolean @default(false)
  rewardExpiry DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  referrer User @relation("ReferrerRelation", fields: [referrerId], references: [id])
  referredUser User? @relation("ReferredRelation", fields: [referredUserId], references: [id])
}

enum ReferralStatus {
  PENDING    // Waiting for referred user to complete orders
  QUALIFIED  // Met minimum order requirement, reward available
  REWARDED   // Reward has been applied to an order
  EXPIRED    // Reward expired before being used
}
```

### ReferralConfig Model
```prisma
model ReferralConfig {
  id String @id @default(uuid())
  
  minOrdersRequired Int @default(1)
  rewardType String // "PERCENTAGE" or "FLAT"
  rewardValue Decimal @db.Decimal(10, 2)
  rewardExpiryDays Int @default(30)
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Part A: Review & Feedback System

### Forced Review Flow

#### 1. Order Delivered → Review Created
When an order status changes to `DELIVERED`, a pending review is automatically created:

```typescript
// In OrderService.updateStatus()
case 'DELIVERED':
  updateData.deliveredAt = new Date();
  // Auto-create pending review
  await this.reviewService.createPendingReview(id, order.buyerId);
  break;
```

The pending review has all ratings set to `0` and status `PENDING`.

#### 2. Buyer Submits Review
The buyer must submit a review before the order can be marked as `COMPLETED`:

**Endpoint**: `POST /reviews/order/:orderId/submit`  
**Permission**: `review:submit`  
**Request Body**:
```json
{
  "productQualityRating": 4,
  "deliveryExperienceRating": 5,
  "overallSatisfactionRating": 4,
  "recommendationScore": 8,
  "feedback": "Great food quality and fast delivery!"
}
```

**Validation Rules**:
- Product quality, delivery experience, overall satisfaction: 1-5
- Recommendation score: 0-10 (NPS style)
- Feedback is optional
- Review must be in `PENDING` status
- Only the order's buyer can submit the review
- Reviews are immutable after submission

#### 3. Order Completion Blocked Without Review
When attempting to mark an order as `COMPLETED`, the system checks if a review has been submitted:

```typescript
// In OrderService.updateStatus()
if (updateDto.status === 'COMPLETED') {
  const hasReview = await this.reviewService.hasSubmittedReview(id);
  if (!hasReview) {
    throw new BadRequestException(
      'Order cannot be marked as COMPLETED until buyer submits a review.'
    );
  }
}
```

**Key Points**:
- Order status cannot transition from `DELIVERED` → `COMPLETED` without a submitted review
- Status `SUBMITTED` or `MODERATED` satisfies the requirement
- Status `PENDING` does not satisfy the requirement
- This ensures every fulfilled order gets feedback

### Admin Moderation

Admins can moderate submitted reviews:

**Endpoint**: `PATCH /reviews/:id/moderate`  
**Permission**: `review:moderate`  
**Request Body**:
```json
{
  "isFlagged": true,
  "isHidden": false,
  "moderationNotes": "Review contains inappropriate language"
}
```

**Moderation Capabilities**:
- `isFlagged`: Mark review as containing inappropriate content
- `isHidden`: Hide review from public display
- `moderationNotes`: Admin notes (not visible to buyer)
- Status changes to `MODERATED` after moderation

### Review Queries

#### Get Review for Specific Order
**Endpoint**: `GET /reviews/order/:orderId`  
**Permission**: `review:view`  
**Returns**: Review with order and buyer details

#### Get My Reviews (Buyer)
**Endpoint**: `GET /reviews/buyer/my-reviews`  
**Permission**: `review:view`  
**Query Parameters**: `page`, `limit`, `status`, `isFlagged`, `isHidden`

#### Query All Reviews (Admin/Seller)
**Endpoint**: `GET /reviews/query`  
**Permission**: `review:viewAll`  
**Query Parameters**: `buyerId`, `orderId`, `status`, `isFlagged`, `isHidden`, `page`, `limit`

#### Get Review Statistics
**Endpoint**: `GET /reviews/buyer/:buyerId/stats`  
**Permission**: `review:viewAll`  
**Returns**:
```json
{
  "totalReviews": 10,
  "averageProductQuality": 4.2,
  "averageDeliveryExperience": 4.5,
  "averageOverallSatisfaction": 4.3,
  "averageRecommendationScore": 8.1
}
```

## Part B: Referral System

### Referral Creation

Buyers can create referrals by providing an email address:

**Endpoint**: `POST /referrals/create`  
**Permission**: `referral:create`  
**Request Body**:
```json
{
  "referredEmail": "friend@example.com"
}
```

**Process**:
1. Check if referral program is active (from ReferralConfig)
2. Validate referred email is not the referrer
3. Check if email hasn't already been referred by this user
4. Generate unique 8-character referral code (e.g., `A3B7K9M2`)
5. Create referral with status `PENDING`
6. If referred email exists as a user, link `referredUserId`

### Qualification Flow

#### 1. Referred User Completes Orders
When a referred user completes an order, the system checks qualification:

```typescript
// Called after order status changes to COMPLETED
await referralService.checkQualification(order.buyerId);
```

**Qualification Rules** (from ReferralConfig):
- `minOrdersRequired`: Number of completed orders required (default: 1)
- System counts orders with status `COMPLETED`
- When threshold is met:
  - Status changes from `PENDING` → `QUALIFIED`
  - `qualifiedAt` timestamp is set
  - Reward details are copied from current config:
    - `rewardType`: "PERCENTAGE" or "FLAT"
    - `rewardValue`: Discount amount
    - `rewardExpiry`: Current date + `rewardExpiryDays`

#### 2. Reward Application
When the **referrer** (not the referred user) creates a new order, the system automatically applies the oldest available reward:

```typescript
// In OrderService.create() - before calculating totals
const discount = await referralService.applyReward(buyerId, orderSubtotal);
// Apply discount to order totals
```

**Reward Application Logic**:
- Find oldest `QUALIFIED` referral for the buyer
- Must have `rewardApplied = false`
- Must not be expired (`rewardExpiry >= now`)
- Calculate discount:
  - If `PERCENTAGE`: `discount = orderAmount * (rewardValue / 100)`
  - If `FLAT`: `discount = rewardValue`
  - Ensure discount doesn't exceed order amount
- Mark referral as `REWARDED` and `rewardApplied = true`
- Return discount amount to apply to order

**Important**: Rewards are for the **referrer**, not the referred user. Rewards are earned when referred users complete orders, then applied to the referrer's next order.

### Admin Configuration

Admins can configure the referral program:

**Endpoint**: `PATCH /referrals/config`  
**Permission**: `referral:manageConfig`  
**Request Body**:
```json
{
  "minOrdersRequired": 2,
  "rewardType": "PERCENTAGE",
  "rewardValue": 15.00,
  "rewardExpiryDays": 45,
  "isActive": true
}
```

**Configuration Fields**:
- `minOrdersRequired`: How many completed orders required for qualification
- `rewardType`: "PERCENTAGE" (discount percentage) or "FLAT" (fixed amount)
- `rewardValue`: Percentage (e.g., 10 for 10%) or flat amount (e.g., 50.00 for $50)
- `rewardExpiryDays`: Days until reward expires after qualification
- `isActive`: Enable/disable entire referral program

**Note**: Configuration changes only affect **new** referrals. Existing qualified referrals keep their original reward settings.

### Referral Queries

#### Get My Referrals (Buyer)
**Endpoint**: `GET /referrals/my-referrals`  
**Permission**: `referral:view`  
**Returns**: List of all referrals created by current user with pagination

#### Get Referral by Code (Public)
**Endpoint**: `GET /referrals/code/:code`  
**No authentication required** (for sign-up flow)  
**Returns**: Referral details and referrer information

#### Get My Referral Stats (Buyer)
**Endpoint**: `GET /referrals/my-stats`  
**Permission**: `referral:view`  
**Returns**:
```json
{
  "totalReferrals": 5,
  "pendingReferrals": 2,
  "qualifiedReferrals": 2,
  "rewardedReferrals": 1,
  "expiredReferrals": 0,
  "totalRewardsEarned": 150.00,
  "availableRewards": 2
}
```

#### Query All Referrals (Admin)
**Endpoint**: `GET /referrals/query`  
**Permission**: `referral:viewAll`  
**Query Parameters**: `referrerId`, `referredUserId`, `status`, `page`, `limit`

#### Expire Old Rewards (Admin)
**Endpoint**: `POST /referrals/expire-old-rewards`  
**Permission**: `referral:manageConfig`  
**Process**: Marks all qualified, unused rewards past their expiry date as `EXPIRED`

## RBAC Permissions

### Review Permissions
- `review:submit` - Submit review for own order (Buyer)
- `review:view` - View own reviews (Buyer)
- `review:viewAll` - View all reviews (Admin, Seller)
- `review:moderate` - Moderate reviews (Admin only)

### Referral Permissions
- `referral:create` - Create referral (Buyer)
- `referral:view` - View own referrals and stats (Buyer)
- `referral:viewAll` - View all referrals (Admin)
- `referral:viewConfig` - View referral configuration (Admin)
- `referral:manageConfig` - Update referral configuration (Admin only)

## API Endpoints Summary

### Review Endpoints
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/reviews/order/:orderId/submit` | `review:submit` | Submit review for order |
| PATCH | `/reviews/:id/moderate` | `review:moderate` | Moderate review (admin) |
| GET | `/reviews/order/:orderId` | `review:view` | Get review for order |
| GET | `/reviews/buyer/my-reviews` | `review:view` | Get current buyer's reviews |
| GET | `/reviews/buyer/:buyerId` | `review:viewAll` | Get buyer's reviews (admin) |
| GET | `/reviews/query` | `review:viewAll` | Query all reviews (admin) |
| GET | `/reviews/buyer/:buyerId/stats` | `review:viewAll` | Get buyer review stats (admin) |
| GET | `/reviews/buyer/my-stats` | `review:view` | Get own review stats |

### Referral Endpoints
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/referrals/create` | `referral:create` | Create new referral |
| GET | `/referrals/my-referrals` | `referral:view` | Get own referrals |
| GET | `/referrals/my-stats` | `referral:view` | Get own referral stats |
| GET | `/referrals/code/:code` | None (public) | Get referral by code |
| GET | `/referrals/query` | `referral:viewAll` | Query all referrals (admin) |
| GET | `/referrals/user/:userId/stats` | `referral:viewAll` | Get user referral stats (admin) |
| GET | `/referrals/config` | `referral:viewConfig` | Get referral config (admin) |
| PATCH | `/referrals/config` | `referral:manageConfig` | Update referral config (admin) |
| POST | `/referrals/expire-old-rewards` | `referral:manageConfig` | Expire old rewards (admin) |

## Files Created

### Review Module
```
backend/src/reviews/
├── dto/
│   ├── submit-review.dto.ts
│   ├── moderate-review.dto.ts
│   └── query-review.dto.ts
├── review.service.ts
├── review.controller.ts
└── review.module.ts
```

### Referral Module
```
backend/src/referrals/
├── dto/
│   ├── create-referral.dto.ts
│   ├── update-referral-config.dto.ts
│   └── query-referral.dto.ts
├── referral.service.ts
├── referral.controller.ts
└── referral.module.ts
```

### Database Migration
```
backend/prisma/migrations/
└── 20260101005703_add_review_referral_module/
    └── migration.sql
```

## Integration Points

### OrderService Integration
The OrderService has been updated to:

1. **Auto-create pending reviews** when order status changes to `DELIVERED`
2. **Enforce review requirement** before allowing `COMPLETED` status
3. **Apply referral discounts** automatically when buyers create orders

```typescript
// In OrderService.updateStatus()
if (updateDto.status === 'COMPLETED') {
  const hasReview = await this.reviewService.hasSubmittedReview(id);
  if (!hasReview) {
    throw new BadRequestException(
      'Order cannot be marked as COMPLETED until buyer submits a review.'
    );
  }
}
```

### Module Dependencies
- ReviewModule: Imports `PrismaModule`, exports `ReviewService`
- ReferralModule: Imports `PrismaModule`, exports `ReferralService`
- OrderModule: Imports `ReviewModule` (forwardRef to avoid circular dependency)
- AppModule: Imports both `ReviewModule` and `ReferralModule`

## Key Design Decisions

### 1. Forced Review Flow
- **Decision**: Order cannot be completed without a submitted review
- **Rationale**: Ensures consistent feedback collection for all fulfilled orders
- **Implementation**: Status transition validation in OrderService

### 2. Immutable Reviews
- **Decision**: Reviews cannot be edited after submission
- **Rationale**: Maintains review authenticity and prevents manipulation
- **Implementation**: Status check in submitReview() method

### 3. One Review Per Order
- **Decision**: One-to-one relationship between Order and Review
- **Rationale**: Simplifies review tracking and prevents duplicate feedback
- **Implementation**: Unique constraint on `orderId` in Review model

### 4. Referral Qualification Rules
- **Decision**: Rewards only given after referred user completes orders
- **Rationale**: Prevents gaming the system, ensures referred users are active
- **Implementation**: Status workflow (PENDING → QUALIFIED → REWARDED)

### 5. Admin-Configurable Rewards
- **Decision**: No hard-coded discount values or rules
- **Rationale**: Allows business flexibility to adjust referral incentives
- **Implementation**: ReferralConfig model with admin-only update endpoint

### 6. Reward Expiry
- **Decision**: Rewards expire after configurable period
- **Rationale**: Encourages timely reward usage, prevents indefinite liabilities
- **Implementation**: `rewardExpiry` date checked during applyReward()

### 7. Oldest Reward First
- **Decision**: Apply oldest qualified reward when buyer creates order
- **Rationale**: Fair distribution, prevents reward hoarding
- **Implementation**: `orderBy: { qualifiedAt: 'asc' }` in applyReward()

## Testing Scenarios

### Review Flow Testing
1. Create and confirm order
2. Update order status to DELIVERED
3. Verify pending review is created
4. Attempt to complete order → Should fail with error
5. Submit review with ratings and feedback
6. Complete order → Should succeed
7. Attempt to edit review → Should fail (immutable)

### Referral Flow Testing
1. Buyer A creates referral for email B
2. Verify referral code is generated
3. User B signs up and creates orders
4. Complete 1 order → Referral becomes QUALIFIED
5. Buyer A creates new order → Discount auto-applied
6. Verify referral status is REWARDED
7. Test reward expiry after configured days

### Admin Configuration Testing
1. Update referral config (min orders, reward value, expiry days)
2. Create new referral
3. Verify new referral uses updated config
4. Verify existing qualified referrals keep original settings

## Notifications Integration

While not implemented in this sprint, the NotificationService can be extended to send:
- **Review Reminders**: When order is delivered, remind buyer to submit review
- **Referral Invitations**: Email to referred users with unique referral code
- **Qualification Notifications**: Notify referrer when referred user qualifies them for reward
- **Reward Expiry Warnings**: Remind users of expiring rewards

## Future Enhancements

### Review System
- [ ] Product-specific ratings (separate ratings per product in order)
- [ ] Photo/video attachment support
- [ ] Seller response to reviews
- [ ] Review helpfulness voting
- [ ] Public review display on product pages

### Referral System
- [ ] Multi-tier rewards (different rewards for 1, 3, 5 referrals)
- [ ] Referral leaderboard
- [ ] Social media sharing integration
- [ ] Referral campaign tracking
- [ ] Custom referral codes (vanity codes)
- [ ] Referral expiry (referred user must sign up within X days)

## Conclusion

The Reviews, Feedback & Referral System is now fully implemented with:
- ✅ Forced review flow (no review → no completion)
- ✅ One review per order (immutable after submission)
- ✅ Admin moderation capabilities
- ✅ Buyer-driven referral program
- ✅ Qualification rules based on completed orders
- ✅ Admin-configurable reward settings
- ✅ Automatic discount application
- ✅ Complete RBAC enforcement
- ✅ Comprehensive API documentation

All requirements have been met with no generic ecommerce assumptions. The system is tailored specifically for Rachel Foods' business model.
