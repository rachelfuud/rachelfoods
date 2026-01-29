# Checkout Authentication Flow

## Overview

RachelFoods requires users to be authenticated (logged in) to place orders. This design decision ensures proper order tracking, customer communication, and account management.

## User Experience Flow

### 1. Guest User Attempts Checkout

When a guest user (not logged in) tries to access the checkout page:

```
User clicks "Checkout" → Redirected to /login?returnUrl=/checkout
```

### 2. Login Page Experience

The login page displays a helpful message when redirected from checkout:

> **Please log in or create an account to complete your checkout.**

Users can either:
- **Log in** with existing credentials
- **Sign up** for a new account

### 3. Post-Authentication

After successful login or registration:

```
User authenticates → Redirected back to /checkout → Can complete order
```

## Implementation Details

### Frontend Guards

#### Checkout Page (`/app/checkout/page.tsx`)

```typescript
useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login?returnUrl=/checkout');
    } else {
        setIsAuthenticated(true);
    }
}, [router]);
```

#### Login Page (`/app/login/page.tsx`)

```typescript
const returnUrl = searchParams.get('returnUrl') || '/';
// After successful auth:
router.push(returnUrl);
```

### API Error Messages

Improved user-friendly error messages in `lib/api.ts`:

**Before:**
```typescript
if (!token) throw new Error('No auth token');
```

**After:**
```typescript
if (!token) throw new Error('Please log in to place an order');
```

## Backend Requirements

The backend enforces authentication at the controller level:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderController {
    @Post()
    @Permissions('order.create')
    create(@Body() dto: CreateOrderDto, @Request() req: any) {
        return this.orderService.create(dto, req.user.userId);
    }
}
```

### Why Authentication is Required

1. **Order Tracking**: Associate orders with user accounts for order history
2. **Communication**: Send order updates via email to registered users
3. **Refunds & Wallet**: Track wallet balance and refund credits per user
4. **Fraud Prevention**: Prevent anonymous bulk orders
5. **Personalization**: Provide personalized recommendations and one-click refill
6. **Customer Support**: Enable support staff to look up orders by user account

## Payment Methods

Both payment methods require authentication:

### Cash on Delivery (COD)
- User must be logged in
- Order created with PENDING status
- Seller confirms order → Status: CONFIRMED
- Delivery completed → Status: DELIVERED, Payment: PAID

### Stripe Prepaid
- User must be logged in
- Order created, PaymentIntent generated
- User completes Stripe payment
- Webhook confirms payment → Order status updated

## Error Handling

If somehow an unauthenticated request reaches the backend (bypassing frontend checks), the backend responds with:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

The frontend API wrapper translates this to a user-friendly message.

## Testing Checklist

✅ Guest user accessing `/checkout` redirected to `/login`  
✅ Login page shows helpful message when `returnUrl=/checkout`  
✅ After login, user redirected back to `/checkout`  
✅ After signup, user redirected back to `/checkout`  
✅ Authenticated user can access checkout directly  
✅ COD order creation succeeds for logged-in user  
✅ Stripe payment flow works for logged-in user  
✅ Error messages are user-friendly (no technical jargon)  

## Future Considerations

### Guest Checkout (Optional Enhancement)

If business requirements change to support guest checkout:

1. **Frontend**: Remove auth check from checkout page
2. **Backend**: Make `JwtAuthGuard` optional for order creation
3. **Database**: Store guest email/phone instead of userId
4. **Order Tracking**: Provide order lookup via email + order ID
5. **Limitation**: Guest orders wouldn't have wallet, refill, or history features

**Current Decision**: Require authentication for better customer experience and platform features.

## Related Documentation

- [Order Module Documentation](./MODULE_ORDER.md)
- [Payment Module Documentation](./MODULE_PAYMENT.md)
- [Wallet System Quick Reference](./WALLET_QUICK_REFERENCE.md)
- [Role Permission Matrix](./ROLE_PERMISSION_MATRIX.md)

---

**Last Updated**: January 2026  
**Status**: Production Ready ✅
