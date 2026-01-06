# MODULE: ORDER

## Responsibility

Owns the full lifecycle of customer orders from creation to fulfillment completion or cancellation.  
Acts as the transactional backbone coordinating products, payments, and notifications.

## Core Entities

- Order
- OrderItem
- OrderStatus (CREATED, PAID, PREPARING, READY, COMPLETED, CANCELLED)

## Public Interfaces

- OrderService.createOrder()
- OrderService.updateOrderStatus()
- Order queries for admin and user views
- Emits domain events: order_created, order_paid, order_completed, order_cancelled

## Invariants & Rules

- An order MUST have at least one OrderItem
- Order total must equal sum of item prices + fees
- Status transitions must be forward-only and validated
- Completed orders are immutable

## Dependencies

- Reads Product module (pricing, availability)
- Reads/Writes Payment module (payment confirmation)
- Emits events to Notification module

## Explicit Non-Responsibilities

- Does NOT process payments
- Does NOT manage inventory stock mutations
- Does NOT send notifications directly

## Audit & Risk Notes

- Financially relevant
- All status transitions must be auditable
- Cancellation rules must be deterministic
