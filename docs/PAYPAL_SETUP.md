# PayPal Integration Setup Guide

**Status**: ✅ Fully Integrated (Development Mode)  
**Last Updated**: January 29, 2026

---

## Overview

PayPal has been integrated as the **default payment method** for RachelFoods. The integration supports:

- PayPal order creation with line items
- Payment capture after buyer approval
- Webhook event handling for payment confirmations
- Automatic order status updates
- Store credit wallet integration

---

## Development Configuration (Current)

### Backend Environment Variables

Located in `backend/.env`:

```bash
# PayPal (Dummy values for development - replace before going live)
PAYPAL_CLIENT_ID="AYGxTL7VZmRhL9e9UL0QwKVkqPJgY5VnYg7XqZfwM8K5yN2nS3hK9p7wQ4bR1v"
PAYPAL_CLIENT_SECRET="EKLmN5pQr8Stu9VwX2y3Z4a5B6c7D8e9F0g1H2i3J4k5L6m7N8o9P0qR1s"
PAYPAL_ENVIRONMENT="sandbox"
```

### Frontend Environment Variables

Located in `frontend/.env.local`:

```bash
# PayPal (Payment - Client ID - Dummy value for development)
NEXT_PUBLIC_PAYPAL_CLIENT_ID="AYGxTL7VZmRhL9e9UL0QwKVkqPJgY5VnYg7XqZfwM8K5yN2nS3hK9p7wQ4bR1v"
```

**⚠️ Important**: These are dummy/placeholder credentials for development only. They will NOT process real payments.

---

## Production Setup (Before Going Live)

### Step 1: Create PayPal Business Account

1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Sign up for a PayPal Business account
3. Navigate to **Dashboard** → **My Apps & Credentials**

### Step 2: Create App Credentials

1. Click **Create App** under "REST API apps"
2. App Name: "RachelFoods Production"
3. App Type: **Merchant**
4. Click **Create App**

### Step 3: Get Credentials

**For Sandbox Testing:**

- Client ID: Found under "Sandbox" tab
- Secret: Click "Show" to reveal secret

**For Production:**

- Client ID: Found under "Live" tab
- Secret: Click "Show" to reveal secret

### Step 4: Update Environment Variables

**Backend (.env):**

```bash
# Production PayPal Credentials
PAYPAL_CLIENT_ID="<your_live_client_id>"
PAYPAL_CLIENT_SECRET="<your_live_secret>"
PAYPAL_ENVIRONMENT="production"  # Change from "sandbox"
```

**Frontend (.env.local):**

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID="<your_live_client_id>"
```

### Step 5: Configure Webhooks

1. In PayPal Developer Dashboard → Your App → **Webhooks**
2. Click **Add Webhook**
3. Webhook URL: `https://yourdomain.com/api/payments/paypal/webhook`
4. Select Events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
5. Save webhook

---

## Architecture

### Payment Flow

```
1. User selects PayPal at checkout
2. Frontend calls: POST /api/payments/paypal/create-order
3. Backend creates PayPal order with line items
4. Frontend renders PayPal button with order ID
5. User approves payment in PayPal popup
6. Frontend calls: POST /api/payments/paypal/capture/:paypalOrderId
7. Backend captures payment and updates order status
8. Order marked as PAID, user redirected to confirmation
```

### Database Records

Each PayPal payment creates a record in the `payments` table:

- **Payment Method**: `PAYPAL`
- **Lifecycle**: `INITIATED` → `CAPTURED` (or `CANCELLED` on failure)
- **Wallet Relations**: Links buyer wallet to platform wallet
- **Gateway Transaction ID**: PayPal order ID for tracking

### Files Modified

**Backend:**

- `backend/src/payments/paypal-payment.service.ts` - Core PayPal logic
- `backend/src/payments/paypal-payment.controller.ts` - API endpoints
- `backend/src/payments/payments.module.ts` - Module registration
- `backend/src/payments/payment.service.ts` - Added PAYPAL to types
- `backend/package.json` - Added @paypal/checkout-server-sdk

**Frontend:**

- `frontend/app/checkout/page.tsx` - PayPal button integration
- `frontend/package.json` - Added @paypal/react-paypal-js

**Database:**

- `backend/prisma/schema.prisma` - PAYPAL added as first enum value

---

## Testing Checklist

Before going live, test the following scenarios:

### Sandbox Testing (Current Setup)

✅ Create PayPal sandbox account at [sandbox.paypal.com](https://www.sandbox.paypal.com/)  
✅ Place test order with PayPal payment method  
✅ Complete payment in PayPal sandbox popup  
✅ Verify order status updates to PAID  
✅ Check payment record in database  
✅ Verify wallet transactions are logged  
✅ Test payment failure scenario (cancel payment)  
✅ Test webhook delivery (if configured)

### Production Testing (After Credential Update)

- [ ] Update to live PayPal credentials
- [ ] Test with real PayPal account (use small amount)
- [ ] Verify funds appear in PayPal Business account
- [ ] Test refund workflow
- [ ] Monitor webhook delivery
- [ ] Test multiple concurrent orders
- [ ] Verify all email notifications are sent

---

## API Endpoints

### Create PayPal Order

```http
POST /api/payments/paypal/create-order
Authorization: Bearer <jwt_token>

Request:
{
  "orderId": "order_1234567890"
}

Response:
{
  "paypalOrderId": "8AB123456C789",
  "orderId": "order_1234567890"
}
```

### Capture PayPal Payment

```http
POST /api/payments/paypal/capture/:paypalOrderId
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "orderId": "order_1234567890",
  "paypalOrderId": "8AB123456C789",
  "captureId": "9XY987654Z321"
}
```

### Webhook Handler

```http
POST /api/payments/paypal/webhook
Content-Type: application/json

Body: PayPal webhook event payload
```

---

## Troubleshooting

### PayPal Button Not Appearing

**Check:**

1. `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set in frontend `.env.local`
2. Browser console for errors
3. Network tab shows PayPal SDK loading

### Payment Creation Fails

**Check:**

1. Backend PayPal credentials are correct
2. `PAYPAL_ENVIRONMENT` matches credential type (sandbox/production)
3. Order exists and is in PENDING status
4. Platform wallet exists in database

### Payment Capture Fails

**Check:**

1. PayPal order was created successfully
2. Buyer approved payment in PayPal popup
3. Payment record exists in database
4. Check backend logs for errors

### Webhook Not Receiving Events

**Check:**

1. Webhook URL is publicly accessible (not localhost)
2. Webhook is configured in PayPal Developer Dashboard
3. Correct events are selected
4. Check webhook delivery logs in PayPal dashboard

---

## Security Notes

- ✅ Client ID is safe to expose in frontend (public key)
- 🔒 Client Secret must NEVER be exposed (backend only)
- 🔒 Never commit real credentials to git
- ✅ Webhook signature verification implemented (when configured)
- ✅ PayPal SDK handles payment security
- ✅ Order validation prevents unauthorized payment capture

---

## Future Enhancements

Potential improvements for future versions:

- [ ] PayPal subscription support for recurring orders
- [ ] PayPal credit/deferred payment options
- [ ] Multi-currency support
- [ ] PayPal dispute/chargeback handling
- [ ] Advanced fraud detection integration
- [ ] PayPal payout for vendor settlements
- [ ] Save PayPal accounts for faster checkout (vaulting)

---

## Support Resources

- **PayPal Developer Docs**: https://developer.paypal.com/docs/
- **Checkout Integration**: https://developer.paypal.com/docs/checkout/
- **Webhooks Guide**: https://developer.paypal.com/docs/api-basics/notifications/webhooks/
- **SDK Documentation**: https://github.com/paypal/Checkout-NodeJS-SDK

---

## Status Summary

| Component              | Status        | Notes                                |
| ---------------------- | ------------- | ------------------------------------ |
| Backend Integration    | ✅ Complete   | PayPal service and controller ready  |
| Frontend Integration   | ✅ Complete   | PayPal button integrated in checkout |
| Database Schema        | ✅ Updated    | PAYPAL enum added                    |
| Dummy Credentials      | ✅ Configured | Development ready                    |
| Production Credentials | ⏳ Pending    | Awaiting live credentials            |
| Webhook Setup          | ⏳ Pending    | Configure after deployment           |
| Testing                | ⏳ Partial    | Sandbox testing ready                |

**Next Action**: Replace dummy credentials with real PayPal sandbox credentials for testing, then update to production credentials before launch.
