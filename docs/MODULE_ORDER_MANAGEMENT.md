# Order Management & Seller Confirmation – RachelFoods

## Purpose
This module governs how orders are created, confirmed, paid for, shipped, delivered, and fulfilled.

This is NOT a fully automated ecommerce flow.
Seller confirmation is mandatory.

---

## Core Principles

- Orders are pending by default
- Seller must confirm before payment
- Delivery date is human-agreed
- Payment timing is seller-controlled
- Shipping is governed by Shipping Engine

---

## Order Lifecycle (Mandatory)

Draft  
→ Pending Seller Confirmation  
→ Seller Confirmed  
→ Awaiting Payment  
→ Paid  
→ Shipping Scheduled  
→ In Transit  
→ Delivered  
→ Fulfilled  
→ Reviewed  

---

## Buyer Capabilities

- Create order
- Select delivery address
- Select preferred delivery window (optional)
- Choose payment preference (if allowed)
- Track order
- Confirm delivery received
- Submit review

---

## Seller Capabilities

- View incoming orders
- Contact buyer (offline or online)
- Confirm availability
- Confirm delivery date
- Decide payment method:
  - Pay at checkout
  - Pay on delivery
- Update order status
- Assign shipping provider
- Request fulfillment confirmation

---

## Payment Rules

- Payment is blocked until:
  - Seller confirms order
  - Shipping cost is finalized
- Payment on delivery is optional
- Seller decides allowed payment method per order

---

## Communication Rules

- Order confirmations may happen via:
  - WhatsApp
  - Email
  - In-app messaging
  - Phone call
- Non-phone confirmations must log order details
- Phone confirmations require manual seller confirmation in system

---

## Tracking & Visibility

- Every order has:
  - Unique reference
  - Status timeline
  - Shipping tracking ID
- Buyers and sellers can track progress

---

## Kitchen Refill Compatibility

- Orders may be:
  - Standard
  - Kitchen Refill
  - Custom Request
- All follow same confirmation lifecycle

---

## Constraints

- No auto-fulfillment
- No auto-payment
- No shipping before confirmation
